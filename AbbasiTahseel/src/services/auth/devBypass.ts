/**
 * Dev Bypass Mode — العباسي تحصيل
 *
 * ════════════════════════════════════════════════════════════════════════
 *  PURPOSE
 * ════════════════════════════════════════════════════════════════════════
 *
 * When the legacy server is unreachable (Tailscale VPN down, server moved,
 * fresh QA device that does not yet have its `secureId` registered, etc.)
 * the operator can still drive the app end-to-end by entering the FIXED
 * credentials below. The login flow short-circuits BEFORE any network call
 * is made, mints a fake `AuthUser` with full permissions, and surfaces a
 * persistent yellow "DEV MODE" banner on every authenticated screen so the
 * operator cannot mistake mock data for production data.
 *
 * Wave 4 ships this so the team can test:
 *   • the Readings module (list, detail, save, dirty markers)
 *   • the navigation + RTL + theme
 *   • the printer + sync UX (offline-first)
 * without waiting for the auth migration story (PR #21 + PR #22) to resolve
 * the `secureId` mismatch between the new device and the legacy server.
 *
 * ════════════════════════════════════════════════════════════════════════
 *  SECURITY POSTURE
 * ════════════════════════════════════════════════════════════════════════
 *
 * • The bypass credentials are PUBLIC constants — they are documented in
 *   the LoginScreen UI itself. There is NO confidentiality story here.
 * • The bypass user is local-only: tokens are sentinel strings that the
 *   axios interceptor will refuse to attach to outbound requests
 *   (any /electric/* call would fail authentication server-side).
 * • Mock data lives entirely in WatermelonDB on the device; `sync_queue`
 *   enqueue is SKIPPED when `isDevBypass=true` so the device never tries
 *   to push fake rows up to the production server.
 * • A future hardened build can simply delete this file + the two call
 *   sites in `authStore.ts` to compile the bypass out.
 *
 * See also:
 *   • src/stores/authStore.ts — early branch on login() that calls
 *     isDevBypassCredentials() before contacting /electric/Login.
 *   • src/services/mock/seedMockData.ts — auto-populates 25 readings
 *     on first launch into bypass mode.
 */

import type { AuthUser } from '@/stores/authStore';

// ─── Public constants ─────────────────────────────────────────────────────
//
// These are SHOWN to the operator on the login screen. Treat them as
// documentation, not as secrets.
export const DEV_BYPASS_USERNAME = 'dev';
export const DEV_BYPASS_PASSWORD = '0000';

/**
 * Sentinel tokens written to secureStorage when the bypass user logs in.
 * They are obvious by inspection ("dev.bypass.token.local.only") so any
 * future tooling that dumps the keychain can spot them at a glance.
 *
 * The HTTP interceptor (`src/services/api/interceptors/auth.interceptor.ts`)
 * will still attach them to outbound requests — that is fine, because the
 * server will simply reject with 401. We do NOT special-case the token
 * value in the network layer; the bypass user is meant to operate offline.
 */
export const DEV_BYPASS_ACCESS_TOKEN = 'dev.bypass.token.local.only';
export const DEV_BYPASS_REFRESH_TOKEN = 'dev.bypass.refresh.local.only';

/**
 * Predicate. Returns true iff the credentials exactly match the bypass
 * pair. Username comparison is trimmed (operators frequently leave a
 * trailing space when copying from a sticker); password is compared
 * verbatim to avoid silently accepting padded variants.
 */
export function isDevBypassCredentials(
  username: string,
  password: string,
): boolean {
  return (
    username.trim() === DEV_BYPASS_USERNAME && password === DEV_BYPASS_PASSWORD
  );
}

/**
 * Factory for the in-memory `AuthUser` mirror written to the auth store
 * when the bypass path is taken.
 *
 * Permission flags are ALL TRUE — the bypass user is meant to exercise
 * every code path that gates on a permission (admin views, delete, edit).
 * The `id: 999` sentinel is chosen to be obviously synthetic.
 */
export function createDevBypassUser(): AuthUser {
  return {
    id: 999,
    username: DEV_BYPASS_USERNAME,
    name: 'مطوّر النظام (Dev Mode)',
    email: 'dev@local.app',
    phone: '',
    permissions: {
      canDelete: true,
      canEdit: true,
      canViewReports: true,
      canViewAllReadings: true,
      canViewAllSubscribers: true,
      isAdmin: true,
    },
  };
}
