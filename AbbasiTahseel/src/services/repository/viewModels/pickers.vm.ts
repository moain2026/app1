/**
 * Picker view-models — Wave 6-Β
 *
 * Translates WatermelonDB rows into the `Mock*` shapes the existing
 * picker components consume. The pickers themselves only need a
 * minimal subset of each entity (id, name, optional metadata) so the
 * VM layer is intentionally thin.
 *
 * Pickers retain their original `MockX` typed callbacks
 * (`onSelect(account: MockAccount): void`) so calling screens do not
 * need to change — only the picker's internal data source moves from
 * `MOCK_X` arrays to live `observe*()` queries.
 */

import type { Account } from '@/database/models/Account';
import type { Currency } from '@/database/models/Currency';
import type { Place } from '@/database/models/Place';
import type { MockAccount } from '@/mocks/accounts';
import { MOCK_ACCOUNTS } from '@/mocks/accounts';
import type { MockCurrency } from '@/mocks/currencies';
import type { MockPlace } from '@/mocks/places';
import { MOCK_PLACES } from '@/mocks/places';

// ─── Place ────────────────────────────────────────────────────────────────

export function toMockPlace(p: Place): MockPlace {
  // `subscriberCount` is a denormalized hint not stored on the model —
  // re-derive from the MOCK_PLACES table by id, falling back to 0.
  // Wave 6-Γ will replace this with a live COUNT(accounts) query.
  const mock = MOCK_PLACES.find((m) => m.id === p.remoteId);
  return {
    id: p.remoteId,
    name: p.name,
    subscriberCount: mock?.subscriberCount ?? 0,
  };
}

export function toMockPlaces(rows: Place[]): MockPlace[] {
  return rows.map(toMockPlace);
}

// ─── Account ──────────────────────────────────────────────────────────────

/**
 * Map a live `Account` row + the legacy MOCK_PLACES table to a
 * `MockAccount`. The `placeName` / `groupName` / `placeId` / `groupId`
 * fields are NOT on the `accounts` model (the legacy WCF surface joins
 * them server-side). For Wave 6-Β we resolve them from the static mock
 * tables — the rendering remains identical to wave 6-α.
 *
 * Wave 6-Γ TODO: derive placeName via a JOIN through `tblh` → `places`,
 * once `accounts.tblh_id` is wired to the live pull.
 */
export function toMockAccount(a: Account): MockAccount {
  const mock = MOCK_ACCOUNTS.find((m) => m.id === a.remoteId);
  const base: MockAccount = {
    id: a.remoteId,
    num: a.code,
    name: a.name,
    placeId: mock?.placeId ?? 0,
    placeName: mock?.placeName ?? '',
    groupId: mock?.groupId ?? 0,
    groupName: mock?.groupName ?? '',
    balance: a.balance,
    currencyId: a.currencyId ?? 1,
    active: mock?.active ?? true,
  };
  if (a.nameEn != null && a.nameEn !== '') {
    base.nameT = a.nameEn;
  }
  if (a.phone != null && a.phone !== '') {
    base.phone = a.phone;
  }
  return base;
}

export function toMockAccounts(rows: Account[]): MockAccount[] {
  return rows.map(toMockAccount);
}

// ─── Currency ─────────────────────────────────────────────────────────────

export function toMockCurrency(c: Currency): MockCurrency {
  return {
    id: c.remoteId,
    symbol: c.symbol ?? c.code,
    name: c.name,
    rate: c.exchangeRate,
    isBase: c.isDefault,
  };
}

export function toMockCurrencies(rows: Currency[]): MockCurrency[] {
  return rows.map(toMockCurrency);
}
