/**
 * PlacePicker — bottom sheet listing areas (مناطق).
 *
 * Wave 6-Β — wired to WatermelonDB via `observePlaces()`. The picker
 * keeps its `MockPlace` callback contract for backward compatibility
 * with calling screens; the VM layer (`toMockPlaces`) does the shape
 * adaptation.
 *
 * The "all places" pseudo-row is constructed in-component as before
 * (subscriberCount summed across live rows).
 */

import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Subscription } from 'rxjs';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import type { MockPlace } from '@/mocks/places';
import { observePlaces } from '@/services/repository/placesRepository';
import { toMockPlaces } from '@/services/repository/viewModels';

import { PickerSheet } from './PickerSheet';

export interface PlacePickerProps {
  visible: boolean;
  onClose(): void;
  onSelect(place: MockPlace): void;
  /** Allow an "all places" option at the top (default true). */
  allowAll?: boolean;
}

type Row = MockPlace | { id: 0; name: string; subscriberCount: number };

export function PlacePicker(props: PlacePickerProps): React.JSX.Element {
  const { visible, onClose, onSelect, allowAll = true } = props;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [places, setPlaces] = useState<MockPlace[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let sub: Subscription | null = null;
    sub = observePlaces().subscribe({
      next: (rows) => setPlaces(toMockPlaces(rows)),
      error: () => setPlaces([]),
    });
    return () => {
      if (sub != null) sub.unsubscribe();
    };
  }, [visible]);

  const data: Row[] = allowAll
    ? [
        {
          id: 0,
          name: t('pickers.place.allOption'),
          subscriberCount: places.reduce((s, p) => s + p.subscriberCount, 0),
        },
        ...places,
      ]
    : places;

  return (
    <PickerSheet
      visible={visible}
      onClose={onClose}
      title={t('pickers.place.title')}
      subtitle={t('pickers.place.subtitle', { count: places.length })}
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
              <Text
                style={[styles.name, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={[styles.meta, { color: colors.textTertiary }]}>
                {t('pickers.place.subscriberCount', {
                  count: item.subscriberCount,
                })}
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
