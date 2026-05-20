/**
 * LoginScreen — username + password authentication
 *
 * Uses react-hook-form + zod for validation. The schema lives inline
 * here (rather than re-exporting from services/api/schemas/auth) because
 * UI-side validation needs Arabic error messages — the API schema speaks
 * only in code-level i18n keys.
 *
 * Success path:
 *   useAuthStore.login() → if success → RootNavigator switches to Main
 *   (because isAuthenticated becomes true). The screen itself does not
 *   call navigation.replace(); however if a PIN has not yet been set,
 *   we route to PinSetup before the stack flips.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { z } from 'zod';

import { PasswordField, PrimaryButton, TextField } from '@/components/forms';
import { useTheme } from '@/design-system/theme';
import { http } from '@/services/api/httpClient';
import {
  DEV_BYPASS_PASSWORD,
  DEV_BYPASS_USERNAME,
} from '@/services/auth/devBypass';
import { getSecureId } from '@/services/security/licenseManager';
import { getBaseUrl } from '@/services/storage/prefs';
import { getAdminPinHash } from '@/services/storage/secureStorage';
import { useAuthStore } from '@/stores/authStore';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/logo/abbasi_logo.png');

// ─── Form schema (UI-side, with i18n keys as messages) ────────────────────
const LoginFormSchema = z.object({
  username: z.string().min(1, 'auth.login.usernameRequired'),
  password: z.string().min(1, 'auth.login.passwordRequired'),
});
type LoginFormValues = z.infer<typeof LoginFormSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const lastLoginError = useAuthStore((s) => s.lastLoginError);
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);
  const [isTestingConnection, setTestingConnection] = useState<boolean>(false);
  const [secureIdPreview, setSecureIdPreview] = useState<string>('');
  const [errorModalVisible, setErrorModalVisible] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { username: '', password: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    // Clear any stale store error when this screen mounts.
    clearError();
  }, [clearError]);

  // ─── secureId preview ────────────────────────────────────────────────
  // Re-resolves on EVERY focus, not just initial mount. This matters because
  // the operator typically opens ServerSettings, edits the override, hits
  // Save, then returns here — without the focus dependency the preview line
  // would still show the auto-computed value and be misleading.
  // See: docs/LEGACY_AUTH_ANALYSIS.md "Bug discovered from Wave 3 screenshots".
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getSecureId()
        .then((v) => {
          if (!cancelled) setSecureIdPreview(v);
        })
        .catch(() => {
          if (!cancelled) setSecureIdPreview('—');
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // Build the human-readable error details block shown in the modal.
  const errorDetailsText = lastLoginError
    ? [
        `URL: ${lastLoginError.url}`,
        `Method: ${lastLoginError.method}`,
        `Status: ${lastLoginError.responseStatus ?? '—'}`,
        `Code: ${lastLoginError.errorCode}`,
        `Time: ${lastLoginError.timestamp}`,
        '',
        'Request body:',
        JSON.stringify(lastLoginError.requestBody, null, 2),
        '',
        'Response body:',
        lastLoginError.responseBody.length > 0
          ? lastLoginError.responseBody
          : '<empty>',
      ].join('\n')
    : '';

  const onSubmit = handleSubmit(async (values) => {
    Keyboard.dismiss();
    const ok = await login(values.username, values.password);
    if (!ok) {
      return;
    }
    // Decide between PinSetup and Main: if no PIN is stored yet, route to
    // PinSetup so the user can lock the app behind a 4-digit PIN.
    const pinHash = await getAdminPinHash();
    if (!pinHash) {
      navigation.replace('PinSetup');
      return;
    }
    // Otherwise: the store has already set isAuthenticated → RootNavigator
    // will switch to Main automatically on the next render.
  });

  /**
   * Dev Mode one-tap login. Pre-fills the form with the bypass credentials
   * (which are documented in the helper text right above the button so the
   * operator can also type them by hand) and triggers a submit. The bypass
   * branch inside `useAuthStore.login` then short-circuits before any
   * network call — see services/auth/devBypass.ts.
   */
  function quickDevLogin(): void {
    setValue('username', DEV_BYPASS_USERNAME, { shouldValidate: false });
    setValue('password', DEV_BYPASS_PASSWORD, { shouldValidate: false });
    Keyboard.dismiss();
    void onSubmit();
  }

  const banner =
    error !== null && error.length > 0 ? t(error) : undefined;

  // DEV-only Test Connection — pings the configured base URL with a GET
  // and surfaces the status/error so the operator can distinguish between
  // (a) server unreachable, (b) wrong endpoint, (c) wrong credentials.
  async function onTestConnection(): Promise<void> {
    setTestingConnection(true);
    const baseUrl = getBaseUrl();
    try {
      const response = await http.request<unknown>({
        url: '',
        method: 'GET',
        timeout: 8_000,
      });
      Alert.alert(
        t('auth.login.testConnection'),
        `${t('auth.login.testReachable')}\n\nURL: ${baseUrl}\nStatus: ${response.status}`,
      );
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: unknown }).code ?? '')
          : '';
      const status =
        err && typeof err === 'object' && 'httpStatus' in err
          ? String((err as { httpStatus?: unknown }).httpStatus ?? '')
          : '';
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert(
        t('auth.login.testConnection'),
        `${t('auth.login.testFailed')}\n\nURL: ${baseUrl}\nCode: ${code || '—'}\nStatus: ${status || '—'}\n${message}`,
      );
    } finally {
      setTestingConnection(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Top-right gear: opens ServerSettings. Sits OUTSIDE the ScrollView
          so it stays anchored even when the form pushes content up. */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.server.title')}
          onPress={() => navigation.navigate('ServerSettings')}
          style={styles.gearButton}
          hitSlop={8}
        >
          <Feather name="settings" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('auth.login.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.login.subtitle')}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Controller
            control={control}
            name="username"
            render={({ field }) => (
              <TextField
                label={t('auth.login.username')}
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('auth.login.usernamePlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                error={
                  errors.username?.message
                    ? t(errors.username.message)
                    : undefined
                }
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordField
                label={t('auth.login.password')}
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('auth.login.passwordPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                showLabel={t('common.show')}
                hideLabel={t('common.hide')}
                error={
                  errors.password?.message
                    ? t(errors.password.message)
                    : undefined
                }
              />
            )}
          />

          {banner !== undefined ? (
            <Text style={[styles.banner, { color: colors.danger }]}>
              {banner}
            </Text>
          ) : null}

          <PrimaryButton
            title={
              isLoading ? t('auth.login.submitting') : t('auth.login.submit')
            }
            onPress={() => void onSubmit()}
            loading={isLoading}
          />

          <Text style={[styles.forgot, { color: colors.textTertiary }]}>
            {t('auth.login.forgotPassword')}
          </Text>

          {__DEV__ ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void onTestConnection()}
              disabled={isTestingConnection}
              style={[styles.debugBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.debugBtnText, { color: colors.textSecondary }]}>
                {isTestingConnection
                  ? t('auth.login.testTesting')
                  : `🐛 ${t('auth.login.testConnection')}`}
              </Text>
            </Pressable>
          ) : null}

          {/* secureId preview (small, always visible) — the operator can
              verify visually that the value the app sends matches the one
              the legacy device used. Truncated to first 12 chars.        */}
          <Text
            style={[styles.secureIdPreview, { color: colors.textTertiary }]}
            selectable
          >
            {t('auth.login.secureIdInUse', {
              value:
                secureIdPreview.length > 12
                  ? `${secureIdPreview.slice(0, 12)}…`
                  : secureIdPreview || '—',
            })}
          </Text>

          {/* Copy error details — appears only after a failed login. */}
          {lastLoginError !== null ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setErrorModalVisible(true)}
              style={[styles.debugBtn, { borderColor: colors.danger }]}
            >
              <Text style={[styles.debugBtnText, { color: colors.danger }]}>
                {t('auth.login.copyError')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* ─── Dev Mode card ──────────────────────────────────────────────
            Visually distinct (warning-colored border) so it cannot be
            mistaken for the real login. Shows the bypass credentials in
            plain sight; the one-tap button prefills+submits in one step. */}
        <View
          style={[
            styles.devCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.warning,
            },
          ]}
        >
          <Text style={[styles.devTitle, { color: colors.warning }]}>
            {t('auth.login.devMode.title')}
          </Text>
          <Text style={[styles.devBody, { color: colors.textSecondary }]}>
            {t('auth.login.devMode.description')}
          </Text>
          <Text
            style={[styles.devCreds, { color: colors.textTertiary }]}
            selectable
          >
            {t('auth.login.devMode.credentials')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={quickDevLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.devButton,
              {
                backgroundColor: pressed
                  ? colors.surfaceElevated
                  : colors.surface,
                borderColor: colors.warning,
                opacity: isLoading ? 0.5 : 1,
              },
            ]}
          >
            <Text
              style={[styles.devButtonText, { color: colors.textPrimary }]}
            >
              {t('auth.login.devMode.quickLogin')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: colors.textPrimary }]}
            >
              {t('auth.login.copyError')}
            </Text>
            <ScrollView style={styles.modalScroll}>
              <Text
                style={[styles.modalBody, { color: colors.textSecondary }]}
                selectable
              >
                {errorDetailsText}
              </Text>
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setErrorModalVisible(false)}
              style={[styles.modalClose, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.debugBtnText, { color: colors.textPrimary }]}
              >
                {t('sync.actions.close')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: {
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    padding: 20,
  },
  debugBtn: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  debugBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalBody: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'left',
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: '80%',
    padding: 16,
    width: '100%',
  },
  modalClose: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 10,
  },
  modalScroll: {
    marginTop: 8,
    maxHeight: 380,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  secureIdPreview: {
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  devCard: {
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    marginTop: 16,
    padding: 14,
  },
  devTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'right',
  },
  devBody: {
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'right',
  },
  devCreds: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
    textAlign: 'right',
  },
  devButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  devButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  flex: { flex: 1 },
  gearButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  forgot: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
  },
  logo: {
    height: 72,
    marginBottom: 12,
    width: 72,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
});
