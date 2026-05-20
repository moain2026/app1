/**
 * WatermelonDB Adapter — العباسي تحصيل
 *
 * Uses SQLiteAdapter with JSI mode for maximum performance.
 * The Android-only build means we don't need the SQLite shim that
 * is required for browser tests; the native module is always present.
 */

import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { migrations } from './migrations';
import { schema } from './schema';

export const adapter = new SQLiteAdapter({
  schema,
  migrations,

  // ─── Database file name (sqlite file on disk) ───────────────────────────
  dbName: 'abbasi_tahseel.db',

  // ─── JSI mode ───────────────────────────────────────────────────────────
  // Significantly faster than the async bridge. Required for our 60fps
  // FlashList of 500–2000 readings.
  jsi: true,

  // ─── Migration safety ───────────────────────────────────────────────────
  // If a migration is missing on a higher schema version, the adapter will
  // throw on startup. This prevents data corruption. In production we ship
  // a fresh APK with the matching schema; in dev we wipe & reinstall.
  onSetUpError: error => {
    // eslint-disable-next-line no-console
    console.error('[WatermelonDB] adapter setup failed:', error);
  },
});
