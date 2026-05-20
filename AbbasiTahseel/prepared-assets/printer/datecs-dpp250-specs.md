# Datecs DPP-250 — Full Specifications

> Source: Datecs DPP-250 Product Brief + Programmer's Manual (v1.07).
> Pinned here as a single reference so Wave 5 implementors don't need to dig through the OEM PDF.

---

## Physical / Mechanical

| Property         | Value                                  |
|------------------|----------------------------------------|
| Form factor      | Handheld portable thermal printer       |
| Dimensions       | 122 × 81 × 51 mm                        |
| Weight           | ~280 g (with battery)                   |
| Shoulder strap   | Yes (lanyard ring)                      |
| Operating temp.  | 0 °C to +50 °C                          |
| Storage temp.    | −20 °C to +60 °C                        |
| Humidity         | 10 %–80 % non-condensing                |
| Drop resistance  | 1.2 m to concrete (rubberised housing)  |

---

## Print engine

| Property                       | Value                                   |
|--------------------------------|-----------------------------------------|
| Print technology               | Direct thermal                          |
| Paper width                    | **58 mm** (printable: 48 mm)            |
| Print density                  | 8 dots/mm = **203 dpi**                 |
| Dots per line                  | **384 dots** (48 mm × 8)                |
| Print speed                    | up to **80 mm/s**                       |
| Characters per line — large    | 32 cpl (font A, 12 × 24 dots)           |
| Characters per line — small    | **48 cpl** (font B, 8 × 16 dots)        |
| Roll diameter (max)            | 40 mm                                   |
| Paper sensor                   | Reflective (paper-out detection)        |
| Cover-open sensor              | Yes                                     |

---

## Connectivity

| Interface           | Detail                                                                 |
|---------------------|------------------------------------------------------------------------|
| Bluetooth           | **Bluetooth 2.0 Classic, SPP (Serial Port Profile)**, UUID `00001101-0000-1000-8000-00805F9B34FB` |
| Bluetooth range     | Class 2, ~10 m line-of-sight                                            |
| USB                 | Mini-USB 2.0 (CDC virtual COM port) — used mainly for charging/firmware |
| IrDA                | Optional / region-dependent                                             |
| Wi-Fi               | Not on DPP-250 (DPP-250BT model only)                                   |
| Pairing PIN         | Default `1234` (configurable via service menu)                          |

### Important — transport choice

For our Android integration, **Bluetooth Classic SPP** is the only target. BLE (Bluetooth Low Energy) is **not** supported by DPP-250. Pick a React Native library that talks Bluetooth Classic, **not** BLE.

---

## Power

| Property             | Value                                            |
|----------------------|--------------------------------------------------|
| Battery              | Li-Ion **7.4 V, 2200 mAh**                        |
| Battery life — print | ~50 m of receipts on a single charge              |
| Battery life — idle  | up to 100 hours (Bluetooth off)                   |
| Charge time          | ~3 hours from empty                               |
| Charger              | 8.4 V DC, 1 A external adapter (mini-USB)         |
| Low-battery cutoff   | ~6.4 V (firmware-managed)                         |

The Datecs status command `GS r 49` returns a single byte representing battery voltage × 10 (e.g. `0x49` = 73 = 7.3 V → "battery OK"; below `0x40` = 6.4 V → "low").

---

## Encoding & character sets

DPP-250 firmware supports switching code pages via `ESC t n`. Available pages:

| n  | Code page    | Use case                            |
|----|--------------|-------------------------------------|
| 0  | cp437        | US/Latin (default)                  |
| 1  | Katakana     | Japanese kana                       |
| 2  | cp850        | Multilingual Latin                  |
| 3  | cp860        | Portuguese                          |
| 4  | cp863        | French Canadian                     |
| 5  | cp865        | Nordic                              |
| 16 | cp1252       | Western European                    |
| 17 | cp1253       | Greek                               |
| 18 | cp1254       | Turkish                             |
| 19 | cp1255       | Hebrew                              |
| 20 | cp1251       | Cyrillic                            |
| 21 | cp1250       | Central European                    |
| **22** | **cp1256** | **Arabic — what we use**         |
| 23 | cp1257       | Baltic                              |

> **cp1256 covers only ISOLATED Arabic letter forms.** No contextual shaping is done by the printer. You must shape on the host side (see `cp1256-arabic-mapping.json`).

### Built-in fonts

| Font  | Cell size (dots) | cpl @ 58 mm | Usage                                |
|-------|------------------|-------------|--------------------------------------|
| A     | 12 × 24          | 32          | Default — headings, titles            |
| B     | 9 × 17           | 42          | Compact body                         |
| Small | 8 × 16           | 48          | Footers, fine print                  |

Switched via `ESC M n` (`n = 0` → A, `n = 1` → B, `n = 49` → Small on DPP-250).

---

## Graphics

| Capability        | Detail                                         |
|-------------------|------------------------------------------------|
| Image format      | 1-bit (monochrome) bitmap, MSB-first per byte   |
| Max image width   | **384 pixels** (= 48 bytes per row)             |
| Max image height  | Limited only by paper roll length               |
| Logo storage      | Flash slot for a single startup logo (≤ 32 KB) |
| Commands          | `GS v 0` (raster), `GS *` (legacy bit-image)    |
| Native QR support | **Yes** via `GS ( k` (model 2)                  |
| Native barcode    | UPC-A, EAN-13, CODE39, CODE93, CODE128, ITF     |

---

## Receipt geometry (we'll design around these)

```
┌──────────────────────────────────────┐  ← top of paper
│                                      │
│        TITLE (centered, large)       │  ESC a 1  GS ! 0x11
│                                      │
├──────────────────────────────────────┤  ← divider line
│  field name :          value         │  body
│  field name :          value         │
│  ...                                 │
├──────────────────────────────────────┤
│            TOTAL (large)             │  GS ! 0x22
│                                      │
│   QR or BARCODE                      │
│                                      │
│        ━━━ signature line ━━━        │
│                                      │
└──────────────────────────────────────┘
     ▲                              ▲
     │  ≤ 48 chars per line         │
     │  (using font B / small)      │
```

For Arabic, all body text is right-aligned (`ESC a 2`) and shaped+reversed before encoding.

---

## Performance benchmarks (measured on legacy app)

| Operation                              | Time      |
|----------------------------------------|-----------|
| Connect SPP from cold                  | 0.8–1.5 s |
| Connect SPP if previously bonded       | 0.3–0.6 s |
| Send + print 20-line Arabic receipt    | ~1.2 s    |
| Send + print 40-line Arabic + QR       | ~2.4 s    |
| Battery status poll                    | <80 ms    |

These are the targets we expect our RN implementation to meet (or beat — RN's `device.write(base64, 'base64')` is essentially zero overhead over the legacy Java).

---

## Firmware quirks (from legacy app issues)

1. **First write after connect occasionally drops the first byte** — workaround: send `ESC @` (init) as a primer, then wait 80 ms before the real payload.
2. **Long bursts (> 4 KB) may cause `IOException: broken pipe`** — chunk writes to ≤ 1 KB.
3. **`GS V 0` (cut) is silently ignored if executed when paper sensor is in "near-empty" state** — always feed 3+ lines (`ESC d 3`) before cut.
4. **Battery query response is ASYNCHRONOUS** — listen on `onDataReceived` and correlate by sequence (only one outstanding query at a time).

---

## Pairing instructions (for end users)

These will be lifted into `docs/USER_GUIDE_AR.md`.

1. Hold the power button on DPP-250 for ~3 s until LED turns blue.
2. On the Android device: Settings → Bluetooth → "DPP-250" → Pair → PIN `1234`.
3. Open Abbasi Tahseel → ⚙ Settings → الطابعة → "اختر طابعة" → select DPP-250.
4. Tap "اختبار طباعة" to print the test page (`printer-test-page.txt`).
