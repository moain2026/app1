# ESC/POS Command Reference — Datecs DPP-250

> All commands below are verified against the DPP-250 Programmer's Manual.
> Bytes shown in hex. JavaScript snippets use Node's `Buffer` (RN ships it via `react-native-get-random-values` shim or `buffer` polyfill).

---

## Conventions

```ts
import { Buffer } from 'buffer';
const ESC = 0x1B;
const GS  = 0x1D;
const FS  = 0x1C;
const LF  = 0x0A;
const CR  = 0x0D;
const NUL = 0x00;
```

All builders return a `Uint8Array` so they're easy to concatenate:

```ts
function concat(...parts: Uint8Array[]): Uint8Array {
  return Buffer.concat(parts.map((p) => Buffer.from(p)));
}
```

---

## 1. Initialization

### `ESC @` — Reset printer to power-on defaults

| Bytes (hex) | 1B 40 |
|-------------|-------|
| الوصف       | يُعيد ضبط الطابعة: محو buffer، إلغاء bold/underline، إعادة المحاذاة لليسار، إعادة حجم الخط للقياس الافتراضي. |

```ts
export const cmdInit = (): Uint8Array => new Uint8Array([ESC, 0x40]);
```

---

## 2. Alignment

### `ESC a n` — Justify text

| n | Effect    | عربي    |
|---|-----------|---------|
| 0 | Left      | يسار    |
| 1 | Center    | وسط     |
| 2 | Right     | يمين    |

```ts
export const cmdAlign = (n: 0 | 1 | 2): Uint8Array =>
  new Uint8Array([ESC, 0x61, n]);
```

> **RTL note:** for Arabic content we usually want `n=2` (right) for body lines and `n=1` (center) for the title block.

---

## 3. Bold / Emphasis

### `ESC E n`

| n | Effect       |
|---|--------------|
| 0 | Bold OFF     |
| 1 | Bold ON      |

```ts
export const cmdBold = (on: boolean): Uint8Array =>
  new Uint8Array([ESC, 0x45, on ? 1 : 0]);
```

---

## 4. Font size — `GS ! n`

`n` is a single byte encoding width (high nibble) and height (low nibble) multipliers.

```
n = (widthMultiplier - 1) << 4 | (heightMultiplier - 1)
```

| widthMul | heightMul | n (hex) | Use case              |
|----------|-----------|---------|-----------------------|
| 1        | 1         | 0x00    | Normal (default)      |
| 2        | 2         | 0x11    | Large title           |
| 1        | 2         | 0x01    | Tall narrow           |
| 2        | 1         | 0x10    | Wide short            |
| 3        | 3         | 0x22    | Very large (totals)   |

```ts
export const cmdSize = (widthMul: 1 | 2 | 3, heightMul: 1 | 2 | 3): Uint8Array => {
  const n = ((widthMul - 1) << 4) | (heightMul - 1);
  return new Uint8Array([GS, 0x21, n]);
};
```

---

## 5. Underline — `ESC - n`

| n | Effect             |
|---|--------------------|
| 0 | Underline OFF      |
| 1 | Single underline   |
| 2 | Double underline   |

```ts
export const cmdUnderline = (n: 0 | 1 | 2): Uint8Array =>
  new Uint8Array([ESC, 0x2D, n]);
```

---

## 6. Line feeds

### `LF` (single line)

```ts
export const cmdLF = (): Uint8Array => new Uint8Array([LF]);
```

### `ESC d n` — Feed n lines

```ts
export const cmdFeedLines = (n: number): Uint8Array => {
  const clamped = Math.max(0, Math.min(255, Math.floor(n)));
  return new Uint8Array([ESC, 0x64, clamped]);
};
```

### `ESC J n` — Feed n × (n/180 inch) — fine paper feed

```ts
export const cmdFeedDots = (n: number): Uint8Array =>
  new Uint8Array([ESC, 0x4A, Math.max(0, Math.min(255, n))]);
```

---

## 7. Character code page — `ESC t n`

DPP-250 supports cp437, cp850, cp852, cp858, cp866, cp1250…cp1257.

| n  | Code page  | Notes                              |
|----|------------|-------------------------------------|
| 0  | cp437      | Default (US/Latin)                  |
| 16 | cp1252     | Western European                    |
| **22** | **cp1256** | **Arabic — what we use**         |
| 17 | cp1253     | Greek                                |

```ts
export const cmdCodePageArabic = (): Uint8Array =>
  new Uint8Array([ESC, 0x74, 22]); // cp1256
```

> **Send this once right after `ESC @` for every print job.**

---

## 8. Cut paper — `GS V m`

DPP-250 doesn't have a guillotine, but it accepts the command and advances the paper to the tear-off bar.

| m   | Effect                                |
|-----|---------------------------------------|
| 0   | Full cut (treated as feed-to-tear)    |
| 1   | Partial cut                           |
| 65  | Feed n dots then full cut             |

```ts
export const cmdCut = (full = true): Uint8Array =>
  new Uint8Array([GS, 0x56, full ? 0 : 1]);
```

---

## 9. Barcodes

### `GS h n` — Barcode height (dots, default 162)

```ts
export const cmdBarcodeHeight = (dots: number): Uint8Array =>
  new Uint8Array([GS, 0x68, Math.max(1, Math.min(255, dots))]);
```

### `GS w n` — Barcode module width (2-6)

```ts
export const cmdBarcodeWidth = (n: 2 | 3 | 4 | 5 | 6): Uint8Array =>
  new Uint8Array([GS, 0x77, n]);
```

### `GS H n` — Barcode HRI (human-readable interpretation) position

| n | Position                |
|---|-------------------------|
| 0 | Not printed             |
| 1 | Above                   |
| 2 | Below                   |
| 3 | Both                    |

### `GS k m d1...dk NUL` — Print barcode (format A, NUL-terminated)

Common `m` values:

| m  | Symbology  | Allowed chars      |
|----|------------|--------------------|
| 0  | UPC-A      | 0–9                |
| 2  | EAN-13     | 0–9                |
| 4  | CODE39     | 0–9, A–Z, -.$/+%   |
| 73 | CODE128    | 0x00–0x7F          |

```ts
export const cmdBarcodeCode128 = (data: string): Uint8Array => {
  const dataBytes = Buffer.from(data, 'ascii');
  return Buffer.concat([
    Buffer.from([GS, 0x6B, 73, dataBytes.length]), // length-prefixed (format B)
    dataBytes,
  ]);
};
```

---

## 10. QR Code (multi-step) — `GS ( k`

DPP-250 supports the GS ( k QR family. Four steps:

```
1) Model:    1D 28 6B 04 00 31 41 32 00          (model 2)
2) Size:     1D 28 6B 03 00 31 43 n              (n = module size, 1–16)
3) ECC:      1D 28 6B 03 00 31 45 n              (n = 48..51 = L/M/Q/H)
4) Store:    1D 28 6B pL pH 31 50 30 <data…>
5) Print:    1D 28 6B 03 00 31 51 30
```

```ts
export function cmdQRCode(data: string, opts?: {
  moduleSize?: number; // 1..16, default 6
  ecc?: 'L' | 'M' | 'Q' | 'H'; // default 'M'
}): Uint8Array {
  const moduleSize = opts?.moduleSize ?? 6;
  const eccMap = { L: 48, M: 49, Q: 50, H: 51 } as const;
  const ecc = eccMap[opts?.ecc ?? 'M'];

  const dataBytes = Buffer.from(data, 'utf8');
  const len = dataBytes.length + 3;
  const pL = len & 0xff;
  const pH = (len >> 8) & 0xff;

  return Buffer.concat([
    Buffer.from([GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]), // model 2
    Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, moduleSize]),
    Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, ecc]),
    Buffer.from([GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]),
    dataBytes,
    Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]),
  ]);
}
```

---

## 11. Cash drawer — `ESC p m t1 t2`

DPP-250 has no drawer port, but the command is silently ignored — safe to call.

```ts
export const cmdOpenDrawer = (): Uint8Array =>
  new Uint8Array([ESC, 0x70, 0, 25, 250]); // pin 0, on=25ms, off=250ms
```

---

## 12. Printer status — `GS r n`

| n  | Returns                                       |
|----|-----------------------------------------------|
| 1  | Paper sensor status (0x12 = paper out)        |
| 2  | Drawer kick-out connector status              |
| 49 | (Datecs ext.) Battery voltage byte            |

```ts
export const cmdStatusPaper = (): Uint8Array =>
  new Uint8Array([GS, 0x72, 1]);

export const cmdStatusBattery = (): Uint8Array =>
  new Uint8Array([GS, 0x72, 49]);
```

The printer responds on the same SPP socket — listen via `device.onDataReceived` and parse the single status byte.

---

## 13. Raw image / logo (1bpp bitmap) — `GS v 0 m xL xH yL yH d1…dk`

| m | Mode                                       |
|---|--------------------------------------------|
| 0 | Normal                                     |
| 1 | Double width                               |
| 2 | Double height                              |
| 3 | Quadruple                                  |

- `xL + xH * 256` = horizontal bytes (max 48 bytes = 384 dots wide for 58 mm head).
- `yL + yH * 256` = vertical dots.

```ts
export function cmdPrintBitmap(
  widthBytes: number, // typically 48
  heightDots: number,
  bitmap: Uint8Array,
): Uint8Array {
  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = heightDots & 0xff;
  const yH = (heightDots >> 8) & 0xff;
  return Buffer.concat([
    Buffer.from([GS, 0x76, 0x30, 0, xL, xH, yL, yH]),
    bitmap,
  ]);
}
```

---

## 14. Composite: print one Arabic line, right-aligned, bold

```ts
import { encodeCp1256 } from './cp1256';

export function arabicLine(text: string): Uint8Array {
  return Buffer.concat([
    cmdAlign(2),       // right
    cmdBold(true),
    cmdCodePageArabic(),
    encodeCp1256(text), // Uint8Array
    cmdLF(),
    cmdBold(false),
  ]);
}
```

---

## 15. Quick lookup cheat-sheet

| Want to…                       | Bytes                          |
|--------------------------------|--------------------------------|
| Reset printer                  | `1B 40`                        |
| Switch to Arabic (cp1256)      | `1B 74 16`                     |
| Center                         | `1B 61 01`                     |
| Right (RTL body)               | `1B 61 02`                     |
| Bold on                        | `1B 45 01`                     |
| Title size (×2 w/h)            | `1D 21 11`                     |
| Underline single               | `1B 2D 01`                     |
| New line                       | `0A`                           |
| Feed 3 lines                   | `1B 64 03`                     |
| Full cut/tear                  | `1D 56 00`                     |
| Status: paper                  | `1D 72 01`                     |
| Status: battery (Datecs)       | `1D 72 31`                     |
| QR start                       | see §10                        |

---

## 16. Notes on Arabic shaping

ESC/POS code page cp1256 contains **only isolated Arabic letter forms** (no contextual shaping). The printer **does not shape glyphs** — `ا ل س ل ا م` would print as six isolated letters.

To get proper joined Arabic, we must **shape strings on the JS side before encoding** — i.e. run them through an Arabic-shaping function (`@flowos/arabic-reshaper` style) that maps each codepoint to its final/initial/medial/isolated form found in cp1256.

Wave 5 strategy:
1. Strings in i18n are stored as logical Unicode (e.g. `"السلام"`).
2. `cp1256.ts` exposes `encodeArabic(text)` which:
   - shapes the string with our embedded shaper (a small switch table),
   - reverses character order (since cp1256 prints LTR but Arabic is RTL),
   - maps each codepoint to its cp1256 byte.

See `cp1256-arabic-mapping.json` for the shaped-form code points.
