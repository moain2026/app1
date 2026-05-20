/**
 * Error Classifier — العباسي تحصيل
 *
 * Decides whether a failed sync attempt should be retried (transient) or
 * abandoned (permanent / failed).
 *
 * Rules (as mandated by Phase 4 spec):
 *  • Network errors (offline / timeout / unknown) → TRANSIENT (retry).
 *  • HTTP 5xx                                     → TRANSIENT (server hiccup).
 *  • HTTP 408 / 425 / 429                         → TRANSIENT (rate limit / retry-able).
 *  • HTTP 401                                     → TRANSIENT EXACTLY ONCE — the
 *      refresh interceptor will already have tried to refresh; if it surfaces
 *      here as 401, the worker treats it as transient so a future tick can
 *      pick it up (perhaps after the user re-logs in).
 *  • HTTP 4xx (other)                             → PERMANENT. The collector
 *      input is malformed or violates a server-side business rule — never
 *      retry, surface to dashboard for manual review.
 *  • Zod validation failures                      → PERMANENT (payload is bad).
 */

import { AppError, ErrorCodes } from '../../utils/errors';
import type { QueueItemOutcome } from './types';

// ─── Outcome builders ─────────────────────────────────────────────────────
export function transient(reason: string, httpStatus?: number): QueueItemOutcome {
  return { kind: 'transient', reason, httpStatus };
}

export function permanent(reason: string, httpStatus?: number): QueueItemOutcome {
  return { kind: 'permanent', reason, httpStatus };
}

export function success(remoteId?: number): QueueItemOutcome {
  return { kind: 'success', remoteId };
}

// ─── Classifier ───────────────────────────────────────────────────────────

/**
 * Convert any caught error into a queue outcome.
 * The worker should never need to inspect the error itself.
 */
export function classifyError(err: unknown): QueueItemOutcome {
  // Already an AppError → use its code.
  if (err instanceof AppError) {
    return fromAppError(err);
  }

  // Anything else (Error, string, undefined) → unknown transient.
  // We err on the side of retrying — a one-off mystery error shouldn't kill
  // a queue entry forever.
  const message = err instanceof Error ? err.message : String(err);
  return transient(`unknown_error: ${message}`);
}

function fromAppError(err: AppError): QueueItemOutcome {
  const status = err.httpStatus;

  switch (err.code) {
    // ── Network: always transient ────────────────────────────────────────
    case ErrorCodes.NETWORK_OFFLINE:
    case ErrorCodes.NETWORK_TIMEOUT:
    case ErrorCodes.NETWORK_UNKNOWN:
      return transient(err.code, status);

    // ── Server-side hiccups → transient ──────────────────────────────────
    case ErrorCodes.HTTP_SERVER_ERROR:
    case ErrorCodes.HTTP_RATE_LIMITED:
      return transient(err.code, status);

    // ── 401: refresh interceptor already retried once. Treat as transient
    //    so a later sync (after manual re-login) can pick it up. ─────────
    case ErrorCodes.HTTP_UNAUTHORIZED:
    case ErrorCodes.AUTH_REFRESH_FAILED:
    case ErrorCodes.AUTH_NO_TOKEN:
      return transient(err.code, status);

    // ── Client errors: payload is wrong, retrying won't help ─────────────
    case ErrorCodes.HTTP_BAD_REQUEST:
    case ErrorCodes.HTTP_FORBIDDEN:
    case ErrorCodes.HTTP_NOT_FOUND:
    case ErrorCodes.HTTP_CONFLICT:
      return permanent(err.code, status);

    // ── Validation / business rules: permanent ───────────────────────────
    case ErrorCodes.VALIDATION_FAILED:
    case ErrorCodes.VALIDATION_SERVER_RESPONSE:
    case ErrorCodes.BUSINESS_READING_BELOW_PREVIOUS:
    case ErrorCodes.BUSINESS_READING_LOCKED_POSTED:
      return permanent(err.code, status);

    // ── DB / Sync infrastructure errors ──────────────────────────────────
    case ErrorCodes.DB_WRITE_FAILED:
      return transient(err.code);
    case ErrorCodes.DB_NOT_FOUND:
      return permanent(err.code);
    case ErrorCodes.SYNC_QUEUE_OVERFLOW:
    case ErrorCodes.SYNC_MAX_ATTEMPTS_EXCEEDED:
      return permanent(err.code);

    // ── Anything else → transient (be lenient) ───────────────────────────
    default:
      return transient(err.code ?? 'UNKNOWN', status);
  }
}

/**
 * Heuristic: is a raw HTTP status code retriable?
 * Useful for unit tests and for the dashboard's "next retry" hints.
 */
export function isTransientHttpStatus(status: number | undefined): boolean {
  if (status == null) {
    // No status = network error = transient.
    return true;
  }
  if (status === 408 || status === 425 || status === 429) {
    return true;
  }
  if (status >= 500 && status < 600) {
    return true;
  }
  // 401 is handled by the refresh interceptor; if it bubbles up here we treat
  // it as transient (the user may re-login between ticks).
  if (status === 401) {
    return true;
  }
  return false;
}
