/**
 * Shadow Tokens — العباسي تحصيل
 *
 * Philosophy:
 *  - Dark mode = mostly flat. Shadows are nearly invisible.
 *  - Light mode = subtle elevation to differentiate cards from background.
 *  - We rely on Android's `elevation` (Material) instead of `shadowOffset/shadowOpacity`,
 *    because iOS-style shadows don't render on Android anyway, and we're Android-only.
 *
 * Usage: spread the shadow into a style object:
 *   style={[styles.card, shadows.cardLight]}
 */

import type { ViewStyle } from 'react-native';

type Shadow = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

// ─── No shadow (flat) ────────────────────────────────────────────────────────
export const shadowNone: Shadow = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

// ─── Light mode shadows (subtle, brand-neutral) ─────────────────────────────
export const shadowCardLight: Shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
};

export const shadowSheetLight: Shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 8,
};

export const shadowFloatingLight: Shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 6,
};

// ─── Dark mode shadows (almost none — rely on surface color contrast) ───────
export const shadowCardDark: Shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 1, // Android requires elevation > 0 for shadow on dark surfaces
};

export const shadowSheetDark: Shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -8 },
  shadowOpacity: 0.4,
  shadowRadius: 16,
  elevation: 12,
};

export const shadowFloatingDark: Shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.45,
  shadowRadius: 12,
  elevation: 10,
};

// ─── Grouped per mode ───────────────────────────────────────────────────────
export const shadowsLight = {
  none: shadowNone,
  card: shadowCardLight,
  sheet: shadowSheetLight,
  floating: shadowFloatingLight,
} as const;

export const shadowsDark = {
  none: shadowNone,
  card: shadowCardDark,
  sheet: shadowSheetDark,
  floating: shadowFloatingDark,
} as const;

export type ShadowToken = keyof typeof shadowsLight;
