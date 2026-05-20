/**
 * Navigation Types — العباسي تحصيل
 *
 * Single source of truth for screen names and route parameters across the
 * entire navigation tree. Stack-specific param lists are composed into a
 * RootStackParamList that drives the global RootNavigator switch.
 *
 * Conventions:
 *   • Each screen takes `undefined` if it has no params.
 *   • Param names use camelCase.
 *   • When a screen needs explicit params, define them inline.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

// ─── Auth flow ────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Splash: undefined;
  LicenseActivation: undefined;
  Login: undefined;
  PinSetup: undefined;
};

// ─── Main app (Wave 3+) ───────────────────────────────────────────────────
export type MainStackParamList = {
  Home: undefined;
};

// ─── Root switch (consumed by RootNavigator) ──────────────────────────────
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

/**
 * Augment React Navigation's global type so that `useNavigation()` and
 * `<Link to=…>` are aware of every route in the app.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
