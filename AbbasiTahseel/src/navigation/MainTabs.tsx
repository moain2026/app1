/**
 * MainTabs — bottom tab navigator (Wave 3)
 *
 * Four tabs ordered visually right→left under RTL:
 *   [Reports] [Bonds] [Readings] [Home←first]
 *
 * The order in the JSX matches the *logical* order. React Navigation +
 * the forced-RTL I18nManager (App.tsx) flip the visual layout automatically
 * so the user sees "الرئيسية" on the right edge (closest to the thumb
 * on RTL devices).
 *
 * Header is hidden because each screen mounts its own <AppHeader/>; this
 * keeps a single header style across tabs AND drawer screens.
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { BondsScreen } from '@/screens/main/BondsScreen';
import { HomeScreen } from '@/screens/main/HomeScreen';
import { ReadingsScreen } from '@/screens/main/ReadingsScreen';
import { ReportsScreen } from '@/screens/main/ReportsScreen';

import type { MainTabsParamList } from './types';

// Feather's name prop is typed as a string union. We pick a concrete alias
// from the component's own props so we don't need to enumerate every name.
type FeatherProps = ComponentProps<typeof Feather>;
type FeatherName = FeatherProps['name'];

const Tabs = createBottomTabNavigator<MainTabsParamList>();

interface TabIconProps {
  name: FeatherName;
  color: string;
  size: number;
}

function makeTabIcon(name: FeatherName) {
  return function TabIcon(props: { color: string; size: number }): React.JSX.Element {
    const iconProps: TabIconProps = {
      name,
      color: props.color,
      size: props.size,
    };
    return <Feather {...iconProps} />;
  };
}

export function MainTabs(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('navigation.tabs.home'),
          tabBarIcon: makeTabIcon('home'),
        }}
      />
      <Tabs.Screen
        name="Readings"
        component={ReadingsScreen}
        options={{
          tabBarLabel: t('navigation.tabs.readings'),
          tabBarIcon: makeTabIcon('zap'),
        }}
      />
      <Tabs.Screen
        name="Bonds"
        component={BondsScreen}
        options={{
          tabBarLabel: t('navigation.tabs.bonds'),
          tabBarIcon: makeTabIcon('file-text'),
        }}
      />
      <Tabs.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: t('navigation.tabs.reports'),
          tabBarIcon: makeTabIcon('bar-chart-2'),
        }}
      />
    </Tabs.Navigator>
  );
}
