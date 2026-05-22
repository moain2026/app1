/**
 * PermissionsScreen — Android runtime permission inventory.
 *
 * Lists every permission the app uses, its current grant state, and a
 * direct CTA to open the system settings page if denied. Lets the user
 * inspect at-a-glance why a feature isn't working (e.g. Bluetooth
 * disabled blocks printer pairing).
 *
 * Wave 6-Α — UI skeleton (mock grant states + no system bridge yet).
 *
 * TODO Wave 6-Β:
 *   • Replace mock state with PermissionsAndroid.check() / Linking.openSettings().
 *   • Subscribe to AppState foreground events to refresh after the user
 *     returns from system settings.
 *   • Pull the actual SDK level via DeviceInfo to surface only relevant items.
 *   • Add a "request all" CTA that batches request() calls.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import {
  Card,
  MockBanner,
  SecondaryButton,
  SectionHeader,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

type PermissionStatus = 'granted' | 'denied' | 'blocked';

interface PermissionEntry {
  key: string;
  icon: string;
  initial: PermissionStatus;
}

const ENTRIES: PermissionEntry[] = [
  { key: 'camera',    icon: 'camera',    initial: 'granted' },
  { key: 'bluetooth', icon: 'bluetooth', initial: 'granted' },
  { key: 'location',  icon: 'map-pin',   initial: 'denied' },
  { key: 'storage',   icon: 'hard-drive', initial: 'granted' },
  { key: 'phone',     icon: 'phone',     initial: 'blocked' },
];

export function PermissionsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Mock state — Wave 6-Β will replace with real PermissionsAndroid.check().
  const [statuses, setStatuses] = useState<Record<string, PermissionStatus>>(
    () => Object.fromEntries(ENTRIES.map((e) => [e.key, e.initial])),
  );

  const requestPermission = (key: string): void => {
    // TODO Wave 6-Β: call PermissionsAndroid.request(...) and update state.
    setStatuses((prev) => ({ ...prev, [key]: 'granted' }));
  };

  const openSystemSettings = (): void => {
    // TODO Wave 6-Β: Linking.openSettings()
  };

  const statusColor = (s: PermissionStatus): string =>
    s === 'granted'
      ? colors.success
      : s === 'denied'
      ? colors.warning
      : colors.danger;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('settings.permissions.title')} showBack />
      <MockBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('settings.permissions.subtitle')}
        </Text>

        <SectionHeader title={t('settings.permissions.runtimeSection')} />

        <Card variant="outlined" padding={0} style={styles.listCard}>
          {ENTRIES.map((entry, i) => {
            const status = statuses[entry.key] ?? entry.initial;
            return (
              <View
                key={entry.key}
                style={[
                  styles.row,
                  i < ENTRIES.length - 1 && {
                    borderBottomColor: colors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.rowHead}>
                  <Feather
                    name={entry.icon}
                    size={20}
                    color={colors.textSecondary}
                  />
                  <View style={styles.rowBody}>
                    <Text
                      style={[styles.rowTitle, { color: colors.textPrimary }]}
                    >
                      {t(`settings.permissions.${entry.key}.title`)}
                    </Text>
                    <Text
                      style={[
                        styles.rowDesc,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {t(`settings.permissions.${entry.key}.desc`)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusColor(status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {t(`settings.permissions.status.${status}`)}
                    </Text>
                  </View>
                </View>

                {status !== 'granted' ? (
                  <View style={styles.actionRow}>
                    <SecondaryButton
                      title={t(
                        status === 'blocked'
                          ? 'settings.permissions.openSettings'
                          : 'settings.permissions.request',
                      )}
                      icon={status === 'blocked' ? 'external-link' : 'unlock'}
                      variant={status === 'blocked' ? 'outlined' : 'outlined'}
                      onPress={() =>
                        status === 'blocked'
                          ? openSystemSettings()
                          : requestPermission(entry.key)
                      }
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>

        <Card variant="outlined" style={styles.helpCard}>
          <View style={styles.helpHead}>
            <Feather name="help-circle" size={16} color={colors.brandSecondary} />
            <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>
              {t('settings.permissions.helpTitle')}
            </Text>
          </View>
          <Text style={[styles.helpBody, { color: colors.textSecondary }]}>
            {t('settings.permissions.helpBody')}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing[2],
  },
  flex: { flex: 1 },
  helpBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'right',
  },
  helpCard: {
    marginTop: spacing[3],
  },
  helpHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  listCard: {
    marginBottom: spacing[2],
  },
  row: {
    padding: spacing[3],
  },
  rowBody: {
    flex: 1,
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  rowHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  scroll: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  statusPill: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: spacing[3],
    textAlign: 'right',
  },
});
