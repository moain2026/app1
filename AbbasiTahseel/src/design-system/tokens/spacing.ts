/**
 * Spacing Tokens — العباسي تحصيل
 *
 * Based on a 4-pixel grid. Components must compose layouts ONLY using these tokens.
 *
 * Naming:
 *   spacing[0]  = 0
 *   spacing[1]  = 4
 *   spacing[2]  = 8
 *   spacing[3]  = 12
 *   spacing[4]  = 16 ← DEFAULT screen padding (horizontal)
 *   spacing[5]  = 20
 *   spacing[6]  = 24
 *   spacing[7]  = 32
 *   spacing[8]  = 40
 *   spacing[9]  = 48
 *   spacing[10] = 64
 *
 * Semantic aliases for readability in components.
 */

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
} as const;

// ─── Semantic spacing aliases ───────────────────────────────────────────────
export const layout = {
  /** Horizontal screen padding (left/right). 16px on phones. */
  screenPaddingHorizontal: spacing[4],

  /** Vertical screen padding (top/bottom of scroll content). */
  screenPaddingVertical: spacing[5],

  /** Gap between major sections inside a screen. */
  sectionGap: spacing[7],

  /** Gap between cards in a list. */
  listItemGap: spacing[3],

  /** Internal padding for a Card. */
  cardPadding: spacing[4],

  /** Internal padding for a Bottom Sheet. */
  sheetPaddingHorizontal: spacing[5],
  sheetPaddingVertical: spacing[6],

  /** Vertical rhythm inside a form (between two inputs). */
  formFieldGap: spacing[4],

  /** Tap target — Material guideline = 48dp min. */
  minTapTarget: 48,

  /** Bottom Tab bar height (we use a notched custom tab bar). */
  tabBarHeight: 64,

  /** Notched FAB diameter. */
  fabDiameter: 56,

  /** Status-bar-like header height (we render a custom header). */
  headerHeight: 56,
} as const;

export type SpacingToken = keyof typeof spacing;
export type LayoutToken = keyof typeof layout;
