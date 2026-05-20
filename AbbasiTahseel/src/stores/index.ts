/**
 * Stores — Barrel Export
 *
 * All Zustand stores are re-exported here so call sites can use:
 *   import { useAuthStore, useLicenseStore } from '@/stores';
 *
 * Keep this list lean. Each store should own a single concern.
 */

export { useAuthStore, type AuthState, type AuthUser } from './authStore';
export { useLicenseStore, type LicenseState } from './licenseStore';
export { useSyncStore, type SyncState } from './syncStore';
export {
  useReadingsStore,
  type ReadingsState,
  type ReadingsFilterKey,
} from './readingsStore';
export { usePrinterStore, type PrinterState } from './printerStore';
