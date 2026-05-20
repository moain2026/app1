/**
 * Sync Store — العباسي تحصيل
 *
 * UI-facing slice of the sync engine state. It does NOT own the engine —
 * it just listens to events from `src/services/sync/events/syncEvents.ts`
 * and exposes a clean Zustand shape for screens / badges / dashboards.
 *
 * Wiring overview:
 *
 *   ┌────────────── External world ──────────────┐
 *   │  syncEvents bus    NetInfo    DB sync_queue │
 *   └──────┬─────────────┬──────────────┬────────┘
 *          │ subscribe   │ onChange     │ observeCount
 *          ▼             ▼              ▼
 *   ┌────────────────  syncStore  ────────────────┐
 *   │  isOnline, isSyncing, pendingCount,          │
 *   │  failedCount, lastSyncAt, lastError          │
 *   └─────────────────────┬───────────────────────┘
 *                         ▼
 *                    React components
 *
 * Lifetime:
 *   - init() is called once from App.tsx at startup.
 *   - cleanup() is called from App.tsx's effect teardown.
 *   - Subscriptions are stored in module-level handles to allow cleanup
 *     even if init() is invoked again (idempotent).
 */

import { Q } from '@nozbe/watermelondb';
import { create } from 'zustand';

import { database } from '@/database';
import { syncEvents } from '@/services/sync/events';
import {
  isOnlineSync,
  onConnectivityChange,
  startConnectivityMonitor,
} from '@/services/sync/connectivity';
import {
  pullEntities,
  pushOnly,
  syncNow,
} from '@/services/sync/syncCoordinator';

import type { Subscription } from 'rxjs';

// ─── Types ────────────────────────────────────────────────────────────────

export interface SyncState {
  /** Network reachability (Wi-Fi/cell + internet-reachable). */
  isOnline: boolean;
  /** True between engine:started and engine:finished/skipped. */
  isSyncing: boolean;
  /** Count of sync_queue rows with status='pending'. */
  pendingCount: number;
  /** Count of sync_queue rows with status='failed'. */
  failedCount: number;
  /** When the engine last reported `engine:finished` successfully. */
  lastSyncAt: Date | null;
  /** Last error message surfaced by the engine. i18n key OR raw string. */
  lastError: string | null;

  // ─── Actions ────────────────────────────────────────────────────────────
  /**
   * Subscribe to NetInfo + sync events + DB observables. Safe to call
   * multiple times; the second call is a no-op.
   */
  init(): Promise<void>;

  /**
   * Trigger a full sync (push then pull). The engine itself guards against
   * re-entrancy, but this method is the canonical UI entry point.
   */
  triggerSync(): Promise<void>;

  /**
   * Push the local queue without pulling. Used after writes when the user
   * wants their changes uploaded immediately.
   */
  flushQueue(): Promise<void>;

  /**
   * Pull every reference entity (no push). Used for first-launch hydration.
   */
  pullAll(): Promise<void>;

  /** Tear down all subscriptions. Called from App.tsx unmount. */
  cleanup(): void;
}

// ─── Module-level subscription handles ────────────────────────────────────
// We keep these outside the store because Zustand state is for *data*; these
// are *resources* that survive store re-renders.
let unsubscribeEvents: (() => void) | null = null;
let unsubscribeConnectivity: (() => void) | null = null;
let pendingSubscription: Subscription | null = null;
let failedSubscription: Subscription | null = null;
let initialized = false;

// ─── Store ────────────────────────────────────────────────────────────────

export const useSyncStore = create<SyncState>((set, _get) => ({
  isOnline: false,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  lastSyncAt: null,
  lastError: null,

  async init(): Promise<void> {
    if (initialized) {
      return;
    }
    initialized = true;

    // 1) Connectivity monitor + initial state.
    await startConnectivityMonitor();
    const initialOnline = isOnlineSync();
    if (initialOnline !== null) {
      set({ isOnline: initialOnline });
    }
    unsubscribeConnectivity = onConnectivityChange((online) => {
      set({ isOnline: online });
    });

    // 2) Sync event bus.
    unsubscribeEvents = syncEvents.subscribe((event) => {
      switch (event.type) {
        case 'engine:started':
          set({ isSyncing: true, lastError: null });
          return;
        case 'engine:finished':
          set({
            isSyncing: false,
            lastSyncAt: new Date(event.at),
            lastError: event.failed > 0 ? 'sync.status.error' : null,
          });
          return;
        case 'engine:skipped':
          // skipped runs do not flip isSyncing because it was never set to
          // true (we only set true on engine:started). Defensive reset:
          set({ isSyncing: false });
          return;
        case 'push:item_permanent_failure':
          set({ lastError: event.reason });
          return;
        case 'pull:failed':
          set({ lastError: event.reason });
          return;
        default:
          // Other events (push item success/transient, pull started/finished,
          // connectivity:*) do not flip top-level state — DB observables and
          // the connectivity listener already cover those.
          return;
      }
    });

    // 3) DB observables for pending/failed counts.
    const queueCollection = database.collections.get('sync_queue');
    pendingSubscription = queueCollection
      .query(Q.where('status', 'pending'))
      .observeCount()
      .subscribe((count) => {
        set({ pendingCount: count });
      });
    failedSubscription = queueCollection
      .query(Q.where('status', 'failed'))
      .observeCount()
      .subscribe((count) => {
        set({ failedCount: count });
      });
  },

  async triggerSync(): Promise<void> {
    await syncNow('manual');
  },

  async flushQueue(): Promise<void> {
    await pushOnly('manual');
  },

  async pullAll(): Promise<void> {
    await pullEntities(
      [
        'readings',
        'bonds',
        'bond_payments',
        'accounts',
        'places',
        'groups',
        'tblh',
        'currencies',
      ],
      'manual',
    );
  },

  cleanup(): void {
    if (unsubscribeEvents) {
      unsubscribeEvents();
      unsubscribeEvents = null;
    }
    if (unsubscribeConnectivity) {
      unsubscribeConnectivity();
      unsubscribeConnectivity = null;
    }
    if (pendingSubscription) {
      pendingSubscription.unsubscribe();
      pendingSubscription = null;
    }
    if (failedSubscription) {
      failedSubscription.unsubscribe();
      failedSubscription = null;
    }
    initialized = false;
  },
}));
