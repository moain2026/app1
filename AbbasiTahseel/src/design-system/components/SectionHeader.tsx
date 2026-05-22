/**
 * SectionHeader — visual divider for grouping content inside a screen.
 *
 * Example:
 *   <SectionHeader title="بيانات السند" icon="file-text" />
 *   <FormField .../>
 *   <FormField .../>
 *   <SectionHeader title="المبلغ" icon="dollar-sign" />
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface SectionHeaderProps {
  title: string;
  /** Optional Feather icon name. */
  icon?: string;
  /** Optional trailing element (e.g. a "show all" link). */
  trailing?: React.ReactNode;
}

export function SectionHeader(props: SectionHeaderProps): React.JSX.Element {
  const { title, icon, trailing } = props;
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon ? (
          <Feather name={icon} size={14} color={colors.textSecondary} />
        ) : null}
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          {title}
        </Text>
      </View>
      {trailing ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
    marginTop: spacing[5],
    paddingHorizontal: spacing[1],
  },
  left: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
