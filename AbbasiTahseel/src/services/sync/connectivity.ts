/**
 * Connectivity Monitor — العباسي تحصيل
 *
 * Thin wrapper over @react-native-community/netinfo that:
 *  1. Exposes a current online/offline boolean.
 *  2. Emits `connectivity:online` / `connectivity:offline` on the sync events
 *     bus when the state changes.
 *  3. Lets the SyncCoordinator subscribe to "came back online" to
 *     auto-trigger a sync.
 *
 * The collector devices are usually on cellular networks with intermittent
 * coverage. Detecting the *moment* connectivity returns is critical — we
 * want to immediately drain the queue while the user has signal.
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import { logger } from '../../utils/logger';
import { syncEvents } from './events';

const log = logger.scope('Connectivity');

// ─── State ────────────────────────────────────────────────────────────────
let lastKnownOnline: boolean | null = null;
let unsubscribe: (() => void) | null = null;
type Listener = (online: boolean) => void;
const listeners = new Set<Listener>();

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Conservative "online" check: requires both `isConnected` AND
 * `isInternetReachable` to be true. The second flag is what saves us from
 * the "captive portal" scenario (Wi-Fi is on but you're stuck at a login
 * page).
 */
function deriveOnline(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

function handleState(state: NetInfoState): void {
  const online = deriveOnline(state);
  if (online === lastKnownOnline) {
    return;
  }
  log.info('connectivity changed', { online, type: state.type });
  lastKnownOnline = online;

  syncEvents.emit(online ? { type: 'connectivity:online' } : { type: 'connectivity:offline' });

  for (const listener of listeners) {
    try {
      listener(online);
    } catch {
      // Never let a listener kill the monitor.
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Start watching NetInfo. Idempotent — safe to call multiple times.
 * Recommended call site: `App.tsx` bootstrap (after Database init).
 */
export async function startConnectivityMonitor(): Promise<void> {
  if (unsubscribe) {
    return;
  }
  // Prime the cache once so callers can synchronously read `isOnline()`.
  const initial = await NetInfo.fetch();
  handleState(initial);

  unsubscribe = NetInfo.addEventListener(handleState);
  log.debug('monitor started');
}

export function stopConnectivityMonitor(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  listeners.clear();
  lastKnownOnline = null;
  log.debug('monitor stopped');
}

/**
 * Synchronous best-guess. Returns `null` if the monitor hasn't initialized
 * yet. Callers that need a guaranteed result should `await isOnlineAsync()`.
 */
export function isOnlineSync(): boolean | null {
  return lastKnownOnline;
}

/** Forces a fresh probe. Used during sync to short-circuit if offline. */
export async function isOnlineAsync(): Promise<boolean> {
  const state = await NetInfo.fetch();
  const online = deriveOnline(state);
  lastKnownOnline = online;
  return online;
}

/**
 * Subscribe to connectivity transitions. Listener receives `true` on
 * online, `false` on offline. Returns an unsubscribe function.
 */
export function onConnectivityChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
