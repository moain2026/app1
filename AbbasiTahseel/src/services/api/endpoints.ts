/**
 * API Endpoints — العباسي تحصيل
 *
 * Centralized, typed registry of all **34 endpoints** confirmed via the
 * WCF Service Help page at:
 *   http://100.87.131.115:3000/electric/help
 *
 * The previous version of this file was a best-effort extraction from
 * `ApiService.java` (Retrofit) + guesses for bond mutations. The WCF
 * Help page revealed:
 *   • 4 endpoints that **don't exist** on the real backend
 *     (`refresh`, `register`, `userAuth`, `report1`, `posts`, `getListCurrency`).
 *     They are KEPT here marked DEPRECATED so legacy code paths still
 *     compile, but `requiresAuth=false` + `description='DEPRECATED'`.
 *   • 6 new endpoints not in ApiService.java:
 *     `SaveBond` (POST), `UpdateBond` (PUT), `DeleteBond` (DELETE),
 *     `SaveBondPayment` (POST), `UpdateBondPayment` (PUT),
 *     `DeleteBondPayment` (DELETE), `InsertMessage` (POST),
 *     `ReSetPassword` (POST), `GetCompanyInfo` (GET — distinct from
 *     `GetCompanyData`), `test` (GET — health probe).
 *
 * Rules:
 *  • Paths are RELATIVE (resolved against axios `baseURL` which is
 *    "<scheme>://<ip>:<port>/electric/" — see prefs.getBaseUrl()).
 *  • The `HttpMethod` and `requiresAuth` flags drive interceptor behavior.
 *  • The `contentType` flag tracks endpoints that the old server
 *    expects as form-urlencoded vs. JSON.
 *  • ANY new endpoint MUST be registered here. Do NOT call paths inline.
 *
 * Wave 6-Α (UI skeleton) does NOT call any of these — registration only.
 * Wire-up happens in Wave 6-Β / 7+.
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
  /** Marked TRUE if endpoint does NOT exist on the live WCF server. */
  deprecated?: boolean;
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

// NOTE: a form-urlencoded helper used to live here for legacy mutation
// endpoints; the live WCF server accepts JSON for every mutation, so the
// helper was removed (Wave 6-Α). If a future endpoint truly needs
// `application/x-www-form-urlencoded`, reintroduce a `form()` builder.

const deprecated = (
  path: string,
  method: HttpMethod,
  description: string,
): EndpointDescriptor => ({
  path,
  method,
  requiresAuth: false,
  contentType: 'application/json',
  description: `[DEPRECATED — not on WCF] ${description}`,
  deprecated: true,
});

// ─── The registry ─────────────────────────────────────────────────────────
export const Endpoints = {
  // ─── Auth (3 live) ──────────────────────────────────────────────────────
  //
  // 🔑 PRIMARY auth endpoint — `/Authenticate`. POST JSON.
  //   Body: { Password, User, appId } (camelCase appId, Capital P/U)
  //   Response: a raw JSON string (e.g. `"eyJ…"`) — NOT an object.
  authenticate: json(
    'Authenticate',
    'POST',
    'مصادقة WCF رسمية (JSON — رد نصي خام)',
    false,
  ),
  // FALLBACK — POST /electric/Login (Users-object response).
  // Confirmed present on WCF Help. Used by the legacy Java app.
  login: json(
    'Login',
    'POST',
    'تسجيل دخول قديم (JSON — Users response) — fallback',
    false,
  ),
  // POST /electric/ReSetPassword — confirmed on WCF Help (NEW).
  resetPassword: json(
    'ReSetPassword',
    'POST',
    'إعادة تعيين كلمة المرور',
    false,
  ),

  // ─── Reference data (5 live) ────────────────────────────────────────────
  getCompanyData: json('GetCompanyData', 'GET', 'بيانات الشركة (للطباعة)'),
  // NEW (WCF Help): /GetCompanyInfo?appId={APPID} — distinct from GetCompanyData
  getCompanyInfo: json('GetCompanyInfo', 'GET', 'معلومات الشركة الموسعة'),
  getListAccounts: json('GetListAccounts', 'GET', 'قائمة الحسابات'),
  getListUsers: json('GetListUsers', 'GET', 'قائمة المستخدمين'),
  getListUserPlaces: json('GetListUserPlaces', 'GET', 'مناطق المستخدم'),
  getListPlaces: json('GetListPlaces', 'GET', 'قائمة المناطق'),
  getListGroup: json('GetListGroup', 'GET', 'قائمة المجموعات والتابلات'),

  // ─── Readings (1 live — only SaveReading exists on WCF) ─────────────────
  // GET /GetListReadingCounter?id&isnull&notblh&nomstlm&nogroup&appId
  getListReadingCounter: json('GetListReadingCounter', 'GET', 'قراءات العدادات'),
  // POST /SaveReading (JSON @Body ItemReading)
  saveReading: json('SaveReading', 'POST', 'حفظ قراءة (JSON @Body)'),
  //
  // ⚠️ `updateReading` and `deleteReading` were inherited from the legacy
  // Java ApiService.java but the WCF Help dump does NOT list them. They
  // remain registered (deprecated) so the existing readingPushHandler
  // continues to compile. Wave 6-Β must decide:
  //   (a) re-route updates through SaveReading (server-side upsert), OR
  //   (b) introduce the missing endpoints on the backend.
  // Until then, calls will fail at runtime — the queue marks the item
  // as `failed` and surfaces an error to the operator.

  // ─── Bonds (5 live — full CRUD confirmed on WCF) ────────────────────────
  // GET /GetListBonds?num&num_s&sdate&edate&currency&nou&appId
  getListBonds: json('GetListBonds', 'GET', 'السندات (قائمة)'),
  // POST /SaveBond (NEW — confirmed)
  saveBond: json('SaveBond', 'POST', 'حفظ سند جديد'),
  // PUT /UpdateBond?appId&id (NEW — confirmed, PUT not POST)
  updateBond: json('UpdateBond', 'PUT', 'تحديث سند'),
  // DELETE /DeleteBond?appId&id (NEW — confirmed)
  deleteBond: json('DeleteBond', 'DELETE', 'حذف سند'),
  // GET /GetBondRecieptRcordNext?num&appId (sic — legacy typo preserved on server)
  getBondReceiptRecordNext: json(
    'GetBondRecieptRcordNext',
    'GET',
    'الرقم التالي لسند القبض',
  ),

  // ─── Bond Payments (4 live — full CRUD) ─────────────────────────────────
  // GET /GetListBondsPayment?num&num_s&sdate&edate&currency&appId
  getListBondsPayment: json('GetListBondsPayment', 'GET', 'مدفوعات السندات'),
  // POST /SaveBondPayment
  saveBondPayment: json('SaveBondPayment', 'POST', 'حفظ دفعة سند'),
  // PUT /UpdateBondPayment?appId&id
  updateBondPayment: json('UpdateBondPayment', 'PUT', 'تحديث دفعة سند'),
  // DELETE /DeleteBondPayment?appId&id
  deleteBondPayment: json('DeleteBondPayment', 'DELETE', 'حذف دفعة سند'),
  // GET /GetBondPaymentRecordNext?num&appId
  getBondPaymentRecordNext: json(
    'GetBondPaymentRecordNext',
    'GET',
    'الرقم التالي لسند الدفع',
  ),

  // ─── Balance (2 live) ───────────────────────────────────────────────────
  getAccountBalance: json('GetAccountBalance', 'GET', 'رصيد حساب'),
  getAccountBalanceInfo: json('GetAccountBalanceInfo', 'GET', 'تفاصيل رصيد حساب'),

  // ─── Reports (7 live) ───────────────────────────────────────────────────
  // GET /GetRepBalanceHeader?date&currency&num&type&appId
  getRepBalanceHeader: json('GetRepBalanceHeader', 'GET', 'تقرير: ميزان عام'),
  // GET /GetRepBalanceDetailsByDate?num&sdate&edate&currency&appId
  // (NOTE: WCF Help shows only the ByDate variant — not the generic one.)
  getRepBalanceDetailsByDate: json(
    'GetRepBalanceDetailsByDate',
    'GET',
    'تقرير: كشف حساب تفصيلي بتاريخ',
  ),
  // GET /GetRepBondsHeader?num&sdate&edate&currency&appId
  getRepBondsHeader: json('GetRepBondsHeader', 'GET', 'تقرير: السندات'),
  // GET /GetRepBoxMove?sdate&appId
  getRepBoxMove: json('GetRepBoxMove', 'GET', 'تقرير: حركة الصندوق'),
  // GET /GetRepBoxMoveDetails?sdate&num&appId
  getRepBoxMoveDetails: json(
    'GetRepBoxMoveDetails',
    'GET',
    'تقرير: تفاصيل حركة الصندوق',
  ),
  // GET /GetRepExpenses?sdate&appId
  getRepExpenses: json('GetRepExpenses', 'GET', 'تقرير: المصروفات'),
  // GET /GetRepReadingHeader?type&appId
  getRepReadingHeader: json('GetRepReadingHeader', 'GET', 'تقرير: القراءات'),

  // ─── Messaging (1 live) ─────────────────────────────────────────────────
  // POST /InsertMessage (NEW — confirmed on WCF Help, schema TBD)
  insertMessage: json('InsertMessage', 'POST', 'إدراج رسالة'),

  // ─── Health probe (1 live) ──────────────────────────────────────────────
  // GET /test — confirmed on WCF Help. Used by the dev "Test Connection"
  // button in ServerSettingsScreen and Login screen.
  test: json('test', 'GET', 'فحص صحة الخادم', false),

  // ─── DEPRECATED — registered for backward-compat with legacy code paths
  //     but NOT present on the live WCF server (confirmed 2026-05-22). ─────
  /** @deprecated Not on WCF Help. Use `getRepBalanceDetailsByDate` instead. */
  getRepBalanceDetails: deprecated(
    'GetRepBalanceDetails',
    'GET',
    'تقرير: تفاصيل ميزان عام (غير معتمد — استخدم بتاريخ)',
  ),
  /** @deprecated Not on WCF Help. Currencies come embedded in account/bond responses. */
  getListCurrency: deprecated('GetListCurrency', 'GET', 'العملات'),
  /** @deprecated Not on WCF Help. Use `authenticate`. */
  userAuth: deprecated('UserAuth', 'POST', 'مصادقة بديلة'),
  /** @deprecated Not on WCF Help. No refresh-token endpoint exists. */
  refresh: deprecated('refresh', 'POST', 'تجديد التوكن'),
  /** @deprecated Not on WCF Help. No self-registration on this backend. */
  register: deprecated('register', 'POST', 'تسجيل ذاتي'),
  /** @deprecated Not on WCF Help. Was a stray legacy entry. */
  report1: deprecated('report1', 'GET', 'تقرير غامض'),
  /** @deprecated Alias for getRepBalanceHeader — kept for posts.ts compatibility. */
  posts: deprecated('GetRepBalanceHeader', 'GET', 'بديل لميزان عام'),

  /**
   * @deprecated Not on WCF Help. The legacy Java client used a PUT-style
   * UpdateReading; the new WCF only exposes `SaveReading` (assumed to do
   * upsert). Kept here so `readingPushHandler` compiles — Wave 6-Β will
   * either remove the handler branch or wire it through `saveReading`.
   */
  updateReading: deprecated('UpdateReading', 'PUT', 'تحديث قراءة (غير معتمد)'),

  /**
   * @deprecated Not on WCF Help. Kept so the existing `readingPushHandler`
   * delete branch compiles. Wave 6-Β must decide whether the backend will
   * grow a DeleteReading endpoint or whether deletions are soft (flag).
   */
  deleteReading: deprecated(
    'DeleteReading',
    'DELETE',
    'حذف قراءة (غير معتمد)',
  ),
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
 *
 * Breakdown (live / deprecated):
 *   • live      = 27  (auth 3, ref 5, readings 2, bonds 5, payments 4,
 *                       balance 2, reports 7, messaging 1, test 1)
 *   • deprecated= 9   (refresh, register, userAuth, getRepBalanceDetails,
 *                       getListCurrency, report1, posts, updateReading,
 *                       deleteReading) — kept for back-compat with the
 *                       legacy ApiService.java surface; never called by
 *                       new code.
 *   • TOTAL     = 36
 */
export const ENDPOINT_COUNT = Object.keys(Endpoints).length;

/** Count of endpoints that are actually callable on the live WCF backend. */
export const LIVE_ENDPOINT_COUNT = Object.values(Endpoints).filter(
  (e) => !e.deprecated,
).length;
