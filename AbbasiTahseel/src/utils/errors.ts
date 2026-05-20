/**
 * AppError Taxonomy — العباسي تحصيل
 *
 * A single, exhaustive error type used across the app. Every failure path
 * (network, validation, db, hardware, business) eventually surfaces as an
 * `AppError`. UI components match on `code` to show the right message.
 *
 * Two patterns are exported:
 *  1. `AppError` class                — throwable / catchable
 *  2. `Result<T>`                     — Discriminated union for non-throw flows
 *
 * Why both?
 *  • Axios + Zod naturally throw → caught and converted to AppError.
 *  • Repository/Service methods that the UI calls return `Result<T>` so the
 *    UI doesn't have to wrap every call in try/catch.
 */

// ─── Error code taxonomy (exhaustive) ─────────────────────────────────────
export const ErrorCodes = {
  // Network
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_UNKNOWN: 'NETWORK_UNKNOWN',

  // HTTP
  HTTP_BAD_REQUEST: 'HTTP_BAD_REQUEST', // 400
  HTTP_UNAUTHORIZED: 'HTTP_UNAUTHORIZED', // 401 (after refresh failed)
  HTTP_FORBIDDEN: 'HTTP_FORBIDDEN', // 403
  HTTP_NOT_FOUND: 'HTTP_NOT_FOUND', // 404
  HTTP_CONFLICT: 'HTTP_CONFLICT', // 409
  HTTP_RATE_LIMITED: 'HTTP_RATE_LIMITED', // 429
  HTTP_SERVER_ERROR: 'HTTP_SERVER_ERROR', // 5xx

  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_REFRESH_FAILED: 'AUTH_REFRESH_FAILED',
  AUTH_NO_TOKEN: 'AUTH_NO_TOKEN',
  AUTH_PIN_INVALID: 'AUTH_PIN_INVALID',
  AUTH_PIN_NOT_SET: 'AUTH_PIN_NOT_SET',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED', // Zod parse failed
  VALIDATION_SERVER_RESPONSE: 'VALIDATION_SERVER_RESPONSE', // Server returned malformed data

  // Business rules (mirror legacy ListReadingActivity messages)
  BUSINESS_READING_BELOW_PREVIOUS: 'BUSINESS_READING_BELOW_PREVIOUS',
  BUSINESS_READING_LOCKED_POSTED: 'BUSINESS_READING_LOCKED_POSTED',

  // Database
  DB_WRITE_FAILED: 'DB_WRITE_FAILED',
  DB_NOT_FOUND: 'DB_NOT_FOUND',

  // Sync
  SYNC_QUEUE_OVERFLOW: 'SYNC_QUEUE_OVERFLOW',
  SYNC_MAX_ATTEMPTS_EXCEEDED: 'SYNC_MAX_ATTEMPTS_EXCEEDED',

  // Hardware
  PRINTER_NOT_CONNECTED: 'PRINTER_NOT_CONNECTED',
  PRINTER_OUT_OF_PAPER: 'PRINTER_OUT_OF_PAPER',
  PRINTER_UNKNOWN: 'PRINTER_UNKNOWN',
  BARCODE_SCAN_FAILED: 'BARCODE_SCAN_FAILED',

  // Catch-all
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Arabic user-facing messages.
 * The UI should NEVER show a raw `error.message` from Axios — always look up
 * the message via `userMessageFor(code)`.
 */
export const ERROR_MESSAGES_AR: Record<ErrorCode, string> = {
  [ErrorCodes.NETWORK_OFFLINE]: 'لا يوجد اتصال بالإنترنت. سيتم حفظ البيانات محلياً ومزامنتها لاحقاً.',
  [ErrorCodes.NETWORK_TIMEOUT]: 'انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.',
  [ErrorCodes.NETWORK_UNKNOWN]: 'تعذّر الاتصال بالخادم.',

  [ErrorCodes.HTTP_BAD_REQUEST]: 'الطلب غير صحيح.',
  [ErrorCodes.HTTP_UNAUTHORIZED]: 'انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مجدداً.',
  [ErrorCodes.HTTP_FORBIDDEN]: 'ليست لديك الصلاحية لتنفيذ هذا الإجراء.',
  [ErrorCodes.HTTP_NOT_FOUND]: 'البيانات المطلوبة غير موجودة على الخادم.',
  [ErrorCodes.HTTP_CONFLICT]: 'هذا السجل تم تعديله من جهاز آخر.',
  [ErrorCodes.HTTP_RATE_LIMITED]: 'عدد الطلبات تجاوز الحد. حاول بعد قليل.',
  [ErrorCodes.HTTP_SERVER_ERROR]: 'خطأ من الخادم. أعد المحاولة لاحقاً.',

  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'اسم المستخدم أو كلمة السر غير صحيحة.',
  [ErrorCodes.AUTH_REFRESH_FAILED]: 'تعذّر تجديد الجلسة. سجّل الدخول من جديد.',
  [ErrorCodes.AUTH_NO_TOKEN]: 'لم يتم تسجيل الدخول.',
  [ErrorCodes.AUTH_PIN_INVALID]: 'الرمز السري غير صحيح.',
  [ErrorCodes.AUTH_PIN_NOT_SET]: 'لم يتم ضبط الرمز السري بعد.',

  [ErrorCodes.VALIDATION_FAILED]: 'البيانات المُدخلة غير صحيحة.',
  [ErrorCodes.VALIDATION_SERVER_RESPONSE]: 'استجابة الخادم غير متوقعة. تواصل مع الدعم الفني.',

  [ErrorCodes.BUSINESS_READING_BELOW_PREVIOUS]: 'القراءة الحالية اصغر من السابقة.',
  [ErrorCodes.BUSINESS_READING_LOCKED_POSTED]: 'لا يمكن تعديل القراءة المرحلة.',

  [ErrorCodes.DB_WRITE_FAILED]: 'تعذّر حفظ البيانات على الجهاز.',
  [ErrorCodes.DB_NOT_FOUND]: 'السجل غير موجود.',

  [ErrorCodes.SYNC_QUEUE_OVERFLOW]: 'قائمة المزامنة ممتلئة.',
  [ErrorCodes.SYNC_MAX_ATTEMPTS_EXCEEDED]: 'فشلت المزامنة بعد عدة محاولات. راجع لوحة المزامنة.',

  [ErrorCodes.PRINTER_NOT_CONNECTED]: 'الطابعة غير متصلة.',
  [ErrorCodes.PRINTER_OUT_OF_PAPER]: 'الطابعة بحاجة إلى ورق.',
  [ErrorCodes.PRINTER_UNKNOWN]: 'خطأ في الطابعة.',
  [ErrorCodes.BARCODE_SCAN_FAILED]: 'تعذّر قراءة الباركود.',

  [ErrorCodes.UNKNOWN]: 'حدث خطأ غير متوقع.',
};

/**
 * Lookup the user-facing Arabic message for an error code.
 */
export function userMessageFor(code: ErrorCode): string {
  return ERROR_MESSAGES_AR[code] ?? ERROR_MESSAGES_AR.UNKNOWN;
}

// ─── AppError class ───────────────────────────────────────────────────────
export interface AppErrorOptions {
  /** Original Error (for stack traces / Sentry). */
  cause?: unknown;
  /** HTTP status code, when applicable. */
  httpStatus?: number;
  /** Optional structured details (kept out of user UI; logs only). */
  details?: Record<string, unknown>;
  /** Override the default Arabic message. */
  message?: string;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus?: number;
  readonly details?: Record<string, unknown>;
  readonly userMessage: string;

  // Re-declare cause as a typed field (Error.cause is `unknown` in TS).
  readonly cause?: unknown;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    const userMessage = options.message ?? userMessageFor(code);
    super(userMessage);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.httpStatus = options.httpStatus;
    this.details = options.details;
    this.cause = options.cause;

    // Maintain proper prototype chain in TS transpiled output.
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convenience: build from an unknown thrown value.
   * If it's already an AppError, returns as-is.
   */
  static from(err: unknown, fallbackCode: ErrorCode = ErrorCodes.UNKNOWN): AppError {
    if (err instanceof AppError) {
      return err;
    }
    if (err instanceof Error) {
      return new AppError(fallbackCode, { cause: err, message: err.message });
    }
    return new AppError(fallbackCode, { cause: err });
  }
}

// ─── Result<T> — discriminated union for fallible operations ──────────────
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export const Ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const Err = <T = never>(error: AppError): Result<T> => ({ ok: false, error });

/**
 * Wrap a Promise-returning function and convert thrown errors into a Result.
 *
 * Example:
 *   const result = await runSafe(() => apiClient.get('/readings'));
 *   if (!result.ok) showToast(result.error.userMessage);
 */
export async function runSafe<T>(
  fn: () => Promise<T>,
  fallbackCode: ErrorCode = ErrorCodes.UNKNOWN,
): Promise<Result<T>> {
  try {
    const value = await fn();
    return Ok(value);
  } catch (err) {
    return Err(AppError.from(err, fallbackCode));
  }
}
