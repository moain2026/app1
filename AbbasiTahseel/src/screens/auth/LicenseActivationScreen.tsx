/**
 * LicenseActivationScreen — entry point for first-run setup
 *
 * Layout:
 *   ┌─ Header (logo + title) ─────────────────────────┐
 *   │ Card                                            │
 *   │   "معرف الجهاز" + value + copy button           │
 *   │   "مفتاح الترخيص" + input                       │
 *   │   PrimaryButton "تفعيل"                         │
 *   └─────────────────────────────────────────────────┘
 *   Inline error message under the input.
 *
 * State management:
 *   The screen reads/writes via `useLicenseStore`. On successful activate,
 *   `isLicensed` flips to true → RootNavigator automatically transitions
 *   to the Login screen.
 */

import React, { useEffect, useState } from 'react';
import {
  Clipboard,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, TextField } from '@/components/forms';
import { useTheme } from '@/design-system/theme';
import { useLicenseStore } from '@/stores/licenseStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/logo/abbasi_logo.png');

export function LicenseActivationScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const deviceId = useLicenseStore((s) => s.deviceId);
  const isLoading = useLicenseStore((s) => s.isLoading);
  const error = useLicenseStore((s) => s.error);
  const activate = useLicenseStore((s) => s.activate);
  const check = useLicenseStore((s) => s.check);
  const clearError = useLicenseStore((s) => s.clearError);

  const [key, setKey] = useState('');
  const [copyHint, setCopyHint] = useState<string | null>(null);

  // Ensure deviceId is populated even if the user navigates here directly.
  useEffect(() => {
    if (!deviceId) {
      void check();
    }
  }, [deviceId, check]);

  const handleCopy = (): void => {
    if (!deviceId) {
      return;
    }
    Clipboard.setString(deviceId);
    setCopyHint(t('common.copied'));
    setTimeout(() => setCopyHint(null), 1500);
  };

  const handleActivate = (): void => {
    void activate(key);
  };

  const handleKeyChange = (value: string): void => {
    if (error !== null) {
      clearError();
    }
    setKey(value);
  };

  const errorMessage =
    error !== null && error.length > 0 ? t(error) : undefined;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('auth.license.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.license.subtitle')}
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
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {t('auth.license.deviceId')}
          </Text>
          <View
            style={[
              styles.deviceIdRow,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={handleCopy}
              hitSlop={8}
              style={styles.copyBtn}
              accessibilityRole="button"
              accessibilityLabel={t('auth.license.copyDeviceId')}
            >
              <Text
                style={[styles.copyText, { color: colors.brandPrimary }]}
              >
                {copyHint ?? t('auth.license.copyDeviceId')}
              </Text>
            </Pressable>
            <Text
              style={[styles.deviceIdText, { color: colors.textPrimary }]}
              selectable
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {deviceId ?? '...'}
            </Text>
          </View>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            {t('auth.license.deviceIdHint')}
          </Text>

          <View style={styles.gap} />

          <TextField
            label={t('auth.license.licenseKey')}
            value={key}
            onChangeText={handleKeyChange}
            placeholder={t('auth.license.licenseKeyPlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            error={errorMessage}
          />

          <PrimaryButton
            title={
              isLoading ? t('auth.license.activating') : t('auth.license.activate')
            }
            onPress={handleActivate}
            loading={isLoading}
            disabled={key.trim().length === 0}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    padding: 20,
  },
  copyBtn: {
    paddingHorizontal: 8,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deviceIdRow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  deviceIdText: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'right',
  },
  flex: { flex: 1 },
  gap: { height: 16 },
  header: {
    alignItems: 'center',
    paddingTop: 24,
  },
  hint: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
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
});
