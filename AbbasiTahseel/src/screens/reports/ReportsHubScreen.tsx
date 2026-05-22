/**
 * ReportsHubScreen — replaces the old stub ReportsScreen.
 *
 * Acts as a dashboard listing all available reports. Each card navigates
 * to its dedicated sub-screen.
 *
 * Reports list (matches WCF Help live endpoints):
 *   1. ميزان عام              → BalanceHeaderReport     (GetRepBalanceHeader)
 *   2. كشف حساب تفصيلي        → BalanceDetailsReport    (GetRepBalanceDetailsByDate)
 *   3. تقرير السندات          → BondsHeaderReport       (GetRepBondsHeader)
 *   4. حركة الصندوق           → BoxMoveReport           (GetRepBoxMove)
 *   5. تفاصيل حركة الصندوق    → BoxMoveDetailsReport    (GetRepBoxMoveDetails)
 *   6. المصروفات اليومية      → ExpensesReport          (GetRepExpenses)
 *   7. تقرير الاستهلاك        → ReadingHeaderReport     (GetRepReadingHeader)
 *
 * Wave 6-Α — UI skeleton.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { Card, MockBanner } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import type { MainStackParamList } from '@/navigation/types';

type ReportRoute = keyof Pick<
  MainStackParamList,
  | 'BalanceHeaderReport'
  | 'BalanceDetailsReport'
  | 'BondsHeaderReport'
  | 'BoxMoveReport'
  | 'BoxMoveDetailsReport'
  | 'ExpensesReport'
  | 'ReadingHeaderReport'
>;

interface ReportEntry {
  route: ReportRoute;
  icon: string;
  iconColor: string;
  bgColor: string;
}

const REPORTS: ReportEntry[] = [
  { route: 'BalanceHeaderReport',  icon: 'pie-chart',   iconColor: '#1B5E20', bgColor: '#E8F5E9' },
  { route: 'BalanceDetailsReport', icon: 'list',        iconColor: '#0D47A1', bgColor: '#E3F2FD' },
  { route: 'BondsHeaderReport',    icon: 'file-text',   iconColor: '#4A148C', bgColor: '#F3E5F5' },
  { route: 'BoxMoveReport',        icon: 'trending-up', iconColor: '#BF360C', bgColor: '#FBE9E7' },
  { route: 'BoxMoveDetailsReport', icon: 'activity',    iconColor: '#E65100', bgColor: '#FFF3E0' },
  { route: 'ExpensesReport',       icon: 'shopping-bag', iconColor: '#33691E', bgColor: '#F1F8E9' },
  { route: 'ReadingHeaderReport',  icon: 'zap',         iconColor: '#F57F17', bgColor: '#FFFDE7' },
];

export function ReportsHubScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('reports.hub.title')} showMenu />
      <MockBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('reports.hub.subtitle')}
        </Text>

        <View style={styles.grid}>
          {REPORTS.map((r) => (
            <Card
              key={r.route}
              onPress={() => navigation.navigate(r.route)}
              style={styles.card}
            >
              <View style={[styles.iconBox, { backgroundColor: r.bgColor }]}>
                <Feather name={r.icon} size={24} color={r.iconColor} />
              </View>
              <Text
                style={[styles.cardTitle, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {t(`reports.entries.${r.route}.title`)}
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.textTertiary }]}
                numberOfLines={2}
              >
                {t(`reports.entries.${r.route}.subtitle`)}
              </Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 140,
    width: '47%',
  },
  cardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing[2],
    textAlign: 'right',
  },
  flex: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  scroll: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  subtitle: {
    fontSize: 13,
    marginBottom: spacing[4],
    textAlign: 'right',
  },
});
