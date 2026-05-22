/**
 * Seed places — Wave 6-Β
 *
 * Mirrors `MOCK_PLACES` into the `places` table. Idempotent: skipped
 * when at least one row already exists.
 *
 * The mock carries a `subscriberCount` denormalized field that the
 * `Place` model does not. It's purely a UI hint; we drop it here and
 * the picker re-derives it from `MOCK_PLACES` until Wave 6-Γ teaches
 * the picker to JOIN against `accounts`.
 */

import { Q } from '@nozbe/watermelondb';

import { database } from '@/database';
import type { Place } from '@/database/models/Place';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

import { MOCK_PLACES } from '../../mocks/places';

const log = logger.scope('SeedPlaces');

let promise: Promise<void> | null = null;

export async function seedPlacesIfDevBypass(): Promise<void> {
  if (!useAuthStore.getState().isDevBypass) {
    return;
  }
  if (promise) {
    return promise;
  }
  promise = doSeed().finally(() => {
    promise = null;
  });
  return promise;
}

async function doSeed(): Promise<void> {
  const collection = database.collections.get<Place>('places');
  const sentinel = MOCK_PLACES[0];
  if (!sentinel) {
    log.warn('seedPlaces: no mock rows — skip');
    return;
  }
  const existing = await collection
    .query(Q.where('remote_id', sentinel.id))
    .fetch();
  if (existing.length > 0) {
    log.debug('seedPlaces: already populated, skip');
    return;
  }

  const startedAt = Date.now();
  try {
    await database.write(async () => {
      const creates = MOCK_PLACES.map((mock) =>
        collection.prepareCreate((row) => {
          row.remoteId = mock.id;
          row.name = mock.name;
          row.code = null;
          row.parentId = null;
          row.lastSyncedAt = new Date();
        }),
      );
      await database.batch(...creates);
    });
    log.info('seedPlaces: populated', {
      rows: MOCK_PLACES.length,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    log.error('seedPlaces: failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
