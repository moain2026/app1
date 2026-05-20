/**
 * Auth Interceptor — العباسي تحصيل
 *
 * Attaches `Authorization: Bearer <accessToken>` to outbound requests.
 *
 * Behaviour:
 *  • Reads the latest access token from Keychain on every request.
 *    (Keychain reads are async but very fast — ~1-3 ms on Android.)
 *  • Skips the header for endpoints marked `requiresAuth: false`
 *    (login, refresh, register, userAuth). Skipping is signaled by
 *    setting `config.headers['X-Skip-Auth'] = '1'` in `apiClient.ts`.
 *  • Never logs the token in full — uses logger.tokenSafe().
 */

import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { secureStorage } from '@/services/storage';
import { logger } from '@/utils/logger';

const log = logger.scope('AuthInterceptor');

/**
 * Sentinel header name used by apiClient.ts to skip token attachment
 * for unauthenticated endpoints (login, refresh, register).
 */
export const SKIP_AUTH_HEADER = 'X-Skip-Auth';

export function installAuthInterceptor(http: AxiosInstance): void {
  http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    // Honor skip flag set by apiClient (then strip the helper header).
    const skip = config.headers?.[SKIP_AUTH_HEADER];
    if (skip) {
      delete config.headers[SKIP_AUTH_HEADER];
      return config;
    }

    const token = await secureStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      log.tokenSafe('attached access token', token);
    } else {
      log.debug('no access token available; sending request without Authorization');
    }

    return config;
  });
}
