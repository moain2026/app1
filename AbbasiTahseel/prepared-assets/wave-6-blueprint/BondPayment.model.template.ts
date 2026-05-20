/**
 * BondPayment Model — تفاصيل دفعات السندات
 * ============================================================================
 *  TEMPLATE FILE — DO NOT IMPORT FROM src/
 *
 *  Final path:  src/database/models/BondPayment.ts
 *
 *  This template is essentially equivalent to the existing live file,
 *  with two additions:
 *   1. A typed `paymentMethod` enum (BondPaymentMethod) instead of
 *      `string`, plus a runtime narrowing helper.
 *   2. A `formattedValue` computed getter for UI rendering.
 *
 *  The live src/database/models/BondPayment.ts can stay as-is; the
 *  helpers below should be merged INTO it (preserving the existing
 *  decorator block). The template form is the easier reference.
 * ============================================================================
 *
 * Schema notes
 * ------------
 * Column mapping (legacy -> modern):
 *   kindp  -> payment_method
 *   valuep -> amount
 *   noteb  -> notes
 *   numbp  -> Watermelon's auto-generated id (we don't store legacy numbp;
 *            it's reconstructed from the sync push payload)
 *
 * The `currency_id` column is NOT stored per-payment in the current
 * schema — it lives on the parent Bond. If Wave 6 needs per-payment
 * currency (i.e. one bond covers IQD AND USD payments), a future
 * migration must add `bond_payments.currency_id`. Multi-currency
 * payments are a stretch goal listed in PROJECT_PLAYBOOK.md.
 *
 * For now, the template ASSUMES single-currency per bond (the legacy
 * app behaviour). The multi-currency math in bondsRepository.ts handles
 * the case where the schema later evolves.
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
import type { PushStatus } from './Reading';

// ─── Enums ────────────────────────────────────────────────────────────────

/**
 * Payment method (legacy `kindp`). Stored in `payment_method`.
 *
 *   'cash'        نقدي
 *   'transfer'    حوالة بنكية
 *   'cheque'      شيك
 *   'installment' تقسيط
 *   'other'       أخرى
 *
 * Why 'cheque' and not 'check': matches the receipt template's Arabic
 * label "شيك" canonical romanisation. Be consistent across i18n keys.
 */
export type BondPaymentMethod =
  | 'cash'
  | 'transfer'
  | 'cheque'
  | 'installment'
  | 'other';

const PAYMENT_METHODS: readonly BondPaymentMethod[] = [
  'cash',
  'transfer',
  'cheque',
  'installment',
  'other',
] as const;

/**
 * Currency. The 4 mock currencies are IQD, USD, EUR, SAR (see
 * prepared-assets/mock/mock-currencies.json). Treat any unknown value
 * as `'IQD'` defensively (the primary local currency).
 */
export type CurrencyId = 'IQD' | 'USD' | 'EUR' | 'SAR';

/**
 * Currency metadata used by `formattedValue` and the receipt builders.
 * Kept here (not in Currency.ts) because it's a tight constant table
 * used by formatters; the Currency model has the dynamic server data.
 */
export interface CurrencyMeta {
  symbol: string;
  /** 0 for IQD (integer), 2 for USD/EUR/SAR (cents). */
  decimals: 0 | 2;
}

export const CURRENCY_META: Readonly<Record<CurrencyId, CurrencyMeta>> = {
  IQD: { symbol: 'د.ع', decimals: 0 },
  USD: { symbol: '$',   decimals: 2 },
  EUR: { symbol: '€',   decimals: 2 },
  SAR: { symbol: 'ر.س', decimals: 2 },
};

// ─── Runtime narrowing helpers ────────────────────────────────────────────

export function isBondPaymentMethod(s: string): s is BondPaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(s);
}

export function isCurrencyId(s: string): s is CurrencyId {
  return s === 'IQD' || s === 'USD' || s === 'EUR' || s === 'SAR';
}

/** Coerce an unknown string -> BondPaymentMethod, defaulting to 'cash'. */
export function toBondPaymentMethod(s: string | null | undefined): BondPaymentMethod {
  if (s == null) return 'cash';
  return isBondPaymentMethod(s) ? s : 'other';
}

// ─── Model ────────────────────────────────────────────────────────────────

export class BondPayment extends Model {
  static table = 'bond_payments';
  static associations = {
    bonds: { type: 'belongs_to' as const, key: 'bond_id' },
  };

  // ─── Sync metadata ──────────────────────────────────────────────────────
  @text('local_uuid') localUuid!: string;
  @field('remote_id') remoteId?: number | null;

  // ─── Business fields ────────────────────────────────────────────────────
  @text('bond_id') bondId!: string;
  @field('bond_no') bondNo!: number;
  @field('amount') amount!: number;
  /** Legacy 'kindp'. Stored as a raw string in DB; narrow via toBondPaymentMethod. */
  @text('payment_method') paymentMethod?: string | null;
  @text('reference_no') referenceNo?: string | null;
  @text('notes') notes?: string | null;
  @date('payment_date') paymentDate!: Date;

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

  /* ────────────────────────────────────────────────────────────────────────
   *  Computed getters
   * ──────────────────────────────────────────────────────────────────── */

  /** Strongly-typed payment method (defaults to 'cash' if DB has null). */
  get method(): BondPaymentMethod {
    return toBondPaymentMethod(this.paymentMethod);
  }

  /**
   * Formatted amount with thousand separators and currency symbol.
   *
   *   IQD 1234567 -> "1,234,567 د.ع"
   *   USD 1234.5  -> "1,234.50 $"
   *
   * The currency is resolved from the parent Bond's currencyId column
   * by the caller (we don't `await this.bond.fetch()` here — getters
   * must stay synchronous). Pass the resolved currency.
   *
   * If you don't know the currency yet, pass 'IQD' for safe display.
   */
  formattedValue(currency: CurrencyId): string {
    const meta = CURRENCY_META[currency];
    const num =
      meta.decimals === 0
        ? Math.round(this.amount)
        : Math.round(this.amount * 100) / 100;
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(num);
    return `${formatted} ${meta.symbol}`;
  }
}
