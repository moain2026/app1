/**
 * AuthStack — pre-auth navigation tree
 *
 * Screens: Splash, LicenseActivation, Login, PinSetup.
 *
 * The initial route is configurable so RootNavigator can decide whether
 * to start on Splash (rare — only on cold boot inside the stack itself)
 * or directly on LicenseActivation / Login based on store state.
 *
 * Each screen's success path navigates forward with `navigation.replace`
 * so the user cannot back-swipe to a completed step.
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { LicenseActivationScreen } from '@/screens/auth/LicenseActivationScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { PinSetupScreen } from '@/screens/auth/PinSetupScreen';
import { SplashScreen } from '@/screens/auth/SplashScreen';
import { ServerSettingsScreen } from '@/screens/settings/ServerSettingsScreen';

import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export interface AuthStackProps {
  /** Which screen to mount first. Defaults to 'Splash'. */
  initialRouteName?: keyof AuthStackParamList;
}

export function AuthStack(props: AuthStackProps): React.JSX.Element {
  const { initialRouteName = 'Splash' } = props;
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen
        name="LicenseActivation"
        component={LicenseActivationScreen}
      />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="PinSetup" component={PinSetupScreen} />
      <Stack.Screen
        name="ServerSettings"
        component={ServerSettingsScreen}
        options={{ animation: 'slide_from_left' }}
      />
    </Stack.Navigator>
  );
}
