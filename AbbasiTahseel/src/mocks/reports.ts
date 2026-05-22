/**
 * Mock report rows — used by ReportsHub + each report sub-screen.
 *
 * Each report has a slightly different shape; we provide ONE row type
 * per report so the UI can render a realistic table preview without
 * touching the API.
 *
 * Wave 6-Α — pure UI fixture.
 */

// ─── Balance Header (ميزان عام) ───────────────────────────────────────────
export interface MockBalanceHeaderRow {
  accountId: number;
  accountNum: string;
  accountName: string;
  placeName: string;
  balance: number;
  currencySymbol: string;
}

export const MOCK_BALANCE_HEADER: MockBalanceHeaderRow[] = [
  { accountId: 113, accountNum: '0013', accountName: 'مستشفى الرحمة', placeName: 'حي المستشفيات', balance: 145000, currencySymbol: 'ر.ي' },
  { accountId: 104, accountNum: '0004', accountName: 'سعيد عمر باوزير', placeName: 'الحارة الغربية', balance: 75000, currencySymbol: 'ر.ي' },
  { accountId: 116, accountNum: '0016', accountName: 'محطة وقود الفجر', placeName: 'الحي الصناعي', balance: 67800, currencySymbol: 'ر.ي' },
  { accountId: 107, accountNum: '0007', accountName: 'مدرسة الأمل الأهلية', placeName: 'حي السلام', balance: 32100, currencySymbol: 'ر.ي' },
  { accountId: 115, accountNum: '0015', accountName: 'ورشة المطر للحدادة', placeName: 'الحي الصناعي', balance: 22500, currencySymbol: 'ر.ي' },
  { accountId: 109, accountNum: '0009', accountName: 'مطعم النخلة الذهبية', placeName: 'السوق المركزي', balance: 18400, currencySymbol: 'ر.ي' },
  { accountId: 118, accountNum: '0018', accountName: 'نور الهدى التجارية', placeName: 'السوق المركزي', balance: 14200, currencySymbol: 'ر.ي' },
  { accountId: 101, accountNum: '0001', accountName: 'محمد علي العباسي', placeName: 'الحارة الشرقية', balance: 12500, currencySymbol: 'ر.ي' },
  { accountId: 111, accountNum: '0011', accountName: 'عبدالرحمن قاسم باحارثة', placeName: 'المخا - حي الجمهورية', balance: 9800, currencySymbol: 'ر.ي' },
  { accountId: 106, accountNum: '0006', accountName: 'مسجد النور', placeName: 'حي السلام', balance: 8900, currencySymbol: 'ر.ي' },
];

// ─── Balance Details (كشف حساب تفصيلي) ────────────────────────────────────
export interface MockBalanceDetailsRow {
  date: string;
  docNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export const MOCK_BALANCE_DETAILS: MockBalanceDetailsRow[] = [
  { date: '2026-04-01', docNo: 'INV-1001', description: 'فاتورة شهر شعبان', debit: 5000, credit: 0, balance: 5000 },
  { date: '2026-04-18', docNo: 'BND-1001', description: 'سند قبض', debit: 0, credit: 5000, balance: 0 },
  { date: '2026-05-01', docNo: 'INV-1042', description: 'فاتورة شهر رمضان', debit: 7500, credit: 0, balance: 7500 },
  { date: '2026-05-08', docNo: 'BND-1007', description: 'سند قبض', debit: 0, credit: 3300, balance: 4200 },
  { date: '2026-05-20', docNo: 'BND-1017', description: 'سند صرف', debit: 200, credit: 0, balance: 4400 },
];

// ─── Bonds Header (تقرير السندات) ─────────────────────────────────────────
export interface MockBondsHeaderRow {
  bondNo: number;
  date: string;
  accountName: string;
  type: 'receipt' | 'payment';
  amount: number;
}

export const MOCK_BONDS_HEADER: MockBondsHeaderRow[] = [
  { bondNo: 1001, date: '2026-04-18', accountName: 'محمد علي العباسي', type: 'receipt', amount: 5000 },
  { bondNo: 1002, date: '2026-04-19', accountName: 'فاطمة سالم الحضرمي', type: 'receipt', amount: 2100 },
  { bondNo: 1003, date: '2026-05-01', accountName: 'سعيد عمر باوزير', type: 'receipt', amount: 25000 },
  { bondNo: 1004, date: '2026-05-02', accountName: 'علي صالح المحمدي', type: 'payment', amount: 1500 },
  { bondNo: 1005, date: '2026-05-03', accountName: 'مسجد النور', type: 'receipt', amount: 3500 },
];

// ─── Box Moves (حركة الصندوق) ─────────────────────────────────────────────
export interface MockBoxMoveRow {
  date: string;
  receipts: number;
  payments: number;
  net: number;
}

export const MOCK_BOX_MOVES: MockBoxMoveRow[] = [
  { date: '2026-05-18', receipts: 18350, payments: 0, net: 18350 },
  { date: '2026-05-19', receipts: 11800, payments: 550, net: 11250 },
  { date: '2026-05-20', receipts: 0, payments: 200, net: -200 },
  { date: '2026-05-21', receipts: 11300, payments: 0, net: 11300 },
  { date: '2026-05-22', receipts: 1150, payments: 0, net: 1150 },
];

// ─── Expenses (المصروفات اليومية) ─────────────────────────────────────────
export interface MockExpenseRow {
  date: string;
  category: string;
  description: string;
  amount: number;
}

export const MOCK_EXPENSES: MockExpenseRow[] = [
  { date: '2026-05-18', category: 'وقود', description: 'تعبئة دراجة الجباية', amount: 4500 },
  { date: '2026-05-19', category: 'صيانة', description: 'تصليح طابعة', amount: 12000 },
  { date: '2026-05-20', category: 'مكتبية', description: 'دفاتر سندات', amount: 3000 },
  { date: '2026-05-21', category: 'وقود', description: 'تعبئة دراجة الجباية', amount: 5000 },
];

// ─── Reading Header (تقرير القراءات الإجمالي) ─────────────────────────────
export interface MockReadingHeaderRow {
  placeName: string;
  groupName: string;
  subscribersCount: number;
  postedCount: number;
  pendingCount: number;
  totalConsumption: number;
}

export const MOCK_READING_HEADER: MockReadingHeaderRow[] = [
  { placeName: 'الحارة الشرقية', groupName: 'طبلة 1', subscribersCount: 124, postedCount: 108, pendingCount: 16, totalConsumption: 12450 },
  { placeName: 'الحارة الغربية', groupName: 'طبلة 2', subscribersCount: 87, postedCount: 87, pendingCount: 0, totalConsumption: 8920 },
  { placeName: 'حي السلام', groupName: 'طبلة 3', subscribersCount: 56, postedCount: 40, pendingCount: 16, totalConsumption: 5610 },
  { placeName: 'السوق المركزي', groupName: 'طبلة 4', subscribersCount: 142, postedCount: 110, pendingCount: 32, totalConsumption: 18200 },
];
