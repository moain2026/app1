/**
 * Report Mapper — العباسي تحصيل
 *
 * Reports are intentionally loose — the legacy backend returns arbitrary
 * row shapes per report. We just normalize to a list of rows and let the
 * report screens render columns dynamically.
 */

import { z } from 'zod';

import {
  AccountBalanceResponseSchema,
  ReportListResponseSchema,
  ReportRowSchema,
  type ReportRow,
} from '../schemas/reports';

export function parseReportList(raw: unknown): ReportRow[] {
  const parsed = ReportListResponseSchema.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed.data;
  return z.array(ReportRowSchema).parse(list);
}

export function parseAccountBalance(raw: unknown): ReportRow {
  const parsed = AccountBalanceResponseSchema.parse(raw);
  if (Array.isArray(parsed)) {
    // Edge: a single-row balance returned as 1-element array.
    return ReportRowSchema.parse(parsed[0] ?? {});
  }
  if ('data' in (parsed as object)) {
    return ReportRowSchema.parse((parsed as { data: unknown }).data);
  }
  return ReportRowSchema.parse(parsed);
}
