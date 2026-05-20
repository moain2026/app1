/**
 * Readings Repository — العباسي تحصيل
 *
 * Thin abstraction between the React layer (store + components) and the
 * WatermelonDB `readings` collection. The repository:
 *
 *   • Builds reactive queries from user-facing filter objects.
 *   • Exposes idempotent upsert from server payloads (matched by
 *     local_uuid OR by the legacy composite key `num + noadad`).
 *   • Wraps the dirty-write + sync-queue enqueue dance for the
 *     "Save Reading" handler, with a Dev-Bypass skip path.
 *   • Computes aggregate stats for the StatBadge.
 *
 * The repository does NOT know about navigation, theming, or i18n —
 * everything it returns is a plain value or an Observable query. The
 * store layer is responsible for wiring everything to the UI.
 */

import { Q } from '@nozbe/watermelondb';
import { Observable, map } from 'rxjs';

import { database } from '@/database';
import type { PushStatus, Reading } from '@/database/models/Reading';
import { enqueueReadingSave } from '@/services/sync/enqueueHelpers';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

const log = logger.scope('ReadingsRepository');

// ─── Filter & sort types ──────────────────────────────────────────────────

export type ReadingStatusFilter = 'all' | 'pending' | 'posted' | 'over';
export type ReadingSortBy = 'num' | 'name' | 'noadad';
export type ReadingSortOrder = 'asc' | 'desc';

export interface ReadingsQueryFilters {
  /** Free-text search across name + namet + noadad. Empty string = no filter. */
  searchQuery: string;
  /** Area filter — readings.nomstlm equals this. null = no filter. */
  area: number | null;
  /** Book filter — readings.notblh equals this. null = no filter. */
  book: number | null;
  /** Group filter — readings.nog equals this. null = no filter. */
  group: number | null;
  /** Posting/consumption status — see ReadingStatusFilter. */
  status: ReadingStatusFilter;
  /** Sort column (legacy field name). */
  sortBy: ReadingSortBy;
  /** Sort direction. */
  sortOrder: ReadingSortOrder;
}

export interface ReadingsStats {
  total: number;
  posted: number;
  pending: number;
  /**
   * Count of rows with kh != null AND (kh - ks) > asts. Computed by
   * fetching all candidate rows (kh != null) and filtering in JS — the
   * over-consumption rule is a row-level inequality across columns,
   * which WatermelonDB's query DSL cannot express directly.
   */
  overConsumption: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function escapeForLike(value: string): string {
  // Q.like takes a SQL LIKE pattern. Escape % and _ defensively.
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Build a stable query from a filter object. The query is sorted by the
 * requested column + direction; secondary sort is always `num asc` to keep
 * paginated results stable when the primary column has ties.
 */
function buildQuery(filters: ReadingsQueryFilters) {
  const conditions: Q.Clause[] = [];

  // ─── Search ─────────────────────────────────────────────────────────
  const trimmed = filters.searchQuery.trim();
  if (trimmed.length > 0) {
    const pattern = `%${escapeForLike(trimmed)}%`;
    conditions.push(
      Q.or(
        Q.where('name', Q.like(pattern)),
        Q.where('namet', Q.like(pattern)),
        Q.where('noadad', Q.like(pattern)),
      ),
    );
  }

  // ─── Equality filters ──────────────────────────────────────────────
  if (filters.area !== null) {
    conditions.push(Q.where('nomstlm', filters.area));
  }
  if (filters.book !== null) {
    conditions.push(Q.where('notblh', filters.book));
  }
  if (filters.group !== null) {
    conditions.push(Q.where('nog', filters.group));
  }

  // ─── Status filter ─────────────────────────────────────────────────
  // 'posted'  -> cas != 0  (legacy rule)
  // 'pending' -> cas == 0
  // 'over'    -> handled at the JS layer (the over-consumption rule
  //              compares two columns; WMDB cannot express that in a
  //              single WHERE clause). We still narrow to cas==0 here
  //              so the JS filter only walks unposted rows.
  // 'all'     -> no filter.
  if (filters.status === 'posted') {
    conditions.push(Q.where('cas', Q.notEq(0)));
  } else if (filters.status === 'pending') {
    conditions.push(Q.where('cas', 0));
  } else if (filters.status === 'over') {
    conditions.push(Q.where('cas', 0));
    // The "kh != null AND kh - ks > asts" filter is applied below in JS.
  }

  // ─── Sort ──────────────────────────────────────────────────────────
  const dir = filters.sortOrder === 'asc' ? Q.asc : Q.desc;
  const sortClauses: Q.Clause[] = [Q.sortBy(filters.sortBy, dir)];
  if (filters.sortBy !== 'num') {
    sortClauses.push(Q.sortBy('num', Q.asc));
  }

  return database.collections
    .get<Reading>('readings')
    .query(...conditions, ...sortClauses);
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Reactive observable of readings matching the filters. The returned
 * Observable emits a fresh array on every relevant DB change.
 *
 * For the 'over' status we apply a JS post-filter because WMDB does not
 * support cross-column WHERE.
 */
export function observeReadings(
  filters: ReadingsQueryFilters,
): Observable<Reading[]> {
  const obs = buildQuery(filters).observe();
  if (filters.status === 'over') {
    return obs.pipe(
      map((rows: Reading[]) =>
        rows.filter((r) => r.kh != null && r.kh - r.ks > r.asts),
      ),
    );
  }
  return obs;
}

/**
 * One-shot fetch with the same filters. Used by the stats badge and any
 * non-reactive consumer.
 */
export async function fetchReadings(
  filters: ReadingsQueryFilters,
): Promise<Reading[]> {
  const rows = await buildQuery(filters).fetch();
  if (filters.status === 'over') {
    return rows.filter((r) => r.kh != null && r.kh - r.ks > r.asts);
  }
  return rows;
}

/**
 * Find by local_uuid. Returns null if not found. Used by ReadingDetail.
 */
export async function findByUuid(localUuid: string): Promise<Reading | null> {
  const rows = await database.collections
    .get<Reading>('readings')
    .query(Q.where('local_uuid', localUuid))
    .fetch();
  return rows.length > 0 ? (rows[0] ?? null) : null;
}

/**
 * Aggregate stats. Counts are computed against the UNFILTERED collection so
 * the badge always reflects the global totals regardless of what the user
 * has filtered the list down to.
 */
export async function getStats(): Promise<ReadingsStats> {
  const collection = database.collections.get<Reading>('readings');
  const [total, posted, pending, candidates] = await Promise.all([
    collection.query().fetchCount(),
    collection.query(Q.where('cas', Q.notEq(0))).fetchCount(),
    collection.query(Q.where('cas', 0)).fetchCount(),
    // For the over-consumption count we need to walk rows that have a
    // current reading (kh != null) and compare across columns in JS.
    collection.query(Q.where('kh', Q.notEq(null))).fetch(),
  ]);

  const overConsumption = candidates.filter(
    (r) => r.kh != null && r.kh - r.ks > r.asts,
  ).length;

  return { total, posted, pending, overConsumption };
}

// ─── Mutation: save a reading ─────────────────────────────────────────────

/**
 * Update the `kh` (current reading) on a single Reading row.
 *
 * Behaviour:
 *   • Wraps in a database.write so observables fire correctly.
 *   • Marks `pushStatus = 'dirty'` so the row badge shows the orange dot.
 *   • In Dev Bypass mode, SKIPS the sync_queue enqueue — the local edit
 *     stands on its own and is never pushed up to the legacy server.
 *   • In real mode, calls `enqueueReadingSave` which both flips the row
 *     to dirty AND enqueues a `reading update` job + triggers pushOnly().
 *
 * The row's `actualConsumption`, `isOverConsumption`, and `isEditLocked`
 * getters auto-update because they are derived from `kh / ks / asts / cas`.
 */
export async function updateLocalReading(
  reading: Reading,
  newKh: number,
): Promise<Reading> {
  if (reading.isEditLocked) {
    throw new Error('readings.detail.validation.locked');
  }

  const isDev = useAuthStore.getState().isDevBypass;

  if (isDev) {
    // Direct local write — no sync queue.
    await database.write(async () => {
      await reading.update((r) => {
        r.kh = newKh;
        r.readingDate = new Date();
        r.pushStatus = 'dirty';
        r.lastError = null;
        r.syncAttempts = 0;
      });
    });
    log.info('reading updated (dev bypass — no sync)', {
      uuid: reading.localUuid,
      kh: newKh,
    });
    return reading;
  }

  // Production path — write locally THEN enqueue.
  await database.write(async () => {
    await reading.update((r) => {
      r.kh = newKh;
      r.readingDate = new Date();
      r.pushStatus = 'dirty';
      r.lastError = null;
      r.syncAttempts = 0;
    });
  });

  // Build the wire payload via the mapper layer.
  await enqueueReadingSave(reading, toReadingDomain(reading, newKh), {
    triggerPush: true,
  });

  log.info('reading updated + enqueued', {
    uuid: reading.localUuid,
    kh: newKh,
  });
  return reading;
}

/**
 * Convert the WMDB Reading model row into the ReadingDomain shape expected
 * by `enqueueReadingSave` / `readingToDto`. The optional `overrideKh` lets
 * the caller supply the freshly-entered current reading even before the
 * row's own `kh` field has been written through.
 */
function toReadingDomain(
  reading: Reading,
  overrideKh?: number,
): import('@/services/api/mappers/reading.mapper').ReadingDomain {
  const kh = overrideKh ?? reading.kh ?? null;
  const actual = kh === null ? null : kh - reading.ks;
  return {
    num: reading.num,
    meterNumber: reading.noadad,
    customerName: reading.name,
    customerAlias: reading.namet ?? null,
    meterType: reading.ind,
    receiverArea: reading.nomstlm,
    bookNumber: reading.notblh,
    groupNumber: reading.nog,
    previousReading: reading.ks,
    currentReading: kh,
    postingStatus: reading.cas,
    expectedConsumption: reading.asts,
    isPosted: reading.cas !== 0,
    actualConsumption: actual,
  };
}

// ─── Mutation: retry a failed push ────────────────────────────────────────

/**
 * Re-enqueue a previously-failed reading push. Resets the sync_status to
 * 'dirty' + clears the lastError; the sync engine will pick it up on its
 * next tick or via the immediate `pushOnly()` triggered by enqueueReadingSave.
 */
export async function retryReadingPush(reading: Reading): Promise<void> {
  if (useAuthStore.getState().isDevBypass) {
    // No-op in dev mode.
    return;
  }
  await database.write(async () => {
    await reading.update((r) => {
      r.pushStatus = 'dirty';
      r.lastError = null;
      r.syncAttempts = 0;
    });
  });
  await enqueueReadingSave(reading, toReadingDomain(reading), {
    triggerPush: true,
  });
}

// ─── Re-export model push status type so consumers don't need a 2nd import ─
export type { PushStatus };
