/**
 * ThemeProvider — العباسي تحصيل
 *
 * Wraps the app and exposes the active theme via React Context.
 * The chosen theme is driven by `useThemeStore` (Zustand) which persists
 * the user's preference to MMKV (light / dark / auto-from-system).
 *
 * Usage:
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 *
 * Inside any component:
 *   const theme = useTheme();
 *   <View style={{ backgroundColor: theme.colors.background }} />
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, type Theme } from './darkTheme';
import { lightTheme } from './lightTheme';

export type ThemePreference = 'light' | 'dark' | 'auto';

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  /** User preference. Default = 'dark' (per product requirements). */
  preference?: ThemePreference;
}

export function ThemeProvider({
  children,
  preference = 'dark',
}: ThemeProviderProps): React.JSX.Element {
  const systemScheme = useColorScheme();

  const theme = useMemo<Theme>(() => {
    if (preference === 'auto') {
      return systemScheme === 'light' ? lightTheme : darkTheme;
    }
    return preference === 'light' ? lightTheme : darkTheme;
  }, [preference, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference }),
    [theme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook: get the active theme.
 * Throws (in dev) if used outside a ThemeProvider.
 */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      '[useTheme] must be used within a <ThemeProvider>. ' +
        'Wrap your root component in <ThemeProvider>.',
    );
  }
  return ctx.theme;
}

/**
 * Hook: get current theme preference (for the settings UI).
 */
export function useThemePreference(): ThemePreference {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('[useThemePreference] must be used within a <ThemeProvider>.');
  }
  return ctx.preference;
}
