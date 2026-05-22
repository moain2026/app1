/**
 * BondDetailScreen — view-only detail of a single bond.
 *
 * Reachable via `navigation.navigate('BondDetail', { localUuid })`.
 * Shows:
 *   • Bond header card (no, type, status badge)
 *   • Account info card (name, num, current balance — mock)
 *   • Amount card (amount, paid, remaining, currency)
 *   • Notes card (if any)
 *   • Payments list (child entity) with "+ دفعة جديدة" CTA
 *   • Bottom action bar: [طباعة] [تعديل] [حذف]
 *
 * TODO (Wave 6-Β):
 *   • Replace `findMockBond` with `useBond(localUuid)` (Zustand selector
 *     wired to WatermelonDB).
 *   • Wire `طباعة` to `printerStore.printBondReceipt(bond)`.
 *   • Wire `حذف` to `bondsRepository.delete(localUuid)` (with confirm dialog).
 *   • Wire `تعديل` to `BondEdit` route (currently exists, points at same
 *     form as BondCreate).
 *
 * Wave 6-Α — UI skeleton.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import {
  Card,
  ErrorBanner,
  MockBanner,
  SecondaryButton,
  SectionHeader,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { findBondPayments } from '@/mocks/bondPayments';
import { findMockBond } from '@/mocks/bonds';
import type { MainStackParamList } from '@/navigation/types';

type Route = RouteProp<MainStackParamList, 'BondDetail'>;

export function BondDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const bond = findMockBond(route.params.localUuid);
  const payments = bond ? findBondPayments(bond.localUuid) : [];

  if (!bond) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <AppHeader title={t('bonds.detail.title')} showBack />
        <ErrorBanner message={t('bonds.detail.notFound')} variant="error" />
      </SafeAreaView>
    );
  }

  const remaining = bond.amount - bond.amountPaid;

  const handlePrint = (): void => {
    // TODO Wave 6-Β: route through printerStore.printBondReceipt(bond)
    Alert.alert(t('bonds.detail.print'), t('bonds.detail.printSoon'));
  };

  const handleEdit = (): void => {
    navigation.navigate('BondEdit', { localUuid: bond.localUuid });
  };

  const handleDelete = (): void => {
    Alert.alert(
      t('bonds.detail.deleteConfirmTitle'),
      t('bonds.detail.deleteConfirmMsg', { no: bond.bondNo }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            // TODO Wave 6-Β: bondsRepository.delete(bond.localUuid)
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleAddPayment = (): void => {
    navigation.navigate('BondPaymentCreate', { bondLocalUuid: bond.localUuid });
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('bonds.detail.title')} showBack />
      <MockBanner />

      {bond.syncStatus === 'failed' && bond.lastError ? (
        <ErrorBanner
          message={bond.lastError}
          variant="error"
          onRetry={() => Alert.alert(t('common.retry'), 'TODO')}
          retryLabel={t('common.retry')}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER CARD */}
        <Card>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.bondNo, { color: colors.textPrimary }]}>
                {t('bonds.detail.bondNo', { no: bond.bondNo })}
              </Text>
              <Text style={[styles.date, { color: colors.textTertiary }]}>
                {bond.bondDate}
              </Text>
            </View>
            <View
              style={[
                styles.typePill,
                {
                  backgroundColor:
                    bond.bondType === 'receipt'
                      ? colors.successSoft ?? '#E5F5EB'
                      : colors.dangerSoft ?? '#FDEAEB',
                },
              ]}
            >
              <Text
                style={[
                  styles.typePillText,
                  {
                    color:
                      bond.bondType === 'receipt'
                        ? colors.success ?? '#1A7F3D'
                        : colors.danger ?? '#C41E24',
                  },
                ]}
              >
                {t(`bonds.types.${bond.bondType}`)}
              </Text>
            </View>
          </View>
        </Card>

        {/* ACCOUNT CARD */}
        <SectionHeader title={t('bonds.detail.accountSection')} icon="user" />
        <Card>
          <Row label={t('bonds.detail.accountName')} value={bond.accountName} />
          <Row label={t('bonds.detail.accountNum')} value={bond.accountNum} />
        </Card>

        {/* AMOUNT CARD */}
        <SectionHeader
          title={t('bonds.detail.amountSection')}
          icon="dollar-sign"
        />
        <Card>
          <Row
            label={t('bonds.detail.amount')}
            value={`${bond.amount.toLocaleString('ar-EG')} ${bond.currencySymbol}`}
            emphasis
          />
          <Row
            label={t('bonds.detail.amountPaid')}
            value={`${bond.amountPaid.toLocaleString('ar-EG')} ${bond.currencySymbol}`}
          />
          {remaining > 0 ? (
            <Row
              label={t('bonds.detail.remaining')}
              value={`${remaining.toLocaleString('ar-EG')} ${bond.currencySymbol}`}
              valueColor={colors.warning ?? '#E67E22'}
              emphasis
            />
          ) : null}
        </Card>

        {/* NOTES CARD */}
        {bond.notes ? (
          <>
            <SectionHeader
              title={t('bonds.detail.notesSection')}
              icon="message-square"
            />
            <Card>
              <Text style={[styles.notesText, { color: colors.textPrimary }]}>
                {bond.notes}
              </Text>
            </Card>
          </>
        ) : null}

        {/* PAYMENTS LIST */}
        <SectionHeader
          title={t('bonds.detail.paymentsSection')}
          icon="credit-card"
          trailing={
            <SecondaryButton
              title={t('bonds.detail.addPayment')}
              icon="plus"
              variant="ghost"
              onPress={handleAddPayment}
            />
          }
        />
        {payments.length === 0 ? (
          <Card variant="outlined">
            <View style={styles.emptyPayments}>
              <Feather name="inbox" size={20} color={colors.textTertiary} />
              <Text
                style={[styles.emptyPaymentsText, { color: colors.textTertiary }]}
              >
                {t('bonds.detail.paymentsEmpty')}
              </Text>
            </View>
          </Card>
        ) : (
          payments.map((p) => (
            <Card key={p.localUuid} variant="outlined" style={styles.paymentCard}>
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentNo, { color: colors.textSecondary }]}>
                  #{p.paymentNo}
                </Text>
                <View style={styles.paymentBody}>
                  <Text
                    style={[styles.paymentAmount, { color: colors.textPrimary }]}
                  >
                    {p.amount.toLocaleString('ar-EG')} {bond.currencySymbol}
                  </Text>
                  <Text style={[styles.paymentMeta, { color: colors.textTertiary }]}>
                    {p.paymentDate} {p.notes ? `· ${p.notes}` : ''}
                  </Text>
                </View>
                {p.syncStatus !== 'synced' ? (
                  <View
                    style={[
                      styles.syncDot,
                      {
                        backgroundColor:
                          p.syncStatus === 'failed'
                            ? colors.danger ?? '#C41E24'
                            : colors.warning ?? '#E67E22',
                      },
                    ]}
                  />
                ) : null}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.actionBarRow}>
          <SecondaryButton
            title={t('common.delete')}
            icon="trash-2"
            variant="danger"
            onPress={handleDelete}
          />
          <SecondaryButton
            title={t('common.edit')}
            icon="edit-2"
            onPress={handleEdit}
          />
          <View style={styles.printBtn}>
            <PrimaryButton
              title={t('bonds.detail.print')}
              onPress={handlePrint}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Inline Row helper for label-value pairs inside Cards ─────────────────
interface RowProps {
  label: string;
  value: string;
  emphasis?: boolean;
  valueColor?: string;
}

function Row(props: RowProps): React.JSX.Element {
  const { label, value, emphasis, valueColor } = props;
  const { colors } = useTheme();
  return (
    <View style={styles.dataRow}>
      <Text style={[styles.dataLabel, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.dataValue,
          {
            color: valueColor ?? colors.textPrimary,
            fontWeight: emphasis ? '800' : '600',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  actionBarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  bondNo: {
    fontSize: 20,
    fontWeight: '800',
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  dataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  dataValue: {
    fontSize: 14,
    textAlign: 'left',
  },
  date: {
    fontSize: 12,
    marginTop: spacing[1],
  },
  emptyPayments: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  emptyPaymentsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  flex: { flex: 1 },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentBody: {
    flex: 1,
  },
  paymentCard: {
    marginBottom: spacing[2],
    padding: spacing[3],
  },
  paymentMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  paymentNo: {
    fontSize: 12,
    fontWeight: '700',
    marginEnd: spacing[3],
  },
  paymentRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  printBtn: {
    flex: 1,
  },
  scroll: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  syncDot: {
    borderRadius: 4,
    height: 8,
    marginStart: spacing[2],
    width: 8,
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
