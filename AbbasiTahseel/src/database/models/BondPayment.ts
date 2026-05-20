/**
 * BondPayment Model — تفاصيل دفعات السندات
 */

import { Model, type Relation } from '@nozbe/watermelondb';
import { date, field, immutableRelation, readonly, text } from '@nozbe/watermelondb/decorators';

import type { Bond } from './Bond';
import type { PushStatus } from './Reading';

export class BondPayment extends Model {
  static table = 'bond_payments';
  static associations = {
    bonds: { type: 'belongs_to' as const, key: 'bond_id' },
  };

  @text('local_uuid') localUuid!: string;
  @field('remote_id') remoteId?: number | null;

  @text('bond_id') bondId!: string; // FK to bonds (local id)
  @field('bond_no') bondNo!: number;
  @field('amount') amount!: number;
  @text('payment_method') paymentMethod?: string | null;
  @text('reference_no') referenceNo?: string | null;
  @text('notes') notes?: string | null;
  @date('payment_date') paymentDate!: Date;

  @text('sync_status') pushStatus!: PushStatus;
  @date('last_sync_attempt_at') lastSyncAttemptAt?: Date | null;
  @text('last_error') lastError?: string | null;
  @field('sync_attempts') syncAttempts!: number;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @immutableRelation('bonds', 'bond_id') bond!: Relation<Bond>;
}
