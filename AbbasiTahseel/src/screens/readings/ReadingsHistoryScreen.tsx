/**
 * ReadingsHistoryScreen — historical (multi-month) view of one subscriber's
 * readings.
 *
 * Reached from `navigation.navigate('ReadingsHistory', { num })`.
 *
 * Layout:
 *   • AppHeader (showBack) with subscriber name.
 *   • Header card: account num + name + alias + place/book/group meta.
 *   • Chart placeholder (Wave 6-Β: real Victory-Native line chart).
 *   • Table of past N months: month/ks/kh/cas/avg.
 *
 * Wave 6-Α — UI skeleton (data from getReadingsByAccount()).
 *
 * Wave 6-Β — partial wire to WatermelonDB:
 *   • Subscriber lookup (`account`) now subscribes to
 *     `observeAccountByCode(num)` so any sync/seed update reflects live.
 *   • The historical readings table (`history`) remains on the static
 *     MOCK fixture because Wave 6-Β does NOT introduce a monthly-rollup
 *     aggregation table — the live `readings` collection holds one row
 *     per (account, month) but lacks the cas/asts columns needed for
 *     this view. Wave 6-Γ will replace it with a real query joined on
 *     the rollup table once the WCF aggregation endpoint is finalized.
 *
 * TODO Wave 6-Γ:
 *   • Replace `getReadingsByAccount` with a WatermelonDB rollup query.
 *   • Render a real consumption line chart.
 *   • Wire print action to PrinterService.printConsumptionHistory().
 *   • Add date-range filter.
 */

import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Subscription } from 'rxjs';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { ReportTable } from '@/components/reports/ReportTable';
import {
  Card,
  EmptyState,
  MockBanner,
  SectionHeader,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import type { Account } from '@/database/models/Account';
import { getReadingsByAccount } from '@/mocks';
import type { MockAccount } from '@/mocks/accounts';
import type { MainStackParamList } from '@/navigation/types';
import { observeAccountByCode } from '@/services/repository';
import { toMockAccount } from '@/services/repository/viewModels';

export function ReadingsHistoryScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute<RouteProp<MainStackParamList, 'ReadingsHistory'>>();
  const num = route.params?.num ?? '0001';

  // undefined = loading, null = resolved not-found, MockAccount = resolved.
  const [account, setAccount] = useState<MockAccount | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let sub: Subscription | null = null;
    sub = observeAccountByCode(num).subscribe({
      next: (row: Account | null) => {
        setAccount(row != null ? toMockAccount(row) : null);
      },
      error: () => setAccount(null),
    });
    return () => {
      if (sub != null) sub.unsubscribe();
    };
  }, [num]);

  // Reading history stays on the MOCK fixture for Wave 6-Β — see file
  // header for rationale + Wave 6-Γ TODO.
  const history = useMemo(() => getReadingsByAccount(num), [num]);

  // ─── Loading (waiting on first DB emission) ──────────────────
  if (account === undefined) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <AppHeader title={t('readings.history.title')} showBack />
        <MockBanner />
      </SafeAreaView>
    );
  }

  // ─── Empty (subscriber not found) ────────────────────────────
  if (account === null) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <AppHeader title={t('readings.history.title')} showBack />
        <MockBanner />
        <EmptyState
          icon="user-x"
          title={t('readings.history.notFoundTitle')}
          subtitle={t('readings.history.notFoundSubtitle')}
        />
      </SafeAreaView>
    );
  }

  // ─── Derive simple consumption stats ─────────────────────────
  const consumptions = history.map((h) => h.cas);
  const avg =
    consumptions.length > 0
      ? Math.round(consumptions.reduce((s, c) => s + c, 0) / consumptions.length)
      : 0;
  const max = consumptions.length > 0 ? Math.max(...consumptions) : 0;
  const min = consumptions.length > 0 ? Math.min(...consumptions) : 0;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('readings.history.title')} showBack />
      <MockBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ─── Subscriber header ──────────────────────────────── */}
        <Card variant="outlined" style={styles.subHeader}>
          <View style={styles.subHeaderTop}>
            <Feather name="user" size={20} color={colors.brandSecondary} />
            <View style={styles.subHeaderBody}>
              <Text
                style={[styles.subTitle, { color: colors.textPrimary }]}
              >
                {account.name}
              </Text>
              <Text
                style={[styles.subAlias, { color: colors.textTertiary }]}
              >
                {account.nameT ?? '—'}
              </Text>
            </View>
            <View
              style={[
                styles.numPill,
                { backgroundColor: colors.brandPrimarySoft },
              ]}
            >
              <Text style={[styles.numText, { color: colors.brandSecondary }]}>
                #{account.num}
              </Text>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>
              {t('readings.history.place')}
            </Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
              {account.placeName ?? '—'}
            </Text>
          </View>
        </Card>

        {/* ─── Consumption KPIs ───────────────────────────────── */}
        <View style={styles.kpiRow}>
          <Card variant="outlined" style={styles.kpi}>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
              {t('readings.history.avg')}
            </Text>
            <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
              {avg}
            </Text>
          </Card>
          <Card variant="outlined" style={styles.kpi}>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
              {t('readings.history.max')}
            </Text>
            <Text style={[styles.kpiValue, { color: colors.warning }]}>
              {max}
            </Text>
          </Card>
          <Card variant="outlined" style={styles.kpi}>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
              {t('readings.history.min')}
            </Text>
            <Text style={[styles.kpiValue, { color: colors.success }]}>
              {min}
            </Text>
          </Card>
        </View>

        {/* ─── Chart placeholder (Wave 6-Β) ───────────────────── */}
        <Card variant="outlined" style={styles.chartCard}>
          <View style={styles.chartPlaceholder}>
            <Feather name="trending-up" size={32} color={colors.textTertiary} />
            <Text style={[styles.chartHint, { color: colors.textTertiary }]}>
              {t('readings.history.chartPlaceholder')}
            </Text>
          </View>
        </Card>

        {/* ─── History table ──────────────────────────────────── */}
        <SectionHeader title={t('readings.history.tableTitle')} />

        <ReportTable
          data={history}
          keyExtractor={(r) => r.updatedAt}
          columns={[
            { key: 'date', label: t('readings.history.col.date'), width: 110, accessor: (r) => r.updatedAt.slice(0, 10) },
            { key: 'ks', label: t('readings.history.col.previous'), width: 90, accessor: (r) => r.ks },
            { key: 'kh', label: t('readings.history.col.current'), width: 90, accessor: (r) => r.kh ?? '—' },
            {
              key: 'cas',
              label: t('readings.history.col.consumption'),
              width: 100,
              render: (r) => (
                <Text
                  style={{
                    color:
                      r.cas > r.asts ? colors.warning : colors.textPrimary,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {r.cas}
                </Text>
              ),
            },
            { key: 'asts', label: t('readings.history.col.avg'), width: 80, accessor: (r) => r.asts },
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    marginVertical: spacing[3],
  },
  chartHint: {
    fontSize: 11,
    textAlign: 'center',
  },
  chartPlaceholder: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[5],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing[3],
  },
  flex: { flex: 1 },
  kpi: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    textAlign: 'right',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'right',
  },
  metaLabel: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  numPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  numText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  subAlias: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  subHeader: {
    marginBottom: spacing[2],
  },
  subHeaderBody: {
    flex: 1,
  },
  subHeaderTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
});
