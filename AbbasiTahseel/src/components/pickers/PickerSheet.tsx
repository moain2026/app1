/**
 * PickerSheet — base bottom sheet used by every picker (Account, Place,
 * Currency, Group, Tblh).
 *
 * Wave 6-Α: implemented with the platform-built Modal + Pressable backdrop
 * (no @gorhom/bottom-sheet dependency added — keeps bundle slim until we
 * really need swipe-to-dismiss). The visual approximates a bottom sheet:
 * slides up with `animationType="slide"`, occupies ~85% of the screen,
 * dismissible via tap-outside + back press.
 *
 * Props deliberately mirror the surface area of a future @gorhom switch so
 * the migration is trivial (same `visible`, `onClose`, `title`, `children`).
 *
 * Wave 6-Α — UI skeleton component.
 */

import React from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface PickerSheetProps {
  visible: boolean;
  onClose(): void;
  title: string;
  /** Optional subtitle under the title. */
  subtitle?: string;
  /** Body content (typically a SearchBar + FlashList of choices). */
  children: React.ReactNode;
  /** Optional max-height in percent of screen. Default 85%. */
  heightPercent?: number;
}

export function PickerSheet(props: PickerSheetProps): React.JSX.Element {
  const {
    visible,
    onClose,
    title,
    subtitle,
    children,
    heightPercent = 85,
  } = props;
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Inner Pressable absorbs taps so the backdrop doesn't close the
            sheet when tapping inside it. */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              maxHeight: `${heightPercent}%`,
            },
          ]}
        >
          <SafeAreaView style={styles.safe}>
            <View style={styles.handleWrap}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.header}>
              <View style={styles.titleBlock}>
                <Text
                  style={[styles.title, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    style={[styles.subtitle, { color: colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
              >
                <Feather name="x" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.body}>{children}</View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  handle: {
    borderRadius: 2,
    height: 4,
    width: 40,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: spacing[2],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  safe: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
  },
  titleBlock: {
    flex: 1,
    marginEnd: spacing[3],
  },
});
