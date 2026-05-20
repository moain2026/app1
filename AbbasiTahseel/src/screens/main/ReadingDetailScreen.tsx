/**
 * ReadingDetailScreen — Wave 4
 *
 * Route param: { localUuid: string }
 *
 * Three cards (top-to-bottom):
 *   1) Subscriber       (read-only legacy fields: meter, name, alias, area,
 *                        book, group, type)
 *   2) Readings         (ks read-only • kh editable TextField • computed
 *                        consumption + expected • red banner on over)
 *   3) Sync state       (pushStatus • lastSyncAttemptAt • lastError +
 *                        Retry button when failed)
 *
 * Validation rules for the `kh` input (mirrors legacy ReadingActivity):
 *   • Required (non-empty).
 *   • Integer (parseInt round-trip equal).
 *   • > ks            (legacy: "القراءة الجديدة يجب أن تكون أكبر من السابقة").
 *   • < ks + 100000   (sanity ceiling — legacy treats as keystroke typo).
 *   • cas == 0        (isEditLocked false — posted rows cannot be edited).
 *   • If (kh - ks) > 5 * asts  → confirmation modal "استهلاك مرتفع جداً".
 *
 * Save flow:
 *   1) Validate; if blocked → inline error + early return.
 *   2) If very-high → open confirmation modal.
 *   3) On confirm → readingsRepository.updateLocalReading(reading, kh)
 *      which writes locally + enqueues a sync job (skipped in Dev Bypass).
 *   4) ToastAndroid + navigation.goBack().
 */

import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { PrimaryButton } from '@/components/forms';
import { TextField } from '@/components/forms/TextField';
import { AppHeader } from '@/components/layout/AppHeader';
import type { Reading } from '@/database/models/Reading';
import { useTheme } from '@/design-system/theme';
import { usePrinter } from '@/hooks/usePrinter';
import {
  findByUuid,
  retryReadingPush,
  updateLocalReading,
} from '@/services/repository/readingsRepository';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

const log = logger.scope('ReadingDetailScreen');

type DetailRoute = RouteProp<
  { ReadingDetail: { localUuid: string } },
  'ReadingDetail'
>;

interface NavLike {
  goBack(): void;
}

// ─── Validation helpers ───────────────────────────────────────────────────

interface ValidationOk {
  ok: true;
  value: number;
}
interface ValidationErr {
  ok: false;
  errorKey: string;
  params?: Record<string, unknown>;
}
type ValidationResult = ValidationOk | ValidationErr;

function validateKh(raw: string, ks: number): ValidationResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, errorKey: 'readings.detail.validation.required' };
  }
  // Must be a non-negative integer.
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, errorKey: 'readings.detail.validation.notNumber' };
  }
  const value = parseInt(trimmed, 10);
  if (!Number.isFinite(value)) {
    return { ok: false, errorKey: 'readings.detail.validation.notNumber' };
  }
  if (value <= ks) {
    return {
      ok: false,
      errorKey: 'readings.detail.validation.tooLow',
      params: { previous: ks },
    };
  }
  if (value >= ks + 100_000) {
    return { ok: false, errorKey: 'readings.detail.validation.tooHigh' };
  }
  return { ok: true, value };
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '—';
  try {
    return d.toLocaleString('ar');
  } catch {
    return d.toISOString();
  }
}

// ─── Card primitives ──────────────────────────────────────────────────────

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
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

interface FieldRowProps {
  label: string;
  value: string;
  emphasis?: 'normal' | 'big' | 'danger';
}

function FieldRow({
  label,
  value,
  emphasis = 'normal',
}: FieldRowProps): React.JSX.Element {
  const { colors } = useTheme();
  const valueColor =
    emphasis === 'danger' ? colors.danger : colors.textPrimary;
  const valueSize = emphasis === 'big' ? 18 : 14;
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.fieldValue,
          { color: valueColor, fontSize: valueSize },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────

export function ReadingDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NavLike>();
  const route = useRoute<DetailRoute>();
  const { localUuid } = route.params;

  const isDevBypass = useAuthStore((s) => s.isDevBypass);
  const authUser = useAuthStore((s) => s.user);
  const printer = usePrinter();

  const [reading, setReading] = useState<Reading | null>(null);
  const [khDraft, setKhDraft] = useState<string>('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    value: number;
    consumption: number;
  } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);

  // ─── Load row from DB ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    void findByUuid(localUuid)
      .then((r) => {
        if (cancelled) return;
        setReading(r);
        if (r && r.kh != null) {
          setKhDraft(String(r.kh));
        }
      })
      .catch((err) => {
        log.warn('failed to load reading', { localUuid, error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [localUuid]);

  // ─── Derived values ──────────────────────────────────────────────────
  const previewConsumption = useMemo<number | null>(() => {
    if (!reading) return null;
    const v = validateKh(khDraft, reading.ks);
    return v.ok ? v.value - reading.ks : null;
  }, [khDraft, reading]);

  const isOver = useMemo<boolean>(() => {
    if (!reading || previewConsumption === null) return false;
    return previewConsumption > reading.asts;
  }, [previewConsumption, reading]);

  // ─── Save handler ────────────────────────────────────────────────────
  const performSave = useCallback(
    async (value: number): Promise<void> => {
      if (!reading) return;
      setSaving(true);
      try {
        await updateLocalReading(reading, value);
        ToastAndroid.show(t('readings.detail.saved'), ToastAndroid.SHORT);
        navigation.goBack();
      } catch (err) {
        log.warn('save failed', { error: String(err) });
        const key =
          err instanceof Error &&
          err.message === 'readings.detail.validation.locked'
            ? 'readings.detail.validation.locked'
            : 'readings.list.sync.error';
        setInlineError(t(key));
      } finally {
        setSaving(false);
      }
    },
    [navigation, reading, t],
  );

  const onSavePress = useCallback((): void => {
    if (!reading) return;
    setInlineError(null);

    if (reading.isEditLocked) {
      ToastAndroid.show(
        t('readings.detail.validation.locked'),
        ToastAndroid.SHORT,
      );
      return;
    }

    const v = validateKh(khDraft, reading.ks);
    if (!v.ok) {
      setInlineError(t(v.errorKey, v.params));
      return;
    }

    const consumption = v.value - reading.ks;
    if (consumption > 5 * reading.asts) {
      // Very high — show confirmation modal.
      setConfirmModal({ value: v.value, consumption });
      return;
    }

    void performSave(v.value);
  }, [khDraft, performSave, reading, t]);

  // ─── Print handler ───────────────────────────────────────────────────
  const onPrintPress = useCallback((): void => {
    if (!reading) return;
    if (reading.kh == null) {
      ToastAndroid.show(
        t('readings.detail.validation.required'),
        ToastAndroid.SHORT,
      );
      return;
    }
    if (!printer.isConnected) {
      ToastAndroid.show(
        t('printer.error.notConnected'),
        ToastAndroid.LONG,
      );
      return;
    }
    void printer.printReading({
      reading: {
        localUuid: reading.localUuid,
        noadad: reading.noadad,
        customerName: reading.name,
        customerAlias: reading.namet ?? null,
        areaName: String(reading.nomstlm),
        previousValue: reading.ks,
        currentValue: reading.kh,
        expectedConsumption: reading.asts,
        notes: null,
      },
      collector: {
        fullName: authUser?.name ?? authUser?.username ?? '',
        employeeNumber: authUser?.id != null ? String(authUser.id) : '',
      },
      company: {
        name: t('company.name'),
        branch: t('company.branch', { number: 1 }),
      },
      printedAt: new Date(),
    });
  }, [reading, printer, authUser, t]);

  const onRetry = useCallback(async (): Promise<void> => {
    if (!reading) return;
    setRetrying(true);
    try {
      await retryReadingPush(reading);
      ToastAndroid.show(t('readings.list.sync.running'), ToastAndroid.SHORT);
    } catch (err) {
      log.warn('retry failed', { error: String(err) });
      ToastAndroid.show(t('readings.list.sync.error'), ToastAndroid.SHORT);
    } finally {
      setRetrying(false);
    }
  }, [reading, t]);

  // ─── Render ──────────────────────────────────────────────────────────
  if (!reading) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <AppHeader title={t('readings.detail.title')} showBack />
        <View style={styles.center}>
          <Feather name="zap" size={48} color={colors.textTertiary} />
        </View>
      </SafeAreaView>
    );
  }

  const consumptionText =
    previewConsumption !== null ? String(previewConsumption) : '—';
  const meterTypeLabel = reading.ind === 1 ? '1' : String(reading.ind);

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('readings.detail.title')} showBack />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ─── Card 1: Subscriber ─────────────────────────────────── */}
        <Card title={t('readings.detail.section.subscriber')}>
          <FieldRow
            label={t('readings.detail.field.meterNumber')}
            value={reading.noadad}
            emphasis="big"
          />
          <FieldRow
            label={t('readings.detail.field.name')}
            value={reading.name}
          />
          {reading.namet ? (
            <FieldRow
              label={t('readings.detail.field.alias')}
              value={reading.namet}
            />
          ) : null}
          <FieldRow
            label={t('readings.detail.field.area')}
            value={String(reading.nomstlm)}
          />
          <FieldRow
            label={t('readings.detail.field.book')}
            value={String(reading.notblh)}
          />
          <FieldRow
            label={t('readings.detail.field.group')}
            value={String(reading.nog)}
          />
          <FieldRow
            label={t('readings.detail.field.type')}
            value={meterTypeLabel}
          />
        </Card>

        {/* ─── Card 2: Readings ────────────────────────────────────── */}
        <Card title={t('readings.detail.section.readings')}>
          <FieldRow
            label={t('readings.detail.field.previous')}
            value={String(reading.ks)}
            emphasis="big"
          />

          <TextField
            label={t('readings.detail.field.current')}
            value={khDraft}
            onChangeText={(text) => {
              setKhDraft(text);
              if (inlineError !== null) setInlineError(null);
            }}
            placeholder={t('readings.detail.field.currentPlaceholder')}
            keyboardType="number-pad"
            editable={!reading.isEditLocked && !saving}
            error={inlineError ?? undefined}
            hint={
              reading.isEditLocked
                ? t('readings.detail.validation.locked')
                : undefined
            }
          />

          <FieldRow
            label={t('readings.detail.field.consumption')}
            value={consumptionText}
            emphasis={isOver ? 'danger' : 'normal'}
          />
          <FieldRow
            label={t('readings.detail.field.expected')}
            value={String(reading.asts)}
          />

          {isOver ? (
            <View
              style={[
                styles.warningBanner,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.danger,
                },
              ]}
            >
              <Text style={[styles.warningText, { color: colors.danger }]}>
                {t('readings.detail.alert.overConsumption')}
              </Text>
            </View>
          ) : null}

          <View style={styles.saveBtn}>
            <PrimaryButton
              title={t('readings.detail.action.save')}
              onPress={onSavePress}
              loading={saving}
              disabled={reading.isEditLocked}
            />
          </View>

          {/* Print button — disabled until kh is saved AND a printer is connected. */}
          <Pressable
            accessibilityRole="button"
            disabled={
              reading.kh == null ||
              !printer.isConnected ||
              printer.isPrinting
            }
            onPress={onPrintPress}
            style={[
              styles.printBtn,
              {
                backgroundColor:
                  reading.kh == null || !printer.isConnected
                    ? colors.border
                    : colors.brandSecondary,
              },
            ]}
          >
            <Feather
              name="printer"
              size={16}
              color={colors.white}
            />
            <Text
              style={[styles.printBtnLabel, { color: colors.white }]}
            >
              {printer.isPrinting
                ? t('printer.printing')
                : t('printer.print')}
            </Text>
          </Pressable>
          {!printer.isConnected ? (
            <Text
              style={[styles.printHint, { color: colors.textTertiary }]}
            >
              {t('printer.error.notConnected')}
            </Text>
          ) : null}
        </Card>

        {/* ─── Card 3: Sync state ─────────────────────────────────── */}
        <Card title={t('readings.detail.section.sync')}>
          <FieldRow
            label={t('readings.list.badges.posted')}
            value={t(`readings.detail.syncState.${reading.pushStatus}`)}
          />
          <FieldRow
            label={t('readings.detail.syncState.lastAttempt', {
              time: formatDateTime(reading.lastSyncAttemptAt),
            })}
            value=" "
          />
          {reading.lastError ? (
            <View
              style={[
                styles.warningBanner,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.danger,
                },
              ]}
            >
              <Text style={[styles.warningText, { color: colors.danger }]}>
                {t('readings.detail.syncState.lastError', {
                  message: reading.lastError,
                })}
              </Text>
            </View>
          ) : null}
          {reading.pushStatus === 'failed' && !isDevBypass ? (
            <View style={styles.saveBtn}>
              <PrimaryButton
                title={t('readings.detail.action.retry')}
                onPress={() => void onRetry()}
                loading={retrying}
              />
            </View>
          ) : null}
        </Card>
      </ScrollView>

      {/* ─── Very-high consumption confirmation modal ──────────────── */}
      <Modal
        visible={confirmModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <View style={[styles.backdrop, { backgroundColor: colors.backdrop }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: colors.textPrimary }]}
            >
              {t('readings.detail.alert.veryHighTitle')}
            </Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              {confirmModal
                ? t('readings.detail.alert.veryHighBody', {
                    consumption: confirmModal.consumption,
                    expected: reading.asts,
                  })
                : ''}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setConfirmModal(null)}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t('readings.detail.action.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const value = confirmModal?.value ?? null;
                  setConfirmModal(null);
                  if (value !== null) {
                    void performSave(value);
                  }
                }}
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: colors.textOnAccent },
                  ]}
                >
                  {t('readings.detail.action.confirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  cardBody: {
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  fieldLabel: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
  },
  fieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  fieldValue: {
    fontWeight: '700',
    textAlign: 'left',
  },
  flex: { flex: 1 },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'right',
  },
  modalBtn: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  saveBtn: {
    marginTop: 12,
  },
  scroll: {
    padding: 12,
    paddingBottom: 32,
  },
  warningBanner: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 10,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  printBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 12,
  },
  printBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  printHint: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
});
