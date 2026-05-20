/**
 * Push Handlers Registry — العباسي تحصيل
 *
 * Maps each `SyncEntityType` to its handler. The SyncWorker dispatches
 * dequeued items via this map.
 *
 * To add a new entity type:
 *   1. Add a value to `SyncEntityType` in SyncQueueItem.ts.
 *   2. Create a new handler file in this folder.
 *   3. Register it below.
 */

import type { SyncEntityType } from '../../../database/models/SyncQueueItem';
import type { PushHandler } from '../types';

import { bondPaymentPushHandler, bondPushHandler } from './bondPushHandler';
import { readingPushHandler } from './readingPushHandler';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry maps to handlers of varying payload types
type AnyPushHandler = PushHandler<any>;

export const PUSH_HANDLERS: Record<SyncEntityType, AnyPushHandler> = {
  reading: readingPushHandler,
  bond: bondPushHandler,
  bond_payment: bondPaymentPushHandler,
};

export function getPushHandler(entityType: SyncEntityType): AnyPushHandler {
  const handler = PUSH_HANDLERS[entityType];
  if (!handler) {
    throw new Error(`No push handler registered for entity type: ${entityType}`);
  }
  return handler;
}

export { readingPushHandler, bondPushHandler, bondPaymentPushHandler };
export type { ReadingPushPayload } from './readingPushHandler';
export type { BondPushPayload, BondPaymentPushPayload } from './bondPushHandler';
