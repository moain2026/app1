/**
 * Sync Events Bus — العباسي تحصيل
 *
 * In-process pub/sub for sync lifecycle events. The Sync Dashboard (Phase 11)
 * subscribes to these to render real-time progress without polling the DB.
 *
 * Design choices:
 *  • No external dependency — a hand-rolled tiny emitter (~30 lines) keeps
 *    the engine self-contained and SSR-safe.
 *  • Events carry plain data (no class instances) so they're easy to
 *    serialize / log / forward to telemetry later.
 *  • Listeners are stored as Set so duplicate add() is a no-op.
 */

import type {
  PullEntityKey,
  SyncEntityType,
  SyncTriggerReason,
} from '../types';

// ─── Event shapes (discriminated union) ───────────────────────────────────
export type SyncEvent =
  // ── Engine lifecycle ──────────────────────────────────────────────────
  | { type: 'engine:started'; trigger: SyncTriggerReason; at: number }
  | {
      type: 'engine:finished';
      trigger: SyncTriggerReason;
      at: number;
      durationMs: number;
      pushed: number;
      pulled: number;
      failed: number;
    }
  | { type: 'engine:skipped'; reason: 'offline' | 'no_auth' | 'already_running'; at: number }

  // ── Push (outbound) ───────────────────────────────────────────────────
  | { type: 'push:item_started'; entityType: SyncEntityType; localUuid: string; attempt: number }
  | { type: 'push:item_success'; entityType: SyncEntityType; localUuid: string; remoteId?: number }
  | {
      type: 'push:item_transient_failure';
      entityType: SyncEntityType;
      localUuid: string;
      attempt: number;
      nextRunAt: number;
      reason: string;
    }
  | {
      type: 'push:item_permanent_failure';
      entityType: SyncEntityType;
      localUuid: string;
      reason: string;
      httpStatus?: number;
    }

  // ── Pull (inbound) ────────────────────────────────────────────────────
  | { type: 'pull:started'; entity: PullEntityKey }
  | {
      type: 'pull:finished';
      entity: PullEntityKey;
      upserted: number;
      skipped: number;
      durationMs: number;
    }
  | { type: 'pull:failed'; entity: PullEntityKey; reason: string; httpStatus?: number }

  // ── Connectivity ──────────────────────────────────────────────────────
  | { type: 'connectivity:online' }
  | { type: 'connectivity:offline' };

export type SyncEventType = SyncEvent['type'];

// ─── Listener type ────────────────────────────────────────────────────────
export type SyncEventListener = (event: SyncEvent) => void;

// ─── Minimal emitter ──────────────────────────────────────────────────────
class SyncEventEmitter {
  private listeners = new Set<SyncEventListener>();
  /** Bounded ring-buffer of the last N events — handy for the dashboard's
   *  "recent activity" panel when a screen mounts mid-sync. */
  private history: SyncEvent[] = [];
  private readonly historyLimit = 100;

  /** Subscribe to ALL events. Returns an unsubscribe function. */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Subscribe to ONE event type. Convenience wrapper. */
  on<TType extends SyncEventType>(
    type: TType,
    listener: (event: Extract<SyncEvent, { type: TType }>) => void,
  ): () => void {
    return this.subscribe(event => {
      if (event.type === type) {
        listener(event as Extract<SyncEvent, { type: TType }>);
      }
    });
  }

  /** Emit an event. Synchronously notifies all listeners (errors swallowed). */
  emit(event: SyncEvent): void {
    // Buffer for late subscribers.
    this.history.push(event);
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Never let a buggy listener bring down the sync engine.
      }
    }
  }

  /** Snapshot the recent event history (immutable copy). */
  getHistory(): readonly SyncEvent[] {
    return [...this.history];
  }

  /** Drop all listeners and history. Mostly for tests. */
  reset(): void {
    this.listeners.clear();
    this.history = [];
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────
export const syncEvents = new SyncEventEmitter();
