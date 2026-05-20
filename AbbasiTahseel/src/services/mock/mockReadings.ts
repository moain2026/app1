/**
 * Mock Readings — العباسي تحصيل
 *
 * 25 hand-crafted reading rows used to seed WatermelonDB on first launch
 * into "Dev Bypass" mode. The dataset is deliberately diverse so QA can
 * verify EVERY UI branch in the readings module without touching the
 * production server:
 *
 *   • Posted vs unposted          (cas !== 0  vs cas === 0)
 *   • Read vs unread              (kh value  vs  kh === null)
 *   • Normal vs over-consumption  (kh - ks  ≤ asts  vs  kh - ks  > asts)
 *   • Across 5 areas, 10 books, 3 groups
 *   • 8-digit meter numbers (matches the legacy data shape)
 *
 * Field names use the legacy backend shape (`num`, `noadad`, `ks`, `kh`,
 * `cas`, `asts`, `nomstlm`, `notblh`, `nog`, `ind`, `name`, `namet`). This
 * lets us feed them straight into the WatermelonDB `readings` collection
 * without an intermediate mapper layer.
 *
 * IMPORTANT: All `local_uuid` values are STABLE (hand-written) so reseeding
 * is idempotent — the seeder uses them as the dedupe key. If the seed file
 * ever changes, bump the SEED_VERSION (in seedMockData.ts) to trigger a
 * one-off wipe + reload.
 */

import type { PushStatus } from '@/database/models/Reading';

export interface MockReading {
  /** Stable idempotency key — used by the seeder for dedupe. */
  local_uuid: string;
  /** Optional simulated server id (matches the eventual remote_id mapping). */
  remote_id: number | null;

  // ─── Legacy ItemReading fields ────────────────────────────────────────
  num: number;
  name: string;
  namet: string | null;
  ind: number;
  nomstlm: number;
  notblh: number;
  noadad: string;
  nog: number;
  ks: number;
  /** null = not yet read. */
  kh: number | null;
  /** !== 0 means posted (locked from editing). */
  cas: number;
  asts: number;

  // ─── Sync metadata ────────────────────────────────────────────────────
  sync_status: PushStatus;
  /** epoch ms — null when this row was never attempted. */
  last_sync_attempt_at: number | null;
  last_error: string | null;
  sync_attempts: number;

  /** epoch ms — null when never read. */
  reading_date: number | null;
}

// One reference timestamp for the whole seed batch. Using NOW would
// invalidate the `today_readings` KPI on Home — we backdate the SEED to
// "yesterday" so today's counter starts at 0 and increments when the QA
// engineer enters new readings.
const YESTERDAY_MS = Date.now() - 24 * 60 * 60 * 1000;

// Helper: build a row with sensible defaults, override only what differs.
function row(p: Partial<MockReading> & Pick<MockReading, 'local_uuid' | 'num' | 'name' | 'noadad' | 'ks' | 'asts'>): MockReading {
  return {
    remote_id: p.remote_id ?? null,
    namet: p.namet ?? null,
    ind: p.ind ?? 1,
    nomstlm: p.nomstlm ?? 1,
    notblh: p.notblh ?? 1,
    nog: p.nog ?? 1,
    kh: p.kh ?? null,
    cas: p.cas ?? 0,
    sync_status: p.sync_status ?? 'pristine',
    last_sync_attempt_at: p.last_sync_attempt_at ?? null,
    last_error: p.last_error ?? null,
    sync_attempts: p.sync_attempts ?? 0,
    reading_date: p.reading_date ?? null,
    ...p,
  };
}

/**
 * The 25-row seed dataset. Curated to cover the full visual matrix —
 * see file header for what each row exercises.
 */
export const MOCK_READINGS: readonly MockReading[] = [
  // ─── Area 1 / Book 1 / Group 1 — unread, ready to enter ────────────────
  row({
    local_uuid: 'mock-001',
    num: 1,
    name: 'أحمد محمد العمري',
    namet: 'أبو محمد',
    noadad: '12345678',
    ks: 1250,
    asts: 50,
  }),
  row({
    local_uuid: 'mock-002',
    num: 2,
    name: 'فاطمة عبدالله الزهراني',
    namet: 'أم خالد',
    noadad: '12345679',
    ks: 875,
    asts: 40,
  }),
  row({
    local_uuid: 'mock-003',
    num: 3,
    name: 'خالد سعيد الحربي',
    noadad: '12345680',
    ks: 2100,
    asts: 60,
  }),

  // ─── Area 1 / Book 1 — already entered + dirty (waiting to upload) ─────
  row({
    local_uuid: 'mock-004',
    num: 4,
    name: 'عبدالرحمن يوسف القرشي',
    namet: 'أبو يوسف',
    noadad: '12345681',
    ks: 3400,
    kh: 3445,
    asts: 50,
    sync_status: 'dirty',
    reading_date: YESTERDAY_MS,
  }),

  // ─── Area 1 / Book 1 — over-consumption (kh - ks > asts) ───────────────
  row({
    local_uuid: 'mock-005',
    num: 5,
    name: 'عائشة محمد الشمري',
    namet: 'أم سلطان',
    noadad: '12345682',
    ks: 1500,
    kh: 1620, // diff=120, asts=50 → over
    asts: 50,
    sync_status: 'dirty',
    reading_date: YESTERDAY_MS,
  }),

  // ─── Area 1 / Book 2 ─────────────────────────────────────────────────
  row({
    local_uuid: 'mock-006',
    num: 6,
    name: 'محمد إبراهيم العتيبي',
    noadad: '12345683',
    notblh: 2,
    ks: 990,
    asts: 45,
  }),
  row({
    local_uuid: 'mock-007',
    num: 7,
    name: 'نورة سالم الدوسري',
    namet: 'أم تركي',
    noadad: '12345684',
    notblh: 2,
    ks: 4200,
    asts: 70,
  }),

  // ─── Area 1 / Book 2 — already POSTED (locked from edit) ──────────────
  row({
    local_uuid: 'mock-008',
    num: 8,
    name: 'سلطان فهد المطيري',
    namet: 'أبو فهد',
    noadad: '12345685',
    notblh: 2,
    ks: 2700,
    kh: 2752,
    cas: 1, // posted
    asts: 55,
    sync_status: 'synced',
    reading_date: YESTERDAY_MS - 86_400_000,
    last_sync_attempt_at: YESTERDAY_MS - 86_400_000 + 3600_000,
  }),

  // ─── Area 2 / Book 3 / Group 1 ────────────────────────────────────────
  row({
    local_uuid: 'mock-009',
    num: 9,
    name: 'يوسف عبدالعزيز الغامدي',
    noadad: '12345686',
    nomstlm: 2,
    notblh: 3,
    ks: 1800,
    asts: 50,
  }),
  row({
    local_uuid: 'mock-010',
    num: 10,
    name: 'هدى أحمد البلوي',
    namet: 'أم بدر',
    noadad: '12345687',
    nomstlm: 2,
    notblh: 3,
    ks: 3300,
    asts: 65,
  }),
  row({
    local_uuid: 'mock-011',
    num: 11,
    name: 'بدر ناصر الأحمدي',
    namet: 'أبو ناصر',
    noadad: '12345688',
    nomstlm: 2,
    notblh: 3,
    ks: 2200,
    kh: 2255, // diff=55, asts=50 → OVER
    asts: 50,
    sync_status: 'dirty',
    reading_date: YESTERDAY_MS,
  }),

  // ─── Area 2 / Book 4 / Group 2 ────────────────────────────────────────
  row({
    local_uuid: 'mock-012',
    num: 12,
    name: 'ماجد عبدالله العنزي',
    noadad: '12345689',
    nomstlm: 2,
    notblh: 4,
    nog: 2,
    ks: 5500,
    asts: 80,
  }),
  row({
    local_uuid: 'mock-013',
    num: 13,
    name: 'لينا خالد الرشيدي',
    namet: 'أم ريم',
    noadad: '12345690',
    nomstlm: 2,
    notblh: 4,
    nog: 2,
    ks: 1100,
    kh: 1135,
    asts: 40,
    sync_status: 'synced',
    cas: 1,
    reading_date: YESTERDAY_MS - 172800_000,
    last_sync_attempt_at: YESTERDAY_MS - 172800_000 + 1800_000,
  }),

  // ─── Area 3 / Book 5 / Group 2 — has a FAILED upload ──────────────────
  row({
    local_uuid: 'mock-014',
    num: 14,
    name: 'سعد ماجد الشهري',
    namet: 'أبو ماجد',
    noadad: '12345691',
    nomstlm: 3,
    notblh: 5,
    nog: 2,
    ks: 2900,
    kh: 2935,
    asts: 45,
    sync_status: 'failed',
    last_sync_attempt_at: YESTERDAY_MS + 3600_000,
    last_error: 'timeout — تجاوز الوقت',
    sync_attempts: 3,
    reading_date: YESTERDAY_MS,
  }),

  // ─── Area 3 / Book 5 ──────────────────────────────────────────────────
  row({
    local_uuid: 'mock-015',
    num: 15,
    name: 'منى عبدالرحمن الحازمي',
    noadad: '12345692',
    nomstlm: 3,
    notblh: 5,
    nog: 2,
    ks: 6400,
    asts: 75,
  }),
  row({
    local_uuid: 'mock-016',
    num: 16,
    name: 'فيصل عبدالكريم القحطاني',
    namet: 'أبو عبدالكريم',
    noadad: '12345693',
    nomstlm: 3,
    notblh: 5,
    nog: 2,
    ks: 3800,
    asts: 55,
  }),

  // ─── Area 3 / Book 6 ──────────────────────────────────────────────────
  row({
    local_uuid: 'mock-017',
    num: 17,
    name: 'ريم أحمد الزهراني',
    namet: 'أم لمى',
    noadad: '12345694',
    nomstlm: 3,
    notblh: 6,
    nog: 2,
    ks: 1700,
    asts: 50,
  }),

  // ─── Area 4 / Book 7 / Group 3 — over-consumption (large jump) ────────
  row({
    local_uuid: 'mock-018',
    num: 18,
    name: 'تركي عبدالله السبيعي',
    namet: 'أبو عبدالعزيز',
    noadad: '12345695',
    nomstlm: 4,
    notblh: 7,
    nog: 3,
    ks: 4100,
    kh: 4380, // diff=280, asts=60 → MASSIVE over
    asts: 60,
    sync_status: 'dirty',
    reading_date: YESTERDAY_MS,
  }),

  // ─── Area 4 / Book 7 — already posted ─────────────────────────────────
  row({
    local_uuid: 'mock-019',
    num: 19,
    name: 'مها سعد العسيري',
    namet: 'أم خليل',
    noadad: '12345696',
    nomstlm: 4,
    notblh: 7,
    nog: 3,
    ks: 2300,
    kh: 2348,
    cas: 1,
    asts: 50,
    sync_status: 'synced',
    reading_date: YESTERDAY_MS - 86400_000,
  }),

  // ─── Area 4 / Book 8 ──────────────────────────────────────────────────
  row({
    local_uuid: 'mock-020',
    num: 20,
    name: 'ناصر فهد الراشد',
    noadad: '12345697',
    nomstlm: 4,
    notblh: 8,
    nog: 3,
    ks: 5000,
    asts: 70,
  }),

  // ─── Area 5 / Book 9 / Group 3 ────────────────────────────────────────
  row({
    local_uuid: 'mock-021',
    num: 21,
    name: 'سارة محمد الفهد',
    namet: 'أم رؤى',
    noadad: '12345698',
    nomstlm: 5,
    notblh: 9,
    nog: 3,
    ks: 1450,
    asts: 45,
  }),
  row({
    local_uuid: 'mock-022',
    num: 22,
    name: 'عمر إبراهيم الزيدي',
    namet: 'أبو إبراهيم',
    noadad: '12345699',
    nomstlm: 5,
    notblh: 9,
    nog: 3,
    ks: 2600,
    kh: 2645,
    asts: 50,
    sync_status: 'dirty',
    reading_date: YESTERDAY_MS,
  }),

  // ─── Area 5 / Book 10 — meter type 2 (industrial) ─────────────────────
  row({
    local_uuid: 'mock-023',
    num: 23,
    name: 'مؤسسة الواحة التجارية',
    namet: 'محل تجاري',
    noadad: '99887766',
    ind: 2, // industrial/commercial type
    nomstlm: 5,
    notblh: 10,
    nog: 3,
    ks: 12500,
    asts: 250,
  }),
  row({
    local_uuid: 'mock-024',
    num: 24,
    name: 'مخبز الأمير الذهبي',
    namet: 'مخبز',
    noadad: '99887767',
    ind: 2,
    nomstlm: 5,
    notblh: 10,
    nog: 3,
    ks: 8800,
    kh: 9050,
    asts: 200,
    sync_status: 'dirty',
    reading_date: YESTERDAY_MS,
  }),

  // ─── Area 5 / Book 10 — last one: over + failed (worst-case row) ──────
  row({
    local_uuid: 'mock-025',
    num: 25,
    name: 'ورشة الإتقان للحدادة',
    namet: 'ورشة صناعية',
    noadad: '99887768',
    ind: 2,
    nomstlm: 5,
    notblh: 10,
    nog: 3,
    ks: 15000,
    kh: 15850, // diff=850, asts=300 → OVER
    asts: 300,
    sync_status: 'failed',
    last_sync_attempt_at: YESTERDAY_MS + 7200_000,
    last_error: '500 — internal server error',
    sync_attempts: 5,
    reading_date: YESTERDAY_MS,
  }),
];

export const MOCK_READINGS_COUNT = MOCK_READINGS.length;
