/**
 * BondPaymentFormScreen — add a payment to an existing bond.
 *
 * Reachable via `navigation.navigate('BondPaymentCreate', { bondLocalUuid })`.
 *
 * TODO (Wave 6-Β):
 *   • Wire `bondPaymentsRepository.create` + enqueue sync.
 *   • Validate payment amount ≤ bond.remainingAmount.
 *   • Auto-fetch GetBondPaymentRecordNext for the paymentNo.
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
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/layout/AppHeader';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import {
  Card,
  ErrorBanner,
  FormField,
  MockBanner,
  SectionHeader,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { findMockBond } from '@/mocks/bonds';
import type { MainStackParamList } from '@/navigation/types';

type Route = RouteProp<MainStackParamList, 'BondPaymentCreate'>;

export function BondPaymentFormScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const bond = findMockBond(route.params.bondLocalUuid);
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!bond) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <AppHeader title={t('bonds.payments.formTitle')} showBack />
        <ErrorBanner message={t('bonds.detail.notFound')} variant="error" />
      </SafeAreaView>
    );
  }

  const remaining = bond.amount - bond.amountPaid;

  const handleSubmit = (): void => {
    const value = Number(amount);
    if (!value || value <= 0) {
      Alert.alert(t('bonds.payments.invalidTitle'), t('bonds.payments.invalidMsg'));
      return;
    }
    if (value > remaining) {
      Alert.alert(
        t('bonds.payments.overTitle'),
        t('bonds.payments.overMsg', {
          remaining: remaining.toLocaleString('ar-EG'),
          symbol: bond.currencySymbol,
        }),
      );
      return;
    }
    Alert.alert(
      t('bonds.payments.savedTitle'),
      t('bonds.payments.savedMsg'),
      [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
    );
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('bonds.payments.formTitle')} showBack />
      <MockBanner />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* BOND SUMMARY */}
          <SectionHeader
            title={t('bonds.payments.bondSummary')}
            icon="file-text"
          />
          <Card>
            <Text style={[styles.bondTitle, { color: colors.textPrimary }]}>
              {t('bonds.detail.bondNo', { no: bond.bondNo })} — {bond.accountName}
            </Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
                {t('bonds.detail.amount')}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {bond.amount.toLocaleString('ar-EG')} {bond.currencySymbol}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
                {t('bonds.detail.amountPaid')}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {bond.amountPaid.toLocaleString('ar-EG')} {bond.currencySymbol}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
                {t('bonds.detail.remaining')}
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: colors.warning ?? '#E67E22', fontWeight: '800' },
                ]}
              >
                {remaining.toLocaleString('ar-EG')} {bond.currencySymbol}
              </Text>
            </View>
          </Card>

          {/* AMOUNT */}
          <SectionHeader
            title={t('bonds.payments.amountSection')}
            icon="dollar-sign"
          />
          <FormField
            label={t('bonds.payments.amountLabel')}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="numeric"
            suffix={bond.currencySymbol}
            helperText={t('bonds.payments.amountHint', {
              max: remaining.toLocaleString('ar-EG'),
            })}
            required
          />

          {/* NOTES */}
          <SectionHeader
            title={t('bonds.payments.notesSection')}
            icon="message-square"
          />
          <FormField
            label={t('bonds.payments.notesLabel')}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('bonds.payments.notesPlaceholder')}
            multiline
            numberOfLines={3}
          />

          <View style={styles.submitWrap}>
            <PrimaryButton
              title={t('bonds.payments.saveCta')}
              onPress={handleSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bondTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing[3],
    textAlign: 'right',
  },
  flex: { flex: 1 },
  scroll: {
    paddingBottom: spacing[10],
    paddingHorizontal: spacing[4],
  },
  submitWrap: {
    marginTop: spacing[6],
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1] + 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
