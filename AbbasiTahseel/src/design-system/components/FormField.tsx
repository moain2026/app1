/**
 * FormField — unified form input wrapper.
 *
 * A thin wrapper over TextInput that gives us:
 *   • Right-aligned label above the input.
 *   • Helper text or error text underneath.
 *   • Optional leading/trailing affordance (icon button — e.g. a picker
 *     opener "↓" or a unit suffix "ك.و.س").
 *   • Disabled state (greyed out + non-editable).
 *
 * For pickers (account/place/currency), set `readOnly` + provide an
 * `onPress` that opens a bottom-sheet — the input behaves like a button
 * but looks identical to a real text field.
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface FormFieldProps {
  label: string;
  value: string;
  onChangeText?: (next: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Render as a press-to-open picker (no keyboard, no editing). */
  readOnly?: boolean;
  onPress?: () => void;
  /** Leading Feather icon name (visual hint, not interactive). */
  leadingIcon?: string;
  /** Trailing Feather icon — interactive if onTrailingPress provided. */
  trailingIcon?: string;
  onTrailingPress?: () => void;
  /** Suffix text (e.g. "ك.و.س"). */
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function FormField(props: FormFieldProps): React.JSX.Element {
  const {
    label,
    value,
    onChangeText,
    placeholder,
    helperText,
    error,
    required,
    disabled,
    readOnly,
    onPress,
    leadingIcon,
    trailingIcon,
    onTrailingPress,
    suffix,
    keyboardType,
    secureTextEntry,
    maxLength,
    multiline,
    numberOfLines,
    style,
    textStyle,
  } = props;
  const { colors } = useTheme();

  const showError = !!error;
  const borderColor = showError
    ? colors.danger ?? '#C41E24'
    : colors.border;

  const inputProps: TextInputProps = {
    value,
    onChangeText,
    placeholder,
    placeholderTextColor: colors.textTertiary,
    editable: !disabled && !readOnly,
    keyboardType,
    secureTextEntry,
    maxLength,
    multiline,
    numberOfLines,
    textAlign: 'right',
    style: [
      styles.input,
      multiline && { height: 22 * (numberOfLines ?? 3), textAlignVertical: 'top' },
      { color: disabled ? colors.textTertiary : colors.textPrimary },
      textStyle,
    ],
  };

  const fieldBody = (
    <View
      style={[
        styles.fieldRow,
        {
          backgroundColor: disabled
            ? colors.surfaceMuted
            : colors.surface,
          borderColor,
        },
      ]}
    >
      {leadingIcon ? (
        <Feather name={leadingIcon} size={16} color={colors.textTertiary} />
      ) : null}
      <TextInput {...inputProps} />
      {suffix ? (
        <Text style={[styles.suffix, { color: colors.textTertiary }]}>
          {suffix}
        </Text>
      ) : null}
      {trailingIcon ? (
        onTrailingPress ? (
          <Pressable
            onPress={onTrailingPress}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Feather
              name={trailingIcon}
              size={16}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : (
          <Feather
            name={trailingIcon}
            size={16}
            color={colors.textTertiary}
          />
        )
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
          {required ? (
            <Text style={{ color: colors.danger ?? '#C41E24' }}> *</Text>
          ) : null}
        </Text>
      </View>
      {readOnly && onPress ? (
        <Pressable onPress={disabled ? undefined : onPress}>
          {fieldBody}
        </Pressable>
      ) : (
        fieldBody
      )}
      {error || helperText ? (
        <Text
          style={[
            styles.helper,
            { color: showError ? colors.danger ?? '#C41E24' : colors.textTertiary },
          ]}
        >
          {error ?? helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[3],
  },
  fieldRow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 48,
    paddingHorizontal: spacing[3],
  },
  helper: {
    fontSize: 12,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  labelRow: {
    marginBottom: spacing[1],
  },
  suffix: {
    fontSize: 13,
    fontWeight: '600',
  },
});
