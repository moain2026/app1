/**
 * ProfileScreen — Wave 7 placeholder.
 *
 * Reachable from the Drawer menu. Eventually shows the operator's profile
 * fields (name, branch, permissions) and lets them change password/PIN.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/design-system/theme';

export function ProfileScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('navigation.drawer.profile')} showBack />
      <View style={styles.center}>
        <Feather name="user" size={64} color={colors.textTertiary} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {t('comingSoon.profile')}
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
