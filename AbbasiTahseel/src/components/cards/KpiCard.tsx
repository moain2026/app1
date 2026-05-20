/**
 * KpiCard — single tile in the Home dashboard 2x2 KPI grid.
 *
 * Half-width tile (the parent ScrollView handles the row/column layout
 * via flexWrap). Renders a Feather icon, a large numeric/string value,
 * and a small label below.
 *
 * The card is memoised because the Home screen feeds it via reactive
 * observables that may emit multiple times per second during a heavy
 * sync run.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: string;
  /** Foreground color for the icon + value. Defaults to theme accent. */
  accentColor?: string;
}

function KpiCardImpl(props: KpiCardProps): React.JSX.Element {
  const { title, value, icon, accentColor } = props;
  const { colors } = useTheme();
  const fg = accentColor ?? colors.accent;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.black,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
        <Feather name={icon} size={20} color={fg} />
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text
        style={[styles.label, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}

export const KpiCard = React.memo(KpiCardImpl);

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    elevation: 1,
    padding: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    marginBottom: 10,
    width: 36,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
  },
});
