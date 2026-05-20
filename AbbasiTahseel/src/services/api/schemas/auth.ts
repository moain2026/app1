/**
 * Auth Schemas — العباسي تحصيل
 *
 * Validates payloads for /login, /UserAuth, /refresh, /register.
 *
 * Reference: AuthData.java, AccessToken.java, Users.java in the legacy app.
 */

import { z } from 'zod';

import { zBoolLoose, zIntLoose, zStringOrEmpty } from './common';

// ─── Request payloads ─────────────────────────────────────────────────────

/**
 * /login — form-urlencoded { username, password, appid? }
 */
export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  appid: z.string().optional(),
});

/**
 * /UserAuth — JSON body { username, password, appid, secureId }
 * `secureId` is generated SILENTLY by the new app (replaces Defence XOR per ADR-004).
 */
export const UserAuthRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  appid: z.string(),
  secureId: z.string(),
});

/**
 * /refresh — form-urlencoded { refresh_token }
 * NOTE: We send refresh_token as-is. The legacy app erroneously appended "a"
 * (HtmlTags.A from iText) — see CustomAuthenticator.java line 41. We do NOT
 * reproduce that bug.
 */
export const RefreshRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

/**
 * /register — form-urlencoded { name, email, password }
 */
export const RegisterRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

// ─── Response payloads ────────────────────────────────────────────────────

/**
 * AccessToken response from /UserAuth, /refresh, /register.
 *  { access_token, refresh_token, token_type?, expires_in? }
 */
export const AccessTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: zStringOrEmpty.optional(),
  expires_in: zIntLoose.optional(),
});

/**
 * /login response — legacy returns the Users object directly (NOT wrapped).
 * Mirrors Users.java fields including permission flags.
 *
 * Tokens are nested under the Users entity in some legacy variants — we
 * accept both shapes.
 */
export const LoginUserResponseSchema = z.object({
  // Identity
  id: zIntLoose.optional(),
  username: zStringOrEmpty.optional(),
  name: zStringOrEmpty.optional(),
  email: zStringOrEmpty.optional(),
  phone: zStringOrEmpty.optional(),

  // Permission flags (legacy field names preserved 1:1)
  DE: zBoolLoose.optional(),
  ED: zBoolLoose.optional(),
  REP: zBoolLoose.optional(),
  S_K: zBoolLoose.optional(),
  S_S: zBoolLoose.optional(),
  SYS: zBoolLoose.optional(),
  NOA: zIntLoose.optional(),
  NOU: zIntLoose.optional(),

  // Embedded tokens (when the server returns them on /login)
  access_token: zStringOrEmpty.optional(),
  refresh_token: zStringOrEmpty.optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type UserAuthRequest = z.infer<typeof UserAuthRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type AccessTokenResponse = z.infer<typeof AccessTokenResponseSchema>;
export type LoginUserResponse = z.infer<typeof LoginUserResponseSchema>;
