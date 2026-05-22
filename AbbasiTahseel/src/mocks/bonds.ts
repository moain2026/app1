/**
 * Mock bonds — 20 realistic bonds (mix of receipts/payments, synced/dirty/failed).
 *
 * Layout mirrors the eventual real Bond shape (kept loose for UI skeleton
 * use; the real `Bond` watermelon model retains its own 13-field surface
 * until Wave 6-Β migrates to 24 fields).
 *
 * Wave 6-Α — pure UI fixture.
 */

import { MOCK_ACCOUNTS } from './accounts';

export type BondType = 'receipt' | 'payment';
export type BondSyncStatus = 'synced' | 'dirty' | 'failed';

export interface MockBond {
  localUuid: string;
  remoteId?: number;
  bondNo: number;
  bondType: BondType;
  accountId: number;
  accountName: string;
  accountNum: string;
  currencyId: number;
  currencySymbol: string;
  amount: number;
  amountPaid: number; // sum of payments
  notes?: string;
  bondDate: string; // ISO yyyy-MM-dd
  syncStatus: BondSyncStatus;
  /** Reference document number (nref_docno). */
  refDocNo?: string;
  /** ID of the user who created the bond. */
  userId?: number;
  /** Last sync error (only when syncStatus='failed'). */
  lastError?: string;
}

function acct(idx: number): { id: number; name: string; num: string } {
  const a = MOCK_ACCOUNTS[idx];
  // We know fixtures cover idx 0..19; assertion is safe.
  if (!a) throw new Error('mock account index out of range');
  return { id: a.id, name: a.name, num: a.num };
}

export const MOCK_BONDS: MockBond[] = [
  {
    localUuid: 'bond-uuid-001',
    remoteId: 5001,
    bondNo: 1001,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(0);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 5000,
    amountPaid: 5000,
    notes: 'فاتورة شهر شعبان',
    bondDate: '2026-04-18',
    syncStatus: 'synced',
    refDocNo: 'INV-1001',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-002',
    remoteId: 5002,
    bondNo: 1002,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(2);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 2100,
    amountPaid: 2100,
    bondDate: '2026-04-19',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-003',
    bondNo: 1003,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(3);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 25000,
    amountPaid: 25000,
    notes: 'دفعة من إجمالي 75000',
    bondDate: '2026-05-01',
    syncStatus: 'dirty',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-004',
    bondNo: 1004,
    bondType: 'payment',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(4);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 1500,
    amountPaid: 1500,
    notes: 'إرجاع مبلغ زائد',
    bondDate: '2026-05-02',
    syncStatus: 'failed',
    lastError: 'تعذر الاتصال — يحتاج إعادة محاولة',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-005',
    remoteId: 5005,
    bondNo: 1005,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(5);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 3500,
    amountPaid: 3500,
    bondDate: '2026-05-03',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-006',
    remoteId: 5006,
    bondNo: 1006,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(6);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 15000,
    amountPaid: 15000,
    notes: 'دفع جزئي',
    bondDate: '2026-05-05',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-007',
    bondNo: 1007,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(7);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 3300,
    amountPaid: 3300,
    bondDate: '2026-05-08',
    syncStatus: 'dirty',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-008',
    remoteId: 5008,
    bondNo: 1008,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(8);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 9200,
    amountPaid: 9200,
    bondDate: '2026-05-09',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-009',
    remoteId: 5009,
    bondNo: 1009,
    bondType: 'payment',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(9);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 1150,
    amountPaid: 1150,
    notes: 'إرجاع رصيد',
    bondDate: '2026-05-10',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-010',
    remoteId: 5010,
    bondNo: 1010,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(10);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 4900,
    amountPaid: 4900,
    bondDate: '2026-05-11',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-011',
    bondNo: 1011,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(12);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 45000,
    amountPaid: 30000,
    notes: 'دفعة 1 من إجمالي 145000 — متبقي 115000',
    bondDate: '2026-05-12',
    syncStatus: 'dirty',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-012',
    remoteId: 5012,
    bondNo: 1012,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(13);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 1700,
    amountPaid: 1700,
    bondDate: '2026-05-13',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-013',
    remoteId: 5013,
    bondNo: 1013,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(14);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 11250,
    amountPaid: 11250,
    bondDate: '2026-05-15',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-014',
    bondNo: 1014,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(15);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 33900,
    amountPaid: 33900,
    notes: 'دفعة شهرية',
    bondDate: '2026-05-17',
    syncStatus: 'dirty',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-015',
    remoteId: 5015,
    bondNo: 1015,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(17);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 7100,
    amountPaid: 7100,
    bondDate: '2026-05-18',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-016',
    bondNo: 1016,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(18);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 550,
    amountPaid: 550,
    bondDate: '2026-05-19',
    syncStatus: 'failed',
    lastError: 'استجابة 500 من الخادم',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-017',
    remoteId: 5017,
    bondNo: 1017,
    bondType: 'payment',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(0);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 200,
    amountPaid: 200,
    notes: 'إرجاع نقدي',
    bondDate: '2026-05-20',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-018',
    bondNo: 1018,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(2);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 2100,
    amountPaid: 1000,
    notes: 'دفعة جزئية',
    bondDate: '2026-05-21',
    syncStatus: 'dirty',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-019',
    remoteId: 5019,
    bondNo: 1019,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(8);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 9200,
    amountPaid: 9200,
    bondDate: '2026-05-21',
    syncStatus: 'synced',
    userId: 1,
  },
  {
    localUuid: 'bond-uuid-020',
    bondNo: 1020,
    bondType: 'receipt',
    ...((): { accountId: number; accountName: string; accountNum: string } => {
      const a = acct(10);
      return { accountId: a.id, accountName: a.name, accountNum: a.num };
    })(),
    currencyId: 1,
    currencySymbol: 'ر.ي',
    amount: 1150,
    amountPaid: 1150,
    bondDate: '2026-05-22',
    syncStatus: 'dirty',
    userId: 1,
  },
];

export function findMockBond(localUuid: string): MockBond | undefined {
  return MOCK_BONDS.find((b) => b.localUuid === localUuid);
}

/** Counts grouped by sync status for the badge in BondsScreen. */
export function getMockBondCounts(): {
  total: number;
  synced: number;
  dirty: number;
  failed: number;
  receipt: number;
  payment: number;
} {
  return {
    total: MOCK_BONDS.length,
    synced: MOCK_BONDS.filter((b) => b.syncStatus === 'synced').length,
    dirty: MOCK_BONDS.filter((b) => b.syncStatus === 'dirty').length,
    failed: MOCK_BONDS.filter((b) => b.syncStatus === 'failed').length,
    receipt: MOCK_BONDS.filter((b) => b.bondType === 'receipt').length,
    payment: MOCK_BONDS.filter((b) => b.bondType === 'payment').length,
  };
}
