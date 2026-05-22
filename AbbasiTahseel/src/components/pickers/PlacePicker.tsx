/**
 * PlacePicker — bottom sheet listing areas (مناطق).
 *
 * Wave 6-Α — UI skeleton component (mock data).
 */

import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { MOCK_PLACES, type MockPlace } from '@/mocks/places';

import { PickerSheet } from './PickerSheet';

export interface PlacePickerProps {
  visible: boolean;
  onClose(): void;
  onSelect(place: MockPlace): void;
  /** Allow an "all places" option at the top (default true). */
  allowAll?: boolean;
}

export function PlacePicker(props: PlacePickerProps): React.JSX.Element {
  const { visible, onClose, onSelect, allowAll = true } = props;
  const { t } = useTranslation();
  const { colors } = useTheme();

  type Row = MockPlace | { id: 0; name: string; subscriberCount: number };
  const data: Row[] = allowAll
    ? [{ id: 0, name: t('pickers.place.allOption'), subscriberCount: MOCK_PLACES.reduce((s, p) => s + p.subscriberCount, 0) }, ...MOCK_PLACES]
    : MOCK_PLACES;

  return (
    <PickerSheet
      visible={visible}
      onClose={onClose}
      title={t('pickers.place.title')}
      subtitle={t('pickers.place.subtitle', { count: MOCK_PLACES.length })}
    >
      <FlashList<Row>
        data={data}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={56}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item as MockPlace)}
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
            <View style={styles.body}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.meta, { color: colors.textTertiary }]}>
                {t('pickers.place.subscriberCount', { count: item.subscriberCount })}
              </Text>
            </View>
            <Feather name="chevron-left" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      />
    </PickerSheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  meta: { fontSize: 11, marginTop: 2, textAlign: 'right' },
  name: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
});
