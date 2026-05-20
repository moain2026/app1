/**
 * Preferences Storage — العباسي تحصيل
 *
 * Wraps `react-native-mmkv` for NON-SENSITIVE, frequently-read settings:
 *   • baseUrl / hostingIp / port
 *   • appId
 *   • theme preference
 *   • last successful sync timestamps (per entity)
 *   • UI flags (e.g. has-seen-onboarding)
 *
 * Why MMKV instead of AsyncStorage:
 *   • ~30× faster reads (synchronous, memory-mapped).
 *   • Better for ThemeProvider which must read the preference synchronously
 *     on first render (no FOUC — Flash Of Unstyled Content).
 *
 * SECURITY NOTE:
 *   This storage is NOT encrypted (could be enabled, but we don't keep
 *   secrets here). Tokens and PIN hashes live in Keychain (secureStorage.ts).
 *
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  REPLACES legacy SharedPreferences("prefs") used for HostingIP,     ║
 * ║  baseUrl, IS_LOGOUT, theme. See AppConfig.java + LoginActivity.     ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

import { MMKV } from 'react-native-mmkv';

import type { ThemePreference } from '@/ds/theme';

// ─── Single MMKV instance for the whole app ───────────────────────────────
export const storage = new MMKV({
  id: 'abbasi-tahseel-prefs',
});

// ─── Keys (centralized — never use string literals elsewhere) ─────────────
export const PREF_KEYS = {
  // Network
  HOSTING_IP: 'net.hosting_ip',
  PORT: 'net.port',
  USE_HTTPS: 'net.use_https',
  APP_ID: 'net.app_id',
  BRANCH_NUMBER: 'net.branch_number',
  /**
   * Manual override for the `secureId` field sent during /Login. When empty,
   * `getLegacySecureId()` is used (10-digit decimal derived from the first
   * 8 hex chars of ANDROID_ID, matching `Defence.getDeviceId()` of the
   * legacy app). When set, this overrides the auto value verbatim — useful
   * when migrating from a legacy device whose `secureId` is already
   * registered server-side.
   */
  SECURE_ID_OVERRIDE: 'net.secure_id_override',

  // UI
  THEME: 'ui.theme',
  HAS_SEEN_ONBOARDING: 'ui.has_seen_onboarding',

  // Sync timestamps (one per entity — string is `iso8601`)
  LAST_SYNC_READINGS: 'sync.last.readings',
  LAST_SYNC_BONDS: 'sync.last.bonds',
  LAST_SYNC_ACCOUNTS: 'sync.last.accounts',
  LAST_SYNC_PLACES: 'sync.last.places',
  LAST_SYNC_GROUPS: 'sync.last.groups',
  LAST_SYNC_TBLH: 'sync.last.tblh',
  LAST_SYNC_CURRENCIES: 'sync.last.currencies',
  LAST_SYNC_USERS: 'sync.last.users',
  LAST_SYNC_COMPANY: 'sync.last.company',

  // Auth UX
  LAST_LOGIN_AT: 'auth.last_login_at',

  // Misc
  ANALYTICS_ID: 'misc.analytics_id', // pseudo-anonymous device id for sync logs
} as const;

export type PrefKey = (typeof PREF_KEYS)[keyof typeof PREF_KEYS];

// ─── Defaults ─────────────────────────────────────────────────────────────
//
// HOSTING_IP default points at the user's Tailscale VPN IP for the backend
// server. The legacy Java app shipped with the LAN IP 192.168.0.100 — for
// the React Native rebuild the operator reaches the server over Tailscale,
// so the default is moved to 100.87.131.115.
//
// IMPORTANT: this default is meant for the current single-deployment user.
// If you are forking this app for a wider rollout, override the default in
// ServerSettings or here BEFORE shipping. See PROJECT_PLAYBOOK.md §10.
export const DEFAULT_HOSTING_IP = '100.87.131.115';
export const DEFAULT_PORT = '3000';
export const DEFAULT_USE_HTTPS = false;
export const DEFAULT_BRANCH_NUMBER = '1';

// ═══════════════════════════════════════════════════════════════════════════
// Network preferences
// ═══════════════════════════════════════════════════════════════════════════

export function getHostingIp(): string {
  return storage.getString(PREF_KEYS.HOSTING_IP) ?? DEFAULT_HOSTING_IP;
}

export function setHostingIp(ip: string): void {
  storage.set(PREF_KEYS.HOSTING_IP, ip);
}

export function getPort(): string {
  return storage.getString(PREF_KEYS.PORT) ?? DEFAULT_PORT;
}

export function setPort(port: string): void {
  storage.set(PREF_KEYS.PORT, port);
}

export function getUseHttps(): boolean {
  return storage.getBoolean(PREF_KEYS.USE_HTTPS) ?? DEFAULT_USE_HTTPS;
}

export function setUseHttps(useHttps: boolean): void {
  storage.set(PREF_KEYS.USE_HTTPS, useHttps);
}

export function getAppId(): string | null {
  return storage.getString(PREF_KEYS.APP_ID) ?? null;
}

export function setAppId(id: string): void {
  storage.set(PREF_KEYS.APP_ID, id);
}

/**
 * رقم الفرع — Branch number.
 *
 * The legacy app appends this to outbound payloads so the backend can
 * partition data by branch. We store it as a string (the legacy server
 * accepts both numeric and string representations) and default to '1'
 * for single-branch deployments.
 */
export function getBranchNumber(): string {
  return storage.getString(PREF_KEYS.BRANCH_NUMBER) ?? DEFAULT_BRANCH_NUMBER;
}

export function setBranchNumber(value: string): void {
  storage.set(PREF_KEYS.BRANCH_NUMBER, value);
}

/**
 * Manual secureId override. Empty string means "use the auto-computed
 * legacy-compatible value" (see `getLegacySecureId` in licenseManager).
 */
export function getSecureIdOverride(): string {
  return storage.getString(PREF_KEYS.SECURE_ID_OVERRIDE) ?? '';
}

export function setSecureIdOverride(value: string): void {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    storage.delete(PREF_KEYS.SECURE_ID_OVERRIDE);
    return;
  }
  storage.set(PREF_KEYS.SECURE_ID_OVERRIDE, trimmed);
}

/**
 * Compose the API base URL from configured prefs.
 *
 * Matches legacy `AppConfig.getBaseUrl()`:
 *   "http://" + HostingIP + ":3000/electric/"
 */
export function getBaseUrl(): string {
  const scheme = getUseHttps() ? 'https' : 'http';
  const ip = getHostingIp();
  const port = getPort();
  return `${scheme}://${ip}:${port}/electric/`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Theme preference
// ═══════════════════════════════════════════════════════════════════════════

export function getThemePreference(): ThemePreference {
  const v = storage.getString(PREF_KEYS.THEME);
  if (v === 'light' || v === 'dark' || v === 'auto') {
    return v;
  }
  return 'dark'; // default per design requirements
}

export function setThemePreference(pref: ThemePreference): void {
  storage.set(PREF_KEYS.THEME, pref);
}

// ═══════════════════════════════════════════════════════════════════════════
// Sync timestamps
// ═══════════════════════════════════════════════════════════════════════════

export type SyncEntityKey =
  | 'readings'
  | 'bonds'
  | 'accounts'
  | 'places'
  | 'groups'
  | 'tblh'
  | 'currencies'
  | 'users'
  | 'company';

const SYNC_KEY_MAP: Record<SyncEntityKey, string> = {
  readings: PREF_KEYS.LAST_SYNC_READINGS,
  bonds: PREF_KEYS.LAST_SYNC_BONDS,
  accounts: PREF_KEYS.LAST_SYNC_ACCOUNTS,
  places: PREF_KEYS.LAST_SYNC_PLACES,
  groups: PREF_KEYS.LAST_SYNC_GROUPS,
  tblh: PREF_KEYS.LAST_SYNC_TBLH,
  currencies: PREF_KEYS.LAST_SYNC_CURRENCIES,
  users: PREF_KEYS.LAST_SYNC_USERS,
  company: PREF_KEYS.LAST_SYNC_COMPANY,
};

export function getLastSync(entity: SyncEntityKey): Date | null {
  const iso = storage.getString(SYNC_KEY_MAP[entity]);
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function setLastSync(entity: SyncEntityKey, when: Date = new Date()): void {
  storage.set(SYNC_KEY_MAP[entity], when.toISOString());
}

// ═══════════════════════════════════════════════════════════════════════════
// Onboarding flag
// ═══════════════════════════════════════════════════════════════════════════

export function hasSeenOnboarding(): boolean {
  return storage.getBoolean(PREF_KEYS.HAS_SEEN_ONBOARDING) ?? false;
}

export function markOnboardingSeen(): void {
  storage.set(PREF_KEYS.HAS_SEEN_ONBOARDING, true);
}

// ═══════════════════════════════════════════════════════════════════════════
// Auth UX
// ═══════════════════════════════════════════════════════════════════════════

export function getLastLoginAt(): Date | null {
  const iso = storage.getString(PREF_KEYS.LAST_LOGIN_AT);
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function setLastLoginAt(when: Date = new Date()): void {
  storage.set(PREF_KEYS.LAST_LOGIN_AT, when.toISOString());
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility — wipe non-sensitive prefs (used on factory reset)
// ═══════════════════════════════════════════════════════════════════════════

export function resetAllPrefs(): void {
  storage.clearAll();
}
