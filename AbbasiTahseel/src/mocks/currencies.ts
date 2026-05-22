/**
 * Mock currencies — for CurrencyPicker.
 *
 * The legacy server returns currencies embedded in account / bond
 * responses (no standalone GetListCurrency on WCF Help). We keep this
 * minimal local list for the UI skeleton.
 *
 * Wave 6-Α — pure UI fixture.
 */

export interface MockCurrency {
  id: number;
  /** Symbol shown in the UI. */
  symbol: string;
  /** Full Arabic name. */
  name: string;
  /** Exchange rate against the base (YER). */
  rate: number;
  /** Whether this is the base currency. */
  isBase: boolean;
}

export const MOCK_CURRENCIES: MockCurrency[] = [
  {
    id: 1,
    symbol: 'ر.ي',
    name: 'ريال يمني',
    rate: 1,
    isBase: true,
  },
  {
    id: 2,
    symbol: '$',
    name: 'دولار أمريكي',
    rate: 540,
    isBase: false,
  },
  {
    id: 3,
    symbol: 'ر.س',
    name: 'ريال سعودي',
    rate: 144,
    isBase: false,
  },
];

export function findMockCurrency(id: number): MockCurrency | undefined {
  return MOCK_CURRENCIES.find((c) => c.id === id);
}
