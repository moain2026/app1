/**
 * WatermelonDB Migrations — العباسي تحصيل
 *
 * Add a new entry every time `SCHEMA_VERSION` (in ./schema.ts) is incremented.
 *
 * Pattern:
 *   {
 *     toVersion: 2,
 *     steps: [
 *       addColumns({ table: 'readings', columns: [{ name: 'new_col', type: 'string', isOptional: true }] }),
 *       createTable({ name: 'new_table', columns: [...] }),
 *     ],
 *   }
 */

import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // v1 is the initial schema — no migrations yet.
  ],
});
