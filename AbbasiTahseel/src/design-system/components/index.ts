/**
 * Design System Components — barrel export.
 *
 * Wave 6-Α. Single import surface for downstream screens:
 *   import { Card, EmptyState, FAB, FormField, ... } from '@/design-system/components';
 */

export { Card } from './Card';
export type { CardProps, CardVariant } from './Card';

export { Chip } from './Chip';
export type { ChipProps } from './Chip';

export { EmptyState } from './EmptyState';
export type { EmptyStateAction, EmptyStateProps } from './EmptyState';

export { ErrorBanner } from './ErrorBanner';
export type { ErrorBannerProps, ErrorBannerVariant } from './ErrorBanner';

export { FAB } from './FAB';
export type { FABProps } from './FAB';

export { FormField } from './FormField';
export type { FormFieldProps } from './FormField';

export { LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

export { MockBanner } from './MockBanner';
export type { MockBannerProps } from './MockBanner';

export { SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';

export { SecondaryButton } from './SecondaryButton';
export type {
  SecondaryButtonProps,
  SecondaryButtonVariant,
} from './SecondaryButton';

export { SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';
