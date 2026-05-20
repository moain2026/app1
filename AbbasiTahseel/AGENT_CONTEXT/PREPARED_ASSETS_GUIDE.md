# PREPARED_ASSETS_GUIDE — What's in `prepared-assets/`

> **`prepared-assets/` is git-ignored** (`.gitignore` rule). It exists only
> in the working copy and is used as a reference / scaffold. **Never merge
> it into a feature branch.** Copy what you need into `src/` instead.

## Why it exists

The user staged a parallel branch `prep/wave-5-7-assets` with everything
the agent needs to finish Waves 5/6/7 without back-and-forth questions:
spec tables, mapping JSONs, mock data, i18n bulk keys, release recipes,
documentation drafts. We cloned that branch's `prepared-assets/` into the
working copy and gitignored it.

## Directory layout

### `prepared-assets/printer/` (Wave 5)

- **`cp1256-arabic-mapping.json`** — 226-entry Unicode → cp1256 byte map,
  including Lam-Alef ligatures (1 codepoint → 2 bytes). Already consumed
  by `src/services/printer/cp1256.ts`. Don't re-import.
- **`escpos-commands-reference.md`** — Hex bytes + JS builders for every
  ESC/POS command used. Already consumed by `escposBuilder.ts`.
- **`datecs-sdk-research.md`** — Library comparison: chose
  `react-native-bluetooth-classic` (Path A) over wrapping Datecs JAR.
  Source for ADR-015.
- **`datecs-dpp250-specs.md`** — Hardware datasheet excerpts (48 cpl,
  thermal head, paper width, BT SPP profile).
- **`printer-test-page.txt`** — ASCII source for the test print pattern.
  `src/services/printer/testPage.ts` mirrors this.

### `prepared-assets/receipts/` (Wave 5 + 6 + 7)

- `receipt-builder-pseudocode.ts` — Generic blueprint.
- `reading-receipt-template.md` — Used by `buildReadingReceipt.ts`.
- `bond-receipt-template.md` — Used by `buildBondReceipt.ts`.
- `daily-summary-template.md` — Used by `buildDailySummary.ts`.

### `prepared-assets/i18n/` (Waves 5/6/7)

Bulk Arabic strings, separated per wave so they can be merged
incrementally into `src/i18n/locales/ar.json`:

- `ar-wave5-printer.json` — `printer.*`, `scanner.*`, `company.*`,
  `drawer.printerSettings`, `drawer.companyInfo`.
- `ar-wave6-bonds.json` — `bonds.*`, `bonds.payment.*`, currency strings.
- `ar-wave7-reports.json` — `reports.*`, `profile.*`, `about.*`,
  `appSettings.*`, `changePin.*`.
- `ar-validation-errors.json` — `validation.*` zod error i18n keys.

### `prepared-assets/mock/` (Waves 6 + 7)

- `mock-accounts.json` (40 accounts) — Wave 6 subscriber lookup.
- `mock-bonds.json` (20 bonds) — Wave 6 list.
- `mock-currencies.json` (IQD + USD) — Wave 6 currency dropdown.
- `mock-payments.json` — Wave 6 BondPayment seed.
- `mock-reports-data.json` — Wave 7 charts/aggregations.

### `prepared-assets/proguard/` (Wave 7)

- `proguard-rules.pro` — Release minify rules: keep WatermelonDB native
  bridge classes, react-native-bluetooth-classic, vision-camera, MMKV,
  Keychain modules.

### `prepared-assets/ci/` (Wave 7)

- `build-release-apk.yml` — GitHub Actions workflow that builds signed
  release APK + uploads as artifact + creates GitHub Release.
- `keystore-setup.md` — Step-by-step for generating the upload keystore,
  storing it in GitHub Secrets, and wiring into `app/build.gradle`.

### `prepared-assets/docs/` (Wave 7)

- `USER_GUIDE_AR.md` — End-user manual in Arabic.
- `MIGRATION_GUIDE_AR.md` — How to migrate from the legacy Java app.
- `ADMIN_GUIDE.md` — Server-side admin reference.
- `DEVELOPER_HANDOFF.md` — Codebase tour for the next dev.
- `LEGACY_API_REFERENCE.md` — Endpoints + payloads of the legacy
  ElectricCollector28 backend.

### `prepared-assets/INDEX.md`

Master index mapping every file in `prepared-assets/` to its destination
in `src/` once consumed.

## Workflow

1. **Read the relevant md/json file** (`Read` tool).
2. **Convert into TypeScript / merge into target file** — never `cp`
   directly into `src/` because the formats differ (md → TS, JSON-bundle
   → merged JSON).
3. Commit the **derived** code, not the asset.
4. Never `git add prepared-assets/`. (The `.gitignore` line should catch
   accidents; double-check before pushing.)
