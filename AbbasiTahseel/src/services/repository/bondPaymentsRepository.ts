/**
 * BondPayments Repository — العباسي تحصيل (Wave 6-Β)
 *
 * Read-only API around the `bond_payments` collection. Used by
 * `BondDetailScreen` to display the payment ledger for a single bond,
 * sorted oldest-first (matches how the user enters them).
 *
 * Write paths (create / void) are deliberately omitted for Wave 6-Β —
 * the bond mutation contract has not been finalized yet (waiting on the
 * WCF Help dump for `SaveBondPayment` shape). `BondPaymentFormScreen`
 * therefore remains on its MOCK data path until Wave 6-Γ.
 */

import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';

import { database } from '@/database';
import type { BondPayment } from '@/database/models/BondPayment';

/**
 * Reactive list of payments belonging to a single bond.
 *
 * `bondLocalId` is the WatermelonDB-local string id of the parent bond
 * (NOT the `local_uuid` legacy key). `BondDetailScreen` passes
 * `bond.id` which is exactly that.
 */
export function observePaymentsByBond(
  bondLocalId: string,
): Observable<BondPayment[]> {
  return database.collections
    .get<BondPayment>('bond_payments')
    .query(Q.where('bond_id', bondLocalId), Q.sortBy('payment_date', Q.asc))
    .observe();
}

/**
 * One-shot fetch — used by the receipt printer (Wave 6-Γ will read the
 * frozen payment list at print time).
 */
export async function fetchPaymentsByBond(
  bondLocalId: string,
): Promise<BondPayment[]> {
  return database.collections
    .get<BondPayment>('bond_payments')
    .query(Q.where('bond_id', bondLocalId), Q.sortBy('payment_date', Q.asc))
    .fetch();
}
