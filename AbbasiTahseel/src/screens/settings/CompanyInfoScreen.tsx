/**
 * CompanyInfoScreen — بيانات الشركة
 *
 * Wave 5 — form for the single `company_info` row that feeds receipt
 * headers. Stub for the moment (header + placeholder) to keep navigation
 * compiling and the drawer item reachable; the form implementation will
 * land in a follow-up commit (TODO marked below).
 *
 * Reachable from the drawer menu under "بيانات الشركة".
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/design-system/theme';

export function CompanyInfoScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <AppHeader title={t('company.title')} showBack />

      <View style={styles.center}>
        <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
          {t('company.subtitle')}
        </Text>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {/* TODO(wave-5.3): build the react-hook-form + zod form for the
              `company_info` table. Fields: nameAr, nameEn, phone, address,
              footerText, logoUrl. Persist via database.write upsert. */}
          —
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  flex: { flex: 1 },
  hint: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  placeholder: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
