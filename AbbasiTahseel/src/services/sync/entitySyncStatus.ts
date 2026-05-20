/**
 * Entity Sync Status Helpers — العباسي تحصيل
 *
 * After a queue item is processed, the worker needs to update the
 * `sync_status` field on the corresponding entity row (Reading / Bond /
 * BondPayment). This module centralizes those transitions so the worker
 * doesn't have to know about WatermelonDB internals.
 *
 * State transitions managed here:
 *   • markEntityAsSyncing   — claim is starting
 *   • markEntityAsSynced    — server accepted
 *   • markEntityAsDirty     — transient failure, will retry
 *   • markEntityAsFailed    — terminal failure, manual review needed
 */

import { Q } from '@nozbe/watermelondb';
import type { Model } from '@nozbe/watermelondb';

import { database } from '../../database';
import type { PushStatus } from '../../database/models/Reading';
import type { SyncEntityType } from '../../database/models/SyncQueueItem';
import { logger } from '../../utils/logger';

const log = logger.scope('EntitySync');

// ─── Generic "find by localUuid" helper ───────────────────────────────────

interface SyncableModel extends Model {
  localUuid: string;
  pushStatus: PushStatus;
  lastSyncAttemptAt?: Date | null;
  lastError?: string | null;
  syncAttempts: number;
  remoteId?: number | null;
}

const TABLE_FOR_ENTITY: Record<SyncEntityType, string> = {
  reading: 'readings',
  bond: 'bonds',
  bond_payment: 'bond_payments',
};

async function findEntity(
  entityType: SyncEntityType,
  localUuid: string,
): Promise<SyncableModel | null> {
  const tableName = TABLE_FOR_ENTITY[entityType];
  const collection = database.collections.get(tableName);
  const matches = await collection.query(Q.where('local_uuid', localUuid)).fetch();
  if (matches.length === 0) {
    log.warn('entity not found', { entityType, localUuid });
    return null;
  }
  // Cast is safe: every syncable table has the same metadata columns.
  return matches[0] as unknown as SyncableModel;
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function markEntityAsSyncing(
  entityType: SyncEntityType,
  localUuid: string,
): Promise<void> {
  const entity = await findEntity(entityType, localUuid);
  if (!entity) return;
  await database.write(async () => {
    await entity.update(row => {
      row.pushStatus = 'syncing';
      row.lastSyncAttemptAt = new Date();
      row.syncAttempts = row.syncAttempts + 1;
    });
  });
}

export async function markEntityAsSynced(
  entityType: SyncEntityType,
  localUuid: string,
  remoteId?: number,
): Promise<void> {
  const entity = await findEntity(entityType, localUuid);
  if (!entity) return;
  await database.write(async () => {
    await entity.update(row => {
      row.pushStatus = 'synced';
      row.lastError = null;
      if (remoteId != null) {
        row.remoteId = remoteId;
      }
    });
  });
}

export async function markEntityAsDirty(
  entityType: SyncEntityType,
  localUuid: string,
  reason: string,
): Promise<void> {
  const entity = await findEntity(entityType, localUuid);
  if (!entity) return;
  await database.write(async () => {
    await entity.update(row => {
      row.pushStatus = 'dirty';
      row.lastError = reason;
    });
  });
}

export async function markEntityAsFailed(
  entityType: SyncEntityType,
  localUuid: string,
  reason: string,
): Promise<void> {
  const entity = await findEntity(entityType, localUuid);
  if (!entity) return;
  await database.write(async () => {
    await entity.update(row => {
      row.pushStatus = 'failed';
      row.lastError = reason;
    });
  });
}

// ─── Bulk operations for the dashboard's "retry all" button ───────────────

/**
 * Reset all `failed` entities of a given type to `dirty` (they'll be picked
 * up by the next sync tick). Call this when the user taps "Retry all".
 */
export async function resetFailedEntities(entityType: SyncEntityType): Promise<number> {
  const tableName = TABLE_FOR_ENTITY[entityType];
  const collection = database.collections.get(tableName);
  const failed = await collection.query(Q.where('sync_status', 'failed')).fetch();
  if (failed.length === 0) return 0;
  await database.write(async () => {
    for (const row of failed) {
      const syncable = row as unknown as SyncableModel;
      await syncable.update(r => {
        const s = r as unknown as SyncableModel;
        s.pushStatus = 'dirty';
        s.syncAttempts = 0;
        s.lastError = null;
      });
    }
  });
  log.info('reset failed entities', { entityType, count: failed.length });
  return failed.length;
}

/**
 * Lookup helper used by callers that already know the localUuid (e.g. when
 * a screen wants to show the latest sync state of a specific reading).
 */
export async function getPushStatusFor(
  entityType: SyncEntityType,
  localUuid: string,
): Promise<PushStatus | null> {
  const entity = await findEntity(entityType, localUuid);
  return entity?.pushStatus ?? null;
}

/**
 * Look up the table name for a given entity type. Exposed so external
 * callers (dashboard queries, telemetry) can derive the table without
 * duplicating the mapping.
 */
export function tableNameFor(entityType: SyncEntityType): string {
  return TABLE_FOR_ENTITY[entityType];
}
