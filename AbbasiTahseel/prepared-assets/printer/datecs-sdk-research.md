# Datecs SDK Research — React Native Compatibility

> Target device: **Datecs DPP-250** (Bluetooth thermal receipt printer, 58 mm)
> Target runtime: **React Native 0.74.5**, Android-only (no iOS).

---

## 1. Does Datecs provide an official React Native SDK?

**Answer: No.**

Datecs publishes only:
- **Android Java SDK** (`com.datecs.api.printer.ProtocolAdapter` + `Printer` class).
  Distributed as a `.jar` (occasionally a `.aar`) on Datecs's developer portal and bundled with their PrinterTestApp.
- A Bluetooth-SPP "raw bytes" interface — i.e. **once a Bluetooth Classic socket is open, the device speaks plain ESC/POS** (with the Datecs extensions documented in the `DPP-250 programmer manual`).
- Sample code in Java only (e.g. `PrinterActivity.java`, `DatecsPrintingService.java` in our legacy analysis repo).

There is **no first-party JS / TypeScript / React Native bridge**.

### Implication for us

We have **two viable paths**:

| Path | Description | Effort | Risk |
|------|-------------|--------|------|
| **A. Pure JS over Bluetooth Classic** | Open SPP socket via a generic RN Bluetooth Classic lib, then push raw ESC/POS bytes ourselves (Buffer building, cp1256 mapping, etc.). | Medium — we write the printing layer once. | Low — full control, no native module to maintain. |
| **B. Wrap Datecs `.jar` in a custom native module** | Write a Kotlin/Java bridge that exposes `Printer.printText()` etc. to RN. | High — native bridge + threading + lifecycle. | High — couples us to Datecs jar version, blocks future iOS port. |

→ **We choose Path A.** All the legacy app's "Datecs-only" features (Arabic, alignment, barcodes, paper cut) are standard ESC/POS commands the DPP-250 supports natively. The Datecs `.jar` is just a convenience wrapper; we re-implement that wrapper in TypeScript.

---

## 2. Candidate RN libraries (Bluetooth Classic + ESC/POS)

We evaluated four libraries actively maintained in 2024–2025.

### 2.1 `react-native-bluetooth-classic`  (kenjdavidson)

- **Latest version (RN 0.74-compatible):** `1.73.0-rc.12` (uses AndroidX, autolinking, Kotlin).
- **GitHub stars:** ~440. Last release: April 2024. Issues: actively triaged.
- **Scope:** Pure Bluetooth Classic transport. No ESC/POS helpers — you write bytes yourself with `BluetoothDevice.write(bytes, 'base64')`.
- **API style:**
  ```ts
  import RNBluetoothClassic from 'react-native-bluetooth-classic';
  const devices = await RNBluetoothClassic.getBondedDevices();
  const device = await RNBluetoothClassic.connectToDevice('00:11:22:33:44:55', { delimiter: '\n' });
  await device.write(base64Bytes, 'base64');
  await device.disconnect();
  ```
- **Pros:**
  - ✅ Pure transport layer — gives us total control over byte building (which we *need* for cp1256 Arabic).
  - ✅ Active maintenance, modern Android targetSdk 34.
  - ✅ Supports onDataReceived listener (we can read printer status responses).
  - ✅ TypeScript types shipped.
  - ✅ Works with autolinking — zero manual native config beyond `BLUETOOTH_CONNECT` permission.
- **Cons:**
  - ❌ No ESC/POS helpers (we build them ourselves — *but this is actually desirable*).
  - ❌ Android-only (iOS is MFi-only and DPP-250 is non-MFi anyway — moot).

### 2.2 `react-native-thermal-receipt-printer-image-qr`  (HeligPfleige)

- **Latest version:** `1.0.20` (Jan 2024).
- **GitHub stars:** ~190. Maintenance: sporadic.
- **Scope:** Higher-level — ships ESC/POS builders + image/QR helpers.
- **API style:**
  ```ts
  import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';
  await BLEPrinter.init();
  await BLEPrinter.connectPrinter('00:11:22:33:44:55');
  await BLEPrinter.printText('<C>Hello</C>');
  ```
- **Pros:**
  - ✅ Built-in tag-based formatting (`<C>` center, `<B>` bold).
  - ✅ Image and QR helpers.
- **Cons:**
  - ❌ Encoding hardcoded to cp437/GBK; **cp1256 Arabic support requires patching the native module** (deal-breaker).
  - ❌ Bridges through `react-native-ble-plx` for "BLE" — but DPP-250 is **Bluetooth Classic SPP**, not BLE. This library is the wrong transport.
  - ❌ Mixed BLE/Classic confusion in the issue tracker.

### 2.3 `tp-react-native-bluetooth-printer`  (januslo / januslo-bot)

- **Latest version:** `0.6.x` (last update 2023).
- **GitHub stars:** ~290. Maintenance: stale (no commits in 12+ months).
- **Scope:** Bluetooth Classic ESC/POS, originally aimed at SUNMI-style printers.
- **Pros:**
  - ✅ Classic SPP (correct transport for DPP-250).
- **Cons:**
  - ❌ Maintenance halted; no RN 0.74 / Android targetSdk 34 confirmation.
  - ❌ Hard-coded GBK encoding, again no cp1256 path.
  - ❌ Native code includes legacy Gradle plugin syntax incompatible with RN 0.74's Gradle 8.

### 2.4 `react-native-bluetooth-escpos-printer`  (januslo)

- **Latest version:** `0.0.x` series, last release 2022.
- **GitHub stars:** ~250.
- **Status:** Effectively abandoned. AndroidX migration incomplete. Will not build on RN 0.74 without patches.

---

## 3. Comparison matrix

| Criterion                                | rn-bluetooth-classic | thermal-receipt-printer | tp-rn-bluetooth-printer | rn-bluetooth-escpos-printer |
|------------------------------------------|:---------------------:|:------------------------:|:------------------------:|:----------------------------:|
| RN 0.74.5 confirmed?                      | ✅                    | ⚠️                        | ❌                        | ❌                            |
| Android targetSdk 34                      | ✅                    | ⚠️                        | ❌                        | ❌                            |
| Bluetooth Classic SPP (DPP-250)           | ✅                    | ❌ (BLE)                  | ✅                        | ✅                            |
| cp1256 Arabic supported / pluggable       | ✅ (we build)         | ❌                        | ❌                        | ❌                            |
| Maintenance in last 6 months              | ✅                    | ⚠️                        | ❌                        | ❌                            |
| TypeScript types                           | ✅                    | partial                   | ❌                        | ❌                            |
| Lets us write raw bytes                    | ✅                    | partial                   | ✅                        | ✅                            |
| Read printer status back                   | ✅                    | ❌                        | ❌                        | ❌                            |
| Bundle size impact                         | small (~30 KB)        | medium                    | medium                    | medium                        |

---

## 4. Recommendation

### ✅ Use `react-native-bluetooth-classic` v1.73.0-rc.12

**Reasoning:**

1. The DPP-250 is a vanilla Bluetooth Classic + ESC/POS device with Datecs extensions. We don't need a Datecs-specific library — we need a clean Classic socket, which `react-native-bluetooth-classic` provides.
2. **cp1256 Arabic mapping** is a project-specific concern. We *must* own that code path. A library that hides byte building behind opinionated helpers would force us to monkey-patch.
3. Active maintenance + RN 0.74 confirmed + TS types = lowest integration risk.
4. The legacy Java app does exactly this: it opens an `RfcommSocket` to the bonded Datecs device, then writes ESC/POS bytes built by `ReceiptFormatter.java`. We're porting that logic to TypeScript.

### Architecture we'll adopt in Wave 5

```
┌───────────────────────────────┐
│  src/services/printer/        │
│  ├─ escposBuilder.ts          │ ← pure functions (Buffer in / Buffer out)
│  ├─ cp1256.ts                 │ ← string → Uint8Array (using cp1256-arabic-mapping.json)
│  ├─ datecsTransport.ts        │ ← wraps react-native-bluetooth-classic
│  ├─ receiptBuilders/          │
│  │   ├─ readingReceipt.ts     │ ← uses reading-receipt-template.md as blueprint
│  │   └─ bondReceipt.ts        │ ← uses bond-receipt-template.md
│  └─ printerStore.ts (Zustand) │
└───────────────────────────────┘
```

---

## 5. Install instructions (for the main agent — Wave 5)

```bash
npm install react-native-bluetooth-classic@1.73.0-rc.12 --save-exact
# Autolinking handles native install. Then:
#  - add BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_CONNECT, BLUETOOTH_SCAN
#    permissions to android/app/src/main/AndroidManifest.xml
#  - request runtime permissions on Android 12+ (API 31+)
```

### AndroidManifest.xml additions

```xml
<!-- Legacy Bluetooth (Android ≤11) -->
<uses-permission android:name="android.permission.BLUETOOTH"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
    android:maxSdkVersion="30" />

<!-- Modern Bluetooth (Android 12+) -->
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />

<!-- Required for scanning on Android ≤11 -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
    android:maxSdkVersion="30" />

<uses-feature android:name="android.hardware.bluetooth"
    android:required="true" />
```

---

## 6. Sample code skeletons (reference only — main agent will adapt)

### 6.1 Connect to a bonded Datecs printer

```ts
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

export async function listBondedPrinters(): Promise<BluetoothDevice[]> {
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) {
    await RNBluetoothClassic.requestBluetoothEnabled();
  }
  const bonded = await RNBluetoothClassic.getBondedDevices();
  // Datecs DPP-250 typically reports name starting with "DPP-250" or "Datecs"
  return bonded.filter(
    (d) => /datecs|dpp-?250/i.test(d.name ?? ''),
  );
}

export async function connectToPrinter(address: string): Promise<BluetoothDevice> {
  return RNBluetoothClassic.connectToDevice(address, {
    delimiter: '\n',
    // SPP UUID — Datecs uses standard Serial Port Profile
    secureSocket: true,
  });
}
```

### 6.2 Send raw ESC/POS bytes

```ts
import { Buffer } from 'buffer';

export async function writeBytes(
  device: BluetoothDevice,
  bytes: Uint8Array,
): Promise<void> {
  const b64 = Buffer.from(bytes).toString('base64');
  await device.write(b64, 'base64');
}
```

### 6.3 Read status response (paper out, cover open, battery)

```ts
const sub = device.onDataReceived((event) => {
  // event.data is base64 by default
  const raw = Buffer.from(event.data, 'base64');
  // parse Datecs status bytes here
});
// remember to sub.remove() on disconnect
```

---

## 7. Open questions / Risks for Wave 5

1. **Permission UX on Android 12+** — need a clean "explain why we need Bluetooth" pre-prompt screen (already covered in `i18n/ar-wave5-printer.json`).
2. **Multiple bonded printers** — UI needs a picker. Default to last-used MAC (persist in MMKV under `prefs.printerMac`).
3. **Reconnect on transient disconnect** — wrap writes with one auto-retry on `Disconnected` error.
4. **Print throughput** — DPP-250 buffer is ~4 KB. For long receipts, chunk writes ≤ 1 KB and yield between chunks to avoid `IOException: broken pipe`.
5. **Battery status** — periodic `GS r 49` (`0x1D 0x72 0x31`) every 30 s when printer is connected, surface in `printerStore`.

---

## 8. References

- **Datecs DPP-250 Programmer's Manual** (PDF, available on datecs.bg developer portal) — section 5 lists every supported ESC/POS sequence with cp-page tables.
- **Legacy app** (`ElectricCollector_Full_Analysis/source_code/PrinterActivity.java`) — shows the exact byte sequences the Java app sent.
- `react-native-bluetooth-classic` README + examples folder.
- ESC/POS quick reference: https://reference.epson-biz.com/modules/ref_escpos/ (DPP-250 follows the Epson ESC/POS standard subset).
