/**
 * Interceptors — Composition root.
 *
 * Order matters:
 *   1. Auth      (request)  — attach Bearer header.
 *   2. Retry     (response) — re-issue transient failures.
 *   3. Refresh   (response) — handle 401 with one refresh + replay.
 *   4. Error     (response) — convert anything still failing → AppError.
 *
 * Why this exact order:
 *   • Auth must run FIRST so retries already carry a token.
 *   • Retry runs BEFORE refresh so a 5xx hiccup is retried first; an
 *     actual 401 then falls through to refresh.
 *   • Refresh runs BEFORE error so a successfully-refreshed request
 *     doesn't show up to error.interceptor at all.
 *   • Error runs LAST so it sees only the "final" failure.
 *
 * Axios response interceptors run in REVERSE registration order, so the
 * call order below matches the conceptual order above.
 */

import type { AxiosInstance } from 'axios';

import { installAuthInterceptor } from './auth.interceptor';
import { installErrorInterceptor } from './error.interceptor';
import { installRefreshInterceptor } from './refresh.interceptor';
import { installRetryInterceptor } from './retry.interceptor';

export function attachInterceptors(http: AxiosInstance): void {
  // Request side: auth always first.
  installAuthInterceptor(http);

  // Response side — registered in reverse-of-execution order:
  installErrorInterceptor(http); // last to run
  installRefreshInterceptor(http); // runs before error
  installRetryInterceptor(http); // runs first on response
}

export { SKIP_AUTH_HEADER } from './auth.interceptor';
export { IDEMPOTENT_HEADER } from './retry.interceptor';
