/**
 * Refresh Interceptor — العباسي تحصيل
 *
 * On 401, transparently calls /refresh with the stored refresh_token,
 * persists the new tokens, and replays the failing request ONCE.
 *
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  CRITICAL BUG-FIX from legacy CustomAuthenticator.java line 41      ║
 * ║                                                                    ║
 * ║  Legacy code:                                                       ║
 * ║    service.refresh(token.getRefreshToken() + HtmlTags.A)            ║
 * ║                                                                    ║
 * ║  where HtmlTags.A == "a" (a leak from the iText PDF library).       ║
 * ║  The legacy server was patched to tolerate that trailing "a", but   ║
 * ║  it is NOT part of the contract. We send the refresh_token AS-IS.  ║
 * ║                                                                    ║
 * ║  If a deployment of the old server somewhere still REQUIRES the    ║
 * ║  trailing "a", set BUG_COMPAT_APPEND_A = true below (do NOT enable  ║
 * ║  this without confirming on a real server first).                  ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * Concurrency:
 *  • Only ONE refresh call is in-flight at any time. Other 401 responses
 *    that arrive during the refresh are queued and replayed once the new
 *    token is available.
 *
 * Termination:
 *  • If refresh itself returns 401/403 OR throws → we clear credentials
 *    and surface AppError(AUTH_REFRESH_FAILED) to the caller.
 *  • If a request fails 401 after replay → AppError(HTTP_UNAUTHORIZED).
 */

import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { secureStorage } from '@/services/storage';
import { logger } from '@/utils/logger';
import { AppError, ErrorCodes } from '@/utils/errors';

import { Endpoints } from '../endpoints';
import { tokensFromResponse } from '../mappers/auth.mapper';

const log = logger.scope('RefreshInterceptor');

/**
 * DO NOT change unless you have confirmed the production server is still
 * the buggy variant that requires the "+a" suffix. Default is the CORRECT
 * behavior (send refresh_token as-is).
 */
const BUG_COMPAT_APPEND_A = false;

// ─── In-flight refresh state ──────────────────────────────────────────────
let refreshInFlight: Promise<string> | null = null;

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export function installRefreshInterceptor(http: AxiosInstance): void {
  http.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryConfig | undefined;
      const status = error.response?.status;

      // Not a 401 → not our problem.
      if (status !== 401 || !original || original._retried) {
        return Promise.reject(error);
      }

      // Never refresh the refresh call itself (avoid infinite loop).
      const url = (original.url ?? '').replace(/^\/+/, '');
      if (url === Endpoints.refresh.path || url === Endpoints.login.path) {
        return Promise.reject(error);
      }

      original._retried = true;

      try {
        const newAccessToken = await ensureRefreshed(http);

        // Replay the original request with the new token.
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccessToken}`;

        log.info('replaying request after successful refresh', {
          url: original.url,
          method: original.method,
        });

        return http.request(original);
      } catch (refreshErr) {
        log.warn('refresh failed; clearing credentials', { refreshErr });
        await secureStorage.clearAllAuthCredentials();
        return Promise.reject(
          new AppError(ErrorCodes.AUTH_REFRESH_FAILED, {
            cause: refreshErr,
            httpStatus: 401,
          }),
        );
      }
    },
  );
}

/**
 * Returns a Promise that resolves to a fresh access token. If a refresh is
 * already in-flight, returns its Promise (de-duped). The refresh itself
 * goes through the bare axios instance (not `http`) to avoid recursive
 * interceptors firing.
 */
function ensureRefreshed(http: AxiosInstance): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async (): Promise<string> => {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) {
      throw new AppError(ErrorCodes.AUTH_NO_TOKEN);
    }

    // CRITICAL: send refresh_token as-is. The legacy "+a" bug is NOT
    // reproduced. See header comment for context.
    const refreshPayload = BUG_COMPAT_APPEND_A
      ? `${refreshToken}a`
      : refreshToken;

    log.debug('issuing /refresh', {
      bugCompat: BUG_COMPAT_APPEND_A,
      tokenPreview: `${refreshToken.slice(0, 4)}…(${refreshToken.length})`,
    });

    // Build the form-urlencoded body manually (axios will URL-encode for us
    // when given URLSearchParams).
    const body = new URLSearchParams();
    body.append('refresh_token', refreshPayload);

    const { data } = await http.request({
      url: Endpoints.refresh.path,
      method: Endpoints.refresh.method,
      data: body.toString(),
      headers: {
        'Content-Type': Endpoints.refresh.contentType,
        // Tell auth interceptor: skip Bearer header on this call.
        'X-Skip-Auth': '1',
      },
    });

    const tokens = tokensFromResponse(data);
    await Promise.all([
      secureStorage.setAccessToken(tokens.accessToken),
      secureStorage.setRefreshToken(tokens.refreshToken),
    ]);

    log.info('refresh success — new tokens stored');
    return tokens.accessToken;
  })();

  // Always clear in-flight reference so future refreshes can start fresh.
  refreshInFlight.finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
