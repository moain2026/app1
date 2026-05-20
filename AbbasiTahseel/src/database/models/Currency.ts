/**
 * Currency Model — العملات
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class Currency extends Model {
  static table = 'currencies';

  @field('remote_id') remoteId!: number;
  @text('code') code!: string;
  @text('name') name!: string;
  @text('symbol') symbol?: string | null;
  @field('exchange_rate') exchangeRate!: number;
  @field('is_default') isDefault!: boolean;

  @date('last_synced_at') lastSyncedAt?: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
