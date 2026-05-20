/**
 * BondReading Model — junction between bonds and readings
 * ============================================================================
 *  TEMPLATE FILE — DO NOT IMPORT FROM src/
 *
 *  Final path:  src/database/models/BondReading.ts
 *  Prereq:      Schema migration that adds the `bond_readings` table
 *               (see WAVE_6_INTEGRATION_GUIDE.md §3.2).
 * ============================================================================
 *
 * Why a junction table
 * --------------------
 * One bond can cover MULTIPLE readings (the collector visits a subscriber
 * with 3 meters and issues one combined receipt). The legacy DB used a
 * parallel column called `valuer` on each reading to track "amount paid
 * against this reading"; we surface the same semantics through a junction
 * table because:
 *
 *   1. Multi-currency makes per-reading amount tricky to keep on the
 *      reading itself.
 *   2. Tombstone deletes on a bond shouldn't cascade to readings.
 *   3. The junction lets the receipt builder query in either direction
 *      (`bond.readingLinks` for receipt, `reading.bondLinks` for history).
 *
 * Column mapping (legacy -> modern):
 *   numb  -> bond_id (via bond_no copied for fast lookup, see Bond model)
 *   num   -> reading_num (legacy reading sequence number)
 *   valuer-> amount
 *
 * Sync semantics
 * --------------
 * Junction rows sync as a side-effect of pushing the parent bond. The
 * push payload includes a `bond_readings` array; the server denormalises
 * back into the legacy schema. Tombstone handling: when a bond is voided,
 * its bond_readings stay (audit trail) — only their `sync_status` is
 * bumped to `dirty` if needed.
 */

import { Model, type Relation } from '@nozbe/watermelondb';
import {
  date,
  field,
  immutableRelation,
  readonly,
  text,
} from '@nozbe/watermelondb/decorators';

import type { Bond } from './Bond';
import type { PushStatus, Reading } from './Reading';

export class BondReading extends Model {
  static table = 'bond_readings';

  static associations = {
    bonds:    { type: 'belongs_to' as const, key: 'bond_id' },
    readings: { type: 'belongs_to' as const, key: 'reading_id' },
  };

  // ─── Sync metadata ──────────────────────────────────────────────────────
  @text('local_uuid') localUuid!: string;

  // ─── FKs ────────────────────────────────────────────────────────────────
  @text('bond_id') bondId!: string;
  @text('reading_id') readingId!: string;

  // ─── Business fields ────────────────────────────────────────────────────
  /** Legacy `num` — the reading's sequence number. Duplicated here for
      fast lookup without joining the readings table. */
  @field('reading_num') readingNum!: number;
  /** Legacy `valuer` — amount paid against this specific reading. */
  @field('amount') amount!: number;

  // ─── Sync state ─────────────────────────────────────────────────────────
  @text('sync_status') pushStatus!: PushStatus;
  @date('last_sync_attempt_at') lastSyncAttemptAt?: Date | null;
  @text('last_error') lastError?: string | null;
  @field('sync_attempts') syncAttempts!: number;

  // ─── Timestamps ─────────────────────────────────────────────────────────
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // ─── Relations ──────────────────────────────────────────────────────────
  @immutableRelation('bonds', 'bond_id') bond!: Relation<Bond>;
  @immutableRelation('readings', 'reading_id') reading!: Relation<Reading>;
}
