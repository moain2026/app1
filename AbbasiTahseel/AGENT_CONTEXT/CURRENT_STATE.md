# CURRENT_STATE — ▶️ RESUME FROM HERE

> Living document. Update **before** stopping. Always reflects the next
> concrete action, not history.

## ▶️ RESUME FROM HERE

**Wave 5 main body shipped. PR #23 is open and awaiting CI + merge.**
👉 https://github.com/moain2026/app1/pull/23

**Next concrete action when you return:**
1. Verify CI APK build on PR #23 (target ~50 MB; tag the row in
   `PROJECT_PLAYBOOK.md` §11 once known).
2. If green, request merge (or merge yourself if authorized).
3. Then start **Wave 6 — Bonds**: see WAVE_5_PLAN.md "Wave 6 preview"
   section and PROJECT_PLAYBOOK.md §8 backlog.

**Deferred Wave 5 follow-ups (kept in backlog, NOT blocking the PR):**
- **Wave 5.2** — `ScannerScreen.tsx` real camera integration via
  `react-native-vision-camera@3.x`. Currently a stub.
- **Wave 5.3** — `CompanyInfoScreen.tsx` real react-hook-form + zod form
  bound to `company_info` table. Currently a stub.

## Branch / Commits

- **Branch:** `feat/wave-5-printer-scanner`
- **Last commit:** `07c3fdc docs(playbook): Wave 5 section + ADR-015..018 + backlog update`
- **PR:** #23 — https://github.com/moain2026/app1/pull/23
- **Commits in branch (vs main):** 11 — see COMMIT_HISTORY.md for detail.

## Wave 5 — DONE

### Services
- ✅ `src/services/printer/cp1256.ts` (encoder + Arabic shaper + 226-entry map)
- ✅ `src/services/printer/escposBuilder.ts` (ESC/POS primitives)
- ✅ `src/services/printer/PrinterManager.ts` (singleton + TinyEmitter)
- ✅ `src/services/printer/receiptBuilders/buildReadingReceipt.ts`
- ✅ `src/services/printer/receiptBuilders/buildBondReceipt.ts`
- ✅ `src/services/printer/receiptBuilders/buildDailySummary.ts`
- ✅ `src/services/printer/receiptBuilders/index.ts` (barrel)
- ✅ `src/services/printer/testPage.ts`

### State + hooks
- ✅ `src/stores/printerStore.ts` (11 actions, event-subscribed)
- ✅ `src/stores/index.ts` re-export
- ✅ `src/hooks/usePrinter.ts` + `src/hooks/index.ts` (barrel)

### Screens
- ✅ `src/screens/settings/PrinterSettingsScreen.tsx` (full impl)
- ✅ `src/screens/main/ReadingDetailScreen.tsx` (print button)
- ✅ `src/screens/main/ReadingsScreen.tsx` (red FAB → Scanner)
- ✅ `src/screens/settings/CompanyInfoScreen.tsx` (stub — Wave 5.3)
- ✅ `src/screens/main/ScannerScreen.tsx` (stub — Wave 5.2)

### Navigation
- ✅ `src/navigation/types.ts` (3 new routes)
- ✅ `src/navigation/MainStack.tsx` (3 new Drawer.Screens)
- ✅ `src/navigation/DrawerContent.tsx` (MENU_ITEMS + status dot)

### Platform / i18n / docs
- ✅ `android/app/src/main/AndroidManifest.xml` (BT + Camera perms)
- ✅ `src/i18n/locales/ar.json` (printer / scanner / company / drawer keys)
- ✅ `PROJECT_PLAYBOOK.md` (Wave 5 history + ADR-015..018 + backlog refresh)
- ✅ `AGENT_CONTEXT/` (10 handoff files)
- ✅ `react-native-bluetooth-classic@~1.73.0-rc.12` + `buffer@~6.0.3` installed
- ✅ PR #23 opened against `main`

## Wave 5 — DEFERRED (follow-ups, not blocking)

- ⏳ **Wave 5.2** — `ScannerScreen.tsx` real camera (`react-native-vision-camera@3.x`).
  Currently a stub showing camera-off icon + manual-entry CTA.
- ⏳ **Wave 5.3** — `CompanyInfoScreen.tsx` real form (`react-hook-form` + `zod`)
  bound to `company_info` table. Currently a stub.

## Build State

- `npx tsc --noEmit`: **0 errors** (last run after `07c3fdc`).
- Wave 5 Metro bundle: not attempted (CI will do it).
- Wave 5 CI APK: triggered by PR #23 — awaiting result.

## Wave 6 + 7 (Future)

- **Wave 6 — Bonds + BondPayments:**
  - Activate `Bond` + `BondPayment` models in `src/database/models/`
  - Multi-currency (IQD/USD) totals + per-currency aggregation
  - `NewBondScreen`, `BondDetailScreen`, `BondsScreen`, `PaymentModal`
  - Integrate `buildBondReceipt` from Wave 5
  - Branch suggestion: `feat/wave-6-bonds`
- **Wave 7 — Reports + Profile + About + Release v1.0.0:**
  - ReportsScreen, ProfileScreen, AboutScreen
  - Release keystore + ProGuard rules
  - Signed APK pipeline (`./gradlew assembleRelease`)
  - Branch suggestion: `feat/wave-7-release`

## Quick links

- PR #23: https://github.com/moain2026/app1/pull/23
- Branch URL: https://github.com/moain2026/app1/tree/feat/wave-5-printer-scanner
- Playbook: `PROJECT_PLAYBOOK.md`
- Coding rules: `AGENT_CONTEXT/CODING_RULES.md`
- Wave plan archive: `AGENT_CONTEXT/WAVE_5_PLAN.md`
- Commit history decoded: `AGENT_CONTEXT/COMMIT_HISTORY.md`
- Handoff protocol: `AGENT_CONTEXT/HANDOFF_PROTOCOL.md`
