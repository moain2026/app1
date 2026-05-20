/**
 * Auth Store — العباسي تحصيل
 *
 * Single source of truth for authentication state. Coordinates between:
 *   • The network layer (services/api) for /login + /refresh
 *   • Secure storage (services/storage/secureStorage) for tokens
 *   • The Auth schemas (services/api/schemas/auth) for response validation
 *
 * State machine:
 *   isAuthenticated = !!user && !!accessToken
 *
 * The store is Zustand-based — components subscribe with selectors to
 * avoid unnecessary re-renders.
 *
 * IMPORTANT — separation of concerns:
 *   This store DOES NOT know about navigation. RootNavigator observes the
 *   `isAuthenticated` flag and switches stacks accordingly. Screens only
 *   call store actions; they do not call `navigation.replace('Login')`
 *   after logout (the navigator handles that automatically).
 */

import { create } from 'zustand';

import { api } from '@/services/api';
import {
  AccessTokenResponseSchema,
  LoginUserResponseSchema,
  type LoginUserResponse,
} from '@/services/api/schemas/auth';
import { getSecureId } from '@/services/security/licenseManager';
import {
  clearAllAuthCredentials,
  getAccessToken,
  getLastUsername,
  getRefreshToken,
  setAccessToken,
  setLastUsername,
  setRefreshToken,
} from '@/services/storage/secureStorage';
import {
  getBaseUrl,
  getBranchNumber,
  setLastLoginAt,
} from '@/services/storage/prefs';
import { logger } from '@/utils/logger';

const log = logger.scope('AuthStore');

// ─── Types ────────────────────────────────────────────────────────────────

/**
 * Public-facing user shape. Mirrors the legacy Users entity surface that
 * the UI cares about. The full WatermelonDB User model lives in
 * src/database/models/User.ts — this is the in-memory mirror.
 */
export interface AuthUser {
  id?: number;
  username: string;
  name?: string;
  email?: string;
  phone?: string;
  permissions: {
    canDelete: boolean;
    canEdit: boolean;
    canViewReports: boolean;
    canViewAllReadings: boolean;
    canViewAllSubscribers: boolean;
    isAdmin: boolean;
  };
}

/**
 * Diagnostic snapshot of the LAST failed /Login attempt. Surfaced in the UI
 * via a "Copy details" button so the operator can share exactly what the
 * server saw without dumping any secret in the open.
 *
 * Sensitive fields are masked at capture-time (see `login()` below):
 *   - `password`  → `<N chars>`
 *   - `secureId`  → truncated to first 8 chars + `…`
 *   - response body strings are passed through verbatim (server only
 *     returns generic Arabic error text, no tokens).
 */
export interface LoginErrorDetails {
  url: string;
  method: string;
  requestBody: Record<string, string>;
  responseStatus: number | null;
  responseBody: string;
  errorCode: string;
  timestamp: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** i18n key OR raw string set by network/storage errors. */
  error: string | null;
  /** Snapshot of the most recent failed login — null on success or before
   *  any attempt. Cleared when the user navigates away or logs in. */
  lastLoginError: LoginErrorDetails | null;

  // Actions
  login(username: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  refreshSession(): Promise<boolean>;
  loadFromStorage(): Promise<void>;
  clearError(): void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function toAuthUser(raw: LoginUserResponse, username: string): AuthUser {
  return {
    id: raw.id,
    username: raw.username ?? username,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    permissions: {
      canDelete: raw.DE === true,
      canEdit: raw.ED === true,
      canViewReports: raw.REP === true,
      canViewAllReadings: raw.S_K === true,
      canViewAllSubscribers: raw.S_S === true,
      isAdmin: raw.SYS === true,
    },
  };
}

// ─── Store ────────────────────────────────────────────────────────────────

function maskSecureId(value: string): string {
  if (value.length === 0) return '<empty>';
  if (value.length <= 8) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 8)}…`;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastLoginError: null,

  // ─── login ──────────────────────────────────────────────────────────
  //
  // Wire-compatible with the LEGACY AuthRepository (Java app) contract:
  //   POST /electric/Login
  //   Content-Type: application/json
  //   { "username": "...", "password": "...", "appId": "<branch>", "secureId": "<deviceId>" }
  //   → Users object with embedded `access_token` (+ optional refresh_token)
  //
  // `appId` comes from prefs (branch number — default "1"). `secureId` is
  // the device id used by license activation (stable across reinstalls).
  async login(username, password) {
    set({ isLoading: true, error: null, lastLoginError: null });
    const appId = getBranchNumber();
    const secureId = await getSecureId();
    const url = `${getBaseUrl()}Login`;

    // Pre-build the redacted request body so it can be reused for both the
    // happy path log and the failure snapshot.
    const redactedBody: Record<string, string> = {
      username,
      password: `<${password.length} chars>`,
      appId,
      secureId: maskSecureId(secureId),
    };
    log.debug('login attempt', redactedBody);

    try {
      const raw = await api.call<unknown>('login', {
        body: { username, password, appId, secureId },
      });
      const parsed = LoginUserResponseSchema.safeParse(raw);
      if (!parsed.success) {
        log.warn('login response failed schema validation');
        set({
          isLoading: false,
          error: 'auth.login.invalidCredentials',
          lastLoginError: {
            url,
            method: 'POST',
            requestBody: redactedBody,
            responseStatus: 200,
            responseBody:
              typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2),
            errorCode: 'SCHEMA_INVALID',
            timestamp: new Date().toISOString(),
          },
        });
        return false;
      }

      const u = parsed.data;
      const access = u.access_token ?? '';
      // Legacy /Login does NOT return a separate refresh_token — the same
      // access_token is used until /refresh is called explicitly.
      const refresh = u.refresh_token ?? access;

      if (access.length === 0) {
        log.warn('login response had no access_token');
        set({
          isLoading: false,
          error: 'auth.login.invalidCredentials',
          lastLoginError: {
            url,
            method: 'POST',
            requestBody: redactedBody,
            responseStatus: 200,
            responseBody: JSON.stringify(u, null, 2),
            errorCode: 'NO_ACCESS_TOKEN',
            timestamp: new Date().toISOString(),
          },
        });
        return false;
      }

      const authUser = toAuthUser(u, username);

      await Promise.all([
        setAccessToken(access),
        setRefreshToken(refresh),
        setLastUsername(username),
      ]);
      setLastLoginAt(new Date());

      set({
        user: authUser,
        accessToken: access,
        refreshToken: refresh,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastLoginError: null,
      });
      log.info('login success', { username });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn('login threw', { message: msg });

      // Extract AppError / Axios-error fields without using `any`.
      const errObj: Record<string, unknown> =
        err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
      const httpStatus =
        typeof errObj.httpStatus === 'number' ? errObj.httpStatus : null;
      const errorCode =
        typeof errObj.code === 'string' && errObj.code.length > 0
          ? errObj.code
          : err instanceof Error
            ? err.name
            : 'UNKNOWN';

      // Try to surface the server's raw response (most useful for diagnosis).
      const details = errObj.details;
      const responseBody = (() => {
        if (typeof errObj.responseBody === 'string') return errObj.responseBody;
        if (details && typeof details === 'object') {
          const body = (details as Record<string, unknown>).responseBody;
          if (typeof body === 'string') return body;
          if (body !== undefined) return JSON.stringify(body, null, 2);
        }
        return msg;
      })();

      set({
        isLoading: false,
        error:
          httpStatus !== null
            ? 'auth.login.invalidCredentials'
            : 'auth.login.networkError',
        lastLoginError: {
          url,
          method: 'POST',
          requestBody: redactedBody,
          responseStatus: httpStatus,
          responseBody,
          errorCode,
          timestamp: new Date().toISOString(),
        },
      });
      return false;
    }
  },

  // ─── logout ─────────────────────────────────────────────────────────
  async logout() {
    await clearAllAuthCredentials();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
      lastLoginError: null,
    });
  },

  // ─── refreshSession ─────────────────────────────────────────────────
  async refreshSession() {
    const refresh = get().refreshToken ?? (await getRefreshToken());
    if (!refresh) {
      return false;
    }
    set({ isLoading: true, error: null });
    try {
      const raw = await api.call<unknown>('refresh', {
        body: { refresh_token: refresh },
      });
      const parsed = AccessTokenResponseSchema.safeParse(raw);
      if (!parsed.success) {
        set({ isLoading: false, error: 'auth.login.invalidCredentials' });
        return false;
      }
      const { access_token, refresh_token } = parsed.data;
      await Promise.all([
        setAccessToken(access_token),
        setRefreshToken(refresh_token),
      ]);
      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        isLoading: false,
      });
      return true;
    } catch {
      set({ isLoading: false, error: 'auth.login.networkError' });
      return false;
    }
  },

  // ─── loadFromStorage ────────────────────────────────────────────────
  async loadFromStorage() {
    const [access, refresh, lastUsername] = await Promise.all([
      getAccessToken(),
      getRefreshToken(),
      getLastUsername(),
    ]);

    if (!access || !refresh) {
      // No persisted session — leave defaults in place.
      set({ isAuthenticated: false });
      return;
    }

    // We have tokens but no full user object (it isn't persisted yet —
    // Wave 3 will hydrate from WatermelonDB). For Wave 2 we expose a
    // minimal user identity so RootNavigator can recognize the session.
    const minimalUser: AuthUser = {
      username: lastUsername ?? '',
      permissions: {
        canDelete: false,
        canEdit: false,
        canViewReports: false,
        canViewAllReadings: false,
        canViewAllSubscribers: false,
        isAdmin: false,
      },
    };

    set({
      user: minimalUser,
      accessToken: access,
      refreshToken: refresh,
      isAuthenticated: true,
    });
  },

  clearError() {
    set({ error: null, lastLoginError: null });
  },
}));
