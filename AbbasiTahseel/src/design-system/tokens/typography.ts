/**
 * Typography Tokens — العباسي تحصيل
 *
 * Font family: Tajawal (Google Fonts) — chosen because:
 *  - Excellent Arabic readability at small sizes.
 *  - 8 weights available (200..900) → covers all UI hierarchy needs.
 *  - Optimized for screens.
 *
 * Font files must be placed in: assets/fonts/
 *   Tajawal-ExtraLight.ttf  (200)
 *   Tajawal-Light.ttf       (300)
 *   Tajawal-Regular.ttf     (400)
 *   Tajawal-Medium.ttf      (500)
 *   Tajawal-Bold.ttf        (700)
 *   Tajawal-ExtraBold.ttf   (800)
 *   Tajawal-Black.ttf       (900)
 *
 * After adding files, run:  npx react-native-asset
 *
 * Then on Android they appear as: "Tajawal-Regular", "Tajawal-Bold", etc.
 *
 * Rule: ALWAYS use the `fontFamily` token below. Never hardcode font names.
 *       In Arabic + RTL, font fallback can produce inconsistent metrics.
 */

import { Platform } from 'react-native';

// ─── Font family resolution (Android-only build, but kept platform-safe) ────
export const fontFamily = {
  extraLight: Platform.select({
    android: 'Tajawal-ExtraLight',
    default: 'Tajawal',
  }) as string,
  light: Platform.select({
    android: 'Tajawal-Light',
    default: 'Tajawal',
  }) as string,
  regular: Platform.select({
    android: 'Tajawal-Regular',
    default: 'Tajawal',
  }) as string,
  medium: Platform.select({
    android: 'Tajawal-Medium',
    default: 'Tajawal',
  }) as string,
  bold: Platform.select({
    android: 'Tajawal-Bold',
    default: 'Tajawal',
  }) as string,
  extraBold: Platform.select({
    android: 'Tajawal-ExtraBold',
    default: 'Tajawal',
  }) as string,
  black: Platform.select({
    android: 'Tajawal-Black',
    default: 'Tajawal',
  }) as string,
} as const;

// ─── Font weights (string values for RN compatibility) ──────────────────────
export const fontWeight = {
  extraLight: '200',
  light: '300',
  regular: '400',
  medium: '500',
  bold: '700',
  extraBold: '800',
  black: '900',
} as const;

// ─── Font sizes — modular scale (1.125 ratio) tuned for Arabic on 5"-6.5" ──
export const fontSize = {
  xxs: 10, // captions, badges
  xs: 12, // helper text, table labels
  sm: 14, // body small
  md: 16, // body — DEFAULT for paragraphs
  lg: 18, // emphasized body
  xl: 20, // sub-section headers
  '2xl': 24, // screen titles
  '3xl': 28, // hero numbers (e.g. balance amount)
  '4xl': 34, // splash brand
  '5xl': 42, // very rare
} as const;

// ─── Line heights — Arabic needs more leading than Latin ────────────────────
// Multiplier 1.5 for body, 1.3 for headings.
export const lineHeight = {
  xxs: 14,
  xs: 18,
  sm: 22,
  md: 26,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 42,
  '5xl': 50,
} as const;

// ─── Letter spacing — generally neutral for Arabic ──────────────────────────
export const letterSpacing = {
  tight: -0.2,
  normal: 0,
  wide: 0.4,
} as const;

// ─── Pre-baked text styles (semantic) ───────────────────────────────────────
// Use these in components: `style={textStyles.bodyMd}`
export const textStyles = {
  // Display (for big numbers like the balance card or splash logo)
  display: {
    fontFamily: fontFamily.black,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
    letterSpacing: letterSpacing.tight,
  },

  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
  },
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },

  // Body
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },
  bodyMd: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },

  // Emphasized
  bodyMdBold: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  bodyMdMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },

  // Captions / helper text
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },
  captionBold: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },

  // Buttons
  buttonLg: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  buttonMd: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },

  // Tabular numbers (for reading values — currentReading, prevReading, etc.)
  numericLg: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    // RN doesn't support fontVariant: 'tabular-nums' reliably on Android,
    // but Tajawal numbers are already monospaced-ish.
  },
  numericMd: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },
} as const;

export type FontFamilyToken = keyof typeof fontFamily;
export type FontSizeToken = keyof typeof fontSize;
export type TextStyleToken = keyof typeof textStyles;
