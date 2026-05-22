/**
 * BondsHeaderReportScreen — "تقرير السندات".
 *
 * Lists all bonds (receipt + payment) within a chosen date range.
 * Backed by the future GetRepBondsHeader endpoint.
 *
 * Wave 6-Α — UI skeleton (mock rows from MOCK_BONDS_HEADER).
 *
 * TODO Wave 6-Β:
 *   • Replace MOCK_BONDS_HEADER with WatermelonDB query.
 *   • Add filter by bond type (receipt / payment / both).
 *   • Add filter by currency.
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
import { MOCK_BONDS_HEADER } from '@/mocks';

export function BondsHeaderReportScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const receipts = MOCK_BONDS_HEADER.filter((b) => b.type === 'receipt');
  const payments = MOCK_BONDS_HEADER.filter((b) => b.type === 'payment');
  const totalReceipts = receipts.reduce((s, b) => s + b.amount, 0);
  const totalPayments = payments.reduce((s, b) => s + b.amount, 0);

  return (
    <ReportScreenLayout
      title={t('reports.entries.BondsHeaderReport.title')}
      subtitle={t('reports.entries.BondsHeaderReport.subtitle')}
      summary={
        <View style={styles.summaryRow}>
          <Card variant="outlined" style={styles.kpi}>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
              {t('reports.kpi.totalReceipts')}
            </Text>
            <Text style={[styles.kpiValue, { color: colors.success }]}>
              {totalReceipts.toLocaleString('en-US')} ر.ي
            </Text>
            <Text style={[styles.kpiHint, { color: colors.textTertiary }]}>
              {receipts.length} {t('reports.kpi.bondCount')}
            </Text>
          </Card>
          <Card variant="outlined" style={styles.kpi}>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
              {t('reports.kpi.totalPayments')}
            </Text>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>
              {totalPayments.toLocaleString('en-US')} ر.ي
            </Text>
            <Text style={[styles.kpiHint, { color: colors.textTertiary }]}>
              {payments.length} {t('reports.kpi.bondCount')}
            </Text>
          </Card>
        </View>
      }
    >
      <ReportTable
        data={MOCK_BONDS_HEADER}
        keyExtractor={(r) => String(r.bondNo)}
        columns={[
          { key: 'no', label: t('reports.columns.bondNo'), width: 80, accessor: (r) => `#${r.bondNo}` },
          { key: 'date', label: t('reports.columns.date'), width: 100, accessor: (r) => r.date },
          { key: 'account', label: t('reports.columns.accountName'), width: 180, accessor: (r) => r.accountName },
          {
            key: 'type',
            label: t('reports.columns.type'),
            width: 80,
            render: (r) => (
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor:
                      r.type === 'receipt'
                        ? colors.successSoft
                        : colors.dangerSoft,
                  },
                ]}
              >
                <Text
                  style={{
                    color: r.type === 'receipt' ? colors.success : colors.danger,
                    fontSize: 10,
                    fontWeight: '700',
                  }}
                >
                  {r.type === 'receipt'
                    ? t('bonds.types.receipt')
                    : t('bonds.types.payment')}
                </Text>
              </View>
            ),
          },
          {
            key: 'amount',
            label: t('reports.columns.amount'),
            width: 110,
            render: (r) => (
              <Text
                style={{
                  color:
                    r.type === 'receipt' ? colors.success : colors.danger,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
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
  kpi: {
    flex: 1,
  },
  kpiHint: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  kpiLabel: {
    fontSize: 11,
    marginBottom: 2,
    textAlign: 'right',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
