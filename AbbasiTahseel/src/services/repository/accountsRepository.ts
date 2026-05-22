/**
 * Accounts Repository — العباسي تحصيل (Wave 6-Β)
 *
 * Read-only API around the `accounts` collection (server is source of
 * truth; local table is a mirror populated by the pull engine + the
 * dev-bypass seeder).
 *
 * Used by:
 *   • AccountPicker  — search-as-you-type
 *   • BondFormScreen — default account preview (Wave 6-Γ wire-up)
 *   • ReadingsHistoryScreen — subscriber profile section
 */

import { Q } from '@nozbe/watermelondb';
import { Observable, map } from 'rxjs';

import { database } from '@/database';
import type { Account } from '@/database/models/Account';

function escapeForLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export interface AccountsQueryFilters {
  /** Free-text search across name + name_en + code. Empty = no filter. */
  searchQuery: string;
  /**
   * Restrict to accounts whose `code` starts with the given place code
   * prefix. Optional — when null/undefined, all places are returned.
   *
   * NOTE: We do NOT filter by `place_id` here because the `accounts`
   * table does not currently carry a place FK (the legacy schema groups
   * by `tblh` → `place` indirection). Place-based filtering is a Wave
   * 6-Γ task and lives in the picker layer for now.
   */
  codePrefix?: string;
}

function buildQuery(filters: AccountsQueryFilters) {
  const conditions: Q.Clause[] = [];

  const trimmed = filters.searchQuery.trim();
  if (trimmed.length > 0) {
    const pattern = `%${escapeForLike(trimmed)}%`;
    conditions.push(
      Q.or(
        Q.where('name', Q.like(pattern)),
        Q.where('name_en', Q.like(pattern)),
        Q.where('code', Q.like(pattern)),
      ),
    );
  }

  if (filters.codePrefix && filters.codePrefix.length > 0) {
    conditions.push(
      Q.where('code', Q.like(`${escapeForLike(filters.codePrefix)}%`)),
    );
  }

  return database.collections
    .get<Account>('accounts')
    .query(...conditions, Q.sortBy('name', Q.asc));
}

/** Reactive search results for the picker. */
export function observeAccounts(
  filters: AccountsQueryFilters,
): Observable<Account[]> {
  return buildQuery(filters).observe();
}

/** One-shot search results. */
export async function fetchAccounts(
  filters: AccountsQueryFilters,
): Promise<Account[]> {
  return buildQuery(filters).fetch();
}

/**
 * Find by `code` (legacy `num`). Returns null when not found.
 * Used by `ReadingsHistoryScreen` which receives the code via nav params.
 */
export async function findAccountByCode(code: string): Promise<Account | null> {
  const rows = await database.collections
    .get<Account>('accounts')
    .query(Q.where('code', code))
    .fetch();
  return rows.length > 0 ? (rows[0] ?? null) : null;
}

/** Reactive observable for a single account by code. */
export function observeAccountByCode(
  code: string,
): Observable<Account | null> {
  return database.collections
    .get<Account>('accounts')
    .query(Q.where('code', code))
    .observe()
    .pipe(
      map((rows: Account[]) => (rows.length > 0 ? (rows[0] ?? null) : null)),
    );
}

/** Find by `remote_id` — used when the UI carries the server primary key. */
export async function findAccountByRemoteId(
  remoteId: number,
): Promise<Account | null> {
  const rows = await database.collections
    .get<Account>('accounts')
    .query(Q.where('remote_id', remoteId))
    .fetch();
  return rows.length > 0 ? (rows[0] ?? null) : null;
}
