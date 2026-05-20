/**
 * RootNavigator — top-level switch between Auth and Main stacks
 *
 * Bootstrap sequence:
 *   1. Render Splash (presentation-only) while we resolve license + auth
 *      state from storage. Minimum visible duration: SPLASH_MIN_MS.
 *   2. Once bootstrapped:
 *        - !isLicensed                       → AuthStack(initial='LicenseActivation')
 *        - isLicensed && !isAuthenticated    → AuthStack(initial='Login')
 *        - isLicensed && isAuthenticated     → MainStack
 *
 * The NavigationContainer is RE-KEYED when transitioning between root
 * variants. Without that, React Navigation logs noisy "Replace not
 * supported" warnings and may leave a stale stack mounted in memory.
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';

import { SplashScreen } from '@/screens/auth/SplashScreen';

import { useAuthStore } from '@/stores/authStore';
import { useLicenseStore } from '@/stores/licenseStore';

import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import type { RootStackParamList } from './types';

const Root = createNativeStackNavigator<RootStackParamList>();

/** Minimum splash duration so the brand intro is not jarring. */
const SPLASH_MIN_MS = 1500;

export function RootNavigator(): React.JSX.Element {
  const [bootstrapped, setBootstrapped] = useState(false);

  const isLicensed = useLicenseStore((s) => s.isLicensed);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const checkLicense = useLicenseStore((s) => s.check);
  const loadAuthFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    (async (): Promise<void> => {
      try {
        await Promise.all([checkLicense(), loadAuthFromStorage()]);
      } catch {
        // Even on failure, proceed — the user can retry from the next screen.
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed < SPLASH_MIN_MS) {
        await new Promise<void>((r) =>
          setTimeout(r, SPLASH_MIN_MS - elapsed),
        );
      }
      if (!cancelled) {
        setBootstrapped(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkLicense, loadAuthFromStorage]);

  // ─── Render ──────────────────────────────────────────────────────────
  if (!bootstrapped) {
    return <SplashScreen />;
  }

  if (!isLicensed) {
    return (
      <NavigationContainer key="auth-license">
        <AuthStack initialRouteName="LicenseActivation" />
      </NavigationContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer key="auth-login">
        <AuthStack initialRouteName="Login" />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer key="main">
      <Root.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Main"
      >
        <Root.Screen name="Main" component={MainStack} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
