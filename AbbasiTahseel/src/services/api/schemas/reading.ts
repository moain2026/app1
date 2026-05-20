/**
 * Reading Schemas — العباسي تحصيل
 *
 * Validates payloads for:
 *   GET    /GetListReadingCounter   → ReadingResponse  (array of ItemReading)
 *   POST   /SaveReading             → { success } (with @Body ItemReading)
 *   POST   /UpdateReading           → { success }
 *   DELETE /DeleteReading           → { success }
 *
 * Mirrors ItemReading.java field-for-field. Legacy field names (`noadad`,
 * `ks`, `kh`, `asts`, `cas`, `nomstlm`, `notblh`, `nog`, `ind`) are kept
 * verbatim — this is the wire format expected by the server.
 */

import { z } from 'zod';

import { zEnvelope, zIntLoose, zNumberLoose, zStringOrEmpty } from './common';

// ─── Wire format: a single ItemReading row ────────────────────────────────
export const ItemReadingDtoSchema = z.object({
  // Identity / sequencing
  num: zIntLoose,
  noadad: z.preprocess(
    v => (v == null ? undefined : String(v)),
    z.string().min(1),
  ),

  // Identity (customer)
  name: zStringOrEmpty.default(''),
  namet: zStringOrEmpty.optional(),

  // Classification
  ind: zIntLoose.default(0),
  nomstlm: zIntLoose.default(0),
  notblh: zIntLoose.default(0),
  nog: zIntLoose.default(0),

  // Readings
  ks: zNumberLoose.default(0),
  kh: zNumberLoose.optional(), // null/missing = not yet read

  // Status
  cas: zIntLoose.default(0), // 0 = unposted, != 0 = posted
  asts: zNumberLoose.default(0),
});

export type ItemReadingDto = z.infer<typeof ItemReadingDtoSchema>;

// ─── Responses ────────────────────────────────────────────────────────────

/**
 * GetListReadingCounter — legacy may return either:
 *   • a bare array of ItemReading
 *   • or { success, data: [...] } envelope
 *
 * We accept both via a union; the mapper layer normalizes.
 */
export const ReadingListResponseSchema = z.union([
  z.array(ItemReadingDtoSchema),
  zEnvelope(z.array(ItemReadingDtoSchema)),
]);

export type ReadingListResponse = z.infer<typeof ReadingListResponseSchema>;

/**
 * SaveReading / UpdateReading / DeleteReading — legacy returns either
 * a bare object or an envelope. We extract `success` defensively.
 */
export const ReadingMutationResponseSchema = z.union([
  z.object({
    success: z.union([z.boolean(), z.string(), z.number()]).optional(),
    num: zIntLoose.optional(),
    message: zStringOrEmpty.optional(),
  }),
  z.array(z.unknown()), // sometimes empty array on success
]);

export type ReadingMutationResponse = z.infer<typeof ReadingMutationResponseSchema>;
