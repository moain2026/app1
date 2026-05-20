/**
 * SyncQueueItem Model — outbound mutation queue
 *
 * Lifecycle:
 *   pending → processing → done    (success path)
 *   pending → processing → pending (transient failure, backoff)
 *   pending → processing → failed  (max attempts exceeded)
 *
 * `payload_json` is the serialized DTO ready to be sent over the wire.
 * `entity_local_uuid` is the idempotency key — the server must use it to
 * de-duplicate retried writes.
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export type SyncQueueStatus = 'pending' | 'processing' | 'failed' | 'done';
export type SyncQueueOperation = 'create' | 'update' | 'delete';
export type SyncEntityType = 'reading' | 'bond' | 'bond_payment';

export class SyncQueueItem extends Model {
  static table = 'sync_queue';

  @text('entity_type') entityType!: SyncEntityType;
  @text('entity_local_id') entityLocalId!: string;
  @text('entity_local_uuid') entityLocalUuid!: string;
  @text('operation') operation!: SyncQueueOperation;
  @text('payload_json') payloadJson!: string;
  @text('status') status!: SyncQueueStatus;
  @field('priority') priority!: number;
  @field('attempts') attempts!: number;
  @text('last_error') lastError?: string | null;
  @date('next_run_at') nextRunAt?: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /** Parse and return the payload as a typed object. */
  payload<T = unknown>(): T {
    return JSON.parse(this.payloadJson) as T;
  }
}
