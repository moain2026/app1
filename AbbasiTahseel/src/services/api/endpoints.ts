/**
 * API Endpoints — العباسي تحصيل
 *
 * Centralized, typed registry of all 31 endpoints extracted from
 * ApiService.java (the legacy Retrofit interface).
 *
 * Rules:
 *  • Paths are RELATIVE (resolved against axios `baseURL` which is
 *    "<scheme>://<ip>:<port>/electric/" — see prefs.getBaseUrl()).
 *  • The `HttpMethod` and `requiresAuth` flags drive interceptor behavior.
 *  • The `legacyContentType` flag tracks endpoints that the old server
 *    expects as form-urlencoded vs. JSON.
 *
 * ANY new endpoint MUST be registered here. Do not call paths inline.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ContentType =
  | 'application/json'
  | 'application/x-www-form-urlencoded';

export interface EndpointDescriptor {
  /** Relative path (no leading slash). */
  path: string;
  /** HTTP verb. */
  method: HttpMethod;
  /** Whether the request needs a Bearer token. */
  requiresAuth: boolean;
  /** Wire content-type expected by the legacy server. */
  contentType: ContentType;
  /** Free-form description (for docs / Sync Dashboard). */
  description: string;
}

// ─── Helper builders ──────────────────────────────────────────────────────
const json = (
  path: string,
  method: HttpMethod,
  description: string,
  requiresAuth = true,
): EndpointDescriptor => ({
  path,
  method,
  requiresAuth,
  contentType: 'application/json',
  description,
});

const form = (
  path: string,
  method: HttpMethod,
  description: string,
  requiresAuth = false,
): EndpointDescriptor => ({
  path,
  method,
  requiresAuth,
  contentType: 'application/x-www-form-urlencoded',
  description,
});

// ─── The registry ─────────────────────────────────────────────────────────
export const Endpoints = {
  // ─── Auth ───────────────────────────────────────────────────────────────
  login: form('login', 'POST', 'تسجيل دخول (form-urlencoded)', false),
  userAuth: json('UserAuth', 'POST', 'مصادقة المستخدم (JSON)', false),
  refresh: form('refresh', 'POST', 'تجديد التوكن', false),
  register: form('register', 'POST', 'تسجيل مستخدم جديد', false),

  // ─── Reference data ─────────────────────────────────────────────────────
  getCompanyData: json('GetCompanyData', 'GET', 'بيانات الشركة (للطباعة)'),
  getListAccounts: json('GetListAccounts', 'GET', 'قائمة الحسابات'),
  getListUsers: json('GetListUsers', 'GET', 'قائمة المستخدمين'),
  getListUserPlaces: json('GetListUserPlaces', 'GET', 'مناطق المستخدم'),
  getListPlaces: json('GetListPlaces', 'GET', 'قائمة المناطق'),
  getListGroup: json('GetListGroup', 'GET', 'قائمة المجموعات والتابلات'),
  getListCurrency: json('GetListCurrency', 'GET', 'العملات'),

  // ─── Readings ───────────────────────────────────────────────────────────
  getListReadingCounter: json('GetListReadingCounter', 'GET', 'قراءات العدادات'),
  saveReading: json('SaveReading', 'POST', 'حفظ قراءة (JSON @Body)'),
  updateReading: json('UpdateReading', 'POST', 'تحديث قراءة'),
  deleteReading: json('DeleteReading', 'DELETE', 'حذف قراءة'),

  // ─── Bonds ──────────────────────────────────────────────────────────────
  getListBonds: json('GetListBonds', 'GET', 'السندات'),
  getListBondsPayment: json('GetListBondsPayment', 'GET', 'مدفوعات السندات'),
  getBondPaymentRecordNext: json(
    'GetBondPaymentRecordNext',
    'GET',
    'الرقم التالي لسند الدفع',
  ),
  getBondReceiptRecordNext: json(
    'GetBondRecieptRcordNext', // sic — legacy typo preserved
    'GET',
    'الرقم التالي لسند القبض',
  ),

  // ─── Balance ────────────────────────────────────────────────────────────
  getAccountBalance: json('GetAccountBalance', 'GET', 'رصيد حساب'),
  getAccountBalanceInfo: json('GetAccountBalanceInfo', 'GET', 'تفاصيل رصيد حساب'),

  // ─── Reports ────────────────────────────────────────────────────────────
  getRepBalanceHeader: json('GetRepBalanceHeader', 'GET', 'تقرير: ميزان عام'),
  getRepBalanceDetails: json(
    'GetRepBalanceDetails',
    'GET',
    'تقرير: تفاصيل الميزان',
  ),
  getRepBalanceDetailsByDate: json(
    'GetRepBalanceDetailsByDate',
    'GET',
    'تقرير: تفاصيل الميزان بتاريخ',
  ),
  getRepBondsHeader: json('GetRepBondsHeader', 'GET', 'تقرير: السندات'),
  getRepBoxMove: json('GetRepBoxMove', 'GET', 'تقرير: حركة الصندوق'),
  getRepBoxMoveDetails: json(
    'GetRepBoxMoveDetails',
    'GET',
    'تقرير: تفاصيل حركة الصندوق',
  ),
  getRepExpenses: json('GetRepExpenses', 'GET', 'تقرير: المصروفات'),
  getRepReadingHeader: json('GetRepReadingHeader', 'GET', 'تقرير: القراءات'),
  report1: json('report1', 'GET', 'تقرير: إضافي #1'),

  // ─── Posts (legacy GetRepBalanceHeader aliased) ─────────────────────────
  posts: json('GetRepBalanceHeader', 'GET', 'تقرير: ميزان عام (بديل)'),
} as const;

export type EndpointKey = keyof typeof Endpoints;

/**
 * Type guard / lookup helper.
 */
export function getEndpoint(key: EndpointKey): EndpointDescriptor {
  return Endpoints[key];
}

/**
 * Total number of registered endpoints — useful for the Sync Dashboard
 * and for sanity checks in tests.
 */
export const ENDPOINT_COUNT = Object.keys(Endpoints).length;
