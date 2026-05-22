/**
 * Dark Theme — العباسي تحصيل (DEFAULT THEME)
 *
 * Semantic mapping from raw palette → meaning-based tokens.
 * Components must consume these via `useTheme()` (never `palette.*` directly).
 *
 * Dark Mode is the default per requirements (mirrors Jaib Wallet style).
 */

import {
  palette,
  spacing,
  radii,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  textStyles,
  shadowsDark,
  duration,
  easing,
  spring,
  transitions,
  layout,
} from '../tokens';

export const darkTheme = {
  name: 'dark' as const,
  isDark: true,

  colors: {
    // ─── Surfaces ───────────────────────────────────────────────────────────
    background: palette.darkBg,
    surface: palette.darkSurface,
    surfaceElevated: palette.darkSurfaceElevated,
    /**
     * Subtle, slightly-dimmer-than-surface fill used by chips, picker rows,
     * search-bar bg, and zebra striping inside report tables.
     */
    surfaceMuted: palette.darkSurfaceMuted,
    sheet: palette.darkSurface,
    overlay: palette.darkOverlay,

    // ─── Borders / Dividers ─────────────────────────────────────────────────
    border: palette.darkBorder,
    borderStrong: palette.darkBorderStrong,
    divider: palette.darkBorder,

    // ─── Text ───────────────────────────────────────────────────────────────
    textPrimary: palette.darkTextPrimary,
    textSecondary: palette.darkTextSecondary,
    textTertiary: palette.darkTextTertiary,
    textDisabled: palette.darkTextDisabled,
    textOnAccent: palette.white, // text on red buttons
    textOnBrand: palette.brandNavy, // text on yellow brand surfaces

    // ─── Brand (Al-Abbasi) ──────────────────────────────────────────────────
    brandPrimary: palette.brandYellow,
    brandPrimaryDark: palette.brandYellowDark,
    brandPrimarySoft: palette.brandYellowSoft,
    brandSecondary: palette.brandNavy,
    brandSecondaryDark: palette.brandNavyDark,

    // ─── Accent (red CTA — Jaib-inspired) ───────────────────────────────────
    accent: palette.accentRed,
    accentPressed: palette.accentRedDark,
    accentSoft: palette.accentRedSoft,

    // ─── Status (semantic) ──────────────────────────────────────────────────
    success: palette.success,
    successSoft: palette.successDark,
    warning: palette.warning,
    warningSoft: palette.warningDark,
    danger: palette.danger,
    dangerSoft: palette.dangerDark,
    info: palette.info,
    infoSoft: palette.infoDark,

    // ─── Domain semantic (readings) ─────────────────────────────────────────
    readingPosted: palette.readingPosted,
    readingPending: palette.readingPending,
    readingFailed: palette.readingFailed,
    readingOverConsumption: palette.readingOverConsumption,

    // ─── Domain semantic (sync) ─────────────────────────────────────────────
    syncPristine: palette.syncPristine,
    syncDirty: palette.syncDirty,
    syncSyncing: palette.syncSyncing,
    syncSynced: palette.syncSynced,
    syncFailed: palette.syncFailed,

    // ─── Tab bar ────────────────────────────────────────────────────────────
    tabBarBg: palette.darkSurface,
    tabBarActiveTint: palette.accentRed,
    tabBarInactiveTint: palette.darkTextSecondary,

    // ─── Inputs ─────────────────────────────────────────────────────────────
    inputBg: palette.darkSurfaceElevated,
    inputBorder: palette.darkBorder,
    inputBorderFocused: palette.accentRed,
    inputPlaceholder: palette.darkTextTertiary,

    // ─── Misc ───────────────────────────────────────────────────────────────
    skeleton: palette.darkSurfaceElevated,
    backdrop: palette.darkOverlay,
    white: palette.white,
    black: palette.black,
    transparent: palette.transparent,
  },

  // ─── Token re-exports (single source of truth via theme) ──────────────────
  spacing,
  radii,
  radius,
  layout,
  fontFamily,
  fontSize,
  lineHeight,
  textStyles,
  shadows: shadowsDark,
  duration,
  easing,
  spring,
  transitions,
} as const;

/**
 * Theme type — widened from the dark theme's structural shape.
 *
 * We use a recursive "DeepWiden" helper instead of a bare `typeof darkTheme`
 * because the latter would freeze every literal (e.g. `name: 'dark'`,
 * `isDark: true`, `colors.background: '#121212'`) and reject the light
 * theme which uses different literal values for the same fields.
 *
 * Functions (in spring/transitions) and arrays are preserved as-is.
 */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<Widen<U>>
        : T extends (...args: never[]) => unknown
          ? T
          : T extends object
            ? { -readonly [K in keyof T]: Widen<T[K]> }
            : T;

export type Theme = Widen<typeof darkTheme>;
export type ThemeColors = Theme['colors'];
