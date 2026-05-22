/**
 * BalanceDetailsReportScreen — "كشف حساب تفصيلي".
 *
 * Shows the date-ordered ledger for ONE account (debit/credit/running
 * balance). Backed by the future GetRepBalanceDetailsByDate endpoint.
 *
 * Wave 6-Α — UI skeleton (mock rows from MOCK_BALANCE_DETAILS).
 *
 * TODO Wave 6-Β:
 *   • Require AccountPicker to be set before the table renders.
 *   • Replace MOCK_BALANCE_DETAILS with WatermelonDB query joined on bonds.
 *   • Add running-balance footer + opening-balance header row.
 *   • Wire export-PDF + print actions.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { AccountPicker } from '@/components/pickers';
import { ReportScreenLayout } from '@/components/reports/ReportScreenLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Card, FormField } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { MOCK_ACCOUNTS, MOCK_BALANCE_DETAILS, type MockAccount } from '@/mocks';

export function BalanceDetailsReportScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Default to first mock account so the report has something to show.
  const [account, setAccount] = useState<MockAccount | null>(
    MOCK_ACCOUNTS[0] ?? null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <ReportScreenLayout
      title={t('reports.entries.BalanceDetailsReport.title')}
      subtitle={t('reports.entries.BalanceDetailsReport.subtitle')}
      summary={
        <Card variant="outlined" style={styles.accountCard}>
          <FormField
            label={t('reports.fields.account')}
            value={account ? `${account.num} — ${account.name}` : ''}
            placeholder={t('pickers.account.searchPlaceholder')}
            readOnly
            onPress={() => setPickerOpen(true)}
            leadingIcon="user"
          />
          {account ? (
            <View style={styles.balanceLine}>
              <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>
                {t('reports.kpi.currentBalance')}
              </Text>
              <Text
                style={[
                  styles.balanceValue,
                  {
                    color:
                      account.balance >= 0 ? colors.danger : colors.success,
                  },
                ]}
              >
                {account.balance.toLocaleString('en-US')} ر.ي
              </Text>
            </View>
          ) : null}
        </Card>
      }
    >
      <ReportTable
        data={MOCK_BALANCE_DETAILS}
        keyExtractor={(r, i) => `${r.docNo}-${i}`}
        columns={[
          { key: 'date', label: t('reports.columns.date'), width: 100, accessor: (r) => r.date },
          { key: 'doc', label: t('reports.columns.docNo'), width: 100, accessor: (r) => r.docNo },
          { key: 'desc', label: t('reports.columns.description'), width: 170, accessor: (r) => r.description },
          {
            key: 'debit',
            label: t('reports.columns.debit'),
            width: 90,
            render: (r) => (
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>
                {r.debit > 0 ? r.debit.toLocaleString('en-US') : '—'}
              </Text>
            ),
          },
          {
            key: 'credit',
            label: t('reports.columns.credit'),
            width: 90,
            render: (r) => (
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>
                {r.credit > 0 ? r.credit.toLocaleString('en-US') : '—'}
              </Text>
            ),
          },
          {
            key: 'bal',
            label: t('reports.columns.balance'),
            width: 100,
            render: (r) => (
              <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                {r.balance.toLocaleString('en-US')}
              </Text>
            ),
          },
        ]}
      />

      <AccountPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(a) => {
          setAccount(a);
          setPickerOpen(false);
        }}
      />
    </ReportScreenLayout>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    marginBottom: spacing[2],
  },
  balanceLabel: {
    fontSize: 12,
  },
  balanceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
