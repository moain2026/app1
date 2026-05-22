/**
 * SecondaryButton — outlined / ghost button (less prominent than PrimaryButton).
 *
 * Used for:
 *   • Cancel actions next to a primary CTA.
 *   • Secondary toolbar items (e.g. "تصدير", "طباعة" if not the primary).
 *   • Negative/destructive variant for delete confirmations.
 *
 * Variants:
 *   • 'outlined' — border + accent text (default).
 *   • 'ghost'    — no border, transparent bg, accent text.
 *   • 'danger'   — red border + red text (delete).
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export type SecondaryButtonVariant = 'outlined' | 'ghost' | 'danger';

export interface SecondaryButtonProps {
  title: string;
  onPress(): void;
  variant?: SecondaryButtonVariant;
  /** Optional Feather icon shown before the title. */
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

export function SecondaryButton(
  props: SecondaryButtonProps,
): React.JSX.Element {
  const {
    title,
    onPress,
    variant = 'outlined',
    icon,
    loading = false,
    disabled = false,
    accessibilityHint,
  } = props;
  const { colors } = useTheme();

  const isDisabled = disabled || loading;

  const palette =
    variant === 'danger'
      ? {
          fg: colors.danger ?? '#C41E24',
          border: colors.danger ?? '#C41E24',
          bg: 'transparent',
        }
      : variant === 'ghost'
      ? {
          fg: colors.accent,
          border: 'transparent',
          bg: 'transparent',
        }
      : {
          fg: colors.accent,
          border: colors.accent,
          bg: 'transparent',
        };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={16} color={palette.fg} /> : null}
            <Text style={[styles.title, { color: palette.fg }]}>{title}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
});
