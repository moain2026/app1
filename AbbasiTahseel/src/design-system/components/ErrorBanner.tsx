/**
 * ErrorBanner — dismissible error message shown at the top of a screen.
 *
 * Variants:
 *   • 'error'   — red/danger background
 *   • 'warning' — amber background (e.g. "بيانات قديمة — قم بالمزامنة")
 *   • 'info'    — neutral surface (rare)
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export type ErrorBannerVariant = 'error' | 'warning' | 'info';

export interface ErrorBannerProps {
  message: string;
  variant?: ErrorBannerVariant;
  /** Optional retry action — renders an inline retry button. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Optional dismiss action — renders an "✕" on the left. */
  onDismiss?: () => void;
}

export function ErrorBanner(props: ErrorBannerProps): React.JSX.Element {
  const {
    message,
    variant = 'error',
    onRetry,
    retryLabel = 'إعادة',
    onDismiss,
  } = props;
  const { colors } = useTheme();

  const palette = {
    error: {
      bg: colors.dangerSoft ?? '#FDEAEB',
      fg: colors.danger ?? '#C41E24',
      icon: 'alert-circle',
    },
    warning: {
      bg: colors.warningSoft ?? '#FFF3CD',
      fg: colors.warning ?? '#856404',
      icon: 'alert-triangle',
    },
    info: {
      bg: colors.surfaceMuted,
      fg: colors.textSecondary,
      icon: 'info',
    },
  }[variant];

  return (
    <View
      style={[styles.container, { backgroundColor: palette.bg }]}
      accessibilityRole="alert"
    >
      <Feather name={palette.icon} size={18} color={palette.fg} />
      <Text style={[styles.message, { color: palette.fg }]} numberOfLines={3}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={styles.retryBtn}
          accessibilityRole="button"
        >
          <Text style={[styles.retryLabel, { color: palette.fg }]}>
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          style={styles.dismissBtn}
          accessibilityRole="button"
          accessibilityLabel="إغلاق"
        >
          <Feather name="x" size={16} color={palette.fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  dismissBtn: {
    padding: spacing[1],
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  retryBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  retryLabel: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
