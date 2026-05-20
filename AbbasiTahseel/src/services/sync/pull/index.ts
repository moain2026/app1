/**
 * Pull Handlers Registry — العباسي تحصيل
 *
 * Ordered list of pull handlers. The coordinator runs them sequentially on
 * a full sync — reference data first (so readings/bonds can resolve FKs),
 * then collector-owned data.
 *
 * To skip a handler in a partial sync, pass an `only` array to the
 * coordinator's `pull()` call.
 */

import type { PullEntityKey, PullHandler } from '../types';
import { readingPullHandler } from './readingPullHandler';
import {
  accountPullHandler,
  bondPaymentPullHandler,
  bondPullHandler,
  companyPullHandler,
  currencyPullHandler,
  groupPullHandler,
  placePullHandler,
  userPullHandler,
} from './referencePullHandlers';

/**
 * Ordered registry. The order matters: reference data MUST come first so
 * downstream handlers can resolve foreign keys (e.g. a Place must exist
 * before a Reading that references it).
 */
export const PULL_HANDLERS: readonly PullHandler[] = [
  companyPullHandler,
  currencyPullHandler,
  placePullHandler,
  groupPullHandler, // also handles tblh
  accountPullHandler,
  userPullHandler,
  readingPullHandler,
  bondPullHandler,
  bondPaymentPullHandler,
];

/** Lookup a single handler by entity key. */
export function getPullHandler(entity: PullEntityKey): PullHandler | undefined {
  return PULL_HANDLERS.find(h => h.entity === entity);
}

export {
  accountPullHandler,
  bondPaymentPullHandler,
  bondPullHandler,
  companyPullHandler,
  currencyPullHandler,
  groupPullHandler,
  placePullHandler,
  readingPullHandler,
  userPullHandler,
};
