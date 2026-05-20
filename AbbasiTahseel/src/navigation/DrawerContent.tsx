/**
 * DrawerContent — custom right-side drawer body
 *
 * Layout (from top to bottom):
 *   Header        : logo + operator name + branch number
 *   Divider
 *   Menu items    : Profile, ServerSettings, Settings, About
 *   Divider
 *   Footer        : Logout (with confirmation), app version
 *
 * Why "custom" content instead of the default DrawerItemList:
 *   - We need a branded header with the logo and dynamic operator info.
 *   - The logout button needs a confirmation alert.
 *   - The grouping (menu / logout) needs an explicit divider.
 *
 * Logout flow:
 *   1) Alert dialog with i18n keys.
 *   2) On confirm → useAuthStore.logout() → RootNavigator re-keys to
 *      auth-login because isAuthenticated flips to false.
 */

import { DrawerContentScrollView } from '@react-navigation/drawer';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { getBranchNumber } from '@/services/storage/prefs';
import { useAuthStore } from '@/stores/authStore';
import { usePrinterStore } from '@/stores/printerStore';

import type { MainStackParamList } from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../assets/logo/abbasi_logo.png');

const APP_VERSION = '1.0.0';

interface DrawerNav {
  dispatch: (action: ReturnType<typeof CommonActions.navigate>) => void;
}

interface MenuItemDef {
  key: keyof MainStackParamList;
  icon: string;
  labelKey: string;
}

const MENU_ITEMS: readonly MenuItemDef[] = [
  { key: 'Profile', icon: 'user', labelKey: 'navigation.drawer.profile' },
  {
    key: 'ServerSettings',
    icon: 'server',
    labelKey: 'navigation.drawer.serverSettings',
  },
  {
    key: 'PrinterSettings',
    icon: 'printer',
    labelKey: 'navigation.drawer.printerSettings',
  },
  {
    key: 'CompanyInfo',
    icon: 'briefcase',
    labelKey: 'navigation.drawer.companyInfo',
  },
  { key: 'Settings', icon: 'settings', labelKey: 'navigation.drawer.settings' },
  { key: 'About', icon: 'info', labelKey: 'navigation.drawer.about' },
];

export function DrawerContent(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<DrawerNav>();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const printerConnected = usePrinterStore((s) => s.isConnected);

  const branchNumber = getBranchNumber();
  const displayName = user?.name ?? user?.username ?? '';

  const handleNavigate = (route: keyof MainStackParamList): void => {
    navigation.dispatch(CommonActions.navigate({ name: route }));
  };

  const handleLogout = (): void => {
    Alert.alert(
      t('navigation.drawer.logout'),
      t('navigation.drawer.logoutConfirm'),
      [
        {
          text: t('navigation.drawer.logoutNo'),
          style: 'cancel',
        },
        {
          text: t('navigation.drawer.logoutYes'),
          style: 'destructive',
          onPress: () => {
            void logout();
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <DrawerContentScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {/* Branded header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.brandSecondary },
        ]}
      >
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text
          style={[styles.headerName, { color: colors.white }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        <Text
          style={[styles.headerBranch, { color: colors.brandPrimarySoft }]}
          numberOfLines={1}
        >
          {t('home.branch', { branch: branchNumber })}
        </Text>
      </View>

      <View
        style={[styles.divider, { backgroundColor: colors.border }]}
      />

      {/* Menu items */}
      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => {
          const showStatusDot = item.key === 'PrinterSettings';
          const dotColor = printerConnected ? colors.success : colors.danger;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => handleNavigate(item.key)}
              android_ripple={{ color: colors.surfaceElevated }}
              style={styles.menuItem}
            >
              <Feather
                name={item.icon}
                size={20}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.menuLabel, { color: colors.textPrimary }]}
              >
                {t(item.labelKey)}
              </Text>
              {showStatusDot ? (
                <View
                  style={[styles.statusDot, { backgroundColor: dotColor }]}
                  accessibilityLabel={
                    printerConnected
                      ? t('printer.settings.currentPrinter')
                      : t('printer.settings.noPrinterConnected')
                  }
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View
        style={[styles.divider, { backgroundColor: colors.border }]}
      />

      {/* Logout */}
      <Pressable
        accessibilityRole="button"
        onPress={handleLogout}
        android_ripple={{ color: colors.dangerSoft }}
        style={styles.menuItem}
      >
        <Feather name="log-out" size={20} color={colors.danger} />
        <Text style={[styles.menuLabel, { color: colors.danger }]}>
          {t('navigation.drawer.logout')}
        </Text>
      </Pressable>

      {/* Footer */}
      <Text style={[styles.version, { color: colors.textTertiary }]}>
        {t('navigation.drawer.version', { version: APP_VERSION })}
      </Text>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 16,
    paddingTop: 24,
  },
  headerBranch: {
    fontSize: 12,
    marginTop: 4,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  logo: {
    height: 56,
    marginBottom: 8,
    width: 56,
  },
  menu: {
    paddingVertical: 4,
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    marginStart: 'auto',
    width: 10,
  },
  version: {
    fontSize: 12,
    marginTop: 16,
    paddingHorizontal: 20,
    textAlign: 'left',
  },
});
