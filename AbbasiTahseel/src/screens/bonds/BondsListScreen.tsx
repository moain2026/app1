/**
 * BondsListScreen — list of all bonds with search + chip filter.
 *
 * Wave 6-Β — wired to WatermelonDB:
 *   • `observeBonds({searchQuery: query, type: filter})` drives the list.
 *   • `observeStats()` drives the chip badge counts (live total / receipt /
 *     payment counts that re-emit on every bond INSERT/UPDATE/DELETE).
 *   • `observeAccounts({searchQuery: ''})` + `observeCurrencies()` feed
 *     the `BondLookups` index used by the view-model to resolve
 *     account.code → MockBond.accountNum and currency.symbol →
 *     MockBond.currencySymbol (those columns don't live on the `bonds`
 *     table).
 *
 *   Bond rows ── observeBonds() ──┐
 *   Account map ── observeAccounts ─┼─▶ toBondListItems(rows, lookups) ──▶ MockBond[]
 *   Currency map ── observeCurrencies ─┘                                     │
 *                                                                            ▼
 *                                                                       <BondCard>
 *
 *   The numeric `bondNo` search ("type 1003") is applied client-side via
 *   `applyNumericBondNoFilter` because Q.like doesn't work on numeric
 *   columns (the repository searches account_name + notes textually).
 *
 *   Sort is fixed at `bond_date DESC, bond_no DESC` inside the repo.
 *
 *   Untouched mutation paths (BondCreate / swipe-delete) remain on the
 *   existing flow until Wave 6-Γ wires the WCF push contract.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Subscription } from 'rxjs';

import { AppHeader } from '@/components/layout/AppHeader';
import { BondCard, BOND_CARD_HEIGHT } from '@/components/bonds';
import {
  Chip,
  EmptyState,
  FAB,
  MockBanner,
  SearchBar,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import type { Account } from '@/database/models/Account';
import type { Bond } from '@/database/models/Bond';
import type { Currency } from '@/database/models/Currency';
import type { MockBond } from '@/mocks/bonds';
import type { MainStackParamList } from '@/navigation/types';
import {
  applyNumericBondNoFilter,
  observeAccounts,
  observeBondStats,
  observeBonds,
  observeCurrencies,
  type BondsStats,
} from '@/services/repository';
import {
  emptyBondLookups,
  indexByRemoteId,
  toBondListItems,
  type BondLookups,
} from '@/services/repository/viewModels';

type Filter = 'all' | 'receipt' | 'payment';

const EMPTY_STATS: BondsStats = {
  total: 0,
  receipt: 0,
  payment: 0,
  synced: 0,
  dirty: 0,
  failed: 0,
};

export function BondsListScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Live data sources ───────────────────────────────────────────────
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [stats, setStats] = useState<BondsStats>(EMPTY_STATS);

  // Subscribe to the filtered bonds query. Re-subscribes whenever the
  // user's search box or chip filter changes (WatermelonDB returns a
  // new hot query for each filter object, so we tear down the old
  // subscription explicitly).
  useEffect(() => {
    let sub: Subscription | null = null;
    sub = observeBonds({ searchQuery: query, type: filter }).subscribe({
      next: (rows) => setBonds(rows),
      error: () => setBonds([]),
    });
    return () => {
      if (sub != null) sub.unsubscribe();
    };
  }, [query, filter]);

  // Subscribe to live stats for the chip badges (independent of the
  // search/filter so the badges always reflect global totals).
  useEffect(() => {
    let sub: Subscription | null = null;
    sub = observeBondStats().subscribe({
      next: (next) => setStats(next),
      error: () => setStats(EMPTY_STATS),
    });
    return () => {
      if (sub != null) sub.unsubscribe();
    };
  }, []);

  // Subscribe to accounts + currencies once — they rarely change and
  // are tiny tables, so we just hold the full list in memory and
  // re-index on each emission.
  useEffect(() => {
    let sub: Subscription | null = null;
    sub = observeAccounts({ searchQuery: '' }).subscribe({
      next: (rows) => setAccounts(rows),
      error: () => setAccounts([]),
    });
    return () => {
      if (sub != null) sub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let sub: Subscription | null = null;
    sub = observeCurrencies().subscribe({
      next: (rows) => setCurrencies(rows),
      error: () => setCurrencies([]),
    });
    return () => {
      if (sub != null) sub.unsubscribe();
    };
  }, []);

  // Build the lookup index once per accounts/currencies emission.
  const lookups = useMemo<BondLookups>(() => {
    if (accounts.length === 0 && currencies.length === 0) {
      return emptyBondLookups();
    }
    return {
      accountByRemoteId: indexByRemoteId(accounts),
      currencyByRemoteId: indexByRemoteId(currencies),
    };
  }, [accounts, currencies]);

  // Map the raw rows into the MockBond shape the existing BondCard
  // consumes. Apply numeric-bondNo search on top (LIKE doesn't work on
  // numeric columns, so the repo only filters by text columns).
  const filtered = useMemo<MockBond[]>(() => {
    const numericFiltered = applyNumericBondNoFilter(bonds, query);
    return toBondListItems(numericFiltered, lookups);
  }, [bonds, query, lookups]);

  const handleCardPress = (bond: MockBond): void => {
    navigation.navigate('BondDetail', { localUuid: bond.localUuid });
  };

  const handleCreate = (): void => {
    navigation.navigate('BondCreate', { defaultType: 'receipt' });
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('bonds.list.title')} showMenu />
      <MockBanner />

      <View style={styles.toolbar}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('bonds.list.searchPlaceholder')}
        />
        <View style={styles.chipsRow}>
          <Chip
            label={t('bonds.list.filterAll')}
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            count={stats.total}
          />
          <Chip
            label={t('bonds.types.receipt')}
            selected={filter === 'receipt'}
            onPress={() => setFilter('receipt')}
            count={stats.receipt}
          />
          <Chip
            label={t('bonds.types.payment')}
            selected={filter === 'payment'}
            onPress={() => setFilter('payment')}
            count={stats.payment}
          />
        </View>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon={query ? 'search' : 'inbox'}
          title={
            query
              ? t('bonds.list.emptySearchTitle')
              : t('bonds.list.emptyTitle')
          }
          subtitle={
            query
              ? t('bonds.list.emptySearchSubtitle')
              : t('bonds.list.emptySubtitle')
          }
          action={
            query
              ? undefined
              : {
                  label: t('bonds.list.createCta'),
                  onPress: handleCreate,
                }
          }
        />
      ) : (
        <FlashList<MockBond>
          data={filtered}
          keyExtractor={(item) => item.localUuid}
          estimatedItemSize={BOND_CARD_HEIGHT}
          renderItem={({ item }) => (
            <BondCard bond={item} onPress={handleCardPress} />
          )}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border },
              ]}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB
        icon="plus"
        label={t('bonds.list.createCta')}
        onPress={handleCreate}
        accessibilityLabel={t('bonds.list.createCta')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  flex: { flex: 1 },
  list: {
    paddingBottom: spacing[10],
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing[4],
  },
  toolbar: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
});
