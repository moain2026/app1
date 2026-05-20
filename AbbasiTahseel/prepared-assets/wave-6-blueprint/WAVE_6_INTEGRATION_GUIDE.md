# Wave 6 — Integration Guide

> **Read this first.** It explains the layered architecture of the bonds
> subsystem, the order in which to integrate the templates, and — most
> importantly — three **schema-level decisions** the prep agent had to
> make based on what's actually in `src/database/schema.ts` today.

---

## 0. Pre-flight: three corrections to the task spec

When auditing existing code to write these templates, the prep agent
found three places where the original task description had drifted from
the live codebase. Each one is annotated below so the main agent can
verify before integrating.

### 0.1 Column names — modern, NOT legacy

The task spec listed legacy Java column names (`numb`, `datb`, `kindb`,
`totalb`, `totaldb`, `notesb`, `noaccb`, `printedb`, `voidedb`, `numbp`,
`kindp`, `valuep`, `noteb`, `valuer`).

**Reality** — `src/database/schema.ts` already uses **modern names** in
the WatermelonDB schema:

| Legacy (Java) | Modern (WatermelonDB) | Used in template |
|---|---|---|
| `numb`     | `bond_no`        | `bond_no` |
| `datb`     | `bond_date`      | `bond_date` |
| `kindb`    | `bond_type`      | `bond_type` |
| `totalb`   | `amount`         | `amount` |
| `totaldb`  | `amount_paid`    | `amount_paid` |
| `notesb`   | `notes`          | `notes` |
| `noaccb`   | `account_id` / `account_name` | `account_id` + `account_name` |
| `numbp`    | (uses Watermelon `id` PK) | via `id` |
| `kindp`    | `payment_method` | `payment_method` |
| `valuep`   | `amount`         | `amount` |
| `noteb`    | `notes`          | `notes` |

**Why this is correct:** the model files `src/database/models/Bond.ts`
and `BondPayment.ts` ALREADY use the modern names with `@field`/`@text`
decorators. Reverting to legacy names would break the live build. The
modern→legacy mapping happens at the **sync push payload** layer (see
`src/services/sync/*`), not at the local DB layer.

### 0.2 Missing columns — schema migration required

The task spec referenced four columns that **do not exist yet**:

- `printedb` (bond is immutable once printed)
- `voidedb` (bond was voided)
- A junction table `bond_readings` linking bonds <-> readings

Wave 6 must ship a **schema migration** that adds these. The migration
file is sketched in `bondsRepository.template.ts` JSDoc and in §3 below.
A bumped `SCHEMA_VERSION` is mandatory.

### 0.3 Mock file names

Task spec said `bonds-mock.json` and `payments-mock.json`. The actual
filenames (created in the Wave-5/6/7 prep run, Task 3) are:

- `prepared-assets/mock/mock-bonds.json`
- `prepared-assets/mock/mock-payments.json`
- `prepared-assets/mock/mock-currencies.json`

The seeder template references the actual filenames.

---

## 1. Architecture (where every file lives)

```
src/
├─ database/
│  ├─ schema.ts                <- bump SCHEMA_VERSION; add printed_at,
│  │                              voided_at, voided_by, plus
│  │                              bond_readings table (see §3)
│  ├─ migrations.ts            <- migration v(N+1): add 3 cols + table
│  └─ models/
│     ├─ Bond.ts               <- EXTEND existing file with new fields
│     ├─ BondPayment.ts        <- EXISTING - no changes needed
│     ├─ BondReading.ts        <- NEW (from BondReading.model.template.ts)
│     └─ index.ts              <- export BondReading
├─ services/
│  └─ bonds/
│     ├─ bondsRepository.ts    <- NEW (from bondsRepository.template.ts)
│     └─ bondsMockSeeder.ts    <- NEW (from bondsMockSeeder.template.ts)
├─ stores/
│  ├─ bondsStore.ts            <- NEW (from bondsStore.template.ts)
│  └─ index.ts                 <- export useBondsStore
└─ screens/
   └─ main/
      ├─ BondsScreen.tsx       <- REPLACE existing Wave-4 placeholder
      ├─ BondDetailScreen.tsx  <- NEW
      └─ NewBondScreen.tsx     <- NEW
```

> **Note for the main agent:** `Bond.ts` and `BondPayment.ts` already
> exist in `src/database/models/`. The template `Bond.model.template.ts`
> in this folder is a **superset** showing the final shape after the
> migration adds `printed_at`, `voided_at`, and `voided_by`. DO NOT
> overwrite blindly — copy only the new decorators + getters.

---

## 2. Integration order (do these in order, don't skip)

1. **Schema migration** (`schema.ts` + `migrations.ts`)
   - Bump `SCHEMA_VERSION` by 1.
   - Add to `bonds` table: `printed_at` (number, optional), `voided_at`
     (number, optional), `voided_by` (string, optional).
   - Add new `bond_readings` table (columns in §3).
   - Add migration with `addColumns` + `createTable` steps.

2. **Models** — extend `Bond.ts`, create `BondReading.ts`, export from
   `models/index.ts`, register in `database/index.ts` `modelClasses`.

3. **Repository** — drop `bondsRepository.ts` into `src/services/bonds/`.
   No edits needed once schema is migrated.

4. **Store** — drop `bondsStore.ts` into `src/stores/` + add to barrel.

5. **i18n** — merge `prepared-assets/i18n/ar-wave6-bonds.json` into the
   live ar bundle (`src/i18n/locales/ar.json`).

6. **Mock seeder** — wire `bondsMockSeeder.seedIfDevBypass()` into the
   existing dev-bypass boot sequence (alongside the readings seeder that
   Wave 4 introduces).

7. **Screens** — drop the three `.tsx` files into `src/screens/main/`,
   replacing the existing `BondsScreen.tsx` placeholder.

8. **Navigation** — register `BondDetail` and `NewBond` in the
   `MainStack`. The bonds list already has a tab route; the two new
   routes are nested under `MainStack` (NOT under bottom tabs).

---

## 3. Schema additions (verbatim — copy into `schema.ts`)

### 3.1 Extend `bonds` table

```ts
// inside tableSchema({ name: 'bonds', columns: [ ... existing ... ,
  { name: 'printed_at', type: 'number', isOptional: true },
  { name: 'voided_at',  type: 'number', isOptional: true },
  { name: 'voided_by',  type: 'string', isOptional: true }, // user.local_uuid
// ] })
```

### 3.2 New `bond_readings` junction table

```ts
tableSchema({
  name: 'bond_readings',
  columns: [
    { name: 'local_uuid',  type: 'string', isIndexed: true },
    { name: 'bond_id',     type: 'string', isIndexed: true }, // FK -> bonds.id
    { name: 'reading_id',  type: 'string', isIndexed: true }, // FK -> readings.id
    { name: 'reading_num', type: 'number', isIndexed: true }, // legacy num
    { name: 'amount',      type: 'number' },                  // legacy "valuer"

    // sync
    { name: 'sync_status', type: 'string', isIndexed: true },
    { name: 'last_sync_attempt_at', type: 'number', isOptional: true },
    { name: 'last_error',  type: 'string', isOptional: true },
    { name: 'sync_attempts', type: 'number' },

    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
}),
```

### 3.3 Migration

```ts
import { addColumns, createTable, schemaMigrations } from
  '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: N + 1, // current + 1
      steps: [
        addColumns({
          table: 'bonds',
          columns: [
            { name: 'printed_at', type: 'number', isOptional: true },
            { name: 'voided_at',  type: 'number', isOptional: true },
            { name: 'voided_by',  type: 'string', isOptional: true },
          ],
        }),
        createTable({
          name: 'bond_readings',
          columns: [/* same as §3.2 */],
        }),
      ],
    },
  ],
});
```

---

## 4. Package additions

**None.** Wave 6 uses only what's already in `package.json`:

- `@nozbe/watermelondb` — DB (already present)
- `zustand` — store (already present)
- `react-native-mmkv` — store persistence (already present)
- `react-i18next` — translations (already present)
- `react-hook-form` + `zod` — form validation in `NewBondScreen` (already present)
- `@shopify/flash-list` — the list in `BondsScreen` falls back to
  `FlatList` if FlashList isn't installed; template uses FlatList by
  default for zero new deps.

The bond receipt printing pulls from Wave 5 (`receiptPrintService` +
`printerManager`) — no new printer deps in Wave 6.

---

## 5. i18n integration

The Arabic key catalogue lives at
`prepared-assets/i18n/ar-wave6-bonds.json` (~69 keys, namespaces:
`bonds.list.*`, `bonds.detail.*`, `bonds.new.*`, `bonds.payments.*`,
`bonds.errors.*`).

```bash
# Merge into the main ar.json bundle:
jq -s '.[0] * .[1]' \
   src/i18n/locales/ar.json \
   prepared-assets/i18n/ar-wave6-bonds.json \
   > src/i18n/locales/ar.merged.json
mv src/i18n/locales/ar.merged.json src/i18n/locales/ar.json
```

The templates use these key paths verbatim — if a translation is
missing, `t()` returns the key string (visible in dev, ugly but
non-fatal).

---

## 6. Mock data seeding (Dev Bypass)

The seeder mirrors the (forthcoming) readings seeder pattern: only runs
when `__DEV__ === true` AND a `dev_bypass` flag is set in MMKV. It is
**idempotent** — each mock bond uses a deterministic UUID derived from
the legacy `num`. The sentinel marker `bonds_mock_seeded_v1` in MMKV
short-circuits subsequent runs.

Wiring in `App.tsx` (next to readings seeder):

```ts
if (__DEV__ && prefs.getBoolean('dev_bypass') === true) {
  await seedReadingsIfDevBypass();
  await seedBondsIfDevBypass();  // <- new
}
```

---

## 7. Critical pitfalls (lessons from the prep audit)

| # | Pitfall | Mitigation |
|---|---|---|
| 1 | Forgetting to bump `SCHEMA_VERSION` after editing `schema.ts` | WatermelonDB throws on app launch — easy to spot. |
| 2 | Using legacy column names (`numb`, `kindb`, …) in `@field` decorators | Template uses modern names; main agent should not "translate back". |
| 3 | Mixing currencies in totals | `bondsRepository.totalByCurrency` returns `Map<currencyId, number>` — never a scalar. Screens render one line per currency. |
| 4 | Treating IQD like a 2-decimal currency | `formatAmount` checks the currency's `decimals` field. IQD is integer-only. **Never** call `.toFixed(2)` blindly. |
| 5 | Letting a printed bond be edited | `Bond.isImmutable` returns true if `printed_at !== null`. The `voidBond()` repo function bypasses this check (legitimate). All other mutators must early-return. |
| 6 | Voiding bond without admin PIN | `voidBond` requires a `confirmedByPin` argument; the PIN is verified against the user record before the write. **No way** to void without it. |
| 7 | Race: print-then-fail-to-sync | `markPrinted()` writes `printed_at` BEFORE the print buffer is sent. If print fails, the bond is still marked printed (intentional — paper exists in user's hand). User can reprint via "نسخة طبق الأصل". |
| 8 | Junction integrity: deleting a reading orphans its bond_reading row | Sync engine's tombstone handling owns this. Repository's `linkReading()` doesn't delete the parent reading. |
| 9 | Bond total ≠ sum of readings | Wizard step 3 enforces this in `NewBondScreen` per currency. Confirm action is disabled until match. |
| 10 | `useBondsStore` selectors returning new array identities every render | Heavy derived values are memoised inside the screen via `useMemo`. Store keeps only primitives + small arrays. |

---

## 8. Time savings — estimate

| Task | Without templates | With templates | Saved |
|---|---|---|---|
| Schema migration design + write | 25 min | 5 min (copy from §3) | **20 min** |
| Bond model extension + BondReading model | 20 min | 5 min | **15 min** |
| Repository CRUD + transactions | 30 min | 8 min | **22 min** |
| Zustand store + persistence + selectors | 25 min | 5 min | **20 min** |
| BondsScreen (list + filter + sort + search) | 30 min | 10 min | **20 min** |
| BondDetailScreen (4 cards + print + void) | 30 min | 10 min | **20 min** |
| NewBondScreen (4-step wizard + validation) | 40 min | 12 min | **28 min** |
| Mock seeder (deterministic, idempotent) | 15 min | 3 min | **12 min** |
| i18n + nav wiring | 10 min | 2 min | **8 min** |
| **TOTAL** | **225 min** | **60 min** | **~165 min (2h45m)** |

Compared with Wave 5's ~120 min savings, the bigger gain here comes
from the wizard validation logic (per-currency total matching) and the
nuanced print/void state machine — both already encoded in the
templates.

---

## 9. Cross-references

| Topic | File |
|---|---|
| Bond receipt layout (cp1256, multi-currency totals) | `prepared-assets/receipts/bond-receipt-template.md` |
| Receipt builder type contracts | `prepared-assets/receipts/receipt-builder-pseudocode.ts` |
| Wave 5 printer service (printBond) | `prepared-assets/wave-5-blueprint/receiptPrintService.template.ts` |
| Mock data — bonds | `prepared-assets/mock/mock-bonds.json` (30 rows) |
| Mock data — payments | `prepared-assets/mock/mock-payments.json` (60 rows) |
| Mock data — currencies | `prepared-assets/mock/mock-currencies.json` (4 rows) |
| i18n keys (Arabic) | `prepared-assets/i18n/ar-wave6-bonds.json` |
| Validation error keys | `prepared-assets/i18n/ar-validation-errors.json` |
| Project conventions | `AbbasiTahseel/PROJECT_PLAYBOOK.md` |
| Existing Bond model | `AbbasiTahseel/src/database/models/Bond.ts` |
| Existing schema (bonds + bond_payments) | `AbbasiTahseel/src/database/schema.ts` §2-§3 |
