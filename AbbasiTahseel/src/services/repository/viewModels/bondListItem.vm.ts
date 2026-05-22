/**
 * BondListItem View-Model — Wave 6-Β
 *
 * Translates a WatermelonDB `Bond` row into the `MockBond` shape that
 * `BondCard` was originally designed against. This keeps the card
 * presentation code intact (no churn on the existing wave 6-α
 * styling + memoization) while the data source is migrated to live
 * observables under it.
 *
 *   Bond (model)  ──▶  toBondListItem(bond, accountIndex)  ──▶  MockBond
 *
 * The card consumes `accountNum` + `currencySymbol` which are NOT
 * stored on the `bonds` table (they live on `accounts` / `currencies`).
 * We resolve them via in-memory lookups passed in by the screen — this
 * avoids a per-row async JOIN, which would tank scroll perf on lists
 * with 100+ bonds.
 *
 * Lookup contract:
 *   • `accountByRemoteId.get(bond.accountId)` → Account row or undefined
 *   • `currencyByRemoteId.get(bond.currencyId)` → Currency row or undefined
 *
 * If a lookup misses, we fall back to safe placeholders (empty string,
 * '?') so the card still renders something readable.
 */

import type { Account } from '@/database/models/Account';
import type { Bond } from '@/database/models/Bond';
import type { Currency } from '@/database/models/Currency';
import type { MockBond } from '@/mocks/bonds';

/**
 * Tiny lookup index used by the view-model. Built once per render in
 * `BondsListScreen` and passed in to keep the per-row work O(1).
 */
export interface BondLookups {
  accountByRemoteId: ReadonlyMap<number, Account>;
  currencyByRemoteId: ReadonlyMap<number, Currency>;
}

/**
 * Build an empty lookup. Used when the screen has not yet received its
 * first accounts/currencies emission — the cards still render with
 * fallback placeholders during that brief window.
 */
export function emptyBondLookups(): BondLookups {
  return {
    accountByRemoteId: new Map(),
    currencyByRemoteId: new Map(),
  };
}

/**
 * Index helper. Build a `remoteId → row` map from an array of rows.
 * Skips rows whose `remoteId` is null/undefined (defensive — should
 * not happen for seeded data, but the column IS nullable on the
 * `bonds` side).
 */
export function indexByRemoteId<T extends { remoteId?: number | null }>(
  rows: T[],
): ReadonlyMap<number, T> {
  const out = new Map<number, T>();
  for (const row of rows) {
    if (row.remoteId != null) {
      out.set(row.remoteId, row);
    }
  }
  return out;
}

/**
 * Convert a single `Bond` row to a `MockBond`-compatible view model
 * the existing `BondCard` consumes verbatim. Pure: no DB calls, no
 * async — safe to call inside `renderItem`.
 */
export function toBondListItem(bond: Bond, lookups: BondLookups): MockBond {
  const account =
    bond.accountId != null
      ? lookups.accountByRemoteId.get(bond.accountId)
      : undefined;
  const currency =
    bond.currencyId != null
      ? lookups.currencyByRemoteId.get(bond.currencyId)
      : undefined;

  // pushStatus is the WMDB column; MockBond.syncStatus is the narrower
  // 3-state union. Map 'pristine'/'syncing' to 'synced' for display
  // purposes (those rows don't have a badge in the card anyway).
  const syncStatus: MockBond['syncStatus'] =
    bond.pushStatus === 'dirty'
      ? 'dirty'
      : bond.pushStatus === 'failed'
        ? 'failed'
        : 'synced';

  // bondDate in `MockBond` is a yyyy-MM-dd string; the model stores it
  // as a Date. We format with toISOString().slice(0, 10) to keep the
  // legacy text format that the card prints verbatim.
  const bondDateIso = bond.bondDate.toISOString().slice(0, 10);

  const vm: MockBond = {
    localUuid: bond.localUuid,
    bondNo: bond.bondNo,
    // BondCard's BondType union is 'receipt'|'payment'. WMDB column is
    // a free-form string — coerce defensively (default to 'receipt').
    bondType: bond.bondType === 'payment' ? 'payment' : 'receipt',
    accountId: bond.accountId ?? 0,
    accountName: bond.accountName ?? account?.name ?? '',
    accountNum: account?.code ?? '',
    currencyId: bond.currencyId ?? 0,
    currencySymbol: currency?.symbol ?? '?',
    amount: bond.amount,
    amountPaid: bond.amountPaid,
    bondDate: bondDateIso,
    syncStatus,
  };
  if (bond.remoteId != null) {
    vm.remoteId = bond.remoteId;
  }
  if (bond.notes != null && bond.notes !== '') {
    vm.notes = bond.notes;
  }
  if (bond.lastError != null && bond.lastError !== '') {
    vm.lastError = bond.lastError;
  }
  return vm;
}

/**
 * Batch helper — convert an array of Bond rows in one pass.
 */
export function toBondListItems(bonds: Bond[], lookups: BondLookups): MockBond[] {
  return bonds.map((b) => toBondListItem(b, lookups));
}
