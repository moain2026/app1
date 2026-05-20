/**
 * ScannerScreen — ماسح الباركود (vision-camera)
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  TEMPLATE FILE — DO NOT IMPORT FROM src/                              ║
 * ║                                                                            ║
 * ║  Rename to `.tsx` and place at:                                           ║
 * ║      src/screens/main/ScannerScreen.tsx                                    ║
 * ║                                                                            ║
 * ║  Register in MainStack with the route name 'Scanner'. Pass the           ║
 * ║  `onScan` parameter via navigation:                                       ║
 * ║      navigation.navigate('Scanner', {                                    ║
 * ║        onScan: (value) => form.setValue('noadad', value),                ║
 * ║      });                                                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Behaviour
 * ─────────
 *   • Asks for camera permission on mount; shows a friendly Arabic
 *     placeholder while denied / requesting.
 *   • Auto-focuses (vision-camera handles this natively).
 *   • Fires `onScan(value)` on the FIRST successful detection, then calls
 *     `navigation.goBack()`. Guards against multi-fire via a ref flag.
 *   • Supports common 1D codes (CODE128, EAN13, EAN8) + QR. Configure
 *     the `codeTypes` array to narrow the set per use-case.
 *
 * Permission strategy
 * ───────────────────
 * vision-camera ships its own permission API
 * (`Camera.requestCameraPermission()`); we use that exclusively. Note that
 * the iOS plist isn't relevant here — this app is Android-only.
 *
 * Performance note
 * ────────────────
 * `useCodeScanner` runs on the camera thread, NOT the JS thread. To call
 * any JS function (state setter, navigation) we must hop back through
 * `runOnJS()` from react-native-reanimated. This is the documented
 * vision-camera pattern.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

// Wave-5 deps
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
  type Code,
  type CodeType,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';

import { useTheme } from '@/design-system/theme';
import { logger } from '@/utils/logger';

const log = logger.scope('ScannerScreen');

// ─── Route params ────────────────────────────────────────────────────────
//
// The screen is opened by other screens that want a scanned value back
// (e.g. NewReadingScreen, NewBondScreen). We avoid passing functions
// through React Navigation params on principle — they break deep-linking
// and serialization checks — but React Navigation explicitly allows it
// when the screen is purely modal-style, as it is here.
//
// Alternative: write the result to a navigation store and read it after
// goBack(). Either pattern is acceptable; this template uses the
// callback approach for clarity.

export interface ScannerRouteParams {
  onScan(value: string, type: CodeType): void;
  /**
   * Restrict accepted code types. Default = ['code-128', 'ean-13', 'ean-8', 'qr'].
   * Useful when a screen only wants QR (e.g. bond reprint) or only 1D
   * (e.g. meter serial).
   */
  codeTypes?: CodeType[];
  /** Header title override; defaults to `t('scanner.title')`. */
  title?: string;
}

type ScannerRoute = RouteProp<
  { Scanner: ScannerRouteParams },
  'Scanner'
>;

// ─── Component ───────────────────────────────────────────────────────────

export function ScannerScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<ScannerRoute>();

  const acceptedTypes: CodeType[] =
    route.params.codeTypes ?? ['code-128', 'ean-13', 'ean-8', 'qr'];

  const [permission, setPermission] = useState<
    'pending' | 'granted' | 'denied'
  >('pending');

  // Guard against multiple fires from the same scan session.
  const consumedRef = useRef<boolean>(false);

  const device = useCameraDevice('back');

  // ─── Permission flow ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const current = await Camera.getCameraPermissionStatus();
        if (current === 'granted') {
          if (!cancelled) setPermission('granted');
          return;
        }
        const result = await Camera.requestCameraPermission();
        if (cancelled) return;
        setPermission(result === 'granted' ? 'granted' : 'denied');
      } catch (cause) {
        log.error('camera permission failed', cause);
        if (!cancelled) setPermission('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Result handler (JS-thread side) ──────────────────────────────────

  const handleScannedValue = useCallback(
    (value: string, type: CodeType): void => {
      if (consumedRef.current) return;
      consumedRef.current = true;
      try {
        route.params.onScan(value, type);
      } catch (cause) {
        log.error('onScan callback threw', cause);
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    },
    [navigation, route.params],
  );

  // ─── Code scanner (camera-thread worklet → JS via runOnJS) ────────────

  const codeScanner = useCodeScanner({
    codeTypes: acceptedTypes,
    onCodeScanned: (codes: Code[]) => {
      'worklet';
      if (codes.length === 0) return;
      const first = codes[0];
      const v = first.value;
      const codeType = first.type;
      if (v === undefined || v === null || v.length === 0) return;
      runOnJS(handleScannedValue)(v, codeType);
    },
  });

  // ─── Back navigation ──────────────────────────────────────────────────

  const onBack = useCallback((): void => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  // ─── Render ───────────────────────────────────────────────────────────

  const title = route.params.title ?? t('scanner.title');

  // (1) Permission pending → spinner.
  if (permission === 'pending') {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <TopBar title={title} onBack={onBack} colors={colors} t={t} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {t('scanner.requestingPermission')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // (2) Permission denied → instructions + Settings shortcut.
  if (permission === 'denied') {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <TopBar title={title} onBack={onBack} colors={colors} t={t} />
        <View style={styles.center}>
          <Feather name="camera-off" size={48} color={colors.textTertiary} />
          <Text style={[styles.permTitle, { color: colors.textPrimary }]}>
            {t('scanner.permissionRequired')}
          </Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {t('scanner.permissionHint')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openSettings()}
            style={[styles.settingsBtn, { borderColor: colors.accent }]}
          >
            <Text style={[styles.settingsBtnText, { color: colors.accent }]}>
              {t('scanner.openSettings')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // (3) Device not ready (e.g. no back camera, emulator).
  if (device === undefined || device === null) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <TopBar title={title} onBack={onBack} colors={colors} t={t} />
        <View style={styles.center}>
          <Feather name="alert-triangle" size={48} color={colors.warning} />
          <Text style={[styles.permTitle, { color: colors.textPrimary }]}>
            {t('scanner.noCamera')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // (4) Granted + device ready → live camera.
  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <TopBar title={title} onBack={onBack} colors={colors} t={t} />
      <View style={styles.cameraWrap}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
          // vision-camera enables continuous AF by default; no extra config needed.
        />
        {/* Reticle overlay */}
        <View pointerEvents="none" style={styles.overlay}>
          <View
            style={[
              styles.reticle,
              { borderColor: colors.brandPrimary },
            ]}
          />
          <Text style={[styles.hint, { color: colors.white }]}>
            {t('scanner.alignHint')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Small reused header (avoid the AppHeader because Drawer isn't in
//      scope for modal-style screens). ─────────────────────────────────

interface TopBarProps {
  title: string;
  onBack(): void;
  colors: ReturnType<typeof useTheme>['colors'];
  t: ReturnType<typeof useTranslation>['t'];
}

function TopBar({ title, onBack, colors, t }: TopBarProps): React.JSX.Element {
  return (
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
      <Text style={[styles.appBarTitle, { color: colors.white }]}>{title}</Text>
      <View style={styles.appBarIcon} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  cameraWrap: {
    flex: 1,
    position: 'relative',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  flex: { flex: 1, backgroundColor: '#000' },
  hint: {
    fontSize: 13,
    marginTop: 18,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  muted: {
    fontSize: 13,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  reticle: {
    borderRadius: 18,
    borderWidth: 3,
    height: 220,
    width: 260,
  },
  settingsBtn: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  settingsBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
