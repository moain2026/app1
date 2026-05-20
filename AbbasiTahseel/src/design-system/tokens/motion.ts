/**
 * Motion Tokens — العباسي تحصيل
 *
 * All animations use Reanimated 3 worklets (UI thread).
 * NEVER use the legacy `Animated` API.
 *
 * Easing curves chosen to match Material 3 / Jaib feel:
 *  - emphasizedDecelerate → for entering elements (toast, bottom sheet appears)
 *  - emphasizedAccelerate → for exiting elements (toast dismiss, sheet close)
 *  - standard            → for in-screen transitions (tab switch, focus)
 *
 * Durations are short — feedback under 300ms is perceived as instant.
 */

import { Easing } from 'react-native-reanimated';

// ─── Durations (ms) ──────────────────────────────────────────────────────────
export const duration = {
  instant: 80,
  fast: 150,
  normal: 220,
  slow: 320,
  // Heavy sheet expansion (e.g. opening big bottom sheet on slow devices)
  sheet: 280,
} as const;

// ─── Easings (Material 3 inspired) ──────────────────────────────────────────
export const easing = {
  // Default for most in-place transitions.
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),

  // Element appearing on screen (slide-in, fade-in).
  emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1.0),

  // Element leaving the screen (slide-out, fade-out).
  emphasizedAccelerate: Easing.bezier(0.3, 0.0, 0.8, 0.15),

  // Soft elastic for FAB press feedback.
  springy: Easing.bezier(0.34, 1.56, 0.64, 1),

  // Linear (for progress bars, loaders).
  linear: Easing.linear,
} as const;

// ─── Spring configs (for Reanimated `withSpring`) ───────────────────────────
export const spring = {
  // Default UI spring — used for FAB scale, button press, sheet open.
  default: {
    damping: 18,
    mass: 1,
    stiffness: 180,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },

  // Stiff = snappy, almost no oscillation (use for toggles, switches).
  stiff: {
    damping: 22,
    mass: 0.9,
    stiffness: 260,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },

  // Wobbly = playful (use sparingly — e.g. success animations).
  wobbly: {
    damping: 10,
    mass: 1,
    stiffness: 160,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },
} as const;

// ─── Pre-baked transitions (timing) ─────────────────────────────────────────
export const transitions = {
  fadeIn: { duration: duration.normal, easing: easing.emphasizedDecelerate },
  fadeOut: { duration: duration.fast, easing: easing.emphasizedAccelerate },
  slideIn: { duration: duration.normal, easing: easing.emphasizedDecelerate },
  slideOut: { duration: duration.fast, easing: easing.emphasizedAccelerate },
  sheetOpen: { duration: duration.sheet, easing: easing.emphasizedDecelerate },
  sheetClose: { duration: duration.fast, easing: easing.emphasizedAccelerate },
  tabSwitch: { duration: duration.fast, easing: easing.standard },
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
export type SpringToken = keyof typeof spring;
