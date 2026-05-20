/**
 * i18n Setup — العباسي تحصيل
 *
 * Wires `i18next` + `react-i18next` for Arabic-first localization.
 *
 * Design:
 *  • Single language for Phase 1–2 (Arabic). The infrastructure supports
 *    additional locales but no English bundle ships yet.
 *  • Language persistence via AsyncStorage (loaded lazily — i18n is
 *    initialized synchronously with the default, then optionally updated).
 *  • RTL is forced globally at the React-Native level in App.tsx — i18n
 *    only owns the translation strings, not the layout direction.
 *  • All UI strings must come through `t('namespace.key')`. Hardcoded
 *    Arabic in components is forbidden (project rule R-2.6).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';

const LANG_STORAGE_KEY = 'app.language';

export const DEFAULT_LANGUAGE = 'ar';
export const SUPPORTED_LANGUAGES = ['ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Resources object passed to i18next.
 * Keep namespaces flat (single `translation` namespace) to avoid the cost
 * of importing additional bundles for the small Phase 2 surface.
 */
const resources = {
  ar: {
    translation: ar,
  },
} as const;

/**
 * Initialize i18next. Returns the i18n instance so callers (App.tsx) can
 * await it before rendering the tree.
 */
export async function initI18n(): Promise<typeof i18n> {
  // Best-effort: read persisted preference. If AsyncStorage fails (rare),
  // we fall through to DEFAULT_LANGUAGE without throwing.
  let storedLang: string | null = null;
  try {
    storedLang = await AsyncStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    storedLang = null;
  }

  const lng: SupportedLanguage =
    storedLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(storedLang)
      ? (storedLang as SupportedLanguage)
      : DEFAULT_LANGUAGE;

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes by default.
    },
    react: {
      useSuspense: false,
    },
    returnNull: false,
  });

  return i18n;
}

/**
 * Switch the active language and persist the choice.
 * Returns true if persisted successfully.
 */
export async function setLanguage(lang: SupportedLanguage): Promise<boolean> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
    return true;
  } catch {
    return false;
  }
}

export { i18n };
export default i18n;
