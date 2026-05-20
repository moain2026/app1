/**
 * cp1256.ts — Arabic text encoder for ESC/POS thermal printers.
 *
 * The Datecs DPP-250 (and most Bluetooth thermal printers) does not speak UTF-8.
 * It must be told to switch to a single-byte Arabic code page (Windows-1256)
 * via `ESC t 0x16`, after which every byte we send is interpreted as a cp1256
 * codepoint. This module provides:
 *
 *   • CP1256_MAP   — Unicode → cp1256 byte(s) lookup table.
 *                    Some entries (e.g. Lam-Alef ligatures U+FEFB..U+FEFC)
 *                    expand to 2 cp1256 bytes, so values are number[].
 *   • encodeCp1256 — Convert a JS string to a Uint8Array of cp1256 bytes.
 *   • shapeArabic  — Best-effort joiner: Unicode Arabic letters arrive in
 *                    "isolated" form (U+0627 ا, U+0628 ب, …) but a thermal
 *                    printer with cp1256 expects them already shaped to
 *                    "presentation forms" (U+FE80..U+FEFC) so it can render
 *                    initial/medial/final glyphs. We use a small lookup-based
 *                    shaper sufficient for printed Arabic.
 *
 * Why not use TextEncoder? RN's Hermes engine ships TextEncoder but only
 * supports UTF-8 — it has no cp1256 encoder. We do it by hand.
 *
 * Source data: prepared-assets/printer/cp1256-arabic-mapping.json
 */

// ─── Generated Unicode → cp1256 byte(s) map ───────────────────────────────────
// Each value is an array because Lam-Alef ligatures and a few presentation
// forms expand to two cp1256 bytes (the second is U+FE82..FE86 fallback).
// auto-generated: 226 entries
export const CP1256_MAP: ReadonlyMap<number, readonly number[]> = new Map<
  number,
  readonly number[]
>([
  [0x00a0, [0xa0]],
  [0x00a2, [0xa2]],
  [0x00a3, [0xa3]],
  [0x00a4, [0xa4]],
  [0x00a5, [0xa5]],
  [0x00a6, [0xa6]],
  [0x00a7, [0xa7]],
  [0x00a8, [0xa8]],
  [0x00a9, [0xa9]],
  [0x00ab, [0xab]],
  [0x00ac, [0xac]],
  [0x00ad, [0xad]],
  [0x00ae, [0xae]],
  [0x00af, [0xaf]],
  [0x00b0, [0xb0]],
  [0x00b1, [0xb1]],
  [0x00b2, [0xb2]],
  [0x00b3, [0xb3]],
  [0x00b4, [0xb4]],
  [0x00b5, [0xb5]],
  [0x00b6, [0xb6]],
  [0x00b7, [0xb7]],
  [0x00b8, [0xb8]],
  [0x00b9, [0xb9]],
  [0x00bb, [0xbb]],
  [0x00bc, [0xbc]],
  [0x00bd, [0xbd]],
  [0x00be, [0xbe]],
  [0x00d7, [0xd7]],
  [0x00e0, [0xe0]],
  [0x00e2, [0xe2]],
  [0x00e7, [0xe7]],
  [0x00e8, [0xe8]],
  [0x00e9, [0xe9]],
  [0x00ea, [0xea]],
  [0x00eb, [0xeb]],
  [0x00ee, [0xee]],
  [0x00ef, [0xef]],
  [0x00f4, [0xf4]],
  [0x00f7, [0xf7]],
  [0x00f9, [0xf9]],
  [0x00fb, [0xfb]],
  [0x00fc, [0xfc]],
  // ─── Arabic letters (isolated, U+0621..U+064A) ─────────────────────────
  [0x0621, [0xc1]],
  [0x0622, [0xc2]],
  [0x0623, [0xc3]],
  [0x0624, [0xc4]],
  [0x0625, [0xc5]],
  [0x0626, [0xc6]],
  [0x0627, [0xc7]],
  [0x0628, [0xc8]],
  [0x0629, [0xc9]],
  [0x062a, [0xca]],
  [0x062b, [0xcb]],
  [0x062c, [0xcc]],
  [0x062d, [0xcd]],
  [0x062e, [0xce]],
  [0x062f, [0xcf]],
  [0x0630, [0xd0]],
  [0x0631, [0xd1]],
  [0x0632, [0xd2]],
  [0x0633, [0xd3]],
  [0x0634, [0xd4]],
  [0x0635, [0xd5]],
  [0x0636, [0xd6]],
  [0x0637, [0xd8]],
  [0x0638, [0xd9]],
  [0x0639, [0xda]],
  [0x063a, [0xdb]],
  [0x0640, [0xdc]],
  [0x0641, [0xdd]],
  [0x0642, [0xde]],
  [0x0643, [0xdf]],
  [0x0644, [0xe1]],
  [0x0645, [0xe3]],
  [0x0646, [0xe4]],
  [0x0647, [0xe5]],
  [0x0648, [0xe6]],
  [0x0649, [0xec]],
  [0x064a, [0xed]],
  // ─── Diacritics ────────────────────────────────────────────────────────
  [0x064b, [0xf0]],
  [0x064c, [0xf1]],
  [0x064d, [0xf2]],
  [0x064e, [0xf3]],
  [0x064f, [0xf5]],
  [0x0650, [0xf6]],
  [0x0651, [0xf8]],
  [0x0652, [0xfa]],
  // ─── Arabic-Indic digits (U+0660..U+0669 → 0xF0..0xF9 fallback) ───────
  // (We intentionally map ASCII digits 0-9 (0x30-0x39) 1:1 — they
  // pass through unchanged because cp1256 keeps ASCII intact.)
  // ─── Presentation forms (U+FE70..U+FEFC) ───────────────────────────────
  // The shaper produces these from the isolated forms above; cp1256 has
  // no native slot for them so we map them back to the isolated byte.
  [0xfe80, [0xc1]],
  [0xfe81, [0xc2]],
  [0xfe82, [0xc2]],
  [0xfe83, [0xc3]],
  [0xfe84, [0xc3]],
  [0xfe85, [0xc4]],
  [0xfe86, [0xc4]],
  [0xfe87, [0xc5]],
  [0xfe88, [0xc5]],
  [0xfe89, [0xc6]],
  [0xfe8a, [0xc6]],
  [0xfe8b, [0xc6]],
  [0xfe8c, [0xc6]],
  [0xfe8d, [0xc7]],
  [0xfe8e, [0xc7]],
  [0xfe8f, [0xc8]],
  [0xfe90, [0xc8]],
  [0xfe91, [0xc8]],
  [0xfe92, [0xc8]],
  [0xfe93, [0xc9]],
  [0xfe94, [0xc9]],
  [0xfe95, [0xca]],
  [0xfe96, [0xca]],
  [0xfe97, [0xca]],
  [0xfe98, [0xca]],
  [0xfe99, [0xcb]],
  [0xfe9a, [0xcb]],
  [0xfe9b, [0xcb]],
  [0xfe9c, [0xcb]],
  [0xfe9d, [0xcc]],
  [0xfe9e, [0xcc]],
  [0xfe9f, [0xcc]],
  [0xfea0, [0xcc]],
  [0xfea1, [0xcd]],
  [0xfea2, [0xcd]],
  [0xfea3, [0xcd]],
  [0xfea4, [0xcd]],
  [0xfea5, [0xce]],
  [0xfea6, [0xce]],
  [0xfea7, [0xce]],
  [0xfea8, [0xce]],
  [0xfea9, [0xcf]],
  [0xfeaa, [0xcf]],
  [0xfeab, [0xd0]],
  [0xfeac, [0xd0]],
  [0xfead, [0xd1]],
  [0xfeae, [0xd1]],
  [0xfeaf, [0xd2]],
  [0xfeb0, [0xd2]],
  [0xfeb1, [0xd3]],
  [0xfeb2, [0xd3]],
  [0xfeb3, [0xd3]],
  [0xfeb4, [0xd3]],
  [0xfeb5, [0xd4]],
  [0xfeb6, [0xd4]],
  [0xfeb7, [0xd4]],
  [0xfeb8, [0xd4]],
  [0xfeb9, [0xd5]],
  [0xfeba, [0xd5]],
  [0xfebb, [0xd5]],
  [0xfebc, [0xd5]],
  [0xfebd, [0xd6]],
  [0xfebe, [0xd6]],
  [0xfebf, [0xd6]],
  [0xfec0, [0xd6]],
  [0xfec1, [0xd8]],
  [0xfec2, [0xd8]],
  [0xfec3, [0xd8]],
  [0xfec4, [0xd8]],
  [0xfec5, [0xd9]],
  [0xfec6, [0xd9]],
  [0xfec7, [0xd9]],
  [0xfec8, [0xd9]],
  [0xfec9, [0xda]],
  [0xfeca, [0xda]],
  [0xfecb, [0xda]],
  [0xfecc, [0xda]],
  [0xfecd, [0xdb]],
  [0xfece, [0xdb]],
  [0xfecf, [0xdb]],
  [0xfed0, [0xdb]],
  [0xfed1, [0xdd]],
  [0xfed2, [0xdd]],
  [0xfed3, [0xdd]],
  [0xfed4, [0xdd]],
  [0xfed5, [0xde]],
  [0xfed6, [0xde]],
  [0xfed7, [0xde]],
  [0xfed8, [0xde]],
  [0xfed9, [0xdf]],
  [0xfeda, [0xdf]],
  [0xfedb, [0xdf]],
  [0xfedc, [0xdf]],
  [0xfedd, [0xe1]],
  [0xfede, [0xe1]],
  [0xfedf, [0xe1]],
  [0xfee0, [0xe1]],
  [0xfee1, [0xe3]],
  [0xfee2, [0xe3]],
  [0xfee3, [0xe3]],
  [0xfee4, [0xe3]],
  [0xfee5, [0xe4]],
  [0xfee6, [0xe4]],
  [0xfee7, [0xe4]],
  [0xfee8, [0xe4]],
  [0xfee9, [0xe5]],
  [0xfeea, [0xe5]],
  [0xfeeb, [0xe5]],
  [0xfeec, [0xe5]],
  [0xfeed, [0xe6]],
  [0xfeee, [0xe6]],
  [0xfeef, [0xec]],
  [0xfef0, [0xec]],
  [0xfef1, [0xed]],
  [0xfef2, [0xed]],
  [0xfef3, [0xed]],
  [0xfef4, [0xed]],
  // Lam-Alef ligatures → expand to two cp1256 bytes.
  [0xfef5, [0xe1, 0xc2]],
  [0xfef6, [0xe1, 0xc2]],
  [0xfef7, [0xe1, 0xc3]],
  [0xfef8, [0xe1, 0xc3]],
  [0xfef9, [0xe1, 0xc5]],
  [0xfefa, [0xe1, 0xc5]],
  [0xfefb, [0xe1, 0xc7]],
  [0xfefc, [0xe1, 0xc7]],
]);

// ─── Encoder ──────────────────────────────────────────────────────────────────

/**
 * Encode a JS string to a cp1256 byte stream suitable for the Datecs DPP-250.
 *
 *   - ASCII (U+0000..U+007F) maps 1:1 (cp1256 keeps the ASCII low half intact).
 *   - Latin-1 punctuation / accented letters look up in CP1256_MAP.
 *   - Arabic letters look up too (after optional shaping).
 *   - Western digits 0-9 pass through (0x30-0x39).
 *   - Arabic-Indic digits U+0660..U+0669 map to 0xF0..0xF9.
 *   - Anything else (emoji, CJK) is replaced with '?' (0x3F).
 */
export function encodeCp1256(input: string): Uint8Array {
  const out: number[] = [];
  for (const ch of input) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;

    // Fast path: ASCII.
    if (cp < 0x80) {
      out.push(cp);
      continue;
    }

    // Arabic-Indic digits (U+0660..U+0669) → 0xF0..0xF9.
    if (cp >= 0x0660 && cp <= 0x0669) {
      out.push(0xf0 + (cp - 0x0660));
      continue;
    }

    const mapped = CP1256_MAP.get(cp);
    if (mapped !== undefined) {
      for (const byte of mapped) {
        out.push(byte);
      }
      continue;
    }

    // Fallback: unmapped characters become '?'.
    out.push(0x3f);
  }
  return new Uint8Array(out);
}

// ─── Arabic shaper (lookup-based, sufficient for printed receipts) ────────────

/**
 * Each connectable Arabic letter has 4 contextual forms:
 *   [isolated, initial, medial, final]
 * Stored as Unicode codepoints from the U+FE80..U+FEFC presentation block.
 */
interface ShapingForms {
  isolated: number;
  initial: number;
  medial: number;
  final: number;
  /** Whether this letter connects to the NEXT letter (rightward in RTL). */
  connectsForward: boolean;
}

// Compact table — only the letters that participate in joining. Letters that
// never join forward (ا د ذ ر ز و ؤ إ أ آ ة) are included with
// connectsForward=false so the engine knows they break the cluster.
const SHAPING: ReadonlyMap<number, ShapingForms> = new Map([
  // ا (does not connect forward)
  [0x0627, { isolated: 0xfe8d, initial: 0xfe8d, medial: 0xfe8e, final: 0xfe8e, connectsForward: false }],
  // ب
  [0x0628, { isolated: 0xfe8f, initial: 0xfe91, medial: 0xfe92, final: 0xfe90, connectsForward: true }],
  // ة (does not connect forward)
  [0x0629, { isolated: 0xfe93, initial: 0xfe93, medial: 0xfe94, final: 0xfe94, connectsForward: false }],
  // ت
  [0x062a, { isolated: 0xfe95, initial: 0xfe97, medial: 0xfe98, final: 0xfe96, connectsForward: true }],
  // ث
  [0x062b, { isolated: 0xfe99, initial: 0xfe9b, medial: 0xfe9c, final: 0xfe9a, connectsForward: true }],
  // ج
  [0x062c, { isolated: 0xfe9d, initial: 0xfe9f, medial: 0xfea0, final: 0xfe9e, connectsForward: true }],
  // ح
  [0x062d, { isolated: 0xfea1, initial: 0xfea3, medial: 0xfea4, final: 0xfea2, connectsForward: true }],
  // خ
  [0x062e, { isolated: 0xfea5, initial: 0xfea7, medial: 0xfea8, final: 0xfea6, connectsForward: true }],
  // د (does not connect forward)
  [0x062f, { isolated: 0xfea9, initial: 0xfea9, medial: 0xfeaa, final: 0xfeaa, connectsForward: false }],
  // ذ (does not connect forward)
  [0x0630, { isolated: 0xfeab, initial: 0xfeab, medial: 0xfeac, final: 0xfeac, connectsForward: false }],
  // ر (does not connect forward)
  [0x0631, { isolated: 0xfead, initial: 0xfead, medial: 0xfeae, final: 0xfeae, connectsForward: false }],
  // ز (does not connect forward)
  [0x0632, { isolated: 0xfeaf, initial: 0xfeaf, medial: 0xfeb0, final: 0xfeb0, connectsForward: false }],
  // س
  [0x0633, { isolated: 0xfeb1, initial: 0xfeb3, medial: 0xfeb4, final: 0xfeb2, connectsForward: true }],
  // ش
  [0x0634, { isolated: 0xfeb5, initial: 0xfeb7, medial: 0xfeb8, final: 0xfeb6, connectsForward: true }],
  // ص
  [0x0635, { isolated: 0xfeb9, initial: 0xfebb, medial: 0xfebc, final: 0xfeba, connectsForward: true }],
  // ض
  [0x0636, { isolated: 0xfebd, initial: 0xfebf, medial: 0xfec0, final: 0xfebe, connectsForward: true }],
  // ط
  [0x0637, { isolated: 0xfec1, initial: 0xfec3, medial: 0xfec4, final: 0xfec2, connectsForward: true }],
  // ظ
  [0x0638, { isolated: 0xfec5, initial: 0xfec7, medial: 0xfec8, final: 0xfec6, connectsForward: true }],
  // ع
  [0x0639, { isolated: 0xfec9, initial: 0xfecb, medial: 0xfecc, final: 0xfeca, connectsForward: true }],
  // غ
  [0x063a, { isolated: 0xfecd, initial: 0xfecf, medial: 0xfed0, final: 0xfece, connectsForward: true }],
  // ف
  [0x0641, { isolated: 0xfed1, initial: 0xfed3, medial: 0xfed4, final: 0xfed2, connectsForward: true }],
  // ق
  [0x0642, { isolated: 0xfed5, initial: 0xfed7, medial: 0xfed8, final: 0xfed6, connectsForward: true }],
  // ك
  [0x0643, { isolated: 0xfed9, initial: 0xfedb, medial: 0xfedc, final: 0xfeda, connectsForward: true }],
  // ل
  [0x0644, { isolated: 0xfedd, initial: 0xfedf, medial: 0xfee0, final: 0xfede, connectsForward: true }],
  // م
  [0x0645, { isolated: 0xfee1, initial: 0xfee3, medial: 0xfee4, final: 0xfee2, connectsForward: true }],
  // ن
  [0x0646, { isolated: 0xfee5, initial: 0xfee7, medial: 0xfee8, final: 0xfee6, connectsForward: true }],
  // ه
  [0x0647, { isolated: 0xfee9, initial: 0xfeeb, medial: 0xfeec, final: 0xfeea, connectsForward: true }],
  // و (does not connect forward)
  [0x0648, { isolated: 0xfeed, initial: 0xfeed, medial: 0xfeee, final: 0xfeee, connectsForward: false }],
  // ى (Alef Maksura — does not connect forward)
  [0x0649, { isolated: 0xfeef, initial: 0xfeef, medial: 0xfef0, final: 0xfef0, connectsForward: false }],
  // ي
  [0x064a, { isolated: 0xfef1, initial: 0xfef3, medial: 0xfef4, final: 0xfef2, connectsForward: true }],
  // Hamza variants — none connect forward.
  [0x0621, { isolated: 0xfe80, initial: 0xfe80, medial: 0xfe80, final: 0xfe80, connectsForward: false }],
  [0x0622, { isolated: 0xfe81, initial: 0xfe81, medial: 0xfe82, final: 0xfe82, connectsForward: false }],
  [0x0623, { isolated: 0xfe83, initial: 0xfe83, medial: 0xfe84, final: 0xfe84, connectsForward: false }],
  [0x0624, { isolated: 0xfe85, initial: 0xfe85, medial: 0xfe86, final: 0xfe86, connectsForward: false }],
  [0x0625, { isolated: 0xfe87, initial: 0xfe87, medial: 0xfe88, final: 0xfe88, connectsForward: false }],
  [0x0626, { isolated: 0xfe89, initial: 0xfe8b, medial: 0xfe8c, final: 0xfe8a, connectsForward: true }],
]);

/**
 * Convert a string of isolated Arabic letters (U+06xx) into their correct
 * contextual presentation forms (U+FE8x..U+FEFx). Non-Arabic characters
 * pass through unchanged.
 *
 * Algorithm:
 *   For each character, look at its predecessor and successor:
 *     - prev connects forward? → this char joins on its right.
 *     - this connects forward?  → this char joins on its left.
 *   Based on the (joinsRight, joinsLeft) tuple pick the form:
 *     (false, false) → isolated
 *     (false, true)  → initial
 *     (true,  true)  → medial
 *     (true,  false) → final
 *
 * Also handles the Lam-Alef ligature (ل + ا → ﻻ, U+FEFB; with hamzas → FEF5..FEFA).
 */
export function shapeArabic(input: string): string {
  const chars = Array.from(input);
  const result: string[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i] ?? '';
    const cp = ch.codePointAt(0) ?? 0;
    const form = SHAPING.get(cp);

    if (!form) {
      result.push(ch);
      i += 1;
      continue;
    }

    // Lam-Alef ligature lookahead.
    const nextCh = chars[i + 1];
    const nextCp = nextCh?.codePointAt(0) ?? 0;
    if (cp === 0x0644 && nextCp >= 0x0622 && nextCp <= 0x0627) {
      const prev = chars[i - 1];
      const prevCp = prev?.codePointAt(0) ?? 0;
      const prevForm = SHAPING.get(prevCp);
      const joinsRight = prevForm?.connectsForward === true;
      // Pick the ligature variant by the alef type, then final/isolated form.
      let ligIsolated = 0xfefb;
      if (nextCp === 0x0622) ligIsolated = 0xfef5;
      else if (nextCp === 0x0623) ligIsolated = 0xfef7;
      else if (nextCp === 0x0625) ligIsolated = 0xfef9;
      else ligIsolated = 0xfefb;
      // joinsRight → final form is ligIsolated + 1.
      const ligature = joinsRight ? ligIsolated + 1 : ligIsolated;
      result.push(String.fromCodePoint(ligature));
      i += 2;
      continue;
    }

    // Standard 4-state shaping.
    const prev = chars[i - 1];
    const prevCp = prev?.codePointAt(0) ?? 0;
    const prevForm = SHAPING.get(prevCp);
    const joinsRight = prevForm?.connectsForward === true;
    const joinsLeft = form.connectsForward && SHAPING.has(nextCp);

    let presentationCp: number;
    if (!joinsRight && !joinsLeft) presentationCp = form.isolated;
    else if (!joinsRight && joinsLeft) presentationCp = form.initial;
    else if (joinsRight && joinsLeft) presentationCp = form.medial;
    else presentationCp = form.final;

    result.push(String.fromCodePoint(presentationCp));
    i += 1;
  }
  // For RTL printers, we must reverse the codepoints because cp1256 thermal
  // engines render left-to-right. The Arabic glyphs are visually right-to-left,
  // so we send them reversed to compensate.
  return result.reverse().join('');
}
