/**
 * Mock accounts — 20 realistic-looking subscribers used by:
 *   • AccountPicker (search-as-you-type)
 *   • BondCreate / BondEdit (default account preview)
 *   • ReadingDetail (subscriber profile section)
 *
 * MOCK ONLY — wave-6-Β will replace this with WatermelonDB reads
 * populated by `pull/referencePullHandlers.ts` against
 * GET /electric/GetListAccounts.
 *
 * Wave 6-Α — pure UI fixture.
 */

export interface MockAccount {
  /** Internal account id (matches Account.accountId in production). */
  id: number;
  /** Subscriber visible code (num). */
  num: string;
  /** Primary name (name). */
  name: string;
  /** Optional secondary / English name (namet). */
  nameT?: string;
  /** Place (area) id. */
  placeId: number;
  placeName: string;
  /** Group/section id (tblh). */
  groupId: number;
  groupName: string;
  /** Phone (optional, used by SMS / WhatsApp). */
  phone?: string;
  /** Net balance in YER (positive = debtor / مدين). */
  balance: number;
  /** Currency id used for the primary balance. */
  currencyId: number;
  /** Active flag. */
  active: boolean;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: 101,
    num: '0001',
    name: 'محمد علي العباسي',
    nameT: 'Mohammed Ali Al-Abbasi',
    placeId: 1,
    placeName: 'الحارة الشرقية',
    groupId: 11,
    groupName: 'طبلة 1',
    phone: '+967777111222',
    balance: 12500,
    currencyId: 1,
    active: true,
  },
  {
    id: 102,
    num: '0002',
    name: 'أحمد عبدالله الزبيدي',
    placeId: 1,
    placeName: 'الحارة الشرقية',
    groupId: 11,
    groupName: 'طبلة 1',
    phone: '+967733112233',
    balance: 0,
    currencyId: 1,
    active: true,
  },
  {
    id: 103,
    num: '0003',
    name: 'فاطمة سالم الحضرمي',
    placeId: 2,
    placeName: 'الحارة الغربية',
    groupId: 12,
    groupName: 'طبلة 2',
    balance: 4200,
    currencyId: 1,
    active: true,
  },
  {
    id: 104,
    num: '0004',
    name: 'سعيد عمر باوزير',
    placeId: 2,
    placeName: 'الحارة الغربية',
    groupId: 12,
    groupName: 'طبلة 2',
    phone: '+967711445566',
    balance: 75000,
    currencyId: 1,
    active: true,
  },
  {
    id: 105,
    num: '0005',
    name: 'علي صالح المحمدي',
    placeId: 3,
    placeName: 'حي السلام',
    groupId: 13,
    groupName: 'طبلة 3',
    balance: -1500, // credit
    currencyId: 1,
    active: true,
  },
  {
    id: 106,
    num: '0006',
    name: 'مسجد النور',
    placeId: 3,
    placeName: 'حي السلام',
    groupId: 13,
    groupName: 'طبلة 3',
    balance: 8900,
    currencyId: 1,
    active: true,
  },
  {
    id: 107,
    num: '0007',
    name: 'مدرسة الأمل الأهلية',
    placeId: 3,
    placeName: 'حي السلام',
    groupId: 13,
    groupName: 'طبلة 3',
    balance: 32100,
    currencyId: 1,
    active: true,
  },
  {
    id: 108,
    num: '0008',
    name: 'بقالة الإخوة',
    placeId: 4,
    placeName: 'السوق المركزي',
    groupId: 14,
    groupName: 'طبلة 4',
    phone: '+967700112233',
    balance: 6700,
    currencyId: 1,
    active: true,
  },
  {
    id: 109,
    num: '0009',
    name: 'مطعم النخلة الذهبية',
    placeId: 4,
    placeName: 'السوق المركزي',
    groupId: 14,
    groupName: 'طبلة 4',
    balance: 18400,
    currencyId: 1,
    active: true,
  },
  {
    id: 110,
    num: '0010',
    name: 'صالون الأناقة للحلاقة',
    placeId: 4,
    placeName: 'السوق المركزي',
    groupId: 14,
    groupName: 'طبلة 4',
    balance: 2300,
    currencyId: 1,
    active: true,
  },
  {
    id: 111,
    num: '0011',
    name: 'عبدالرحمن قاسم باحارثة',
    placeId: 5,
    placeName: 'المخا - حي الجمهورية',
    groupId: 15,
    groupName: 'طبلة 5',
    phone: '+967737889900',
    balance: 9800,
    currencyId: 1,
    active: true,
  },
  {
    id: 112,
    num: '0012',
    name: 'خالد ناصر العمري',
    placeId: 5,
    placeName: 'المخا - حي الجمهورية',
    groupId: 15,
    groupName: 'طبلة 5',
    balance: 0,
    currencyId: 1,
    active: true,
  },
  {
    id: 113,
    num: '0013',
    name: 'مستشفى الرحمة',
    placeId: 6,
    placeName: 'حي المستشفيات',
    groupId: 16,
    groupName: 'طبلة 6',
    phone: '+967711222333',
    balance: 145000,
    currencyId: 1,
    active: true,
  },
  {
    id: 114,
    num: '0014',
    name: 'صيدلية الشفاء',
    placeId: 6,
    placeName: 'حي المستشفيات',
    groupId: 16,
    groupName: 'طبلة 6',
    balance: 3400,
    currencyId: 1,
    active: true,
  },
  {
    id: 115,
    num: '0015',
    name: 'ورشة المطر للحدادة',
    placeId: 7,
    placeName: 'الحي الصناعي',
    groupId: 17,
    groupName: 'طبلة 7',
    balance: 22500,
    currencyId: 1,
    active: true,
  },
  {
    id: 116,
    num: '0016',
    name: 'محطة وقود الفجر',
    placeId: 7,
    placeName: 'الحي الصناعي',
    groupId: 17,
    groupName: 'طبلة 7',
    phone: '+967733998877',
    balance: 67800,
    currencyId: 1,
    active: true,
  },
  {
    id: 117,
    num: '0017',
    name: 'إبراهيم محمد الشيباني',
    placeId: 1,
    placeName: 'الحارة الشرقية',
    groupId: 11,
    groupName: 'طبلة 1',
    balance: 5600,
    currencyId: 1,
    active: false, // مغلق
  },
  {
    id: 118,
    num: '0018',
    name: 'نور الهدى التجارية',
    placeId: 4,
    placeName: 'السوق المركزي',
    groupId: 14,
    groupName: 'طبلة 4',
    balance: 14200,
    currencyId: 1,
    active: true,
  },
  {
    id: 119,
    num: '0019',
    name: 'يحيى علي بن يحيى',
    placeId: 2,
    placeName: 'الحارة الغربية',
    groupId: 12,
    groupName: 'طبلة 2',
    phone: '+967777334455',
    balance: 1100,
    currencyId: 1,
    active: true,
  },
  {
    id: 120,
    num: '0020',
    name: 'مسجد التقوى',
    placeId: 5,
    placeName: 'المخا - حي الجمهورية',
    groupId: 15,
    groupName: 'طبلة 5',
    balance: 0,
    currencyId: 1,
    active: true,
  },
];

export function findMockAccount(id: number): MockAccount | undefined {
  return MOCK_ACCOUNTS.find((a) => a.id === id);
}

/** Lookup by the visible num code (string). Used by readings history. */
export function findMockAccountByNum(num: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find((a) => a.num === num);
}
