/**
 * ReadingsScreen — Wave 4 placeholder.
 *
 * Mounted as the 'Readings' bottom tab. The full implementation
 * (subscriber list, meter entry, posting flow) lands in Wave 4.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/design-system/theme';

export function ReadingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('navigation.tabs.readings')} showMenu />
      <View style={styles.center}>
        <Feather name="zap" size={64} color={colors.textTertiary} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {t('comingSoon.readings')}
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
