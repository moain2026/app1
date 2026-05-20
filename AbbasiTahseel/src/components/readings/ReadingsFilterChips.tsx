/**
 * ReadingsFilterChips — horizontal row of filter chips driving the
 * readings list.
 *
 * 4 chips:
 *   • المنطقة  (area  / readings.nomstlm)
 *   • الدفتر  (book  / readings.notblh)
 *   • المجموعة (group / readings.nog)
 *   • الحالة  (status / posted | pending | over | all)
 *
 * Tapping a chip opens a Modal with the available values. Active chips
 * are accent-colored; inactive chips use the surface color.
 *
 * Distinct values for area/book/group are pulled live from the WMDB
 * `readings` collection (one-shot fetch — cheap because the collection is
 * indexed on those columns). The status chip uses a fixed list.
 *
 * A "تصفية" (reset all) button is shown when any filter is active.
 */

import { Q } from '@nozbe/watermelondb';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { database } from '@/database';
import type { Reading } from '@/database/models/Reading';
import { useTheme } from '@/design-system/theme';
import type { ReadingStatusFilter } from '@/services/repository/readingsRepository';
import { useReadingsStore } from '@/stores/readingsStore';

// ─── Chip definition ──────────────────────────────────────────────────────

type ChipKey = 'area' | 'book' | 'group' | 'status';

type SheetOption =
  | { value: number; label: string }
  | { value: 'all' | 'pending' | 'posted' | 'over'; label: string };

interface ActiveSheet {
  key: ChipKey;
  title: string;
  options: SheetOption[];
}

// ─── Helpers — distinct numeric values from the collection ────────────────

async function fetchDistinctNumeric(column: 'nomstlm' | 'notblh' | 'nog'): Promise<number[]> {
  // WatermelonDB does not expose DISTINCT directly; fetch then unique in JS.
  // The collection is small enough (≤ a few thousand rows) for this to be
  // negligible compared to the DB write/index cost.
  const rows = await database.collections
    .get<Reading>('readings')
    .query(Q.sortBy(column, Q.asc))
    .fetch();
  const seen = new Set<number>();
  for (const r of rows) {
    const value = (r as unknown as Record<string, number>)[column];
    if (typeof value === 'number') {
      seen.add(value);
    }
  }
  return Array.from(seen).sort((a, b) => a - b);
}

// ─── Component ────────────────────────────────────────────────────────────

export function ReadingsFilterChips(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const area = useReadingsStore((s) => s.area);
  const book = useReadingsStore((s) => s.book);
  const group = useReadingsStore((s) => s.group);
  const status = useReadingsStore((s) => s.status);
  const setFilter = useReadingsStore((s) => s.setFilter);
  const resetFilters = useReadingsStore((s) => s.resetFilters);

  const [sheet, setSheet] = useState<ActiveSheet | null>(null);

  // ─── Build sheet options for a given chip ────────────────────────────
  async function openChip(key: ChipKey): Promise<void> {
    let options: SheetOption[];
    let title: string;
    if (key === 'status') {
      title = t('readings.list.filters.status');
      options = [
        { value: 'all', label: t('readings.list.filters.all') },
        { value: 'pending', label: t('readings.list.filters.pending') },
        { value: 'posted', label: t('readings.list.filters.posted') },
        { value: 'over', label: t('readings.list.filters.over') },
      ];
    } else {
      const column =
        key === 'area' ? 'nomstlm' : key === 'book' ? 'notblh' : 'nog';
      const values = await fetchDistinctNumeric(column);
      title =
        key === 'area'
          ? t('readings.list.filters.area')
          : key === 'book'
            ? t('readings.list.filters.book')
            : t('readings.list.filters.group');
      options = values.map((v) => ({ value: v, label: String(v) }));
    }
    setSheet({ key, title, options });
  }

  function pickOption(opt: SheetOption): void {
    if (sheet === null) return;
    if (sheet.key === 'status') {
      setFilter('status', opt.value as ReadingStatusFilter);
    } else {
      // For area/book/group: tapping the same value again clears the filter.
      const current =
        sheet.key === 'area'
          ? area
          : sheet.key === 'book'
            ? book
            : group;
      const next = current === opt.value ? null : (opt.value as number);
      setFilter(sheet.key, next);
    }
    setSheet(null);
  }

  // ─── Active state per chip ───────────────────────────────────────────
  const isActive = (key: ChipKey): boolean => {
    if (key === 'area') return area !== null;
    if (key === 'book') return book !== null;
    if (key === 'group') return group !== null;
    return status !== 'all';
  };

  const labelFor = (key: ChipKey): string => {
    if (key === 'area') {
      return area !== null
        ? `${t('readings.list.filters.area')}: ${area}`
        : t('readings.list.filters.area');
    }
    if (key === 'book') {
      return book !== null
        ? `${t('readings.list.filters.book')}: ${book}`
        : t('readings.list.filters.book');
    }
    if (key === 'group') {
      return group !== null
        ? `${t('readings.list.filters.group')}: ${group}`
        : t('readings.list.filters.group');
    }
    return status === 'all'
      ? t('readings.list.filters.status')
      : `${t('readings.list.filters.status')}: ${t(
          `readings.list.filters.${status}`,
        )}`;
  };

  const anyActive =
    area !== null || book !== null || group !== null || status !== 'all';

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {(['area', 'book', 'group', 'status'] as ChipKey[]).map((key) => {
          const active = isActive(key);
          return (
            <Pressable
              key={key}
              onPress={() => void openChip(key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: active ? colors.textOnAccent : colors.textSecondary,
                  },
                ]}
              >
                {labelFor(key)}
              </Text>
              <Feather
                name="chevron-down"
                size={12}
                color={active ? colors.textOnAccent : colors.textTertiary}
              />
            </Pressable>
          );
        })}
        {anyActive ? (
          <Pressable
            onPress={resetFilters}
            style={[
              styles.chip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.warning,
              },
            ]}
          >
            <Feather name="x" size={12} color={colors.warning} />
            <Text style={[styles.chipText, { color: colors.warning }]}>
              {t('readings.list.filters.reset')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Bottom-sheet-style modal for the chosen chip's options */}
      <FilterSheet
        sheet={sheet}
        onClose={() => setSheet(null)}
        onPick={pickOption}
      />
    </View>
  );
}

// ─── Sheet sub-component ──────────────────────────────────────────────────

interface FilterSheetProps {
  sheet: ActiveSheet | null;
  onClose(): void;
  onPick(opt: SheetOption): void;
}

function FilterSheet({ sheet, onClose, onPick }: FilterSheetProps): React.JSX.Element {
  const { colors } = useTheme();
  const visible = sheet !== null;

  // Keep the latest visible content in a state slot so the modal can fade
  // out smoothly even after the parent clears `sheet`.
  const [snapshot, setSnapshot] = useState<ActiveSheet | null>(sheet);
  useEffect(() => {
    if (sheet !== null) {
      setSnapshot(sheet);
    }
  }, [sheet]);

  if (snapshot === null) {
    return <></>;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            {snapshot.title}
          </Text>
          <FlatList
            data={snapshot.options}
            keyExtractor={(opt) => String(opt.value)}
            style={styles.sheetList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPick(item)}
                style={[
                  styles.sheetItem,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.sheetItemText, { color: colors.textPrimary }]}
                >
                  {item.label}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text
                style={[styles.empty, { color: colors.textTertiary }]}
              >
                —
              </Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chip: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    padding: 24,
    textAlign: 'center',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    maxHeight: '60%',
    paddingTop: 12,
  },
  sheetItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetItemText: {
    fontSize: 15,
    textAlign: 'right',
  },
  sheetList: {
    flexGrow: 0,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 8,
    textAlign: 'right',
  },
});
