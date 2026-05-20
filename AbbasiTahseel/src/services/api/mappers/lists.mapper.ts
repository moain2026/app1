/**
 * List Mappers — العباسي تحصيل
 *
 * Convert reference-data DTOs into clean domain models.
 * Used by the sync engine when pulling from the server into WatermelonDB.
 */

import { z } from 'zod';

import {
  AccountDtoSchema,
  AccountListResponseSchema,
  BondDtoSchema,
  BondListResponseSchema,
  BondPaymentDtoSchema,
  BondPaymentListResponseSchema,
  CompanyDataResponseSchema,
  CompanyInfoDtoSchema,
  CurrencyDtoSchema,
  CurrencyListResponseSchema,
  PlaceDtoSchema,
  PlaceListResponseSchema,
  TGroupDtoSchema,
  TGroupListResponseSchema,
  TblhDtoSchema,
  TblhListResponseSchema,
  UserDtoSchema,
  UserListResponseSchema,
} from '../schemas/lists';

// ─── Generic envelope-unwrapper ───────────────────────────────────────────

/**
 * Unwrap either a bare array or a `{ data: [...] }` envelope.
 * `itemSchema` re-validates each item defensively.
 */
function unwrapList<T extends z.ZodTypeAny>(
  responseSchema: z.ZodTypeAny,
  itemSchema: T,
  raw: unknown,
): z.infer<T>[] {
  const parsed = responseSchema.parse(raw) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : (parsed as { data: unknown }).data;
  return z.array(itemSchema).parse(list);
}

// ═══════════════════════════════════════════════════════════════════════════
// Company info
// ═══════════════════════════════════════════════════════════════════════════

export interface CompanyInfoDomain {
  remoteId: number | null;
  nameAr: string;
  nameEn: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  footerText: string | null;
}

export function parseCompanyInfo(raw: unknown): CompanyInfoDomain {
  const parsed = CompanyDataResponseSchema.parse(raw);
  const dto =
    'data' in (parsed as object) && (parsed as { data: unknown }).data
      ? CompanyInfoDtoSchema.parse((parsed as { data: unknown }).data)
      : CompanyInfoDtoSchema.parse(parsed);
  return {
    remoteId: dto.id ?? null,
    nameAr: dto.name_ar ?? 'شركة العباسي لتوليد الكهرباء التجارية',
    nameEn: dto.name_en ?? null,
    phone: dto.phone ?? null,
    address: dto.address ?? null,
    logoUrl: dto.logo ?? null,
    footerText: dto.footer ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Account
// ═══════════════════════════════════════════════════════════════════════════

export interface AccountDomain {
  remoteId: number;
  code: string;
  name: string;
  nameEn: string | null;
  balance: number;
  currencyId: number | null;
  phone: string | null;
  address: string | null;
}

export function parseAccountList(raw: unknown): AccountDomain[] {
  return unwrapList(AccountListResponseSchema, AccountDtoSchema, raw).map(
    (dto): AccountDomain => ({
      remoteId: dto.id,
      code: dto.code,
      name: dto.name,
      nameEn: dto.name_en ?? null,
      balance: dto.balance,
      currencyId: dto.currency_id ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Place
// ═══════════════════════════════════════════════════════════════════════════

export interface PlaceDomain {
  remoteId: number;
  code: string | null;
  name: string;
  parentId: number | null;
}

export function parsePlaceList(raw: unknown): PlaceDomain[] {
  return unwrapList(PlaceListResponseSchema, PlaceDtoSchema, raw).map(
    (dto): PlaceDomain => ({
      remoteId: dto.id,
      code: dto.code ?? null,
      name: dto.name,
      parentId: dto.parent_id ?? null,
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TGroup
// ═══════════════════════════════════════════════════════════════════════════

export interface TGroupDomain {
  remoteId: number;
  code: string | null;
  name: string;
  placeId: number | null;
}

export function parseTGroupList(raw: unknown): TGroupDomain[] {
  return unwrapList(TGroupListResponseSchema, TGroupDtoSchema, raw).map(
    (dto): TGroupDomain => ({
      remoteId: dto.id,
      code: dto.code ?? null,
      name: dto.name,
      placeId: dto.place_id ?? null,
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tblh
// ═══════════════════════════════════════════════════════════════════════════

export interface TblhDomain {
  remoteId: number;
  code: string | null;
  name: string;
  groupId: number | null;
  placeId: number | null;
}

export function parseTblhList(raw: unknown): TblhDomain[] {
  return unwrapList(TblhListResponseSchema, TblhDtoSchema, raw).map(
    (dto): TblhDomain => ({
      remoteId: dto.id,
      code: dto.code ?? null,
      name: dto.name,
      groupId: dto.group_id ?? null,
      placeId: dto.place_id ?? null,
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// User
// ═══════════════════════════════════════════════════════════════════════════

export interface UserListDomain {
  remoteId: number;
  username: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  de: boolean;
  ed: boolean;
  rep: boolean;
  sK: boolean;
  sS: boolean;
  sys: boolean;
  noa: number;
  nou: number;
}

export function parseUserList(raw: unknown): UserListDomain[] {
  return unwrapList(UserListResponseSchema, UserDtoSchema, raw).map(
    (dto): UserListDomain => ({
      remoteId: dto.id,
      username: dto.username,
      fullName: dto.name ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      de: dto.DE,
      ed: dto.ED,
      rep: dto.REP,
      sK: dto.S_K,
      sS: dto.S_S,
      sys: dto.SYS,
      noa: dto.NOA,
      nou: dto.NOU,
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Currency
// ═══════════════════════════════════════════════════════════════════════════

export interface CurrencyDomain {
  remoteId: number;
  code: string;
  name: string;
  symbol: string | null;
  exchangeRate: number;
  isDefault: boolean;
}

export function parseCurrencyList(raw: unknown): CurrencyDomain[] {
  return unwrapList(CurrencyListResponseSchema, CurrencyDtoSchema, raw).map(
    (dto): CurrencyDomain => ({
      remoteId: dto.id,
      code: dto.code,
      name: dto.name,
      symbol: dto.symbol ?? null,
      exchangeRate: dto.exchange_rate,
      isDefault: dto.is_default,
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Bond
// ═══════════════════════════════════════════════════════════════════════════

export interface BondDomain {
  remoteId: number;
  bondNo: number;
  bondType: string;
  accountId: number | null;
  accountName: string | null;
  currencyId: number | null;
  amount: number;
  amountPaid: number;
  notes: string | null;
  bondDate: Date | null;
}

function parseLooseDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseBondList(raw: unknown): BondDomain[] {
  return unwrapList(BondListResponseSchema, BondDtoSchema, raw).map(
    (dto): BondDomain => ({
      remoteId: dto.id,
      bondNo: dto.bond_no,
      bondType: dto.bond_type,
      accountId: dto.account_id ?? null,
      accountName: dto.account_name ?? null,
      currencyId: dto.currency_id ?? null,
      amount: dto.amount,
      amountPaid: dto.amount_paid,
      notes: dto.notes ?? null,
      bondDate: parseLooseDate(dto.bond_date),
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Bond payment
// ═══════════════════════════════════════════════════════════════════════════

export interface BondPaymentDomain {
  remoteId: number;
  bondRemoteId: number;
  bondNo: number;
  amount: number;
  paymentMethod: string | null;
  referenceNo: string | null;
  notes: string | null;
  paymentDate: Date | null;
}

export function parseBondPaymentList(raw: unknown): BondPaymentDomain[] {
  return unwrapList(BondPaymentListResponseSchema, BondPaymentDtoSchema, raw).map(
    (dto): BondPaymentDomain => ({
      remoteId: dto.id,
      bondRemoteId: dto.bond_id,
      bondNo: dto.bond_no,
      amount: dto.amount,
      paymentMethod: dto.payment_method ?? null,
      referenceNo: dto.reference_no ?? null,
      notes: dto.notes ?? null,
      paymentDate: parseLooseDate(dto.payment_date),
    }),
  );
}
