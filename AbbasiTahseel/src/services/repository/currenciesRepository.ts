/**
 * Currencies Repository — العباسي تحصيل (Wave 6-Β)
 *
 * Read-only API around the `currencies` collection. Used by
 * `CurrencyPicker` and any other screen that needs to render an amount
 * with its symbol.
 */

import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';

import { database } from '@/database';
import type { Currency } from '@/database/models/Currency';

/**
 * Reactive list of all currencies, base currency first.
 *
 * Sort policy: `is_default DESC, name ASC` — the base currency is
 * always pinned to the top so the picker default is visually obvious.
 */
export function observeCurrencies(): Observable<Currency[]> {
  return database.collections
    .get<Currency>('currencies')
    .query(Q.sortBy('is_default', Q.desc), Q.sortBy('name', Q.asc))
    .observe();
}

/** One-shot fetch. */
export async function fetchCurrencies(): Promise<Currency[]> {
  return database.collections
    .get<Currency>('currencies')
    .query(Q.sortBy('is_default', Q.desc), Q.sortBy('name', Q.asc))
    .fetch();
}

/** Find one by `remote_id`. */
export async function findCurrencyByRemoteId(
  remoteId: number,
): Promise<Currency | null> {
  const rows = await database.collections
    .get<Currency>('currencies')
    .query(Q.where('remote_id', remoteId))
    .fetch();
  return rows.length > 0 ? (rows[0] ?? null) : null;
}

/** Read the base (default) currency. Returns null when none is marked. */
export async function findBaseCurrency(): Promise<Currency | null> {
  const rows = await database.collections
    .get<Currency>('currencies')
    .query(Q.where('is_default', true))
    .fetch();
  return rows.length > 0 ? (rows[0] ?? null) : null;
}
