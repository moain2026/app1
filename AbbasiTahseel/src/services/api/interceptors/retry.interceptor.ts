/**
 * Retry Interceptor — العباسي تحصيل
 *
 * Smart retry policy for transient failures using `axios-retry` underneath.
 *
 * Policy:
 *  • Retries: 3
 *  • Backoff: exponential with jitter   →   1s, 2s, 4s (+ 0-500ms jitter)
 *  • Retriable conditions:
 *     - Network errors (no response, ECONNRESET, etc.)
 *     - HTTP 408, 425, 429, 5xx (server-side hiccups)
 *     - SAFE methods only (GET, HEAD, OPTIONS) UNLESS the request is marked
 *       explicitly idempotent via `config.headers['X-Idempotent'] = '1'`.
 *  • NOT retried on:
 *     - 4xx other than 408/425/429   → caller's bug, no point retrying
 *     - POST/PUT/DELETE without the idempotency header (could double-write)
 *
 * For sync queue writes (POST SaveReading, etc.), we send the
 * `X-Idempotent: 1` header alongside a unique idempotency key in the
 * payload's `local_uuid` field, so retries are safe.
 */

import axiosRetry, { type IAxiosRetryConfig } from 'axios-retry';
import type { AxiosError, AxiosInstance } from 'axios';

import { logger } from '@/utils/logger';

const log = logger.scope('RetryInterceptor');

export const IDEMPOTENT_HEADER = 'X-Idempotent';

const RETRY_COUNT = 3;
const BASE_DELAY_MS = 1000;
const MAX_JITTER_MS = 500;

const RETRIABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function exponentialBackoffWithJitter(retryNumber: number): number {
  const exponential = BASE_DELAY_MS * 2 ** (retryNumber - 1);
  const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
  return exponential + jitter;
}

function isMethodSafe(method?: string): boolean {
  if (!method) return false;
  const m = method.toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
}

function isExplicitlyIdempotent(error: AxiosError): boolean {
  const headers = error.config?.headers;
  if (!headers) return false;
  const v = headers[IDEMPOTENT_HEADER];
  return v === '1' || v === 1 || v === 'true';
}

function shouldRetry(error: AxiosError): boolean {
  // Network / no response → retry.
  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  if (!RETRIABLE_STATUS_CODES.has(status)) {
    return false;
  }

  // 401 belongs to the refresh interceptor, not this one.
  if (status === 401) {
    return false;
  }

  // Safe methods → always OK to retry.
  if (isMethodSafe(error.config?.method)) {
    return true;
  }

  // Unsafe methods → only retry when caller asserts idempotency.
  return isExplicitlyIdempotent(error);
}

export function installRetryInterceptor(http: AxiosInstance): void {
  const config: IAxiosRetryConfig = {
    retries: RETRY_COUNT,
    retryDelay: exponentialBackoffWithJitter,
    retryCondition: shouldRetry,
    onRetry: (retryCount, error, requestConfig) => {
      log.warn(`retry #${retryCount}`, {
        url: requestConfig.url,
        method: requestConfig.method,
        status: error.response?.status,
        code: error.code,
      });
    },
    // Don't shadow the original error with the retry wrapper's error.
    shouldResetTimeout: true,
  };

  axiosRetry(http, config);
  log.info('retry policy attached', {
    retries: RETRY_COUNT,
    baseDelayMs: BASE_DELAY_MS,
  });
}
