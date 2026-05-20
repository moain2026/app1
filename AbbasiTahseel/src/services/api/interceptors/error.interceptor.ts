/**
 * Error Interceptor — العباسي تحصيل
 *
 * Converts every failed Axios response into a typed `AppError`.
 * This is the LAST interceptor in the chain so callers always see
 * an `AppError`, never a raw Axios error.
 *
 * The interceptor MUST come AFTER refresh & retry, because:
 *  • Refresh transforms recoverable 401s into successful responses.
 *  • Retry transforms transient 5xx into successful responses.
 *  • Whatever survives those is a "real" error → normalize to AppError.
 *
 * Mapping table:
 *   no response (network)           → NETWORK_OFFLINE  /  NETWORK_TIMEOUT
 *   400                             → HTTP_BAD_REQUEST
 *   401                             → HTTP_UNAUTHORIZED  (refresh already failed)
 *   403                             → HTTP_FORBIDDEN
 *   404                             → HTTP_NOT_FOUND
 *   409                             → HTTP_CONFLICT
 *   429                             → HTTP_RATE_LIMITED
 *   5xx                             → HTTP_SERVER_ERROR
 *   other                           → HTTP_BAD_REQUEST  (best-effort)
 */

import type { AxiosError, AxiosInstance } from 'axios';

import { AppError, ErrorCodes, type ErrorCode } from '@/utils/errors';
import { logger } from '@/utils/logger';

const log = logger.scope('ErrorInterceptor');

function classifyNetworkError(error: AxiosError): ErrorCode {
  // Axios sets `code` to ECONNABORTED for timeouts.
  if (error.code === 'ECONNABORTED') return ErrorCodes.NETWORK_TIMEOUT;
  if (error.code === 'ERR_NETWORK') return ErrorCodes.NETWORK_OFFLINE;
  if (error.code === 'ETIMEDOUT') return ErrorCodes.NETWORK_TIMEOUT;
  return ErrorCodes.NETWORK_UNKNOWN;
}

function classifyHttpError(status: number): ErrorCode {
  if (status === 400) return ErrorCodes.HTTP_BAD_REQUEST;
  if (status === 401) return ErrorCodes.HTTP_UNAUTHORIZED;
  if (status === 403) return ErrorCodes.HTTP_FORBIDDEN;
  if (status === 404) return ErrorCodes.HTTP_NOT_FOUND;
  if (status === 409) return ErrorCodes.HTTP_CONFLICT;
  if (status === 429) return ErrorCodes.HTTP_RATE_LIMITED;
  if (status >= 500 && status < 600) return ErrorCodes.HTTP_SERVER_ERROR;
  return ErrorCodes.HTTP_BAD_REQUEST;
}

export function installErrorInterceptor(http: AxiosInstance): void {
  http.interceptors.response.use(
    response => response,
    (error: unknown) => {
      // Already normalized (e.g. by the refresh interceptor) → forward.
      if (error instanceof AppError) {
        return Promise.reject(error);
      }

      // Axios error?
      const axiosError = error as AxiosError;
      const config = axiosError.config;
      const status = axiosError.response?.status;

      let code: ErrorCode;
      if (axiosError.response) {
        code = classifyHttpError(axiosError.response.status);
      } else {
        code = classifyNetworkError(axiosError);
      }

      // Preserve the raw response body verbatim so callers can surface the
      // server's actual error message (the legacy backend returns plain
      // Arabic text or a JSON envelope inside `error.response.data`).
      const rawData = axiosError.response?.data;
      const responseBody =
        typeof rawData === 'string'
          ? rawData
          : rawData !== undefined && rawData !== null
            ? (() => {
                try {
                  return JSON.stringify(rawData);
                } catch {
                  return String(rawData);
                }
              })()
            : '';

      const appError = new AppError(code, {
        cause: error,
        httpStatus: status,
        details: {
          url: config?.url,
          method: config?.method,
          baseURL: config?.baseURL,
          responseBody,
        },
      });

      log.warn(`request failed → ${code}`, {
        url: config?.url,
        status,
        code: axiosError.code,
      });

      return Promise.reject(appError);
    },
  );
}
