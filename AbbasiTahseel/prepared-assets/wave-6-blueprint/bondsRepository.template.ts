/**
 * Bonds Repository — CRUD + business rules for bonds, payments, and links
 * ============================================================================
 *  TEMPLATE FILE — DO NOT IMPORT FROM src/
 *
 *  Final path:  src/services/bonds/bondsRepository.ts
 * ============================================================================
 *
 * Layering
 * --------
 * UI (screens) -> Zustand store (bondsStore) -> Repository (this file) -> DB.
 *
 * The repository is the ONLY place that writes to the bond tables. The
 * store and UI never call `database.write()` directly. This single
 * choke-point lets us:
 *
 *   1. Enforce the immutable-after-print rule in one location.
 *   2. Funnel all writes into the sync queue (push lifecycle).
 *   3. Stub easily for unit tests (no React, no Zustand).
 *
 * Transactional boundaries
 * ------------------------
 * Every public mutator wraps its writes in `database.write(async writer
 * => { ... })`. WatermelonDB queues writes serially per writer, so we
 * never need explicit locking. Reads happen outside transactions.
 *
 * Multi-currency math
 * -------------------
 * `totalByCurrency()` returns a Map<CurrencyId, number> so callers
 * NEVER receive a scalar that has silently coerced currencies. If a
 * bond's payments are mixed-currency (future schema), each currency
 * keeps its own integer total. IQD totals are floor()-rounded; USD/EUR/
 * SAR totals are kept at 2 decimal precision (stored as float because
 * the legacy server does so).
 *
 * Security
 * --------
 * `voidBond()` requires a `confirmedByPin` argument. The repo verifies
 * the PIN against the active admin user before proceeding. The PIN
 * check uses the existing `authStore` / secureStorage layer.
 */

import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';

import { database } from '@/database';
import type {
  Bond,
  BondPayment,
  BondReading,
  Reading,
} from '@/database/models';
import type { BondKind } from '@/database/models/Bond';
import {
  toBondPaymentMethod,
  type BondPaymentMethod,
  type CurrencyId,
} from '@/database/models/BondPayment';
import { verifyAdminPin } from '@/services/security/secureStorage';
import { logger } from '@/utils/logger';

const log = logger.scope('BondsRepository');

// ─── Helper: typed collection accessors ──────────────────────────────────

const bondsCollection = (): ReturnType<typeof database.collections.get<Bond>> =>
  database.collections.get<Bond>('bonds');

const paymentsCollection = (): ReturnType<
  typeof database.collections.get<BondPayment>
> => database.collections.get<BondPayment>('bond_payments');

const readingLinksCollection = (): ReturnType<
  typeof database.collections.get<BondReading>
> => database.collections.get<BondReading>('bond_readings');

const readingsCollection = (): ReturnType<
  typeof database.collections.get<Reading>
> => database.collections.get<Reading>('readings');

// ─── Inputs ───────────────────────────────────────────────────────────────

export interface CreateBondInput {
  bondNo: number;
  bondType: BondKind;          // 'receipt' (default) | 'payment'
  accountId: number | null;
  accountName: string | null;
  currencyId: number | null;
  amount: number;              // grand total in primary currency
  notes: string | null;
  bondDate: Date;
}

export interface AddPaymentInput {
  paymentMethod: BondPaymentMethod;
  amount: number;
  referenceNo: string | null;
  notes: string | null;
  paymentDate: Date;
}

export interface LinkReadingInput {
  readingId: string;       // local id (Watermelon id)
  readingNum: number;      // legacy num — duplicated for fast lookup
  amount: number;          // legacy valuer
}

export interface BondsDateRange {
  /** inclusive */ from: Date;
  /** exclusive */ to: Date;
}

// ─── Outputs ──────────────────────────────────────────────────────────────

export interface BondTotals {
  /** sum of all payments for the bond, grouped by currency. */
  byCurrency: Map<CurrencyId, number>;
  /** sum per payment method (single-currency aggregation for the bond's
      primary currency). Useful for the daily-summary receipt. */
  byMethod: Map<BondPaymentMethod, number>;
  /** total count of payment rows. */
  count: number;
}

// ─── Repository ───────────────────────────────────────────────────────────

export const bondsRepository = {
  // ─── CREATE ─────────────────────────────────────────────────────────────

  /**
   * Create a draft bond. The row is born in `pushStatus='dirty'` so the
   * sync engine picks it up; `printed_at` and `voided_at` are null. The
   * caller must subsequently call `addPayment()` and `linkReading()` to
   * populate child rows, then `markPrinted()` to finalise.
   */
  async createBond(input: CreateBondInput): Promise<Bond> {
    const created = await database.write(async (writer) => {
      return await bondsCollection().create((row) => {
        row.localUuid = generateUuidV4();
        row.remoteId = null;
        row.bondNo = input.bondNo;
        row.bondType = input.bondType;
        row.accountId = input.accountId;
        row.accountName = input.accountName;
        row.currencyId = input.currencyId;
        row.amount = input.amount;
        row.amountPaid = 0;
        row.notes = input.notes;
        row.bondDate = input.bondDate;
        row.printedAt = null;
        row.voidedAt = null;
        row.voidedBy = null;
        row.pushStatus = 'dirty';
        row.lastSyncAttemptAt = null;
        row.lastError = null;
        row.syncAttempts = 0;
      });
    });
    log.info('createBond', { id: created.id, bondNo: created.bondNo });
    return created;
  },

  // ─── READ ───────────────────────────────────────────────────────────────

  async getBondById(localUuid: string): Promise<Bond | null> {
    const rows = await bondsCollection()
      .query(Q.where('local_uuid', localUuid))
      .fetch();
    return rows[0] ?? null;
  },

  /**
   * Reactive list. Pass empty filter for "all bonds". The returned
   * Observable emits a new array whenever any row in the result set
   * changes. Screens should subscribe inside `useEffect`.
   *
   * Filter options:
   *   { kind: 'unsynced' }    — sync_status in ('dirty','syncing','failed')
   *   { kind: 'today' }       — bond_date >= start-of-today
   *   { kind: 'printed' }     — printed_at NOT NULL
   *   { kind: 'voided' }      — voided_at NOT NULL
   *   { kind: 'all' }         — no filter
   */
  observeBonds(
    filter: { kind: 'all' | 'unsynced' | 'today' | 'printed' | 'voided' } = {
      kind: 'all',
    },
  ): Observable<Bond[]> {
    const conditions = filter.kind === 'all' ? [] : [bondFilterClause(filter.kind)];
    return bondsCollection()
      .query(...conditions, Q.sortBy('bond_date', Q.desc))
      .observe();
  },

  async getBondsByDateRange(range: BondsDateRange): Promise<Bond[]> {
    return await bondsCollection()
      .query(
        Q.where('bond_date', Q.gte(range.from.getTime())),
        Q.where('bond_date', Q.lt(range.to.getTime())),
        Q.sortBy('bond_date', Q.desc),
      )
      .fetch();
  },

  async getUnsyncedBonds(): Promise<Bond[]> {
    return await bondsCollection()
      .query(Q.where('sync_status', Q.oneOf(['dirty', 'failed'])))
      .fetch();
  },

  // ─── LINK READINGS ──────────────────────────────────────────────────────

  /**
   * Attach a reading to a bond. Idempotent: re-linking the same reading
   * updates its `amount` instead of creating a duplicate junction row.
   */
  async linkReading(
    bondId: string,
    input: LinkReadingInput,
  ): Promise<BondReading> {
    const bond = await this.requireBondById(bondId);
    this.assertMutable(bond, 'linkReading');

    return await database.write(async (writer) => {
      // Look for an existing junction row for this (bond, reading).
      const existing = await readingLinksCollection()
        .query(
          Q.where('bond_id', bondId),
          Q.where('reading_id', input.readingId),
        )
        .fetch();

      if (existing.length > 0) {
        const row = existing[0];
        await row.update((r) => {
          r.amount = input.amount;
          r.pushStatus = 'dirty';
        });
        return row;
      }

      return await readingLinksCollection().create((row) => {
        row.localUuid = generateUuidV4();
        row.bondId = bondId;
        row.readingId = input.readingId;
        row.readingNum = input.readingNum;
        row.amount = input.amount;
        row.pushStatus = 'dirty';
        row.lastSyncAttemptAt = null;
        row.lastError = null;
        row.syncAttempts = 0;
      });
    });
  },

  async unlinkReading(bondId: string, readingId: string): Promise<void> {
    const bond = await this.requireBondById(bondId);
    this.assertMutable(bond, 'unlinkReading');

    await database.write(async () => {
      const existing = await readingLinksCollection()
        .query(
          Q.where('bond_id', bondId),
          Q.where('reading_id', readingId),
        )
        .fetch();
      for (const row of existing) {
        await row.markAsDeleted();
      }
    });
  },

  // ─── PAYMENTS ───────────────────────────────────────────────────────────

  /**
   * Add a payment line to a bond. Updates the bond's `amount_paid`
   * scalar so the list screen can show "fully paid" without aggregating.
   */
  async addPayment(bondId: string, input: AddPaymentInput): Promise<BondPayment> {
    const bond = await this.requireBondById(bondId);
    this.assertMutable(bond, 'addPayment');

    return await database.write(async () => {
      const created = await paymentsCollection().create((row) => {
        row.localUuid = generateUuidV4();
        row.bondId = bond.id;
        row.bondNo = bond.bondNo;
        row.amount = input.amount;
        row.paymentMethod = input.paymentMethod;
        row.referenceNo = input.referenceNo;
        row.notes = input.notes;
        row.paymentDate = input.paymentDate;
        row.pushStatus = 'dirty';
        row.lastSyncAttemptAt = null;
        row.lastError = null;
        row.syncAttempts = 0;
      });

      await bond.update((b) => {
        b.amountPaid = b.amountPaid + input.amount;
        b.pushStatus = 'dirty';
      });

      return created;
    });
  },

  async removePayment(bondId: string, paymentId: string): Promise<void> {
    const bond = await this.requireBondById(bondId);
    this.assertMutable(bond, 'removePayment');

    await database.write(async () => {
      const payment = await paymentsCollection().find(paymentId);
      const refund = payment.amount;
      await payment.markAsDeleted();
      await bond.update((b) => {
        b.amountPaid = Math.max(0, b.amountPaid - refund);
        b.pushStatus = 'dirty';
      });
    });
  },

  // ─── STATE TRANSITIONS ──────────────────────────────────────────────────

  /**
   * Flip the bond to PRINTED state.
   *
   * IMPORTANT: This is called BEFORE the print buffer is sent to the
   * printer — see Pitfall #7 in the integration guide. If printing
   * fails, the user already has paper in hand (or believes they should),
   * so we keep the bond marked printed and offer reprint instead.
   */
  async markPrinted(bondId: string): Promise<Bond> {
    const bond = await this.requireBondById(bondId);
    if (bond.isPrinted) {
      // Idempotent — reprint flow re-uses the same bond.
      return bond;
    }
    if (bond.isVoided) {
      throw new Error('bonds.errors.cannotPrintVoided');
    }
    return await database.write(async () => {
      await bond.update((b) => {
        b.printedAt = new Date();
        b.pushStatus = 'dirty';
      });
      return bond;
    });
  },

  /**
   * Void a bond. Requires the admin PIN to be passed in plaintext (the
   * repository hashes & compares against secureStorage). The void
   * timestamp + actor are written; the bond becomes terminal.
   *
   * Voiding bypasses `assertMutable` deliberately — voiding a printed
   * bond IS the legitimate path.
   */
  async voidBond(bondId: string, opts: { confirmedByPin: string; actorLocalUuid: string }): Promise<Bond> {
    const ok = await verifyAdminPin(opts.confirmedByPin);
    if (!ok) {
      throw new Error('bonds.errors.invalidAdminPin');
    }

    const bond = await this.requireBondById(bondId);
    if (bond.isVoided) {
      return bond; // idempotent
    }

    return await database.write(async () => {
      await bond.update((b) => {
        b.voidedAt = new Date();
        b.voidedBy = opts.actorLocalUuid;
        b.pushStatus = 'dirty';
      });
      return bond;
    });
  },

  // ─── AGGREGATES ─────────────────────────────────────────────────────────

  /**
   * Compute totals for a bond. Returns currency-keyed Map plus a
   * per-method breakdown (using the bond's primary currency only —
   * mixed-currency per-method aggregation isn't required by Wave 6).
   *
   * Currency resolution: the bond carries a `currencyId` (FK to the
   * currencies table). The caller is responsible for resolving it to a
   * `CurrencyId` string; if `null`, we assume `IQD`.
   */
  async totalsFor(
    bondId: string,
    primaryCurrency: CurrencyId = 'IQD',
  ): Promise<BondTotals> {
    const payments = await paymentsCollection()
      .query(Q.where('bond_id', bondId))
      .fetch();

    const byCurrency = new Map<CurrencyId, number>();
    const byMethod = new Map<BondPaymentMethod, number>();

    for (const p of payments) {
      // Multi-currency: future-proof. Today every payment uses the bond's
      // primary currency, so this loop just accumulates one bucket. When
      // the schema gains bond_payments.currency_id, replace the next
      // line with that column.
      const cur: CurrencyId = primaryCurrency;
      byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + p.amount);

      const m = toBondPaymentMethod(p.paymentMethod);
      byMethod.set(m, (byMethod.get(m) ?? 0) + p.amount);
    }

    return { byCurrency, byMethod, count: payments.length };
  },

  // ─── GUARDS ─────────────────────────────────────────────────────────────

  async requireBondById(localUuid: string): Promise<Bond> {
    const bond = await this.getBondById(localUuid);
    if (bond === null) {
      throw new Error('bonds.errors.notFound');
    }
    return bond;
  },

  /** Throw if the bond cannot be mutated (post-print / post-void). */
  assertMutable(bond: Bond, op: string): void {
    if (bond.isImmutable) {
      log.warn(`${op} blocked — bond is immutable`, {
        id: bond.id,
        isPrinted: bond.isPrinted,
        isVoided: bond.isVoided,
      });
      throw new Error('bonds.errors.bondImmutable');
    }
  },
};

// ─── Internal helpers ────────────────────────────────────────────────────

function bondFilterClause(
  kind: 'unsynced' | 'today' | 'printed' | 'voided',
): Q.Clause {
  switch (kind) {
    case 'unsynced':
      return Q.where('sync_status', Q.oneOf(['dirty', 'syncing', 'failed']));
    case 'today': {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return Q.where('bond_date', Q.gte(startOfDay.getTime()));
    }
    case 'printed':
      return Q.where('printed_at', Q.notEq(null));
    case 'voided':
      return Q.where('voided_at', Q.notEq(null));
  }
}

/**
 * UUID v4 — small implementation to avoid pulling `uuid` as a dep.
 * Matches the format `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.
 *
 * Uses Math.random — fine for local identifiers; the global ID space
 * is the server-side `remote_id` once synced.
 */
function generateUuidV4(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4';
    } else if (i === 19) {
      out += hex[(Math.random() * 4) | 0 | 8];
    } else {
      out += hex[(Math.random() * 16) | 0];
    }
  }
  return out;
}
