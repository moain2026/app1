/**
 * Seed bonds + bond_payments — Wave 6-Β
 *
 * Mirrors `MOCK_BONDS` + `MOCK_BOND_PAYMENTS` into the `bonds` and
 * `bond_payments` tables. Both seeds run as ONE transaction so the
 * parent/child invariant (every payment row references an existing
 * bond row by its local WMDB id) is never violated mid-flight.
 *
 * IMPORTANT — denormalized fields:
 *   `MockBond` carries `accountName` / `accountNum` / `currencySymbol`
 *   so the list row renders without a JOIN. The `Bond` model only
 *   stores `account_id` + `account_name` (the symbol must be derived).
 *   We keep `account_name` because BondCard reads it directly; the
 *   symbol is dropped on insert and re-derived at render time by
 *   the view-model layer in `bondListItem.vm.ts`.
 *
 * IDEMPOTENCY: the seeder skips when the first bond's local_uuid is
 * already present. If that's the case it ALSO skips payments — this
 * gives us atomicity-without-transactions across two collections.
 */

import { Q } from '@nozbe/watermelondb';

import { database } from '@/database';
import type { Bond } from '@/database/models/Bond';
import type { BondPayment } from '@/database/models/BondPayment';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

import { MOCK_BOND_PAYMENTS } from '../../mocks/bondPayments';
import { MOCK_BONDS } from '../../mocks/bonds';

const log = logger.scope('SeedBonds');

let promise: Promise<void> | null = null;

export async function seedBondsIfDevBypass(): Promise<void> {
  if (!useAuthStore.getState().isDevBypass) {
    return;
  }
  if (promise) {
    return promise;
  }
  promise = doSeed().finally(() => {
    promise = null;
  });
  return promise;
}

async function doSeed(): Promise<void> {
  const bondCol = database.collections.get<Bond>('bonds');
  const paymentCol = database.collections.get<BondPayment>('bond_payments');

  const sentinel = MOCK_BONDS[0];
  if (!sentinel) {
    log.warn('seedBonds: no mock rows — skip');
    return;
  }
  const existing = await bondCol
    .query(Q.where('local_uuid', sentinel.localUuid))
    .fetch();
  if (existing.length > 0) {
    log.debug('seedBonds: already populated, skip');
    return;
  }

  const startedAt = Date.now();
  try {
    // First pass — write bonds. We need their local WMDB ids before we
    // can wire the payments via FK, so this is a two-phase write.
    const bondUuidToLocalId = new Map<string, string>();

    await database.write(async () => {
      const creates = MOCK_BONDS.map((mock) =>
        bondCol.prepareCreate((row) => {
          row.localUuid = mock.localUuid;
          if (mock.remoteId != null) {
            row.remoteId = mock.remoteId;
          }
          row.bondNo = mock.bondNo;
          row.bondType = mock.bondType;
          row.accountId = mock.accountId;
          row.accountName = mock.accountName;
          row.currencyId = mock.currencyId;
          row.amount = mock.amount;
          row.amountPaid = mock.amountPaid;
          row.notes = mock.notes ?? null;
          row.bondDate = new Date(mock.bondDate);
          // sync state mapping — MockBond uses 'synced'|'dirty'|'failed';
          // PushStatus union includes 'pristine'|'syncing' too. We only
          // ever seed the three terminal states.
          row.pushStatus = mock.syncStatus;
          row.lastError = mock.lastError ?? null;
          row.syncAttempts = 0;
          // lastSyncAttemptAt is best-effort — seed it with bond_date
          // for synced rows so the UI shows "last attempt: <bond_date>"
          // instead of "never". Failed / dirty rows leave it null.
          if (mock.syncStatus === 'synced') {
            row.lastSyncAttemptAt = new Date(mock.bondDate);
          }
        }),
      );
      await database.batch(...creates);
    });

    // Reload to capture the WMDB-assigned local ids (the prepareCreate
    // models above are valid but their `.id` may only be filled after
    // the batch commits — fetch fresh to be safe).
    const persistedBonds = await bondCol.query().fetch();
    for (const b of persistedBonds) {
      bondUuidToLocalId.set(b.localUuid, b.id);
    }

    // Second pass — payments referencing the freshly-written bonds.
    await database.write(async () => {
      const paymentCreates = MOCK_BOND_PAYMENTS.map((mock) => {
        const parentLocalId = bondUuidToLocalId.get(mock.bondLocalUuid);
        if (parentLocalId == null) {
          log.warn('seedBonds: payment without parent bond — skip', {
            paymentUuid: mock.localUuid,
            expectedBondUuid: mock.bondLocalUuid,
          });
          return null;
        }
        return paymentCol.prepareCreate((row) => {
          row.localUuid = mock.localUuid;
          if (mock.remoteId != null) {
            row.remoteId = mock.remoteId;
          }
          row.bondId = parentLocalId;
          // bond_no is duplicated on the payment for fast lookups —
          // copy from the parent so we don't drift if a bond_no
          // changes server-side (rare but possible).
          const parent = MOCK_BONDS.find(
            (b) => b.localUuid === mock.bondLocalUuid,
          );
          row.bondNo = parent?.bondNo ?? 0;
          row.amount = mock.amount;
          row.paymentMethod = null; // mock doesn't carry this
          row.referenceNo = null;
          row.notes = mock.notes ?? null;
          row.paymentDate = new Date(mock.paymentDate);
          row.pushStatus = mock.syncStatus;
          row.syncAttempts = 0;
        });
      }).filter((c): c is NonNullable<typeof c> => c !== null);
      await database.batch(...paymentCreates);
    });

    log.info('seedBonds: populated', {
      bonds: MOCK_BONDS.length,
      payments: MOCK_BOND_PAYMENTS.length,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    log.error('seedBonds: failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
