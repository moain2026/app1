/**
 * AboutScreen — app information + credits + version + license display.
 *
 * Wave 6-Α — UI skeleton (mock metadata + static text).
 *
 * TODO Wave 6-Β:
 *   • Pull real app version + build number from native module.
 *   • Show actual license key + deviceId from secure storage.
 *   • Link "تواصل معنا" to WhatsApp / phone deep-link.
 *   • Surface a "نسخة محدثة متاحة" badge if remote config newer version.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { Card, MockBanner, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

// Mock metadata — Wave 6-Β replaces with real getters.
const MOCK_APP = {
  version: '0.6.0-alpha',
  build: '60',
  releaseDate: '2026-05-22',
  package: 'com.abbasi.tahseel',
};

const MOCK_LICENSE = {
  deviceId: 'ABT-2098897319',
  licensee: 'شركة العباسي لتوليد الكهرباء',
  branch: 'الفرع رقم 1',
};

const CREDITS = [
  { label: 'React Native', version: '0.74.5' },
  { label: 'WatermelonDB', version: '0.27.1' },
  { label: 'Zustand', version: '4.5.4' },
  { label: 'Axios', version: '1.7.4' },
  { label: 'Feather Icons', version: '4.29.0' },
];

export function AboutScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('about.title')} showBack />
      <MockBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ─── Hero ───────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: colors.brandPrimary },
            ]}
          >
            <Feather name="zap" size={36} color={colors.brandSecondary} />
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>
            {t('common.appName')}
          </Text>
          <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
            {t('about.tagline')}
          </Text>
          <View
            style={[
              styles.versionPill,
              { backgroundColor: colors.brandPrimarySoft },
            ]}
          >
            <Text style={[styles.versionPillText, { color: colors.brandSecondary }]}>
              v{MOCK_APP.version} · build {MOCK_APP.build}
            </Text>
          </View>
        </View>

        {/* ─── License info ───────────────────────────────────── */}
        <SectionHeader title={t('about.licenseSection')} />
        <Card variant="outlined" style={styles.card}>
          <Row label={t('about.licensee')} value={MOCK_LICENSE.licensee} />
          <Divider color={colors.border} />
          <Row label={t('about.branch')} value={MOCK_LICENSE.branch} />
          <Divider color={colors.border} />
          <Row label={t('about.deviceId')} value={MOCK_LICENSE.deviceId} mono />
        </Card>

        {/* ─── App metadata ───────────────────────────────────── */}
        <SectionHeader title={t('about.appSection')} />
        <Card variant="outlined" style={styles.card}>
          <Row label={t('about.releaseDate')} value={MOCK_APP.releaseDate} />
          <Divider color={colors.border} />
          <Row label={t('about.packageName')} value={MOCK_APP.package} mono />
        </Card>

        {/* ─── Credits ────────────────────────────────────────── */}
        <SectionHeader title={t('about.creditsSection')} />
        <Card variant="outlined" style={styles.card}>
          {CREDITS.map((c, i) => (
            <View key={c.label}>
              <Row label={c.label} value={c.version} mono />
              {i < CREDITS.length - 1 ? (
                <Divider color={colors.border} />
              ) : null}
            </View>
          ))}
        </Card>

        {/* ─── Contact ────────────────────────────────────────── */}
        <SectionHeader title={t('about.contactSection')} />
        <Card variant="outlined" style={styles.card}>
          <View
            style={styles.contactRow}
            // TODO Wave 6-Β: pull number from CompanyInfo.
          >
            <Feather name="phone" size={18} color={colors.brandSecondary} />
            <Text
              style={[styles.contactText, { color: colors.accent }]}
              onPress={() => Linking.openURL('tel:+967000000000')}
            >
              {t('about.supportPhone')}
            </Text>
          </View>
        </Card>

        <Text style={[styles.copyrightText, { color: colors.textTertiary }]}>
          {t('about.copyright', { year: new Date().getFullYear() })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row(props: { label: string; value: string; mono?: boolean }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
        {props.label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          {
            color: colors.textPrimary,
            fontFamily: props.mono ? 'monospace' : undefined,
          },
        ]}
      >
        {props.value}
      </Text>
    </View>
  );
}

function Divider(props: { color: string }): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: props.color,
        height: StyleSheet.hairlineWidth,
        marginVertical: spacing[1],
      }}
    />
  );
}

const styles = StyleSheet.create({
  appName: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing[3],
    textAlign: 'center',
  },
  appTagline: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing[2],
  },
  contactRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  contactText: {
    fontSize: 14,
    fontWeight: '700',
  },
  copyrightText: {
    fontSize: 10,
    marginTop: spacing[4],
    textAlign: 'center',
  },
  flex: { flex: 1 },
  hero: {
    alignItems: 'center',
    marginBottom: spacing[5],
    paddingVertical: spacing[4],
  },
  logoCircle: {
    alignItems: 'center',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  rowLabel: {
    fontSize: 12,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  versionPill: {
    borderRadius: 14,
    marginTop: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  versionPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
