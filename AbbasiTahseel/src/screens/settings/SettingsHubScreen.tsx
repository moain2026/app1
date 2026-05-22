/**
 * SettingsHubScreen — Wave 6-Α replacement for the old SettingsScreen stub.
 *
 * Acts as the entry point of the Settings drawer. Renders a vertical list
 * of grouped settings entries, each navigating to its dedicated screen.
 *
 * Sections:
 *   • الشركة      → CompanyInfo
 *   • الطابعة     → PrinterSettings
 *   • الاتصال     → ServerSettings (a.k.a. Network)
 *   • الصلاحيات   → Permissions
 *   • عن التطبيق  → About
 *
 * Wave 6-Α — UI skeleton.
 *
 * TODO Wave 6-Β:
 *   • Add 'الحساب' section (change password / change PIN / logout).
 *   • Add 'المظهر' section (theme + font size).
 *   • Add 'اللغة' section.
 *   • Wire icon badges showing un-configured sections.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { Card, MockBanner, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import type { MainStackParamList } from '@/navigation/types';

type SettingsRoute = keyof Pick<
  MainStackParamList,
  | 'CompanyInfo'
  | 'PrinterSettings'
  | 'ServerSettings'
  | 'Permissions'
  | 'About'
>;

interface SettingsEntry {
  route: SettingsRoute;
  icon: string;
  iconColor: string;
}

const ENTRIES: SettingsEntry[] = [
  { route: 'CompanyInfo',     icon: 'briefcase', iconColor: '#0D47A1' },
  { route: 'PrinterSettings', icon: 'printer',   iconColor: '#4A148C' },
  { route: 'ServerSettings',  icon: 'wifi',      iconColor: '#1B5E20' },
  { route: 'Permissions',     icon: 'shield',    iconColor: '#BF360C' },
  { route: 'About',           icon: 'info',      iconColor: '#37474F' },
];

export function SettingsHubScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('settings.hub.title')} showBack />
      <MockBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('settings.hub.subtitle')}
        </Text>

        <SectionHeader title={t('settings.hub.sectionGeneral')} />

        <Card variant="outlined" padding={0} style={styles.listCard}>
          {ENTRIES.map((e, i) => (
            <View
              key={e.route}
              style={[
                styles.itemWrapper,
                i < ENTRIES.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.item,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigation.navigate(e.route)}
              >
                <Feather
                  name="chevron-left"
                  size={18}
                  color={colors.textTertiary}
                />
                <View style={styles.itemBody}>
                  <Text
                    style={[styles.itemTitle, { color: colors.textPrimary }]}
                  >
                    {t(`settings.entries.${e.route}.title`)}
                  </Text>
                  <Text
                    style={[
                      styles.itemSubtitle,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {t(`settings.entries.${e.route}.subtitle`)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: colors.surface, borderColor: e.iconColor },
                  ]}
                >
                  <Feather name={e.icon} size={20} color={e.iconColor} />
                </View>
              </Pressable>
            </View>
          ))}
        </Card>

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>
          {t('settings.hub.version', { version: '0.6.0-alpha' })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  iconBox: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
  },
  itemBody: {
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  itemWrapper: {},
  listCard: {
    marginBottom: spacing[4],
  },
  scroll: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  subtitle: {
    fontSize: 13,
    marginBottom: spacing[3],
    textAlign: 'right',
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
