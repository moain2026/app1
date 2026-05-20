/**
 * MainStack — post-auth navigation tree (Wave 2 placeholder)
 *
 * Currently hosts a single Home screen. Wave 3 will expand this into a
 * tab navigator (Readings, Bonds, Reports, Profile) wrapped in a Drawer.
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { HomeScreen } from '@/screens/main/HomeScreen';

import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
