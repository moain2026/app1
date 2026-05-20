/**
 * Printer Manager — Datecs DPP-250 (Bluetooth Classic SPP)
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  TEMPLATE FILE — DO NOT IMPORT FROM src/                              ║
 * ║                                                                            ║
 * ║  Rename to `.ts` and place at:                                            ║
 * ║      src/services/printer/printerManager.ts                                ║
 * ║                                                                            ║
 * ║  This file uses `.template.ts` so the TypeScript compiler ignores it      ║
 * ║  (see tsconfig.json `exclude`). Imports below reference real modules     ║
 * ║  that the main agent must create or verify alongside this file.          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Responsibility
 * ──────────────
 * Owns the **single physical Bluetooth connection** to a Datecs DPP-250
 * thermal printer. Provides a small, framework-agnostic API:
 *
 *   await printerManager.connect(deviceAddress);
 *   await printerManager.print(buffer);
 *   printerManager.getStatus();
 *   await printerManager.disconnect();
 *
 * Anything React-flavoured (toast, navigation, hooks) lives in
 * `usePrinter.ts` — this file deliberately has zero RN-UI dependencies.
 *
 * Why a singleton
 * ───────────────
 * Bluetooth SPP is a process-wide resource; opening two sockets to the
 * same MAC simultaneously corrupts the framed ESC/POS stream. The class
 * is module-default-exported so every caller gets the same instance.
 *
 * Auto-reconnect
 * ──────────────
 *   • Triggers only when a connection that was previously *open* drops
 *     mid-session (NOT on the first failed connect attempt).
 *   • Up to MAX_RECONNECT_RETRIES (3) attempts.
 *   • Back-off: 500 ms × attempt number (500 / 1000 / 1500 ms).
 *   • Each attempt re-resolves the device by stored MAC address.
 *
 * Event emitter
 * ─────────────
 * Lightweight typed listener registry (NOT Node's EventEmitter — RN's
 * jest setup doesn't ship `events`). Consumers subscribe with:
 *     const unsub = printerManager.on('status', (s) => ...);
 *
 * Sources
 * ───────
 *   • react-native-bluetooth-classic@1.73.0-rc.12 (Wave-5 pick — see
 *     prepared-assets/printer/datecs-sdk-research.md §3).
 *   • Datecs ESC/POS framing — prepared-assets/printer/escpos-commands-reference.md
 */

// ─── External deps (must be installed in Wave 5) ─────────────────────────
// npm i react-native-bluetooth-classic@1.73.0-rc.12
import RNBluetoothClassic, {
  BluetoothDevice,
  BluetoothEventListener,
  BluetoothEventSubscription,
  StateChangeEvent,
} from 'react-native-bluetooth-classic';

// ─── Project deps ────────────────────────────────────────────────────────
import { logger } from '@/utils/logger';

const log = logger.scope('PrinterManager');

// ─── Public types ────────────────────────────────────────────────────────

export type PrinterStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'printing'
  | 'reconnecting'
  | 'error';

export interface PrinterStatusSnapshot {
  status: PrinterStatus;
  deviceAddress: string | null;
  deviceName: string | null;
  /** Last error message (i18n key OR raw string). `null` when no error. */
  lastError: string | null;
  /** Monotonic counter — bumps on every status change. */
  revision: number;
}

export type PrinterEventName = 'status' | 'error' | 'disconnect';

export interface PrinterEventMap {
  status: PrinterStatusSnapshot;
  error: { message: string; cause: unknown };
  disconnect: { reason: 'user' | 'lost' | 'failure' };
}

export type PrinterListener<E extends PrinterEventName> = (
  payload: PrinterEventMap[E],
) => void;

// ─── Tunables ────────────────────────────────────────────────────────────

/** Maximum auto-reconnect attempts after a mid-session drop. */
const MAX_RECONNECT_RETRIES = 3;

/** Connection delimiter for streaming reads (Datecs ESC/POS is unframed). */
const SPP_DELIMITER = '\n';

/** Chunk size for write() — Datecs firmware misbehaves on > 1 KiB writes. */
const WRITE_CHUNK_SIZE = 1024;

/** Tiny pause between chunks to dodge "broken pipe" on weak BT links. */
const WRITE_CHUNK_GAP_MS = 30;

// ─── Implementation ──────────────────────────────────────────────────────

class PrinterManager {
  private device: BluetoothDevice | null = null;
  private deviceAddress: string | null = null;
  private deviceName: string | null = null;
  private status: PrinterStatus = 'disconnected';
  private lastError: string | null = null;
  private revision = 0;

  private reconnectAttempts = 0;
  private reconnectInFlight = false;
  private intentionalDisconnect = false;

  private readonly listeners: {
    [E in PrinterEventName]: Set<PrinterListener<E>>;
  } = {
    status: new Set(),
    error: new Set(),
    disconnect: new Set(),
  };

  private stateSub: BluetoothEventSubscription | null = null;
  private deviceDisconnectSub: BluetoothEventSubscription | null = null;

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /**
   * Connect to a Bluetooth device by MAC address. Pairs implicitly via the
   * OS bond if a pairing prompt has already been accepted by the user.
   *
   * Throws on hard failure (BT off, device out of range, refused socket).
   * The first failed connect does NOT trigger auto-reconnect — only drops
   * after a successful connect do.
   */
  async connect(deviceAddress: string): Promise<void> {
    if (this.status === 'connected' && this.deviceAddress === deviceAddress) {
      log.debug('connect() — already connected to', deviceAddress);
      return;
    }

    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.lastError = null;
    this.setStatus('connecting');

    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        throw new Error('printer.errors.bluetoothDisabled');
      }

      // Resolve to a BluetoothDevice handle.
      const bonded = await RNBluetoothClassic.getBondedDevices();
      const target = bonded.find((d) => d.address === deviceAddress) ?? null;
      if (target === null) {
        throw new Error('printer.errors.deviceNotPaired');
      }

      const connected = await target.connect({
        delimiter: SPP_DELIMITER,
        // CONNECTOR_TYPE 'rfcomm' is the library default; do NOT override
        // unless the printer firmware reports a non-standard UUID.
      });

      if (!connected) {
        throw new Error('printer.errors.connectRefused');
      }

      this.device = target;
      this.deviceAddress = target.address;
      this.deviceName = target.name ?? target.address;
      this.attachSubscriptions();
      this.setStatus('connected');
      log.info('connect() — connected to', this.deviceName);
    } catch (cause) {
      const message = this.toErrorKey(cause, 'printer.errors.connectFailed');
      this.lastError = message;
      this.setStatus('error');
      this.emitError(message, cause);
      throw cause;
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.reconnectAttempts = MAX_RECONNECT_RETRIES; // disable any pending reconnect
    this.detachSubscriptions();

    const device = this.device;
    if (device !== null) {
      try {
        await device.disconnect();
      } catch (cause) {
        log.warn('disconnect() — non-fatal failure', cause);
      }
    }
    this.device = null;
    this.deviceAddress = null;
    this.deviceName = null;
    this.lastError = null;
    this.setStatus('disconnected');
    this.emit('disconnect', { reason: 'user' });
  }

  /**
   * Write a raw ESC/POS byte stream to the printer.
   * The buffer is chunked so we never exceed Datecs' 1-KiB framing window.
   */
  async print(buffer: Uint8Array): Promise<void> {
    if (this.device === null || this.status !== 'connected') {
      throw new Error('printer.errors.notConnected');
    }

    this.setStatus('printing');
    try {
      const total = buffer.length;
      for (let offset = 0; offset < total; offset += WRITE_CHUNK_SIZE) {
        const chunk = buffer.slice(offset, offset + WRITE_CHUNK_SIZE);
        // library accepts either a base64 string or a Buffer — Uint8Array
        // is converted to base64 because the JS-side `Buffer` polyfill
        // isn't guaranteed on RN 0.74 without `react-native-buffer`.
        const base64 = bytesToBase64(chunk);
        const ok = await this.device.write(base64);
        if (!ok) {
          throw new Error('printer.errors.writeFailed');
        }
        if (offset + WRITE_CHUNK_SIZE < total) {
          await sleep(WRITE_CHUNK_GAP_MS);
        }
      }
      this.setStatus('connected');
    } catch (cause) {
      const message = this.toErrorKey(cause, 'printer.errors.printFailed');
      this.lastError = message;
      this.setStatus('error');
      this.emitError(message, cause);
      throw cause;
    }
  }

  getStatus(): PrinterStatusSnapshot {
    return {
      status: this.status,
      deviceAddress: this.deviceAddress,
      deviceName: this.deviceName,
      lastError: this.lastError,
      revision: this.revision,
    };
  }

  // ─── Event subscription ────────────────────────────────────────────────

  on<E extends PrinterEventName>(
    event: E,
    listener: PrinterListener<E>,
  ): () => void {
    this.listeners[event].add(listener);
    return () => {
      this.listeners[event].delete(listener);
    };
  }

  // ─── Auto-reconnect ────────────────────────────────────────────────────

  private async tryReconnect(): Promise<void> {
    if (this.reconnectInFlight) {
      return;
    }
    if (this.intentionalDisconnect) {
      return;
    }
    if (this.deviceAddress === null) {
      return;
    }
    if (this.reconnectAttempts >= MAX_RECONNECT_RETRIES) {
      log.warn('tryReconnect() — retries exhausted');
      this.setStatus('error');
      this.lastError = 'printer.errors.reconnectExhausted';
      this.emit('disconnect', { reason: 'failure' });
      return;
    }

    this.reconnectInFlight = true;
    this.reconnectAttempts += 1;
    const attempt = this.reconnectAttempts;
    const delay = 500 * attempt;
    this.setStatus('reconnecting');
    log.info(
      `tryReconnect() — attempt ${attempt}/${MAX_RECONNECT_RETRIES} in ${delay}ms`,
    );

    await sleep(delay);

    const address = this.deviceAddress;
    try {
      await this.connect(address);
      this.reconnectAttempts = 0;
    } catch (cause) {
      log.warn(`tryReconnect() — attempt ${attempt} failed`, cause);
      // Try again from inside the catch — connect() resets reconnectAttempts
      // back to 0 inside its own block, which we DON'T want here.
      this.reconnectInFlight = false;
      void this.tryReconnect();
      return;
    } finally {
      this.reconnectInFlight = false;
    }
  }

  // ─── Native subscriptions ──────────────────────────────────────────────

  private attachSubscriptions(): void {
    this.detachSubscriptions();

    const onState: BluetoothEventListener<StateChangeEvent> = (event) => {
      if (event.enabled === false && this.status === 'connected') {
        log.warn('Bluetooth turned off — treating as drop');
        this.handleDrop('lost');
      }
    };
    this.stateSub = RNBluetoothClassic.onStateChanged(onState);

    if (this.device !== null) {
      this.deviceDisconnectSub = RNBluetoothClassic.onDeviceDisconnected(
        (event) => {
          if (event.address === this.deviceAddress) {
            log.warn('Device disconnected event received');
            this.handleDrop('lost');
          }
        },
      );
    }
  }

  private detachSubscriptions(): void {
    if (this.stateSub !== null) {
      this.stateSub.remove();
      this.stateSub = null;
    }
    if (this.deviceDisconnectSub !== null) {
      this.deviceDisconnectSub.remove();
      this.deviceDisconnectSub = null;
    }
  }

  private handleDrop(reason: 'lost' | 'failure'): void {
    if (this.intentionalDisconnect) {
      return;
    }
    this.device = null;
    this.emit('disconnect', { reason });
    void this.tryReconnect();
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private setStatus(next: PrinterStatus): void {
    this.status = next;
    this.revision += 1;
    this.emit('status', this.getStatus());
  }

  private emit<E extends PrinterEventName>(
    event: E,
    payload: PrinterEventMap[E],
  ): void {
    for (const listener of this.listeners[event]) {
      try {
        listener(payload);
      } catch (cause) {
        log.error('listener threw', cause);
      }
    }
  }

  private emitError(message: string, cause: unknown): void {
    this.emit('error', { message, cause });
  }

  private toErrorKey(cause: unknown, fallback: string): string {
    if (cause instanceof Error && cause.message.startsWith('printer.errors.')) {
      return cause.message;
    }
    return fallback;
  }
}

// ─── Bytes → base64 (no Node Buffer dependency) ──────────────────────────
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  // global.btoa is available on RN's JSI bridge (Hermes ships it since 0.70).
  // Fallback path is intentionally omitted; if a target lacks it, the main
  // agent should pull in `react-native-base64` and replace this function.
  const g = globalThis as unknown as { btoa(s: string): string };
  return g.btoa(binary);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Module-level singleton ──────────────────────────────────────────────
export const printerManager = new PrinterManager();
export type { PrinterManager };
