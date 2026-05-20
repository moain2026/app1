/**
 * Printer Store — العباسي تحصيل
 *
 * Zustand slice that owns the UI state for printer discovery, pairing,
 * connection lifecycle, and per-receipt print operations.
 *
 * The store wraps the `PrinterManager` singleton (services/printer) and
 * surfaces a screen-friendly state machine:
 *
 *   isScanning  → discover() in progress
 *   isPairing   → connect() in progress
 *   isConnected → PrinterManager.isConnected()
 *   selectedDevice / availableDevices → discovery results
 *   lastError   → human-readable i18n key
 *   lastPrintAt → wall-clock ms of last successful print
 *   isPrinting  → any printReading / printBond / testPrint in flight
 *
 * Actions never throw — they catch internally and set `lastError`. The
 * screen layer subscribes to `lastError` and shows a snackbar / retry UI.
 *
 * ADR-015: chosen wrapper is `react-native-bluetooth-classic@~1.73.0-rc.12`
 * (Path A in datecs-sdk-research.md). The Datecs DPP-250 must be paired in
 * Android Bluetooth Settings first; this store only enumerates bonded
 * devices and connects via the SPP UUID.
 */

import { create } from 'zustand';

import { logger } from '@/utils/logger';
import {
  PrinterManager,
  type PrinterDevice,
} from '@/services/printer/PrinterManager';
import {
  buildBondReceipt,
  buildDailySummary,
  buildReadingReceipt,
  type BondReceiptInput,
  type DailySummaryInput,
  type ReadingReceiptInput,
} from '@/services/printer/receiptBuilders';
import { buildTestPage } from '@/services/printer/testPage';

const log = logger.scope('PrinterStore');

// ─── State shape ──────────────────────────────────────────────────────────

export interface PrinterState {
  // ─── Discovery / connection ──────────────────────────────────────────
  isScanning: boolean;
  isPairing: boolean;
  isConnected: boolean;
  isPrinting: boolean;

  availableDevices: readonly PrinterDevice[];
  selectedDevice: PrinterDevice | null;
  connectedDeviceId: string | null;
  connectedDeviceName: string | null;

  lastError: string | null;
  lastPrintAt: number | null;

  // ─── Actions ─────────────────────────────────────────────────────────
  scanDevices(): Promise<void>;
  selectDevice(device: PrinterDevice | null): void;
  connectToSelected(): Promise<boolean>;
  disconnect(): Promise<void>;

  testPrint(): Promise<void>;
  printReading(input: ReadingReceiptInput): Promise<void>;
  printBond(input: BondReceiptInput): Promise<void>;
  printDailySummary(input: DailySummaryInput): Promise<void>;

  clearError(): void;
  syncFromManager(): void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function errorMessageFor(rawError: unknown): string {
  if (rawError instanceof Error) {
    if (rawError.message === 'printer.notConnected') {
      return 'printer.error.notConnected';
    }
    return rawError.message;
  }
  return String(rawError);
}

// ─── Store ────────────────────────────────────────────────────────────────

export const usePrinterStore = create<PrinterState>((set, get) => ({
  isScanning: false,
  isPairing: false,
  isConnected: false,
  isPrinting: false,

  availableDevices: [],
  selectedDevice: null,
  connectedDeviceId: null,
  connectedDeviceName: null,

  lastError: null,
  lastPrintAt: null,

  // ─── Discovery ─────────────────────────────────────────────────────────
  async scanDevices() {
    if (get().isScanning) {
      return;
    }
    set({ isScanning: true, lastError: null });
    try {
      const devices = await PrinterManager.discover();
      set({ availableDevices: devices, isScanning: false });
      log.info('scan ok', { count: devices.length });
    } catch (err) {
      log.warn('scan failed', { error: String(err) });
      set({
        isScanning: false,
        availableDevices: [],
        lastError: errorMessageFor(err),
      });
    }
  },

  selectDevice(device) {
    set({ selectedDevice: device, lastError: null });
  },

  // ─── Connection ────────────────────────────────────────────────────────
  async connectToSelected() {
    const dev = get().selectedDevice;
    if (dev === null) {
      set({ lastError: 'printer.error.noDeviceSelected' });
      return false;
    }
    if (get().isPairing) {
      return false;
    }
    set({ isPairing: true, lastError: null });
    try {
      const ok = await PrinterManager.connect(dev.id);
      const status = PrinterManager.getStatus();
      set({
        isPairing: false,
        isConnected: status.connected,
        connectedDeviceId: status.deviceId,
        connectedDeviceName: status.deviceName,
        lastError: ok ? null : 'printer.error.connectFailed',
      });
      return ok;
    } catch (err) {
      log.warn('connect failed', { error: String(err) });
      set({
        isPairing: false,
        isConnected: false,
        connectedDeviceId: null,
        connectedDeviceName: null,
        lastError: errorMessageFor(err),
      });
      return false;
    }
  },

  async disconnect() {
    try {
      await PrinterManager.disconnect();
    } catch (err) {
      log.warn('disconnect threw', { error: String(err) });
    }
    set({
      isConnected: false,
      connectedDeviceId: null,
      connectedDeviceName: null,
    });
  },

  // ─── Printing ─────────────────────────────────────────────────────────
  async testPrint() {
    if (get().isPrinting) {
      return;
    }
    if (!PrinterManager.isConnected()) {
      set({ lastError: 'printer.error.notConnected' });
      return;
    }
    set({ isPrinting: true, lastError: null });
    try {
      const bytes = buildTestPage();
      await PrinterManager.print(bytes);
      set({ isPrinting: false, lastPrintAt: Date.now() });
    } catch (err) {
      log.warn('testPrint failed', { error: String(err) });
      set({ isPrinting: false, lastError: errorMessageFor(err) });
    }
  },

  async printReading(input) {
    if (get().isPrinting) {
      return;
    }
    if (!PrinterManager.isConnected()) {
      set({ lastError: 'printer.error.notConnected' });
      return;
    }
    set({ isPrinting: true, lastError: null });
    try {
      const bytes = buildReadingReceipt(input);
      await PrinterManager.print(bytes);
      set({ isPrinting: false, lastPrintAt: Date.now() });
    } catch (err) {
      log.warn('printReading failed', { error: String(err) });
      set({ isPrinting: false, lastError: errorMessageFor(err) });
    }
  },

  async printBond(input) {
    if (get().isPrinting) {
      return;
    }
    if (!PrinterManager.isConnected()) {
      set({ lastError: 'printer.error.notConnected' });
      return;
    }
    set({ isPrinting: true, lastError: null });
    try {
      const bytes = buildBondReceipt(input);
      await PrinterManager.print(bytes);
      set({ isPrinting: false, lastPrintAt: Date.now() });
    } catch (err) {
      log.warn('printBond failed', { error: String(err) });
      set({ isPrinting: false, lastError: errorMessageFor(err) });
    }
  },

  async printDailySummary(input) {
    if (get().isPrinting) {
      return;
    }
    if (!PrinterManager.isConnected()) {
      set({ lastError: 'printer.error.notConnected' });
      return;
    }
    set({ isPrinting: true, lastError: null });
    try {
      const bytes = buildDailySummary(input);
      await PrinterManager.print(bytes);
      set({ isPrinting: false, lastPrintAt: Date.now() });
    } catch (err) {
      log.warn('printDailySummary failed', { error: String(err) });
      set({ isPrinting: false, lastError: errorMessageFor(err) });
    }
  },

  clearError() {
    set({ lastError: null });
  },

  /**
   * Reconcile store state with the actual PrinterManager singleton. Called
   * on mount of PrinterSettingsScreen and whenever the screen regains focus
   * so the UI reflects out-of-band disconnects.
   */
  syncFromManager() {
    const status = PrinterManager.getStatus();
    set({
      isConnected: status.connected,
      connectedDeviceId: status.deviceId,
      connectedDeviceName: status.deviceName,
    });
  },
}));

// ─── Subscribe to manager events ──────────────────────────────────────────
//
// Wire native-side disconnects (cable yanked, printer powered off, etc.) into
// the store so the UI reflects reality without polling. We deliberately do
// not subscribe inside the store factory itself because Zustand stores are
// expected to be pure; instead we register on first import.

PrinterManager.on<{ deviceId: string; deviceName: string }>(
  'connected',
  ({ deviceId, deviceName }) => {
    usePrinterStore.setState({
      isConnected: true,
      connectedDeviceId: deviceId,
      connectedDeviceName: deviceName,
    });
  },
);

PrinterManager.on<{ deviceId: string }>('disconnected', () => {
  usePrinterStore.setState({
    isConnected: false,
    connectedDeviceId: null,
    connectedDeviceName: null,
  });
});

PrinterManager.on<{ message: string }>('error', ({ message }) => {
  usePrinterStore.setState({ lastError: message });
});
