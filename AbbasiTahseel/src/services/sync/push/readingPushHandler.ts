/**
 * Reading Push Handler — العباسي تحصيل
 *
 * Sends a queued reading mutation to the legacy backend.
 *
 * Endpoints used:
 *   • create / update → SaveReading or UpdateReading
 *   • delete          → DeleteReading
 *
 * Wire format:
 *   The payload is the legacy ItemReadingDto shape (noadad, ks, kh, cas, …)
 *   — the queue stored it already-serialized via `readingToDto`, so we send
 *   it as-is. We must NEVER rename to camelCase here.
 *
 * Idempotency:
 *   We pass `idempotent: true` so the retry interceptor can safely replay
 *   POST/PUT on transient network failures. The server is expected to
 *   de-dupe on `local_uuid` — we include it in the payload explicitly so
 *   future server versions that support idempotency keys can use it.
 */

import { api } from '../../api';
import { AppError, ErrorCodes } from '../../../utils/errors';
import { logger } from '../../../utils/logger';
import type { ItemReadingDto } from '../../api/schemas/reading';
import { classifyError, success } from '../errorClassifier';
import type { PushHandler, QueueItemOutcome } from '../types';

const log = logger.scope('Push.Reading');

/**
 * Payload contract: the queue stores a `ReadingPushPayload` (JSON) and this
 * handler unwraps it. The wrapper carries `local_uuid` separately so we can
 * include it in the wire body without polluting the DTO shape.
 */
export interface ReadingPushPayload {
  /** Idempotency key — also stored in queue.entity_local_uuid. */
  local_uuid: string;
  /** Optional: when updating, the server-assigned id (num) we got at last pull. */
  remote_id?: number | null;
  /** The reading body in legacy wire format. */
  dto: ItemReadingDto;
}

async function executeCreate(payload: ReadingPushPayload): Promise<QueueItemOutcome> {
  const body = {
    ...payload.dto,
    local_uuid: payload.local_uuid, // server can use as idempotency key
  };
  log.debug('SaveReading', { uuid: payload.local_uuid, noadad: payload.dto.noadad });
  await api.call('saveReading', { body, idempotent: true });
  // Legacy server returns just { success: true } or the saved row. We don't
  // currently rely on a returned remote id (the reading model keeps using
  // local id; remote_id is back-filled on the next pull).
  return success();
}

async function executeUpdate(payload: ReadingPushPayload): Promise<QueueItemOutcome> {
  const body = {
    ...payload.dto,
    local_uuid: payload.local_uuid,
  };
  log.debug('UpdateReading', { uuid: payload.local_uuid, noadad: payload.dto.noadad });
  await api.call('updateReading', { body, idempotent: true });
  return success();
}

async function executeDelete(payload: ReadingPushPayload): Promise<QueueItemOutcome> {
  // DeleteReading takes the meter number (noadad) — see ApiService.java line 113.
  log.debug('DeleteReading', { uuid: payload.local_uuid, noadad: payload.dto.noadad });
  await api.call('deleteReading', {
    params: { noadad: payload.dto.noadad },
    idempotent: true,
  });
  return success();
}

// ─── Handler implementation ───────────────────────────────────────────────
export const readingPushHandler: PushHandler<ReadingPushPayload> = {
  entityType: 'reading',
  async execute(payload, operation): Promise<QueueItemOutcome> {
    try {
      switch (operation) {
        case 'create':
          return await executeCreate(payload);
        case 'update':
          return await executeUpdate(payload);
        case 'delete':
          return await executeDelete(payload);
        default: {
          // Exhaustiveness check.
          const _exhaustive: never = operation;
          throw new AppError(ErrorCodes.UNKNOWN, {
            message: `Unknown operation: ${String(_exhaustive)}`,
          });
        }
      }
    } catch (err) {
      // Convert anything thrown by axios/Zod/etc. into a typed outcome.
      log.warn('reading push failed', { uuid: payload.local_uuid, operation });
      return classifyError(err);
    }
  },
};
