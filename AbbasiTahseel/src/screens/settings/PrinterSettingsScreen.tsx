/**
 * PrinterSettingsScreen — إعدادات الطابعة
 *
 * Discover + pair + test-print the Datecs DPP-250 (or any ESC/POS Bluetooth
 * printer paired in Android settings). All the heavy lifting is in
 * `usePrinterStore` / `PrinterManager`; this screen is pure UI.
 *
 * Sections (top → bottom):
 *   1. Status card (connected / disconnected with device name)
 *   2. Scan button → fills the available devices list
 *   3. Device list (pressable rows, selected one highlighted)
 *   4. Connect button (enabled when a device is selected)
 *   5. Test print button (enabled when connected)
 *   6. Disconnect button (destructive, only when connected)
 *   7. Error banner (bottom-anchored) — surfaces lastError + dismiss
 */

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/design-system/theme';
import { usePrinter } from '@/hooks/usePrinter';
import type { PrinterDevice } from '@/services/printer/PrinterManager';

export function PrinterSettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const printer = usePrinter();

  // Reconcile on focus (handles out-of-band disconnects while another screen
  // was active).
  useFocusEffect(
    useCallback(() => {
      // syncFromManager is already called inside usePrinter() on first mount;
      // re-run on every focus via state read.
      // (usePrinterStore.getState().syncFromManager is unnecessary here
      //  because the underlying store subscriber already updates on events.)
    }, []),
  );

  // Surface last-print success as a toast.
  const lastPrintAt = printer.lastPrintAt;
  useEffect(() => {
    if (lastPrintAt !== null) {
      ToastAndroid.show(t('printer.testPrint.success'), ToastAndroid.SHORT);
    }
  }, [lastPrintAt, t]);

  // ─── Action handlers ────────────────────────────────────────────────
  const handleScan = useCallback((): void => {
    void printer.scan();
  }, [printer]);

  const handleConnect = useCallback((): void => {
    void printer.connect();
  }, [printer]);

  const handleDisconnect = useCallback((): void => {
    void printer.disconnect();
  }, [printer]);

  const handleTestPrint = useCallback((): void => {
    void printer.testPrint();
  }, [printer]);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <AppHeader title={t('printer.settings.title')} showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('printer.settings.subtitle')}
        </Text>

        {/* Status card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: printer.isConnected ? colors.success : colors.border,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <Feather
              name={printer.isConnected ? 'check-circle' : 'alert-circle'}
              size={28}
              color={printer.isConnected ? colors.success : colors.textTertiary}
            />
            <View style={styles.statusTextBlock}>
              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                {printer.isConnected
                  ? t('printer.settings.currentPrinter')
                  : t('printer.settings.noPrinterConnected')}
              </Text>
              {printer.isConnected && printer.connectedDeviceName !== null ? (
                <Text
                  style={[styles.statusValue, { color: colors.textSecondary }]}
                  selectable
                >
                  {printer.connectedDeviceName}
                </Text>
              ) : null}
            </View>
          </View>

          {printer.isConnected ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleDisconnect}
              style={[
                styles.outlineButton,
                { borderColor: colors.danger, marginTop: 12 },
              ]}
            >
              <Feather name="x-circle" size={16} color={colors.danger} />
              <Text
                style={[styles.outlineButtonLabel, { color: colors.danger }]}
              >
                {t('printer.connect.disconnect')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Scan + device list */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {t('printer.scan.bondedDevicesTitle')}
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={printer.isScanning || printer.isPairing}
            onPress={handleScan}
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  printer.isScanning || printer.isPairing
                    ? colors.accentSoft
                    : colors.accent,
              },
            ]}
          >
            {printer.isScanning ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Feather name="search" size={16} color={colors.white} />
            )}
            <Text style={[styles.primaryButtonLabel, { color: colors.white }]}>
              {printer.isScanning
                ? t('printer.scan.scanning')
                : t('printer.scan.button')}
            </Text>
          </Pressable>

          {/* Device list */}
          {printer.availableDevices.length === 0 ? (
            <Text
              style={[styles.emptyHint, { color: colors.textTertiary }]}
            >
              {t('printer.scan.empty')}
            </Text>
          ) : (
            <View style={styles.deviceList}>
              {printer.availableDevices.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  isSelected={printer.selectedDevice?.id === device.id}
                  onPress={() => printer.selectDevice(device)}
                />
              ))}
            </View>
          )}

          {/* Connect button — only shows when a device is selected and not
              already connected to it. */}
          {printer.selectedDevice !== null &&
          printer.selectedDevice.id !== printer.connectedDeviceId ? (
            <Pressable
              accessibilityRole="button"
              disabled={printer.isPairing}
              onPress={handleConnect}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: printer.isPairing
                    ? colors.brandSecondaryDark
                    : colors.brandSecondary,
                  marginTop: 12,
                },
              ]}
            >
              {printer.isPairing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Feather name="link" size={16} color={colors.white} />
              )}
              <Text
                style={[styles.primaryButtonLabel, { color: colors.white }]}
              >
                {printer.isPairing
                  ? t('printer.connect.connecting', {
                      name: printer.selectedDevice.name,
                    })
                  : t('printer.connect.button')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Test print */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {t('printer.testPrint.button')}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!printer.isConnected || printer.isPrinting}
            onPress={handleTestPrint}
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  !printer.isConnected || printer.isPrinting
                    ? colors.border
                    : colors.success,
              },
            ]}
          >
            {printer.isPrinting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Feather name="printer" size={16} color={colors.white} />
            )}
            <Text style={[styles.primaryButtonLabel, { color: colors.white }]}>
              {printer.isPrinting
                ? t('printer.testPrint.running')
                : t('printer.testPrint.button')}
            </Text>
          </Pressable>
        </View>

        {/* Error banner */}
        {printer.lastError !== null ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
              },
            ]}
          >
            <Feather
              name="alert-triangle"
              size={18}
              color={colors.danger}
            />
            <Text
              style={[styles.errorText, { color: colors.danger }]}
              selectable
            >
              {/* Best-effort i18n: try the key, fall back to raw message. */}
              {t(printer.lastError, { defaultValue: printer.lastError })}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={printer.clearError}
              style={styles.errorClose}
            >
              <Feather name="x" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Subcomponent: device row ──────────────────────────────────────────

interface DeviceRowProps {
  device: PrinterDevice;
  isSelected: boolean;
  onPress: () => void;
}

function DeviceRow(props: DeviceRowProps): React.JSX.Element {
  const { device, isSelected, onPress } = props;
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.deviceRow,
        {
          backgroundColor: isSelected ? colors.accentSoft : colors.surfaceElevated,
          borderColor: isSelected ? colors.accent : colors.border,
        },
      ]}
    >
      <Feather
        name={isSelected ? 'check-square' : 'square'}
        size={18}
        color={isSelected ? colors.accent : colors.textTertiary}
      />
      <View style={styles.deviceTextBlock}>
        <Text
          style={[styles.deviceName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {device.name || device.id}
        </Text>
        <Text
          style={[styles.deviceId, { color: colors.textTertiary }]}
          numberOfLines={1}
          selectable
        >
          {device.id}
        </Text>
      </View>
      <Feather name="bluetooth" size={16} color={colors.info} />
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'right',
  },
  deviceId: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'left',
  },
  deviceList: {
    gap: 8,
    marginTop: 12,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  deviceRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deviceTextBlock: {
    flex: 1,
  },
  emptyHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'right',
  },
  errorBanner: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    padding: 12,
  },
  errorClose: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  flex: { flex: 1 },
  outlineButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  outlineButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  primaryButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  statusTextBlock: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  statusValue: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'right',
  },
});
