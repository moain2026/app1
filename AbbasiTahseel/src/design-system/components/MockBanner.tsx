/**
 * MockBanner — yellow strip displayed at the top of any screen that is
 * currently using mock data (Wave 6-Α UI skeleton).
 *
 * Mount this at the top of every list/detail screen until the wave-6-Β
 * (data wiring) phase replaces mocks with real DB/API calls.
 *
 * Visibility is controlled by a single env flag: when `__DEV__` is true
 * AND the screen passes `enabled`, the banner appears. Production builds
 * (`__DEV__=false`) ALWAYS hide it regardless of the flag.
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface MockBannerProps {
  /** Optional label override (defaults to "بيانات تجريبية"). */
  label?: string;
}

export function MockBanner(props: MockBannerProps): React.JSX.Element | null {
  const { label = 'بيانات تجريبية — Wave 6-Α' } = props;
  const { colors } = useTheme();

  // Hide in production. Hermes inlines this at build time.
  if (!__DEV__) return null;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.warningSoft ?? '#FFF3CD' },
      ]}
      accessibilityRole="text"
    >
      <Feather
        name="alert-triangle"
        size={12}
        color={colors.warning ?? '#856404'}
      />
      <Text style={[styles.text, { color: colors.warning ?? '#856404' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    paddingVertical: spacing[1] + 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
