/**
 * PeriodPicker — bottom sheet for choosing a date range (sdate/edate).
 *
 * Used by ALL report screens. Presets:
 *   • اليوم
 *   • أمس
 *   • هذا الأسبوع
 *   • هذا الشهر
 *   • آخر 30 يوماً
 *   • مخصص (TODO: opens dual date pickers — Wave 6-Β)
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

import { PickerSheet } from './PickerSheet';

export type PeriodPresetKey =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'last30Days'
  | 'custom';

export interface PeriodValue {
  preset: PeriodPresetKey;
  /** Optional explicit ISO dates (only set when preset='custom'). */
  startDate?: string;
  endDate?: string;
}

export interface PeriodPickerProps {
  visible: boolean;
  onClose(): void;
  onSelect(value: PeriodValue): void;
  /** Optional preselected preset to highlight. */
  selectedPreset?: PeriodPresetKey;
}

const PRESETS: PeriodPresetKey[] = [
  'today',
  'yesterday',
  'thisWeek',
  'thisMonth',
  'last30Days',
  'custom',
];

const PRESET_ICON: Record<PeriodPresetKey, string> = {
  today: 'sun',
  yesterday: 'sunset',
  thisWeek: 'calendar',
  thisMonth: 'calendar',
  last30Days: 'clock',
  custom: 'edit-3',
};

export function PeriodPicker(props: PeriodPickerProps): React.JSX.Element {
  const { visible, onClose, onSelect, selectedPreset } = props;
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <PickerSheet
      visible={visible}
      onClose={onClose}
      title={t('pickers.period.title')}
      heightPercent={60}
    >
      <View style={styles.list}>
        {PRESETS.map((p) => {
          const isSelected = p === selectedPreset;
          return (
            <Pressable
              key={p}
              onPress={() => onSelect({ preset: p })}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: isSelected
                    ? colors.accentSoft ?? colors.surface
                    : pressed
                    ? colors.surfaceElevated ?? colors.surface
                    : colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isSelected
                      ? colors.accent
                      : colors.surfaceElevated ?? colors.surface,
                  },
                ]}
              >
                <Feather
                  name={PRESET_ICON[p]}
                  size={16}
                  color={isSelected ? colors.textOnAccent : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isSelected ? colors.accent : colors.textPrimary,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {t(`pickers.period.presets.${p}`)}
              </Text>
              {isSelected ? (
                <Feather name="check" size={18} color={colors.accent} />
              ) : (
                <Feather
                  name="chevron-left"
                  size={16}
                  color={colors.textTertiary}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </PickerSheet>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  label: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
  },
  list: {
    paddingBottom: spacing[6],
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
});
