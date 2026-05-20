/**
 * Exponential Backoff with Jitter — العباسي تحصيل
 *
 * Pure function. No side-effects, easy to unit-test.
 *
 * Formula:
 *   delay = min(baseMs * 2^(attempt-1), maxMs) + random(0, jitterMs)
 *
 * Why jitter? — Without it, all queue items that failed simultaneously will
 * retry at the EXACT same future moment ("thundering herd"). Adding a small
 * random delay desynchronizes them and protects the server.
 *
 * Why cap at maxMs? — Otherwise after ~10 attempts we'd be scheduling retries
 * weeks in the future, which is useless on a collector device that gets
 * powered off every night.
 *
 * @param attempt 1-based attempt number that JUST FAILED (next attempt = attempt+1).
 * @param config  Optional overrides. Defaults: base=2s, max=5min, jitter=1s.
 * @returns A Date in the future when the worker should retry this item.
 */

export interface BackoffConfig {
  baseMs: number;
  maxMs: number;
  jitterMs: number;
}

export const DEFAULT_BACKOFF: BackoffConfig = {
  baseMs: 2_000,
  maxMs: 5 * 60 * 1_000,
  jitterMs: 1_000,
};

export function computeBackoffDelayMs(
  attempt: number,
  config: BackoffConfig = DEFAULT_BACKOFF,
): number {
  // Clamp attempt to avoid Math.pow blow-ups at very high attempt counts.
  const safeAttempt = Math.max(1, Math.min(attempt, 20));
  const exponential = config.baseMs * Math.pow(2, safeAttempt - 1);
  const capped = Math.min(exponential, config.maxMs);
  const jitter = Math.floor(Math.random() * config.jitterMs);
  return capped + jitter;
}

export function computeNextRunAt(
  attempt: number,
  config: BackoffConfig = DEFAULT_BACKOFF,
  now: Date = new Date(),
): Date {
  const delayMs = computeBackoffDelayMs(attempt, config);
  return new Date(now.getTime() + delayMs);
}
