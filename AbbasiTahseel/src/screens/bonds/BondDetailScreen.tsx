/**
 * BondDetailScreen — view-only detail of a single bond.
 *
 * Wave 6-Β — wired to WatermelonDB:
 *   • `observeBondByUuid(localUuid)` — reactive single-row observable.
 *     Re-emits when the bond row updates (e.g. a new payment lands and
 *     `amount_paid` is recomputed) OR when the row is destroyed
 *     (emits `null`, which is rendered as the "not found" state).
 *   • `observePaymentsByBond(bond.id)` — reactive child list, sorted
 *     `payment_date ASC`. Note we pass the WMDB **local id** (`bond.id`)
 *     here, NOT the `localUuid` — `bond_payments.bond_id` is the WMDB
 *     id FK (set by the seeder during the two-phase write).
 *
 * Async loading state: WMDB observables emit `undefined` synchronously
 * on subscribe in some Hermes builds. We initialize the bond state to
 * `undefined` to mean "loading", reserve `null` for the resolved
 * "not found" sentinel, and only render the not-found banner once
 * we've received at least one emission with a null payload.
 *
 * Mutation paths (delete / edit / add-payment) still navigate to the
 * existing forms which remain on MOCK data. Wave 6-Γ will wire them.
 */

import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Subscription } from 'rxjs';
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
import type { Bond } from '@/database/models/Bond';
import type { BondPayment } from '@/database/models/BondPayment';
import type { Currency } from '@/database/models/Currency';
import type { MainStackParamList } from '@/navigation/types';
import {
  findCurrencyByRemoteId,
  observeBondByUuid,
  observePaymentsByBond,
} from '@/services/repository';

type Route = RouteProp<MainStackParamList, 'BondDetail'>;

/**
 * Map WMDB `sync_status` to the 3-state union used by the card UI.
 * pristine + syncing render as "no badge" (synced).
 */
function mapSyncStatus(pushStatus: string): 'synced' | 'dirty' | 'failed' {
  if (pushStatus === 'dirty') return 'dirty';
  if (pushStatus === 'failed') return 'failed';
  return 'synced';
}

export function BondDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  // undefined = loading, null = resolved not-found, Bond = resolved found
  const [bond, setBond] = useState<Bond | null | undefined>(undefined);
  const [payments, setPayments] = useState<BondPayment[]>([]);
  const [currency, setCurrency] = useState<Currency | null>(null);

  // ── Bond observable (reactive single-row) ─────────────────────────
  useEffect(() => {
    let sub: Subscription | null = null;
    sub = observeBondByUuid(route.params.localUuid).subscribe({
      next: (row) => setBond(row),
      error: () => setBond(null),
    });
    return () => {
      if (sub != null) sub.unsubscribe();
    };
  }, [route.params.localUuid]);

  // ── Payments observable (depends on resolved bond.id) ─────────────
  useEffect(() => {
    if (bond == null) {
      setPayments([]);
      return;
    }
    let sub: Subscription | null = null;
    sub = observePaymentsByBond(bond.id).subscribe({
      next: (rows) => setPayments(rows),
      error: () => setPayments([]),
    });
    return () => {
      if (sub != null) sub.unsubscribe();
    };
  }, [bond]);

  // ── Currency lookup (one-shot fetch — small table, no need to
  //     subscribe; symbol almost never changes mid-session) ──────────
  useEffect(() => {
    if (bond == null || bond.currencyId == null) {
      setCurrency(null);
      return;
    }
    let cancelled = false;
    findCurrencyByRemoteId(bond.currencyId).then(
      (c) => {
        if (!cancelled) setCurrency(c);
      },
      () => {
        if (!cancelled) setCurrency(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bond]);

  // ── Loading state ─────────────────────────────────────────────────
  if (bond === undefined) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <AppHeader title={t('bonds.detail.title')} showBack />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.brandSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Not-found state ───────────────────────────────────────────────
  if (bond === null) {
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

  // ── Resolved bond — derive view values ────────────────────────────
  const remaining = bond.amount - bond.amountPaid;
  const syncStatus = mapSyncStatus(bond.pushStatus);
  const currencySymbol = currency?.symbol ?? currency?.code ?? '?';
  const bondDateText = bond.bondDate.toISOString().slice(0, 10);
  const bondTypeLabel: 'receipt' | 'payment' =
    bond.bondType === 'payment' ? 'payment' : 'receipt';

  const handlePrint = (): void => {
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
            // TODO Wave 6-Γ: bondsRepository.delete(bond.localUuid)
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

      {syncStatus === 'failed' && bond.lastError ? (
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
                {bondDateText}
              </Text>
            </View>
            <View
              style={[
                styles.typePill,
                {
                  backgroundColor:
                    bondTypeLabel === 'receipt'
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
                      bondTypeLabel === 'receipt'
                        ? colors.success ?? '#1A7F3D'
                        : colors.danger ?? '#C41E24',
                  },
                ]}
              >
                {t(`bonds.types.${bondTypeLabel}`)}
              </Text>
            </View>
          </View>
        </Card>

        {/* ACCOUNT CARD */}
        <SectionHeader title={t('bonds.detail.accountSection')} icon="user" />
        <Card>
          <Row
            label={t('bonds.detail.accountName')}
            value={bond.accountName ?? '—'}
          />
          <Row
            label={t('bonds.detail.accountNum')}
            value={bond.accountId != null ? String(bond.accountId) : '—'}
          />
        </Card>

        {/* AMOUNT CARD */}
        <SectionHeader
          title={t('bonds.detail.amountSection')}
          icon="dollar-sign"
        />
        <Card>
          <Row
            label={t('bonds.detail.amount')}
            value={`${bond.amount.toLocaleString('ar-EG')} ${currencySymbol}`}
            emphasis
          />
          <Row
            label={t('bonds.detail.amountPaid')}
            value={`${bond.amountPaid.toLocaleString('ar-EG')} ${currencySymbol}`}
          />
          {remaining > 0 ? (
            <Row
              label={t('bonds.detail.remaining')}
              value={`${remaining.toLocaleString('ar-EG')} ${currencySymbol}`}
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
          payments.map((p) => {
            const pSyncStatus = mapSyncStatus(p.pushStatus);
            const pDate = p.paymentDate.toISOString().slice(0, 10);
            return (
              <Card key={p.id} variant="outlined" style={styles.paymentCard}>
                <View style={styles.paymentRow}>
                  <Text style={[styles.paymentNo, { color: colors.textSecondary }]}>
                    #{p.bondNo}
                  </Text>
                  <View style={styles.paymentBody}>
                    <Text
                      style={[styles.paymentAmount, { color: colors.textPrimary }]}
                    >
                      {p.amount.toLocaleString('ar-EG')} {currencySymbol}
                    </Text>
                    <Text style={[styles.paymentMeta, { color: colors.textTertiary }]}>
                      {pDate}
                      {p.notes ? ` · ${p.notes}` : ''}
                    </Text>
                  </View>
                  {pSyncStatus !== 'synced' ? (
                    <View
                      style={[
                        styles.syncDot,
                        {
                          backgroundColor:
                            pSyncStatus === 'failed'
                              ? colors.danger ?? '#C41E24'
                              : colors.warning ?? '#E67E22',
                        },
                      ]}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })
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
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
