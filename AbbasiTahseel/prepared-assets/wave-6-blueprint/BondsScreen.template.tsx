/**
 * BondsScreen — السندات (list view)
 * ============================================================================
 *  TEMPLATE FILE — DO NOT IMPORT FROM src/
 *
 *  Final path:  src/screens/main/BondsScreen.tsx
 *  Replaces:    the Wave-4 placeholder file
 * ============================================================================
 *
 * Layout
 * ------
 *   ┌────────────────────────────────────────────┐
 *   │  العباسي تحصيل   [SyncBadge]      [☰]      │  AppHeader (showMenu)
 *   ├────────────────────────────────────────────┤
 *   │  [Search 🔍 ابحث برقم السند...]            │  Search row
 *   │  [الكل][اليوم][بانتظار المزامنة]...        │  Filter chips
 *   │  [بحسب التاريخ ▾]                          │  Sort selector
 *   ├────────────────────────────────────────────┤
 *   │  ╭── Row ──────────────────────────────╮   │
 *   │  │ سند #1001 • أم البنين كاظم         │   │
 *   │  │ 343,000 د.ع    [مطبوع] [بانتظار]  │   │
 *   │  ╰────────────────────────────────────╯   │
 *   │  ...                                       │
 *   │                                            │
 *   │                                       [+]  │  FAB
 *   └────────────────────────────────────────────┘
 *
 * Conventions followed
 * --------------------
 *   - AppHeader from @/components/layout/AppHeader (showMenu=true)
 *   - useTheme().colors — never raw palette
 *   - useTranslation() with 'bonds.list.*' keys
 *   - WatermelonDB observable -> useEffect/useState (matches the
 *     observeCount pattern in syncStore.ts §line 162)
 *   - RTL: textAlign 'right' (the app is forced RTL globally)
 *   - FlatList (not FlashList — see Integration Guide §4: zero new deps)
 *
 * Performance note
 * ----------------
 * The full list of bonds is observed once; client-side search + filter +
 * sort run on the (typically small — < 200) result set. If a deployment
 * grows past 1k bonds, switch to server-side filtering in the
 * `observeBonds()` query clauses (the repo already accepts a filter).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/design-system/theme';
import { bondsRepository } from '@/services/bonds/bondsRepository';
import { useBondsStore, type BondsFilterKey } from '@/stores/bondsStore';
import { useSyncStore } from '@/stores/syncStore';
import type { Bond } from '@/database/models';
import { CURRENCY_META } from '@/database/models/BondPayment';

// ─── Component ───────────────────────────────────────────────────────────

export function BondsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const searchQuery = useBondsStore((s) => s.searchQuery);
  const setSearchQuery = useBondsStore((s) => s.setSearchQuery);
  const filterKey = useBondsStore((s) => s.filterKey);
  const setFilter = useBondsStore((s) => s.setFilter);
  const sortKey = useBondsStore((s) => s.sortKey);
  const sortOrder = useBondsStore((s) => s.sortOrder);
  const toggleSort = useBondsStore((s) => s.toggleSort);
  const selectBond = useBondsStore((s) => s.selectBond);
  const startDraft = useBondsStore((s) => s.startDraft);

  const triggerSync = useSyncStore((s) => s.triggerSync);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  const [bonds, setBonds] = useState<Bond[]>([]);

  // Subscribe to repository observable.
  useEffect(() => {
    const sub = bondsRepository.observeBonds({ kind: filterKey }).subscribe({
      next: (rows) => setBonds(rows),
      error: () => setBonds([]),
    });
    return () => sub.unsubscribe();
  }, [filterKey]);

  // Client-side filter (search) + sort.
  const visibleBonds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered =
      q.length === 0
        ? bonds
        : bonds.filter((b) => {
            const noStr = String(b.bondNo);
            const acc = (b.accountName ?? '').toLowerCase();
            return noStr.includes(q) || acc.includes(q);
          });
    const sorted = filtered.slice().sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date':
          cmp = a.bondDate.getTime() - b.bondDate.getTime();
          break;
        case 'amount':
          cmp = a.amount - b.amount;
          break;
        case 'subscriber':
          cmp = (a.accountName ?? '').localeCompare(b.accountName ?? '');
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [bonds, searchQuery, sortKey, sortOrder]);

  const totalIqd = useMemo(
    () =>
      visibleBonds.reduce(
        (acc, b) => acc + (b.currencyId == null || b.currencyId === 1 ? b.amount : 0),
        0,
      ),
    [visibleBonds],
  );

  const onOpenDetail = (bondId: string): void => {
    selectBond(bondId);
    // Route name 'BondDetail' must be registered in MainStack.
    navigation.navigate('BondDetail' as never, { localUuid: bondId } as never);
  };

  const onNewBond = (): void => {
    startDraft();
    navigation.navigate('NewBond' as never);
  };

  const onRefresh = (): void => {
    void triggerSync();
  };

  // ─── Renderers ────────────────────────────────────────────────────────

  const renderItem = ({ item }: ListRenderItemInfo<Bond>): React.JSX.Element => (
    <BondRow bond={item} onPress={onOpenDetail} />
  );

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('bonds.list.title')} showMenu />

      {/* Toolbar: search + filters + sort + stat */}
      <View style={styles.toolbar}>
        {/* Search */}
        <View
          style={[
            styles.searchRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('bonds.list.searchPlaceholder')}
            placeholderTextColor={colors.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.clear')}
              onPress={() => setSearchQuery('')}
            >
              <Feather name="x" size={16} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter chips */}
        <View style={styles.chipsRow}>
          {FILTER_KEYS.map((key) => {
            const active = filterKey === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => setFilter(key)}
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
                    styles.chipLabel,
                    {
                      color: active ? colors.textOnAccent : colors.textSecondary,
                    },
                  ]}
                >
                  {t(`bonds.list.filter.${key}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Sort + total */}
        <View style={styles.sortRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => toggleSort(sortKey)}
            style={styles.sortBtn}
          >
            <Feather
              name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
              size={14}
              color={colors.textSecondary}
            />
            <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>
              {t(`bonds.list.sort.${sortKey}`)}
            </Text>
          </Pressable>
          <View style={styles.statBadge}>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {t('bonds.list.subtitle', { count: visibleBonds.length })}
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatIqd(totalIqd)}
            </Text>
          </View>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={visibleBonds}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="file-text" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('bonds.list.empty')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onNewBond}
              style={[styles.emptyAction, { borderColor: colors.accent }]}
            >
              <Text style={[styles.emptyActionText, { color: colors.accent }]}>
                {t('bonds.list.emptyAction')}
              </Text>
            </Pressable>
          </View>
        }
      />

      {/* FAB */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bonds.list.emptyAction')}
        onPress={onNewBond}
        style={[styles.fab, { backgroundColor: colors.accent }]}
      >
        <Feather name="plus" size={26} color={colors.textOnAccent} />
      </Pressable>
    </SafeAreaView>
  );
}

// ─── BondRow ─────────────────────────────────────────────────────────────

interface BondRowProps {
  bond: Bond;
  onPress(localUuid: string): void;
}

function BondRow({ bond, onPress }: BondRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(bond.id)}
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={[styles.rowNumber, { color: colors.textPrimary }]}>
          {t('bonds.list.bondNumber', { num: bond.bondNo })}
        </Text>
        {bond.accountName != null ? (
          <Text
            style={[styles.rowSubscriber, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {bond.accountName}
          </Text>
        ) : null}
        <View style={styles.rowMeta}>
          <Text style={[styles.rowAmount, { color: colors.textPrimary }]}>
            {formatIqd(bond.amount)}
          </Text>
          <BondStateBadge bond={bond} />
        </View>
      </View>
      <Feather name="chevron-left" size={20} color={colors.textTertiary} />
    </Pressable>
  );
}

function BondStateBadge({ bond }: { bond: Bond }): React.JSX.Element | null {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const state = bond.state;
  if (state === 'voided') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.dangerSoft }]}>
        <Text style={[styles.badgeText, { color: colors.danger }]}>
          {t('bonds.detail.status.voided')}
        </Text>
      </View>
    );
  }
  if (state === 'printed') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
        <Text style={[styles.badgeText, { color: colors.success }]}>
          {t('bonds.detail.status.printed')}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: colors.warningSoft }]}>
      <Text style={[styles.badgeText, { color: colors.warning }]}>
        {t('bonds.detail.status.draft')}
      </Text>
    </View>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────

const FILTER_KEYS: readonly BondsFilterKey[] = [
  'all',
  'today',
  'unsynced',
  'printed',
  'voided',
] as const;

// ─── Format helpers (mirror BondPayment.formattedValue) ──────────────────

function formatIqd(n: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
  return `${formatted} ${CURRENCY_META.IQD.symbol}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chip: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    marginTop: 80,
    paddingHorizontal: 24,
  },
  emptyAction: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  fab: {
    alignItems: 'center',
    borderRadius: 28,
    bottom: 20,
    elevation: 6,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    width: 56,
  },
  flex: { flex: 1 },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    padding: 12,
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowMain: {
    flex: 1,
    gap: 4,
  },
  rowMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rowNumber: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  rowSubscriber: {
    fontSize: 12,
    textAlign: 'right',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    textAlign: 'right',
  },
  searchRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statBadge: {
    alignItems: 'flex-end',
  },
  statText: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
