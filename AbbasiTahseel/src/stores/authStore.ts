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
  AuthenticateResponseSchema,
  LoginUserResponseSchema,
  type LoginUserResponse,
} from '@/services/api/schemas/auth';
import {
  createDevBypassUser,
  DEV_BYPASS_ACCESS_TOKEN,
  DEV_BYPASS_REFRESH_TOKEN,
  isDevBypassCredentials,
} from '@/services/auth/devBypass';
import { getSecureId } from '@/services/security/licenseManager';
import { syncNow } from '@/services/sync';
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
  /**
   * True when the current session was minted by the local "Dev Bypass"
   * path (see `services/auth/devBypass.ts`). Surfaced in the UI as a
   * persistent yellow banner so the operator never confuses mock data
   * with production data. Persisted across reloads only as a runtime
   * flag — the `isDevBypassAccessToken` token sentinel is the source of
   * truth on cold start (see `loadFromStorage`).
   */
  isDevBypass: boolean;

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

/**
 * Fire a post-login sync attempt — non-blocking, silent on failure.
 *
 * Called only after a REAL (non-dev-bypass) login succeeds. The Java
 * original triggers an equivalent pull immediately after `/Login`
 * returns the Users payload — we mirror that here so the operator sees
 * fresh reference data (accounts, places, groups, bonds, readings)
 * without waiting for the startup or periodic timers.
 *
 * Implementation notes:
 *   • Fire-and-forget: the caller has already persisted tokens and the
 *     login() function should return `true` immediately. Any awaitable
 *     coupling would delay the navigation transition by seconds on
 *     slower devices.
 *   • Errors are swallowed at this layer because the sync coordinator
 *     already classifies and persists them to sync_logs + lastError.
 *   • The coordinator's own preconditions (online + auth token) make
 *     this safe to call even if the network just blipped — it will
 *     emit `engine:skipped` and return gracefully.
 */
function fireAfterLoginSync(): void {
  void syncNow('after_login').catch((err: unknown) => {
    log.warn('after-login sync failed (non-fatal)', {
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastLoginError: null,
  isDevBypass: false,

  // ─── login ──────────────────────────────────────────────────────────
  //
  // Two-stage authentication against the **.NET WCF** backend at
  // `<scheme>://<host>:3000/electric/`.
  //
  // ────────────────────────────────────────────────────────────────────
  //  STAGE 1 — `/Authenticate` (PRIMARY, official WCF contract)
  // ────────────────────────────────────────────────────────────────────
  //   POST /electric/Authenticate
  //   Content-Type: application/json
  //   Body: { "User": "...", "Password": "...", "appId": "<branch>" }
  //         ↑ Capital U / Capital P / camelCase appId
  //   Response: JSON string literal — `"token-value"` (no surrounding
  //             object). Empty string means failure.
  //
  // ────────────────────────────────────────────────────────────────────
  //  STAGE 2 — `/Login` (LEGACY FALLBACK, only used if Stage 1 fails)
  // ────────────────────────────────────────────────────────────────────
  //   POST /electric/Login
  //   Content-Type: application/json
  //   Body: { "username", "password", "appId", "secureId" }
  //   Response: Users object with embedded `access_token` (matches the
  //             legacy Retrofit/Moshi shape from AuthData.java).
  //
  // Both stages share their own redacted-body snapshot for the diagnostic
  // `lastLoginError` surface. When STAGE 2 also fails, STAGE 1's response
  // body is appended in the diagnostic for cross-comparison.
  //
  // ⚠️ Wire-name reminder for future maintainers:
  //   • `/Authenticate` → fields are `User`, `Password`, `appId`.
  //   • `/Login`        → fields are `username`, `password`, `appId`, `secureId`.
  //   • Every other WCF endpoint accepts `appId` (camelCase) in its query
  //     string — keep that consistent.
  async login(username, password) {
    set({ isLoading: true, error: null, lastLoginError: null });

    // ─── Dev Bypass shortcut ──────────────────────────────────────────
    // Matches the LOCAL "dev / 0000" credentials. Skips the network call
    // entirely, writes sentinel tokens to secureStorage, and flips the
    // session into bypass mode. See services/auth/devBypass.ts for the
    // security posture and rationale.
    if (isDevBypassCredentials(username, password)) {
      log.info('login: dev bypass activated');
      const bypassUser = createDevBypassUser();
      try {
        await Promise.all([
          setAccessToken(DEV_BYPASS_ACCESS_TOKEN),
          setRefreshToken(DEV_BYPASS_REFRESH_TOKEN),
          setLastUsername(bypassUser.username),
        ]);
        setLastLoginAt(new Date());
      } catch (err) {
        // Token-write failures are non-fatal in bypass mode — the in-memory
        // session is still valid and the operator can still drive the UI.
        log.warn('dev bypass: token persistence failed (continuing)', {
          message: err instanceof Error ? err.message : String(err),
        });
      }
      set({
        user: bypassUser,
        accessToken: DEV_BYPASS_ACCESS_TOKEN,
        refreshToken: DEV_BYPASS_REFRESH_TOKEN,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastLoginError: null,
        isDevBypass: true,
      });
      return true;
    }

    const appId = getBranchNumber();
    const secureId = await getSecureId();
    const baseUrl = getBaseUrl();

    // ─── Helpers — extract diagnostic fields from any error shape ─────
    const extractResponseBody = (err: unknown, fallback: string): string => {
      const errObj: Record<string, unknown> =
        err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
      if (typeof errObj.responseBody === 'string') return errObj.responseBody;
      const details = errObj.details;
      if (details && typeof details === 'object') {
        const body = (details as Record<string, unknown>).responseBody;
        if (typeof body === 'string') return body;
        if (body !== undefined) return JSON.stringify(body, null, 2);
      }
      return fallback;
    };
    const extractHttpStatus = (err: unknown): number | null => {
      const errObj: Record<string, unknown> =
        err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
      return typeof errObj.httpStatus === 'number' ? errObj.httpStatus : null;
    };
    const extractErrorCode = (err: unknown): string => {
      const errObj: Record<string, unknown> =
        err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
      if (typeof errObj.code === 'string' && errObj.code.length > 0) {
        return errObj.code;
      }
      return err instanceof Error ? err.name : 'UNKNOWN';
    };

    // ─── STAGE 1 — /Authenticate (official WCF contract) ──────────────
    const authenticateUrl = `${baseUrl}Authenticate`;
    const authenticateRedacted: Record<string, string> = {
      User: username,
      Password: `<${password.length} chars>`,
      appId,
    };
    log.debug('STAGE 1 — /Authenticate attempt', {
      url: authenticateUrl,
      ...authenticateRedacted,
    });

    // Captured for cross-attempt diagnostics: if STAGE 2 also fails, we
    // prepend STAGE 1's response body so the operator can see both.
    let stage1Diagnostic: string | null = null;

    try {
      const raw = await api.call<unknown>('authenticate', {
        body: { User: username, Password: password, appId },
      });

      // The WCF Help page documents the response as a JSON string literal.
      // Axios decodes the body `"abc"` into the JS string `'abc'`.
      const parsed = AuthenticateResponseSchema.safeParse(raw);

      if (parsed.success && parsed.data.length > 0) {
        const access = parsed.data;
        // /Authenticate gives us a token but no Users payload — mint a
        // minimal AuthUser. A subsequent /GetListUsers call (Wave 3) will
        // hydrate the full identity and permission flags. For now we let
        // the operator into the app with conservative defaults.
        const minimalUser: AuthUser = {
          username,
          permissions: {
            canDelete: false,
            canEdit: false,
            canViewReports: false,
            canViewAllReadings: false,
            canViewAllSubscribers: false,
            isAdmin: false,
          },
        };

        await Promise.all([
          setAccessToken(access),
          setRefreshToken(access), // /Authenticate has no separate refresh
          setLastUsername(username),
        ]);
        setLastLoginAt(new Date());

        set({
          user: minimalUser,
          accessToken: access,
          refreshToken: access,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          lastLoginError: null,
          isDevBypass: false,
        });
        log.info('STAGE 1 — /Authenticate success', { username });
        // Wave 7 P1: kick a non-blocking pull of reference + collector
        // data so the user lands on a hot cache. Dev-bypass never gets
        // here (handled in the bypass branch above).
        fireAfterLoginSync();
        return true;
      }

      // Schema parse failed OR token empty → record diagnostic and fall
      // through to STAGE 2.
      const rawAsString =
        typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      stage1Diagnostic = `STAGE 1 — POST ${authenticateUrl}\nResult: schema invalid or empty token.\nServer returned:\n${rawAsString}`;
      log.warn('STAGE 1 failed — schema invalid or empty', {
        rawType: typeof raw,
        length: rawAsString.length,
      });
    } catch (err) {
      // Network or HTTP error on /Authenticate. Capture the raw response
      // body for the diagnostic surface, then fall through to STAGE 2.
      const status = extractHttpStatus(err);
      const code = extractErrorCode(err);
      const body = extractResponseBody(
        err,
        err instanceof Error ? err.message : String(err),
      );
      stage1Diagnostic = `STAGE 1 — POST ${authenticateUrl}\nResult: HTTP ${status ?? '—'} ${code}\n${body}`;
      log.warn('STAGE 1 threw', { status, code });
    }

    // ─── STAGE 2 — /Login (legacy fallback) ───────────────────────────
    const loginUrl = `${baseUrl}Login`;
    const loginRedacted: Record<string, string> = {
      username,
      password: `<${password.length} chars>`,
      appId,
      secureId: maskSecureId(secureId),
    };
    log.debug('STAGE 2 — /Login attempt', loginRedacted);

    try {
      const raw = await api.call<unknown>('login', {
        body: { username, password, appId, secureId },
      });
      const parsed = LoginUserResponseSchema.safeParse(raw);
      if (!parsed.success) {
        log.warn('STAGE 2 — /Login response failed schema validation');
        const rawAsString =
          typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
        set({
          isLoading: false,
          error: 'auth.login.invalidCredentials',
          lastLoginError: {
            url: loginUrl,
            method: 'POST',
            requestBody: loginRedacted,
            responseStatus: 200,
            responseBody:
              stage1Diagnostic !== null
                ? `${stage1Diagnostic}\n\n──────────\nSTAGE 2 (/Login) — schema invalid.\nServer returned:\n${rawAsString}`
                : rawAsString,
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
        log.warn('STAGE 2 — /Login response had no access_token');
        const usersJson = JSON.stringify(u, null, 2);
        set({
          isLoading: false,
          error: 'auth.login.invalidCredentials',
          lastLoginError: {
            url: loginUrl,
            method: 'POST',
            requestBody: loginRedacted,
            responseStatus: 200,
            responseBody:
              stage1Diagnostic !== null
                ? `${stage1Diagnostic}\n\n──────────\nSTAGE 2 (/Login) — no access_token in response.\nServer returned:\n${usersJson}`
                : usersJson,
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
        isDevBypass: false,
      });
      log.info('STAGE 2 — /Login fallback success', { username });
      // Wave 7 P1: same non-blocking post-login sync as STAGE 1.
      fireAfterLoginSync();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn('STAGE 2 — /Login threw', { message: msg });
      const httpStatus = extractHttpStatus(err);
      const errorCode = extractErrorCode(err);
      const responseBody = extractResponseBody(err, msg);

      set({
        isLoading: false,
        error:
          httpStatus !== null
            ? 'auth.login.invalidCredentials'
            : 'auth.login.networkError',
        lastLoginError: {
          url: loginUrl,
          method: 'POST',
          requestBody: loginRedacted,
          responseStatus: httpStatus,
          responseBody:
            stage1Diagnostic !== null
              ? `${stage1Diagnostic}\n\n──────────\nSTAGE 2 (/Login) — HTTP ${httpStatus ?? '—'} ${errorCode}\n${responseBody}`
              : responseBody,
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
      isDevBypass: false,
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
      set({ isAuthenticated: false, isDevBypass: false });
      return;
    }

    // ─── Dev Bypass cold-restart ──────────────────────────────────────
    // If the persisted tokens are the bypass sentinels, restore the same
    // fully-permissioned `AuthUser` shape that the bypass branch in
    // `login()` minted. We do NOT contact the network here.
    if (access === DEV_BYPASS_ACCESS_TOKEN) {
      const bypassUser = createDevBypassUser();
      set({
        user: bypassUser,
        accessToken: access,
        refreshToken: refresh,
        isAuthenticated: true,
        isDevBypass: true,
      });
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
      isDevBypass: false,
    });
  },

  clearError() {
    set({ error: null, lastLoginError: null });
  },
}));
