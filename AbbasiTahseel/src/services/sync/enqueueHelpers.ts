/**
 * Enqueue Helpers — العباسي تحصيل
 *
 * High-level wrappers that the feature layer (Phases 7-8) will call from
 * "Save Reading" / "Save Bond" handlers. They:
 *   1. Wrap the raw enqueue() call with the correct payload shape.
 *   2. Mark the target entity row as `dirty` so the UI shows the pending
 *      state immediately.
 *   3. Optionally trigger a `pushOnly('after_write')` so the upload starts
 *      ASAP if the device is online.
 *
 * Usage example (from a Reading screen):
 *   await enqueueReadingUpdate(reading);
 *   // No need to await pushOnly — fire-and-forget is fine.
 */

import { Q } from '@nozbe/watermelondb';

import { database } from '../../database';
import type { Bond } from '../../database/models/Bond';
import type { BondPayment } from '../../database/models/BondPayment';
import type { Reading } from '../../database/models/Reading';
import { logger } from '../../utils/logger';
import { readingToDto, type ReadingDomain } from '../api/mappers/reading.mapper';

import type {
  BondPaymentPushPayload,
  BondPushPayload,
  ReadingPushPayload,
} from './push';
import { enqueue } from './syncQueue';
import { pushOnly } from './syncCoordinator';

const log = logger.scope('EnqueueHelpers');

// ─── Reading helpers ──────────────────────────────────────────────────────

/**
 * Enqueue a reading save (create or update).
 *
 * Side-effects:
 *   • Marks the target Reading row as `pushStatus = 'dirty'`.
 *   • Builds the wire payload via `readingToDto` to guarantee legacy field
 *     names (noadad, ks, kh, …).
 *   • Fire-and-forget `pushOnly('after_write')` to attempt an immediate upload.
 */
export async function enqueueReadingSave(
  reading: Reading,
  domain: ReadingDomain,
  options: { triggerPush?: boolean } = {},
): Promise<void> {
  const dto = readingToDto(domain);
  const payload: ReadingPushPayload = {
    local_uuid: reading.localUuid,
    remote_id: reading.remoteId ?? null,
    dto,
  };

  await database.write(async () => {
    await reading.update(row => {
      row.pushStatus = 'dirty';
      row.lastError = null;
    });
  });

  await enqueue<ReadingPushPayload>({
    entityType: 'reading',
    entityLocalId: reading.id,
    entityLocalUuid: reading.localUuid,
    operation: reading.remoteId != null ? 'update' : 'create',
    payload,
    priority: 5, // readings are user-priority by default
  });

  log.debug('reading enqueued', { uuid: reading.localUuid });

  if (options.triggerPush !== false) {
    // Fire-and-forget. We don't await because the user just tapped Save and
    // shouldn't wait for the network round-trip to see the next screen.
    void pushOnly('after_write').catch(err => {
      log.warn('after_write push failed', { err: (err as Error).message });
    });
  }
}

export async function enqueueReadingDelete(
  reading: Reading,
  options: { triggerPush?: boolean } = {},
): Promise<void> {
  const domain: ReadingDomain = {
    num: reading.num,
    meterNumber: reading.noadad,
    customerName: reading.name,
    customerAlias: reading.namet ?? null,
    meterType: reading.ind,
    receiverArea: reading.nomstlm,
    bookNumber: reading.notblh,
    groupNumber: reading.nog,
    previousReading: reading.ks,
    currentReading: reading.kh ?? null,
    postingStatus: reading.cas,
    expectedConsumption: reading.asts,
    isPosted: reading.cas !== 0,
    actualConsumption: reading.kh == null ? null : reading.kh - reading.ks,
  };
  const payload: ReadingPushPayload = {
    local_uuid: reading.localUuid,
    remote_id: reading.remoteId ?? null,
    dto: readingToDto(domain),
  };

  await database.write(async () => {
    await reading.update(row => {
      row.pushStatus = 'dirty';
    });
  });

  await enqueue<ReadingPushPayload>({
    entityType: 'reading',
    entityLocalId: reading.id,
    entityLocalUuid: reading.localUuid,
    operation: 'delete',
    payload,
    priority: 5,
  });

  if (options.triggerPush !== false) {
    void pushOnly('after_write');
  }
}

// ─── Bond helpers ─────────────────────────────────────────────────────────

export async function enqueueBondSave(
  bond: Bond,
  options: { triggerPush?: boolean } = {},
): Promise<void> {
  const payload: BondPushPayload = {
    local_uuid: bond.localUuid,
    remote_id: bond.remoteId ?? null,
    bond: {
      bond_no: bond.bondNo,
      bond_type: bond.bondType as 'receipt' | 'payment',
      account_id: bond.accountId ?? null,
      account_name: bond.accountName ?? null,
      currency_id: bond.currencyId ?? null,
      amount: bond.amount,
      amount_paid: bond.amountPaid,
      notes: bond.notes ?? null,
      bond_date: bond.bondDate.toISOString(),
    },
  };

  await database.write(async () => {
    await bond.update(row => {
      row.pushStatus = 'dirty';
    });
  });

  await enqueue<BondPushPayload>({
    entityType: 'bond',
    entityLocalId: bond.id,
    entityLocalUuid: bond.localUuid,
    operation: bond.remoteId != null ? 'update' : 'create',
    payload,
    priority: 5,
  });

  log.debug('bond enqueued', { uuid: bond.localUuid });
  if (options.triggerPush !== false) {
    void pushOnly('after_write');
  }
}

export async function enqueueBondPaymentSave(
  payment: BondPayment,
  options: { triggerPush?: boolean } = {},
): Promise<void> {
  const payload: BondPaymentPushPayload = {
    local_uuid: payment.localUuid,
    remote_id: payment.remoteId ?? null,
    payment: {
      bond_no: payment.bondNo,
      amount: payment.amount,
      payment_method: payment.paymentMethod ?? null,
      reference_no: payment.referenceNo ?? null,
      notes: payment.notes ?? null,
      payment_date: payment.paymentDate.toISOString(),
    },
  };

  await database.write(async () => {
    await payment.update(row => {
      row.pushStatus = 'dirty';
    });
  });

  await enqueue<BondPaymentPushPayload>({
    entityType: 'bond_payment',
    entityLocalId: payment.id,
    entityLocalUuid: payment.localUuid,
    operation: payment.remoteId != null ? 'update' : 'create',
    payload,
    priority: 5,
  });

  log.debug('bond payment enqueued', { uuid: payment.localUuid });
  if (options.triggerPush !== false) {
    void pushOnly('after_write');
  }
}

// ─── Bulk helpers (for "sync all dirty" buttons in the dashboard) ─────────

/**
 * Re-enqueue ALL `dirty` readings — useful after a long offline session
 * where users tapped Save but the device never connected.
 */
export async function reenqueueAllDirtyReadings(): Promise<number> {
  const collection = database.collections.get<Reading>('readings');
  const dirties = await collection.query(Q.where('sync_status', 'dirty')).fetch();
  let count = 0;
  for (const r of dirties) {
    try {
      const domain: ReadingDomain = {
        num: r.num,
        meterNumber: r.noadad,
        customerName: r.name,
        customerAlias: r.namet ?? null,
        meterType: r.ind,
        receiverArea: r.nomstlm,
        bookNumber: r.notblh,
        groupNumber: r.nog,
        previousReading: r.ks,
        currentReading: r.kh ?? null,
        postingStatus: r.cas,
        expectedConsumption: r.asts,
        isPosted: r.cas !== 0,
        actualConsumption: r.kh == null ? null : r.kh - r.ks,
      };
      await enqueueReadingSave(r, domain, { triggerPush: false });
      count += 1;
    } catch (err) {
      log.warn('reenqueue failed', { uuid: r.localUuid, err: (err as Error).message });
    }
  }
  log.info('reenqueued dirty readings', { count });
  if (count > 0) {
    void pushOnly('manual');
  }
  return count;
}
