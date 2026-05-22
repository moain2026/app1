/**
 * Sync Types — العباسي تحصيل
 *
 * Central type definitions for the sync engine.
 *
 * State machine for queue items:
 *   pending ─► processing ─► done                    (success)
 *           │              ╲► pending (re-scheduled) (transient failure → backoff)
 *           │              ╲► failed                 (max attempts OR 4xx client error)
 *           ▼
 *        cancelled                                   (explicit user action)
 *
 * Why no `cancelled` in DB enum? — The DB SyncQueueItem only stores the four
 * runtime states. "Cancelled" is implemented by deleting the row entirely so
 * it never gets retried. This keeps the queue compact and the state machine
 * minimal.
 */

import type {
  SyncEntityType,
  SyncQueueOperation,
  SyncQueueStatus,
} from '../../database/models/SyncQueueItem';

// ─── Re-exports for ergonomic imports ─────────────────────────────────────
export type { SyncEntityType, SyncQueueOperation, SyncQueueStatus };

// ─── Direction ────────────────────────────────────────────────────────────
export type SyncDirection = 'push' | 'pull';

// ─── Pull entity keys (mirror prefs.SyncEntityKey for last-sync tracking) ─
export type PullEntityKey =
  | 'readings'
  | 'bonds'
  | 'bond_payments'
  | 'accounts'
  | 'places'
  | 'groups'
  | 'tblh'
  | 'currencies'
  | 'users'
  | 'company';

// ─── Worker outcomes ──────────────────────────────────────────────────────

/**
 * Result of processing a single queue item.
 *  • success  — server accepted → mark row `done`, update target entity → `synced`
 *  • transient — network/5xx → bump attempts, schedule next_run_at with backoff
 *  • permanent — 4xx (non-401) or validation → mark `failed` for manual review
 */
export type QueueItemOutcome =
  | { kind: 'success'; remoteId?: number }
  | { kind: 'transient'; reason: string; httpStatus?: number }
  | { kind: 'permanent'; reason: string; httpStatus?: number };

// ─── Push handler contract ────────────────────────────────────────────────

/**
 * Each push handler converts a queued mutation into an API call.
 *
 * The handler is REQUIRED to:
 *  1. Use the endpoint name (not a raw path).
 *  2. Pass `idempotent: true` in `api.call()` options so the retry interceptor
 *     can safely replay POSTs (the legacy server keys on `local_uuid`).
 *  3. Return a typed outcome — NEVER throw; the worker wraps thrown errors
 *     into outcomes itself, but explicit returns improve testability.
 */
export interface PushHandler<TPayload = unknown> {
  /** Entity this handler is responsible for. */
  entityType: SyncEntityType;
  /** Convert payload JSON → server call. Throws on permanent failure. */
  execute(payload: TPayload, operation: SyncQueueOperation): Promise<QueueItemOutcome>;
}

// ─── Pull handler contract ────────────────────────────────────────────────

export interface PullResult {
  /** How many records were upserted into WatermelonDB. */
  upserted: number;
  /** How many were skipped (e.g. locally-dirty rows we refused to overwrite). */
  skipped: number;
  /** ms spent on the network call + DB write (for sync_logs). */
  durationMs: number;
}

export interface PullHandler {
  /** Entity this handler is responsible for. */
  entity: PullEntityKey;
  /**
   * Fetch + validate + upsert into WatermelonDB.
   *
   * Conflict resolution (LWW):
   *   For collector-owned entities (readings, bonds, bond_payments) a row
   *   that is locally `dirty` / `syncing` / `failed` is NEVER overwritten —
   *   the collector's input always wins until they explicitly push it.
   */
  run(): Promise<PullResult>;
}

// ─── Sync configuration ───────────────────────────────────────────────────

export interface SyncEngineConfig {
  /** Max queue items processed in one tick. Default: 25. */
  batchSize: number;
  /** Maximum attempts before a row is marked `failed`. Default: 6. */
  maxAttempts: number;
  /** Backoff base in ms. Delay = base * 2^(attempts-1) + jitter. Default: 2000. */
  backoffBaseMs: number;
  /** Max single delay between retries (caps exponential growth). Default: 5min. */
  backoffMaxMs: number;
  /** Random jitter added on top of backoff to avoid thundering herd. Default: 1000. */
  backoffJitterMs: number;
  /** Background fetch minimum interval (minutes). Android floor is 15. */
  backgroundIntervalMinutes: number;
}

export const DEFAULT_SYNC_CONFIG: SyncEngineConfig = {
  batchSize: 25,
  maxAttempts: 6,
  backoffBaseMs: 2_000,
  backoffMaxMs: 5 * 60 * 1_000, // 5 minutes
  backoffJitterMs: 1_000,
  backgroundIntervalMinutes: 15,
};

// ─── Trigger reasons (for telemetry & dashboard) ──────────────────────────
export type SyncTriggerReason =
  | 'manual' // user tapped "Sync Now"
  | 'connectivity' // network came back online
  | 'background_fetch' // OS woke us up
  | 'startup' // app launched
  | 'after_login' // just successfully authenticated (non-dev-bypass)
  | 'after_write' // user just saved a reading/bond
  | 'periodic'; // in-app timer (foreground)
