/**
 * Sync Coordinator — العباسي تحصيل
 *
 * The single public entry point for everything sync-related. Higher-level
 * code (UI buttons, app bootstrap, background fetch) should ONLY interact
 * with this module — not with the worker, queue, or handlers directly.
 *
 * Responsibilities:
 *  • Orchestrate push (drain queue) + pull (fetch reference + readings).
 *  • Honor connectivity and auth preconditions.
 *  • Emit lifecycle events for the dashboard.
 *  • Persist sync_logs entries for pull operations.
 *
 * Two top-level operations:
 *  • `syncNow(reason)`   — run a full sync (pull all + push queue).
 *  • `pushOnly(reason)`  — drain the queue without pulling. Used on the
 *      "after_write" trigger to immediately upload what the user just saved.
 *
 * Re-entrancy: a process-wide mutex guards against overlapping runs.
 */

import { logger } from '../../utils/logger';
import { secureStorage } from '../storage';

import { isOnlineAsync } from './connectivity';
import { syncEvents } from './events';
import { PULL_HANDLERS, getPullHandler } from './pull';
import { recordSyncLog } from './syncLogger';
import { drainQueueOnce } from './syncWorker';
import type {
  PullEntityKey,
  PullResult,
  SyncEngineConfig,
  SyncTriggerReason,
} from './types';
import { DEFAULT_SYNC_CONFIG } from './types';

const log = logger.scope('SyncCoordinator');

// ─── Process-wide mutex ───────────────────────────────────────────────────
let isCoordinatorRunning = false;

// ─── Result shape ─────────────────────────────────────────────────────────
export interface SyncRunResult {
  trigger: SyncTriggerReason;
  durationMs: number;
  pushed: { processed: number; succeeded: number; failed: number };
  pulled: { upserted: number; skipped: number; failed: number };
  skipped: boolean;
  skipReason?: 'offline' | 'no_auth' | 'already_running';
}

// ─── Preconditions ────────────────────────────────────────────────────────

async function hasAuthToken(): Promise<boolean> {
  const token = await secureStorage.getAccessToken();
  return token != null && token.length > 0;
}

// ─── Pull all (with per-entity error isolation) ───────────────────────────

interface PullSummary {
  upserted: number;
  skipped: number;
  failed: number;
}

async function runAllPulls(
  only?: PullEntityKey[],
): Promise<PullSummary> {
  const handlers = only
    ? (only.map(getPullHandler).filter(h => h !== undefined) as typeof PULL_HANDLERS[number][])
    : PULL_HANDLERS;

  const summary: PullSummary = { upserted: 0, skipped: 0, failed: 0 };

  // Sequential pulls. The legacy server doesn't handle parallel JSON reads
  // gracefully on weaker deployments, and sequential is easier to debug.
  for (const handler of handlers) {
    syncEvents.emit({ type: 'pull:started', entity: handler.entity });
    const t0 = Date.now();
    try {
      const result: PullResult = await handler.run();
      summary.upserted += result.upserted;
      summary.skipped += result.skipped;
      syncEvents.emit({
        type: 'pull:finished',
        entity: handler.entity,
        upserted: result.upserted,
        skipped: result.skipped,
        durationMs: result.durationMs,
      });
      await recordSyncLog({
        entityType: handler.entity,
        operation: 'pull_full',
        direction: 'pull',
        status: 'success',
        recordsCount: result.upserted,
        durationMs: result.durationMs,
      });
    } catch (err) {
      summary.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      const httpStatus =
        typeof err === 'object' && err && 'httpStatus' in err
          ? (err as { httpStatus?: number }).httpStatus
          : undefined;
      log.warn('pull failed', { entity: handler.entity, message });
      syncEvents.emit({
        type: 'pull:failed',
        entity: handler.entity,
        reason: message,
        httpStatus,
      });
      await recordSyncLog({
        entityType: handler.entity,
        operation: 'pull_full',
        direction: 'pull',
        status: 'failure',
        recordsCount: 0,
        durationMs: Date.now() - t0,
        errorMessage: message,
        httpStatus,
      });
      // Continue with the next entity — one failure shouldn't kill the run.
    }
  }

  return summary;
}

// ─── Full sync (pull + push) ──────────────────────────────────────────────

export interface SyncNowOptions {
  /** Limit the pull to specific entities. Default: all. */
  onlyPullEntities?: PullEntityKey[];
  /** Skip the pull phase entirely (still drains the queue). */
  pushOnly?: boolean;
  /** Engine overrides. */
  config?: Partial<SyncEngineConfig>;
}

export async function syncNow(
  trigger: SyncTriggerReason,
  options: SyncNowOptions = {},
): Promise<SyncRunResult> {
  if (isCoordinatorRunning) {
    log.debug('coordinator already running, skipping', { trigger });
    syncEvents.emit({ type: 'engine:skipped', reason: 'already_running', at: Date.now() });
    return {
      trigger,
      durationMs: 0,
      pushed: { processed: 0, succeeded: 0, failed: 0 },
      pulled: { upserted: 0, skipped: 0, failed: 0 },
      skipped: true,
      skipReason: 'already_running',
    };
  }
  isCoordinatorRunning = true;

  const startedAt = Date.now();
  syncEvents.emit({ type: 'engine:started', trigger, at: startedAt });
  log.info('sync started', { trigger, options });

  try {
    // ── 1. Preconditions ────────────────────────────────────────────────
    const online = await isOnlineAsync();
    if (!online) {
      log.info('offline — skipping sync');
      syncEvents.emit({ type: 'engine:skipped', reason: 'offline', at: Date.now() });
      return {
        trigger,
        durationMs: Date.now() - startedAt,
        pushed: { processed: 0, succeeded: 0, failed: 0 },
        pulled: { upserted: 0, skipped: 0, failed: 0 },
        skipped: true,
        skipReason: 'offline',
      };
    }

    const authed = await hasAuthToken();
    if (!authed) {
      log.info('no auth token — skipping sync');
      syncEvents.emit({ type: 'engine:skipped', reason: 'no_auth', at: Date.now() });
      return {
        trigger,
        durationMs: Date.now() - startedAt,
        pushed: { processed: 0, succeeded: 0, failed: 0 },
        pulled: { upserted: 0, skipped: 0, failed: 0 },
        skipped: true,
        skipReason: 'no_auth',
      };
    }

    // ── 2. Merge config ─────────────────────────────────────────────────
    const config: SyncEngineConfig = { ...DEFAULT_SYNC_CONFIG, ...options.config };

    // ── 3. PUSH first ───────────────────────────────────────────────────
    // Reasoning: if we pull first and a row is locally `dirty`, the LWW rule
    // skips it. So we MUST push outstanding edits BEFORE pulling, otherwise
    // the just-pulled server state will be skipped over the dirty local one
    // and the dashboard will show stale data until the next tick.
    const pushTick = await drainQueueOnce(config);
    const pushed = {
      processed: pushTick.processed,
      succeeded: pushTick.succeeded,
      failed: pushTick.permanent,
    };

    // ── 4. PULL (unless pushOnly) ───────────────────────────────────────
    let pulled: PullSummary = { upserted: 0, skipped: 0, failed: 0 };
    if (!options.pushOnly) {
      pulled = await runAllPulls(options.onlyPullEntities);
    }

    // ── 5. Emit finish ──────────────────────────────────────────────────
    const durationMs = Date.now() - startedAt;
    syncEvents.emit({
      type: 'engine:finished',
      trigger,
      at: Date.now(),
      durationMs,
      pushed: pushTick.succeeded,
      pulled: pulled.upserted,
      failed: pushed.failed + pulled.failed,
    });
    log.info('sync finished', { trigger, durationMs, pushed, pulled });

    return {
      trigger,
      durationMs,
      pushed,
      pulled,
      skipped: false,
    };
  } finally {
    isCoordinatorRunning = false;
  }
}

// ─── Public shortcuts ─────────────────────────────────────────────────────

/** Drain the queue without pulling. Fast path for "user just saved". */
export async function pushOnly(trigger: SyncTriggerReason): Promise<SyncRunResult> {
  return syncNow(trigger, { pushOnly: true });
}

/** Pull only specific entities. Used by Sync Dashboard's per-row "refresh" buttons. */
export async function pullEntities(
  entities: PullEntityKey[],
  trigger: SyncTriggerReason = 'manual',
): Promise<SyncRunResult> {
  return syncNow(trigger, { onlyPullEntities: entities });
}

/** True if a coordinator run is in flight. */
export function isSyncRunning(): boolean {
  return isCoordinatorRunning;
}
