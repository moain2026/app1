# Skill — Arabic cp1256 Thermal Printing

> Datecs DPP-250 over Bluetooth Classic SPP. ESC/POS bytes. cp1256
> Arabic encoding. All in-app, no external SDK.

## Skill summary

- How our cp1256 encoder works (and why it's not iconv-lite)
- Arabic shaping algorithm (lookup table, not bidi engine)
- ESC/POS byte patterns we use
- Datecs DPP-250 specifics

## Architecture overview

```
ReceiptBuilder              Returns Uint8Array of ESC/POS bytes
       ↓
escposBuilder               High-level primitives (printText, printLine, etc.)
       ↓
cp1256.ts                   Unicode → Arabic shaping → cp1256 byte conversion
       ↓
PrinterManager              Splits into 512B chunks, writes via BT Classic
       ↓
react-native-bluetooth-classic  Native SPP socket
       ↓
Datecs DPP-250 firmware
```

## The cp1256 encoder

Located: `src/services/printer/cp1256.ts`.

Why we own this:
- iconv-lite ships extra weight + has its own char map bugs for the
  PUA presentation forms (U+FE80–U+FEFC)
- We need control over Lam-Alef ligature handling (U+FEFB → 0xE1 0xC7
  TWO bytes, not one)
- We need to reverse the codepoint array at the end (cp1256 printers
  render LTR)

### The mapping table

226 entries covering:
- ASCII 0x20–0x7E (passthrough)
- Arabic basic block U+0600–U+06FF mapped to their cp1256 equivalents
- Arabic Presentation Forms-A U+FB50–U+FDFF (selective; only the shapes
  we generate)
- Arabic Presentation Forms-B U+FE70–U+FEFF (full block, since we
  GENERATE these by shaping)
- Lam-Alef ligature special-cases at the end of the table

### The shaper

Given a string like `"معين"`, the shaper:

1. Looks up each codepoint's possible shapes in a `JoiningTable` map:
   - `Isolated`: when no neighbor
   - `Initial`: when only right neighbor connects
   - `Medial`: when both neighbors connect
   - `Final`: when only left neighbor connects
2. Walks the string and picks the right shape per character
3. Detects Lam followed by Alef → emits a Lam-Alef ligature (2 cp1256
   bytes representing 1 logical glyph)
4. **Reverses the resulting array** because the printer prints LTR

Output: a `Uint8Array` of cp1256 bytes, ready for ESC/POS.

## ESC/POS primitives

Located: `src/services/printer/escposBuilder.ts`.

Key helpers:

```ts
init()                  // ESC @ → printer reset
align(left | center | right)
setBold(true|false)
setSize(width, height)  // 1..8 each (DPP-250 supports up to 8x8)
feed(lines: number)     // line feed N times
cut()                   // GS V 0 (full cut) — DPP-250 doesn't support; harmless
printText(str)          // → shaped + cp1256-encoded bytes
printLine(char='-', n=32) // horizontal rule
printBarcode(data, type='CODE128')
qrcode(data)            // ESC/POS QR macro (GS k m)
```

All return a `Uint8Array`. Compose multiple with `Buffer.concat([...])`.

## Datecs DPP-250 specifics

- **Paper width:** 58mm = 32 characters per line at default font.
- **Print resolution:** 8 dots/mm horizontal, 8 dots/mm vertical.
- **Connection:** Bluetooth SPP (Serial Port Profile), classic Bluetooth
  (not BLE). MAC address format `XX:XX:XX:XX:XX:XX`.
- **PIN:** factory default `0000`. User must pair in Android Bluetooth
  Settings FIRST. We do NOT pair from in-app.
- **Buffer:** 4 KB internal. Writes beyond this cause truncation. We
  chunk to 512 B with a 50ms sleep between chunks.
- **Auto-cutter:** none. The `cut()` command is a no-op (logs warn).
- **Wake-up:** powered devices wake on first byte. No special init
  sequence required beyond ESC @.

## Receipt builders

Located: `src/services/printer/receiptBuilders/`.

Three builders, each returning a final `Uint8Array`:

1. **`buildReadingReceipt(reading, companyInfo)`**
   Layout: company header → reading details → totals → footer
2. **`buildBondReceipt(bond, payments, companyInfo)`**
   Layout: company header → bond details → payment lines → grand total
3. **`buildDailySummary(stats, dateRange, companyInfo)`**
   Layout: company header → date range → counters → totals → footer

Each builder is a pure function — no side effects, no I/O.

## Print flow (UI → bytes)

```
User taps "Print" button on ReadingDetailScreen
  ↓
usePrinterStore.printReading(reading)
  ↓
buildReadingReceipt(reading, companyInfo)  → Uint8Array
  ↓
PrinterManager.print(bytes)
  ↓
PrinterManager checks isConnected() → throws if not
  ↓
Splits into 512B chunks, sends via socket.write()
  ↓
Awaits 50ms between chunks
  ↓
Returns void (no ack from printer)
```

## Common gotchas

### "Garbled Arabic on paper"

90% of the time: someone called `printText()` AFTER already shaping the
text. Don't double-shape. Pass raw Unicode strings to `printText`; it
shapes internally.

### "Letters appear in wrong order"

You forgot the reverse step. If you bypass `cp1256.encode()` and write
bytes manually, the printer will render LTR. The shaper compensates.

### "Lam-Alef shows as two separate letters"

Your shaper isn't detecting the ligature. Verify the cp1256 map has the
U+FEFB → `0xE1 0xC7` entry and that the lookup is hit before falling
through to the standard `U+0644` Lam mapping.

### "Print just hangs"

Bluetooth socket disconnected mid-write. Check
`PrinterManager.isConnected()` before each print. The store action does
this; raw `PrinterManager.print` does not.

### "Wrong character spacing"

Datecs DPP-250 ignores the `ESC SP n` (set character spacing) command
in cp1256 mode. Use `printLine()` for visual separators instead of
spaces.

## Testing

- **In-app test page:** `PrinterSettingsScreen` → "Print Test Page".
  Calls `testPage.ts` which emits a canonical ESC/POS sequence covering
  alignment, sizes, Arabic shaping, and a barcode.
- **Without hardware:** dump `Uint8Array` to console, inspect bytes
  manually. The first 2 bytes should be `0x1B 0x40` (ESC @).

## DO NOT

- Use `iconv-lite`, `iconv`, or any other encoding library. We own this.
- Skip the shaper for "performance" reasons. Pre-shaped strings won't
  work; the shaper is the only thing that emits the right Presentation
  Forms-B bytes.
- Add `console.log` calls inside `PrinterManager.print()` — the hot loop
  is timing-sensitive and logging in release mode adds 5-10ms per call.
- Hardcode MAC addresses. The user picks from a dropdown of bonded
  devices in `PrinterSettingsScreen`.
