/**
 * API Client — العباسي تحصيل
 *
 * Typed façade over `http` (Axios) + `Endpoints`. Repositories should use
 * THIS module — never axios directly — so:
 *  • Calling code uses endpoint NAMES, not paths.
 *  • Content-Type, method, and auth-requirements are handled centrally.
 *  • Form-urlencoded encoding is automatic for legacy endpoints.
 *
 * Example:
 *   import { api } from '@/services/api';
 *   const raw = await api.call('getListReadingCounter');
 *   const readings = parseReadingList(raw);
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import { Endpoints, type EndpointKey } from './endpoints';
import { SKIP_AUTH_HEADER, IDEMPOTENT_HEADER } from './interceptors';
import { http } from './httpClient';

// ─── Generic call options ─────────────────────────────────────────────────
export interface CallOptions {
  /** Query string parameters (becomes `?key=val&…`). */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request body for POST/PUT/PATCH. */
  body?: unknown;
  /** Mark this call as idempotent — allows the retry interceptor to retry
   *  unsafe methods (POST/PUT/DELETE) on transient failures. Use when the
   *  payload carries an idempotency key (e.g. `local_uuid`). */
  idempotent?: boolean;
  /** Additional Axios config overrides (timeout, signal, headers...). */
  axios?: Omit<AxiosRequestConfig, 'url' | 'method' | 'baseURL' | 'data' | 'params'>;
}

// ─── Body encoder ─────────────────────────────────────────────────────────
function encodeBody(
  body: unknown,
  contentType: 'application/json' | 'application/x-www-form-urlencoded',
): unknown {
  if (body == null) return undefined;
  if (contentType === 'application/json') return body;

  // form-urlencoded: stringify scalars only.
  const params = new URLSearchParams();
  if (typeof body === 'object') {
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      if (v == null) continue;
      params.append(k, String(v));
    }
  }
  return params.toString();
}

// ─── Core call ────────────────────────────────────────────────────────────
async function call<T = unknown>(
  endpointKey: EndpointKey,
  options: CallOptions = {},
): Promise<T> {
  const endpoint = Endpoints[endpointKey];

  const headers: Record<string, string> = {
    'Content-Type': endpoint.contentType,
    ...(options.axios?.headers as Record<string, string> | undefined),
  };

  if (!endpoint.requiresAuth) {
    headers[SKIP_AUTH_HEADER] = '1';
  }

  if (options.idempotent) {
    headers[IDEMPOTENT_HEADER] = '1';
  }

  const data = encodeBody(options.body, endpoint.contentType);

  const response: AxiosResponse<T> = await http.request<T>({
    url: endpoint.path,
    method: endpoint.method,
    headers,
    params: options.params,
    data,
    ...options.axios,
  });

  return response.data;
}

// ─── Public façade ────────────────────────────────────────────────────────
export const api = {
  /**
   * Call any registered endpoint by name.
   * Returns the parsed JSON body. Failures throw `AppError`.
   */
  call,

  /**
   * Direct access to the underlying Axios instance — for edge cases
   * (e.g. file downloads with progress). Prefer `call()` for everything else.
   */
  http,
};

export type Api = typeof api;
