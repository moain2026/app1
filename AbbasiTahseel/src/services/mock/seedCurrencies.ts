/**
 * Seed currencies — Wave 6-Β
 *
 * Mirrors `MOCK_CURRENCIES` into the `currencies` table.
 */

import { Q } from '@nozbe/watermelondb';

import { database } from '@/database';
import type { Currency } from '@/database/models/Currency';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

import { MOCK_CURRENCIES } from '../../mocks/currencies';

const log = logger.scope('SeedCurrencies');

let promise: Promise<void> | null = null;

export async function seedCurrenciesIfDevBypass(): Promise<void> {
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
  const collection = database.collections.get<Currency>('currencies');
  const sentinel = MOCK_CURRENCIES[0];
  if (!sentinel) {
    log.warn('seedCurrencies: no mock rows — skip');
    return;
  }
  const existing = await collection
    .query(Q.where('remote_id', sentinel.id))
    .fetch();
  if (existing.length > 0) {
    log.debug('seedCurrencies: already populated, skip');
    return;
  }

  try {
    await database.write(async () => {
      const creates = MOCK_CURRENCIES.map((mock) =>
        collection.prepareCreate((row) => {
          row.remoteId = mock.id;
          // The legacy server returns currencies WITHOUT a stable 'code'
          // (e.g. "YER", "USD") — the only stable shortform is the symbol.
          // We use the symbol as the code locally so picker lookups by
          // code stay deterministic.
          row.code = mock.symbol;
          row.name = mock.name;
          row.symbol = mock.symbol;
          row.exchangeRate = mock.rate;
          row.isDefault = mock.isBase;
          row.lastSyncedAt = new Date();
        }),
      );
      await database.batch(...creates);
    });
    log.info('seedCurrencies: populated', {
      rows: MOCK_CURRENCIES.length,
    });
  } catch (err) {
    log.error('seedCurrencies: failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
