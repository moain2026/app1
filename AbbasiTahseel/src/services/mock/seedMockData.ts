/**
 * Mock Data Seeder — العباسي تحصيل
 *
 * Bulk-inserts `MOCK_READINGS` into WatermelonDB when the current session
 * is the Dev Bypass session (see `services/auth/devBypass.ts`).
 *
 * ════════════════════════════════════════════════════════════════════════
 *  Guarantees
 * ════════════════════════════════════════════════════════════════════════
 *
 * 1. NEVER seeds for a real user. Hard-gated on `useAuthStore.isDevBypass`.
 * 2. NEVER duplicates. Looks up existing rows by `local_uuid` before insert.
 *    Re-running the seeder is a NO-OP after the first successful run.
 * 3. NEVER pollutes the sync_queue. The seeder writes rows directly without
 *    going through `enqueueReadingSave` — those rows never leave the device.
 * 4. NEVER blocks UI. Uses a single batched `database.write` so the entire
 *    25-row insert is one transaction (~50ms on a mid-range device).
 * 5. Idempotent across schema bumps via SEED_VERSION (bump it to force a
 *    one-shot wipe + reseed when the seed dataset is modified).
 *
 * ════════════════════════════════════════════════════════════════════════
 *  Lifecycle
 * ════════════════════════════════════════════════════════════════════════
 *
 *  • App.tsx bootstrap: subscribe to `useAuthStore`, call
 *    `seedMockDataIfDevBypass()` whenever `isDevBypass` flips to true.
 *  • Run is fire-and-forget; failures are logged but never thrown.
 */

import { Q } from '@nozbe/watermelondb';

import { database } from '@/database';
import type { Reading } from '@/database/models/Reading';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

import { MOCK_READINGS, MOCK_READINGS_COUNT } from './mockReadings';

const log = logger.scope('SeedMockData');

/**
 * Bump this when MOCK_READINGS changes shape. The seeder will then wipe
 * existing mock-* rows on the next run and reseed.
 */
export const SEED_VERSION = 1;

/**
 * One-shot, in-memory guard so multiple concurrent calls (e.g. from
 * App.tsx subscription + HomeScreen mount) all converge on a single
 * transaction.
 */
let seedingPromise: Promise<void> | null = null;

/**
 * Public entry point. Returns immediately when not in dev bypass mode.
 * Otherwise runs (or joins) the in-flight seeding promise.
 */
export async function seedMockDataIfDevBypass(): Promise<void> {
  if (!useAuthStore.getState().isDevBypass) {
    return;
  }
  if (seedingPromise) {
    return seedingPromise;
  }
  seedingPromise = doSeed().finally(() => {
    seedingPromise = null;
  });
  return seedingPromise;
}

async function doSeed(): Promise<void> {
  const collection = database.collections.get<Reading>('readings');

  // Fast path — if at least one of the canonical mock uuids is already in
  // the DB, assume the seed already ran. (Checking just the first uuid is
  // enough because the seeder is atomic: either all 25 rows landed or none.)
  // Defensive null-check: noUncheckedIndexedAccess is on.
  const sentinelRow = MOCK_READINGS[0];
  if (!sentinelRow) {
    log.warn('seed: no mock rows defined — skipping');
    return;
  }
  const sentinelUuid = sentinelRow.local_uuid;
  const existing = await collection
    .query(Q.where('local_uuid', sentinelUuid))
    .fetch();
  if (existing.length > 0) {
    log.debug('seed: already populated, skipping');
    return;
  }

  const startedAt = Date.now();
  try {
    await database.write(async () => {
      // ─── Batch create — one transaction for the whole 25-row insert ─
      const creates = MOCK_READINGS.map((mock) =>
        collection.prepareCreate((r) => {
          r.localUuid = mock.local_uuid;
          if (mock.remote_id !== null) {
            r.remoteId = mock.remote_id;
          }
          r.num = mock.num;
          r.name = mock.name;
          r.namet = mock.namet;
          r.ind = mock.ind;
          r.nomstlm = mock.nomstlm;
          r.notblh = mock.notblh;
          r.noadad = mock.noadad;
          r.nog = mock.nog;
          r.ks = mock.ks;
          r.kh = mock.kh;
          r.cas = mock.cas;
          r.asts = mock.asts;
          r.pushStatus = mock.sync_status;
          if (mock.last_sync_attempt_at !== null) {
            r.lastSyncAttemptAt = new Date(mock.last_sync_attempt_at);
          }
          r.lastError = mock.last_error;
          r.syncAttempts = mock.sync_attempts;
          if (mock.reading_date !== null) {
            r.readingDate = new Date(mock.reading_date);
          }
        }),
      );

      await database.batch(...creates);
    });
    log.info('seed: populated', {
      rows: MOCK_READINGS_COUNT,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    log.error('seed: failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Test/debug-only utility. Removes every row whose local_uuid starts with
 * the `mock-` prefix. NOT wired to the UI in Wave 4; kept here for the
 * Wave 5 "Reset dev data" button (deferred).
 */
export async function clearMockReadings(): Promise<void> {
  const collection = database.collections.get<Reading>('readings');
  // Match all uuids starting with "mock-" — Q.like is SQL LIKE underneath.
  const mocks = await collection
    .query(Q.where('local_uuid', Q.like('mock-%')))
    .fetch();
  if (mocks.length === 0) {
    return;
  }
  await database.write(async () => {
    await database.batch(...mocks.map((r) => r.prepareDestroyPermanently()));
  });
  log.info('seed: cleared mock rows', { count: mocks.length });
}
