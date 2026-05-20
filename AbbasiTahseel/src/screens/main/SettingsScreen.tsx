/**
 * SettingsScreen — Wave 7 placeholder (general app settings).
 *
 * Distinct from the network-focused ServerSettings screen.
 * Houses theme/language/notification toggles in a later wave.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/design-system/theme';

export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('navigation.drawer.settings')} showBack />
      <View style={styles.center}>
        <Feather name="settings" size={64} color={colors.textTertiary} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {t('comingSoon.settings')}
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
