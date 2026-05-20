/**
 * Border-Radius Tokens — العباسي تحصيل
 *
 * Flat, modern, Jaib-inspired:
 *   - Cards   = 16
 *   - Buttons = 12 (or pill = 9999 for chips)
 *   - Bottom Sheets = 24 (top corners only)
 *   - Inputs  = 12
 *   - Avatars / circles = 9999
 */

export const radii = {
  none: 0,
  xs: 4, // tags / micro chips
  sm: 8, // small chips / pills
  md: 12, // buttons, inputs
  lg: 16, // cards (DEFAULT for content surfaces)
  xl: 20,
  '2xl': 24, // bottom sheets (top corners), large cards
  '3xl': 32,
  full: 9999, // circular avatars, pill chips
} as const;

// ─── Semantic aliases ───────────────────────────────────────────────────────
export const radius = {
  button: radii.md,
  buttonPill: radii.full,
  card: radii.lg,
  cardLarge: radii['2xl'],
  input: radii.md,
  chip: radii.full,
  sheet: radii['2xl'],
  avatar: radii.full,
  modal: radii['2xl'],
} as const;

export type RadiiToken = keyof typeof radii;
export type RadiusToken = keyof typeof radius;
