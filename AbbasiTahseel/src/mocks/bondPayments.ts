/**
 * Mock bond payments — child rows shown on BondDetailScreen.
 *
 * Each payment belongs to a single bond (FK = bondLocalUuid). The sum of
 * payments equals the bond's `amountPaid` (mirrored on the parent for
 * cheap aggregation in lists).
 *
 * Wave 6-Α — pure UI fixture.
 */

export interface MockBondPayment {
  localUuid: string;
  bondLocalUuid: string;
  remoteId?: number;
  paymentNo: number;
  amount: number;
  paymentDate: string; // ISO yyyy-MM-dd
  notes?: string;
  syncStatus: 'synced' | 'dirty' | 'failed';
}

export const MOCK_BOND_PAYMENTS: MockBondPayment[] = [
  // bond-001 (5000 paid in 1 instalment)
  {
    localUuid: 'pay-uuid-001',
    bondLocalUuid: 'bond-uuid-001',
    remoteId: 9001,
    paymentNo: 1,
    amount: 5000,
    paymentDate: '2026-04-18',
    syncStatus: 'synced',
  },
  // bond-011 (45000 amount, 30000 paid in 2 instalments — still dirty)
  {
    localUuid: 'pay-uuid-002',
    bondLocalUuid: 'bond-uuid-011',
    paymentNo: 1,
    amount: 20000,
    paymentDate: '2026-05-12',
    notes: 'دفعة كاش',
    syncStatus: 'dirty',
  },
  {
    localUuid: 'pay-uuid-003',
    bondLocalUuid: 'bond-uuid-011',
    paymentNo: 2,
    amount: 10000,
    paymentDate: '2026-05-15',
    notes: 'تحويل بنكي',
    syncStatus: 'dirty',
  },
  // bond-018 (2100 amount, 1000 paid)
  {
    localUuid: 'pay-uuid-004',
    bondLocalUuid: 'bond-uuid-018',
    paymentNo: 1,
    amount: 1000,
    paymentDate: '2026-05-21',
    syncStatus: 'dirty',
  },
];

export function findBondPayments(bondLocalUuid: string): MockBondPayment[] {
  return MOCK_BOND_PAYMENTS.filter((p) => p.bondLocalUuid === bondLocalUuid);
}
