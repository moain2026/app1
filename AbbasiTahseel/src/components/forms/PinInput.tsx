/**
 * PinInput — 4-digit PIN entry with auto-focus chaining
 *
 * Renders 4 independent single-character inputs side by side. Typing a
 * digit advances focus to the next box; pressing backspace clears the
 * current digit (or, if already empty, moves focus backward). The full
 * PIN value is reported via `onChange(value: string)` on every change.
 *
 * Layout note:
 *   The visual order is right-to-left to match the rest of the RTL UI —
 *   index 0 is the rightmost box, index 3 is the leftmost.
 */

import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

import { useTheme } from '@/design-system/theme';

const PIN_LENGTH = 4;

export interface PinInputProps {
  /** Current PIN value, length 0–4. */
  value: string;
  /** Called with the updated value (length 0–4). */
  onChange(value: string): void;
  /** When true, paints the boxes with the danger color. */
  error?: boolean;
  /** When true, focuses the first box on mount. Default: true. */
  autoFocus?: boolean;
}

export function PinInput(props: PinInputProps): React.JSX.Element {
  const { value, onChange, error = false, autoFocus = true } = props;
  const { colors } = useTheme();

  const refs = useRef<Array<TextInput | null>>([null, null, null, null]);

  const handleChange = useCallback(
    (idx: number, raw: string) => {
      // Keep only digits, take the LAST char typed (in case of paste).
      const digits = raw.replace(/\D/g, '');
      const next = digits.length === 0 ? '' : (digits[digits.length - 1] ?? '');

      const arr = value.padEnd(PIN_LENGTH, ' ').split('');
      arr[idx] = next.length === 0 ? ' ' : next;
      const compact = arr.join('').replace(/\s+$/, '').replace(/\s/g, '');

      onChange(compact);

      // Advance focus if a digit was entered.
      if (next.length === 1 && idx < PIN_LENGTH - 1) {
        refs.current[idx + 1]?.focus();
      }
    },
    [onChange, value],
  );

  const handleKeyPress = useCallback(
    (idx: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key !== 'Backspace') {
        return;
      }
      const arr = value.padEnd(PIN_LENGTH, ' ').split('');
      const current = arr[idx];
      if (current === undefined || current === ' ') {
        // Move focus back.
        if (idx > 0) {
          refs.current[idx - 1]?.focus();
          arr[idx - 1] = ' ';
          const compact = arr.join('').replace(/\s+$/, '').replace(/\s/g, '');
          onChange(compact);
        }
      } else {
        arr[idx] = ' ';
        const compact = arr.join('').replace(/\s+$/, '').replace(/\s/g, '');
        onChange(compact);
      }
    },
    [onChange, value],
  );

  const setRef = useCallback(
    (idx: number) => (instance: TextInput | null) => {
      refs.current[idx] = instance;
    },
    [],
  );

  const borderColor = error ? colors.danger : colors.border;

  // Build 4 boxes; visual order is RTL so we render with flexDirection: row-reverse.
  return (
    <View style={styles.row}>
      {[0, 1, 2, 3].map((idx) => (
        <TextInput
          key={idx}
          ref={setRef(idx)}
          value={value[idx] ?? ''}
          onChangeText={(t) => handleChange(idx, t)}
          onKeyPress={(e) => handleKeyPress(idx, e)}
          keyboardType="number-pad"
          maxLength={1}
          autoFocus={autoFocus && idx === 0}
          textContentType="oneTimeCode"
          secureTextEntry
          style={[
            styles.box,
            {
              backgroundColor: colors.surface,
              borderColor,
              color: colors.textPrimary,
            },
          ]}
          textAlign="center"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 24,
    fontWeight: '700',
    height: 60,
    marginHorizontal: 6,
    width: 56,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    marginVertical: 12,
  },
});
