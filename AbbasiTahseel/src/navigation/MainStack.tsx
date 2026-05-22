/**
 * MainStack — post-auth Drawer navigator (Wave 3 + 6-Α expansion).
 *
 * Right-side drawer (RTL) that hosts the entire main app surface:
 *
 *   Primary (listed in DrawerContent.MENU_ITEMS):
 *     - Tabs            → MainTabs (Home / Readings / Bonds / Reports)
 *     - Profile         → user profile + actions
 *     - Settings        → settings hub (re-exports SettingsHubScreen)
 *     - About           → app info + license + credits
 *     - ServerSettings  → connection settings (reusable from Auth too)
 *     - PrinterSettings → BT printer pairing + test print
 *     - CompanyInfo     → receipt-header company fields
 *
 *   Secondary (NOT listed; reached via navigation.navigate(...)):
 *     - Scanner               → barcode camera (Wave 5)
 *     - ReadingDetail         → single reading editor (Wave 4)
 *     - Bond*                 → bond list/detail/form/payment-form (Wave 6-Α)
 *     - *Report (7 screens)   → individual report sub-screens (Wave 6-Α)
 *     - ReadingsHistory/Bulk  → reading extras (Wave 6-Α)
 *     - Permissions           → runtime Android permissions (Wave 6-Α)
 *
 * Configuration:
 *   - drawerPosition: 'right'   (visual right under RTL — swipe from edge)
 *   - drawerType:     'front'   (overlay; doesn't push content)
 *   - swipeEnabled:   true      (disabled for full-screen secondaries)
 *   - headerShown:    false     (every screen mounts its own AppHeader)
 *
 * TODO Wave 6-Β:
 *   • Consider converting the secondary stack into a nested NativeStack
 *     for a typed back button and proper screen-transition animations
 *     (drawer "navigate" feels more like "replace" for deep flows).
 */

import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';

import { AboutScreen } from '@/screens/main/AboutScreen';
import { ProfileScreen } from '@/screens/main/ProfileScreen';
import { ReadingDetailScreen } from '@/screens/main/ReadingDetailScreen';
import { ScannerScreen } from '@/screens/main/ScannerScreen';
import { SettingsScreen } from '@/screens/main/SettingsScreen';
import {
  BondDetailScreen,
  BondFormScreen,
  BondPaymentFormScreen,
} from '@/screens/bonds';
import {
  ReadingsBulkScreen,
  ReadingsHistoryScreen,
} from '@/screens/readings';
import {
  BalanceDetailsReportScreen,
  BalanceHeaderReportScreen,
  BondsHeaderReportScreen,
  BoxMoveDetailsReportScreen,
  BoxMoveReportScreen,
  ExpensesReportScreen,
  ReadingHeaderReportScreen,
  ReportsHubScreen,
} from '@/screens/reports';
import { PermissionsScreen } from '@/screens/settings/PermissionsScreen';
import { CompanyInfoScreen } from '@/screens/settings/CompanyInfoScreen';
import { PrinterSettingsScreen } from '@/screens/settings/PrinterSettingsScreen';
import { ServerSettingsScreen } from '@/screens/settings/ServerSettingsScreen';

import { DrawerContent } from './DrawerContent';
import { MainTabs } from './MainTabs';
import type { MainStackParamList } from './types';

const Drawer = createDrawerNavigator<MainStackParamList>();

// Full-screen secondaries disable swipe-to-open so the user can scroll
// horizontal tables / signature pads without accidentally pulling the drawer.
const FULL_SCREEN_OPTIONS = { swipeEnabled: false };

export function MainStack(): React.JSX.Element {
  return (
    <Drawer.Navigator
      initialRouteName="Tabs"
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerType: 'front',
        swipeEnabled: true,
        drawerStyle: {
          width: 280,
        },
      }}
    >
      {/* ─── Primary (drawer menu) ────────────────────────────── */}
      <Drawer.Screen name="Tabs" component={MainTabs} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="About" component={AboutScreen} />
      <Drawer.Screen name="ServerSettings" component={ServerSettingsScreen} />
      <Drawer.Screen name="PrinterSettings" component={PrinterSettingsScreen} />
      <Drawer.Screen name="CompanyInfo" component={CompanyInfoScreen} />

      {/* ─── Wave 5 — barcode scanner ────────────────────────── */}
      <Drawer.Screen
        name="Scanner"
        component={ScannerScreen}
        options={FULL_SCREEN_OPTIONS}
      />

      {/* ─── Wave 4 — reading detail ─────────────────────────── */}
      <Drawer.Screen
        name="ReadingDetail"
        component={ReadingDetailScreen}
        options={FULL_SCREEN_OPTIONS}
      />

      {/* ─── Wave 6-Α — Bonds ────────────────────────────────── */}
      <Drawer.Screen
        name="BondDetail"
        component={BondDetailScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="BondCreate"
        component={BondFormScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="BondEdit"
        component={BondFormScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="BondPaymentCreate"
        component={BondPaymentFormScreen}
        options={FULL_SCREEN_OPTIONS}
      />

      {/* ─── Wave 6-Α — Reports ──────────────────────────────── */}
      <Drawer.Screen
        name="ReportsHub"
        component={ReportsHubScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="BalanceHeaderReport"
        component={BalanceHeaderReportScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="BalanceDetailsReport"
        component={BalanceDetailsReportScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="BondsHeaderReport"
        component={BondsHeaderReportScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="BoxMoveReport"
        component={BoxMoveReportScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="BoxMoveDetailsReport"
        component={BoxMoveDetailsReportScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="ExpensesReport"
        component={ExpensesReportScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="ReadingHeaderReport"
        component={ReadingHeaderReportScreen}
        options={FULL_SCREEN_OPTIONS}
      />

      {/* ─── Wave 6-Α — Readings extras ──────────────────────── */}
      <Drawer.Screen
        name="ReadingsHistory"
        component={ReadingsHistoryScreen}
        options={FULL_SCREEN_OPTIONS}
      />
      <Drawer.Screen
        name="ReadingsBulk"
        component={ReadingsBulkScreen}
        options={FULL_SCREEN_OPTIONS}
      />

      {/* ─── Wave 6-Α — Settings extras ──────────────────────── */}
      <Drawer.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={FULL_SCREEN_OPTIONS}
      />
    </Drawer.Navigator>
  );
}
