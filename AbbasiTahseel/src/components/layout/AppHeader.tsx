/**
 * AppHeader — reusable navy top bar
 *
 * Layout (RTL — visual order right-to-left because the app is forced-RTL):
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ [Title.....................]  [Sync badge]  [Menu / Back]    │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Props:
 *   - title         (required)  visible H1 of the screen
 *   - showBack      open the back arrow + call navigation.goBack()
 *   - showMenu      open the right-side drawer (uses DrawerActions)
 *   - rightAction   optional ReactNode to render on the far left
 *                   (e.g. a 'sync now' button on the Home screen)
 *
 * Performance: wrapped in React.memo. The header is mounted on every Main
 * screen, so avoiding re-renders when neighbouring sync state changes is
 * worthwhile.
 */

import {
  DrawerActions,
  useNavigation,
} from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { SyncStatusBadge } from '@/components/sync/SyncStatusBadge';
import { useTheme } from '@/design-system/theme';

export interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  rightAction?: React.ReactNode;
}

function AppHeaderImpl(props: AppHeaderProps): React.JSX.Element {
  const { title, showBack = false, showMenu = false, rightAction } = props;
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleBack = (): void => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleMenu = (): void => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.brandSecondary,
          borderBottomColor: colors.brandSecondaryDark,
        },
      ]}
    >
      {/* Right slot (visual right under RTL) — menu or back button. */}
      <View style={styles.slot}>
        {showMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="menu"
            onPress={handleMenu}
            style={styles.iconButton}
          >
            <Feather name="menu" size={22} color={colors.white} />
          </Pressable>
        ) : showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="back"
            onPress={handleBack}
            style={styles.iconButton}
          >
            <Feather name="arrow-right" size={22} color={colors.white} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      {/* Title — flexes to fill, right-aligned visually. */}
      <Text
        numberOfLines={1}
        style={[styles.title, { color: colors.white }]}
      >
        {title}
      </Text>

      {/* Sync badge + optional rightAction. */}
      <View style={styles.rightSlot}>
        {rightAction ?? null}
        <SyncStatusBadge />
      </View>
    </View>
  );
}

export const AppHeader = React.memo(AppHeaderImpl);

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: 8,
  },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rightSlot: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  slot: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    marginHorizontal: 8,
    textAlign: 'right',
  },
});
