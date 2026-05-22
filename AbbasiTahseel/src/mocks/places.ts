/**
 * Mock places (مناطق) — for PlacePicker.
 *
 * Wave 6-Α — pure UI fixture.
 */

export interface MockPlace {
  id: number;
  name: string;
  /** Subscribers count (cached). */
  subscriberCount: number;
}

export const MOCK_PLACES: MockPlace[] = [
  { id: 1, name: 'الحارة الشرقية', subscriberCount: 124 },
  { id: 2, name: 'الحارة الغربية', subscriberCount: 87 },
  { id: 3, name: 'حي السلام', subscriberCount: 56 },
  { id: 4, name: 'السوق المركزي', subscriberCount: 142 },
  { id: 5, name: 'المخا - حي الجمهورية', subscriberCount: 78 },
  { id: 6, name: 'حي المستشفيات', subscriberCount: 12 },
  { id: 7, name: 'الحي الصناعي', subscriberCount: 23 },
  { id: 8, name: 'حي العمال', subscriberCount: 64 },
];
