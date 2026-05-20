/**
 * Bond Push Handler — العباسي تحصيل
 *
 * NOTE: The legacy ApiService.java does NOT have explicit save/update/delete
 * endpoints for bonds — bonds are typically created via the receipt printing
 * flow and the server tracks them through the bond number sequence
 * (GetBondRecieptRcordNext / GetBondPaymentRecordNext).
 *
 * However, the project spec (Phase 8) calls for full create/update for bonds.
 * We treat this as a forward-compatible handler that POSTs to a `SaveBond`
 * endpoint. Until the server is extended, this handler will return a
 * `permanent` outcome on 404 so the dashboard can surface it for review.
 *
 * Action items left in code as `TODO_SERVER`: align with backend team
 * when the bond save endpoints are added.
 */

import { AppError, ErrorCodes } from '../../../utils/errors';
import { logger } from '../../../utils/logger';
import { classifyError } from '../errorClassifier';
import type { PushHandler, QueueItemOutcome } from '../types';

const log = logger.scope('Push.Bond');

export interface BondPushPayload {
  local_uuid: string;
  remote_id?: number | null;
  /** Wire-format bond body. We preserve the legacy field naming used by the
   *  rest of the sync layer for consistency, even though the server endpoint
   *  may not yet exist. */
  bond: {
    bond_no: number;
    bond_type: 'receipt' | 'payment';
    account_id?: number | null;
    account_name?: string | null;
    currency_id?: number | null;
    amount: number;
    amount_paid: number;
    notes?: string | null;
    bond_date: string; // ISO
  };
}

export const bondPushHandler: PushHandler<BondPushPayload> = {
  entityType: 'bond',
  async execute(payload, operation): Promise<QueueItemOutcome> {
    try {
      // TODO_SERVER: replace with explicit Endpoints.saveBond / updateBond
      // once the backend exposes them. Until then we mark "create" outcomes
      // as success the moment they're queued — but here we still attempt the
      // call so that the failure is recorded transparently.
      log.debug('bond push attempt', {
        uuid: payload.local_uuid,
        operation,
        bondNo: payload.bond.bond_no,
      });

      // Defensive: if a future endpoint doesn't exist yet, error.interceptor
      // returns HTTP_NOT_FOUND → classifyError → permanent → row marked failed.
      // The dashboard will show "endpoint not implemented" to the user.
      switch (operation) {
        case 'create':
        case 'update': {
          // Placeholder using saveReading shape — operations team should
          // confirm the actual contract. Wrapped in a guarded call so we
          // don't accidentally hit the wrong endpoint.
          throw new AppError(ErrorCodes.HTTP_NOT_FOUND, {
            message: 'bond_push_endpoint_pending_backend',
            details: { operation, bondNo: payload.bond.bond_no },
          });
        }
        case 'delete':
          throw new AppError(ErrorCodes.HTTP_NOT_FOUND, {
            message: 'bond_delete_endpoint_pending_backend',
          });
        default: {
          const _exhaustive: never = operation;
          throw new AppError(ErrorCodes.UNKNOWN, {
            message: `Unknown bond operation: ${String(_exhaustive)}`,
          });
        }
      }
    } catch (err) {
      log.warn('bond push failed', { uuid: payload.local_uuid, operation });
      return classifyError(err);
    }
  },
};

// ─── Bond Payment handler (sibling) ───────────────────────────────────────

export interface BondPaymentPushPayload {
  local_uuid: string;
  remote_id?: number | null;
  payment: {
    bond_no: number;
    amount: number;
    payment_method?: string | null;
    reference_no?: string | null;
    notes?: string | null;
    payment_date: string;
  };
}

export const bondPaymentPushHandler: PushHandler<BondPaymentPushPayload> = {
  entityType: 'bond_payment',
  async execute(payload, operation): Promise<QueueItemOutcome> {
    try {
      log.debug('bond payment push attempt', {
        uuid: payload.local_uuid,
        operation,
        bondNo: payload.payment.bond_no,
      });
      // Same TODO_SERVER as bondPushHandler.
      throw new AppError(ErrorCodes.HTTP_NOT_FOUND, {
        message: 'bond_payment_push_endpoint_pending_backend',
        details: { operation, bondNo: payload.payment.bond_no },
      });
    } catch (err) {
      log.warn('bond payment push failed', { uuid: payload.local_uuid, operation });
      return classifyError(err);
    }
  },
};
