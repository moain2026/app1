/**
 * ReadingRow — single row inside the FlashList on ReadingsScreen.
 *
 * Memo-ised because the list re-renders the whole page on every Zustand
 * state change (search query, filter chip tap). Without memo, scrolling
 * through 25+ rows produces noticeable jank on mid-range devices.
 *
 * Visual layout (RTL — the LayoutEngine flips left↔right automatically):
 *
 *  ┌────────────────────────────────────────────────────────────────────┐
 *  │  [#num · noadad]   اسم المشترك                  current   chevron  │
 *  │                    (الاسم البديل)               consumption        │
 *  │                                                 badges...          │
 *  └────────────────────────────────────────────────────────────────────┘
 *
 * Badges:
 *  • isPosted              → "مرحّلة" (gray)
 *  • isOverConsumption     → "⚠" + red background (warning)
 *  • pushStatus='dirty'    → orange dot
 *  • pushStatus='failed'   → red dot
 *
 * The height is FIXED (76dp) — FlashList relies on `estimatedItemSize`
 * being accurate for smooth scrolling.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import type { Reading } from '@/database/models/Reading';
import { useTheme } from '@/design-system/theme';

export const READING_ROW_HEIGHT = 76;

export interface ReadingRowProps {
  reading: Reading;
  onPress(reading: Reading): void;
}

function ReadingRowImpl({ reading, onPress }: ReadingRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const isOver = reading.isOverConsumption;
  const isPosted = reading.isPosted;
  const hasReading = reading.kh != null;
  const consumption = reading.actualConsumption;

  // Background tint for over-consumption rows — uses the warm danger soft.
  const backgroundTint = isOver ? colors.dangerSoft : 'transparent';

  return (
    <Pressable
      onPress={() => onPress(reading)}
      android_ripple={{ color: colors.border }}
      style={[
        styles.row,
        {
          backgroundColor: backgroundTint,
          borderBottomColor: colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${reading.num} ${reading.name}`}
    >
      {/* Right (visual) cluster — # + name */}
      <View style={styles.identityCluster}>
        <View style={styles.numPill}>
          <Text style={[styles.numText, { color: colors.textOnAccent }]}>
            #{reading.num}
          </Text>
        </View>

        <View style={styles.nameCol}>
          <Text
            style={[styles.name, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {reading.name}
          </Text>
          <Text
            style={[styles.subline, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {reading.namet ? `${reading.namet} · ` : ''}
            {reading.noadad}
          </Text>

          {/* Badges row */}
          <View style={styles.badgeRow}>
            {isPosted ? (
              <Badge
                label={t('readings.list.badges.posted')}
                bg={colors.surfaceElevated}
                fg={colors.textSecondary}
              />
            ) : null}
            {isOver ? (
              <Badge
                label="⚠"
                bg={colors.danger}
                fg={colors.textOnAccent}
              />
            ) : null}
            {reading.pushStatus === 'dirty' ? (
              <Badge
                label={t('readings.list.badges.dirty')}
                bg={colors.warning}
                fg={colors.textOnBrand}
              />
            ) : null}
            {reading.pushStatus === 'failed' ? (
              <Badge
                label={t('readings.list.badges.failed')}
                bg={colors.danger}
                fg={colors.textOnAccent}
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* Left (visual) cluster — current reading + chevron */}
      <View style={styles.readingCluster}>
        <Text
          style={[
            styles.currentReading,
            {
              color: hasReading
                ? isOver
                  ? colors.danger
                  : colors.textPrimary
                : colors.textTertiary,
            },
          ]}
        >
          {hasReading ? String(reading.kh) : t('readings.list.unread')}
        </Text>
        {consumption !== null ? (
          <Text style={[styles.consumption, { color: colors.textTertiary }]}>
            +{consumption}
          </Text>
        ) : null}
        <Feather
          name="chevron-left"
          size={18}
          color={colors.textTertiary}
          style={styles.chevron}
        />
      </View>
    </Pressable>
  );
}

interface BadgeProps {
  label: string;
  bg: string;
  fg: string;
}

function Badge({ label, bg, fg }: BadgeProps): React.JSX.Element {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export const ReadingRow = React.memo(ReadingRowImpl);

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    marginRight: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 4,
  },
  consumption: {
    fontSize: 11,
    marginTop: 2,
  },
  currentReading: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
  },
  identityCluster: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  nameCol: {
    flex: 1,
  },
  numPill: {
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    minWidth: 44,
    paddingHorizontal: 8,
  },
  numText: {
    fontSize: 12,
    fontWeight: '800',
  },
  readingCluster: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: READING_ROW_HEIGHT,
    paddingHorizontal: 12,
  },
  subline: {
    fontSize: 11,
    marginTop: 1,
    textAlign: 'right',
  },
});
