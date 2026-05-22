/**
 * FAB — floating action button (Material-style, RTL aware).
 *
 * Positioned at bottom-start (which is bottom-right under RTL). Used by
 * BondsScreen ("سند جديد") and any list screen needing a primary create
 * action.
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface FABProps {
  /** Feather icon name. Default 'plus'. */
  icon?: string;
  /** Optional label shown next to the icon (extended FAB). */
  label?: string;
  onPress(): void;
  accessibilityLabel?: string;
  /** Hide the FAB temporarily (e.g. when keyboard is open). */
  hidden?: boolean;
}

export function FAB(props: FABProps): React.JSX.Element | null {
  const { icon = 'plus', label, onPress, accessibilityLabel, hidden } = props;
  const { colors } = useTheme();

  if (hidden) return null;

  const isExtended = !!label;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? 'إضافة'}
        style={({ pressed }) => [
          styles.fab,
          isExtended && styles.extended,
          {
            backgroundColor: pressed ? colors.accentPressed : colors.accent,
            shadowColor: '#000',
          },
        ]}
      >
        <Feather name={icon} size={22} color={colors.textOnAccent} />
        {label ? (
          <Text style={[styles.label, { color: colors.textOnAccent }]}>
            {label}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  extended: {
    height: 48,
    paddingHorizontal: spacing[4],
    width: undefined,
  },
  fab: {
    alignItems: 'center',
    borderRadius: 999,
    elevation: 6,
    flexDirection: 'row',
    gap: spacing[2],
    height: 56,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    width: 56,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  wrap: {
    bottom: spacing[5],
    end: spacing[5], // RTL-aware (becomes right on LTR, left on RTL)
    position: 'absolute',
  },
});
