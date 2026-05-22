/**
 * BondsScreen — re-export of `BondsListScreen` for backward compatibility
 * with MainTabs which references this module path.
 *
 * The actual implementation lives at `screens/bonds/BondsListScreen.tsx`
 * (organised under a dedicated `bonds/` folder alongside Detail / Form /
 * PaymentForm screens).
 *
 * Wave 6-Α — UI skeleton.
 */

export { BondsListScreen as BondsScreen } from '@/screens/bonds/BondsListScreen';
