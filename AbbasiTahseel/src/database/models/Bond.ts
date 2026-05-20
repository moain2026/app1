/**
 * Bond Model — السندات
 */

import { Model, Q, type Query } from '@nozbe/watermelondb';
import { children, date, field, lazy, readonly, text } from '@nozbe/watermelondb/decorators';

import type { BondPayment } from './BondPayment';
import type { PushStatus } from './Reading';

export class Bond extends Model {
  static table = 'bonds';
  static associations = {
    bond_payments: { type: 'has_many' as const, foreignKey: 'bond_id' },
  };

  @text('local_uuid') localUuid!: string;
  @field('remote_id') remoteId?: number | null;

  @field('bond_no') bondNo!: number;
  @text('bond_type') bondType!: string; // 'receipt' | 'payment'
  @field('account_id') accountId?: number | null;
  @text('account_name') accountName?: string | null;
  @field('currency_id') currencyId?: number | null;
  @field('amount') amount!: number;
  @field('amount_paid') amountPaid!: number;
  @text('notes') notes?: string | null;
  @date('bond_date') bondDate!: Date;

  @text('sync_status') pushStatus!: PushStatus;
  @date('last_sync_attempt_at') lastSyncAttemptAt?: Date | null;
  @text('last_error') lastError?: string | null;
  @field('sync_attempts') syncAttempts!: number;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /** All payments associated with this bond (reactive). */
  @children('bond_payments') payments!: Query<BondPayment>;

  /** Outstanding balance = amount - amountPaid. */
  get remainingAmount(): number {
    return this.amount - this.amountPaid;
  }

  /** Fully paid when amountPaid >= amount. */
  get isFullyPaid(): boolean {
    return this.amountPaid >= this.amount;
  }

  /** Lazy query for fast aggregation in lists. */
  @lazy paymentsOrderedByDate = this.payments.extend(Q.sortBy('payment_date', Q.desc));
}
