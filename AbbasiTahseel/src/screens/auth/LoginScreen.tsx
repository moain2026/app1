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
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Keyboard,
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
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);

  const {
    control,
    handleSubmit,
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

  const banner =
    error !== null && error.length > 0 ? t(error) : undefined;

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
        </View>
      </ScrollView>
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
