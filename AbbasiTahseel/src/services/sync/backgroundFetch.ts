/**
 * Background Fetch Integration — العباسي تحصيل
 *
 * Wires `react-native-background-fetch` into the sync coordinator so the OS
 * wakes us up periodically (Android: every ~15min minimum) to upload any
 * pending readings/bonds.
 *
 * Why critical for the collector?
 *   The legacy app required the collector to manually open the app and tap
 *   "Sync". Many forgot, and readings sat un-synced for days. Background
 *   fetch makes the upload near-automatic — as long as the device has
 *   network within the wake window, the queue drains.
 *
 * Android lifecycle:
 *   • OS calls our handler with a `taskId`.
 *   • We MUST call BackgroundFetch.finish(taskId) within ~30 seconds.
 *   • If we exceed that, the OS will throttle future invocations.
 *
 * Implementation notes:
 *   • We use `pushOnly` (NOT a full sync) to keep wake time short.
 *   • Pulls are deferred to foreground triggers — pulling reference data
 *     in the background wastes user data plans.
 */

import BackgroundFetch from 'react-native-background-fetch';

import { logger } from '../../utils/logger';
import { isOnlineAsync } from './connectivity';
import { syncEvents } from './events';
import { pushOnly } from './syncCoordinator';
import { DEFAULT_SYNC_CONFIG } from './types';

const log = logger.scope('BackgroundFetch');

// ─── Internal task handler ────────────────────────────────────────────────
async function onBackgroundFetchEvent(taskId: string): Promise<void> {
  log.info('background fetch fired', { taskId });

  try {
    const online = await isOnlineAsync();
    if (!online) {
      log.info('offline — finishing background task without sync');
      syncEvents.emit({ type: 'engine:skipped', reason: 'offline', at: Date.now() });
      return;
    }
    // Push-only to keep wake time short. The full pull will run when the
    // user next opens the app.
    const result = await pushOnly('background_fetch');
    log.info('background sync result', {
      pushed: result.pushed,
      durationMs: result.durationMs,
    });
  } catch (err) {
    log.error('background fetch error', { err: (err as Error).message });
  } finally {
    // CRITICAL: always finish to avoid throttling.
    BackgroundFetch.finish(taskId);
  }
}

// ─── Timeout handler (Android: OS forcing us to stop) ─────────────────────
function onBackgroundFetchTimeout(taskId: string): void {
  log.warn('background fetch TIMEOUT — finishing immediately', { taskId });
  BackgroundFetch.finish(taskId);
}

// ─── Public setup ─────────────────────────────────────────────────────────

let isConfigured = false;

/**
 * Configure & start background fetch. Idempotent.
 *
 * Call from `App.tsx` after database is initialized. Returns the status code
 * from BackgroundFetch.configure (1 = OK, 0 = disabled by user, -1 = unavailable).
 */
export async function configureBackgroundFetch(
  intervalMinutes: number = DEFAULT_SYNC_CONFIG.backgroundIntervalMinutes,
): Promise<number> {
  if (isConfigured) {
    log.debug('background fetch already configured');
    return BackgroundFetch.STATUS_AVAILABLE;
  }

  // Android floors the interval at 15 minutes — anything lower is clamped.
  const minimumFetchInterval = Math.max(15, intervalMinutes);

  const status = await BackgroundFetch.configure(
    {
      minimumFetchInterval,
      stopOnTerminate: false, // keep running after app is killed
      startOnBoot: true, // re-register after device reboot
      enableHeadless: true, // run handler when app is in headless mode
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      requiresCharging: false,
      requiresDeviceIdle: false,
      requiresBatteryNotLow: false,
      requiresStorageNotLow: false,
    },
    onBackgroundFetchEvent,
    onBackgroundFetchTimeout,
  );

  isConfigured = true;
  log.info('background fetch configured', { status, minimumFetchInterval });
  return status;
}

/**
 * Stop background fetch entirely. Used when the user logs out or disables
 * the feature from settings.
 */
export async function stopBackgroundFetch(): Promise<void> {
  if (!isConfigured) return;
  await BackgroundFetch.stop();
  isConfigured = false;
  log.info('background fetch stopped');
}

/**
 * For the Settings screen: surface whether background sync is active and
 * what the OS-level status code is.
 */
export async function getBackgroundFetchStatus(): Promise<number> {
  return BackgroundFetch.status();
}

/**
 * For the React Native "Headless JS" entry point (Android only). Register
 * this function in `index.js` via `AppRegistry.registerHeadlessTask`.
 *
 * It's a fire-and-forget task that pushes pending writes, then exits.
 */
export async function backgroundFetchHeadlessTask(event: { taskId: string; timeout: boolean }): Promise<void> {
  if (event.timeout) {
    onBackgroundFetchTimeout(event.taskId);
    return;
  }
  await onBackgroundFetchEvent(event.taskId);
}
