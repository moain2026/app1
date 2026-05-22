/**
 * Places Repository — العباسي تحصيل (Wave 6-Β)
 *
 * Read-only API around the `places` collection. Used by `PlacePicker`
 * and any other screen that needs the area (نمستلم) list.
 */

import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';

import { database } from '@/database';
import type { Place } from '@/database/models/Place';

/** Reactive sorted-by-name list of all places. */
export function observePlaces(): Observable<Place[]> {
  return database.collections
    .get<Place>('places')
    .query(Q.sortBy('name', Q.asc))
    .observe();
}

/** One-shot fetch. */
export async function fetchPlaces(): Promise<Place[]> {
  return database.collections
    .get<Place>('places')
    .query(Q.sortBy('name', Q.asc))
    .fetch();
}

/** Find one by `remote_id` (== legacy `readings.nomstlm`). */
export async function findPlaceByRemoteId(
  remoteId: number,
): Promise<Place | null> {
  const rows = await database.collections
    .get<Place>('places')
    .query(Q.where('remote_id', remoteId))
    .fetch();
  return rows.length > 0 ? (rows[0] ?? null) : null;
}
