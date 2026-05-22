/**
 * Chip — small filter/category pill (used in lists for quick filters).
 *
 * Two visual states:
 *   • selected   — accent background + white text.
 *   • unselected — surface background + secondary text.
 *
 * Used in: BondsScreen filter (الكل / قبض / صرف), ReadingsScreen filter,
 *          Reports period picker presets.
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress(): void;
  /** Optional count badge (e.g. "السندات (12)"). */
  count?: number;
}

export function Chip(props: ChipProps): React.JSX.Element {
  const { label, selected, onPress, count } = props;
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? colors.accent
            : colors.surfaceMuted,
          borderColor: selected ? colors.accent : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? colors.textOnAccent : colors.textSecondary },
        ]}
      >
        {label}
        {count != null ? `  (${count})` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
