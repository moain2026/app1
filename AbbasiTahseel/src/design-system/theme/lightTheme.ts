/**
 * Light Theme — العباسي تحصيل
 *
 * Available as an opt-in theme (user can switch from Profile → Theme Picker).
 * Mirrors the darkTheme shape so components remain theme-agnostic.
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
  shadowsLight,
  duration,
  easing,
  spring,
  transitions,
  layout,
} from '../tokens';
import type { Theme } from './darkTheme';

export const lightTheme: Theme = {
  name: 'light',
  isDark: false,

  colors: {
    // Surfaces
    background: palette.lightBg,
    surface: palette.lightSurface,
    surfaceElevated: palette.lightSurfaceElevated,
    /**
     * Subtle, slightly-dimmer-than-surface fill used by chips, picker rows,
     * search-bar bg, and zebra striping inside report tables.
     */
    surfaceMuted: palette.lightSurfaceMuted,
    sheet: palette.lightSurface,
    overlay: palette.lightOverlay,

    // Borders
    border: palette.lightBorder,
    borderStrong: palette.lightBorderStrong,
    divider: palette.lightBorder,

    // Text
    textPrimary: palette.lightTextPrimary,
    textSecondary: palette.lightTextSecondary,
    textTertiary: palette.lightTextTertiary,
    textDisabled: palette.lightTextDisabled,
    textOnAccent: palette.white,
    textOnBrand: palette.brandNavy,

    // Brand
    brandPrimary: palette.brandYellow,
    brandPrimaryDark: palette.brandYellowDark,
    brandPrimarySoft: palette.brandYellowSoft,
    brandSecondary: palette.brandNavy,
    brandSecondaryDark: palette.brandNavyDark,

    // Accent
    accent: palette.accentRed,
    accentPressed: palette.accentRedDark,
    accentSoft: palette.accentRedSoft,

    // Status
    success: palette.success,
    successSoft: palette.successSoft,
    warning: palette.warning,
    warningSoft: palette.warningSoft,
    danger: palette.danger,
    dangerSoft: palette.dangerSoft,
    info: palette.info,
    infoSoft: palette.infoSoft,

    // Domain (readings)
    readingPosted: palette.readingPosted,
    readingPending: palette.readingPending,
    readingFailed: palette.readingFailed,
    readingOverConsumption: palette.readingOverConsumption,

    // Domain (sync)
    syncPristine: palette.syncPristine,
    syncDirty: palette.syncDirty,
    syncSyncing: palette.syncSyncing,
    syncSynced: palette.syncSynced,
    syncFailed: palette.syncFailed,

    // Tab bar
    tabBarBg: palette.lightSurface,
    tabBarActiveTint: palette.accentRed,
    tabBarInactiveTint: palette.lightTextSecondary,

    // Inputs
    inputBg: palette.lightSurface,
    inputBorder: palette.lightBorder,
    inputBorderFocused: palette.accentRed,
    inputPlaceholder: palette.lightTextTertiary,

    // Misc
    skeleton: palette.lightBorder,
    backdrop: palette.lightOverlay,
    white: palette.white,
    black: palette.black,
    transparent: palette.transparent,
  },

  spacing,
  radii,
  radius,
  layout,
  fontFamily,
  fontSize,
  lineHeight,
  textStyles,
  shadows: shadowsLight,
  duration,
  easing,
  spring,
  transitions,
};
