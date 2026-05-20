/**
 * PrimaryButton — accent-red CTA used across all auth screens
 *
 * - Background: theme.colors.accent (brand red)
 * - Text     : theme.colors.textOnAccent (white)
 * - States   : pressed (darker red via colors.accentPressed),
 *              loading (replaces label with ActivityIndicator),
 *              disabled (lower opacity, non-interactive)
 *
 * Stays a pure presentational component — no navigation, no side effects.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/design-system/theme';

export interface PrimaryButtonProps {
  title: string;
  onPress(): void;
  loading?: boolean;
  disabled?: boolean;
  /** Accessibility hint (optional). */
  accessibilityHint?: string;
}

export function PrimaryButton(props: PrimaryButtonProps): React.JSX.Element {
  const { title, onPress, loading = false, disabled = false } = props;
  const { colors } = useTheme();

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={props.accessibilityHint}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: pressed ? colors.accentPressed : colors.accent,
          opacity: isDisabled ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={[styles.label, { color: colors.textOnAccent }]}>
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    minHeight: 50,
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
