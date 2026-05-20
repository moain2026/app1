/**
 * TextField — labeled, theme-aware text input
 *
 * Used by all auth + form screens. Forces RTL writing direction by default
 * so Arabic placeholders render correctly. Errors are rendered below the
 * input as a single line in the theme's danger color.
 *
 * The component is uncontrolled-friendly but works perfectly with
 * react-hook-form's <Controller>:
 *     <Controller
 *       control={control}
 *       name="username"
 *       render={({ field, fieldState }) => (
 *         <TextField
 *           label={t('auth.login.username')}
 *           value={field.value}
 *           onChangeText={field.onChange}
 *           error={fieldState.error?.message}
 *         />
 *       )}
 *     />
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { useTheme } from '@/design-system/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Label rendered above the input. */
  label: string;
  /** Validation error — rendered below the input when present. */
  error?: string;
  /** Optional hint shown below the input when no error is present. */
  hint?: string;
}

export function TextField(props: TextFieldProps): React.JSX.Element {
  const { label, error, hint, editable = true, ...inputProps } = props;
  const { colors } = useTheme();

  const borderColor =
    error !== undefined && error.length > 0
      ? colors.danger
      : colors.border;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        editable={editable}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor,
            color: editable ? colors.textPrimary : colors.textDisabled,
          },
        ]}
        textAlign="right"
      />
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
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    writingDirection: 'rtl',
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'right',
  },
  wrapper: {
    marginBottom: 14,
  },
});
