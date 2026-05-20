/**
 * HomeScreen — main dashboard (Wave 3)
 *
 * Layout:
 *   AppHeader                                 (menu + title + sync badge)
 *   ScrollView (with RefreshControl)
 *     Welcome card     (logo + name + branch + today)
 *     KPI grid (2x2)   (today readings, today bonds, pending, last sync)
 *     Primary CTA      ("ابدأ جولة قراءات" -> Readings tab)
 *     Recent activity  (placeholder until Wave 4 lands real readings)
 *
 * Reactivity:
 *   - todayReadingsCount   <- DB observable on readings.created_at >= startOfDay
 *   - todayBondsCount      <- DB observable on bonds.created_at >= startOfDay
 *   - pendingSyncCount     <- useSyncStore.pendingCount (also DB observable)
 *   - lastSyncRelative     <- derived from useSyncStore.lastSyncAt + an
 *                              every-60s ticker
 *
 * Refresh: pull-to-refresh triggers useSyncStore.triggerSync() (push + pull).
 *
 * Note on counts: we keep useState + a one-time count() rather than threading
 * withObservables HOC because the Home screen is rebuilt on every tab focus
 * and an `observeCount()` subscription is cheap and gets cleaned up properly
 * via the useEffect return.
 */

import { Q } from '@nozbe/watermelondb';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Subscription } from 'rxjs';

import { KpiCard } from '@/components/cards/KpiCard';
import { PrimaryButton } from '@/components/forms';
import { AppHeader } from '@/components/layout/AppHeader';
import { database } from '@/database';
import { useTheme } from '@/design-system/theme';
import { getBranchNumber } from '@/services/storage/prefs';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/logo/abbasi_logo.png');

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTodayArabic(): string {
  const d = new Date();
  // toLocaleDateString with 'ar' yields full Arabic weekday + date.
  return d.toLocaleDateString('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface RelativeArgs {
  lastSyncAt: Date | null;
  now: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function relativeLastSync(args: RelativeArgs): string {
  const { lastSyncAt, now, t } = args;
  if (lastSyncAt === null) {
    return t('home.kpi.neverSynced');
  }
  const diffMs = now - lastSyncAt.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return t('home.kpi.now');
  }
  if (minutes < 60) {
    return t('home.kpi.minutesAgo', { count: minutes });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t('home.kpi.hoursAgo', { count: hours });
  }
  const days = Math.floor(hours / 24);
  return t('home.kpi.daysAgo', { count: days });
}

interface NavLike {
  dispatch: (action: ReturnType<typeof CommonActions.navigate>) => void;
}

export function HomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NavLike>();

  const user = useAuthStore((s) => s.user);
  const isDevBypass = useAuthStore((s) => s.isDevBypass);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const triggerSync = useSyncStore((s) => s.triggerSync);

  const [todayReadings, setTodayReadings] = useState<number>(0);
  const [todayBonds, setTodayBonds] = useState<number>(0);
  const [tick, setTick] = useState<number>(Date.now());

  const branchNumber = useMemo(() => getBranchNumber(), []);
  const todayLabel = useMemo(() => formatTodayArabic(), []);
  const displayName = user?.name ?? user?.username ?? '';

  // DB observables for today's counts.
  useEffect(() => {
    const start = startOfTodayMs();
    const readingsSub: Subscription = database.collections
      .get('readings')
      .query(Q.where('created_at', Q.gte(start)))
      .observeCount()
      .subscribe((c) => setTodayReadings(c));
    const bondsSub: Subscription = database.collections
      .get('bonds')
      .query(Q.where('created_at', Q.gte(start)))
      .observeCount()
      .subscribe((c) => setTodayBonds(c));
    return () => {
      readingsSub.unsubscribe();
      bondsSub.unsubscribe();
    };
  }, []);

  // Re-render the relative-time label every minute.
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const lastSyncLabel = useMemo(
    () => relativeLastSync({ lastSyncAt, now: tick, t }),
    [lastSyncAt, tick, t],
  );

  const onRefresh = async (): Promise<void> => {
    await triggerSync();
  };

  const goReadings = (): void => {
    navigation.dispatch(CommonActions.navigate({ name: 'Readings' }));
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('navigation.tabs.home')} showMenu />

      {/* Dev mode banner — sticky-ish indicator that the entire dataset
          on this device is mock. Tap-targets the menu drawer's "تسجيل
          الخروج" implicitly (operator just logs out to leave dev mode). */}
      {isDevBypass ? (
        <View
          style={[
            styles.devBanner,
            { backgroundColor: colors.warning, borderColor: colors.warningSoft },
          ]}
        >
          <Text style={[styles.devBannerText, { color: colors.textOnBrand }]}>
            {t('common.devModeBanner')}
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Welcome card */}
        <View
          style={[
            styles.welcomeCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Image source={LOGO} style={styles.welcomeLogo} resizeMode="contain" />
          <View style={styles.welcomeText}>
            <Text
              style={[styles.welcomeName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {t('home.welcome', { name: displayName })}
            </Text>
            <Text
              style={[styles.welcomeSub, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {t('home.branch', { branch: branchNumber })} • {todayLabel}
            </Text>
          </View>
        </View>

        {/* KPI grid (2x2) */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiHalf}>
            <KpiCard
              title={t('home.kpi.todayReadings')}
              value={todayReadings}
              icon="zap"
              accentColor={colors.success}
            />
          </View>
          <View style={styles.kpiHalf}>
            <KpiCard
              title={t('home.kpi.todayBonds')}
              value={todayBonds}
              icon="file-text"
              accentColor={colors.info}
            />
          </View>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpiHalf}>
            <KpiCard
              title={t('home.kpi.pending')}
              value={pendingCount}
              icon="clock"
              accentColor={colors.warning}
            />
          </View>
          <View style={styles.kpiHalf}>
            <KpiCard
              title={t('home.kpi.lastSync')}
              value={lastSyncLabel}
              icon="refresh-cw"
              accentColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Primary CTA */}
        <View style={styles.cta}>
          <PrimaryButton
            title={t('home.startTour')}
            onPress={goReadings}
          />
        </View>

        {/* Recent activity placeholder (Wave 4 will populate). */}
        <View
          style={[
            styles.activityCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.activityTitle, { color: colors.textPrimary }]}
          >
            {t('home.recentActivity')}
          </Text>
          <Text
            style={[styles.activityEmpty, { color: colors.textTertiary }]}
          >
            {t('home.noActivity')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activityCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    marginTop: 8,
    padding: 16,
  },
  devBanner: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  devBannerText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  activityEmpty: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'right',
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  cta: {
    marginTop: 16,
  },
  flex: { flex: 1 },
  kpiHalf: {
    flex: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  scroll: {
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  welcomeCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  welcomeLogo: {
    height: 44,
    width: 44,
  },
  welcomeName: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  welcomeSub: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  welcomeText: {
    flex: 1,
  },
});
