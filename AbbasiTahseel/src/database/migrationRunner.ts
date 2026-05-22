/**
 * Migration Runner Skeleton — العباسي تحصيل (Wave 6-Β)
 *
 * ════════════════════════════════════════════════════════════════════════
 *  Purpose
 * ════════════════════════════════════════════════════════════════════════
 *
 * WatermelonDB already handles `schemaMigrations` automatically when the
 * adapter boots: when `SCHEMA_VERSION` is bumped, WMDB walks the entries
 * in `migrations.ts` and applies the matching `steps` array. This file
 * does NOT replace that — it sits *alongside* it and provides:
 *
 *   1. A central place to PREVIEW which data-level migration would run
 *      on next boot (developer ergonomics — printed to the logger before
 *      WMDB acts).
 *   2. A registry of NON-SCHEMA hooks (data backfills, seed bumps,
 *      one-shot cleanups) that need to run AFTER WMDB applies its own
 *      schema steps. These are things WMDB's `migrations` array cannot
 *      express because they touch app-level state (Zustand, MMKV),
 *      or require querying rows in JS to derive new column values.
 *   3. A versioned guard (`MIGRATION_RUNNER_VERSION`) stored in MMKV so
 *      each hook runs exactly once on a given device.
 *
 * ════════════════════════════════════════════════════════════════════════
 *  Wave 6-Β status
 * ════════════════════════════════════════════════════════════════════════
 *
 * No hooks are registered yet. The schema is still at v1; no migration
 * is pending. This module is the SKELETON so Wave 6-Γ / 6-Δ can wire
 * additive migrations (e.g. new bond columns, user permission int32)
 * without having to architect the runner first.
 *
 * ════════════════════════════════════════════════════════════════════════
 *  Usage (when first migration is added)
 * ════════════════════════════════════════════════════════════════════════
 *
 *   import { runMigrationHooks } from '@/database/migrationRunner';
 *
 *   // In App.tsx, AFTER `database` is imported (WMDB applies schema
 *   // steps on first use), but BEFORE any screen mounts:
 *   await runMigrationHooks();
 *
 * ════════════════════════════════════════════════════════════════════════
 *  Design rules — DO NOT VIOLATE
 * ════════════════════════════════════════════════════════════════════════
 *
 * 1. ADDITIVE ONLY. Never write a hook that drops a column or table.
 *    If a column truly must go, the path is: deprecate → wait 1 release
 *    → write a migration that nulls it → wait 1 more → drop.
 * 2. IDEMPOTENT. Every hook must be safe to re-run. The runner enforces
 *    this with the `targetVersion` guard, but hooks themselves should
 *    additionally short-circuit (e.g. "if column already populated → return").
 * 3. FAIL-OPEN. A hook that throws is logged + skipped, NOT a hard error.
 *    Users with a partial migration can still use the app; the next
 *    launch will retry.
 * 4. NO NETWORK. Hooks run at boot, possibly offline. They may only read
 *    MMKV, the local DB, and constants. If a backfill needs the server,
 *    queue it via `sync_queue` and let the sync engine handle it.
 */

import { MMKV } from 'react-native-mmkv';

import { logger } from '@/utils/logger';

const log = logger.scope('MigrationRunner');

/**
 * Bump this when a new hook is added below. Devices that already ran the
 * previous value will skip every hook whose `targetVersion <= stored`.
 *
 * v0 — Wave 6-Β skeleton (no hooks yet)
 */
export const MIGRATION_RUNNER_VERSION = 0;

/**
 * Dedicated MMKV instance for migration state. Kept separate from the
 * main prefs store so a "clear preferences" action does not accidentally
 * cause every migration to re-run.
 */
const migrationStore = new MMKV({
  id: 'abbasi-tahseel-migrations',
});

const STORAGE_KEY = 'migrationRunnerVersion';

/**
 * A single data-level migration hook. Runs in JS after WMDB has settled.
 */
export interface MigrationHook {
  /** Human-readable identifier (for logs + telemetry). */
  id: string;
  /**
   * The runner state version this hook bumps the device TO once it
   * succeeds. The hook only runs when `stored < targetVersion`.
   */
  targetVersion: number;
  /**
   * Hook body. Must be idempotent: throwing or short-circuiting is fine,
   * but it must NEVER leave the DB in a partial-write state.
   */
  run(): Promise<void>;
}

/**
 * Hook registry — APPEND-ONLY in chronological order.
 *
 * Wave 6-Β: empty. Wave 6-Γ will add entries like:
 *   { id: 'bond-printed-at-backfill', targetVersion: 1, run: ... }
 */
const HOOKS: ReadonlyArray<MigrationHook> = [];

/**
 * Read the persisted runner version. Returns 0 when nothing is stored
 * (i.e. fresh install or wipe).
 */
function getStoredVersion(): number {
  try {
    const raw = migrationStore.getString(STORAGE_KEY);
    if (raw == null) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (err) {
    log.warn('failed to read stored version', {
      message: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Persist a new runner version. Failure here is non-fatal — the next
 * boot will simply re-attempt the (idempotent) hooks.
 */
function setStoredVersion(v: number): void {
  try {
    migrationStore.set(STORAGE_KEY, String(v));
  } catch (err) {
    log.warn('failed to persist version', {
      version: v,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Public entry point. Walks the registered hooks in order, running each
 * one whose `targetVersion` is greater than the device's stored version.
 * Hooks are run sequentially; a failure is logged but does NOT abort
 * subsequent hooks (each carries its own idempotency check, so one bad
 * hook should not block unrelated migrations).
 *
 * Returns the number of hooks that successfully ran. A return value of 0
 * is the steady state once a device is fully migrated.
 */
export async function runMigrationHooks(): Promise<number> {
  if (HOOKS.length === 0) {
    log.debug('no hooks registered — runner is a no-op');
    return 0;
  }

  const stored = getStoredVersion();
  log.info('runner starting', {
    stored,
    targetMax: MIGRATION_RUNNER_VERSION,
    hooks: HOOKS.length,
  });

  let ran = 0;
  let highestAchieved = stored;

  for (const hook of HOOKS) {
    if (hook.targetVersion <= stored) {
      log.debug('skip — already at target', {
        id: hook.id,
        target: hook.targetVersion,
      });
      continue;
    }

    const startedAt = Date.now();
    try {
      await hook.run();
      ran += 1;
      highestAchieved = Math.max(highestAchieved, hook.targetVersion);
      log.info('hook ok', {
        id: hook.id,
        target: hook.targetVersion,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      log.error('hook failed — skipping', {
        id: hook.id,
        target: hook.targetVersion,
        message: err instanceof Error ? err.message : String(err),
      });
      // Do not break — the next hook might be unrelated.
    }
  }

  if (highestAchieved > stored) {
    setStoredVersion(highestAchieved);
  }

  log.info('runner done', { ran, achieved: highestAchieved });
  return ran;
}

/**
 * Test/debug-only helper. Resets the stored version so the runner re-applies
 * every hook on next call. Gated behind `__DEV__` — production callers will
 * throw. Useful when iterating on a new hook.
 */
export function __resetRunnerForTesting(): void {
  if (!__DEV__) {
    throw new Error('reset is only available in dev builds');
  }
  migrationStore.delete(STORAGE_KEY);
  log.warn('runner version reset — every hook will re-run on next boot');
}
