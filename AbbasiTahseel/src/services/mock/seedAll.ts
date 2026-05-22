/**
 * Dev-bypass seed runner — Wave 6-Β
 *
 * Orchestrates every dev-bypass seeder in dependency order:
 *
 *   1. currencies   (no deps)
 *   2. places       (no deps)
 *   3. accounts     (no deps — references currency_id but no FK enforced)
 *   4. bonds + payments (references account_id; bonds and payments are
 *                        seeded inside the same module so the FK is set
 *                        atomically)
 *   5. readings     (independent — uses the existing seeder)
 *
 * Each seeder is idempotent (checks for sentinel row, fast-path skips),
 * so calling this multiple times — even concurrently — is safe.
 *
 * Caller: `App.tsx` boot effect, subscribed to `isDevBypass` flips.
 */

import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

import { seedAccountsIfDevBypass } from './seedAccounts';
import { seedBondsIfDevBypass } from './seedBonds';
import { seedCurrenciesIfDevBypass } from './seedCurrencies';
import { seedMockDataIfDevBypass } from './seedMockData';
import { seedPlacesIfDevBypass } from './seedPlaces';

const log = logger.scope('SeedAll');

let runOnce: Promise<void> | null = null;

/**
 * Run every seeder. Returns immediately when not in dev-bypass mode.
 * Subsequent calls during an in-flight run return the same promise so
 * the seed boot is single-flight.
 */
export async function seedAllIfDevBypass(): Promise<void> {
  if (!useAuthStore.getState().isDevBypass) {
    return;
  }
  if (runOnce) {
    return runOnce;
  }
  runOnce = doRunAll().finally(() => {
    runOnce = null;
  });
  return runOnce;
}

async function doRunAll(): Promise<void> {
  const startedAt = Date.now();
  log.info('seedAll: start');

  // The four small mirror tables can run in parallel — no FK constraints
  // between them at the WMDB level (FKs are logical, not enforced).
  await Promise.all([
    seedCurrenciesIfDevBypass(),
    seedPlacesIfDevBypass(),
    seedAccountsIfDevBypass(),
  ]);

  // Bonds depend on accounts (logically) — run after the parallel batch.
  // The bonds seeder ALSO writes bond_payments inside the same module,
  // so no separate call is needed for payments.
  await seedBondsIfDevBypass();

  // Readings are independent of the bonds graph.
  await seedMockDataIfDevBypass();

  log.info('seedAll: done', {
    durationMs: Date.now() - startedAt,
  });
}
