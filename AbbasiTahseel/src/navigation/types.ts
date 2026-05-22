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
 *
 * Wave 6-Α expansion — adds routes for Bonds (Detail/Create/Edit/Payment),
 * Reports (Hub + 7 sub-reports), Readings (History/Bulk) and Settings
 * (Permissions). All these are mounted on the existing Drawer navigator
 * (MainStack) and reached via `navigation.navigate(...)`; they are NOT
 * listed in the DrawerContent side menu.
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

// ─── Main app drawer (Wave 3 + 5 + 6-Α) ───────────────────────────────────
// The Drawer mounts MainTabs as its primary route plus the secondary screens
// reachable from the drawer menu OR via imperative navigation.
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

  // ─── Wave 6-Α — Bonds (UI skeleton) ─────────────────────────────────────
  /** Read-only bond detail. */
  BondDetail: { localUuid: string };
  /**
   * Create a new bond. `defaultType` lets the caller pre-select
   * receipt/payment when the user comes from a context-specific FAB.
   */
  BondCreate: { defaultType?: 'receipt' | 'payment' } | undefined;
  /** Edit an existing bond (reuses BondFormScreen via route.name check). */
  BondEdit: { localUuid: string };
  /** Add a payment line to an existing bond. */
  BondPaymentCreate: { bondLocalUuid: string };

  // ─── Wave 6-Α — Reports (UI skeleton) ───────────────────────────────────
  /** Hub grid that links to each report sub-screen. */
  ReportsHub: undefined;
  /** Per-account balance snapshot at a date — GetRepBalanceHeader. */
  BalanceHeaderReport: undefined;
  /** Per-account ledger (debit/credit/running) — GetRepBalanceDetailsByDate. */
  BalanceDetailsReport: undefined;
  /** Bonds within a date range — GetRepBondsHeader. */
  BondsHeaderReport: undefined;
  /** Daily cashbox movements — GetRepBoxMove. */
  BoxMoveReport: undefined;
  /** Detailed cashbox movements for one date — GetRepBoxMoveDetails. */
  BoxMoveDetailsReport: { date?: string } | undefined;
  /** Daily expenses — GetRepExpenses. */
  ExpensesReport: undefined;
  /** Reading aggregates per place/group — GetRepReadingHeader. */
  ReadingHeaderReport: undefined;

  // ─── Wave 6-Α — Readings extras (UI skeleton) ───────────────────────────
  /** Historical consumption view for one subscriber. */
  ReadingsHistory: { num: string };
  /** Bulk-entry grid for posting many readings at once. */
  ReadingsBulk: undefined;

  // ─── Wave 6-Α — Settings extras (UI skeleton) ───────────────────────────
  /** Runtime Android permissions inventory. */
  Permissions: undefined;
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
