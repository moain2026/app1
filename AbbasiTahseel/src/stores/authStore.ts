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
import {
  clearAllAuthCredentials,
  getAccessToken,
  getLastUsername,
  getRefreshToken,
  setAccessToken,
  setLastUsername,
  setRefreshToken,
} from '@/services/storage/secureStorage';
import { setLastLoginAt } from '@/services/storage/prefs';

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

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** i18n key OR raw string set by network/storage errors. */
  error: string | null;

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // ─── login ──────────────────────────────────────────────────────────
  async login(username, password) {
    set({ isLoading: true, error: null });
    try {
      const raw = await api.call<unknown>('login', {
        body: { username, password },
      });
      const parsed = LoginUserResponseSchema.safeParse(raw);
      if (!parsed.success) {
        set({ isLoading: false, error: 'auth.login.invalidCredentials' });
        return false;
      }

      const u = parsed.data;
      const access = u.access_token ?? '';
      const refresh = u.refresh_token ?? '';

      // The legacy /login may or may not embed tokens. If absent, the
      // caller should follow up with /UserAuth. For Wave 2 we treat the
      // embedded-token shape as the success path and surface an explicit
      // error otherwise (the secondary /UserAuth flow is Wave 3 work).
      if (access.length === 0 || refresh.length === 0) {
        set({ isLoading: false, error: 'auth.login.invalidCredentials' });
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
      });
      return true;
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error && err.message.length > 0
            ? 'auth.login.networkError'
            : 'auth.login.invalidCredentials',
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
    set({ error: null });
  },
}));
