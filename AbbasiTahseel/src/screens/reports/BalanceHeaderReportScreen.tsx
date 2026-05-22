/**
 * BalanceHeaderReportScreen — "ميزان عام".
 *
 * Lists every account with its current balance at a chosen cut-off date.
 * Backed by the future GetRepBalanceHeader endpoint.
 *
 * Wave 6-Α — UI skeleton (mock rows from MOCK_BALANCE_HEADER).
 *
 * TODO Wave 6-Β:
 *   • Replace MOCK_BALANCE_HEADER with WatermelonDB query.
 *   • Wire currency filter via CurrencyPicker.
 *   • Wire account-filter via AccountPicker (optional subset).
 *   • Implement export-PDF + print actions.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ReportScreenLayout } from '@/components/reports/ReportScreenLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Card } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { MOCK_BALANCE_HEADER } from '@/mocks';

export function BalanceHeaderReportScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // ─── Derive summary KPIs from mock dataset ───────────────────
  const totalAccounts = MOCK_BALANCE_HEADER.length;
  const totalBalance = MOCK_BALANCE_HEADER.reduce(
    (s, r) => s + r.balance,
    0,
  );

  return (
    <ReportScreenLayout
      title={t('reports.entries.BalanceHeaderReport.title')}
      subtitle={t('reports.entries.BalanceHeaderReport.subtitle')}
      summary={
        <View style={styles.summaryRow}>
          <Card variant="outlined" style={styles.kpi}>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
              {t('reports.kpi.accounts')}
            </Text>
            <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
              {totalAccounts}
            </Text>
          </Card>
          <Card variant="outlined" style={styles.kpi}>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
              {t('reports.kpi.totalBalance')}
            </Text>
            <Text style={[styles.kpiValue, { color: colors.accent }]}>
              {totalBalance.toLocaleString('en-US')} ر.ي
            </Text>
          </Card>
        </View>
      }
    >
      <ReportTable
        data={MOCK_BALANCE_HEADER}
        keyExtractor={(r) => String(r.accountId)}
        columns={[
          { key: 'num', label: t('reports.columns.accountNum'), width: 70, accessor: (r) => r.accountNum },
          { key: 'name', label: t('reports.columns.accountName'), width: 180, accessor: (r) => r.accountName },
          { key: 'place', label: t('reports.columns.place'), width: 130, accessor: (r) => r.placeName },
          {
            key: 'balance',
            label: t('reports.columns.balance'),
            width: 120,
            render: (r) => (
              <Text
                style={{
                  color: r.balance >= 0 ? colors.danger : colors.success,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {r.balance.toLocaleString('en-US')} {r.currencySymbol}
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
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
});
