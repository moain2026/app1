/**
 * ReadingsBulkScreen — fast-entry grid for posting many readings at once.
 *
 * Workflow:
 *   1. User filters by place + book + group (top filter card).
 *   2. Pending subscribers appear in a scrollable list with an inline
 *      numeric input per row.
 *   3. Bottom bar shows totals + a single "post all" CTA.
 *
 * Wave 6-Α — UI skeleton (data from getPendingReadings()).
 *
 * TODO Wave 6-Β:
 *   • Wire each row's onChangeText to the WatermelonDB Reading model.
 *   • Re-use the over-consumption validator from ReadingDetailScreen.
 *   • Implement batched optimistic save via SyncService.queueBatch().
 *   • Add keyboard-aware scrolling so the focused row stays visible.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { PlacePicker } from '@/components/pickers';
import {
  Card,
  EmptyState,
  FormField,
  MockBanner,
  SectionHeader,
} from '@/design-system/components';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { getPendingReadings, type MockReading, type MockPlace } from '@/mocks';

const ROW_HEIGHT = 78;

export function ReadingsBulkScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [place, setPlace] = useState<MockPlace | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [entries, setEntries] = useState<Record<string, string>>({});

  const pending = useMemo(getPendingReadings, []);
  const filtered = useMemo(
    () =>
      place
        ? pending.filter((r) => r.nomstlm === place.id)
        : pending,
    [pending, place],
  );

  const draftCount = Object.values(entries).filter((v) => v.trim() !== '').length;

  const handleChange = (num: string, value: string): void => {
    // Allow only numeric input (Wave 6-Β: enforce min > previous reading).
    const cleaned = value.replace(/[^0-9]/g, '');
    setEntries((prev) => ({ ...prev, [num]: cleaned }));
  };

  const renderItem = ({ item }: { item: MockReading }): React.JSX.Element => {
    const draft = entries[item.num] ?? '';
    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={styles.rowInfo}>
          <Text
            style={[styles.rowName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.rowMeta, { color: colors.textTertiary }]}
          >
            #{item.num} · {t('readings.bulk.previous')}: {item.ks}
          </Text>
        </View>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              borderColor:
                draft !== '' ? colors.accent : colors.inputBorder,
              color: colors.textPrimary,
            },
          ]}
          placeholder={t('readings.bulk.placeholder')}
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="numeric"
          value={draft}
          onChangeText={(v) => handleChange(item.num, v)}
          maxLength={9}
        />
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('readings.bulk.title')} showBack />
      <MockBanner />

      <View style={styles.filterArea}>
        <Card variant="outlined">
          <FormField
            label={t('readings.bulk.placeFilter')}
            value={place ? place.name : ''}
            placeholder={t('readings.bulk.allPlaces')}
            readOnly
            onPress={() => setPlaceOpen(true)}
            leadingIcon="map-pin"
            trailingIcon={place ? 'x' : 'chevron-down'}
            onTrailingPress={place ? () => setPlace(null) : undefined}
          />
        </Card>
      </View>

      <SectionHeader
        title={`${t('readings.bulk.section')} (${filtered.length})`}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title={t('readings.bulk.emptyTitle')}
          subtitle={t('readings.bulk.emptySubtitle')}
        />
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}
          estimatedItemSize={ROW_HEIGHT}
          keyExtractor={(r) => r.num}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      {/* ─── Bottom action bar ──────────────────────────────── */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.actionBarInfo}>
          <Feather name="edit-3" size={16} color={colors.accent} />
          <Text
            style={[styles.actionBarText, { color: colors.textPrimary }]}
          >
            {t('readings.bulk.draftCount', { count: draftCount })}
          </Text>
        </View>
        <View style={styles.actionBarButton}>
          <PrimaryButton
            title={t('readings.bulk.saveAll')}
            disabled={draftCount === 0}
            onPress={() => {
              // TODO Wave 6-Β: persist all entries via SyncService.queueBatch()
              // and clear the local draft map on success.
              setEntries({});
            }}
          />
        </View>
      </View>

      <PlacePicker
        visible={placeOpen}
        onClose={() => setPlaceOpen(false)}
        onSelect={(p) => {
          setPlace(p);
          setPlaceOpen(false);
        }}
      />

      {/* Discreet dev tag. */}
      {__DEV__ ? (
        <Pressable style={styles.devTag} onPress={() => setEntries({})}>
          <Feather name="info" size={10} color="#856404" />
          <Text style={styles.devTagText}>UI skeleton — Wave 6-Α</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing[3],
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  actionBarButton: {
    flex: 1,
  },
  actionBarInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  devTag: {
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    bottom: 80,
    end: spacing[3],
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
  },
  devTagText: {
    color: '#856404',
    fontSize: 9,
    fontWeight: '700',
  },
  filterArea: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  flex: { flex: 1 },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '700',
    height: 44,
    paddingHorizontal: spacing[3],
    textAlign: 'center',
    width: 110,
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  rowInfo: {
    flex: 1,
  },
  rowMeta: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
});
