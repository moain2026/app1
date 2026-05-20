/**
 * usePrinter — convenience hook for screens that print.
 *
 * Wraps `usePrinterStore` (Zustand) so callers don't need to know about
 * the store split or the underlying `PrinterManager` singleton. On mount,
 * reconciles the store with the live BT socket state via
 * `syncFromManager()` so the UI never shows a stale "connected" badge
 * after a hot reload.
 *
 * Stable function references: the actions returned here are pulled
 * directly from Zustand (which returns stable refs by definition), so
 * this hook is safe to memoize or pass to child components.
 */

import { useCallback, useEffect } from 'react';

import { usePrinterStore } from '@/stores/printerStore';
import type {
  BondReceiptInput,
  DailySummaryInput,
  ReadingReceiptInput,
} from '@/services/printer/receiptBuilders';
import type { PrinterDevice } from '@/services/printer/PrinterManager';

export interface UsePrinterResult {
  // Status
  isScanning: boolean;
  isPairing: boolean;
  isConnected: boolean;
  isPrinting: boolean;
  isBusy: boolean; // any of scanning/pairing/printing

  // Devices
  availableDevices: readonly PrinterDevice[];
  selectedDevice: PrinterDevice | null;
  connectedDeviceName: string | null;
  connectedDeviceId: string | null;

  // Error + last-print
  lastError: string | null;
  lastPrintAt: number | null;

  // Actions
  scan(): Promise<void>;
  selectDevice(device: PrinterDevice | null): void;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  testPrint(): Promise<void>;
  printReading(input: ReadingReceiptInput): Promise<void>;
  printBond(input: BondReceiptInput): Promise<void>;
  printDailySummary(input: DailySummaryInput): Promise<void>;
  clearError(): void;
}

export function usePrinter(): UsePrinterResult {
  const state = usePrinterStore();

  // Reconcile with the singleton on first mount so the store state
  // matches reality after a hot reload.
  useEffect(() => {
    state.syncFromManager();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable wrappers — Zustand returns stable references already, but we
  // wrap with useCallback so consumers' deps arrays stay clean.
  const scan = useCallback(() => state.scanDevices(), [state]);
  const connect = useCallback(() => state.connectToSelected(), [state]);
  const disconnect = useCallback(() => state.disconnect(), [state]);
  const testPrint = useCallback(() => state.testPrint(), [state]);
  const printReading = useCallback(
    (input: ReadingReceiptInput) => state.printReading(input),
    [state],
  );
  const printBond = useCallback(
    (input: BondReceiptInput) => state.printBond(input),
    [state],
  );
  const printDailySummary = useCallback(
    (input: DailySummaryInput) => state.printDailySummary(input),
    [state],
  );

  return {
    isScanning: state.isScanning,
    isPairing: state.isPairing,
    isConnected: state.isConnected,
    isPrinting: state.isPrinting,
    isBusy: state.isScanning || state.isPairing || state.isPrinting,

    availableDevices: state.availableDevices,
    selectedDevice: state.selectedDevice,
    connectedDeviceName: state.connectedDeviceName,
    connectedDeviceId: state.connectedDeviceId,

    lastError: state.lastError,
    lastPrintAt: state.lastPrintAt,

    scan,
    selectDevice: state.selectDevice,
    connect,
    disconnect,
    testPrint,
    printReading,
    printBond,
    printDailySummary,
    clearError: state.clearError,
  };
}
