/**
 * Root component — العباسي تحصيل
 *
 * Wave 2: full provider stack wiring.
 *   GestureHandlerRootView   (gesture system root, MUST be outermost)
 *     └─ SafeAreaProvider     (safe-area insets for notched devices)
 *         └─ ThemeProvider    (design-system colors + dark theme)
 *             └─ RootNavigator (decides Auth/Main stack, owns its own
 *                               NavigationContainer per variant)
 *
 * i18n is initialised once before the tree mounts; we keep the Splash
 * gating in RootNavigator so the user always sees the brand splash even
 * when i18n bootstrap is instantaneous (cached language).
 */

import React, { useEffect, useState } from 'react';
import { I18nManager, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/design-system/theme';
import { initI18n } from './src/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useSyncStore } from './src/stores/syncStore';

// Force RTL globally before anything renders.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function App(): React.JSX.Element | null {
  const [i18nReady, setI18nReady] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      try {
        await initI18n();
      } catch {
        // i18n is best-effort; bundled fallback covers us.
      }
      try {
        await useSyncStore.getState().init();
      } catch {
        // Sync init failure must not block the UI — the badge will just
        // show 'offline' until the user retries from the detail sheet.
      }
      if (!cancelled) {
        setI18nReady(true);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      useSyncStore.getState().cleanup();
    };
  }, []);

  if (!i18nReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar barStyle="light-content" />
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
