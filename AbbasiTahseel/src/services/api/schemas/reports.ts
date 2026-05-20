/**
 * Report Schemas — العباسي تحصيل
 *
 * Validates payloads for the 8+ report endpoints:
 *   /GetRepBalanceHeader, /GetRepBalanceDetails, /GetRepBalanceDetailsByDate,
 *   /GetRepBondsHeader, /GetRepBoxMove, /GetRepBoxMoveDetails,
 *   /GetRepExpenses, /GetRepReadingHeader, /GetAccountBalance,
 *   /GetAccountBalanceInfo, /GetBondPaymentRecordNext, /GetBondRecieptRcordNext,
 *   /GetListUserPlaces, /report1.
 *
 * The legacy backend returns a free-form array of rows for most reports.
 * Rather than over-validate (and risk breaking when the backend evolves),
 * we accept any object with string-keyed scalar values — the report screens
 * render them as data tables.
 */

import { z } from 'zod';

import { zEnvelope } from './common';

// A "row" is a flat object: { col1: scalar, col2: scalar, ... }
const ScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const ReportRowSchema = z.record(z.string(), ScalarSchema);
export type ReportRow = z.infer<typeof ReportRowSchema>;

export const ReportListResponseSchema = z.union([
  z.array(ReportRowSchema),
  zEnvelope(z.array(ReportRowSchema)),
]);
export type ReportListResponse = z.infer<typeof ReportListResponseSchema>;

// Single balance payload (numeric/string fields tolerated)
export const AccountBalanceResponseSchema = z.union([
  ReportRowSchema,
  zEnvelope(ReportRowSchema),
]);
export type AccountBalanceResponse = z.infer<typeof AccountBalanceResponseSchema>;
