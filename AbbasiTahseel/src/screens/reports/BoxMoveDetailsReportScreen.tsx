/**
 * BoxMoveDetailsReportScreen — "تفاصيل حركة الصندوق" for a specific date.
 *
 * Lists every individual bond (receipt + payment) that hit the cashbox on
 * the chosen date. Backed by the future GetRepBoxMoveDetails endpoint.
 *
 * Wave 6-Α — UI skeleton (reuses MOCK_BONDS_HEADER as a stand-in dataset).
 *
 * TODO Wave 6-Β:
 *   • Replace dataset with WatermelonDB query filtered by date param.
 *   • Add running cashbox balance column.
 *   • Wire export-PDF + print actions.
 */

import { useRoute, type RouteProp } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ReportScreenLayout } from '@/components/reports/ReportScreenLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Card } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { MOCK_BONDS_HEADER } from '@/mocks';
import type { MainStackParamList } from '@/navigation/types';

export function BoxMoveDetailsReportScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute<RouteProp<MainStackParamList, 'BoxMoveDetailsReport'>>();
  const date = route.params?.date ?? '2026-05-22';

  const total = MOCK_BONDS_HEADER.reduce(
    (s, b) => (b.type === 'receipt' ? s + b.amount : s - b.amount),
    0,
  );

  return (
    <ReportScreenLayout
      title={t('reports.entries.BoxMoveDetailsReport.title')}
      subtitle={t('reports.entries.BoxMoveDetailsReport.subtitle')}
      showPeriod={false}
      summary={
        <Card variant="outlined" style={styles.kpi}>
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
              {t('reports.kpi.date')}
            </Text>
            <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
              {date}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
              {t('reports.kpi.netMovement')}
            </Text>
            <Text
              style={[
                styles.dateValue,
                { color: total >= 0 ? colors.success : colors.danger },
              ]}
            >
              {total.toLocaleString('en-US')} ر.ي
            </Text>
          </View>
        </Card>
      }
    >
      <ReportTable
        data={MOCK_BONDS_HEADER}
        keyExtractor={(r) => String(r.bondNo)}
        columns={[
          { key: 'no', label: t('reports.columns.bondNo'), width: 70, accessor: (r) => `#${r.bondNo}` },
          { key: 'account', label: t('reports.columns.accountName'), width: 180, accessor: (r) => r.accountName },
          {
            key: 'type',
            label: t('reports.columns.type'),
            width: 70,
            render: (r) => (
              <Text
                style={{
                  color: r.type === 'receipt' ? colors.success : colors.danger,
                  fontSize: 11,
                  fontWeight: '700',
                }}
              >
                {r.type === 'receipt'
                  ? t('bonds.types.receipt')
                  : t('bonds.types.payment')}
              </Text>
            ),
          },
          {
            key: 'amt',
            label: t('reports.columns.amount'),
            width: 120,
            render: (r) => (
              <Text
                style={{
                  color: r.type === 'receipt' ? colors.success : colors.danger,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {r.type === 'receipt' ? '+' : '−'}
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
  dateLabel: {
    fontSize: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  kpi: {
    marginBottom: spacing[2],
  },
});
