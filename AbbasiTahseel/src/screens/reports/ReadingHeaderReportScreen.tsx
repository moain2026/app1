/**
 * ReadingHeaderReportScreen — "تقرير الاستهلاك الإجمالي".
 *
 * Per area + book + group, shows subscriber counts (total / posted /
 * pending) and aggregate consumption. Backed by the future
 * GetRepReadingHeader endpoint.
 *
 * Wave 6-Α — UI skeleton (mock rows from MOCK_READING_HEADER).
 *
 * TODO Wave 6-Β:
 *   • Replace MOCK_READING_HEADER with aggregated WatermelonDB query.
 *   • Add filter by place + book + group (uses GetListGroup/Places).
 *   • Add overall summary footer.
 *   • Wire export-PDF + print actions.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ReportScreenLayout } from '@/components/reports/ReportScreenLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Card } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { MOCK_READING_HEADER } from '@/mocks';

export function ReadingHeaderReportScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const totalSubs = MOCK_READING_HEADER.reduce(
    (s, r) => s + r.subscribersCount,
    0,
  );
  const totalPosted = MOCK_READING_HEADER.reduce(
    (s, r) => s + r.postedCount,
    0,
  );
  const totalPending = MOCK_READING_HEADER.reduce(
    (s, r) => s + r.pendingCount,
    0,
  );
  const totalKwh = MOCK_READING_HEADER.reduce(
    (s, r) => s + r.totalConsumption,
    0,
  );
  const progressPct =
    totalSubs > 0 ? Math.round((totalPosted / totalSubs) * 100) : 0;

  return (
    <ReportScreenLayout
      title={t('reports.entries.ReadingHeaderReport.title')}
      subtitle={t('reports.entries.ReadingHeaderReport.subtitle')}
      showPeriod={false}
      summary={
        <View>
          <View style={styles.kpiRow}>
            <Card variant="outlined" style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
                {t('reports.kpi.totalSubscribers')}
              </Text>
              <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                {totalSubs}
              </Text>
            </Card>
            <Card variant="outlined" style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
                {t('reports.kpi.progress')}
              </Text>
              <Text style={[styles.kpiValue, { color: colors.success }]}>
                {progressPct}%
              </Text>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.success,
                      width: `${progressPct}%`,
                    },
                  ]}
                />
              </View>
            </Card>
          </View>
          <View style={styles.kpiRow}>
            <Card variant="outlined" style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
                {t('reports.kpi.totalConsumption')}
              </Text>
              <Text style={[styles.kpiValue, { color: colors.brandSecondary }]}>
                {totalKwh.toLocaleString('en-US')} {t('reports.kpi.kwhUnit')}
              </Text>
            </Card>
            <Card variant="outlined" style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
                {t('reports.kpi.pending')}
              </Text>
              <Text style={[styles.kpiValue, { color: colors.warning }]}>
                {totalPending}
              </Text>
            </Card>
          </View>
        </View>
      }
    >
      <ReportTable
        data={MOCK_READING_HEADER}
        keyExtractor={(r, i) => `${r.placeName}-${r.groupName}-${i}`}
        columns={[
          { key: 'place', label: t('reports.columns.place'), width: 140, accessor: (r) => r.placeName },
          { key: 'group', label: t('reports.columns.group'), width: 90, accessor: (r) => r.groupName },
          { key: 'subs', label: t('reports.columns.total'), width: 70, accessor: (r) => r.subscribersCount },
          {
            key: 'posted',
            label: t('reports.columns.posted'),
            width: 80,
            render: (r) => (
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>
                {r.postedCount}
              </Text>
            ),
          },
          {
            key: 'pending',
            label: t('reports.columns.pending'),
            width: 80,
            render: (r) => (
              <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '700' }}>
                {r.pendingCount}
              </Text>
            ),
          },
          {
            key: 'kwh',
            label: t('reports.columns.consumption'),
            width: 110,
            render: (r) => (
              <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                {r.totalConsumption.toLocaleString('en-US')}
              </Text>
            ),
          },
        ]}
      />
    </ReportScreenLayout>
  );
}

const styles = StyleSheet.create({
  kpi: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    marginBottom: 2,
    textAlign: 'right',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  progressBar: {
    borderRadius: 3,
    height: 6,
    marginTop: spacing[2],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
