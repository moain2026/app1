/**
 * Root component — العباسي تحصيل
 *
 * Minimal bootable shell. Mounts ThemeProvider and renders a placeholder
 * screen. Real navigation + screens land in Phase 5+.
 */

import React, { useEffect } from 'react';
import { I18nManager, StatusBar, StyleSheet, Text, View } from 'react-native';

import { ThemeProvider, useTheme } from './src/design-system/theme';

// Force RTL globally before anything renders.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function Placeholder(): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        العباسي تحصيل
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Al-Abbasi Tahsil
      </Text>
    </View>
  );
}

function App(): React.JSX.Element {
  useEffect(() => {
    // initSyncEngine() will be wired here in Phase 5 once auth is in place.
  }, []);

  return (
    <ThemeProvider>
      <Placeholder />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});

export default App;
