/**
 * Sync Worker — العباسي تحصيل
 *
 * Drains the `sync_queue` table by calling the appropriate push handler for
 * each item, then transitioning the row to its terminal state.
 *
 * Loop:
 *   1. Claim up to `batchSize` pending items (atomic via syncQueue.claimBatch).
 *   2. For each claimed item:
 *      a. Mark target entity as 'syncing'.
 *      b. Dispatch to the push handler.
 *      c. Translate the outcome → DB transition:
 *           success    → queue row 'done',   entity 'synced'
 *           transient  → queue row 'pending' with backoff, entity 'dirty'
 *           permanent  → queue row 'failed',  entity 'failed'
 *      d. On hitting `maxAttempts` for a transient → also marked 'failed'.
 *   3. Loop back to (1) until the batch is empty OR we hit `maxBatches`.
 *
 * Re-entrancy:
 *   Multiple callers (foreground tick, background fetch, manual button) can
 *   call `runOnce()` concurrently — a process-wide mutex ensures only one
 *   loop runs at a time.
 */

import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

import type { SyncQueueItem } from '../../database/models/SyncQueueItem';

import { computeNextRunAt } from './backoff';
import {
  markEntityAsDirty,
  markEntityAsFailed,
  markEntityAsSynced,
  markEntityAsSyncing,
} from './entitySyncStatus';
import { syncEvents } from './events';
import { getPushHandler } from './push';
import { recordSyncLog } from './syncLogger';
import {
  claimBatch,
  markDone,
  markFailed,
  markPending,
  pruneDoneOlderThan,
  recoverStuckProcessing,
} from './syncQueue';
import type { QueueItemOutcome, SyncEngineConfig } from './types';
import { DEFAULT_SYNC_CONFIG } from './types';

const log = logger.scope('SyncWorker');

// ─── Process-wide mutex ───────────────────────────────────────────────────
let isRunning = false;

// ─── Worker tick result (for telemetry) ───────────────────────────────────
export interface WorkerTickResult {
  processed: number;
  succeeded: number;
  transient: number;
  permanent: number;
  durationMs: number;
}

const EMPTY_TICK: WorkerTickResult = {
  processed: 0,
  succeeded: 0,
  transient: 0,
  permanent: 0,
  durationMs: 0,
};

// ─── Process a single claimed item ────────────────────────────────────────
async function processItem(
  item: SyncQueueItem,
  config: SyncEngineConfig,
): Promise<QueueItemOutcome> {
  const handler = getPushHandler(item.entityType);
  const payload = item.payload();

  syncEvents.emit({
    type: 'push:item_started',
    entityType: item.entityType,
    localUuid: item.entityLocalUuid,
    attempt: item.attempts,
  });

  // Mark the target entity row as syncing for UI feedback.
  await markEntityAsSyncing(item.entityType, item.entityLocalUuid);

  const t0 = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handler is a union of payload-typed handlers
  const outcome = await (handler as any).execute(payload, item.operation);
  const duration = Date.now() - t0;

  // Translate the outcome back into DB transitions.
  switch (outcome.kind) {
    case 'success': {
      await markDone(item);
      await markEntityAsSynced(item.entityType, item.entityLocalUuid, outcome.remoteId);
      syncEvents.emit({
        type: 'push:item_success',
        entityType: item.entityType,
        localUuid: item.entityLocalUuid,
        remoteId: outcome.remoteId,
      });
      await recordSyncLog({
        entityType: item.entityType,
        operation: item.operation,
        direction: 'push',
        status: 'success',
        recordsCount: 1,
        durationMs: duration,
      });
      break;
    }
    case 'transient': {
      if (item.attempts >= config.maxAttempts) {
        // Out of retries → terminal failure even though the error class said
        // it was transient. The dashboard will let the user reset it.
        await markFailed(item, `max_attempts_exceeded: ${outcome.reason}`);
        await markEntityAsFailed(
          item.entityType,
          item.entityLocalUuid,
          `max_attempts_exceeded: ${outcome.reason}`,
        );
        syncEvents.emit({
          type: 'push:item_permanent_failure',
          entityType: item.entityType,
          localUuid: item.entityLocalUuid,
          reason: `max_attempts_exceeded: ${outcome.reason}`,
          httpStatus: outcome.httpStatus,
        });
        await recordSyncLog({
          entityType: item.entityType,
          operation: item.operation,
          direction: 'push',
          status: 'failure',
          recordsCount: 1,
          durationMs: duration,
          errorMessage: `max_attempts_exceeded: ${outcome.reason}`,
          httpStatus: outcome.httpStatus,
        });
      } else {
        const nextRunAt = computeNextRunAt(item.attempts, {
          baseMs: config.backoffBaseMs,
          maxMs: config.backoffMaxMs,
          jitterMs: config.backoffJitterMs,
        });
        await markPending(item, outcome.reason, nextRunAt);
        await markEntityAsDirty(item.entityType, item.entityLocalUuid, outcome.reason);
        syncEvents.emit({
          type: 'push:item_transient_failure',
          entityType: item.entityType,
          localUuid: item.entityLocalUuid,
          attempt: item.attempts,
          nextRunAt: nextRunAt.getTime(),
          reason: outcome.reason,
        });
      }
      break;
    }
    case 'permanent': {
      await markFailed(item, outcome.reason);
      await markEntityAsFailed(item.entityType, item.entityLocalUuid, outcome.reason);
      syncEvents.emit({
        type: 'push:item_permanent_failure',
        entityType: item.entityType,
        localUuid: item.entityLocalUuid,
        reason: outcome.reason,
        httpStatus: outcome.httpStatus,
      });
      await recordSyncLog({
        entityType: item.entityType,
        operation: item.operation,
        direction: 'push',
        status: 'failure',
        recordsCount: 1,
        durationMs: duration,
        errorMessage: outcome.reason,
        httpStatus: outcome.httpStatus,
      });
      break;
    }
  }

  return outcome;
}

// ─── Public: process pending items in a single drain ──────────────────────

/**
 * Drain the queue.
 *
 * @param config Optional overrides. Defaults from DEFAULT_SYNC_CONFIG.
 * @returns Per-tick statistics.
 *
 * Re-entrancy: if a previous call is still running, returns immediately with
 * an empty result and does NOT enqueue a follow-up. Callers should wait for
 * the next external trigger (NetInfo change, manual tap, etc).
 */
export async function drainQueueOnce(
  config: SyncEngineConfig = DEFAULT_SYNC_CONFIG,
): Promise<WorkerTickResult> {
  if (isRunning) {
    log.debug('worker already running, skipping');
    return EMPTY_TICK;
  }
  isRunning = true;

  const startedAt = Date.now();
  let processed = 0;
  let succeeded = 0;
  let transient = 0;
  let permanent = 0;

  try {
    // Recover anything stuck in 'processing' from a previous crash.
    await recoverStuckProcessing();

    // Bounded outer loop so a misbehaving server can't make us churn forever.
    const MAX_BATCHES = 10;
    for (let batchIdx = 0; batchIdx < MAX_BATCHES; batchIdx++) {
      const batch = await claimBatch(config.batchSize);
      if (batch.length === 0) {
        break;
      }
      log.debug('processing batch', { batchIdx, size: batch.length });

      // Process items SERIALLY by default. The legacy server doesn't handle
      // concurrent writes well, and serial processing makes the backoff
      // arithmetic simpler. Future optimization: parallelize per-entity-type.
      for (const item of batch) {
        try {
          const outcome = await processItem(item, config);
          processed += 1;
          if (outcome.kind === 'success') succeeded += 1;
          else if (outcome.kind === 'transient') transient += 1;
          else permanent += 1;
        } catch (err) {
          // Defensive: should never happen because handlers wrap their own
          // errors. But if it does, treat as transient with a backoff so the
          // queue keeps moving.
          const message = err instanceof AppError ? err.code : String((err as Error).message);
          log.error('processItem threw', { uuid: item.entityLocalUuid, err: message });
          const nextRunAt = computeNextRunAt(item.attempts, {
            baseMs: config.backoffBaseMs,
            maxMs: config.backoffMaxMs,
            jitterMs: config.backoffJitterMs,
          });
          await markPending(item, `worker_unhandled: ${message}`, nextRunAt);
          await markEntityAsDirty(item.entityType, item.entityLocalUuid, message);
          processed += 1;
          transient += 1;
        }
      }
    }

    // Maintenance.
    await pruneDoneOlderThan();
  } finally {
    isRunning = false;
  }

  const durationMs = Date.now() - startedAt;
  log.info('drain complete', { processed, succeeded, transient, permanent, durationMs });
  return { processed, succeeded, transient, permanent, durationMs };
}

/** For tests. */
export function isWorkerRunning(): boolean {
  return isRunning;
}
