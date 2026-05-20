/**
 * Auth Mapper — العباسي تحصيل
 *
 * Normalizes auth payloads into clean domain types.
 */

import {
  AccessTokenResponseSchema,
  LoginUserResponseSchema,
  type AccessTokenResponse,
  type LoginUserResponse,
} from '../schemas/auth';

// ─── Domain types ─────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface AuthenticatedUser {
  id: number | null;
  username: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  permissions: {
    canDelete: boolean; // DE
    canEdit: boolean; // ED
    canViewReports: boolean; // REP
    canViewAllReadings: boolean; // S_K
    canViewAllBonds: boolean; // S_S
    isAdmin: boolean; // SYS
    accountScope: number; // NOA
    userScope: number; // NOU
  };
}

// ─── Mappers ──────────────────────────────────────────────────────────────

export function tokensFromResponse(raw: unknown): TokenPair {
  const dto: AccessTokenResponse = AccessTokenResponseSchema.parse(raw);
  return {
    accessToken: dto.access_token,
    refreshToken: dto.refresh_token,
    expiresIn: dto.expires_in,
    tokenType: dto.token_type,
  };
}

export function userFromLoginResponse(raw: unknown): {
  user: AuthenticatedUser;
  tokens: TokenPair | null;
} {
  const dto: LoginUserResponse = LoginUserResponseSchema.parse(raw);

  const user: AuthenticatedUser = {
    id: dto.id ?? null,
    username: dto.username ?? '',
    fullName: dto.name ?? null,
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    permissions: {
      canDelete: dto.DE ?? false,
      canEdit: dto.ED ?? false,
      canViewReports: dto.REP ?? false,
      canViewAllReadings: dto.S_K ?? false,
      canViewAllBonds: dto.S_S ?? false,
      isAdmin: dto.SYS ?? false,
      accountScope: dto.NOA ?? 0,
      userScope: dto.NOU ?? 0,
    },
  };

  const tokens: TokenPair | null =
    dto.access_token && dto.refresh_token
      ? {
          accessToken: dto.access_token,
          refreshToken: dto.refresh_token,
        }
      : null;

  return { user, tokens };
}
