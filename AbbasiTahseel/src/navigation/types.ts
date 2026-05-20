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
  ServerSettings: undefined;
};

// ─── Main app bottom tabs (Wave 3) ────────────────────────────────────────
export type MainTabsParamList = {
  Home: undefined;
  Readings: undefined;
  Bonds: undefined;
  Reports: undefined;
};

// ─── Main app drawer (Wave 3 + 5) ─────────────────────────────────────────
// The Drawer mounts MainTabs as its primary route plus the secondary screens
// reachable from the drawer menu.
export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabsParamList>;
  Profile: undefined;
  Settings: undefined;
  About: undefined;
  ServerSettings: undefined;
  /**
   * ReadingDetail — Wave 4. Mounted in the Drawer navigator but NOT exposed
   * in DrawerContent (which uses a fixed MENU_ITEMS list). Reachable only
   * via `navigation.navigate('ReadingDetail', { localUuid })` from a row tap.
   */
  ReadingDetail: { localUuid: string };
  /** Wave 5 — printer settings (paired device list + test print). */
  PrinterSettings: undefined;
  /** Wave 5 — company info form (logo URL, branch, footer text). */
  CompanyInfo: undefined;
  /**
   * Wave 5 — barcode scanner. Reachable from the Readings FAB or from any
   * subscriber-lookup field via `navigation.navigate('Scanner', { returnTo })`.
   * `returnTo` tells the screen which route to bounce back into with the
   * scanned value.
   */
  Scanner: { returnTo?: 'Readings' | 'NewBond' } | undefined;
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
