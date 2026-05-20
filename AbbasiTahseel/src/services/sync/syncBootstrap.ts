/**
 * Sync Bootstrap — العباسي تحصيل
 *
 * Single function to initialize the entire sync subsystem. Call ONCE from
 * `App.tsx` after the database and storage layers are ready.
 *
 * Wiring done here:
 *  1. Start NetInfo connectivity monitor.
 *  2. Configure background fetch.
 *  3. Wire connectivity → coordinator (auto-sync on reconnect).
 *  4. Schedule an initial startup sync.
 *  5. (Optional) Foreground periodic timer for "app open + offline-recovery".
 *
 * Teardown via `shutdownSync()` is provided for tests + logout flows.
 */

import { logger } from '../../utils/logger';
import {
  configureBackgroundFetch,
  stopBackgroundFetch,
} from './backgroundFetch';
import {
  onConnectivityChange,
  startConnectivityMonitor,
  stopConnectivityMonitor,
} from './connectivity';
import { syncEvents } from './events';
import { syncNow, pushOnly } from './syncCoordinator';
import { DEFAULT_SYNC_CONFIG } from './types';

const log = logger.scope('SyncBootstrap');

// ─── State ────────────────────────────────────────────────────────────────
let initialized = false;
let connectivityUnsubscribe: (() => void) | null = null;
let foregroundTimerId: ReturnType<typeof setInterval> | null = null;

// ─── Config ───────────────────────────────────────────────────────────────
export interface BootstrapOptions {
  /** Run a sync on startup. Default: true. */
  syncOnStartup?: boolean;
  /** Trigger pushOnly when connectivity returns. Default: true. */
  syncOnReconnect?: boolean;
  /** Schedule background fetch. Default: true. */
  enableBackgroundFetch?: boolean;
  /** Periodic foreground push interval (ms). Default: 5 min. 0 to disable. */
  foregroundPeriodMs?: number;
  /** Override background fetch interval (minutes). Floor: 15. */
  backgroundIntervalMinutes?: number;
}

const DEFAULTS: Required<BootstrapOptions> = {
  syncOnStartup: true,
  syncOnReconnect: true,
  enableBackgroundFetch: true,
  foregroundPeriodMs: 5 * 60 * 1000,
  backgroundIntervalMinutes: DEFAULT_SYNC_CONFIG.backgroundIntervalMinutes,
};

// ─── Init ─────────────────────────────────────────────────────────────────

export async function initSyncEngine(options: BootstrapOptions = {}): Promise<void> {
  if (initialized) {
    log.debug('already initialized');
    return;
  }
  const cfg: Required<BootstrapOptions> = { ...DEFAULTS, ...options };
  log.info('initializing sync engine', { cfg });

  // 1. Connectivity monitor (must be first so coordinator's online checks work).
  await startConnectivityMonitor();

  // 2. Auto-sync on reconnect.
  if (cfg.syncOnReconnect) {
    connectivityUnsubscribe = onConnectivityChange(async online => {
      if (online) {
        log.info('network reconnected — triggering pushOnly');
        try {
          await pushOnly('connectivity');
        } catch (err) {
          log.warn('reconnect sync failed', { err: (err as Error).message });
        }
      }
    });
  }

  // 3. Background fetch.
  if (cfg.enableBackgroundFetch) {
    try {
      await configureBackgroundFetch(cfg.backgroundIntervalMinutes);
    } catch (err) {
      // Some emulators / headless builds don't support BackgroundFetch.
      // Don't let that kill the engine — fall back to foreground-only sync.
      log.warn('background fetch unavailable', { err: (err as Error).message });
    }
  }

  // 4. Foreground periodic timer (kept running while app is in foreground).
  if (cfg.foregroundPeriodMs > 0) {
    foregroundTimerId = setInterval(() => {
      void pushOnly('periodic').catch(err => {
        log.warn('periodic sync failed', { err: (err as Error).message });
      });
    }, cfg.foregroundPeriodMs);
  }

  // 5. Startup sync (fire-and-forget — don't block app launch).
  if (cfg.syncOnStartup) {
    setTimeout(() => {
      void syncNow('startup').catch(err => {
        log.warn('startup sync failed', { err: (err as Error).message });
      });
    }, 1500); // brief delay so UI can render first
  }

  initialized = true;
  log.info('sync engine initialized');
}

// ─── Shutdown ─────────────────────────────────────────────────────────────

export async function shutdownSync(): Promise<void> {
  if (!initialized) return;
  log.info('shutting down sync engine');

  if (foregroundTimerId) {
    clearInterval(foregroundTimerId);
    foregroundTimerId = null;
  }
  if (connectivityUnsubscribe) {
    connectivityUnsubscribe();
    connectivityUnsubscribe = null;
  }
  stopConnectivityMonitor();
  await stopBackgroundFetch();
  syncEvents.reset();

  initialized = false;
}

export function isSyncEngineInitialized(): boolean {
  return initialized;
}
