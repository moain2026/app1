/**
 * Bond Model — السندات (Wave 6 superset)
 * ============================================================================
 *  TEMPLATE FILE — DO NOT IMPORT FROM src/
 *
 *  Final path:  src/database/models/Bond.ts
 *  Action:      REPLACE existing file (the live one is a Wave-4 subset).
 * ============================================================================
 *
 * This is a SUPERSET of the existing Bond.ts in src/database/models/. The
 * three new columns (`printed_at`, `voided_at`, `voided_by`) require the
 * schema migration described in WAVE_6_INTEGRATION_GUIDE.md §3. Do NOT
 * land this file before the migration, or WatermelonDB will throw at boot.
 *
 * Why preserve modern column names (not legacy numb/datb/kindb)
 * -------------------------------------------------------------
 * The existing schema and the live Bond.ts in src/ already use modern
 * names (bond_no, bond_date, bond_type, amount, amount_paid). The
 * legacy<->modern mapping happens in the sync push layer, not here.
 * See WAVE_6_INTEGRATION_GUIDE.md §0.1 for the full table.
 *
 * Computed getters expose UI-friendly aliases without renaming columns.
 */

import { Model, Q, type Query } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  lazy,
  readonly,
  text,
} from '@nozbe/watermelondb/decorators';

import type { BondPayment } from './BondPayment';
import type { BondReading } from './BondReading';
import type { PushStatus } from './Reading';

// ─── Public type aliases ──────────────────────────────────────────────────

/**
 * Receipt kind. Stored in column `bond_type`.
 *   'receipt' — a سند قبض (money coming IN to the company)
 *   'payment' — a سند صرف (money going OUT — rare in collector workflow)
 *
 * Wave 6 collector app issues 'receipt' bonds 99% of the time. The
 * 'payment' value is reserved for future use (e.g. refund flow).
 */
export type BondKind = 'receipt' | 'payment';

/**
 * Bond state machine — derived, NOT stored as a single column.
 *
 *   draft     -> bond row exists, printed_at is null, voided_at is null
 *   printed   -> printed_at is set (immutable from this point)
 *   voided    -> voided_at is set (terminal; can co-exist with printed)
 *
 * "synced" is orthogonal — controlled by `pushStatus`. A bond can be
 * `printed` AND `dirty` simultaneously (paper in hand, awaiting upload).
 */
export type BondState = 'draft' | 'printed' | 'voided';

// ─── Model ────────────────────────────────────────────────────────────────

export class Bond extends Model {
  static table = 'bonds';

  static associations = {
    bond_payments: { type: 'has_many' as const, foreignKey: 'bond_id' },
    bond_readings: { type: 'has_many' as const, foreignKey: 'bond_id' },
  };

  // ─── Sync metadata ──────────────────────────────────────────────────────
  @text('local_uuid') localUuid!: string;
  @field('remote_id') remoteId?: number | null;

  // ─── Business fields (existing in current schema) ───────────────────────
  @field('bond_no') bondNo!: number;
  @text('bond_type') bondType!: BondKind;
  @field('account_id') accountId?: number | null;
  @text('account_name') accountName?: string | null;
  @field('currency_id') currencyId?: number | null;
  @field('amount') amount!: number;
  @field('amount_paid') amountPaid!: number;
  @text('notes') notes?: string | null;
  @date('bond_date') bondDate!: Date;

  // ─── State columns (NEW — require migration; see Guide §3) ──────────────
  /** When the bond was printed. `null` = draft. Setting this flips the
      bond into the immutable state. */
  @date('printed_at') printedAt?: Date | null;
  /** When the bond was voided. Once set, the bond is terminal. */
  @date('voided_at') voidedAt?: Date | null;
  /** local_uuid of the user (admin) who voided this bond. */
  @text('voided_by') voidedBy?: string | null;

  // ─── Sync state ─────────────────────────────────────────────────────────
  @text('sync_status') pushStatus!: PushStatus;
  @date('last_sync_attempt_at') lastSyncAttemptAt?: Date | null;
  @text('last_error') lastError?: string | null;
  @field('sync_attempts') syncAttempts!: number;

  // ─── Timestamps ─────────────────────────────────────────────────────────
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // ─── Relations ──────────────────────────────────────────────────────────
  /** All payments associated with this bond (reactive). */
  @children('bond_payments') payments!: Query<BondPayment>;
  /** All reading links (junction table) for this bond. */
  @children('bond_readings') readingLinks!: Query<BondReading>;

  /* ────────────────────────────────────────────────────────────────────────
   *  Lazy queries for fast aggregation in list rows.
   *  Lazy decorator caches the Query instance per model instance so list
   *  re-renders don't keep instantiating new RxJS observables.
   * ──────────────────────────────────────────────────────────────────── */

  @lazy paymentsOrderedByDate = this.payments.extend(
    Q.sortBy('payment_date', Q.desc),
  );

  @lazy readingLinksOrdered = this.readingLinks.extend(
    Q.sortBy('reading_num', Q.asc),
  );

  /* ────────────────────────────────────────────────────────────────────────
   *  Computed getters — derived, NEVER persisted.
   *
   *  These are intentionally lightweight (no async, no DB lookups).
   *  Anything that needs to await the children Query must do so via the
   *  repository (bondsRepository.totalByCurrency etc.).
   * ──────────────────────────────────────────────────────────────────── */

  /** True once the bond has been printed (any reprint also keeps it true). */
  get isPrinted(): boolean {
    return this.printedAt != null;
  }

  /** True once the bond has been voided by an admin. Terminal state. */
  get isVoided(): boolean {
    return this.voidedAt != null;
  }

  /**
   * Has paper been issued for this bond? Once true, the only allowed
   * mutation is `voidBond()`. Used by repository write guards.
   *
   * NOTE: A voided bond is ALSO immutable for ordinary edits. Voiding
   * itself is a privileged write that bypasses this guard.
   */
  get isImmutable(): boolean {
    return this.isPrinted || this.isVoided;
  }

  /** Derived state for UI badges (filter chips, detail screen header). */
  get state(): BondState {
    if (this.isVoided) return 'voided';
    if (this.isPrinted) return 'printed';
    return 'draft';
  }

  /**
   * Outstanding balance = amount - amountPaid.
   *
   * Note: For Wave 6's collector workflow, `amount` is the bond's
   * grand total (in the primary currency) and `amount_paid` is the
   * sum of all payment rows. They should be equal for a confirmed
   * single-currency bond. For multi-currency bonds, the canonical
   * per-currency totals live in `bond_payments`; this scalar is a
   * convenience for the primary currency only.
   */
  get remainingAmount(): number {
    return this.amount - this.amountPaid;
  }

  get isFullyPaid(): boolean {
    return this.amountPaid >= this.amount;
  }

  /**
   * Receipt barcode: B-<remote_id || bond_no>-<hash6(local_uuid)>.
   * The hash is the first 6 hex chars of the local_uuid — stable across
   * reprints and unique enough (collision prob ~1/16M).
   */
  get receiptBarcode(): string {
    const serverNo = this.remoteId ?? this.bondNo;
    const hash6 = this.localUuid.replace(/-/g, '').slice(0, 6).toUpperCase();
    return `B-${serverNo}-${hash6}`;
  }
}
