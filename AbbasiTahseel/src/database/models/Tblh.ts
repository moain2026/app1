/**
 * Tblh Model — التابلات/الدفاتر (referenced by readings.notblh)
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class Tblh extends Model {
  static table = 'tblh';

  @field('remote_id') remoteId!: number;
  @text('code') code?: string | null;
  @text('name') name!: string;
  @field('group_id') groupId?: number | null;
  @field('place_id') placeId?: number | null;

  @date('last_synced_at') lastSyncedAt?: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
