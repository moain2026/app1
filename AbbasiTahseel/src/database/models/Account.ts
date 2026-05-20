/**
 * Account Model — قائمة الحسابات
 *
 * Read-only mirror (server is source of truth). Local edits are not supported.
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class Account extends Model {
  static table = 'accounts';

  @field('remote_id') remoteId!: number;
  @text('code') code!: string;
  @text('name') name!: string;
  @text('name_en') nameEn?: string | null;
  @field('balance') balance!: number;
  @field('currency_id') currencyId?: number | null;
  @text('phone') phone?: string | null;
  @text('address') address?: string | null;

  @date('last_synced_at') lastSyncedAt?: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
