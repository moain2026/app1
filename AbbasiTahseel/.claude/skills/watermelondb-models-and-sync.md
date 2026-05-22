# Skill — WatermelonDB Models + Sync (Wave 6+)

> The project uses WatermelonDB 0.27.1 for local SQLite storage with
> reactive observables. This skill is needed for Wave 6 (Bonds), Wave 7
> (Reports), and any future model work.

## The basics

- **Engine:** WatermelonDB 0.27.1 (newer versions break JSI bridge)
- **Storage:** SQLite (via `@nozbe/watermelondb` SQLite adapter)
- **Reactivity:** `observe()` returns rxjs Observables — Component
  wraps in `withObservables` HOC
- **Models:** TypeScript classes in `src/database/models/`
- **Schema:** declarative in `src/database/schema.ts`
- **Migrations:** `src/database/migrations.ts`

## Layout

```
src/database/
├── adapter.ts             SQLite adapter setup
├── index.ts               Singleton `database` export + model registration
├── schema.ts              schema appSchema({version, tables: [...]})
├── migrations.ts          Schema migration history
└── models/
    ├── Account.ts         An "Account" row (customer)
    ├── Bond.ts            A bond (Wave 6 — defined, not yet activated)
    ├── BondPayment.ts     A bond payment (Wave 6)
    ├── CompanyInfo.ts     Company branding for receipts (Wave 5)
    ├── Currency.ts        IQD/USD with conversion ratio
    ├── Place.ts           Region/branch
    ├── Reading.ts         Meter reading (Wave 4 — fully active)
    ├── SyncLog.ts         Outbound sync log
    ├── SyncQueueItem.ts   Outbound queue item
    ├── TGroup.ts          Tariff group
    ├── Tblh.ts            "Tablo" / sub-region
    └── User.ts            User identity (mirrored from AuthStore)
```

## Anatomy of a model

```ts
// src/database/models/Foo.ts
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export class Foo extends Model {
  static table = 'foos';                    // ← matches schema.ts table name

  @text('name') name!: string;              // string column
  @field('count') count!: number;           // number column
  @text('sync_status') pushStatus!:         // ← aliased to avoid collision
       'pending' | 'synced' | 'failed';     // (sync_status is WMDB-internal too)

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
```

## CRITICAL — legacy column names

These column names MUST be preserved verbatim (server depends on them):

```
num   name   namet   ind   nomstlm   notblh   noadad   nog
ks    kh     cas     asts  sync_status
```

In TypeScript, you can RENAME the property:

```ts
@text('namet') englishName!: string;   // column "namet", JS prop "englishName"
```

…but NEVER change the column string itself.

## Schema declaration

```ts
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 5,                       // ← bump on every migration
  tables: [
    tableSchema({
      name: 'foos',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'count', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        // created_at + updated_at are automatic if @readonly @date is used
      ],
    }),
    // ... other tables
  ],
});
```

## Migrations

```ts
// src/database/migrations.ts
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'foos',
          columns: [
            { name: 'new_col', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    // ... older migrations
  ],
});
```

**Rules:**
- Always bump `appSchema.version` to match the highest `toVersion` migration
- Migrations are FORWARD-ONLY (no rollback)
- Use `isOptional: true` for new columns on existing tables so old rows pass
- Don't drop or rename columns on existing tables — create a new column,
  migrate data, deprecate the old one

## CRUD patterns

### Create

```ts
import { database } from '@/database';

await database.write(async () => {
  await database.collections.get('foos').create((foo: Foo) => {
    foo.name = 'Example';
    foo.count = 0;
    foo.pushStatus = 'pending';
  });
});
```

### Read (one-shot)

```ts
const allFoos = await database.collections.get<Foo>('foos').query().fetch();
const oneFoo = await database.collections.get<Foo>('foos').find(id);
```

### Read (reactive)

```ts
import { Q } from '@nozbe/watermelondb';

const observable = database.collections
  .get<Foo>('foos')
  .query(Q.where('sync_status', 'pending'))
  .observe();

observable.subscribe((foos) => {
  console.log('pending foos:', foos.length);
});
```

### Update

```ts
await database.write(async () => {
  await foo.update((f) => {
    f.count = 42;
    f.pushStatus = 'synced';
  });
});
```

### Delete

```ts
await database.write(async () => {
  await foo.markAsDeleted();   // soft delete (preserves for sync)
  // or:
  await foo.destroyPermanently(); // hard delete
});
```

## Reactive queries in components

```tsx
import { withObservables } from '@nozbe/watermelondb/react';

type Props = { reading: Reading };
const Enhanced = withObservables(['reading'], ({ reading }: Props) => ({
  reading: reading.observe(),     // re-renders when reading changes
}));

export default Enhanced(ReadingDetailContent);
```

For our project we tend to use a simpler hook pattern:

```ts
// src/hooks/useReadings.ts
import { useEffect, useState } from 'react';
import { database } from '@/database';

export function useReadings(filters: ReadingFilters): Reading[] {
  const [readings, setReadings] = useState<Reading[]>([]);
  useEffect(() => {
    const sub = database.collections
      .get<Reading>('readings')
      .query(...buildQueryClauses(filters))
      .observe()
      .subscribe(setReadings);
    return () => sub.unsubscribe();
  }, [filters]);
  return readings;
}
```

## Sync queue pattern (outbound)

Our app is OFFLINE-FIRST:
1. User makes a change → write to local DB with `sync_status: 'pending'`
2. `SyncQueueItem` row is added (records the API call to make)
3. `useSyncStore.flush()` drains the queue when online
4. On 2xx response → mark the source row `sync_status: 'synced'`
5. On 4xx/5xx → mark `sync_status: 'failed'` + log to `SyncLog`

See `src/services/sync/` for the implementation.

## Performance notes

- `query().fetch()` is OK for < 1000 rows. Beyond that, use lazy
  observables and pagination.
- `withObservables` re-renders only on observed changes, so it's cheap
  even for big lists.
- Indices on `sync_status` and `pushedAt` are critical — query
  performance drops 10x without them.

## Common pitfalls

### "TypeError: Cannot read property 'create' of undefined"

Model wasn't registered in `database/index.ts`. Add it to the
`modelClasses` array.

### "Schema version mismatch"

You added a column without bumping `appSchema.version` and without a
migration. Fix: bump version + add migration entry + reinstall the app
(or for dev, clear app data).

### `noUncheckedIndexedAccess` issues

`Q.where('field', value)` results are typed `T[]`, but with
`noUncheckedIndexedAccess: true`, `array[0]` is `T | undefined`:

```ts
const [first] = await query.fetch();   // first: Foo | undefined
if (first) { ... }
```

### Observable subscription leaks

Always `return () => sub.unsubscribe()` from `useEffect`. Otherwise the
subscription persists after unmount.

## DO NOT

- Use synchronous `database.collections.get(...).find(id)` — it returns
  a Promise. Always `await`.
- Forget the `database.write(async () => {...})` wrapper around mutations.
- Rename legacy columns. Read the rule above. Repeat. Memorize.
- Use raw SQL via `database.adapter.unsafeExecute(...)` unless you have
  a really good reason — bypasses reactivity.
