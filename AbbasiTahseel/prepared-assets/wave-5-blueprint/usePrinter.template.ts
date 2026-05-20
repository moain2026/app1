/**
 * usePrinter — React hook for the printer subsystem
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  TEMPLATE FILE — DO NOT IMPORT FROM src/                              ║
 * ║                                                                            ║
 * ║  Rename to `.ts` and place at:                                            ║
 * ║      src/hooks/usePrinter.ts                                              ║
 * ║                                                                            ║
 * ║  (or src/services/printer/usePrinter.ts — either path is fine as long    ║
 * ║   as it stays separate from printerManager.ts, which must remain         ║
 * ║   framework-agnostic for unit-testability.)                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Bridges the imperative `printerManager` singleton with React's render
 * model. Components consume this hook to get:
 *
 *   • Reactive state: { status, isConnected, isPrinting, lastError,
 *                       deviceAddress, deviceName }
 *   • Memoised actions:        connect, print, disconnect
 *   • Side-effects:            toast notifications on transitions
 *
 * Toast convention
 * ────────────────
 * The existing codebase (see ServerSettingsScreen.tsx) uses RN's built-in
 * `ToastAndroid` directly. This hook follows that convention — no extra
 * dependency. If a cross-platform toast lib is added later, swap the body
 * of `notify()` in one place.
 *
 * Why a hook AND a Zustand store?
 * ───────────────────────────────
 * The Zustand `printerStore` (separate file) owns *persisted* state:
 * paired devices, last-used device, auto-connect flag. Live transport
 * state (status, error) is ephemeral and lives here — re-deriving it
 * from the singleton's event stream avoids two sources of truth.
 *
 * Dependencies
 * ────────────
 *   • printerManager.ts        — the singleton
 *   • react-i18next            — to translate error keys
 *   • RN ToastAndroid          — built-in
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { ToastAndroid } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  printerManager,
  type PrinterStatus,
  type PrinterStatusSnapshot,
} from '@/services/printer/printerManager';
import { logger } from '@/utils/logger';

const log = logger.scope('usePrinter');

// ─── Public shape ────────────────────────────────────────────────────────

export interface UsePrinterResult {
  status: PrinterStatus;
  isConnected: boolean;
  isPrinting: boolean;
  /** Pre-translated string (or `null`). */
  lastError: string | null;
  deviceAddress: string | null;
  deviceName: string | null;

  connect(address: string): Promise<void>;
  print(buffer: Uint8Array): Promise<void>;
  disconnect(): Promise<void>;
}

// ─── External-store glue ─────────────────────────────────────────────────
//
// `useSyncExternalStore` subscribes to the imperative manager. The
// `getSnapshot` callback must return a *referentially stable* value
// whenever the underlying state hasn't changed — `printerManager.getStatus()`
// satisfies that by bumping `revision` on every change and returning the
// same object identity in between.

function subscribe(onStoreChange: () => void): () => void {
  return printerManager.on('status', onStoreChange);
}

function getSnapshot(): PrinterStatusSnapshot {
  return printerManager.getStatus();
}

// ─── Hook ────────────────────────────────────────────────────────────────

export function usePrinter(): UsePrinterResult {
  const { t } = useTranslation();

  const snap = useSyncExternalStore(subscribe, getSnapshot);

  // Remember which error we already toasted so re-renders don't spam the
  // user with the same message.
  const lastToastedErrorRef = useRef<string | null>(null);

  // Translate i18n keys to user-facing strings exactly once per snapshot.
  const translatedError: string | null =
    snap.lastError === null ? null : translateError(snap.lastError, t);

  // Toast on freshly-arrived errors.
  useEffect(() => {
    if (translatedError !== null && translatedError !== lastToastedErrorRef.current) {
      lastToastedErrorRef.current = translatedError;
      ToastAndroid.show(translatedError, ToastAndroid.LONG);
    }
    if (translatedError === null) {
      lastToastedErrorRef.current = null;
    }
  }, [translatedError]);

  // ─── Actions ───────────────────────────────────────────────────────────

  const connect = useCallback(
    async (address: string): Promise<void> => {
      try {
        await printerManager.connect(address);
        ToastAndroid.show(t('printer.toast.connected'), ToastAndroid.SHORT);
      } catch (cause) {
        // The manager has already set lastError; the effect above will toast.
        log.warn('connect() failed', cause);
        throw cause;
      }
    },
    [t],
  );

  const print = useCallback(
    async (buffer: Uint8Array): Promise<void> => {
      try {
        await printerManager.print(buffer);
        ToastAndroid.show(t('printer.toast.printed'), ToastAndroid.SHORT);
      } catch (cause) {
        log.warn('print() failed', cause);
        throw cause;
      }
    },
    [t],
  );

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await printerManager.disconnect();
      ToastAndroid.show(t('printer.toast.disconnected'), ToastAndroid.SHORT);
    } catch (cause) {
      log.warn('disconnect() failed', cause);
      throw cause;
    }
  }, [t]);

  return {
    status: snap.status,
    isConnected: snap.status === 'connected' || snap.status === 'printing',
    isPrinting: snap.status === 'printing',
    lastError: translatedError,
    deviceAddress: snap.deviceAddress,
    deviceName: snap.deviceName,
    connect,
    print,
    disconnect,
  };
}

// ─── Error key → user string ─────────────────────────────────────────────
//
// The manager emits i18n keys (e.g. `printer.errors.bluetoothDisabled`).
// If a key isn't found in the bundle the fallback is the key itself, which
// is acceptable but ugly — we provide a hardcoded last-ditch fallback.

function translateError(
  keyOrMessage: string,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (keyOrMessage.startsWith('printer.errors.')) {
    const translated = t(keyOrMessage, { defaultValue: '' });
    if (translated !== '') return translated;
    return t('printer.errors.unknown', { defaultValue: 'حدث خطأ في الطابعة' });
  }
  // Free-form messages bubble up unchanged.
  return keyOrMessage;
}
