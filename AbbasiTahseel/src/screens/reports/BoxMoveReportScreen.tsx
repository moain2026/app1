/**
 * BoxMoveReportScreen — "حركة الصندوق" (daily cashbox movements).
 *
 * One row per day = receipts – payments = net.
 * Backed by the future GetRepBoxMove endpoint.
 *
 * Wave 6-Α — UI skeleton (mock rows from MOCK_BOX_MOVES).
 *
 * TODO Wave 6-Β:
 *   • Replace MOCK_BOX_MOVES with aggregated WatermelonDB query.
 *   • Add tap-on-row → navigate to BoxMoveDetailsReport for that date.
 *   • Add total row.
 *   • Wire export-PDF + print actions.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ReportScreenLayout } from '@/components/reports/ReportScreenLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Card } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { MOCK_BOX_MOVES } from '@/mocks';
import type { MainStackParamList } from '@/navigation/types';

export function BoxMoveReportScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const totalNet = MOCK_BOX_MOVES.reduce((s, r) => s + r.net, 0);

  return (
    <ReportScreenLayout
      title={t('reports.entries.BoxMoveReport.title')}
      subtitle={t('reports.entries.BoxMoveReport.subtitle')}
      summary={
        <Card variant="outlined" style={styles.kpi}>
          <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>
            {t('reports.kpi.netMovement')}
          </Text>
          <Text
            style={[
              styles.kpiValue,
              { color: totalNet >= 0 ? colors.success : colors.danger },
            ]}
          >
            {totalNet.toLocaleString('en-US')} ر.ي
          </Text>
          <Text style={[styles.kpiHint, { color: colors.textTertiary }]}>
            {MOCK_BOX_MOVES.length} {t('reports.kpi.daysCovered')}
          </Text>
        </Card>
      }
    >
      <ReportTable
        data={MOCK_BOX_MOVES}
        keyExtractor={(r) => r.date}
        columns={[
          {
            key: 'date',
            label: t('reports.columns.date'),
            width: 110,
            render: (r) => (
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 12,
                  fontWeight: '700',
                  textDecorationLine: 'underline',
                }}
                onPress={() =>
                  navigation.navigate('BoxMoveDetailsReport', { date: r.date })
                }
              >
                {r.date}
              </Text>
            ),
          },
          {
            key: 'rec',
            label: t('reports.columns.receipts'),
            width: 110,
            render: (r) => (
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>
                {r.receipts.toLocaleString('en-US')}
              </Text>
            ),
          },
          {
            key: 'pay',
            label: t('reports.columns.payments'),
            width: 110,
            render: (r) => (
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>
                {r.payments.toLocaleString('en-US')}
              </Text>
            ),
          },
          {
            key: 'net',
            label: t('reports.columns.net'),
            width: 110,
            render: (r) => (
              <Text
                style={{
                  color: r.net >= 0 ? colors.success : colors.danger,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {r.net.toLocaleString('en-US')}
              </Text>
            ),
          },
        ]}
      />

      <View style={styles.hint}>
        <Text style={[styles.hintText, { color: colors.textTertiary }]}>
          {t('reports.hints.tapDate')}
        </Text>
      </View>
    </ReportScreenLayout>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: spacing[2],
  },
  hintText: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  kpi: {
    marginBottom: spacing[2],
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
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
});
