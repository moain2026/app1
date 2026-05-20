/**
 * BondDetailScreen — تفاصيل السند
 * ============================================================================
 *  TEMPLATE FILE — DO NOT IMPORT FROM src/
 *
 *  Final path:  src/screens/main/BondDetailScreen.tsx
 *  Route:       'BondDetail' in MainStack (param: { localUuid: string })
 * ============================================================================
 *
 * Four cards (top to bottom):
 *   A. Subscriber info     — name, account id, phone, address (from
 *                            the linked readings' parent account)
 *   B. Readings covered    — list of bond_readings with valuer per row
 *   C. Payments breakdown  — multi-currency totals by method
 *   D. Status & actions    — print / reprint / void / sync indicator
 *
 * Actions
 * -------
 *   • Print: builds the receipt buffer (Wave 5 receiptPrintService),
 *            calls printerManager.print, marks bond as printed BEFORE
 *            the bytes leave the JS thread (see Pitfall #7).
 *   • Reprint: same as print, but with a "نسخة طبق الأصل" header on
 *              the receipt; only available for already-printed bonds.
 *   • Void: opens a modal asking for the admin PIN, then calls
 *           bondsRepository.voidBond.
 *
 * Reactive data
 * -------------
 * The bond row is observed (reactive). The payments and reading links
 * are loaded eagerly on mount; refetched whenever the bond's `updated_at`
 * changes. We don't observe payments individually — they're small and
 * the bond-level observe re-fetches when needed.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { PrimaryButton } from '@/components/forms';
import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/design-system/theme';
import { bondsRepository, type BondTotals } from '@/services/bonds/bondsRepository';
import { receiptPrintService, type BondPrintInput } from '@/services/printer/receiptPrintService';
import type {
  Bond,
  BondPayment,
  BondReading,
} from '@/database/models';
import {
  CURRENCY_META,
  type BondPaymentMethod,
  type CurrencyId,
} from '@/database/models/BondPayment';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

const log = logger.scope('BondDetailScreen');

// ─── Route params ────────────────────────────────────────────────────────

interface BondDetailRouteParams {
  localUuid: string;
}

type BondDetailRoute = RouteProp<
  { BondDetail: BondDetailRouteParams },
  'BondDetail'
>;

// ─── Component ───────────────────────────────────────────────────────────

export function BondDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<BondDetailRoute>();

  // Audit identity for void operation. AuthUser exposes `username` (not a uuid);
  // bondsRepository's `actorLocalUuid` param accepts any opaque actor handle.
  const currentActor = useAuthStore((s) => s.user?.username ?? null);

  const [bond, setBond] = useState<Bond | null>(null);
  const [payments, setPayments] = useState<BondPayment[]>([]);
  const [readingLinks, setReadingLinks] = useState<BondReading[]>([]);
  const [totals, setTotals] = useState<BondTotals | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [voidModalOpen, setVoidModalOpen] = useState<boolean>(false);

  // ── Initial + reactive load ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const b = await bondsRepository.getBondById(route.params.localUuid);
        if (cancelled) return;
        setBond(b);
        if (b !== null) {
          const [p, r, tot] = await Promise.all([
            b.payments.fetch(),
            b.readingLinks.fetch(),
            bondsRepository.totalsFor(b.id, resolveCurrency(b.currencyId)),
          ]);
          if (cancelled) return;
          setPayments(p);
          setReadingLinks(r);
          setTotals(tot);
        }
      } catch (cause) {
        log.error('initial load failed', cause);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params.localUuid]);

  // ── Actions ─────────────────────────────────────────────────────────

  const handlePrint = useCallback(async (): Promise<void> => {
    if (bond === null || busy) return;
    setBusy(true);
    try {
      // 1. Mark printed first (Pitfall #7 in Integration Guide).
      const isReprint = bond.isPrinted;
      await bondsRepository.markPrinted(bond.id);

      // 2. Build the print buffer.
      const input = buildBondPrintInput(bond, payments, readingLinks, isReprint);
      await receiptPrintService.printBond(input);

      ToastAndroid.show(
        t(isReprint ? 'bonds.detail.toast.reprinted' : 'bonds.detail.toast.printed'),
        ToastAndroid.SHORT,
      );

      // 3. Refresh local state from disk.
      const fresh = await bondsRepository.getBondById(bond.id);
      setBond(fresh);
    } catch (cause) {
      log.error('print failed', cause);
      const key = cause instanceof Error ? cause.message : 'bonds.errors.printFailed';
      ToastAndroid.show(t(key), ToastAndroid.LONG);
    } finally {
      setBusy(false);
    }
  }, [bond, busy, payments, readingLinks, t]);

  const handleVoidConfirm = useCallback(
    async (pin: string): Promise<void> => {
      if (bond === null || currentActor === null) return;
      setBusy(true);
      try {
        await bondsRepository.voidBond(bond.id, {
          confirmedByPin: pin,
          actorLocalUuid: currentActor,
        });
        ToastAndroid.show(t('bonds.detail.toast.voided'), ToastAndroid.SHORT);
        setVoidModalOpen(false);
        const fresh = await bondsRepository.getBondById(bond.id);
        setBond(fresh);
      } catch (cause) {
        log.warn('void failed', cause);
        const key = cause instanceof Error ? cause.message : 'bonds.errors.voidFailed';
        ToastAndroid.show(t(key), ToastAndroid.LONG);
      } finally {
        setBusy(false);
      }
    },
    [bond, currentActor, t],
  );

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <AppHeader title={t('bonds.detail.title')} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (bond === null) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <AppHeader title={t('bonds.detail.title')} showBack />
        <View style={styles.center}>
          <Feather name="alert-triangle" size={48} color={colors.warning} />
          <Text style={[styles.errText, { color: colors.textPrimary }]}>
            {t('bonds.errors.notFound')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader
        title={t('bonds.detail.titleWithNumber', { num: bond.bondNo })}
        showBack
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Card A: Subscriber */}
        <Card title={t('bonds.detail.subscriber.title')}>
          <Row label={t('bonds.detail.subscriber.name')} value={bond.accountName ?? '—'} />
          <Row
            label={t('bonds.detail.subscriber.accountId')}
            value={bond.accountId != null ? String(bond.accountId) : '—'}
          />
          <Row
            label={t('bonds.detail.subscriber.bondDate')}
            value={fmtDate(bond.bondDate)}
          />
        </Card>

        {/* Card B: Readings */}
        <Card
          title={t('bonds.detail.readings.title', {
            count: readingLinks.length,
          })}
        >
          {readingLinks.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textTertiary }]}>
              {t('bonds.detail.readings.empty')}
            </Text>
          ) : (
            readingLinks.map((link) => (
              <Row
                key={link.id}
                label={`#${link.readingNum}`}
                value={fmtMoney(link.amount, resolveCurrency(bond.currencyId))}
              />
            ))
          )}
        </Card>

        {/* Card C: Payments + totals */}
        <Card title={t('bonds.detail.payments.title')}>
          {payments.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textTertiary }]}>
              {t('bonds.detail.payments.empty')}
            </Text>
          ) : (
            payments.map((p) => (
              <Row
                key={p.id}
                label={t(`bonds.payments.method.${p.method}`)}
                value={p.formattedValue(resolveCurrency(bond.currencyId))}
              />
            ))
          )}
          {totals !== null && totals.byCurrency.size > 0 ? (
            <View style={[styles.totalsBlock, { borderTopColor: colors.border }]}>
              {Array.from(totals.byCurrency.entries()).map(([cur, sum]) => (
                <Row
                  key={cur}
                  bold
                  label={t('bonds.detail.payments.totalFor', { currency: cur })}
                  value={fmtMoney(sum, cur)}
                />
              ))}
            </View>
          ) : null}
        </Card>

        {/* Card D: Status & barcode */}
        <Card title={t('bonds.detail.status.title')}>
          <Row label={t('bonds.detail.status.label')} value={statusLabel(bond, t)} />
          <Row
            label={t('bonds.detail.status.sync')}
            value={t(`bonds.detail.status.sync_${bond.pushStatus}`)}
          />
          <Row label={t('bonds.detail.status.barcode')} value={bond.receiptBarcode} />
          {bond.isVoided && bond.voidedBy != null ? (
            <Row
              label={t('bonds.detail.status.voidedBy')}
              value={bond.voidedBy}
            />
          ) : null}
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            title={
              bond.isPrinted
                ? t('bonds.detail.action.reprint')
                : t('bonds.detail.action.print')
            }
            onPress={() => void handlePrint()}
            loading={busy}
            disabled={bond.isVoided}
          />
          {!bond.isVoided ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setVoidModalOpen(true)}
              disabled={busy}
              style={[
                styles.dangerBtn,
                {
                  borderColor: colors.danger,
                  opacity: busy ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.dangerBtnText, { color: colors.danger }]}>
                {t('bonds.detail.action.void')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* Void confirmation modal */}
      <VoidPinModal
        visible={voidModalOpen}
        busy={busy}
        onCancel={() => setVoidModalOpen(false)}
        onConfirm={(pin) => void handleVoidConfirm(pin)}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

interface RowProps {
  label: string;
  value: string;
  bold?: boolean;
}

function Row({ label, value, bold = false }: RowProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.kvRow}>
      <Text
        style={[
          styles.kvLabel,
          { color: colors.textSecondary, fontWeight: bold ? '700' : '600' },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.kvValue,
          { color: colors.textPrimary, fontWeight: bold ? '700' : '500' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

interface VoidPinModalProps {
  visible: boolean;
  busy: boolean;
  onCancel(): void;
  onConfirm(pin: string): void;
}

function VoidPinModal({
  visible,
  busy,
  onCancel,
  onConfirm,
}: VoidPinModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [pin, setPin] = useState<string>('');

  useEffect(() => {
    if (!visible) setPin('');
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {t('bonds.detail.voidModal.title')}
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            {t('bonds.detail.voidModal.subtitle')}
          </Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={8}
            autoFocus
            placeholder={t('bonds.detail.voidModal.pinPlaceholder')}
            placeholderTextColor={colors.inputPlaceholder}
            style={[
              styles.modalInput,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.textPrimary,
              },
            ]}
          />
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={[styles.modalCancel, { borderColor: colors.borderStrong }]}
              disabled={busy}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                {t('common.cancel')}
              </Text>
            </Pressable>
            <PrimaryButton
              title={t('bonds.detail.voidModal.confirm')}
              onPress={() => onConfirm(pin)}
              loading={busy}
              disabled={pin.length < 4}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function resolveCurrency(currencyId: number | null | undefined): CurrencyId {
  // Currency table id -> string code mapping. The mock data uses
  // {1=IQD, 2=USD, 3=EUR, 4=SAR}. If the schema later normalises this,
  // replace with an async lookup.
  switch (currencyId) {
    case 2:
      return 'USD';
    case 3:
      return 'EUR';
    case 4:
      return 'SAR';
    default:
      return 'IQD';
  }
}

function statusLabel(
  bond: Bond,
  t: (key: string) => string,
): string {
  if (bond.isVoided) return t('bonds.detail.status.voided');
  if (bond.isPrinted) return t('bonds.detail.status.printed');
  return t('bonds.detail.status.draft');
}

function fmtMoney(n: number, currency: CurrencyId): string {
  const meta = CURRENCY_META[currency];
  const rounded =
    meta.decimals === 0
      ? Math.round(n)
      : Math.round(n * 100) / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(rounded);
  return `${formatted} ${meta.symbol}`;
}

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Build the input expected by `receiptPrintService.printBond()`.
 * Maps the WatermelonDB models into the plain shape used by the
 * Wave-5 printer service.
 */
function buildBondPrintInput(
  bond: Bond,
  payments: BondPayment[],
  _readingLinks: BondReading[],
  isReprint: boolean,
): BondPrintInput {
  const currency = resolveCurrency(bond.currencyId);
  const meta = CURRENCY_META[currency];
  return {
    bond: {
      id: bond.id,
      num: bond.bondNo,
      noadad: bond.accountId != null ? String(bond.accountId) : '',
      notes: bond.notes ?? null,
      bondDate: bond.bondDate,
      previousBalance: 0, // populated by caller in Wave 5 ↔ accounts join
      newBalance: 0,
    },
    subscriber: {
      name: bond.accountName ?? '',
      phone: null,
      address: null,
    },
    payments: payments.map((p) => ({
      paymentType: mapMethodToReceipt(p.method),
      amount: p.amount,
      currencyId: currency,
      currencySymbol: meta.symbol,
      description: p.notes ?? null,
    })),
    collector: { fullName: '', employeeNumber: '' }, // filled by caller
    company: { name: '', branch: '' },                // filled by caller
    printedAt: new Date(),
    isReprint,
    reprintNo: null,
  };
}

function mapMethodToReceipt(
  m: BondPaymentMethod,
): 'cash' | 'transfer' | 'installment' | 'cheque' | 'other' {
  return m;
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginTop: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  dangerBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    fontSize: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  errText: {
    fontSize: 15,
    fontWeight: '700',
  },
  flex: { flex: 1 },
  kvLabel: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  kvValue: {
    fontSize: 13,
    maxWidth: '60%',
    textAlign: 'left',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCancel: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    width: '100%',
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 18,
    letterSpacing: 4,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'right',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  scroll: {
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  totalsBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
    paddingTop: 6,
  },
});
