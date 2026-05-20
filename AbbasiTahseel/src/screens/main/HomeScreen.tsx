/**
 * HomeScreen — placeholder for Wave 3
 *
 * Renders a basic landing surface confirming the user is signed in and
 * licensed. The real Home (Recent Readings + KPIs + Sync Status) ships
 * with Wave 3 features.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/design-system/theme';
import { useAuthStore } from '@/stores/authStore';

export function HomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('common.appName')}
        </Text>
        {user?.username ? (
          <Text style={[styles.user, { color: colors.textSecondary }]}>
            {user.username}
          </Text>
        ) : null}

        <Pressable
          onPress={() => void logout()}
          style={({ pressed }) => [
            styles.logoutBtn,
            {
              backgroundColor: pressed ? colors.accentPressed : colors.accent,
            },
          ]}
        >
          <Text style={[styles.logoutText, { color: colors.textOnAccent }]}>
            {t('common.back')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  flex: { flex: 1 },
  logoutBtn: {
    borderRadius: 12,
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  user: {
    fontSize: 16,
    marginTop: 12,
  },
});
