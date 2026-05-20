/**
 * Database — Singleton entry point.
 *
 * Import this from anywhere in the app:
 *   import { database } from '@/database';
 *
 * To get a collection:
 *   const readings = database.collections.get<Reading>('readings');
 *
 * To run a reactive query:
 *   readings.query(Q.where('cas', 0)).observe()
 *
 * To write:
 *   await database.write(async () => {
 *     await readings.create(r => { r.noadad = '12345'; ... });
 *   });
 */

import { Database } from '@nozbe/watermelondb';

import { adapter } from './adapter';
import {
  Account,
  Bond,
  BondPayment,
  CompanyInfo,
  Currency,
  Place,
  Reading,
  SyncLog,
  SyncQueueItem,
  TGroup,
  Tblh,
  User,
} from './models';

export const database = new Database({
  adapter,
  modelClasses: [
    Reading,
    Bond,
    BondPayment,
    Account,
    Place,
    TGroup,
    Tblh,
    Currency,
    User,
    CompanyInfo,
    SyncQueueItem,
    SyncLog,
  ],
});

// ─── Re-exports for ergonomic imports ──────────────────────────────────────
export * from './models';
export { schema, SCHEMA_VERSION } from './schema';
