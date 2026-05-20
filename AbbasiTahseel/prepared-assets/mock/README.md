# Mock Data Fixtures — for Dev Bypass mode

This folder contains realistic mock data for the Wave 5/6/7 features.
All JSON is **deterministically generated** by `_gen.js` (seeded PRNG), so re-running
the generator produces an identical diff-free output.

---

## Files

| File                      | Records | Used by                                    |
|---------------------------|---------|--------------------------------------------|
| `mock-accounts.json`      | 40      | Bonds → subscriber lookup, balance display |
| `mock-currencies.json`    | 4       | Bonds → payment currency picker            |
| `mock-bonds.json`         | 30      | Bonds list / detail screens                |
| `mock-payments.json`      | 60      | Bond detail (2 payments per bond)          |
| `mock-reports-data.json`  | —       | Reports screen (daily/weekly/monthly/area) |
| `_gen.js`                 | —       | Generator (Node.js, no deps)                |

### Field cheat sheet

#### `mock-accounts.json`
```ts
{
  id: string;          // uuid
  noadad: string;      // 8-digit account number
  name: string;        // Arabic, full name
  phone: string;       // 11 digits, Iraq mobile
  address: string;     // "بغداد - <area> - <street>"
  area_name: string;
  balance: number;     // remaining debt in IQD
  last_reading: number;
  avg_consumption: number; // kWh/month
  server_id: number;
  sync_status: 'synced';
  updated_at: number;  // ms since epoch
}
```

#### `mock-bonds.json`
```ts
{
  id, local_uuid: string;
  num: number;         // sequential 1001..1030
  server_id: number | null;
  noadad, subscriber_name, area_name: string;
  collector_id: string;
  total_amount: number;  // IQD equivalent (USD × 1310 collapsed)
  bond_date: number;     // ms since epoch
  notes: string | null;
  previous_balance, new_balance: number;
  sync_status: 'synced' | 'pending' | 'error';   // ~90/7/3 split
  is_reprint: boolean;
  created_at, updated_at: number;
}
```

#### `mock-payments.json`
```ts
{
  id: string;
  bond_id: string;     // FK → bonds.id
  amount: number;
  payment_type: 'cash' | 'transfer' | 'installment' | 'cheque' | 'mixed';
  currency_id: 'IQD' | 'USD';
  description: string; // Arabic short label
  created_at: number;
}
```

#### `mock-currencies.json`
```ts
{
  id: 'IQD'|'USD'|'EUR'|'TRY';
  name: string;     // Arabic
  symbol: string;
  exchange_rate: number; // → IQD
  is_default: boolean;
  order: number;
}
```

#### `mock-reports-data.json`
```ts
{
  daily:    Array(30)  { date_iso, timestamp, readings_count, bonds_count, total_amount_iqd, total_amount_usd, area_breakdown[5] }
  weekly:   Array(8)   { week_number, week_start, week_end, ...totals }
  monthly:  Array(12)  { month_number, month_name_ar, year, readings_count, bonds_count, total_amount_iqd, total_amount_usd, active_collectors }
  by_area:  Array(5)   { area_name, total_subscribers, active_subscribers, total_readings_30d, ... }
}
```

---

## How the main agent consumes these (in Wave 5/6/7)

### 1. Create thin TS wrappers

Under `src/services/mock/`:

```ts
// src/services/mock/seedMockAccounts.ts
import accounts from '../../../prepared-assets/mock/mock-accounts.json';
import { database } from '../../db';

export async function seedMockAccounts() {
  await database.write(async () => {
    const accountsCollection = database.get<AccountModel>('accounts');
    await Promise.all(
      (accounts as MockAccount[]).map((a) =>
        accountsCollection.create((rec) => {
          rec._raw.id = a.id;
          rec.noadad = a.noadad;
          rec.name = a.name;
          rec.phone = a.phone;
          rec.address = a.address;
          rec.areaName = a.area_name;
          rec.balance = a.balance;
          rec.serverId = a.server_id;
          rec.syncStatus = 'synced';
        }),
      ),
    );
  });
}
```

> ⚠ Update the `tsconfig.json` `resolveJsonModule` is **already true** in the main app (Wave 1 / RN preset). No config change needed.
>
> ⚠ Do **NOT** import these from production code. Wrap every call in:
> ```ts
> if (__DEV__ && useDevStore.getState().bypass) {
>   await seedMockAccounts();
> }
> ```

### 2. Wire them into Dev Bypass mode

Add to `src/dev/DevBypassPanel.tsx` (already exists from Wave 4):

```ts
const seedAll = async () => {
  await seedMockCurrencies();
  await seedMockAccounts();
  await seedMockBonds();      // depends on accounts
  await seedMockPayments();   // depends on bonds
  Toast.show('✓ Seeded 40 accounts, 30 bonds, 60 payments');
};
```

### 3. Cleanup helper

```ts
export async function clearMockData() {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
}
```

---

## Regenerating

```bash
cd prepared-assets/mock
node _gen.js
```

Output is **deterministic** (seed `0xABBA51`). Any non-empty git diff after a
regenerate means someone edited `_gen.js` — please commit the regenerated JSONs
in the same commit.

---

## Data realism notes

- Names are **plausible Iraqi-style** (first + father + tribe/family).
- Phone numbers use real Iraqi mobile prefixes (077x, 078x, 079x, 075x).
- Areas are 5 real Baghdad neighbourhoods (الكرادة، البياع، الجادرية، الكاظمية، المنصور).
- ~10 % of bonds are unsynced (pending=7 %, error=3 %) — covers the sync UI.
- ~15 % of bonds carry a USD payment in addition to IQD — covers multi-currency UX.
- One large bond every ~11 records → ensures bond totals span 5 K to ~500 K د.ع.
