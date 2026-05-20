/**
 * Network Layer — Barrel Export
 *
 * Single import surface:
 *   import { api, Endpoints, parseReadingList, readingToDto } from '@/services/api';
 */

// Client
export { api, type Api, type CallOptions } from './apiClient';
export { http } from './httpClient';

// Endpoint registry
export {
  Endpoints,
  getEndpoint,
  ENDPOINT_COUNT,
  type EndpointKey,
  type EndpointDescriptor,
  type HttpMethod,
  type ContentType,
} from './endpoints';

// Schemas (Zod)
export * from './schemas';

// Mappers (DTO ↔ Domain)
export * from './mappers';

// Interceptor sentinels (rarely needed by callers)
export { SKIP_AUTH_HEADER, IDEMPOTENT_HEADER } from './interceptors';
