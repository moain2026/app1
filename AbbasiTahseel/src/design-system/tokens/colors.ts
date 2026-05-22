/**
 * Color Tokens — العباسي تحصيل (Al-Abbasi Tahsil)
 *
 * Two color families:
 *  1. Brand colors    — derived from the Al-Abbasi shield logo (yellow + navy).
 *                       Used in: Splash, Drawer header, Auth screens, Print receipts.
 *  2. UI accent (red) — borrowed from Jaib Wallet style language.
 *                       Used ONLY for primary CTAs / active states.
 *
 * Naming convention:
 *  - `palette.*` → raw tokens (never use directly in components).
 *  - `theme.colors.*` (see theme/darkTheme.ts, lightTheme.ts) → semantic tokens.
 *
 * Rule: components must consume semantic tokens via `useTheme()`,
 * never reference `palette.*` directly except inside theme files.
 */

export const palette = {
  // ─── Al-Abbasi Brand (from the shield logo) ───────────────────────────────
  brandYellow: '#F4C20D', // primary brand yellow (shield background)
  brandYellowDark: '#C99A00', // darker yellow for pressed states
  brandYellowSoft: '#FFF5CC', // soft tinted background
  brandNavy: '#1B2A4E', // dark navy (shield border + worker silhouette)
  brandNavyDark: '#0F1B33',
  brandNavySoft: '#E5E8F0',

  // ─── UI Accent (Jaib-inspired Red — for CTAs only) ────────────────────────
  accentRed: '#E5232A', // primary CTA red
  accentRedDark: '#C41E24', // pressed
  accentRedSoft: '#FDEAEB', // background of red pills/chips

  // ─── Neutral Grayscale (Dark Mode) ────────────────────────────────────────
  darkBg: '#121212', // app background
  darkSurface: '#1E1E1E', // cards / sheets level 1
  darkSurfaceElevated: '#2A2A2A', // elevated cards / inputs
  /**
   * Dim variant used for chips / picker rows / search-bar bg in dark mode.
   * Sits between bg and surface so nested controls remain visible without
   * competing with elevated cards.
   */
  darkSurfaceMuted: '#181818',
  darkBorder: '#2F2F2F', // subtle dividers
  darkBorderStrong: '#3A3A3A', // emphasized dividers
  darkOverlay: 'rgba(0, 0, 0, 0.6)', // bottom sheet backdrop
  darkTextPrimary: '#FFFFFF',
  darkTextSecondary: '#A0A0A0',
  darkTextTertiary: '#6B6B6B',
  darkTextDisabled: '#4A4A4A',

  // ─── Neutral Grayscale (Light Mode) ───────────────────────────────────────
  lightBg: '#F6F6F9',
  lightSurface: '#FFFFFF',
  lightSurfaceElevated: '#FAFAFD',
  /**
   * Subtle off-white used for chips, picker rows, search-bar backgrounds —
   * a touch dimmer than `lightSurface` so they recede when nested inside
   * an elevated card.
   */
  lightSurfaceMuted: '#F2F2F6',
  lightBorder: '#EAEAEA',
  lightBorderStrong: '#D4D4D4',
  lightOverlay: 'rgba(0, 0, 0, 0.4)',
  lightTextPrimary: '#1A1A1A',
  lightTextSecondary: '#5A5A5A',
  lightTextTertiary: '#9A9A9A',
  lightTextDisabled: '#C0C0C0',

  // ─── Semantic — Status Colors (work for both modes) ───────────────────────
  success: '#22C55E',
  successSoft: '#DCFCE7',
  successDark: '#15803D',

  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  warningDark: '#B45309',

  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  dangerDark: '#B91C1C',
  // Legacy red used in old app for "sk > asts" (over-consumption highlight).
  // Kept verbatim to preserve identical visual rule.
  legacyOverConsumption: '#D81B60',

  info: '#3B82F6',
  infoSoft: '#DBEAFE',
  infoDark: '#1D4ED8',

  // ─── Reading-status semantic tokens (domain-specific) ─────────────────────
  readingPosted: '#22C55E', // cas != 0 (posted)
  readingPending: '#F59E0B', // cas == 0, not yet synced
  readingFailed: '#EF4444', // sync failed
  readingOverConsumption: '#D81B60', // sk > asts

  // ─── Sync-status semantic tokens ──────────────────────────────────────────
  syncPristine: '#6B6B6B',
  syncDirty: '#F59E0B',
  syncSyncing: '#3B82F6',
  syncSynced: '#22C55E',
  syncFailed: '#EF4444',

  // ─── Utility ─────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type PaletteToken = keyof typeof palette;
export type ColorValue = (typeof palette)[PaletteToken];
