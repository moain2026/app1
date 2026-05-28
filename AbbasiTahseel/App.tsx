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
import { runMigrationHooks } from './src/database/migrationRunner';
import { seedAllIfDevBypass } from './src/services/mock/seedAll';
import { initSyncEngine, shutdownSync } from './src/services/sync';
import { useAuthStore } from './src/stores/authStore';
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
      // Run data-level migration hooks AFTER WMDB has settled (which
      // happens implicitly on the first collection access) but BEFORE
      // any screen mounts. Wave 6-Β registers no hooks yet — see
      // `migrationRunner.ts` — so this is currently a near-no-op but
      // the call site is wired in advance to avoid retrofitting later.
      try {
        await runMigrationHooks();
      } catch {
        // The runner already swallows individual-hook failures; an outer
        // throw here would only come from a bug in the runner itself.
        // Failing-open is the documented policy.
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

    // Subscribe to auth state — drives two side-effects:
    //
    //  1. DEV BYPASS SEEDING — every time the session flips into Dev
    //     Bypass mode, ensure ALL mock entities are seeded (readings,
    //     bonds, accounts, places, currencies). Idempotent + gated on
    //     isDevBypass, so safe to call eagerly.
    //
    //  2. WAVE 7 P1 — SYNC ENGINE LIFECYCLE
    //     A real (non-bypass) authenticated session is what gates the
    //     network sync engine. We start the engine on the rising edge
    //     of `(isAuthenticated && !isDevBypass)` and tear it down on
    //     the falling edge (logout). This covers both fresh login and
    //     cold-restart-with-valid-token (SplashScreen calls
    //     loadFromStorage which flips isAuthenticated).
    //
    //     Why NOT call initSyncEngine() unconditionally at startup?
    //       - It would try to push/pull with no token, hit the no_auth
    //         precondition, and emit a useless `engine:skipped` event.
    //       - Worse: the foreground timer would keep firing every 5
    //         minutes during the login-screen-shown phase.
    //       - And on dev-bypass we explicitly DON'T want network
    //         traffic — the bypass session uses mocks throughout.
    const unsubscribeAuth = useAuthStore.subscribe((state, prevState) => {
      // (1) Dev-bypass seeders.
      if (state.isDevBypass && !prevState.isDevBypass) {
        void seedAllIfDevBypass();
      }

      // (2) Sync engine start/stop. Compare BOTH dimensions because
      //     flipping from dev-bypass → real login should also start
      //     the engine (rare but possible during testing).
      const wasActive = prevState.isAuthenticated && !prevState.isDevBypass;
      const isActive = state.isAuthenticated && !state.isDevBypass;
      if (isActive && !wasActive) {
        void initSyncEngine().catch(() => {
          // Engine failures are non-fatal — the badge will report
          // 'offline' until the user retries. We deliberately don't
          // surface this here; useSyncStore.lastError carries detail.
        });
      } else if (!isActive && wasActive) {
        void shutdownSync().catch(() => {
          // Same rationale: silent. shutdown is best-effort.
        });
      }
    });

    // Also try once on cold start (covers the loadFromStorage rehydrate
    // path where the bypass session was already active from a previous run).
    void seedAllIfDevBypass();

    // Cold-restart hot-path: if loadFromStorage has already restored a
    // real session by the time this effect runs (subscribe fires only on
    // CHANGES, not initial state), bring up the engine here. This is a
    // no-op if the session is bypass or unauthenticated.
    {
      const s = useAuthStore.getState();
      if (s.isAuthenticated && !s.isDevBypass) {
        void initSyncEngine().catch(() => {
          /* silent — see above */
        });
      }
    }

    return () => {
      cancelled = true;
      unsubscribeAuth();
      useSyncStore.getState().cleanup();
      // Best-effort engine teardown on unmount. shutdownSync() is
      // idempotent and returns immediately if the engine was never
      // initialized.
      void shutdownSync().catch(() => {
        /* silent */
      });
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
