/**
 * Card — base container with surface background + radius + shadow.
 *
 * Variants:
 *   • default  — surface bg, subtle elevation, rounded corners.
 *   • outlined — surface bg, 1px border, no shadow (used for nested cards).
 *   • flat     — surface bg, no border, no shadow (used inside scroll
 *                surfaces where the parent already has elevation).
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export type CardVariant = 'default' | 'outlined' | 'flat';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  /** Optional padding override. */
  padding?: number;
  /** If provided, the card becomes pressable. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card(props: CardProps): React.JSX.Element {
  const { children, variant = 'default', padding = spacing[4], onPress, style } = props;
  const { colors } = useTheme();

  const baseStyle: ViewStyle = {
    backgroundColor: colors.surface,
    padding,
  };

  const variantStyle: ViewStyle =
    variant === 'outlined'
      ? { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }
      : variant === 'flat'
      ? {}
      : styles.elevated;

  const content = (
    <View style={[styles.base, baseStyle, variantStyle, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
  },
  elevated: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
});
