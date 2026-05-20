# 📦 Prepared Assets — Waves 5, 6, 7

This folder contains **reference material** prepared in advance for the main agent
when building Waves 5 (Printer + Camera), 6 (Bonds + Payments), and 7 (Reports +
Profile + About + Release).

> ⚠️ **No executable code lives in `src/`.** Everything here is reference, pseudocode,
> templates, fixtures, configuration, or documentation. The main agent **copies / adapts**
> from this folder rather than rebuilding from scratch.

---

## 📂 Folder layout

```
prepared-assets/
├─ INDEX.md                          ← you are here
│
├─ printer/                          ← Wave 5
│  ├─ datecs-sdk-research.md        — library comparison + recommendation
│  ├─ escpos-commands-reference.md  — full ESC/POS reference with JS builders
│  ├─ cp1256-arabic-mapping.json    — Unicode → cp1256 byte table
│  ├─ datecs-dpp250-specs.md        — full DPP-250 specs
│  └─ printer-test-page.txt         — pseudo-asm test-page template
│
├─ receipts/                         ← Waves 5 + 6
│  ├─ reading-receipt-template.md   — 48cpl layout + placeholders + 5 test cases
│  ├─ bond-receipt-template.md      — multi-currency totals + QR payload + variants
│  ├─ daily-summary-template.md     — stats + per-area breakdown + sync banner
│  └─ receipt-builder-pseudocode.ts — blueprint for receipt builders
│
├─ mock/                             ← Waves 5 + 6 + 7
│  ├─ _gen.js                       — deterministic Node generator (no deps)
│  ├─ mock-accounts.json            — 40 subscribers (Iraqi names, areas)
│  ├─ mock-currencies.json          — IQD/USD/EUR/TRY with exchange rates
│  ├─ mock-bonds.json               — 30 bonds (90% synced / 7% pending / 3% error)
│  ├─ mock-payments.json            — 60 payments (2/bond), mixed types/currencies
│  ├─ mock-reports-data.json        — 30 daily / 8 weekly / 12 monthly / 5 areas
│  └─ README.md                     — schemas + dev-bypass seeding strategy
│
├─ i18n/                             ← Waves 5 + 6 + 7
│  ├─ ar-wave5-printer.json         — ~70 keys: printer, scanner, print preview
│  ├─ ar-wave6-bonds.json           — ~95 keys: bonds list/detail/new/payments
│  ├─ ar-wave7-reports.json         — ~110 keys: reports, profile, about, settings
│  ├─ ar-validation-errors.json     — ~55 keys: unified zod/form messages
│  └─ INTEGRATION_GUIDE.md          — merge strategy + zod hookup
│
├─ proguard/                         ← Wave 7
│  ├─ proguard-rules.pro            — keep-rules for ~20 libs
│  ├─ proguard-research.md          — per-library rationale + debug procedure
│  └─ minification-strategy.md      — flavour matrix + APK budget + sign-off list
│
├─ ci/                               ← Wave 7
│  ├─ build-release-apk.yml         — signed-APK workflow (tag-driven)
│  ├─ keystore-setup.md             — keytool + 3-way backup + GH Secrets wiring
│  └─ release-checklist.md          — 10-section pre-release gate
│
└─ docs/                             ← Wave 7
   ├─ USER_GUIDE_AR.md              — Arabic user manual (11 sections)
   ├─ MIGRATION_GUIDE_AR.md         — old→new transition, 7-day overlap plan
   ├─ ADMIN_GUIDE.md                — bilingual EN+AR, 50-device deployment
   ├─ DEVELOPER_HANDOFF.md          — sync engine deep-dive, tech debt, roadmap
   └─ LEGACY_API_REFERENCE.md       — all 31 endpoints with samples
```

---

## 🗂 Stats

| Metric                | Value          |
|-----------------------|----------------|
| Total files           | 32             |
| Markdown docs         | 19             |
| JSON fixtures / refs  | 9              |
| Code-shape files      | 3 (`.pro`, `.yml`, `.ts` pseudocode) |
| Mock records (total)  | 134 (40 accounts + 30 bonds + 60 payments + 4 currencies) |
| i18n keys             | ~330           |
| ProGuard libs covered | ~20            |
| Documentation pages   | 5              |
| Lines (all files)     | **~9,100**     |

---

## 🛠 How the main agent uses these — wave by wave

### ➤ Wave 5 — Printer + Camera

1. **Pick the library.** Read `printer/datecs-sdk-research.md`. Decision is
   `react-native-bluetooth-classic@1.73.0-rc.12`. Install it.
   ```bash
   npm install react-native-bluetooth-classic@1.73.0-rc.12 --save-exact
   ```
2. **Build the ESC/POS layer.** Use `printer/escpos-commands-reference.md` as the
   spec for `src/services/printer/escposBuilder.ts`. Each `cmd*` function is
   already mapped to its hex bytes.
3. **Add cp1256 encoding.** Copy `printer/cp1256-arabic-mapping.json` →
   `src/services/printer/cp1256.ts` (turn the JSON into a `Record<number, number>`
   constant). Implement `encodeCp1256(text: string): Uint8Array` (shape + reverse
   + map → bytes).
4. **Implement transport.** Wrap `react-native-bluetooth-classic` in
   `src/services/printer/datecsTransport.ts`. Reference connection / write /
   onDataReceived snippets are in `datecs-sdk-research.md` §6.
5. **Receipt builders.** Use `receipts/receipt-builder-pseudocode.ts` as the
   skeleton; layouts come from `receipts/reading-receipt-template.md` and
   `receipts/bond-receipt-template.md`.
6. **Test-print page.** Translate `printer/printer-test-page.txt` into a builder
   in `src/services/printer/testPage.ts`.
7. **Merge i18n.** Apply `i18n/ar-wave5-printer.json` to `src/i18n/locales/ar.json`
   following `i18n/INTEGRATION_GUIDE.md`.
8. **Camera scanner.** No fixture needed — install `react-native-vision-camera` +
   ML Kit barcode plugin. i18n keys are under `scanner.*` in the printer file.
9. **Mock seeders.** Add `seedMockAccounts.ts` (only for Dev Bypass) using
   `mock/mock-accounts.json`.

### ➤ Wave 6 — Bonds + Payments

1. **Merge i18n.** Apply `i18n/ar-wave6-bonds.json` + relevant validation keys
   from `i18n/ar-validation-errors.json`.
2. **Seed mock data.** Wire `mock/mock-bonds.json` + `mock/mock-payments.json` +
   `mock/mock-currencies.json` into Dev Bypass seeders.
3. **Bond receipt printing.** Reuse Wave-5 printer stack; call
   `buildBondReceipt(...)` from `receipts/receipt-builder-pseudocode.ts`.
4. **Multi-currency UX.** Use the rules in `receipts/bond-receipt-template.md` §3.
5. **Validation.** Use the `validation.amount.*` keys for Zod schemas; format per
   `i18n/INTEGRATION_GUIDE.md` §5.

### ➤ Wave 7 — Reports + Profile + About + Release

1. **Reports screen data.** Wire `mock/mock-reports-data.json` into the reports
   service in Dev Bypass mode. Production pulls from `/electric/reports/*`.
2. **PDF export.** Install `react-native-html-to-pdf` (rules already in
   `proguard/proguard-rules.pro`).
3. **Charts.** Install `react-native-chart-kit` (rules already provided).
4. **i18n merge.** Apply `i18n/ar-wave7-reports.json`.
5. **Daily summary print.** Reuse `receipts/daily-summary-template.md` +
   `buildDailySummary(...)` blueprint.
6. **Release pipeline.**
   - Copy `proguard/proguard-rules.pro` → `android/app/proguard-rules.pro`.
   - Apply minification flags from `proguard/minification-strategy.md` §1 to
     `android/app/build.gradle`.
   - Copy `ci/build-release-apk.yml` → `.github/workflows/build-release-apk.yml`.
   - Follow `ci/keystore-setup.md` to generate the keystore + secrets.
7. **Documentation.**
   - Copy `docs/USER_GUIDE_AR.md`, `docs/MIGRATION_GUIDE_AR.md`,
     `docs/ADMIN_GUIDE.md`, `docs/DEVELOPER_HANDOFF.md`,
     `docs/LEGACY_API_REFERENCE.md` → `AbbasiTahseel/docs/`.
   - Replace `📷 *mكان لقطة الشاشة*` placeholders with real screenshots.

---

## 🚦 Rules for the main agent

- ✅ **Copy** content into `src/` files — that's the whole point.
- ✅ **Adapt** TypeScript signatures to match real models.
- ✅ **Re-run** `mock/_gen.js` if you need to extend fixtures (deterministic).
- ❌ Do **not** import from `prepared-assets/` at runtime from `src/`.
  - Exception: `import json from '../../prepared-assets/mock/mock-bonds.json'`
    inside `src/services/mock/` is fine for Dev Bypass only — never in prod paths.
- ❌ Do **not** delete this folder after Wave 7 — keep it as project archive.
- ❌ Do **not** treat `receipts/receipt-builder-pseudocode.ts` as runnable. It is
  a blueprint.

---

## 🗒 Provenance

Branch: `prep/wave-5-7-assets`
Created on: 2026-05-20 (parallel to Wave 4 main work)
Generator: `mock/_gen.js` is deterministic with seed `0xABBA51`.

All material here is original / project-specific or derived from public Android
SDK docs and Datecs's Programmer's Manual references.
