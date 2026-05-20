/**
 * Reading Mapper — العباسي تحصيل
 *
 * Translates between:
 *   • Wire format    — ItemReadingDto (legacy field names: noadad, ks, kh...)
 *   • Domain model   — ReadingDomain (clean names: meterNumber, previousReading...)
 *   • DB row shape   — what we hand to WatermelonDB (legacy names again — DB
 *                      schema mirrors the wire format per ADR-002)
 *
 * Why three shapes?
 *   • Wire ↔ DB:    keep names identical, no translation needed at sync.
 *   • DB ↔ Domain:  the Reading WatermelonDB Model already exposes clean
 *                   getters; this mapper produces a plain object for callers
 *                   that need a snapshot detached from WatermelonDB.
 *
 * IMPORTANT:
 *   Outbound (toWire): we MUST send legacy field names so the old backend
 *   accepts the payload without changes. The mapper guarantees that contract.
 */

import { z } from 'zod';

import {
  ItemReadingDtoSchema,
  ReadingListResponseSchema,
  type ItemReadingDto,
  type ReadingListResponse,
} from '../schemas/reading';

// ─── Domain model (clean, UI-facing) ──────────────────────────────────────
export interface ReadingDomain {
  /** Backend `num` — sequence number (also the remote id for some endpoints). */
  num: number;

  /** Backend `noadad`. */
  meterNumber: string;

  /** Backend `name`. */
  customerName: string;

  /** Backend `namet`. */
  customerAlias: string | null;

  /** Backend `ind`. */
  meterType: number;

  /** Backend `nomstlm`. */
  receiverArea: number;

  /** Backend `notblh`. */
  bookNumber: number;

  /** Backend `nog`. */
  groupNumber: number;

  /** Backend `ks` — previous reading. */
  previousReading: number;

  /** Backend `kh` — current reading. null when not yet read. */
  currentReading: number | null;

  /** Backend `cas` — posting status (0 = unposted). */
  postingStatus: number;

  /** Backend `asts` — expected consumption. */
  expectedConsumption: number;

  /** True when `cas != 0`. Convenience flag. */
  isPosted: boolean;

  /** kh - ks, or null if kh is missing. */
  actualConsumption: number | null;
}

// ─── Inbound: wire → domain ───────────────────────────────────────────────

/**
 * Convert a validated DTO to the clean domain model.
 * Caller must have parsed via ItemReadingDtoSchema first.
 */
export function readingFromDto(dto: ItemReadingDto): ReadingDomain {
  const kh = dto.kh == null ? null : dto.kh;
  return {
    num: dto.num,
    meterNumber: dto.noadad,
    customerName: dto.name ?? '',
    customerAlias: dto.namet ?? null,
    meterType: dto.ind,
    receiverArea: dto.nomstlm,
    bookNumber: dto.notblh,
    groupNumber: dto.nog,
    previousReading: dto.ks,
    currentReading: kh,
    postingStatus: dto.cas,
    expectedConsumption: dto.asts,
    isPosted: dto.cas !== 0,
    actualConsumption: kh == null ? null : kh - dto.ks,
  };
}

// ─── Outbound: domain → wire ──────────────────────────────────────────────

/**
 * Convert a domain object back to the legacy wire shape.
 * Used by SaveReading / UpdateReading.
 *
 * CRITICAL: the field names below must EXACTLY match the legacy backend's
 * expectations. Do NOT rename to camelCase.
 */
export function readingToDto(domain: ReadingDomain): ItemReadingDto {
  return {
    num: domain.num,
    noadad: domain.meterNumber,
    name: domain.customerName,
    namet: domain.customerAlias ?? undefined,
    ind: domain.meterType,
    nomstlm: domain.receiverArea,
    notblh: domain.bookNumber,
    nog: domain.groupNumber,
    ks: domain.previousReading,
    kh: domain.currentReading ?? undefined,
    cas: domain.postingStatus,
    asts: domain.expectedConsumption,
  };
}

// ─── DB row shape (what we write into WatermelonDB) ───────────────────────

/**
 * Convert a DTO to a partial DB row.
 *
 * NOTE: This intentionally returns an object with LEGACY field names because
 * our DB schema mirrors the wire format (see schema.ts). The Reading Model
 * has @field('noadad') decorators that map to these names.
 */
export interface ReadingDbRow {
  num: number;
  noadad: string;
  name: string;
  namet: string | null;
  ind: number;
  nomstlm: number;
  notblh: number;
  nog: number;
  ks: number;
  kh: number | null;
  cas: number;
  asts: number;
}

export function readingDtoToDbRow(dto: ItemReadingDto): ReadingDbRow {
  return {
    num: dto.num,
    noadad: dto.noadad,
    name: dto.name ?? '',
    namet: dto.namet ?? null,
    ind: dto.ind,
    nomstlm: dto.nomstlm,
    notblh: dto.notblh,
    nog: dto.nog,
    ks: dto.ks,
    kh: dto.kh ?? null,
    cas: dto.cas,
    asts: dto.asts,
  };
}

// ─── Bulk list normalization ──────────────────────────────────────────────

/**
 * The legacy server returns either a bare array OR a `{ data: [...] }`
 * envelope. This helper unwraps both into a plain array of DTOs.
 *
 * Throws ZodError if validation fails — callers should wrap in
 * `runSafe()` or convert to AppError.VALIDATION_SERVER_RESPONSE.
 */
export function parseReadingList(raw: unknown): ItemReadingDto[] {
  const parsed: ReadingListResponse = ReadingListResponseSchema.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed.data;
  // Re-validate each item as a defensive measure (some legacy rows are dirty).
  return z.array(ItemReadingDtoSchema).parse(list);
}
