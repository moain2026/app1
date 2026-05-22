/**
 * BondFormScreen — single shared form for both Create and Edit.
 *
 * The same component is mounted at two routes:
 *   • BondCreate(defaultType: 'receipt' | 'payment')
 *   • BondEdit(localUuid)
 *
 * Visual flow (RTL):
 *
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │  [AppHeader: سند جديد / تعديل سند]                            │
 *  │  [MockBanner]                                                  │
 *  │  ──────────────────────────────                                │
 *  │  [SectionHeader: نوع السند]                                   │
 *  │  [Chip: قبض] [Chip: صرف]                                       │
 *  │  ──────────────────────────────                                │
 *  │  [SectionHeader: المشترك]                                     │
 *  │  [FormField: المشترك (readOnly → AccountPicker)]              │
 *  │  ──────────────────────────────                                │
 *  │  [SectionHeader: المبلغ]                                      │
 *  │  [FormField: العملة (readOnly → CurrencyPicker)]              │
 *  │  [FormField: المبلغ]                                          │
 *  │  ──────────────────────────────                                │
 *  │  [SectionHeader: ملاحظات]                                     │
 *  │  [FormField: ملاحظة (multiline)]                              │
 *  │  ──────────────────────────────                                │
 *  │  [PrimaryButton: حفظ]                                          │
 *  └────────────────────────────────────────────────────────────────┘
 *
 * TODO (Wave 6-Β):
 *   • Wire react-hook-form + Zod schema (bondInputSchema) for validation.
 *   • Pull defaults from `findMockBond(localUuid)` when editing.
 *   • On submit → bondsRepository.create / update + enqueue sync.
 *   • Auto-fetch GetBondReceiptRecordNext for the bondNo before save.
 *   • Multi-currency: fetch GetAccountBalanceInfo when account changes.
 *
 * Wave 6-Α — UI skeleton.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/layout/AppHeader';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { AccountPicker, CurrencyPicker } from '@/components/pickers';
import {
  Chip,
  FormField,
  MockBanner,
  SectionHeader,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import type { MockAccount } from '@/mocks/accounts';
import { findMockBond } from '@/mocks/bonds';
import { findMockCurrency, type MockCurrency } from '@/mocks/currencies';
import type { MainStackParamList } from '@/navigation/types';

type Route =
  | RouteProp<MainStackParamList, 'BondCreate'>
  | RouteProp<MainStackParamList, 'BondEdit'>;

export function BondFormScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  // Detect mode + load existing bond if editing.
  const isEdit = route.name === 'BondEdit';
  const existing = isEdit
    ? findMockBond((route.params as { localUuid: string }).localUuid)
    : undefined;
  const defaultType =
    (!isEdit && (route.params as { defaultType?: 'receipt' | 'payment' }).defaultType) ||
    existing?.bondType ||
    'receipt';

  // Form state (local only in Wave 6-Α).
  const [bondType, setBondType] = useState<'receipt' | 'payment'>(defaultType);
  const [account, setAccount] = useState<MockAccount | null>(null);
  const [accountLabel, setAccountLabel] = useState<string>(
    existing?.accountName ?? '',
  );
  const [currency, setCurrency] = useState<MockCurrency | null>(
    findMockCurrency(existing?.currencyId ?? 1) ?? null,
  );
  const [amount, setAmount] = useState<string>(
    existing ? String(existing.amount) : '',
  );
  const [notes, setNotes] = useState<string>(existing?.notes ?? '');

  // Picker visibility.
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleSubmit = (): void => {
    // TODO Wave 6-Β: zodResolver + bondsRepository.create/update
    if (!accountLabel || !amount || !currency) {
      Alert.alert(
        t('bonds.form.validationTitle'),
        t('bonds.form.validationMsg'),
      );
      return;
    }
    Alert.alert(
      t('bonds.form.savedTitle'),
      isEdit ? t('bonds.form.savedEdit') : t('bonds.form.savedCreate'),
      [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
    );
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader
        title={isEdit ? t('bonds.form.editTitle') : t('bonds.form.createTitle')}
        showBack
      />
      <MockBanner />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* TYPE SELECTOR */}
          <SectionHeader
            title={t('bonds.form.typeSection')}
            icon="repeat"
          />
          <View style={styles.typeRow}>
            <Chip
              label={t('bonds.types.receipt')}
              selected={bondType === 'receipt'}
              onPress={() => setBondType('receipt')}
            />
            <Chip
              label={t('bonds.types.payment')}
              selected={bondType === 'payment'}
              onPress={() => setBondType('payment')}
            />
          </View>

          {/* ACCOUNT */}
          <SectionHeader
            title={t('bonds.form.accountSection')}
            icon="user"
          />
          <FormField
            label={t('bonds.form.accountLabel')}
            value={accountLabel}
            placeholder={t('bonds.form.accountPlaceholder')}
            readOnly
            onPress={() => setShowAccountPicker(true)}
            trailingIcon="chevron-down"
            required
          />
          {account && account.balance !== 0 ? (
            <FormField
              label={t('bonds.form.currentBalance')}
              value={`${Math.abs(account.balance).toLocaleString('ar-EG')} ${currency?.symbol ?? ''}`}
              helperText={
                account.balance > 0
                  ? t('bonds.form.balanceDebtor')
                  : t('bonds.form.balanceCreditor')
              }
              disabled
            />
          ) : null}

          {/* AMOUNT */}
          <SectionHeader
            title={t('bonds.form.amountSection')}
            icon="dollar-sign"
          />
          <FormField
            label={t('bonds.form.currencyLabel')}
            value={currency ? `${currency.symbol} — ${currency.name}` : ''}
            placeholder={t('bonds.form.currencyPlaceholder')}
            readOnly
            onPress={() => setShowCurrencyPicker(true)}
            trailingIcon="chevron-down"
            required
          />
          <FormField
            label={t('bonds.form.amountLabel')}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="numeric"
            suffix={currency?.symbol}
            required
          />

          {/* NOTES */}
          <SectionHeader
            title={t('bonds.form.notesSection')}
            icon="message-square"
          />
          <FormField
            label={t('bonds.form.notesLabel')}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('bonds.form.notesPlaceholder')}
            multiline
            numberOfLines={3}
          />

          {/* SUBMIT */}
          <View style={styles.submitWrap}>
            <PrimaryButton
              title={
                isEdit ? t('common.save') : t('bonds.form.createCta')
              }
              onPress={handleSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* PICKERS */}
      <AccountPicker
        visible={showAccountPicker}
        onClose={() => setShowAccountPicker(false)}
        onSelect={(a) => {
          setAccount(a);
          setAccountLabel(`${a.name} (${a.num})`);
          setShowAccountPicker(false);
        }}
      />
      <CurrencyPicker
        visible={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        onSelect={(c) => {
          setCurrency(c);
          setShowCurrencyPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingBottom: spacing[10],
    paddingHorizontal: spacing[4],
  },
  submitWrap: {
    marginTop: spacing[6],
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
});
