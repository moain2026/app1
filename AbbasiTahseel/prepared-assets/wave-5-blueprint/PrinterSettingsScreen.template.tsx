/**
 * PrinterSettingsScreen — إعدادات الطابعة
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  TEMPLATE FILE — DO NOT IMPORT FROM src/                              ║
 * ║                                                                            ║
 * ║  Rename to `.tsx` and place at:                                           ║
 * ║      src/screens/settings/PrinterSettingsScreen.tsx                       ║
 * ║                                                                            ║
 * ║  Then register in the SettingsStack (next to ServerSettingsScreen).      ║
 * ║                                                                            ║
 * ║  Conventions followed (matched against ServerSettingsScreen.tsx):        ║
 * ║    • SafeAreaView + inline navy AppBar (no AppHeader on settings)        ║
 * ║    • useTheme() — never raw palette                                       ║
 * ║    • useTranslation('react-i18next')                                      ║
 * ║    • PrimaryButton from '@/components/forms'                              ║
 * ║    • ToastAndroid for inline feedback                                     ║
 * ║    • RTL — Feather 'arrow-right' is the visual back arrow                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * UI
 * ──
 *   ┌────────────────────────────────────────────────┐
 *   │  ← إعدادات الطابعة                              │  AppBar
 *   ├────────────────────────────────────────────────┤
 *   │ ┌─ الحالة ────────────────────────────────┐    │  Status card
 *   │ │ ● متصل: Datecs-DPP250-AB12              │    │
 *   │ └─────────────────────────────────────────┘    │
 *   │                                                │
 *   │ ┌─ الأجهزة المتاحة ────────────────────────┐   │  Devices list
 *   │ │ Datecs-DPP250-AB12   [ربط]              │   │
 *   │ │ HC-05                [ربط]              │   │
 *   │ └─────────────────────────────────────────┘    │
 *   │                                                │
 *   │ [بحث عن أجهزة جديدة]                          │  Discover button
 *   │ [اختبار الطباعة]                              │  Test-print button
 *   │ [قطع الاتصال]                                 │  Disconnect (if connected)
 *   └────────────────────────────────────────────────┘
 *
 * Permissions
 * ───────────
 * BLUETOOTH_SCAN + BLUETOOTH_CONNECT (Android 12+) must be granted before
 * `RNBluetoothClassic.startDiscovery()` is invoked. The hook requests them
 * lazily via `PermissionsAndroid.request*`. AndroidManifest entries are
 * documented in WAVE_5_INTEGRATION_GUIDE.md.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  PermissionsAndroid,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Feather from 'react-native-vector-icons/Feather';

// Wave-5 deps — install via WAVE_5_INTEGRATION_GUIDE.md
import RNBluetoothClassic, {
  type BluetoothDevice,
} from 'react-native-bluetooth-classic';

import { PrimaryButton } from '@/components/forms';
import { useTheme } from '@/design-system/theme';
import { usePrinter } from '@/hooks/usePrinter';
import { usePrinterStore } from '@/stores/printerStore';
import { receiptPrintService } from '@/services/printer/receiptPrintService';
import { logger } from '@/utils/logger';

const log = logger.scope('PrinterSettingsScreen');

// ─── Local view-model types ──────────────────────────────────────────────

interface DeviceItem {
  address: string;
  name: string;
  bonded: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────

export function PrinterSettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const printer = usePrinter();
  const savedDevices = usePrinterStore((s) => s.savedDevices);
  const addSavedDevice = usePrinterStore((s) => s.addSavedDevice);

  const [bonded, setBonded] = useState<DeviceItem[]>([]);
  const [discovered, setDiscovered] = useState<DeviceItem[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // ─── Initial bonded device load ──────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await RNBluetoothClassic.getBondedDevices();
        if (cancelled) return;
        const items: DeviceItem[] = list.map((d) => ({
          address: d.address,
          name: d.name ?? d.address,
          bonded: true,
        }));
        setBonded(items);
      } catch (cause) {
        log.warn('getBondedDevices failed', cause);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Permissions (Android 12+) ────────────────────────────────────────

  const ensureScanPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const perms: Array<keyof typeof PermissionsAndroid.PERMISSIONS> = [
        'BLUETOOTH_SCAN',
        'BLUETOOTH_CONNECT',
        'ACCESS_FINE_LOCATION', // required on Android 10/11
      ];
      const granted = await PermissionsAndroid.requestMultiple(
        perms.map((p) => PermissionsAndroid.PERMISSIONS[p]),
      );
      const allOk = Object.values(granted).every(
        (v) => v === PermissionsAndroid.RESULTS.GRANTED,
      );
      if (!allOk) {
        ToastAndroid.show(t('printer.errors.permissionDenied'), ToastAndroid.LONG);
      }
      return allOk;
    } catch (cause) {
      log.warn('permissions request failed', cause);
      return false;
    }
  }, [t]);

  // ─── Scan / pair / connect actions ────────────────────────────────────

  const handleScan = useCallback(async (): Promise<void> => {
    if (isScanning) return;
    const ok = await ensureScanPermissions();
    if (!ok) return;
    setIsScanning(true);
    setDiscovered([]);
    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        ToastAndroid.show(
          t('printer.errors.bluetoothDisabled'),
          ToastAndroid.LONG,
        );
        return;
      }
      const found: BluetoothDevice[] = await RNBluetoothClassic.startDiscovery();
      const items: DeviceItem[] = found.map((d) => ({
        address: d.address,
        name: d.name ?? d.address,
        bonded: false,
      }));
      setDiscovered(items);
    } catch (cause) {
      log.warn('scan failed', cause);
      ToastAndroid.show(t('printer.errors.scanFailed'), ToastAndroid.LONG);
    } finally {
      setIsScanning(false);
    }
  }, [ensureScanPermissions, isScanning, t]);

  const handleConnect = useCallback(
    async (device: DeviceItem): Promise<void> => {
      try {
        if (!device.bonded) {
          // Trigger OS pairing first; the lib's pairDevice resolves once
          // the user accepts the system dialog.
          await RNBluetoothClassic.pairDevice(device.address);
        }
        await printer.connect(device.address);
        addSavedDevice({ address: device.address, name: device.name });
      } catch (cause) {
        log.warn('connect failed', cause);
        // Toast already triggered by usePrinter() via the error effect.
      }
    },
    [addSavedDevice, printer],
  );

  const handleTestPrint = useCallback(async (): Promise<void> => {
    if (!printer.isConnected) {
      ToastAndroid.show(t('printer.errors.notConnected'), ToastAndroid.SHORT);
      return;
    }
    try {
      const buffer = receiptPrintService.buildReadingBuffer({
        reading: {
          localUuid: 'TEST-0001',
          noadad: '0000000',
          subscriberName: 'مشترك تجريبي',
          areaName: 'منطقة الاختبار',
          previousValue: 1000,
          currentValue: 1042,
          notes: 'صفحة اختبار الطباعة',
          avgConsumption: 40,
        },
        collector: { fullName: 'اختبار', employeeNumber: '0000' },
        company: { name: 'العباسي تحصيل', branch: 'فرع الاختبار' },
        printedAt: new Date(),
      });
      await printer.print(buffer);
    } catch (cause) {
      log.warn('test print failed', cause);
    }
  }, [printer, t]);

  const handleDisconnect = useCallback(async (): Promise<void> => {
    try {
      await printer.disconnect();
    } catch (cause) {
      log.warn('disconnect failed', cause);
    }
  }, [printer]);

  const onBack = useCallback((): void => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  // ─── Derived list ─────────────────────────────────────────────────────
  // Show saved devices first (they're the common case), then bonded, then
  // freshly-discovered. De-duplicate by address.
  const allDevices: DeviceItem[] = (() => {
    const seen = new Set<string>();
    const out: DeviceItem[] = [];
    const push = (d: DeviceItem): void => {
      if (!seen.has(d.address)) {
        seen.add(d.address);
        out.push(d);
      }
    };
    for (const s of savedDevices) push({ address: s.address, name: s.name, bonded: true });
    for (const b of bonded) push(b);
    for (const d of discovered) push(d);
    return out;
  })();

  // ─── Render ───────────────────────────────────────────────────────────

  const renderDevice = ({ item }: ListRenderItemInfo<DeviceItem>): React.JSX.Element => {
    const isThisConnected =
      printer.isConnected && printer.deviceAddress === item.address;
    return (
      <View
        style={[
          styles.deviceRow,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.deviceMeta}>
          <Text style={[styles.deviceName, { color: colors.textPrimary }]}>
            {item.name}
          </Text>
          <Text style={[styles.deviceAddr, { color: colors.textTertiary }]}>
            {item.address}
          </Text>
        </View>
        {isThisConnected ? (
          <View
            style={[
              styles.connectedPill,
              { backgroundColor: colors.successSoft, borderColor: colors.success },
            ]}
          >
            <Text style={[styles.connectedPillText, { color: colors.success }]}>
              {t('printer.status.connected')}
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleConnect(item)}
            style={[styles.pairBtn, { borderColor: colors.accent }]}
          >
            <Text style={[styles.pairBtnText, { color: colors.accent }]}>
              {item.bonded ? t('printer.action.connect') : t('printer.action.pair')}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Inline AppBar — matches ServerSettingsScreen pattern. */}
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: colors.brandSecondary,
            borderBottomColor: colors.borderStrong,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={onBack}
          style={styles.appBarIcon}
        >
          <Feather name="arrow-right" size={22} color={colors.white} />
        </Pressable>
        <Text style={[styles.appBarTitle, { color: colors.white }]}>
          {t('printer.settings.title')}
        </Text>
        <View style={styles.appBarIcon} />
      </View>

      {/* Status card */}
      <View
        style={[
          styles.statusCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: printer.isConnected
                ? colors.success
                : printer.status === 'connecting' || printer.status === 'reconnecting'
                  ? colors.warning
                  : colors.textTertiary,
            },
          ]}
        />
        <View style={styles.statusText}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
            {t('printer.status.label')}
          </Text>
          <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
            {printer.isConnected
              ? `${t('printer.status.connected')} — ${printer.deviceName ?? ''}`
              : printer.status === 'connecting'
                ? t('printer.status.connecting')
                : printer.status === 'reconnecting'
                  ? t('printer.status.reconnecting')
                  : printer.status === 'error'
                    ? t('printer.status.error')
                    : t('printer.status.disconnected')}
          </Text>
        </View>
      </View>

      {/* Devices list */}
      <FlatList
        data={allDevices}
        keyExtractor={(item) => item.address}
        renderItem={renderDevice}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('printer.devices.title')}
          </Text>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
            {t('printer.devices.empty')}
          </Text>
        }
      />

      {/* Footer actions */}
      <View style={styles.actions}>
        <PrimaryButton
          title={
            isScanning
              ? t('printer.action.scanning')
              : t('printer.action.scan')
          }
          onPress={() => void handleScan()}
          loading={isScanning}
        />
        <PrimaryButton
          title={t('printer.action.testPrint')}
          onPress={() => void handleTestPrint()}
          disabled={!printer.isConnected || printer.isPrinting}
        />
        {printer.isConnected ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleDisconnect()}
            style={[styles.dangerBtn, { borderColor: colors.danger }]}
          >
            {printer.isPrinting ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <Text style={[styles.dangerBtnText, { color: colors.danger }]}>
                {t('printer.action.disconnect')}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  appBar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: 8,
  },
  appBarIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  appBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  connectedPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  connectedPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dangerBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deviceAddr: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'left',
  },
  deviceMeta: {
    flex: 1,
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
    gap: 10,
    marginBottom: 8,
    padding: 12,
  },
  empty: {
    fontSize: 13,
    paddingVertical: 12,
    textAlign: 'center',
  },
  flex: { flex: 1 },
  listContent: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  pairBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pairBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  statusCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
  },
  statusDot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  statusText: {
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'right',
  },
});
