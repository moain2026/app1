/**
 * CompanyInfo Model — used by print receipts and screens header
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class CompanyInfo extends Model {
  static table = 'company_info';

  @field('remote_id') remoteId?: number | null;
  @text('name_ar') nameAr!: string;
  @text('name_en') nameEn?: string | null;
  @text('phone') phone?: string | null;
  @text('address') address?: string | null;
  @text('logo_url') logoUrl?: string | null;
  @text('footer_text') footerText?: string | null;

  @date('last_synced_at') lastSyncedAt?: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
