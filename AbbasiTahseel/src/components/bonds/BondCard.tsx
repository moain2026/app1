/**
 * BondCard — single row inside the FlashList on BondsScreen.
 *
 * Visual layout (RTL):
 *
 *  ┌───────────────────────────────────────────────────────────────┐
 *  │  [#1001] [قبض]            اسم المشترك              5,000 ر.ي │
 *  │  2026-04-18 · رقم 0001    ملاحظة قصيرة             [chevron] │
 *  │  [synced] [• dirty] [⚠ failed]                                │
 *  └───────────────────────────────────────────────────────────────┘
 *
 * Memo-ised for FlashList performance.
 *
 * Wave 6-Α — UI skeleton component (consumes MockBond).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import type { MockBond } from '@/mocks/bonds';

export const BOND_CARD_HEIGHT = 92;

export interface BondCardProps {
  bond: MockBond;
  onPress(bond: MockBond): void;
}

function BondCardImpl({ bond, onPress }: BondCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const typeColor =
    bond.bondType === 'receipt' ? colors.success ?? '#1A7F3D' : colors.danger ?? '#C41E24';
  const typeBg =
    bond.bondType === 'receipt'
      ? colors.successSoft ?? '#E5F5EB'
      : colors.dangerSoft ?? '#FDEAEB';

  const isPartial = bond.amountPaid < bond.amount;

  return (
    <Pressable
      onPress={() => onPress(bond)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceElevated ?? colors.surface : colors.surface },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`سند ${bond.bondNo} · ${bond.accountName}`}
    >
      <View style={styles.body}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.leftCluster}>
            <Text style={[styles.bondNo, { color: colors.textPrimary }]}>
              #{bond.bondNo}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: typeBg }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {t(`bonds.types.${bond.bondType}`)}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.amount, { color: typeColor }]}
            numberOfLines={1}
          >
            {bond.amount.toLocaleString('ar-EG')} {bond.currencySymbol}
          </Text>
        </View>

        {/* Middle row — account */}
        <Text
          style={[styles.account, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {bond.accountName}
        </Text>

        {/* Bottom row — date + sync */}
        <View style={styles.bottomRow}>
          <Text style={[styles.meta, { color: colors.textTertiary }]}>
            {bond.bondDate} · {t('bonds.list.accountNum')}: {bond.accountNum}
          </Text>
          <View style={styles.badges}>
            {isPartial ? (
              <View
                style={[
                  styles.miniBadge,
                  { backgroundColor: colors.warningSoft ?? '#FFF3CD' },
                ]}
              >
                <Text
                  style={[
                    styles.miniBadgeText,
                    { color: colors.warning ?? '#856404' },
                  ]}
                >
                  {t('bonds.list.partial')}
                </Text>
              </View>
            ) : null}
            {bond.syncStatus === 'dirty' ? (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.warning ?? '#E67E22' },
                ]}
              />
            ) : null}
            {bond.syncStatus === 'failed' ? (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.danger ?? '#C41E24' },
                ]}
              />
            ) : null}
          </View>
        </View>
      </View>

      <Feather
        name="chevron-left"
        size={18}
        color={colors.textTertiary}
        style={styles.chevron}
      />
    </Pressable>
  );
}

export const BondCard = React.memo(BondCardImpl);

const styles = StyleSheet.create({
  account: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing[1],
    textAlign: 'right',
  },
  amount: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'left',
  },
  badges: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1] + 2,
  },
  body: {
    flex: 1,
  },
  bondNo: {
    fontSize: 13,
    fontWeight: '800',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[1] + 2,
  },
  chevron: {
    marginStart: spacing[2],
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  leftCluster: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  meta: {
    flexShrink: 1,
    fontSize: 11,
    textAlign: 'right',
  },
  miniBadge: {
    borderRadius: 4,
    paddingHorizontal: spacing[1] + 2,
    paddingVertical: 1,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: BOND_CARD_HEIGHT,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
