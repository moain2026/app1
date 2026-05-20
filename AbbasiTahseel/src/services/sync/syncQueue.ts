/**
 * Sync Queue Manager — العباسي تحصيل
 *
 * High-level CRUD over the `sync_queue` table. All write operations are
 * wrapped in `database.write()` to satisfy WatermelonDB's transactional
 * requirements.
 *
 * Lifecycle:
 *   enqueue()        → status='pending', attempts=0, next_run_at=now
 *   claimBatch()     → status='processing' (atomic; prevents double-processing)
 *   markDone(item)   → status='done' (kept briefly for audit, then prunable)
 *   markPending(item, error, nextRunAt) → status='pending', attempts++, schedule retry
 *   markFailed(item, error)              → status='failed' (terminal)
 *
 * Idempotency:
 *   The same `entity_local_uuid` may be enqueued multiple times (e.g. user
 *   edits a reading three times before going online). We DE-DUPE by merging
 *   into the latest pending row per (entity_type + entity_local_uuid).
 */

import { Q } from '@nozbe/watermelondb';

import { database } from '../../database';
import type {
  SyncEntityType,
  SyncQueueOperation,
  SyncQueueStatus,
} from '../../database/models/SyncQueueItem';
import { SyncQueueItem } from '../../database/models/SyncQueueItem';
import { AppError, ErrorCodes } from '../../utils/errors';
import { logger } from '../../utils/logger';

const log = logger.scope('SyncQueue');

// ─── Constants ────────────────────────────────────────────────────────────
const COLLECTION = 'sync_queue';

/**
 * Hard cap on queue size. The legacy collectors sometimes accumulated 10k+
 * unsynced rows when servers were down for weeks — we now reject new pushes
 * if the queue exceeds this so the device doesn't run out of memory.
 */
export const MAX_QUEUE_SIZE = 5_000;

// ─── Enqueue ──────────────────────────────────────────────────────────────

export interface EnqueueOptions<TPayload> {
  entityType: SyncEntityType;
  entityLocalId: string;
  entityLocalUuid: string;
  operation: SyncQueueOperation;
  payload: TPayload;
  /** Higher runs first. Default: 0. Use 10 for user-triggered priority pushes. */
  priority?: number;
}

/**
 * Enqueue a mutation for the worker.
 *
 * Dedup rule:
 *   If a row with the same (entityType + entityLocalUuid) already exists in
 *   `pending` or `processing` state, we REPLACE its payload + operation
 *   instead of inserting a new row. This way, three quick edits to the same
 *   reading produce ONE eventual server call (the latest snapshot), not three.
 *
 * Note: `done` and `failed` rows are NOT considered for dedup — those are
 * historical and a new edit should produce a fresh queue entry.
 */
export async function enqueue<TPayload>(opts: EnqueueOptions<TPayload>): Promise<SyncQueueItem> {
  const queue = database.collections.get<SyncQueueItem>(COLLECTION);

  // Reject if queue is full.
  const queueSize = await queue.query(Q.where('status', Q.oneOf(['pending', 'processing']))).fetchCount();
  if (queueSize >= MAX_QUEUE_SIZE) {
    throw new AppError(ErrorCodes.SYNC_QUEUE_OVERFLOW, {
      details: { current: queueSize, max: MAX_QUEUE_SIZE },
    });
  }

  const payloadJson = JSON.stringify(opts.payload);
  const now = Date.now();

  // Look for an existing live row to merge into.
  const existing = await queue
    .query(
      Q.where('entity_type', opts.entityType),
      Q.where('entity_local_uuid', opts.entityLocalUuid),
      Q.where('status', Q.oneOf(['pending', 'processing'])),
    )
    .fetch();

  return database.write(async () => {
    if (existing.length > 0) {
      // Merge: update the oldest pending row, drop any duplicates.
      // `existing.length > 0` already guarantees a primary, but TS's
      // noUncheckedIndexedAccess narrows tuple destructure to `T | undefined`.
      const primary = existing[0];
      const duplicates = existing.slice(1);
      if (!primary) {
        // Defensive — should be unreachable given the length check above.
        throw new AppError(ErrorCodes.SYNC_QUEUE_OVERFLOW, {
          details: { reason: 'queue-merge-primary-missing' },
        });
      }
      await primary.update(row => {
        row.operation = opts.operation;
        row.payloadJson = payloadJson;
        row.status = 'pending';
        row.priority = opts.priority ?? row.priority;
        row.nextRunAt = new Date(now); // run ASAP
        row.lastError = null;
        // attempts: keep the previous counter so we don't reset backoff cycles.
      });
      for (const dup of duplicates) {
        await dup.markAsDeleted();
      }
      log.debug('merged existing queue row', {
        entity: opts.entityType,
        uuid: opts.entityLocalUuid,
        droppedDuplicates: duplicates.length,
      });
      return primary;
    }

    // Fresh insert.
    const created = await queue.create(row => {
      row.entityType = opts.entityType;
      row.entityLocalId = opts.entityLocalId;
      row.entityLocalUuid = opts.entityLocalUuid;
      row.operation = opts.operation;
      row.payloadJson = payloadJson;
      row.status = 'pending';
      row.priority = opts.priority ?? 0;
      row.attempts = 0;
      row.lastError = null;
      row.nextRunAt = new Date(now);
    });
    log.debug('enqueued', {
      entity: opts.entityType,
      uuid: opts.entityLocalUuid,
      operation: opts.operation,
    });
    return created;
  });
}

// ─── Claim a batch for processing ─────────────────────────────────────────

/**
 * Atomically transitions up to `limit` due rows from `pending` → `processing`.
 * "Due" = `next_run_at <= now`. Returns the freshly-claimed rows.
 *
 * Doing the claim in one DB transaction ensures that two concurrent workers
 * (foreground + background fetch) can't pick the same row.
 */
export async function claimBatch(limit: number, now: Date = new Date()): Promise<SyncQueueItem[]> {
  const queue = database.collections.get<SyncQueueItem>(COLLECTION);

  const candidates = await queue
    .query(
      Q.where('status', 'pending'),
      Q.or(
        Q.where('next_run_at', Q.lte(now.getTime())),
        Q.where('next_run_at', null), // legacy rows with no schedule = immediate
      ),
      Q.sortBy('priority', Q.desc),
      Q.sortBy('created_at', Q.asc),
      Q.take(limit),
    )
    .fetch();

  if (candidates.length === 0) {
    return [];
  }

  return database.write(async () => {
    const claimed: SyncQueueItem[] = [];
    for (const item of candidates) {
      // Double-check status inside the transaction (could have changed).
      if (item.status !== 'pending') {
        continue;
      }
      await item.update(row => {
        row.status = 'processing';
        row.attempts = row.attempts + 1;
      });
      claimed.push(item);
    }
    return claimed;
  });
}

// ─── State transitions ────────────────────────────────────────────────────

export async function markDone(item: SyncQueueItem): Promise<void> {
  await database.write(async () => {
    await item.update(row => {
      row.status = 'done';
      row.lastError = null;
      row.nextRunAt = null;
    });
  });
}

export async function markPending(
  item: SyncQueueItem,
  errorReason: string,
  nextRunAt: Date,
): Promise<void> {
  await database.write(async () => {
    await item.update(row => {
      row.status = 'pending';
      row.lastError = errorReason;
      row.nextRunAt = nextRunAt;
    });
  });
}

export async function markFailed(item: SyncQueueItem, errorReason: string): Promise<void> {
  await database.write(async () => {
    await item.update(row => {
      row.status = 'failed';
      row.lastError = errorReason;
      row.nextRunAt = null;
    });
  });
}

// ─── Maintenance ──────────────────────────────────────────────────────────

/**
 * Delete `done` rows older than `cutoff`. Defaults to 24h ago.
 * Keeps the queue small and the indexes fast on long-running devices.
 */
export async function pruneDoneOlderThan(cutoff: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)): Promise<number> {
  const queue = database.collections.get<SyncQueueItem>(COLLECTION);
  const stale = await queue
    .query(Q.where('status', 'done'), Q.where('updated_at', Q.lt(cutoff.getTime())))
    .fetch();
  if (stale.length === 0) {
    return 0;
  }
  await database.write(async () => {
    for (const row of stale) {
      await row.markAsDeleted();
    }
  });
  log.debug('pruned done rows', { count: stale.length });
  return stale.length;
}

/**
 * Move stuck `processing` rows back to `pending`. Called on app start to
 * recover from a crash that left a row claimed but never resolved.
 */
export async function recoverStuckProcessing(staleAfterMs: number = 5 * 60 * 1000): Promise<number> {
  const queue = database.collections.get<SyncQueueItem>(COLLECTION);
  const cutoff = Date.now() - staleAfterMs;
  const stuck = await queue
    .query(Q.where('status', 'processing'), Q.where('updated_at', Q.lt(cutoff)))
    .fetch();
  if (stuck.length === 0) {
    return 0;
  }
  await database.write(async () => {
    for (const row of stuck) {
      await row.update(r => {
        r.status = 'pending';
        r.lastError = 'recovered_from_stuck_processing';
        r.nextRunAt = new Date();
      });
    }
  });
  log.warn('recovered stuck processing rows', { count: stuck.length });
  return stuck.length;
}

// ─── Read-only queries (for dashboard / debugging) ────────────────────────

export async function countByStatus(status: SyncQueueStatus): Promise<number> {
  const queue = database.collections.get<SyncQueueItem>(COLLECTION);
  return queue.query(Q.where('status', status)).fetchCount();
}

export async function listFailed(limit = 100): Promise<SyncQueueItem[]> {
  const queue = database.collections.get<SyncQueueItem>(COLLECTION);
  return queue
    .query(Q.where('status', 'failed'), Q.sortBy('updated_at', Q.desc), Q.take(limit))
    .fetch();
}

/**
 * Reset a failed row back to pending so the user can retry it manually
 * from the dashboard. Resets attempts to give it a clean backoff cycle.
 */
export async function retryFailed(item: SyncQueueItem): Promise<void> {
  await database.write(async () => {
    await item.update(row => {
      row.status = 'pending';
      row.attempts = 0;
      row.lastError = null;
      row.nextRunAt = new Date();
    });
  });
}

/** Snapshot of queue health for the Sync Dashboard summary tile. */
export interface QueueStats {
  pending: number;
  processing: number;
  failed: number;
  done: number;
}

export async function getStats(): Promise<QueueStats> {
  const [pending, processing, failed, done] = await Promise.all([
    countByStatus('pending'),
    countByStatus('processing'),
    countByStatus('failed'),
    countByStatus('done'),
  ]);
  return { pending, processing, failed, done };
}
