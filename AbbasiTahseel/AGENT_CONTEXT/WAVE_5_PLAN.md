# WAVE_5_PLAN — Remaining Tasks (in execution order)

Each task = create the file, run `npx tsc --noEmit`, commit + push, move on.

## A. ✅ Printer core (DONE)

Already shipped: `cp1256.ts`, `escposBuilder.ts`, `PrinterManager.ts`,
`receiptBuilders/{buildReadingReceipt,buildBondReceipt,buildDailySummary,index}.ts`,
`testPage.ts`, `stores/printerStore.ts`, barrel `stores/index.ts`.

---

## B. `src/hooks/usePrinter.ts` (≈5 min)

Thin convenience hook over `usePrinterStore` + `PrinterManager` so screens
don't need to import both.

- Returns: `{ isConnected, isPrinting, isScanning, devices, lastError,
  scan, connect, disconnect, testPrint, printReading, printBond, clearError }`.
- On mount: call `syncFromManager()` to reconcile state.
- No additional state of its own — pure pass-through.
- Create `src/hooks/index.ts` barrel exporting `usePrinter`.

**Commit:** `feat(printer): usePrinter hook — store + manager wrapper`

---

## C. `src/screens/settings/PrinterSettingsScreen.tsx` (≈20 min)

UI sections (top → bottom):
1. **AppHeader** — title `t('printer.title')`, showMenu prop.
2. **Status card** — `isConnected ? "متصل: {deviceName}" : "غير متصل"` +
   Feather icon (`printer` / `printer-off`) tinted with `colors.success` /
   `colors.danger`.
3. **Scan button** — `t('printer.scan')`, calls `scan()`.
4. **Device list** — `availableDevices.map(...)` → pressable row → on press
   `selectDevice(d)`; selected row gets `colors.accent` border. After
   selection, a "اتصل" button calls `connectToSelected()`.
5. **Test print button** — disabled until `isConnected`.
6. **Disconnect button** — destructive variant, only when connected.
7. **Error banner** — bottom; if `lastError !== null`, show `t(lastError)`
   with a "إغلاق" pressable that calls `clearError()`.

Use `ScrollView` + `SafeAreaView` + `useTheme()` + `useTranslation()`.
Loading spinners use `ActivityIndicator` with `colors.accent`.

**Commit:** `feat(printer): PrinterSettingsScreen — discovery + pair + test print`

---

## D. `src/screens/main/ScannerScreen.tsx` (≈15 min)

⚠ **Research first:** check `react-native-vision-camera@3.x` compatibility
with RN 0.74.5. If incompatible, fall back to `react-native-camera-kit`.

- `useCameraDevice('back')`
- `useCameraPermission()` → if not granted, request → if denied, show
  friendly Arabic message + "افتح الإعدادات" button.
- `useCodeScanner({ codeTypes: ['code-128','ean-13','qr'], onCodeScanned: ... })`
- One-shot: on first scan, `navigation.goBack()` with the scanned text via
  `navigation.navigate('ReadingDetail', { noadad })` if coming from the FAB,
  OR `navigation.goBack({ scannedValue })` via params if coming from search.
- Overlay: dark overlay with a transparent center rectangle (the scan box)
  + corner brackets in `colors.accent`.
- Torch toggle (Feather `zap` icon, top-right).

**Commit:** `feat(scanner): ScannerScreen — vision-camera + one-shot scan`

---

## E. `src/screens/settings/CompanyInfoScreen.tsx` (≈10 min)

Form mapping to the `company_info` table (`CompanyInfo` model):
fields `nameAr`, `nameEn`, `phone`, `address`, `footerText`, `logoUrl`
(text input for URL; no image picker in v1).

Use react-hook-form + zod (mirror ServerSettingsScreen pattern).
On save: `database.write` → upsert single CompanyInfo row.

**Commit:** `feat(company): CompanyInfoScreen — form for company_info table`

---

## F. `src/screens/main/ReadingDetailScreen.tsx` — Print Button (≈8 min)

Below the Save button (or in the action card row):
- Pressable with Feather `printer` icon + `t('readings.detail.print')`.
- Disabled when `kh` not saved OR `!isConnected`.
- On press: build a `ReadingReceiptInput` from current reading + authStore
  user + companyInfo (if loaded; fallback "—") + `new Date()`.
- Call `printerStore.printReading(input)`.
- ToastAndroid on success / failure (driven by `lastPrintAt` /
  `lastError` deltas — use `useEffect` to observe).

**Commit:** `feat(printer): print button on ReadingDetailScreen`

---

## G. `src/screens/main/ReadingsScreen.tsx` — Scan FAB (≈5 min)

- Red circular FloatingActionButton (56×56, `colors.danger`),
  positioned bottom-end with `position: 'absolute'`, accounting for safe-area.
- Feather `camera` icon (24, white).
- onPress: `navigation.navigate('Scanner')` (then handle return).
  Easiest path: have Scanner pass `noadad` back via stash + then
  `ReadingsScreen` filters by it. Or: Scanner directly navigates to
  `ReadingDetail` with the found `localUuid` after DB lookup.

**Commit:** `feat(scanner): FAB on ReadingsScreen → ScannerScreen`

---

## H. `android/app/src/main/AndroidManifest.xml` (≈3 min)

Add (uses-permission entries — keep existing INTERNET / ACCESS_NETWORK_STATE):

```xml
<uses-permission android:name="android.permission.BLUETOOTH"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.CAMERA" />
```

**Commit:** `chore(android): bluetooth + camera permissions`

---

## I. Navigation wiring (≈5 min)

`src/navigation/types.ts`:
```ts
MainStackParamList = {
  ...existing,
  PrinterSettings: undefined;
  CompanyInfo: undefined;
  Scanner: { returnTo?: 'ReadingsScreen' | 'NewBond' } | undefined;
};
```

`src/navigation/MainStack.tsx`: mount the 3 new screens inside the Drawer.

`src/navigation/DrawerContent.tsx`: append two `MENU_ITEMS` entries:
- `{ key: 'PrinterSettings', label: t('drawer.printerSettings'), icon: 'printer' }`
  — show small green/red dot if `isConnected` (subscribe to printerStore).
- `{ key: 'CompanyInfo', label: t('drawer.companyInfo'), icon: 'briefcase' }`.

**Commit:** `feat(nav): wire PrinterSettings + CompanyInfo + Scanner routes`

---

## J. i18n integration (≈5 min)

Merge `prepared-assets/i18n/ar-wave5-printer.json` into
`src/i18n/locales/ar.json`. Top-level new keys:
`printer.*`, `scanner.*`, `company.*`, `drawer.printerSettings`,
`drawer.companyInfo`.

Mirror to `en.json` (best-effort; keys exist even if values are English).

**Commit:** `feat(i18n): printer + scanner + company strings (ar primary)`

---

## K. Playbook + ADRs (≈5 min)

Append to `PROJECT_PLAYBOOK.md`:
- Wave 5 summary (≈10 lines)
- ADR-015: Bluetooth Classic over Datecs JAR
- ADR-016: cp1256 encoder owned in-app (no third-party Arabic shaper)
- ADR-017: Singleton PrinterManager + TinyEmitter pattern
- ADR-018: vision-camera (or fallback chosen) for barcode scanning

**Commit:** `docs(playbook): Wave 5 + ADR-015..018`

---

## L. PR

Open PR from `feat/wave-5-printer-scanner` → `main` with title
`feat: Wave 5 — Printer (Datecs DPP-250) + Barcode Scanner + Company Info`.

Include checklist + screenshots (if any) + tsc-clean badge.
