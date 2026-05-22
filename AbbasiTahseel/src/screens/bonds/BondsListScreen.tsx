/**
 * BondsListScreen — replaces the old stub BondsScreen.tsx.
 *
 * Layout (RTL):
 *
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  [AppHeader: السندات + menu + sync badge]                   │
 *  │  [MockBanner — يظهر فقط في __DEV__]                         │
 *  │  ┌─────────────────────────────────────────────────────────┐│
 *  │  │ SearchBar                                               ││
 *  │  └─────────────────────────────────────────────────────────┘│
 *  │  [الكل (20)] [قبض (17)] [صرف (3)]   ← Chips                 │
 *  │  ──────────────────────────────                              │
 *  │  [BondCard #1020 …]                                          │
 *  │  [BondCard #1019 …]                                          │
 *  │  ...                                                         │
 *  │                                              [+ سند جديد]   │
 *  └─────────────────────────────────────────────────────────────┘
 *
 * TODO (Wave 6-Β):
 *   • Replace MOCK_BONDS with a Zustand bondsStore reading from
 *     WatermelonDB (`@nozbe/with-observables`).
 *   • Implement swipe-to-delete via react-native-gesture-handler.
 *   • Wire `pull-to-refresh` to triggerSync('bonds').
 *   • Add empty-state CTA when filtered list is empty AND query is
 *     empty (i.e. truly no bonds yet — link to BondCreate).
 *   • Add a `dirty count` indicator next to the AppHeader sync badge.
 *
 * Wave 6-Α — UI skeleton.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { getMockBondCounts, MOCK_BONDS, type MockBond } from '@/mocks/bonds';
import type { MainStackParamList } from '@/navigation/types';

type Filter = 'all' | 'receipt' | 'payment';

export function BondsListScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => getMockBondCounts(), []);

  const filtered = useMemo(() => {
    let list = [...MOCK_BONDS];
    if (filter !== 'all') {
      list = list.filter((b) => b.bondType === filter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.accountName.toLowerCase().includes(q) ||
          b.accountNum.toLowerCase().includes(q) ||
          String(b.bondNo).includes(q),
      );
    }
    // Newest first (by bondDate then by bondNo).
    list.sort((a, b) => {
      if (a.bondDate === b.bondDate) return b.bondNo - a.bondNo;
      return a.bondDate < b.bondDate ? 1 : -1;
    });
    return list;
  }, [query, filter]);

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
            count={counts.total}
          />
          <Chip
            label={t('bonds.types.receipt')}
            selected={filter === 'receipt'}
            onPress={() => setFilter('receipt')}
            count={counts.receipt}
          />
          <Chip
            label={t('bonds.types.payment')}
            selected={filter === 'payment'}
            onPress={() => setFilter('payment')}
            count={counts.payment}
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
