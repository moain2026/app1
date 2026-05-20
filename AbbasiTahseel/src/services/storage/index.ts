/**
 * Storage — Barrel Export
 *
 * Two stores, two purposes:
 *   • secureStorage — Keychain-backed AES-GCM. Used for tokens + PIN hash.
 *   • prefs         — MMKV-backed sync-readable. Used for baseUrl, theme,
 *                     sync timestamps, etc.
 */

export * as secureStorage from './secureStorage';
export * as prefs from './prefs';
