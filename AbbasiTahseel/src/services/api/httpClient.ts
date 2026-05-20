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

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { prefs } from '@/services/storage';
import { logger } from '@/utils/logger';

import { attachInterceptors } from './interceptors';

const log = logger.scope('HttpClient');
const debugLog = logger.scope('HTTP-DEBUG');

// ─── Defaults ─────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Debug formatter ──────────────────────────────────────────────────────
// Masks sensitive form/JSON values for safe debug output.
const SENSITIVE_FIELDS = ['password', 'token', 'access_token', 'refresh_token', 'pin', 'secureId'];

function maskValue(v: unknown): string {
  if (typeof v !== 'string') return String(v);
  if (v.length === 0) return '<empty>';
  return `<${v.length} chars>`;
}

function summarizeBody(data: unknown): unknown {
  if (data == null) return undefined;
  if (typeof data === 'string') {
    // form-urlencoded → parse into a Record for masking
    if (data.includes('=') && data.includes('&')) {
      const out: Record<string, string> = {};
      for (const part of data.split('&')) {
        const [k, ...rest] = part.split('=');
        if (!k) continue;
        const decodedKey = decodeURIComponent(k);
        const rawVal = rest.join('=');
        const decodedVal = (() => {
          try {
            return decodeURIComponent(rawVal);
          } catch {
            return rawVal;
          }
        })();
        out[decodedKey] = SENSITIVE_FIELDS.includes(decodedKey)
          ? maskValue(decodedVal)
          : decodedVal;
      }
      return out;
    }
    return data.length > 200 ? `${data.slice(0, 200)}…(${data.length})` : data;
  }
  if (typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = SENSITIVE_FIELDS.includes(k) ? maskValue(v) : v;
    }
    return out;
  }
  return data;
}

function summarizeHeaders(headers: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!headers || typeof headers !== 'object') return out;
  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    if (k.toLowerCase() === 'authorization') {
      out[k] = '<redacted>';
    } else {
      out[k] = v;
    }
  }
  return out;
}

function installDebugInterceptor(instance: AxiosInstance): void {
  if (!__DEV__) return;
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'GET').toUpperCase();
    const full = `${config.baseURL ?? ''}${config.url ?? ''}`;
    debugLog.info(`→ ${method} ${full}`, {
      headers: summarizeHeaders(config.headers),
      params: config.params,
      body: summarizeBody(config.data),
    });
    return config;
  });
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const method = (response.config.method ?? 'GET').toUpperCase();
      const full = `${response.config.baseURL ?? ''}${response.config.url ?? ''}`;
      debugLog.info(`← ${response.status} ${method} ${full}`, {
        body: summarizeBody(response.data),
      });
      return response;
    },
    (error: AxiosError) => {
      const method = (error.config?.method ?? 'GET').toUpperCase();
      const full = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
      debugLog.warn(`✖ ${method} ${full}`, {
        status: error.response?.status,
        code: error.code,
        message: error.message,
        body: summarizeBody(error.response?.data),
      });
      return Promise.reject(error);
    },
  );
}

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
  // Debug interceptor runs LAST so it sees the final config (Bearer attached,
  // skip-headers stripped) and the post-refresh response when applicable.
  installDebugInterceptor(instance);
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
