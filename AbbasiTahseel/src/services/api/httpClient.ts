/**
 * HTTP Client — العباسي تحصيل
 *
 * Creates and configures the Axios instance used by the entire app.
 *
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  Replaces the legacy stack of:                                       ║
 * ║   • Retrofit + Moshi (lenient)            → Axios + Zod              ║
 * ║   • OkHttp Authenticator with "+a" bug    → fixed RefreshInterceptor ║
 * ║   • AsyncHttpClient (loopj — deprecated)  → unified through Axios    ║
 * ║   • 200-second timeouts                   → tunable, default 30s     ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * Interceptors are added by `attachInterceptors()` so we can compose
 * them in the right order: auth → retry → error → refresh.
 *
 * NOTE: baseURL is RESOLVED LAZILY on each request from MMKV prefs, so
 * changing the server IP in Settings does not require an app restart.
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { prefs } from '@/services/storage';
import { logger } from '@/utils/logger';

import { attachInterceptors } from './interceptors';

const log = logger.scope('HttpClient');

// ─── Defaults ─────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Factory ──────────────────────────────────────────────────────────────
function createHttpClient(): AxiosInstance {
  const instance = axios.create({
    // baseURL is intentionally empty here — we set it per-request below.
    baseURL: '',
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      Accept: 'application/json',
    },
  });

  // ─── Lazy baseURL — read from MMKV on every request ────────────────────
  // This lets the user change server IP in Settings without restarting.
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (!config.baseURL) {
      config.baseURL = prefs.getBaseUrl();
    }
    return config;
  });

  attachInterceptors(instance);
  log.info(`http client created (timeout=${DEFAULT_TIMEOUT_MS}ms)`);

  return instance;
}

/**
 * Singleton Axios instance — import and use this everywhere.
 *
 * Example:
 *   import { http } from '@/services/api/httpClient';
 *   const { data } = await http.get('GetListReadingCounter');
 */
export const http: AxiosInstance = createHttpClient();
