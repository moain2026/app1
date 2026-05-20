/**
 * ReportsScreen — Wave 7 placeholder.
 *
 * Mounted as the 'Reports' bottom tab. Daily summaries, by-area filters,
 * and export-to-PDF land in Wave 7.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/design-system/theme';

export function ReportsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('navigation.tabs.reports')} showMenu />
      <View style={styles.center}>
        <Feather name="bar-chart-2" size={64} color={colors.textTertiary} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {t('comingSoon.reports')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  flex: { flex: 1 },
  text: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
