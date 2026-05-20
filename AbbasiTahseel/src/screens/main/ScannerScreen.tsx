/**
 * ScannerScreen — مسح رقم العداد
 *
 * Wave 5 — barcode scanner. Stub for the moment: the screen renders an
 * informational placeholder with a "manual entry" CTA so navigation can be
 * exercised end-to-end without the camera library installed yet.
 *
 * Follow-up (Wave 5.2 final pass):
 *   - Install `react-native-vision-camera@3.x` (or fall back to
 *     `react-native-camera-kit` if RN 0.74.5 autolinking misbehaves).
 *   - Replace the placeholder View with `<Camera codeScanner=... />`.
 *   - Handle permissions via `useCameraPermission()` from the lib.
 *   - On first successful scan: navigate back with the scanned value.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/design-system/theme';
import type { MainStackParamList } from '@/navigation/types';

type ScannerRoute = RouteProp<MainStackParamList, 'Scanner'>;

interface NavLike {
  goBack(): void;
}

export function ScannerScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NavLike>();
  const route = useRoute<ScannerRoute>();

  // returnTo is forwarded to the manual-entry handler so it can hop back to
  // the right surface once the camera implementation arrives.
  const returnTo = route.params?.returnTo ?? 'Readings';

  const handleManualEntry = useCallback((): void => {
    // For now, manual entry just dismisses the modal — the operator returns
    // to the previous screen and types the noadad themselves.
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <AppHeader title={t('scanner.title')} showBack />

      <View style={styles.center}>
        <Feather name="camera-off" size={64} color={colors.textTertiary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('scanner.permissionRequired')}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {t('scanner.permissionExplanation')}
        </Text>
        <Text style={[styles.devNote, { color: colors.textTertiary }]}>
          {/* Visible only because the camera lib hasn't been wired yet —
              once vision-camera is installed this branch is replaced by the
              live preview + scanner overlay. */}
          {returnTo === 'NewBond'
            ? '— Wave 5.2 pending: install vision-camera —'
            : '— Wave 5.2 pending: install vision-camera —'}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={handleManualEntry}
          style={[styles.cta, { backgroundColor: colors.brandSecondary }]}
        >
          <Feather name="edit-3" size={16} color={colors.white} />
          <Text style={[styles.ctaLabel, { color: colors.white }]}>
            {t('scanner.manualEntry')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  cta: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  devNote: {
    fontSize: 11,
    marginTop: 16,
  },
  flex: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
});
