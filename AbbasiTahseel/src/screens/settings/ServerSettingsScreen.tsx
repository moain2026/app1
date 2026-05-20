/**
 * ServerSettingsScreen — إعدادات الاتصال
 *
 * Lets the field operator override the backend connection parameters that
 * normally default to the Tailscale-internal IP (see prefs.ts §Defaults).
 *
 * Reachable from:
 *   1) LoginScreen      → top-right gear icon       (route: 'ServerSettings')
 *   2) Drawer menu      → "إعدادات الاتصال"          (route: 'ServerSettings')
 *
 * Validation:
 *   - serverAddress: dotted-quad IPv4 OR DNS hostname OR Tailscale magic-DNS
 *   - port: integer in [1, 65535]
 *   - branch: non-empty digits
 *   - useHttps: boolean toggle (default false)
 *
 * Persistence: writes through prefs.ts (MMKV). On save the API client picks
 * up the new baseUrl on the *next* HTTP call (httpClient.ts builds the URL
 * lazily via getBaseUrl()).
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { z } from 'zod';

import { PrimaryButton, TextField } from '@/components/forms';
import { useTheme } from '@/design-system/theme';
import {
  generateDeviceId,
  getLegacySecureId,
} from '@/services/security/licenseManager';
import {
  getBranchNumber,
  getHostingIp,
  getPort,
  getSecureIdOverride,
  getUseHttps,
  setBranchNumber,
  setHostingIp,
  setPort,
  setSecureIdOverride,
  setUseHttps,
} from '@/services/storage/prefs';

// ─── Validation schema (UI-side, i18n keys as error messages) ─────────────
const IP_OR_HOST = /^(?:(?:\d{1,3}\.){3}\d{1,3}|[a-zA-Z0-9][a-zA-Z0-9.-]*)$/;

// secureId may be empty (use auto) OR a 8-32 char string of digits / hex /
// letters — the legacy server stores whatever it was issued, so we don't
// hard-restrict the character set here, only the length range.
const SECURE_ID_OK = /^[A-Za-z0-9_-]{8,32}$/;

const ServerSettingsFormSchema = z.object({
  serverAddress: z
    .string()
    .trim()
    .min(1, 'settings.server.invalidIp')
    .regex(IP_OR_HOST, 'settings.server.invalidIp'),
  port: z
    .string()
    .trim()
    .min(1, 'settings.server.invalidPort')
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 65535;
    }, 'settings.server.invalidPort'),
  branch: z
    .string()
    .trim()
    .min(1, 'settings.server.invalidBranch')
    .regex(/^\d+$/, 'settings.server.invalidBranch'),
  secureIdOverride: z
    .string()
    .trim()
    .refine(
      (v) => v.length === 0 || SECURE_ID_OK.test(v),
      'settings.server.secureIdInvalid',
    ),
  useHttps: z.boolean(),
});

type ServerSettingsFormValues = z.infer<typeof ServerSettingsFormSchema>;

export function ServerSettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [deviceId, setDeviceId] = useState<string>('');
  const [autoSecureId, setAutoSecureId] = useState<string>('');

  // Load defaults from prefs on mount.
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ServerSettingsFormValues>({
    resolver: zodResolver(ServerSettingsFormSchema),
    defaultValues: {
      serverAddress: getHostingIp(),
      port: getPort(),
      branch: getBranchNumber(),
      secureIdOverride: getSecureIdOverride(),
      useHttps: getUseHttps(),
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    let cancelled = false;
    void Promise.all([generateDeviceId(), getLegacySecureId()])
      .then(([id, legacy]) => {
        if (!cancelled) {
          setDeviceId(id);
          setAutoSecureId(legacy);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeviceId('—');
          setAutoSecureId('—');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = handleSubmit((values) => {
    setHostingIp(values.serverAddress);
    setPort(values.port);
    setBranchNumber(values.branch);
    setSecureIdOverride(values.secureIdOverride);
    setUseHttps(values.useHttps);
    ToastAndroid.show(t('settings.server.saved'), ToastAndroid.SHORT);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  });

  const onCancel = (): void => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Inline AppBar — this screen predates AppHeader and is reachable
          from the unauthenticated AuthStack where the drawer isn't mounted. */}
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: colors.brandSecondary,
            borderBottomColor: colors.borderStrong,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={onCancel}
          style={styles.appBarIcon}
        >
          <Feather name="arrow-right" size={22} color={colors.white} />
        </Pressable>
        <Text style={[styles.appBarTitle, { color: colors.white }]}>
          {t('settings.server.title')}
        </Text>
        <View style={styles.appBarIcon} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Controller
            control={control}
            name="serverAddress"
            render={({ field }) => (
              <TextField
                label={t('settings.server.serverAddress')}
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('settings.server.serverAddressPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                error={
                  errors.serverAddress?.message
                    ? t(errors.serverAddress.message)
                    : undefined
                }
              />
            )}
          />

          <Controller
            control={control}
            name="port"
            render={({ field }) => (
              <TextField
                label={t('settings.server.port')}
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('settings.server.portPlaceholder')}
                keyboardType="number-pad"
                error={
                  errors.port?.message ? t(errors.port.message) : undefined
                }
              />
            )}
          />

          <Controller
            control={control}
            name="branch"
            render={({ field }) => (
              <TextField
                label={t('settings.server.branch')}
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('settings.server.branchPlaceholder')}
                keyboardType="number-pad"
                error={
                  errors.branch?.message ? t(errors.branch.message) : undefined
                }
              />
            )}
          />

          {/* secureId override — the legacy backend has each user pinned to a
              specific 10-digit decimal (derived from the legacy device's
              ANDROID_ID). Operators migrating from the legacy app must paste
              that value here so the server-side record continues to match. */}
          <Controller
            control={control}
            name="secureIdOverride"
            render={({ field }) => (
              <View>
                <TextField
                  label={t('settings.server.secureIdLabel')}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t('settings.server.secureIdPlaceholder')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                  maxLength={32}
                  error={
                    errors.secureIdOverride?.message
                      ? t(errors.secureIdOverride.message)
                      : undefined
                  }
                />
                <Text
                  style={[styles.hint, { color: colors.textTertiary }]}
                  selectable
                >
                  {t('settings.server.secureIdAuto', {
                    value: autoSecureId || '—',
                  })}
                </Text>
                <Text style={[styles.hint, { color: colors.textTertiary }]}>
                  {t('settings.server.secureIdHint')}
                </Text>
              </View>
            )}
          />

          {/* Device ID (read-only). */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
              {t('settings.server.serialNumber')}
            </Text>
            <Text
              style={[styles.rowValue, { color: colors.textPrimary }]}
              selectable
            >
              {deviceId || '—'}
            </Text>
          </View>

          {/* HTTPS toggle. */}
          <Controller
            control={control}
            name="useHttps"
            render={({ field }) => (
              <View style={styles.switchRow}>
                <Text
                  style={[styles.rowLabel, { color: colors.textSecondary }]}
                >
                  {t('settings.server.useHttps')}
                </Text>
                <Switch
                  value={field.value}
                  onValueChange={field.onChange}
                  thumbColor={
                    field.value ? colors.accent : colors.textTertiary
                  }
                  trackColor={{
                    false: colors.border,
                    true: colors.accentSoft,
                  }}
                />
              </View>
            )}
          />
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title={t('settings.server.save')}
            onPress={() => void onSave()}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={[
              styles.cancelButton,
              { borderColor: colors.borderStrong },
            ]}
          >
            <Text
              style={[styles.cancelLabel, { color: colors.textSecondary }]}
            >
              {t('settings.server.cancel')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 20,
  },
  appBar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: 8,
  },
  appBarIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  appBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  cancelLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 16,
    padding: 16,
  },
  flex: { flex: 1 },
  hint: {
    fontSize: 11,
    marginTop: 2,
    paddingHorizontal: 4,
    textAlign: 'left',
  },
  row: {
    borderTopColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 13,
    maxWidth: '60%',
    textAlign: 'left',
  },
  scroll: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
