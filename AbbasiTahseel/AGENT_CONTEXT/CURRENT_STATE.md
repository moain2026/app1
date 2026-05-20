# CURRENT_STATE — ▶️ RESUME FROM HERE

> Living document. Update **before** stopping. Always reflects the next
> concrete action, not history.

## ▶️ RESUME FROM HERE

**Next file to create:** `src/hooks/usePrinter.ts` (thin wrapper around
`usePrinterStore` + `PrinterManager` events — see WAVE_5_PLAN.md §B).

After that, in order:
1. `src/screens/settings/PrinterSettingsScreen.tsx`
2. `src/screens/main/ScannerScreen.tsx` (research vision-camera compat first)
3. `src/screens/main/ReadingDetailScreen.tsx` — add print button
4. `android/app/src/main/AndroidManifest.xml` — Bluetooth + Camera perms
5. `src/navigation/{DrawerContent,MainStack,types}.tsx` — wire new screens
6. `src/i18n/locales/ar.json` — merge `printer.*` + `scanner.*` keys
7. `PROJECT_PLAYBOOK.md` — Wave 5 section + ADR-015..018
8. Open PR `feat: Wave 5 — Printer + Scanner + Company Info`.

## Branch / Commits

- **Branch:** `feat/wave-5-printer-scanner`
- **Last commit:** `6c8423d feat(printer): Zustand printerStore + ESC/POS test page`
- **Commits in branch (vs main):** 3 (cp1256/builder/manager, receipt
  builders, printerStore+testPage).

## Wave 5 — DONE

- ✅ `src/services/printer/cp1256.ts` (encoder + Arabic shaper + 226-entry map)
- ✅ `src/services/printer/escposBuilder.ts` (ESC/POS primitives)
- ✅ `src/services/printer/PrinterManager.ts` (singleton + TinyEmitter)
- ✅ `src/services/printer/receiptBuilders/buildReadingReceipt.ts`
- ✅ `src/services/printer/receiptBuilders/buildBondReceipt.ts`
- ✅ `src/services/printer/receiptBuilders/buildDailySummary.ts`
- ✅ `src/services/printer/testPage.ts`
- ✅ `src/stores/printerStore.ts` + barrel re-export
- ✅ `react-native-bluetooth-classic@~1.73.0-rc.12` + `buffer@~6.0.3` installed
- ✅ `.gitignore` includes `prepared-assets/`

## Wave 5 — PENDING (in execution order)

1. **`src/hooks/usePrinter.ts`** — thin convenience hook.
2. **`src/screens/settings/PrinterSettingsScreen.tsx`** — discovery + pair +
   test print + auto-connect toggle.
3. **`src/screens/main/ScannerScreen.tsx`** — camera barcode → noadad lookup.
   ⚠ Research `react-native-vision-camera@3.9.0` RN 0.74.5 compat first.
4. **`src/screens/settings/CompanyInfoScreen.tsx`** — form for company_info table.
5. **`src/screens/main/ReadingDetailScreen.tsx`** — add print button.
6. **`src/screens/main/ReadingsScreen.tsx`** — add red FAB → ScannerScreen.
7. **`android/app/src/main/AndroidManifest.xml`** — BT + camera permissions.
8. **Navigation wiring** — `types.ts`, `MainStack.tsx`, `DrawerContent.tsx`.
9. **`src/i18n/locales/ar.json`** — merge printer + scanner + company keys.
10. **`PROJECT_PLAYBOOK.md`** — Wave 5 section + ADR-015..018.
11. **PR open** — `feat: Wave 5 — Printer + Scanner + Company Info`.

## Build State

- `npx tsc --noEmit`: **0 errors** (last run after `6c8423d`).
- Wave 5 Metro bundle: not attempted.
- Wave 5 CI APK: not triggered.

## Wave 6 + 7 (Future)

- Wave 6: Bonds + BondPayments + multi-currency (IQD/USD) — see PROJECT_PLAYBOOK.
- Wave 7: Reports + Profile + About + release v1.0.0 keystore + ProGuard.
