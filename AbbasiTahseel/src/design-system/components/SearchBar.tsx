/**
 * SearchBar — debounced text input for list filtering.
 *
 * Renders a TextInput with a search icon + clear ✕. Caller is responsible
 * for debouncing the value (use `useDebouncedValue` hook elsewhere). This
 * component only owns the visual layer.
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface SearchBarProps {
  value: string;
  onChangeText(next: string): void;
  placeholder?: string;
  /** Optional onSubmit (Enter / search button on keyboard). */
  onSubmit?(): void;
  autoFocus?: boolean;
}

export function SearchBar(props: SearchBarProps): React.JSX.Element {
  const {
    value,
    onChangeText,
    placeholder = 'بحث...',
    onSubmit,
    autoFocus,
  } = props;
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
        },
      ]}
    >
      <Feather name="search" size={16} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary }]}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="مسح"
        >
          <Feather name="x-circle" size={16} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing[2],
    height: 42,
    paddingHorizontal: spacing[3],
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    textAlign: 'right',
  },
});
