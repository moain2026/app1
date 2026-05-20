/**
 * PrinterManager.ts — Singleton Bluetooth-Classic transport for thermal printing.
 *
 * Wraps `react-native-bluetooth-classic` so the rest of the app can talk to
 * the Datecs DPP-250 (or any compatible ESC/POS Bluetooth printer) without
 * knowing anything about the native bridge.
 *
 * Lifecycle:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  discover() → list paired devices                           │
 *   │  connect(deviceId) → open SPP socket                        │
 *   │  print(bytes)    → write base64-encoded chunks              │
 *   │  disconnect()    → close socket                             │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * The class also emits high-level events ('connected', 'disconnected',
 * 'error') so the printerStore can update its UI state reactively.
 *
 * ADR-015: We chose `react-native-bluetooth-classic` (Path A in
 * datecs-sdk-research.md) over wrapping the Datecs Java JAR. Rationale:
 * pure TS / no native module to maintain, full control over byte building
 * (required for cp1256 Arabic), works with RN 0.74.5 autolinking.
 */

import { Buffer } from 'buffer';
import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';

import { logger } from '@/utils/logger';

const log = logger.scope('PrinterManager');

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PrinterDevice {
  id: string; // MAC address (Android) — stable identifier.
  name: string; // Human-readable name (e.g. "Datecs DPP250").
  bonded: boolean;
}

export interface PrinterStatus {
  connected: boolean;
  deviceId: string | null;
  deviceName: string | null;
}

export type PrinterEvent = 'connected' | 'disconnected' | 'error';

export interface PrinterErrorPayload {
  message: string;
  cause?: unknown;
}

type Listener<T> = (payload: T) => void;

// ─── Internal: small typed event emitter ─────────────────────────────────────

class TinyEmitter {
  private readonly listeners = new Map<PrinterEvent, Set<Listener<unknown>>>();

  on<T>(event: PrinterEvent, listener: Listener<T>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return () => {
      set?.delete(listener as Listener<unknown>);
    };
  }

  emit<T>(event: PrinterEvent, payload: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        log.warn('listener threw', { event, error: String(err) });
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

// ─── Singleton implementation ────────────────────────────────────────────────

class PrinterManagerImpl {
  private device: BluetoothDevice | null = null;
  private readonly emitter = new TinyEmitter();
  private nativeDisconnectSub: BluetoothEventSubscription | null = null;

  // ─── Discovery ─────────────────────────────────────────────────────────

  /**
   * Return the list of devices paired with this Android (`bondedDevices`).
   * We deliberately don't trigger an active SPP scan because the Datecs
   * DPP-250 must be paired in Android Bluetooth settings first.
   */
  async discover(): Promise<PrinterDevice[]> {
    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        log.warn('discover: bluetooth disabled');
        this.emitter.emit<PrinterErrorPayload>('error', {
          message: 'bluetooth.disabled',
        });
        return [];
      }
      const paired = await RNBluetoothClassic.getBondedDevices();
      const devices: PrinterDevice[] = paired.map((d) => ({
        id: d.address,
        name: d.name,
        bonded: true,
      }));
      log.info('discover ok', { count: devices.length });
      return devices;
    } catch (err) {
      log.warn('discover failed', { error: String(err) });
      this.emitter.emit<PrinterErrorPayload>('error', {
        message: 'discover.failed',
        cause: err,
      });
      return [];
    }
  }

  // ─── Connection ────────────────────────────────────────────────────────

  async connect(deviceId: string): Promise<boolean> {
    try {
      if (this.device !== null && this.device.address === deviceId) {
        log.info('connect: already connected to', { deviceId });
        return true;
      }
      if (this.device !== null) {
        await this.disconnect();
      }
      const device = await RNBluetoothClassic.connectToDevice(deviceId, {
        // Default SPP UUID; the library handles this when unspecified, but
        // we pin it explicitly so future tweaks (e.g. RFCOMM channels) don't
        // silently fail.
        delimiter: '',
        charset: 'utf-8',
      });
      this.device = device;
      this.registerDisconnectListener();
      log.info('connect ok', { deviceId, name: device.name });
      this.emitter.emit<{ deviceId: string; deviceName: string }>(
        'connected',
        { deviceId, deviceName: device.name },
      );
      return true;
    } catch (err) {
      log.warn('connect failed', { deviceId, error: String(err) });
      this.device = null;
      this.emitter.emit<PrinterErrorPayload>('error', {
        message: 'connect.failed',
        cause: err,
      });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device === null) {
      return;
    }
    const deviceId = this.device.address;
    try {
      await this.device.disconnect();
    } catch (err) {
      log.warn('disconnect threw', { error: String(err) });
    } finally {
      this.device = null;
      this.nativeDisconnectSub?.remove();
      this.nativeDisconnectSub = null;
      this.emitter.emit<{ deviceId: string }>('disconnected', { deviceId });
    }
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  getStatus(): PrinterStatus {
    return {
      connected: this.device !== null,
      deviceId: this.device?.address ?? null,
      deviceName: this.device?.name ?? null,
    };
  }

  // ─── Printing ──────────────────────────────────────────────────────────

  /**
   * Write a raw ESC/POS byte stream to the connected printer.
   *
   * The library expects a base64-encoded string (or a regular string with a
   * named charset). We use base64 because our payload is binary (cp1256
   * bytes outside ASCII would corrupt under any text charset).
   *
   * Throws if no device is connected — callers should always check
   * `isConnected()` first.
   */
  async print(escposBytes: Uint8Array): Promise<void> {
    if (this.device === null) {
      throw new Error('printer.notConnected');
    }
    if (escposBytes.length === 0) {
      log.warn('print: empty buffer, skipping');
      return;
    }
    // Chunk to keep individual writes small — some printer firmwares
    // truncate writes > 1024 bytes on RFCOMM.
    const CHUNK = 512;
    for (let offset = 0; offset < escposBytes.length; offset += CHUNK) {
      const chunk = escposBytes.subarray(offset, offset + CHUNK);
      const b64 = Buffer.from(chunk).toString('base64');
      try {
        // The library accepts string or base64; pass explicit charset 'base64'.
        await this.device.write(b64, 'base64');
      } catch (err) {
        log.warn('print failed at chunk', {
          offset,
          chunkSize: chunk.length,
          error: String(err),
        });
        this.emitter.emit<PrinterErrorPayload>('error', {
          message: 'print.failed',
          cause: err,
        });
        throw err;
      }
    }
    log.info('print ok', { bytes: escposBytes.length });
  }

  // ─── Events ────────────────────────────────────────────────────────────

  on<T>(event: PrinterEvent, listener: Listener<T>): () => void {
    return this.emitter.on(event, listener);
  }

  private registerDisconnectListener(): void {
    // The library exposes a global onDeviceDisconnected event (Android only).
    this.nativeDisconnectSub?.remove();
    try {
      this.nativeDisconnectSub = RNBluetoothClassic.onDeviceDisconnected(
        (event) => {
          log.info('native disconnect event', { event: String(event) });
          const deviceId = this.device?.address ?? null;
          this.device = null;
          if (deviceId !== null) {
            this.emitter.emit<{ deviceId: string }>('disconnected', {
              deviceId,
            });
          }
        },
      );
    } catch (err) {
      log.warn('registerDisconnectListener failed', { error: String(err) });
    }
  }
}

// ─── Singleton export ────────────────────────────────────────────────────────

export const PrinterManager = new PrinterManagerImpl();

// Re-export the device type so consumers don't need a second import.
export type { BluetoothDevice };
