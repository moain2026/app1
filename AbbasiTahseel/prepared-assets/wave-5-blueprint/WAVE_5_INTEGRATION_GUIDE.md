# Wave 5 — Integration Guide

> **Purpose:** step-by-step recipe for the main agent to wire the 7 code
> templates in this folder into the live `src/` tree, with all
> dependency, manifest, i18n, and navigation changes spelled out.
>
> **Estimated time savings:** 60 – 90 minutes for the main agent.
> Templates already encode the project conventions discovered in Wave 1-3
> (theme tokens, RTL inline AppBar, Zustand+MMKV pattern, logger.scope).

---

## 0. Pre-flight check

Before doing anything, the main agent should confirm:

```bash
cd AbbasiTahseel
git status                           # clean working tree
node -v                              # 18.x or 20.x
cat android/app/build.gradle | grep "minSdkVersion"
# Wave 5 deps need minSdk >= 23 (covered — project is on 24).
```

If `android/app/build.gradle` is on a lower minSdk, bump it BEFORE
installing native packages or the Bluetooth lib will fail to link.

---

## 1. File placement map (template → final path)

| Template | Final path in `src/` | Notes |
|---|---|---|
| `printerManager.template.ts` | `src/services/printer/printerManager.ts` | Singleton. |
| `escposBuilder.template.ts` | `src/services/printer/escposBuilder.ts` | Same folder as printerManager. |
| `receiptPrintService.template.ts` | `src/services/printer/receiptPrintService.ts` | Same folder. |
| `usePrinter.template.ts` | `src/hooks/usePrinter.ts` | New `hooks/` dir if it doesn't exist. |
| `PrinterSettingsScreen.template.tsx` | `src/screens/settings/PrinterSettingsScreen.tsx` | Next to `ServerSettingsScreen.tsx`. |
| `ScannerScreen.template.tsx` | `src/screens/main/ScannerScreen.tsx` | Modal-style screen. |
| `printerStore.template.ts` | `src/stores/printerStore.ts` | Add to `src/stores/index.ts` barrel. |

**Also copy:**

```
prepared-assets/printer/cp1256-arabic-mapping.json
  → src/services/printer/cp1256-mapping.json
```

The `escposBuilder` template imports from
`@/services/printer/cp1256-mapping.json` — the JSON must be present
before the screen first mounts.

---

## 2. `package.json` additions

Append to `dependencies` (DO NOT bump RN or related core libs):

```jsonc
{
  "react-native-bluetooth-classic": "1.73.0-rc.12",
  "react-native-vision-camera":      "^4.5.0",
  "react-native-reanimated":         "~3.10.1",
  "react-native-permissions":        "^4.1.5"
}
```

Notes:

- **`react-native-bluetooth-classic@1.73.0-rc.12`** is the version
  selected in Wave-1 research (see
  `prepared-assets/printer/datecs-sdk-research.md`). Pin exact — the RC
  channel has breaking changes between minor versions.
- **`react-native-vision-camera@^4.5.0`** is the first 4.x line that
  ships the `useCodeScanner` worklet API used in `ScannerScreen.tsx`.
- **`react-native-reanimated`** is a peer of vision-camera's worklet
  bridge. Likely already a transitive dep; verify with `npm ls`.
- **`react-native-permissions`** is OPTIONAL — the template uses
  `PermissionsAndroid` directly for Bluetooth, but you may want it for
  finer-grained handling later.

After install:

```bash
cd android && ./gradlew clean && cd ..
npx react-native start --reset-cache
```

Reanimated also requires its **babel plugin** at the end of
`babel.config.js` plugins array:

```js
plugins: [
  // ... existing plugins
  'react-native-reanimated/plugin', // MUST be last
]
```

---

## 3. AndroidManifest.xml permissions

Append inside `<manifest>` (NOT inside `<application>`):

```xml
<!-- Wave 5: Bluetooth printer + camera scanner -->

<!-- Bluetooth Classic — Android 11 and below -->
<uses-permission android:name="android.permission.BLUETOOTH"
                 android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
                 android:maxSdkVersion="30" />

<!-- Bluetooth Classic — Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
                 android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- Discovery on Android 10/11 requires location -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
                 android:maxSdkVersion="30" />

<!-- Camera for barcode scanner -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

`android:usesPermissionFlags="neverForLocation"` on `BLUETOOTH_SCAN` is
**required** for Play Store compliance — without it Google rejects the
upload with policy issue PLY-A-12.

---

## 4. Navigation wiring

### 4.1 SettingsStack — add the printer settings route

In `src/navigation/SettingsStack.tsx` (or whichever file currently
registers `ServerSettings`):

```tsx
import { PrinterSettingsScreen } from '@/screens/settings/PrinterSettingsScreen';

// inside the stack <Group>:
<Stack.Screen
  name="PrinterSettings"
  component={PrinterSettingsScreen}
  options={{ headerShown: false }}     // inline AppBar
/>
```

### 4.2 MainStack — add the scanner modal

In `src/navigation/MainStack.tsx`:

```tsx
import { ScannerScreen, type ScannerRouteParams } from '@/screens/main/ScannerScreen';

<Stack.Screen
  name="Scanner"
  component={ScannerScreen}
  options={{ headerShown: false, presentation: 'modal' }}
/>
```

If using TypeScript-typed routes, add to the param-list type:

```ts
export type MainStackParamList = {
  // ... existing routes
  Scanner: ScannerRouteParams;
};
```

### 4.3 Drawer — add the new menu entry

Add an entry in the right-drawer config (existing pattern: see
`PROJECT_PLAYBOOK.md` §Drawer):

```tsx
{
  key: 'printer-settings',
  label: t('drawer.printerSettings'),
  icon: 'printer',
  onPress: () => navigation.navigate('SettingsRoot', { screen: 'PrinterSettings' }),
}
```

---

## 5. Boot wiring (App.tsx)

Call `usePrinterStore.getState().hydrate()` once at startup, alongside
the existing `useSyncStore.init()` and `useLicenseStore.check()` calls:

```tsx
// In App.tsx, near the existing store inits:
import { usePrinterStore } from '@/stores/printerStore';

useEffect(() => {
  usePrinterStore.getState().hydrate();

  // Optional: auto-reconnect if the user enabled it
  const { autoConnect, lastUsedAddress } = usePrinterStore.getState();
  if (autoConnect && lastUsedAddress !== null) {
    void printerManager.connect(lastUsedAddress).catch(() => {
      // Silent on first-launch — the user will see the error in Settings.
    });
  }
}, []);
```

And export from `src/stores/index.ts`:

```ts
export { usePrinterStore, type PrinterStoreState, type SavedDevice }
  from './printerStore';
```

---

## 6. i18n — strings ALREADY prepared in Wave 1

The templates reference these key namespaces:

| Template | i18n keys used | Source bundle |
|---|---|---|
| `usePrinter.tsx` | `printer.toast.*`, `printer.errors.*` | `prepared-assets/i18n/ar-wave5-printer.json` |
| `PrinterSettingsScreen.tsx` | `printer.settings.*`, `printer.status.*`, `printer.devices.*`, `printer.action.*`, `printer.errors.*` | same |
| `ScannerScreen.tsx` | `scanner.title`, `scanner.permissionRequired`, `scanner.permissionHint`, `scanner.openSettings`, `scanner.alignHint`, `scanner.noCamera`, `scanner.requestingPermission` | same |
| All | `common.back` | already in main bundle |

**Action:** merge `prepared-assets/i18n/ar-wave5-printer.json` into
`src/i18n/locales/ar.json` (use the merge strategy in
`prepared-assets/i18n/INTEGRATION_GUIDE.md` §2).

> ⚠️ The original task spec referenced the JSON as `cp1256-mapping.json`
> but the actual file is `cp1256-arabic-mapping.json`. When copying to
> `src/`, rename to `cp1256-mapping.json` so the import in
> `escposBuilder.ts` (`@/services/printer/cp1256-mapping.json`) resolves.

---

## 7. Verification checklist (run BEFORE merging the Wave 5 PR)

```bash
# TypeScript — must compile with zero errors
npx tsc --noEmit

# ESLint
npx eslint "src/**/*.{ts,tsx}"

# Unit tests (if printerStore has one)
npm test -- printerStore

# Smoke check on device:
# 1. Launch app, open Drawer → "إعدادات الطابعة"
# 2. Tap "بحث عن أجهزة جديدة" → grant Bluetooth perms
# 3. Pair the Datecs DPP-250 (will appear after device-side pairing)
# 4. Tap "اختبار الطباعة" → a sample reading receipt should print
# 5. Force-kill the app, relaunch → printer should auto-reconnect IF
#    autoConnect toggle is on
# 6. Open any Reading form, tap the barcode icon → Scanner opens
# 7. Scan any 1D / QR code → returns to form with value filled
```

---

## 8. Known limitations & follow-ups

| # | Limitation | Suggested follow-up |
|---|---|---|
| 1 | `printerManager` uses `globalThis.btoa` — Hermes ships it, but a non-Hermes engine would crash. | Add `react-native-base64` + swap the helper if Hermes is ever disabled. |
| 2 | Arabic shaping is NOT included in `escposBuilder` (it expects already-shaped text or accepts cp1256 isolated forms verbatim — readable but with disconnected letters). | Wave 6: implement `cp1256Shaper.ts` (joining algorithm: initial / medial / final / isolated → presentation forms U+FE70..U+FEFC). |
| 3 | Scanner uses the **callback** route-param pattern. Strict navigation linting may flag it. | Replace with a `scannerResultStore` (Zustand) if the lint config disallows function params. |
| 4 | No printer status polling — the manager relies entirely on the lib's `onDeviceDisconnected` event. | If field reports show silent drops, add a 30-second `getStatus()` heartbeat. |
| 5 | Reanimated babel plugin position is load-bearing — easy to break by re-ordering. | Add a CI lint step that greps `babel.config.js` for the plugin's position. |

---

## 9. Time savings — concrete breakdown

| Task | Without templates | With templates | Saved |
|---|---|---|---|
| Bluetooth manager + reconnect logic | 25 min | 5 min (rename, paste, run tests) | **20 min** |
| ESC/POS + cp1256 encoder | 30 min (most of the spec lookup is done) | 5 min | **25 min** |
| Receipt builders (3 receipts) | 20 min | 5 min | **15 min** |
| usePrinter hook + toast plumbing | 10 min | 3 min | **7 min** |
| PrinterSettingsScreen UI | 25 min | 8 min | **17 min** |
| ScannerScreen (camera + perms + runOnJS) | 20 min | 5 min | **15 min** |
| printerStore (Zustand + MMKV) | 10 min | 3 min | **7 min** |
| Integration plumbing (this guide) | 15 min | 0 min | **15 min** |
| **TOTAL** | **155 min** | **34 min** | **≈ 120 min (2 h)** |

Plus the avoided cost of researching `react-native-bluetooth-classic` API
shape and Datecs ESC/POS quirks — easily another 60 minutes.

---

## 10. Cross-references

| Topic | File |
|---|---|
| Library choice rationale | `prepared-assets/printer/datecs-sdk-research.md` |
| ESC/POS spec for Datecs DPP-250 | `prepared-assets/printer/escpos-commands-reference.md` |
| Hardware specs (paper width, code-page index) | `prepared-assets/printer/datecs-dpp250-specs.md` |
| Receipt layouts (placeholders, variants) | `prepared-assets/receipts/*.md` |
| Receipt builder type contract | `prepared-assets/receipts/receipt-builder-pseudocode.ts` |
| i18n key catalogue | `prepared-assets/i18n/ar-wave5-printer.json` |
| Project conventions | `AbbasiTahseel/PROJECT_PLAYBOOK.md` |
| ProGuard rules for the new libs | `prepared-assets/proguard/proguard-rules.pro` (lines under `// Bluetooth Classic`, `// Vision-camera`) |
