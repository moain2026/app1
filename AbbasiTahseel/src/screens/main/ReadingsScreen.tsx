/**
 * ReadingsScreen — Wave 4
 *
 * The full readings list, replacing the Wave-3 placeholder.
 *
 * Composition (top-to-bottom):
 *   AppHeader (menu + sync action button)
 *   ReadingStatBadge          (live aggregates: total / posted / pending / over)
 *   ReadingsSearchBar         (debounced search by name / namet / noadad)
 *   ReadingsFilterChips       (area / book / group / status + reset)
 *   FlashList<Reading>        (virtualized — 76dp rows + RefreshControl)
 *     • renderItem = ReadingRow
 *     • ListEmptyComponent = ReadingsEmptyState
 *     • Pull-to-refresh wired to useSyncStore.triggerSync()
 *
 * Reactivity:
 *   The list rows are sourced from a WatermelonDB observable built by
 *   `readingsRepository.observeReadings(filters)`. The filters come from
 *   the Zustand `useReadingsStore` slice. Whenever any filter changes the
 *   useEffect tears down the old subscription and starts a fresh one.
 *
 *   This pattern (manual subscribe in useEffect) is intentional — using
 *   `withObservables` would require the filter object to be a prop, which
 *   would force us to lift state up just for the HOC. Manual subscribe is
 *   simpler and equally performant for a single observable.
 *
 * Dev Bypass:
 *   - Sync action triggers a toast instead of an API call (no real server).
 *   - The empty state hides its "Sync now" CTA (handled inside the component).
 */

import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import type { Subscription } from 'rxjs';

import { AppHeader } from '@/components/layout/AppHeader';
import {
  READING_ROW_HEIGHT,
  ReadingRow,
  ReadingStatBadge,
  ReadingsEmptyState,
  ReadingsFilterChips,
  ReadingsSearchBar,
} from '@/components/readings';
import type { Reading } from '@/database/models/Reading';
import { useTheme } from '@/design-system/theme';
import { observeReadings } from '@/services/repository/readingsRepository';
import { useAuthStore } from '@/stores/authStore';
import { useReadingsStore } from '@/stores/readingsStore';
import { useSyncStore } from '@/stores/syncStore';

interface NavLike {
  navigate(route: 'ReadingDetail', params: { localUuid: string }): void;
  navigate(route: 'Scanner', params: { returnTo: 'Readings' }): void;
}

export function ReadingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NavLike>();

  // ─── Store selectors ─────────────────────────────────────────────────
  // Each primitive selector triggers a re-subscription on change.
  const searchQuery = useReadingsStore((s) => s.searchQuery);
  const area = useReadingsStore((s) => s.area);
  const book = useReadingsStore((s) => s.book);
  const group = useReadingsStore((s) => s.group);
  const status = useReadingsStore((s) => s.status);
  const sortBy = useReadingsStore((s) => s.sortBy);
  const sortOrder = useReadingsStore((s) => s.sortOrder);

  const isSyncing = useSyncStore((s) => s.isSyncing);
  const triggerSync = useSyncStore((s) => s.triggerSync);
  const isDevBypass = useAuthStore((s) => s.isDevBypass);

  const [rows, setRows] = useState<Reading[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  // ─── Subscription to the reactive query ──────────────────────────────
  useEffect(() => {
    const sub: Subscription = observeReadings({
      searchQuery,
      area,
      book,
      group,
      status,
      sortBy,
      sortOrder,
    }).subscribe({
      next: (next) => {
        setRows(next);
        setLoaded(true);
      },
      error: () => {
        setRows([]);
        setLoaded(true);
      },
    });
    return () => sub.unsubscribe();
  }, [searchQuery, area, book, group, status, sortBy, sortOrder]);

  // ─── Handlers ────────────────────────────────────────────────────────
  const onRowPress = useCallback(
    (reading: Reading) => {
      navigation.navigate('ReadingDetail', { localUuid: reading.localUuid });
    },
    [navigation],
  );

  const onScanPress = useCallback((): void => {
    navigation.navigate('Scanner', { returnTo: 'Readings' });
  }, [navigation]);

  const onSync = useCallback(async (): Promise<void> => {
    if (isDevBypass) {
      ToastAndroid.show(t('readings.list.sync.devSkip'), ToastAndroid.SHORT);
      return;
    }
    try {
      await triggerSync();
      ToastAndroid.show(t('readings.list.sync.success'), ToastAndroid.SHORT);
    } catch {
      ToastAndroid.show(t('readings.list.sync.error'), ToastAndroid.SHORT);
    }
  }, [isDevBypass, triggerSync, t]);

  // ─── Filter activity flag (controls EmptyState wording) ──────────────
  const hasActiveFilters =
    searchQuery.length > 0 ||
    area !== null ||
    book !== null ||
    group !== null ||
    status !== 'all';

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader
        title={t('readings.list.title')}
        showMenu
        rightAction={
          <Pressable
            onPress={() => void onSync()}
            accessibilityRole="button"
            accessibilityLabel="sync"
            hitSlop={8}
            style={styles.syncBtn}
          >
            <Feather
              name="refresh-cw"
              size={18}
              color={colors.white}
            />
          </Pressable>
        }
      />

      <ReadingStatBadge />

      <ReadingsSearchBar />

      <ReadingsFilterChips />

      <View style={styles.listWrap}>
        <FlashList
          data={rows}
          keyExtractor={keyExtractor}
          estimatedItemSize={READING_ROW_HEIGHT}
          renderItem={({ item }) => (
            <ReadingRow reading={item} onPress={onRowPress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={() => void onSync()}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            loaded ? (
              <ReadingsEmptyState
                isPristine={!hasActiveFilters}
                onSync={() => void onSync()}
              />
            ) : null
          }
        />
      </View>

      {/* Floating Action Button → Scanner */}
      <Pressable
        onPress={onScanPress}
        accessibilityRole="button"
        accessibilityLabel={t('scanner.title')}
        android_ripple={{ color: colors.white, borderless: true }}
        style={[styles.fab, { backgroundColor: colors.danger }]}
      >
        <Feather name="maximize" size={26} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

function keyExtractor(reading: Reading): string {
  return reading.localUuid;
}

const styles = StyleSheet.create({
  fab: {
    alignItems: 'center',
    borderRadius: 28,
    bottom: 24,
    elevation: 6,
    end: 20,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: 56,
  },
  flex: { flex: 1 },
  listWrap: { flex: 1, marginTop: 4 },
  syncBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
