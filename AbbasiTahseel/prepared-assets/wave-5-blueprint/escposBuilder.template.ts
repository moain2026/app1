/**
 * ESC/POS Builder — Datecs DPP-250 (58 mm, cp1256 Arabic)
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  TEMPLATE FILE — DO NOT IMPORT FROM src/                              ║
 * ║                                                                            ║
 * ║  Rename to `.ts` and place at:                                            ║
 * ║      src/services/printer/escposBuilder.ts                                 ║
 * ║                                                                            ║
 * ║  Also place the cp1256 JSON at:                                            ║
 * ║      src/services/printer/cp1256-mapping.json                              ║
 * ║  (copy from prepared-assets/printer/cp1256-arabic-mapping.json)            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Two responsibilities, intentionally fused into one builder class:
 *
 *   1. Emit ESC/POS control sequences (init, alignment, bold, size, feed,
 *      cut, code-page select).
 *   2. Encode Arabic text to cp1256 single-byte stream.
 *
 * Why one class instead of two
 * ────────────────────────────
 * A receipt is always built as a *flat* byte stream where control bytes
 * and text bytes are interleaved. Splitting into two classes would force
 * callers to glue arrays together by hand, which is error-prone and slow
 * on RN's bridge.
 *
 * Source spec
 * ───────────
 *   • prepared-assets/printer/escpos-commands-reference.md
 *   • prepared-assets/printer/cp1256-arabic-mapping.json (loaded at import)
 *   • prepared-assets/printer/datecs-dpp250-specs.md      (paper width)
 *
 * Important — Arabic shaping
 * ──────────────────────────
 * The Datecs cp1256 font has only ISOLATED letter forms (no medial/initial/
 * final glyphs). To render visually correct Arabic, the input string must
 * be reshaped to presentation forms (U+FE70..U+FEFC) FIRST, then encoded.
 * The JSON file contains both blocks (`arabic_letters_isolated` and
 * `presentation_forms_isolated_to_cp1256`) — both maps are merged at load.
 *
 * The shaping algorithm itself (joining rules) belongs in a separate
 * `cp1256Shaper.ts` module — this file accepts already-shaped text and
 * focuses on byte emission. A minimal RTL reversal helper is included
 * because ESC/POS draws left-to-right unconditionally.
 */

// Bundled at build-time by Metro thanks to RN's JSON loader.
// The .template.ts extension means tsc ignores this file, but Metro picks
// up the real .ts copy in src/ which will use the same import path.
import cp1256Json from '@/services/printer/cp1256-mapping.json';

// ─── Public types ────────────────────────────────────────────────────────

export type Alignment = 'left' | 'center' | 'right';

/**
 * Three text sizes are exposed (DPP-250 supports more via `GS ! n` but the
 * receipt templates only need these three — keep the API tight).
 *   • 'normal' → GS ! 0x00 — 12×24 dots (≈ 48 chars per line, font B)
 *   • 'large'  → GS ! 0x11 — 2× width × 2× height
 *   • 'xlarge' → GS ! 0x22 — 3× width × 3× height
 */
export type TextSize = 'normal' | 'large' | 'xlarge';

export interface BuildArabicTextOptions {
  /** Already-shaped (presentation forms) or raw Arabic. */
  shaped?: boolean;
  /**
   * Reverse the byte stream before emission so RTL words read in the
   * correct visual order under ESC/POS' LTR engine. Default: true.
   */
  reverseForRtl?: boolean;
}

// ─── Constants — raw bytes ───────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// cp1256 code page index on Datecs firmware (verified in datecs-dpp250-specs.md).
const CODEPAGE_CP1256 = 22;

const FALLBACK_CHAR = 0x3f; // '?'

// ─── cp1256 lookup table (built once) ────────────────────────────────────
//
// The JSON file uses string keys like "0x0627" so it can be hand-edited.
// We rebuild it into a numeric Map for O(1) lookups in hot paths.

interface Cp1256JsonShape {
  arabic_letters_isolated: Record<string, string>;
  arabic_diacritics: Record<string, string>;
  arabic_indic_digits: Record<string, string>;
  presentation_forms_isolated_to_cp1256: Record<string, string>;
  fallback: { default: string };
}

function buildCp1256Map(): Map<number, number> {
  const json = cp1256Json as Cp1256JsonShape;
  const map = new Map<number, number>();

  const blocks: Array<Record<string, string>> = [
    json.arabic_letters_isolated,
    json.arabic_diacritics,
    json.arabic_indic_digits,
    json.presentation_forms_isolated_to_cp1256,
  ];

  for (const block of blocks) {
    for (const key of Object.keys(block)) {
      const codepoint = parseInt(key, 16);
      const byte = parseInt(block[key], 16);
      if (Number.isFinite(codepoint) && Number.isFinite(byte)) {
        map.set(codepoint, byte);
      }
    }
  }

  return map;
}

const CP1256_MAP: Map<number, number> = buildCp1256Map();

// ─── ESC/POS Builder ─────────────────────────────────────────────────────

export class EscposBuilder {
  private chunks: number[][] = [];

  /** ESC @  — initialize printer (clears mode bits, resets line spacing). */
  init(): this {
    this.chunks.push([ESC, 0x40]);
    // Always re-select cp1256 after init() — Datecs firmware resets it.
    this.chunks.push([ESC, 0x74, CODEPAGE_CP1256]);
    return this;
  }

  /** ESC a n  — 0 = left, 1 = centre, 2 = right. */
  setAlignment(align: Alignment): this {
    const n = align === 'left' ? 0 : align === 'center' ? 1 : 2;
    this.chunks.push([ESC, 0x61, n]);
    return this;
  }

  /** ESC E n  — bold on / off. */
  setBold(on: boolean): this {
    this.chunks.push([ESC, 0x45, on ? 1 : 0]);
    return this;
  }

  /** GS ! n  — character size (width nibble | height nibble). */
  setSize(size: TextSize): this {
    const n = size === 'xlarge' ? 0x22 : size === 'large' ? 0x11 : 0x00;
    this.chunks.push([GS, 0x21, n]);
    return this;
  }

  /** ESC - n  — underline (0 = off, 1 = thin, 2 = thick). */
  setUnderline(thickness: 0 | 1 | 2): this {
    this.chunks.push([ESC, 0x2d, thickness]);
    return this;
  }

  /** LF — print and feed one line. */
  feedLine(): this {
    this.chunks.push([LF]);
    return this;
  }

  /** ESC d n — feed `n` lines (saturated at 255). */
  feedLines(n: number): this {
    const clamped = Math.max(0, Math.min(255, Math.floor(n)));
    this.chunks.push([ESC, 0x64, clamped]);
    return this;
  }

  /**
   * GS V m  — cut paper. Datecs DPP-250 is a tear-bar device, so the cut
   * command is interpreted as a long line feed by the firmware. We feed
   * 4 extra lines first so the tear-bar can grip the paper.
   */
  cut(): this {
    this.feedLines(4);
    this.chunks.push([GS, 0x56, 0x42, 0x00]);
    return this;
  }

  /**
   * Append plain ASCII (e.g. dashes / digits / Latin punctuation). Does
   * NOT add a line feed.
   */
  writeAscii(text: string): this {
    const out: number[] = new Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      // ASCII goes 1:1; anything else falls back to '?'
      out[i] = code < 0x80 ? code : FALLBACK_CHAR;
    }
    this.chunks.push(out);
    return this;
  }

  /**
   * Append Arabic (or mixed Arabic + Latin) text encoded as cp1256.
   *
   * @param text   — input string. May contain Arabic, ASCII, digits.
   * @param opts.shaped         — true if text is already in presentation forms.
   * @param opts.reverseForRtl  — reverse byte order so the printer (LTR)
   *                              draws the line right-to-left visually.
   *
   * Note: this function does NOT call setAlignment — the caller chooses
   * left/centre/right. Reversal is independent of alignment.
   */
  buildArabicText(text: string, opts: BuildArabicTextOptions = {}): this {
    const reverse = opts.reverseForRtl !== false; // default true
    const bytes = encodeCp1256(text);
    if (reverse) {
      bytes.reverse();
    }
    this.chunks.push(bytes);
    return this;
  }

  /**
   * Convenience: emit an Arabic line (alignment + text + line feed). The
   * common case in receipts is `setAlignment('right') + buildArabicText + LF`.
   */
  arabicLine(text: string, align: Alignment = 'right'): this {
    return this.setAlignment(align).buildArabicText(text).feedLine();
  }

  /**
   * Code-128 barcode. Caller is responsible for keeping `data` ASCII-only
   * and within Code-128 charset rules.
   *
   *   GS h n       — set barcode height
   *   GS w n       — set barcode width (module dots)
   *   GS k 73 n d… — Code-128, length-prefixed
   */
  barcodeCode128(data: string, opts?: { height?: number; width?: 2 | 3 }): this {
    const height = opts?.height ?? 80;
    const width = opts?.width ?? 2;
    this.chunks.push([GS, 0x68, Math.max(1, Math.min(255, height))]);
    this.chunks.push([GS, 0x77, width]);
    const len = Math.min(255, data.length);
    const head = [GS, 0x6b, 73, len];
    const body: number[] = new Array(len);
    for (let i = 0; i < len; i += 1) {
      body[i] = data.charCodeAt(i) & 0x7f;
    }
    this.chunks.push(head.concat(body));
    return this;
  }

  /**
   * QR code (model 2). See escpos-commands-reference.md §QR for the
   * 4-step command sequence (model, size, ECC, store, print).
   */
  qrCode(data: string, opts?: { module?: number; ecc?: 'L' | 'M' | 'Q' | 'H' }): this {
    const moduleSize = Math.max(1, Math.min(16, opts?.module ?? 6));
    const eccByte =
      opts?.ecc === 'L'
        ? 48
        : opts?.ecc === 'Q'
          ? 51
          : opts?.ecc === 'H'
            ? 52
            : 49; // 'M' default
    // 1. Select model 2
    this.chunks.push([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    // 2. Set module size
    this.chunks.push([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize]);
    // 3. ECC level
    this.chunks.push([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, eccByte]);
    // 4. Store data
    const dataBytes: number[] = [];
    for (let i = 0; i < data.length; i += 1) {
      dataBytes.push(data.charCodeAt(i) & 0xff);
    }
    const totalLen = dataBytes.length + 3;
    const pL = totalLen & 0xff;
    const pH = (totalLen >> 8) & 0xff;
    this.chunks.push([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30].concat(dataBytes));
    // 5. Print
    this.chunks.push([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
    return this;
  }

  /**
   * Materialise the queued commands as a single Uint8Array. The builder is
   * NOT re-entrant — callers should treat a built buffer as final and
   * create a fresh instance for the next receipt.
   */
  build(): Uint8Array {
    let total = 0;
    for (const c of this.chunks) {
      total += c.length;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      for (let i = 0; i < c.length; i += 1) {
        out[offset + i] = c[i];
      }
      offset += c.length;
    }
    return out;
  }

  /** Reset the internal chunk buffer (allows builder reuse, optional). */
  reset(): this {
    this.chunks = [];
    return this;
  }
}

// ─── Pure encoder (exported for unit tests) ──────────────────────────────

/**
 * Encode a string to cp1256 bytes. ASCII (< 0x80) passes through unchanged.
 * Codepoints not present in the JSON map become FALLBACK_CHAR ('?').
 *
 * Pure function — no side effects, easy to fuzz.
 */
export function encodeCp1256(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const codepoint = text.codePointAt(i);
    if (codepoint === undefined) {
      out.push(FALLBACK_CHAR);
      continue;
    }
    if (codepoint < 0x80) {
      out.push(codepoint);
      continue;
    }
    // Supplementary-plane codepoints occupy two UTF-16 code units — skip
    // the low surrogate so we don't emit garbage.
    if (codepoint > 0xffff) {
      i += 1;
    }
    const mapped = CP1256_MAP.get(codepoint);
    out.push(mapped ?? FALLBACK_CHAR);
  }
  return out;
}

// ─── Convenience factory ─────────────────────────────────────────────────

export function createBuilder(): EscposBuilder {
  return new EscposBuilder();
}
