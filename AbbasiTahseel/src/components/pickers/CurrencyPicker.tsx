/**
 * CurrencyPicker — bottom sheet listing currencies.
 *
 * Wave 6-Β — wired to `observeCurrencies()`. The currencies table is
 * small (3-5 rows in practice), so we render straight through a
 * mapped View instead of FlashList — no scroll perf concern.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Subscription } from 'rxjs';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import type { MockCurrency } from '@/mocks/currencies';
import { observeCurrencies } from '@/services/repository/currenciesRepository';
import { toMockCurrencies } from '@/services/repository/viewModels';

import { PickerSheet } from './PickerSheet';

export interface CurrencyPickerProps {
  visible: boolean;
  onClose(): void;
  onSelect(currency: MockCurrency): void;
}

export function CurrencyPicker(props: CurrencyPickerProps): React.JSX.Element {
  const { visible, onClose, onSelect } = props;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [currencies, setCurrencies] = useState<MockCurrency[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let sub: Subscription | null = null;
    sub = observeCurrencies().subscribe({
      next: (rows) => setCurrencies(toMockCurrencies(rows)),
      error: () => setCurrencies([]),
    });
    return () => {
      if (sub != null) sub.unsubscribe();
    };
  }, [visible]);

  return (
    <PickerSheet
      visible={visible}
      onClose={onClose}
      title={t('pickers.currency.title')}
      subtitle={t('pickers.currency.subtitle', { count: currencies.length })}
      heightPercent={50}
    >
      <View style={styles.list}>
        {currencies.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed
                  ? colors.surfaceElevated ?? colors.surface
                  : colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.symbolBox,
                {
                  backgroundColor: colors.surfaceElevated ?? colors.surface,
                },
              ]}
            >
              <Text style={[styles.symbol, { color: colors.textPrimary }]}>
                {c.symbol}
              </Text>
            </View>
            <View style={styles.body}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {c.name}
              </Text>
              <Text style={[styles.meta, { color: colors.textTertiary }]}>
                {c.isBase
                  ? t('pickers.currency.base')
                  : t('pickers.currency.rate', { rate: c.rate })}
              </Text>
            </View>
            <Feather
              name="chevron-left"
              size={16}
              color={colors.textTertiary}
            />
          </Pressable>
        ))}
      </View>
    </PickerSheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  list: { paddingBottom: spacing[6] },
  meta: { fontSize: 11, marginTop: 2, textAlign: 'right' },
  name: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  symbol: {
    fontSize: 14,
    fontWeight: '800',
  },
  symbolBox: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
