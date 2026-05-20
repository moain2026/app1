/**
 * Printer Store — Zustand + MMKV persistence
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  TEMPLATE FILE — DO NOT IMPORT FROM src/                              ║
 * ║                                                                            ║
 * ║  Rename to `.ts` and place at:                                            ║
 * ║      src/stores/printerStore.ts                                            ║
 * ║                                                                            ║
 * ║  Also export from src/stores/index.ts.                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * What's persisted
 * ────────────────
 *   • savedDevices       — MAC + display name of every printer the user
 *                          has successfully paired through this app.
 *                          (Survives reinstall via the shared MMKV file
 *                          identifier `abbasi-tahseel-prefs`.)
 *   • lastUsedAddress    — MAC of the last printer that was connected
 *                          successfully. Used to drive auto-reconnect on
 *                          app launch.
 *   • autoConnect        — Boolean toggle exposed in the Settings UI.
 *
 * What's NOT persisted
 * ────────────────────
 * Live transport state (`status`, `lastError`, `connectedDevice`). That's
 * owned by `printerManager` + surfaced via `usePrinter`. Re-deriving it
 * from disk would be wrong — Bluetooth state can change between sessions.
 *
 * Why MMKV (matches existing prefs.ts pattern)
 * ────────────────────────────────────────────
 * The app already uses `react-native-mmkv` for non-secret prefs. Reusing
 * the same MMKV instance ID (`abbasi-tahseel-prefs`) keeps device backups
 * single-file. JSON is fine here — values are small and writes are rare.
 *
 * Convention parity
 * ─────────────────
 * Mirrors `licenseStore.ts` style: explicit `LicenseState`-equivalent
 * interface with `// Actions` divider, `create<...>(...)` factory, and
 * actions defined inline (not factored out). Persistence is done by hand
 * in each setter rather than via `zustand/middleware/persist` so we keep
 * the dependency surface minimal and the behaviour transparent.
 */

import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';

import { logger } from '@/utils/logger';

const log = logger.scope('PrinterStore');

// ─── MMKV instance ───────────────────────────────────────────────────────
// We could re-use `prefs.ts`'s `storage` instance, but importing it would
// create a circular-friendly dependency. Instead we open the same MMKV id
// — react-native-mmkv reuses the underlying file when ids match.
const storage = new MMKV({ id: 'abbasi-tahseel-prefs' });

// ─── Storage keys (centralised) ──────────────────────────────────────────

export const PRINTER_KEYS = {
  SAVED_DEVICES: 'printer.saved_devices', // JSON-encoded SavedDevice[]
  LAST_USED_ADDRESS: 'printer.last_used_address',
  AUTO_CONNECT: 'printer.auto_connect',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────

export interface SavedDevice {
  address: string;
  name: string;
  /** ISO-8601 timestamp of the most recent successful connect. */
  lastUsedAt: string;
}

export interface PrinterStoreState {
  savedDevices: SavedDevice[];
  lastUsedAddress: string | null;
  autoConnect: boolean;

  // ─── Actions ─────────────────────────────────────────────────────────
  /** Idempotent insert (replaces if MAC already exists). Updates lastUsedAt. */
  addSavedDevice(device: { address: string; name: string }): void;
  /** Remove by MAC. No-op if absent. */
  removeSavedDevice(address: string): void;
  /** Set the "last used" pointer. Pass `null` to clear. */
  setLastUsedAddress(address: string | null): void;
  /** Toggle auto-reconnect-on-launch. Persisted. */
  setAutoConnect(value: boolean): void;
  /**
   * Hydrate the store from MMKV. Call once from `App.tsx` (or wherever
   * the other Zustand stores are initialised — `licenseStore.check()` is
   * the closest analogue). Safe to call multiple times.
   */
  hydrate(): void;
}

// ─── Defaults / hydration helpers ────────────────────────────────────────

const DEFAULT_SAVED_DEVICES: SavedDevice[] = [];
const DEFAULT_LAST_USED: string | null = null;
const DEFAULT_AUTO_CONNECT = false;

function readSavedDevices(): SavedDevice[] {
  const raw = storage.getString(PRINTER_KEYS.SAVED_DEVICES);
  if (raw === undefined) return DEFAULT_SAVED_DEVICES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SAVED_DEVICES;
    // Narrow each item defensively — bad disk data must NEVER crash the app.
    const out: SavedDevice[] = [];
    for (const item of parsed) {
      if (
        item !== null &&
        typeof item === 'object' &&
        'address' in item &&
        'name' in item
      ) {
        const candidate = item as Record<string, unknown>;
        if (
          typeof candidate.address === 'string' &&
          typeof candidate.name === 'string'
        ) {
          out.push({
            address: candidate.address,
            name: candidate.name,
            lastUsedAt:
              typeof candidate.lastUsedAt === 'string'
                ? candidate.lastUsedAt
                : new Date(0).toISOString(),
          });
        }
      }
    }
    return out;
  } catch (cause) {
    log.warn('readSavedDevices() — corrupt JSON, resetting', cause);
    return DEFAULT_SAVED_DEVICES;
  }
}

function writeSavedDevices(devices: SavedDevice[]): void {
  storage.set(PRINTER_KEYS.SAVED_DEVICES, JSON.stringify(devices));
}

function readLastUsed(): string | null {
  return storage.getString(PRINTER_KEYS.LAST_USED_ADDRESS) ?? DEFAULT_LAST_USED;
}

function readAutoConnect(): boolean {
  const value = storage.getBoolean(PRINTER_KEYS.AUTO_CONNECT);
  return value ?? DEFAULT_AUTO_CONNECT;
}

// ─── Store ───────────────────────────────────────────────────────────────

export const usePrinterStore = create<PrinterStoreState>((set, get) => ({
  savedDevices: DEFAULT_SAVED_DEVICES,
  lastUsedAddress: DEFAULT_LAST_USED,
  autoConnect: DEFAULT_AUTO_CONNECT,

  addSavedDevice({ address, name }) {
    const now = new Date().toISOString();
    const existing = get().savedDevices;
    const filtered = existing.filter((d) => d.address !== address);
    const updated: SavedDevice[] = [
      ...filtered,
      { address, name, lastUsedAt: now },
    ];
    // Cap at 8 — old kit phones, no point letting this grow unbounded.
    const capped = updated
      .slice()
      .sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1))
      .slice(0, 8);
    writeSavedDevices(capped);
    storage.set(PRINTER_KEYS.LAST_USED_ADDRESS, address);
    set({ savedDevices: capped, lastUsedAddress: address });
  },

  removeSavedDevice(address) {
    const next = get().savedDevices.filter((d) => d.address !== address);
    writeSavedDevices(next);
    // If we removed the "last used" device, clear the pointer too.
    const prevLast = get().lastUsedAddress;
    if (prevLast === address) {
      storage.delete(PRINTER_KEYS.LAST_USED_ADDRESS);
      set({ savedDevices: next, lastUsedAddress: null });
    } else {
      set({ savedDevices: next });
    }
  },

  setLastUsedAddress(address) {
    if (address === null) {
      storage.delete(PRINTER_KEYS.LAST_USED_ADDRESS);
    } else {
      storage.set(PRINTER_KEYS.LAST_USED_ADDRESS, address);
    }
    set({ lastUsedAddress: address });
  },

  setAutoConnect(value) {
    storage.set(PRINTER_KEYS.AUTO_CONNECT, value);
    set({ autoConnect: value });
  },

  hydrate() {
    set({
      savedDevices: readSavedDevices(),
      lastUsedAddress: readLastUsed(),
      autoConnect: readAutoConnect(),
    });
  },
}));

// ─── Selector helpers (optional, for readability in screens) ─────────────

export const selectAutoConnectTarget = (
  s: PrinterStoreState,
): SavedDevice | null => {
  if (!s.autoConnect) return null;
  if (s.lastUsedAddress === null) return null;
  return s.savedDevices.find((d) => d.address === s.lastUsedAddress) ?? null;
};
