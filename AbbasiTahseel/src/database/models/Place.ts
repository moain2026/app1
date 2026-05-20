/**
 * Place Model — المناطق (referenced by readings.nomstlm)
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class Place extends Model {
  static table = 'places';

  @field('remote_id') remoteId!: number;
  @text('code') code?: string | null;
  @text('name') name!: string;
  @field('parent_id') parentId?: number | null;

  @date('last_synced_at') lastSyncedAt?: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
