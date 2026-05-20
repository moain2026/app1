/**
 * MainStack — post-auth Drawer navigator (Wave 3)
 *
 * Right-side drawer (RTL) that hosts:
 *   - Tabs            -> MainTabs (Home / Readings / Bonds / Reports)
 *   - Profile         -> placeholder (Wave 7)
 *   - Settings        -> placeholder (Wave 7)
 *   - About           -> placeholder (Wave 7)
 *   - ServerSettings  -> connection settings (reusable from Auth too)
 *
 * Configuration:
 *   - drawerPosition: 'right'   (visual right under RTL — swipe from edge)
 *   - drawerType:     'front'   (overlay; doesn't push content)
 *   - swipeEnabled:   true
 *   - headerShown:    false     (every screen mounts its own AppHeader)
 */

import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';

import { AboutScreen } from '@/screens/main/AboutScreen';
import { ProfileScreen } from '@/screens/main/ProfileScreen';
import { ReadingDetailScreen } from '@/screens/main/ReadingDetailScreen';
import { SettingsScreen } from '@/screens/main/SettingsScreen';
import { ServerSettingsScreen } from '@/screens/settings/ServerSettingsScreen';

import { DrawerContent } from './DrawerContent';
import { MainTabs } from './MainTabs';
import type { MainStackParamList } from './types';

const Drawer = createDrawerNavigator<MainStackParamList>();

export function MainStack(): React.JSX.Element {
  return (
    <Drawer.Navigator
      initialRouteName="Tabs"
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerType: 'front',
        swipeEnabled: true,
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen name="Tabs" component={MainTabs} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="About" component={AboutScreen} />
      <Drawer.Screen
        name="ServerSettings"
        component={ServerSettingsScreen}
      />
      {/* Wave 4 — reachable via navigation.navigate('ReadingDetail', ...).
          Not listed in DrawerContent so it doesn't appear in the side menu. */}
      <Drawer.Screen
        name="ReadingDetail"
        component={ReadingDetailScreen}
        options={{ swipeEnabled: false }}
      />
    </Drawer.Navigator>
  );
}
