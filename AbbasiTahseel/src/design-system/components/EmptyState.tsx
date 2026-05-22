/**
 * EmptyState — placeholder shown when a list/screen has nothing to display.
 *
 * Usage:
 *   <EmptyState
 *     icon="inbox"
 *     title="لا توجد سندات"
 *     subtitle="ابدأ بإضافة أول سند من زر +"
 *     action={{ label: 'سند جديد', onPress: () => nav.navigate('BondCreate') }}
 *   />
 *
 * Wave 6-Α — UI skeleton component. Used by ALL list screens.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

import { PrimaryButton } from '@/components/forms/PrimaryButton';

export interface EmptyStateAction {
  label: string;
  onPress(): void;
}

export interface EmptyStateProps {
  /** Feather icon name (e.g. 'inbox', 'file-text', 'search'). */
  icon: string;
  title: string;
  subtitle?: string;
  /** Optional CTA below the subtitle. */
  action?: EmptyStateAction;
}

export function EmptyState(props: EmptyStateProps): React.JSX.Element {
  const { icon, title, subtitle, action } = props;
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.surfaceMuted },
        ]}
      >
        <Feather name={icon} size={48} color={colors.textTertiary} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
      {action ? (
        <View style={styles.action}>
          <PrimaryButton title={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing[5],
    minWidth: 200,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[9],
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 96,
    justifyContent: 'center',
    marginBottom: spacing[5],
    width: 96,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
