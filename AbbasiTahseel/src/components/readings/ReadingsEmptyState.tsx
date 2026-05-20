/**
 * ReadingsEmptyState — what FlashList renders when there are zero rows.
 *
 * Two flavours:
 *   • "No data yet"      — fresh install / never synced.
 *   • "No matches"       — current filters exclude every row in the DB.
 *
 * In Dev Bypass mode we hide the sync button (because the seeder runs
 * automatically on bypass login — there's no manual sync to trigger).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { PrimaryButton } from '@/components/forms';
import { useTheme } from '@/design-system/theme';
import { useAuthStore } from '@/stores/authStore';

export interface ReadingsEmptyStateProps {
  /** True if there are zero rows AND no active filters. */
  isPristine: boolean;
  /** Tap handler for the sync button. */
  onSync(): void;
}

export function ReadingsEmptyState({
  isPristine,
  onSync,
}: ReadingsEmptyStateProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isDevBypass = useAuthStore((s) => s.isDevBypass);

  return (
    <View style={styles.wrap}>
      <Feather name="zap" size={56} color={colors.textTertiary} />
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {t('readings.list.empty.title')}
      </Text>
      {isPristine ? (
        <Text style={[styles.body, { color: colors.textTertiary }]}>
          {t('readings.list.empty.subtitle')}
        </Text>
      ) : null}
      {/* Hide the sync CTA in dev mode — the seeder is auto-populated and
          tapping "sync now" would hit the real server which we don't have. */}
      {isPristine && !isDevBypass ? (
        <View style={styles.action}>
          <PrimaryButton title={t('readings.list.empty.action')} onPress={onSync} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: 16,
    minWidth: 200,
  },
  body: {
    fontSize: 13,
    marginTop: 8,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  wrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 280,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
});
