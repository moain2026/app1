/**
 * Sync Activity Logger — العباسي تحصيل
 *
 * Writes audit rows into `sync_logs` (the DB table read by the Sync Dashboard
 * in Phase 11). Distinct from the runtime `logger` (which is for console
 * diagnostics) — this one is persisted on disk so the user can see history
 * across app restarts.
 */

import { Q } from '@nozbe/watermelondb';

import { database } from '../../database';
import { SyncLog } from '../../database/models/SyncLog';
import { logger } from '../../utils/logger';
import type { SyncDirection } from './types';

const log = logger.scope('SyncLogger');
const COLLECTION = 'sync_logs';

export interface SyncLogEntry {
  entityType: string;
  operation: string;
  direction: SyncDirection;
  status: 'success' | 'failure';
  recordsCount: number;
  durationMs: number;
  errorMessage?: string | null;
  httpStatus?: number | null;
}

export async function recordSyncLog(entry: SyncLogEntry): Promise<void> {
  const collection = database.collections.get<SyncLog>(COLLECTION);
  try {
    await database.write(async () => {
      await collection.create(row => {
        row.entityType = entry.entityType;
        row.operation = entry.operation;
        row.direction = entry.direction;
        row.status = entry.status;
        row.recordsCount = entry.recordsCount;
        row.durationMs = entry.durationMs;
        row.errorMessage = entry.errorMessage ?? null;
        row.httpStatus = entry.httpStatus ?? null;
      });
    });
  } catch (err) {
    // Logging must never crash the engine.
    log.warn('failed to write sync log', { err: (err as Error).message });
  }
}

/**
 * Trim the sync_logs table to the most recent N rows.
 * Called periodically to prevent unbounded growth on long-running devices.
 */
export async function pruneOldLogs(keepCount = 500): Promise<number> {
  const collection = database.collections.get<SyncLog>(COLLECTION);
  const all = await collection.query(Q.sortBy('created_at', Q.desc)).fetch();
  if (all.length <= keepCount) {
    return 0;
  }
  const toDelete = all.slice(keepCount);
  await database.write(async () => {
    for (const row of toDelete) {
      await row.markAsDeleted();
    }
  });
  log.debug('pruned sync logs', { deleted: toDelete.length });
  return toDelete.length;
}

/**
 * Return the most recent N sync log entries (for the Sync Dashboard list).
 */
export async function getRecentLogs(limit = 50): Promise<SyncLog[]> {
  const collection = database.collections.get<SyncLog>(COLLECTION);
  return collection.query(Q.sortBy('created_at', Q.desc), Q.take(limit)).fetch();
}
