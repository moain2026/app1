/**
 * ExpensesReportScreen — "المصروفات اليومية".
 *
 * Lists day-level expenses (fuel, maintenance, office supplies, ...).
 * Backed by the future GetRepExpenses endpoint.
 *
 * Wave 6-Α — UI skeleton (mock rows from MOCK_EXPENSES).
 *
 * TODO Wave 6-Β:
 *   • Replace MOCK_EXPENSES with WatermelonDB query.
 *   • Optional FAB → add expense form (new endpoint TBD with backend team).
 *   • Per-category subtotals.
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
import { MOCK_EXPENSES } from '@/mocks';

const CATEGORY_COLOR: Record<string, string> = {
  وقود: '#BF360C',
  صيانة: '#0D47A1',
  مكتبية: '#33691E',
  أخرى: '#4A148C',
};

export function ExpensesReportScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const total = MOCK_EXPENSES.reduce((s, r) => s + r.amount, 0);
  const byCategory = MOCK_EXPENSES.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + r.amount;
      return acc;
    },
    {},
  );

  return (
    <ReportScreenLayout
      title={t('reports.entries.ExpensesReport.title')}
      subtitle={t('reports.entries.ExpensesReport.subtitle')}
      summary={
        <View>
          <Card variant="outlined" style={styles.totalCard}>
            <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>
              {t('reports.kpi.totalExpenses')}
            </Text>
            <Text style={[styles.totalValue, { color: colors.danger }]}>
              {total.toLocaleString('en-US')} ر.ي
            </Text>
          </Card>
          <View style={styles.chips}>
            {Object.entries(byCategory).map(([cat, sum]) => (
              <View
                key={cat}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: CATEGORY_COLOR[cat] ?? colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: CATEGORY_COLOR[cat] ?? colors.textPrimary,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {cat}: {sum.toLocaleString('en-US')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      }
    >
      <ReportTable
        data={MOCK_EXPENSES}
        keyExtractor={(r, i) => `${r.date}-${i}`}
        columns={[
          { key: 'date', label: t('reports.columns.date'), width: 100, accessor: (r) => r.date },
          {
            key: 'cat',
            label: t('reports.columns.category'),
            width: 90,
            render: (r) => (
              <Text
                style={{
                  color: CATEGORY_COLOR[r.category] ?? colors.textPrimary,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {r.category}
              </Text>
            ),
          },
          { key: 'desc', label: t('reports.columns.description'), width: 180, accessor: (r) => r.description },
          {
            key: 'amt',
            label: t('reports.columns.amount'),
            width: 110,
            render: (r) => (
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>
                {r.amount.toLocaleString('en-US')} ر.ي
              </Text>
            ),
          },
        ]}
      />
    </ReportScreenLayout>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  totalCard: {
    marginBottom: spacing[2],
  },
  totalLabel: {
    fontSize: 11,
    marginBottom: 2,
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
  },
});
