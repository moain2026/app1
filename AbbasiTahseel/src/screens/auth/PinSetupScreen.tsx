/**
 * PinSetupScreen — first-time PIN creation
 *
 * Flow:
 *   1. User enters a 4-digit PIN.
 *   2. User confirms by re-entering the same PIN in a second box.
 *   3. On save:
 *      - PINs must match
 *      - PIN must be exactly 4 digits
 *      - We persist the PIN via setAdminPinHash (Keychain) and the
 *        legacy-shaped pinManager (per-user). Both writes are required:
 *        the former unlocks the app on cold start (no user yet); the
 *        latter is needed once a user is bound to the session.
 *   4. After successful save, navigation logic is handled by
 *      RootNavigator: the stack flips to Main because isAuthenticated
 *      is already true (we arrived here from a successful login).
 *
 * Note: We deliberately do NOT block the user with a modal — failures
 * are rendered inline. The Save button is the only path forward.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinInput, PrimaryButton } from '@/components/forms';
import { useTheme } from '@/design-system/theme';
import { setPin } from '@/services/security/pinManager';
import { setAdminPinHash } from '@/services/storage/secureStorage';
import { useAuthStore } from '@/stores/authStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/logo/abbasi_logo.png');

const PIN_LENGTH = 4;

export function PinSetupScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const username = useAuthStore((s) => s.user?.username ?? 'default');

  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (): Promise<void> => {
    setError(null);

    if (pin1.length !== PIN_LENGTH || pin2.length !== PIN_LENGTH) {
      setError('auth.pin.tooShort');
      return;
    }
    if (pin1 !== pin2) {
      setError('auth.pin.mismatch');
      return;
    }

    setSaving(true);
    const [adminOk, perUserOk] = await Promise.all([
      setAdminPinHash(pin1),
      setPin(username, pin1),
    ]);
    setSaving(false);

    if (!adminOk || !perUserOk) {
      setError('auth.pin.saveFailed');
      return;
    }
    // No manual navigation — RootNavigator already routes to Main when
    // isAuthenticated is true (it is, since this screen is reached
    // after a successful login).
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
            {t('auth.pin.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.pin.subtitle')}
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
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('auth.pin.enterPin')}
          </Text>
          <PinInput value={pin1} onChange={setPin1} />

          <View style={styles.gap} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('auth.pin.confirmPin')}
          </Text>
          <PinInput value={pin2} onChange={setPin2} autoFocus={false} />

          {errorMessage !== undefined ? (
            <Text style={[styles.error, { color: colors.danger }]}>
              {errorMessage}
            </Text>
          ) : null}

          <PrimaryButton
            title={saving ? t('auth.pin.saving') : t('auth.pin.save')}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={pin1.length !== PIN_LENGTH || pin2.length !== PIN_LENGTH}
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
  error: {
    fontSize: 13,
    marginVertical: 8,
    textAlign: 'center',
  },
  flex: { flex: 1 },
  gap: { height: 16 },
  header: {
    alignItems: 'center',
    paddingTop: 24,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
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
