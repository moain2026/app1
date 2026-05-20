/**
 * User Model — Mirror of Users.java
 *
 * Preserves the legacy permission field names (DE/ED/REP/S_K/S_S/SYS/NOA/NOU)
 * so the auth response can be persisted as-is.
 *
 * In the legacy app, 8 HakAccess entries were auto-derived from these flags.
 * In the new app, we just expose computed getters on this model.
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class User extends Model {
  static table = 'users';

  @field('remote_id') remoteId!: number;
  @text('username') username!: string;
  @text('full_name') fullName?: string | null;
  @text('phone') phone?: string | null;
  @text('email') email?: string | null;

  // Legacy permission flags — keep names verbatim
  @field('de') de!: boolean;
  @field('ed') ed!: boolean;
  @field('rep') rep!: boolean;
  @field('s_k') sK!: boolean;
  @field('s_s') sS!: boolean;
  @field('sys') sys!: boolean;
  @field('noa') noa!: number;
  @field('nou') nou!: number;

  @date('last_login_at') lastLoginAt?: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /* ──────────────────────────────────────────────────────────────────────
   * Permission accessors (clean, readable, computed from legacy flags).
   * Components should consult these instead of the raw flags.
   * ────────────────────────────────────────────────────────────────────── */

  /** Can delete readings/bonds. */
  get canDelete(): boolean {
    return this.de;
  }

  /** Can edit posted readings/bonds. */
  get canEdit(): boolean {
    return this.ed;
  }

  /** Can access reports section. */
  get canViewReports(): boolean {
    return this.rep;
  }

  /** Can see readings of other collectors. */
  get canViewAllReadings(): boolean {
    return this.sK;
  }

  /** Can see bonds of other collectors. */
  get canViewAllBonds(): boolean {
    return this.sS;
  }

  /** System admin (full access). */
  get isAdmin(): boolean {
    return this.sys;
  }
}
