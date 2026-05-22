/**
 * Mock reading rows — used by ReadingsHistoryScreen + ReadingsBulkScreen.
 *
 * The sacred 12-column schema (must match Java @Json):
 *   num, name, namet, ind, ks, kh, cas, asts, nomstlm, notblh, noadad, nog
 *
 * Wave 6-Α — pure UI fixture. NOT a WatermelonDB model.
 *
 * TODO Wave 6-Β: replace consumers with real Reading model from
 *   `src/data/models/Reading.ts`.
 */

export interface MockReading {
  /** Subscriber account number (`num`). */
  num: string;
  /** Subscriber primary name (`name`). */
  name: string;
  /** Subscriber secondary / alias name (`namet`). */
  namet: string;
  /** Previous reading kWh (`ks`). */
  ks: number;
  /** Current reading kWh (`kh`) — `null` ↔ not yet read. */
  kh: number | null;
  /** Calculated consumption (`cas`). */
  cas: number;
  /** Average consumption from history (`asts`). */
  asts: number;
  /** Place number (`nomstlm`). */
  nomstlm: number;
  /** Book number (`notblh`). */
  notblh: number;
  /** Meter index (`noadad`). */
  noadad: number;
  /** Group number (`nog`). */
  nog: number;
  /** Optional indicator flag (`ind`). */
  ind?: number;
  /** Sync state for UI badges (NOT part of the wire schema). */
  syncState: 'pristine' | 'dirty' | 'syncing' | 'synced' | 'failed';
  /** When the reading was last touched locally (display only). */
  updatedAt: string;
}

// ─── Helper to mint a synthetic row quickly. ──────────────────────────────
function row(
  i: number,
  overrides: Partial<MockReading> = {},
): MockReading {
  const ks = 5000 + i * 132;
  const kh =
    overrides.kh === undefined ? ks + 20 + Math.round(Math.random() * 100) : overrides.kh;
  return {
    num: String(1000 + i).padStart(4, '0'),
    name: `مشترك تجريبي ${i}`,
    namet: `بديل ${i}`,
    ks,
    kh: kh ?? null,
    cas: typeof kh === 'number' && kh !== null ? kh - ks : 0,
    asts: 90 + (i % 4) * 12,
    nomstlm: 1 + (i % 4),
    notblh: 1 + (i % 3),
    noadad: 100 + i,
    nog: 1 + (i % 6),
    ind: 1,
    syncState: 'pristine',
    updatedAt: `2026-05-${20 + ((i % 3) - 1)}T08:${(i % 60).toString().padStart(2, '0')}:00`,
    ...overrides,
  };
}

// ─── 50 mock readings — variety across sync states + read/un-read. ────────
export const MOCK_READINGS: MockReading[] = [
  row(1,  { syncState: 'synced' }),
  row(2,  { syncState: 'synced' }),
  row(3,  { syncState: 'dirty' }),
  row(4,  { syncState: 'pristine', kh: null, cas: 0 }),
  row(5,  { syncState: 'synced' }),
  row(6,  { syncState: 'failed' }),
  row(7,  { syncState: 'synced' }),
  row(8,  { syncState: 'dirty' }),
  row(9,  { syncState: 'pristine', kh: null, cas: 0 }),
  row(10, { syncState: 'synced' }),
  row(11, { syncState: 'pristine', kh: null, cas: 0 }),
  row(12, { syncState: 'synced' }),
  row(13, { syncState: 'dirty' }),
  row(14, { syncState: 'synced' }),
  row(15, { syncState: 'failed' }),
  row(16, { syncState: 'synced' }),
  row(17, { syncState: 'synced' }),
  row(18, { syncState: 'dirty' }),
  row(19, { syncState: 'synced' }),
  row(20, { syncState: 'pristine', kh: null, cas: 0 }),
  row(21, { syncState: 'synced' }),
  row(22, { syncState: 'synced' }),
  row(23, { syncState: 'dirty' }),
  row(24, { syncState: 'synced' }),
  row(25, { syncState: 'synced' }),
  row(26, { syncState: 'pristine', kh: null, cas: 0 }),
  row(27, { syncState: 'synced' }),
  row(28, { syncState: 'failed' }),
  row(29, { syncState: 'synced' }),
  row(30, { syncState: 'synced' }),
  row(31, { syncState: 'pristine', kh: null, cas: 0 }),
  row(32, { syncState: 'synced' }),
  row(33, { syncState: 'dirty' }),
  row(34, { syncState: 'synced' }),
  row(35, { syncState: 'synced' }),
  row(36, { syncState: 'synced' }),
  row(37, { syncState: 'pristine', kh: null, cas: 0 }),
  row(38, { syncState: 'synced' }),
  row(39, { syncState: 'synced' }),
  row(40, { syncState: 'synced' }),
  row(41, { syncState: 'dirty' }),
  row(42, { syncState: 'synced' }),
  row(43, { syncState: 'pristine', kh: null, cas: 0 }),
  row(44, { syncState: 'synced' }),
  row(45, { syncState: 'synced' }),
  row(46, { syncState: 'synced' }),
  row(47, { syncState: 'failed' }),
  row(48, { syncState: 'synced' }),
  row(49, { syncState: 'synced' }),
  row(50, { syncState: 'pristine', kh: null, cas: 0 }),
];

/** Subset filter helper used by ReadingsBulkScreen. */
export function getPendingReadings(): MockReading[] {
  return MOCK_READINGS.filter((r) => r.kh === null);
}

/** Subset filter helper used by ReadingsHistoryScreen. */
export function getReadingsByAccount(num: string): MockReading[] {
  // Reuse the same row template to generate "history" months for one account.
  const baseIdx = parseInt(num, 10) % 50 || 1;
  return [0, 1, 2, 3].map((monthAgo) =>
    row(baseIdx, {
      num,
      ks: 5000 + baseIdx * 132 - monthAgo * 120,
      kh: 5000 + baseIdx * 132 - monthAgo * 120 + 110 - monthAgo * 5,
      cas: 110 - monthAgo * 5,
      syncState: 'synced',
      updatedAt: `2026-0${5 - monthAgo}-15T09:30:00`,
    }),
  );
}
