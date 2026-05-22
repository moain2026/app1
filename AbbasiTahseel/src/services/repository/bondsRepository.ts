/**
 * Bonds Repository — العباسي تحصيل (Wave 6-Β)
 *
 * Thin abstraction between the React layer (screens + components) and the
 * WatermelonDB `bonds` collection. Modelled after `readingsRepository.ts`:
 *
 *   • Builds reactive queries from user-facing filter objects.
 *   • Provides one-shot fetches for stats badges.
 *   • Exposes a `findByUuid` lookup for detail screens.
 *
 * MUTATION SCOPE — Wave 6-Β
 *   We intentionally do NOT add `createBond` / `updateBond` / `deleteBond`
 *   here. The Bond entity is still wave-6-α shape (13 fields); the live
 *   WCF mutation contract has not been finalized (waiting on the user's
 *   WCF Help dump for `ItemBonds`). The bond forms (`BondFormScreen`,
 *   `BondPaymentFormScreen`) therefore remain on their existing MOCK
 *   data path until Wave 6-Γ wires the proper push handler.
 *
 *   For READ paths (list + detail + pickers), `bonds` populated by the
 *   dev-bypass seeder behaves exactly like server-pulled rows, so the
 *   UI can be wired to observables today without any contract risk.
 */

import { Q } from '@nozbe/watermelondb';
import { Observable, map } from 'rxjs';

import { database } from '@/database';
import type { Bond } from '@/database/models/Bond';

// ─── Filter & sort types ──────────────────────────────────────────────────

/** Matches the chip filter on `BondsListScreen`. */
export type BondTypeFilter = 'all' | 'receipt' | 'payment';

export interface BondsQueryFilters {
  /** Free-text search across bond_no + account_name. Empty = no filter. */
  searchQuery: string;
  /** Type chip filter. */
  type: BondTypeFilter;
}

export interface BondsStats {
  total: number;
  receipt: number;
  payment: number;
  /** sync_status == 'synced' */
  synced: number;
  /** sync_status == 'dirty' */
  dirty: number;
  /** sync_status == 'failed' */
  failed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function escapeForLike(value: string): string {
  // Q.like takes a SQL LIKE pattern; escape % and _ defensively.
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Build a stable query from a filter object. Sort is fixed at
 * `bond_date DESC, bond_no DESC` to mirror the legacy "newest first"
 * ordering used by `BondsListScreen`.
 */
function buildQuery(filters: BondsQueryFilters) {
  const conditions: Q.Clause[] = [];

  // Free-text search — bonds_no is numeric so we search via the
  // string-cast account_name + bond_no LIKE pattern.
  const trimmed = filters.searchQuery.trim();
  if (trimmed.length > 0) {
    const pattern = `%${escapeForLike(trimmed)}%`;
    // bond_no is stored as a number column; Q.like won't work on it
    // directly. We instead match account_name OR notes textually and
    // leave numeric bond_no filtering to a post-query JS pass via
    // `applyTextFilter` (kept consistent with how readings does the
    // over-consumption JS post-filter).
    conditions.push(
      Q.or(
        Q.where('account_name', Q.like(pattern)),
        Q.where('notes', Q.like(pattern)),
      ),
    );
  }

  if (filters.type !== 'all') {
    conditions.push(Q.where('bond_type', filters.type));
  }

  return database.collections
    .get<Bond>('bonds')
    .query(
      ...conditions,
      Q.sortBy('bond_date', Q.desc),
      Q.sortBy('bond_no', Q.desc),
    );
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Reactive observable of bonds matching the filters. The returned
 * Observable emits a fresh array on every relevant DB change.
 *
 * Numeric-only search queries (e.g. user typing "1003") are handled
 * client-side by `applyNumericBondNoFilter` — `buildQuery` only filters
 * on text columns. Callers that want bond-no search should compose:
 *
 *   observeBonds(filters).pipe(
 *     map(rows => applyNumericBondNoFilter(rows, filters.searchQuery)),
 *   )
 *
 * `BondsListScreen` does exactly that.
 */
export function observeBonds(filters: BondsQueryFilters): Observable<Bond[]> {
  return buildQuery(filters).observe();
}

/**
 * Client-side numeric-bond-no filter. Returns the rows whose `bondNo`
 * matches the query, where "matches" is `String(bondNo).includes(query)`.
 *
 * Returns the input unchanged when the query is empty or non-numeric
 * — used in combination with the text search inside `buildQuery`.
 */
export function applyNumericBondNoFilter(rows: Bond[], query: string): Bond[] {
  const trimmed = query.trim();
  if (trimmed === '') return rows;
  if (!/^\d/.test(trimmed)) return rows;
  return rows.filter((b) => String(b.bondNo).includes(trimmed));
}

/**
 * One-shot fetch with the same filters. Used by stats and non-reactive
 * consumers (export, print).
 */
export async function fetchBonds(filters: BondsQueryFilters): Promise<Bond[]> {
  return buildQuery(filters).fetch();
}

/**
 * Find by local_uuid. Returns null if not found. Used by BondDetail.
 */
export async function findBondByUuid(localUuid: string): Promise<Bond | null> {
  const rows = await database.collections
    .get<Bond>('bonds')
    .query(Q.where('local_uuid', localUuid))
    .fetch();
  return rows.length > 0 ? (rows[0] ?? null) : null;
}

/**
 * Reactive single-bond observable for the detail screen. Emits the row
 * when it changes (e.g. payment added → amount_paid updated) and
 * completes with `null` if the row is destroyed.
 *
 * Implementation: we observe a 1-row query rather than `bond.observe()`
 * directly so the detail screen can subscribe BEFORE it has a reference
 * to the model row (i.e. from a navigation param, by uuid).
 */
export function observeBondByUuid(
  localUuid: string,
): Observable<Bond | null> {
  // We piggyback on the standard `.observe()` of a uuid-filtered query
  // and project [first | null]. WMDB will keep this hot as long as the
  // subscriber is attached. Using rxjs `map` keeps the typing clean —
  // we never hand-roll a new Observable.
  return database.collections
    .get<Bond>('bonds')
    .query(Q.where('local_uuid', localUuid))
    .observe()
    .pipe(map((rows: Bond[]) => (rows.length > 0 ? (rows[0] ?? null) : null)));
}

/**
 * Aggregate stats. Counts are computed against the UNFILTERED collection
 * so the chip badges always reflect global totals regardless of what the
 * user typed into the search box.
 */
export async function getBondStats(): Promise<BondsStats> {
  const collection = database.collections.get<Bond>('bonds');
  const [total, receipt, payment, synced, dirty, failed] = await Promise.all([
    collection.query().fetchCount(),
    collection.query(Q.where('bond_type', 'receipt')).fetchCount(),
    collection.query(Q.where('bond_type', 'payment')).fetchCount(),
    collection.query(Q.where('sync_status', 'synced')).fetchCount(),
    collection.query(Q.where('sync_status', 'dirty')).fetchCount(),
    collection.query(Q.where('sync_status', 'failed')).fetchCount(),
  ]);
  return { total, receipt, payment, synced, dirty, failed };
}

/**
 * Live counts observable — convenience wrapper for chip badges. The
 * value re-emits on every `bonds` collection change. Implemented as a
 * one-shot fetch on each tick rather than a long-running aggregation
 * because the bonds collection is small (<10k rows realistically).
 */
export function observeBondStats(): Observable<BondsStats> {
  return database.collections
    .get<Bond>('bonds')
    .query()
    .observeWithColumns(['bond_type', 'sync_status'])
    .pipe(
      map((rows: Bond[]): BondsStats => {
        const stats: BondsStats = {
          total: rows.length,
          receipt: 0,
          payment: 0,
          synced: 0,
          dirty: 0,
          failed: 0,
        };
        for (const r of rows) {
          if (r.bondType === 'receipt') stats.receipt += 1;
          else if (r.bondType === 'payment') stats.payment += 1;
          if (r.pushStatus === 'synced') stats.synced += 1;
          else if (r.pushStatus === 'dirty') stats.dirty += 1;
          else if (r.pushStatus === 'failed') stats.failed += 1;
        }
        return stats;
      }),
    );
}
