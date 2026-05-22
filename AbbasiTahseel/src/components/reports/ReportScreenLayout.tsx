/**
 * ReportScreenLayout — shared layout shell for every report sub-screen.
 *
 * Mounts:
 *   • AppHeader with showBack
 *   • MockBanner (DEV only)
 *   • Filters card (period + optional extras)
 *   • Summary / KPI card (optional)
 *   • Body (the report table)
 *   • Bottom action bar — disabled "تصدير PDF" + "طباعة" buttons (Wave 6-Β)
 *
 * Wave 6-Α — UI skeleton component.
 *
 * TODO Wave 6-Β:
 *   • Wire export-to-PDF action.
 *   • Wire print action via PrinterService.
 *   • Add real period filtering against WatermelonDB.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import { PeriodPicker, type PeriodValue } from '@/components/pickers';
import {
  Card,
  FormField,
  MockBanner,
  SecondaryButton,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface ReportScreenLayoutProps {
  title: string;
  /** Helper text displayed under the period picker. */
  subtitle?: string;
  /** Show the period picker (most reports use it; ReadingHeader does not). */
  showPeriod?: boolean;
  /** Optional summary header rendered above the main body (KPI cards). */
  summary?: React.ReactNode;
  /** Main body (the report table). */
  children: React.ReactNode;
}

const PERIOD_LABEL: Record<PeriodValue['preset'], string> = {
  today: 'اليوم',
  yesterday: 'أمس',
  thisWeek: 'هذا الأسبوع',
  thisMonth: 'هذا الشهر',
  last30Days: 'آخر 30 يوماً',
  custom: 'مخصص',
};

export function ReportScreenLayout(
  props: ReportScreenLayoutProps,
): React.JSX.Element {
  const { title, subtitle, showPeriod = true, summary, children } = props;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [period, setPeriod] = useState<PeriodValue>({ preset: 'thisMonth' });
  const [periodOpen, setPeriodOpen] = useState(false);

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={title} showBack />
      <MockBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}

        {/* ─── Filters ────────────────────────────────────────── */}
        {showPeriod ? (
          <Card variant="outlined" style={styles.filtersCard}>
            <FormField
              label={t('pickers.period.title')}
              value={PERIOD_LABEL[period.preset]}
              readOnly
              onPress={() => setPeriodOpen(true)}
              leadingIcon="calendar"
            />
          </Card>
        ) : null}

        {/* ─── Optional summary KPIs ──────────────────────────── */}
        {summary}

        {/* ─── Body ───────────────────────────────────────────── */}
        <View style={styles.body}>{children}</View>
      </ScrollView>

      {/* ─── Bottom action bar ──────────────────────────────── */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <SecondaryButton
          title={t('reports.actions.exportPdf')}
          icon="download"
          variant="outlined"
          onPress={() => {
            // TODO Wave 6-Β: implement PDF export via react-native-html-to-pdf.
          }}
          disabled
        />
        <SecondaryButton
          title={t('reports.actions.print')}
          icon="printer"
          variant="outlined"
          onPress={() => {
            // TODO Wave 6-Β: invoke PrinterService.printReport(...).
          }}
          disabled
        />
      </View>

      {showPeriod ? (
        <PeriodPicker
          visible={periodOpen}
          selectedPreset={period.preset}
          onSelect={(p) => {
            setPeriod(p);
            setPeriodOpen(false);
          }}
          onClose={() => setPeriodOpen(false)}
        />
      ) : null}

      {/* DEV badge — proves we're in mock mode. */}
      {__DEV__ ? (
        <View style={styles.devTag}>
          <Feather name="info" size={10} color="#856404" />
          <Text style={styles.devTagText}>UI skeleton — Wave 6-Α</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  body: {
    marginTop: spacing[3],
  },
  devTag: {
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    bottom: 80,
    end: spacing[3],
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
  },
  devTagText: {
    color: '#856404',
    fontSize: 9,
    fontWeight: '700',
  },
  filtersCard: {
    marginBottom: spacing[2],
  },
  flex: { flex: 1 },
  scroll: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  subtitle: {
    fontSize: 13,
    marginBottom: spacing[3],
    textAlign: 'right',
  },
});
