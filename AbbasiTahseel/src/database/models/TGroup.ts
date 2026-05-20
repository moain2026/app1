/**
 * TGroup Model — المجموعات (referenced by readings.nog)
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class TGroup extends Model {
  static table = 't_groups';

  @field('remote_id') remoteId!: number;
  @text('code') code?: string | null;
  @text('name') name!: string;
  @field('place_id') placeId?: number | null;

  @date('last_synced_at') lastSyncedAt?: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
