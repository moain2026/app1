/**
 * SplashScreen — first screen shown at app launch
 *
 * Responsibilities:
 *   1. Brand-coloured background (theme.colors.brandSecondary — navy).
 *   2. Centered logo with the localized app name underneath.
 *   3. Fade-in animation via react-native-reanimated.
 *   4. After ~1.5 s, kicks off the routing decision:
 *        - check license + load auth tokens from storage
 *        - the parent RootNavigator observes the stores and switches
 *          stacks automatically; this screen does NOT navigate manually.
 *
 * We deliberately keep this screen "dumb" — store actions own the side
 * effects; the screen merely triggers them and waits.
 */

import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/design-system/theme';
import { useAuthStore } from '@/stores/authStore';
import { useLicenseStore } from '@/stores/licenseStore';

// Asset import — bundled by Metro/Webpack into the APK.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/logo/abbasi_logo.png');

const FADE_DURATION = 600;
const MIN_DISPLAY_MS = 1500;

export function SplashScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const checkLicense = useLicenseStore((s) => s.check);
  const loadAuthFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: FADE_DURATION });

    const startedAt = Date.now();

    void (async () => {
      // Run boot-time checks in parallel. The RootNavigator subscribes to
      // the resulting state and switches stacks automatically.
      await Promise.all([checkLicense(), loadAuthFromStorage()]);

      // Guarantee a minimum visible duration so the splash doesn't flash.
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_DISPLAY_MS) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, MIN_DISPLAY_MS - elapsed),
        );
      }
      // Mark "bootstrap done" by toggling the local trigger. The
      // navigator already observes auth/license — no further action needed.
    })();
    // checkLicense + loadAuthFromStorage are stable Zustand references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.brandSecondary }]}
    >
      <Animated.View style={[styles.center, animatedStyle]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.appName, { color: colors.brandPrimary }]}>
          {t('common.appName')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textOnAccent }]}>
          {t('auth.splash.loading')}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  appName: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    height: 140,
    width: 140,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.85,
    textAlign: 'center',
  },
});
