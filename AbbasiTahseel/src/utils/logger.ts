/**
 * Logger — العباسي تحصيل
 *
 * Centralized logging with built-in PII / secret redaction.
 *
 * Rules enforced by this module:
 *  1. Tokens, passwords, and PINs are NEVER printed in full — only a short
 *     hash-style preview (first 4 chars + length).
 *  2. In `release` builds, only `warn` and `error` reach the console.
 *  3. Logs are tagged with a "scope" so tracing through stack traces is easy.
 *
 * Example:
 *   const log = logger.scope('AxiosInterceptors');
 *   log.info('refresh token request');
 *   log.tokenSafe('current access token', accessToken);
 *
 * Future: pipe `error` calls into Sentry when telemetry is enabled.
 */

/* eslint-disable no-console */

import { Platform } from 'react-native';

// ─── Build-time flag ──────────────────────────────────────────────────────
// We rely on the RN dev flag instead of NODE_ENV (which is also "production"
// in some bundled dev builds). __DEV__ is the canonical RN signal.
const isDev: boolean = __DEV__;

// ─── Sensitive-key blacklist (case-insensitive substrings) ────────────────
const SENSITIVE_KEY_PATTERNS = [
  'token',
  'password',
  'secret',
  'authorization',
  'pin',
  'apikey',
  'api_key',
  'secureid',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some(p => lower.includes(p));
}

/**
 * Return a redacted preview of a sensitive string.
 *  '<empty>'             when value is falsy
 *  '<8 chars: abcd…>'    otherwise
 */
function redactValue(value: unknown): string {
  if (value == null) {
    return '<null>';
  }
  if (typeof value !== 'string') {
    return `<${typeof value}>`;
  }
  if (value.length === 0) {
    return '<empty>';
  }
  return `<${value.length} chars: ${value.slice(0, 4)}…>`;
}

/**
 * Recursively walk an object and redact any keys that look sensitive.
 * Returns a NEW object (does not mutate the input).
 */
export function sanitize<T>(value: T, depth = 0): unknown {
  if (depth > 6) {
    return '<max-depth>'; // guard against cycles
  }
  if (value == null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(v => sanitize(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(k)) {
      out[k] = redactValue(v);
    } else if (v && typeof v === 'object') {
      out[k] = sanitize(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ─── Internal printer ─────────────────────────────────────────────────────
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, scope: string, message: string, payload?: unknown): void {
  // In production builds, drop debug + info.
  if (!isDev && (level === 'debug' || level === 'info')) {
    return;
  }

  const prefix = `[${level.toUpperCase()}][${scope}]`;
  const safePayload = payload === undefined ? undefined : sanitize(payload);

  switch (level) {
    case 'debug':
      if (safePayload !== undefined) {
        console.log(prefix, message, safePayload);
      } else {
        console.log(prefix, message);
      }
      break;
    case 'info':
      if (safePayload !== undefined) {
        console.log(prefix, message, safePayload);
      } else {
        console.log(prefix, message);
      }
      break;
    case 'warn':
      if (safePayload !== undefined) {
        console.warn(prefix, message, safePayload);
      } else {
        console.warn(prefix, message);
      }
      break;
    case 'error':
      if (safePayload !== undefined) {
        console.error(prefix, message, safePayload);
      } else {
        console.error(prefix, message);
      }
      break;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────
export interface ScopedLogger {
  debug(message: string, payload?: unknown): void;
  info(message: string, payload?: unknown): void;
  warn(message: string, payload?: unknown): void;
  error(message: string, payload?: unknown): void;

  /** Log a token-like string SAFELY (length + 4-char prefix only). */
  tokenSafe(label: string, token: string | null | undefined): void;
}

function buildScopedLogger(scope: string): ScopedLogger {
  return {
    debug: (m, p) => emit('debug', scope, m, p),
    info: (m, p) => emit('info', scope, m, p),
    warn: (m, p) => emit('warn', scope, m, p),
    error: (m, p) => emit('error', scope, m, p),
    tokenSafe: (label, token) => {
      emit('debug', scope, `${label}: ${redactValue(token)}`);
    },
  };
}

export const logger = {
  /** Create a logger scoped to the given module name. */
  scope: buildScopedLogger,

  /** Static helpers for one-off logs. */
  debug: (scope: string, m: string, p?: unknown) => emit('debug', scope, m, p),
  info: (scope: string, m: string, p?: unknown) => emit('info', scope, m, p),
  warn: (scope: string, m: string, p?: unknown) => emit('warn', scope, m, p),
  error: (scope: string, m: string, p?: unknown) => emit('error', scope, m, p),

  /** True when running in development. */
  isDev,

  /** Platform short-id, useful for log lines. */
  platform: Platform.OS,
};
