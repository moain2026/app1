/**
 * LoadingSpinner — branded loading indicator.
 *
 * Variants:
 *   • 'inline'  — small spinner used inline (e.g. inside a button — see
 *                 PrimaryButton.loading already handles that natively).
 *   • 'screen'  — full-screen overlay with a centered spinner + optional
 *                 message. Use for first-load / heavy fetches.
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface LoadingSpinnerProps {
  variant?: 'inline' | 'screen';
  message?: string;
}

export function LoadingSpinner(props: LoadingSpinnerProps): React.JSX.Element {
  const { variant = 'screen', message } = props;
  const { colors } = useTheme();

  if (variant === 'inline') {
    return <ActivityIndicator size="small" color={colors.accent} />;
  }

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'جاري التحميل'}
    >
      <ActivityIndicator size="large" color={colors.accent} />
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing[3],
    textAlign: 'center',
  },
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing[6],
  },
});
