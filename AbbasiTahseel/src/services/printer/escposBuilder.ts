/**
 * escposBuilder.ts — Low-level ESC/POS command builders for the Datecs DPP-250.
 *
 * Every helper returns a Uint8Array of raw bytes that, when written to the
 * Bluetooth-Classic SPP socket of the printer, produces the documented effect.
 *
 * Source: prepared-assets/printer/escpos-commands-reference.md (verified
 * against the Datecs DPP-250 Programmer's Manual).
 *
 * Higher-level functions (`printText`, `printLine`, `setAlignment`, etc.) at
 * the bottom of the file compose the primitives and Arabic-shape-then-encode
 * the input so a screen can just call `printText('مرحباً')`.
 */

import { encodeCp1256, shapeArabic } from './cp1256';

// ─── Raw control bytes ────────────────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// ─── Concatenation helper ─────────────────────────────────────────────────────

/**
 * Concatenate any number of Uint8Arrays into a single Uint8Array.
 * Avoids spread (perf) on the JS engine — we walk the parts manually.
 */
export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) {
    total += p.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ─── 1. Initialization ────────────────────────────────────────────────────────

/** `ESC @` — Reset printer to power-on defaults. */
export function initPrinter(): Uint8Array {
  return new Uint8Array([ESC, 0x40]);
}

/**
 * `ESC t 22` (0x16) — Select code page Windows-1256 (Arabic).
 * On Datecs DPP-250 this is the documented Arabic code page.
 * Must be sent AFTER initPrinter().
 */
export function selectCp1256(): Uint8Array {
  return new Uint8Array([ESC, 0x74, 0x16]);
}

// ─── 2. Alignment ─────────────────────────────────────────────────────────────

export type Alignment = 'left' | 'center' | 'right';

export function setAlignment(align: Alignment): Uint8Array {
  const n: 0 | 1 | 2 = align === 'left' ? 0 : align === 'center' ? 1 : 2;
  return new Uint8Array([ESC, 0x61, n]);
}

// ─── 3. Bold ──────────────────────────────────────────────────────────────────

export function setBold(on: boolean): Uint8Array {
  return new Uint8Array([ESC, 0x45, on ? 1 : 0]);
}

// ─── 4. Underline ─────────────────────────────────────────────────────────────

export function setUnderline(on: boolean): Uint8Array {
  return new Uint8Array([ESC, 0x2d, on ? 1 : 0]);
}

// ─── 5. Font size ─────────────────────────────────────────────────────────────

export type FontSize = 'small' | 'normal' | 'large' | 'xlarge';

/**
 * `GS ! n` — Set character size. n encodes width (high nibble) and height
 * (low nibble), each a multiplier in [1..8].
 *
 *   small  → 1x1 with Font B (ESC M 1)
 *   normal → 1x1 default (Font A)
 *   large  → 2x2
 *   xlarge → 3x3
 *
 * Returns the byte sequence for the requested size. The caller is responsible
 * for resetting to normal after the section.
 */
export function setFontSize(size: FontSize): Uint8Array {
  if (size === 'small') {
    // ESC M 1 = font B (smaller cell)
    return new Uint8Array([ESC, 0x4d, 0x01]);
  }
  if (size === 'normal') {
    // Reset to Font A normal.
    return concatBytes(
      new Uint8Array([ESC, 0x4d, 0x00]),
      new Uint8Array([GS, 0x21, 0x00]),
    );
  }
  if (size === 'large') {
    return new Uint8Array([GS, 0x21, 0x11]); // 2x width, 2x height
  }
  // xlarge
  return new Uint8Array([GS, 0x21, 0x22]); // 3x width, 3x height
}

// ─── 6. Line feed / spacing ───────────────────────────────────────────────────

/** Single line feed. */
export function lineFeed(): Uint8Array {
  return new Uint8Array([LF]);
}

export function feedLines(n: number): Uint8Array {
  // `ESC d n` — print and feed n lines.
  const safe = Math.max(0, Math.min(255, Math.floor(n)));
  return new Uint8Array([ESC, 0x64, safe]);
}

// ─── 7. Paper cut (partial cut on DPP-250) ────────────────────────────────────

export function cutPaper(): Uint8Array {
  // `GS V 1` — partial cut (DPP-250 has no full cutter).
  return new Uint8Array([GS, 0x56, 0x01]);
}

// ─── 8. Barcodes ──────────────────────────────────────────────────────────────

/**
 * Set barcode height in dots. Default 162 dots ≈ 20 mm.
 */
export function setBarcodeHeight(dots: number): Uint8Array {
  const safe = Math.max(1, Math.min(255, Math.floor(dots)));
  return new Uint8Array([GS, 0x68, safe]);
}

/** Set barcode module width (2..6). Default 3. */
export function setBarcodeWidth(width: number): Uint8Array {
  const safe = Math.max(2, Math.min(6, Math.floor(width)));
  return new Uint8Array([GS, 0x77, safe]);
}

/** Set HRI (Human Readable Interpretation) position: 0=none, 1=above, 2=below, 3=both. */
export function setBarcodeHriPosition(pos: 0 | 1 | 2 | 3): Uint8Array {
  return new Uint8Array([GS, 0x48, pos]);
}

/**
 * Print a CODE128 barcode. `data` must be 1..255 ASCII printable characters.
 * Uses the m=73 (function B) format with NUL terminator.
 */
export function printBarcodeCode128(data: string): Uint8Array {
  // Strip non-printable ASCII to keep the printer happy.
  const safe = data.replace(/[^\x20-\x7E]/g, '').slice(0, 255);
  const dataBytes: number[] = [];
  for (let i = 0; i < safe.length; i += 1) {
    dataBytes.push(safe.charCodeAt(i));
  }
  // GS k m n d1 ... dn   (m=73=CODE128, n=length)
  const header = new Uint8Array([GS, 0x6b, 0x49, dataBytes.length]);
  return concatBytes(header, new Uint8Array(dataBytes));
}

// ─── 9. High-level text printing ──────────────────────────────────────────────

interface PrintTextOptions {
  align?: Alignment;
  bold?: boolean;
  size?: FontSize;
  /** Whether to apply the Arabic shaper before encoding. Default: true. */
  shape?: boolean;
  /** Whether to append a newline after the text. Default: true. */
  newline?: boolean;
}

/**
 * Print a string with optional formatting. The string is:
 *   1. Optionally Arabic-shaped (isolated → contextual presentation forms).
 *   2. Encoded to cp1256 bytes.
 *   3. Wrapped with the requested alignment/bold/size commands.
 *
 * After printing, the formatting state is reset back to defaults so the next
 * call starts from a clean slate.
 */
export function printText(text: string, options: PrintTextOptions = {}): Uint8Array {
  const align = options.align ?? 'right';
  const bold = options.bold ?? false;
  const size = options.size ?? 'normal';
  const shape = options.shape ?? true;
  const newline = options.newline ?? true;

  const prepared = shape ? shapeArabic(text) : text;
  const body = encodeCp1256(prepared);

  const parts: Uint8Array[] = [
    setAlignment(align),
    setBold(bold),
    setFontSize(size),
    body,
  ];

  if (newline) {
    parts.push(lineFeed());
  }

  // Reset formatting state.
  parts.push(setBold(false));
  parts.push(setFontSize('normal'));

  return concatBytes(...parts);
}

/**
 * Print a horizontal divider line. Default: 48 dashes (matches a 58-mm
 * thermal printer with Font A which fits 32 chars at normal width, but
 * many Datecs DPP-250 units print 48 cpl with Font B; the higher number
 * keeps Font B users happy and Font A users will just wrap to a 2nd line).
 */
export function printLine(char: string = '─', width: number = 48): Uint8Array {
  return printText(char.repeat(width), {
    align: 'left',
    bold: false,
    size: 'normal',
    shape: false,
  });
}

/** Convenience wrapper used by receipt builders. */
export function printBarcode(
  data: string,
  options: { height?: number; width?: number; hri?: 0 | 1 | 2 | 3 } = {},
): Uint8Array {
  const height = options.height ?? 80;
  const width = options.width ?? 2;
  const hri = options.hri ?? 2;
  return concatBytes(
    setAlignment('center'),
    setBarcodeHeight(height),
    setBarcodeWidth(width),
    setBarcodeHriPosition(hri),
    printBarcodeCode128(data),
    lineFeed(),
  );
}
