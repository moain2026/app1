/**
 * Sync Engine — Public API
 *
 * The ONLY exports the rest of the app should rely on. Internal modules
 * (handlers, queue, worker) should not be reached for directly — go through
 * `syncCoordinator` or `enqueueHelpers`.
 */

// ─── Top-level orchestration ──────────────────────────────────────────────
export {
  syncNow,
  pushOnly,
  pullEntities,
  isSyncRunning,
  type SyncRunResult,
  type SyncNowOptions,
} from './syncCoordinator';

// ─── Bootstrap (call once from App.tsx) ───────────────────────────────────
export {
  initSyncEngine,
  shutdownSync,
  isSyncEngineInitialized,
  type BootstrapOptions,
} from './syncBootstrap';

// ─── Enqueue helpers (feature layer entry points) ─────────────────────────
export {
  enqueueReadingSave,
  enqueueReadingDelete,
  enqueueBondSave,
  enqueueBondPaymentSave,
  reenqueueAllDirtyReadings,
} from './enqueueHelpers';

// ─── Queue management (Dashboard reads these) ─────────────────────────────
export {
  enqueue,
  getStats,
  countByStatus,
  listFailed,
  retryFailed,
  pruneDoneOlderThan,
  recoverStuckProcessing,
  MAX_QUEUE_SIZE,
  type EnqueueOptions,
  type QueueStats,
} from './syncQueue';

// ─── Entity status helpers ────────────────────────────────────────────────
export {
  getPushStatusFor,
  resetFailedEntities,
  markEntityAsSyncing,
  markEntityAsSynced,
  markEntityAsDirty,
  markEntityAsFailed,
} from './entitySyncStatus';

// ─── Connectivity ─────────────────────────────────────────────────────────
export {
  isOnlineSync,
  isOnlineAsync,
  onConnectivityChange,
  startConnectivityMonitor,
  stopConnectivityMonitor,
} from './connectivity';

// ─── Background fetch ─────────────────────────────────────────────────────
export {
  configureBackgroundFetch,
  stopBackgroundFetch,
  getBackgroundFetchStatus,
  backgroundFetchHeadlessTask,
} from './backgroundFetch';

// ─── Events (Dashboard subscribes here) ───────────────────────────────────
export { syncEvents, type SyncEvent, type SyncEventListener } from './events';

// ─── Logs (Dashboard reads these) ─────────────────────────────────────────
export { getRecentLogs, pruneOldLogs, recordSyncLog } from './syncLogger';

// ─── Worker (rarely needed externally — exposed for tests / dashboard) ────
export { drainQueueOnce, isWorkerRunning, type WorkerTickResult } from './syncWorker';

// ─── Types ────────────────────────────────────────────────────────────────
export type {
  SyncDirection,
  SyncEntityType,
  SyncQueueOperation,
  SyncQueueStatus,
  PullEntityKey,
  PullResult,
  PushHandler,
  PullHandler,
  QueueItemOutcome,
  SyncEngineConfig,
  SyncTriggerReason,
} from './types';
export { DEFAULT_SYNC_CONFIG } from './types';

// ─── Backoff (exported for tests) ─────────────────────────────────────────
export {
  computeBackoffDelayMs,
  computeNextRunAt,
  DEFAULT_BACKOFF,
  type BackoffConfig,
} from './backoff';

// ─── Error classifier (exported for tests) ────────────────────────────────
export {
  classifyError,
  isTransientHttpStatus,
  transient,
  permanent,
  success,
} from './errorClassifier';
