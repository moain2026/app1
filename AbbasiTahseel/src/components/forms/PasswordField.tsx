/**
 * PasswordField — TextField + visibility toggle
 *
 * Composes the bare TextField with `secureTextEntry` and a small "show /
 * hide" button rendered to the LEFT of the input (because we are in
 * an RTL layout — visually "trailing"). Pressing the button flips the
 * masking on/off; the value itself never leaves the input.
 *
 * No password strength meter or paste prevention — those are UX choices
 * that belong in a higher-level screen.
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { useTheme } from '@/design-system/theme';

export interface PasswordFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string;
  error?: string;
  hint?: string;
  /** Localized labels for the visibility toggle (caller supplies via i18n). */
  showLabel: string;
  hideLabel: string;
}

export function PasswordField(props: PasswordFieldProps): React.JSX.Element {
  const {
    label,
    error,
    hint,
    showLabel,
    hideLabel,
    editable = true,
    ...inputProps
  } = props;
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const borderColor =
    error !== undefined && error.length > 0 ? colors.danger : colors.border;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderColor,
          },
        ]}
      >
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.toggle}
          accessibilityRole="button"
          accessibilityLabel={visible ? hideLabel : showLabel}
        >
          <Text style={[styles.toggleText, { color: colors.brandPrimary }]}>
            {visible ? hideLabel : showLabel}
          </Text>
        </Pressable>
        <TextInput
          {...inputProps}
          editable={editable}
          secureTextEntry={!visible}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            { color: editable ? colors.textPrimary : colors.textDisabled },
          ]}
          textAlign="right"
        />
      </View>
      {error !== undefined && error.length > 0 ? (
        <Text style={[styles.helper, { color: colors.danger }]}>{error}</Text>
      ) : hint !== undefined && hint.length > 0 ? (
        <Text style={[styles.helper, { color: colors.textTertiary }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  helper: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    writingDirection: 'rtl',
  },
  inputRow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'right',
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  wrapper: {
    marginBottom: 14,
  },
});
