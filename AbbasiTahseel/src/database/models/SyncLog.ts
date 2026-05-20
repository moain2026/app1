/**
 * SyncLog Model — audit trail for the Sync Dashboard
 *
 * Append-only. Useful for diagnosing what happened during background sync
 * and for showing per-entity sync history in the dashboard.
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export type SyncDirection = 'push' | 'pull';
export type SyncLogStatus = 'success' | 'failure';

export class SyncLog extends Model {
  static table = 'sync_logs';

  @text('entity_type') entityType!: string;
  @text('operation') operation!: string;
  @text('direction') direction!: SyncDirection;
  @text('status') status!: SyncLogStatus;
  @field('records_count') recordsCount!: number;
  @field('duration_ms') durationMs!: number;
  @text('error_message') errorMessage?: string | null;
  @field('http_status') httpStatus?: number | null;

  @readonly @date('created_at') createdAt!: Date;
}
