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
import { generateDeviceId } from '@/services/security/licenseManager';
import {
  getBranchNumber,
  getHostingIp,
  getPort,
  getUseHttps,
  setBranchNumber,
  setHostingIp,
  setPort,
  setUseHttps,
} from '@/services/storage/prefs';

// ─── Validation schema (UI-side, i18n keys as error messages) ─────────────
const IP_OR_HOST = /^(?:(?:\d{1,3}\.){3}\d{1,3}|[a-zA-Z0-9][a-zA-Z0-9.-]*)$/;

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
  useHttps: z.boolean(),
});

type ServerSettingsFormValues = z.infer<typeof ServerSettingsFormSchema>;

export function ServerSettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [deviceId, setDeviceId] = useState<string>('');

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
      useHttps: getUseHttps(),
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    let cancelled = false;
    generateDeviceId()
      .then((id) => {
        if (!cancelled) {
          setDeviceId(id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeviceId('—');
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
