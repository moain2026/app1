/**
 * SyncStatusBadge — pulsing dot + label that mirrors the live sync state.
 *
 * Sources of truth (all from useSyncStore):
 *   isOnline:    boolean      - NetInfo + onConnectivityChange
 *   isSyncing:   boolean      - syncEvents 'engine:started/finished'
 *   pendingCount: number      - DB observable on sync_queue.status='pending'
 *   failedCount: number       - DB observable on sync_queue.status='failed'
 *
 * State derivation (priority order — first match wins):
 *   1. !isOnline                         => offline (gray)
 *   2. isSyncing                         => syncing (amber)
 *   3. failedCount > 0                   => error   (red)
 *   4. otherwise                         => online  (green)
 *
 * Tap behaviour: opens a bottom-sheet-style modal with the detail figures
 * and a "Sync now" CTA. Sheet is dismissed via backdrop or close button.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/forms';
import { useTheme } from '@/design-system/theme';
import { useSyncStore } from '@/stores/syncStore';

interface BadgeVisual {
  dotColor: keyof ReturnType<typeof useTheme>['colors'];
  labelKey: string;
}

function SyncStatusBadgeImpl(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const isOnline = useSyncStore((s) => s.isOnline);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const failedCount = useSyncStore((s) => s.failedCount);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const triggerSync = useSyncStore((s) => s.triggerSync);

  // ─── Visual ────────────────────────────────────────────────────────────
  const visual: BadgeVisual = !isOnline
    ? { dotColor: 'textTertiary', labelKey: 'sync.status.offline' }
    : isSyncing
      ? { dotColor: 'warning', labelKey: 'sync.status.syncing' }
      : failedCount > 0
        ? { dotColor: 'danger', labelKey: 'sync.status.error' }
        : { dotColor: 'success', labelKey: 'sync.status.online' };

  const dotColor = colors[visual.dotColor];

  const formatLastSync = (): string => {
    if (lastSyncAt === null) {
      return t('sync.info.neverSynced');
    }
    return t('sync.info.lastSync', {
      time: lastSyncAt.toLocaleTimeString('ar', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(visual.labelKey)}
        onPress={() => setOpen(true)}
        style={styles.badge}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={[styles.label, { color: colors.white }]}>
          {t(visual.labelKey)}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View
            style={[
              styles.backdrop,
              { backgroundColor: colors.backdrop },
            ]}
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.sheet,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.sheetTitle, { color: colors.textPrimary }]}
                >
                  {t('sync.info.title')}
                </Text>

                <View style={styles.row}>
                  <View
                    style={[styles.dot, { backgroundColor: dotColor }]}
                  />
                  <Text
                    style={[
                      styles.rowText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t(visual.labelKey)}
                  </Text>
                </View>

                <Text style={[styles.body, { color: colors.textSecondary }]}>
                  {pendingCount === 0
                    ? t('sync.info.noPending')
                    : t('sync.info.pendingCount', { count: pendingCount })}
                </Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>
                  {failedCount === 0
                    ? t('sync.info.noFailed')
                    : t('sync.info.failedCount', { count: failedCount })}
                </Text>
                <Text
                  style={[styles.body, { color: colors.textTertiary }]}
                >
                  {formatLastSync()}
                </Text>

                <View style={styles.actions}>
                  <PrimaryButton
                    title={t('sync.actions.syncNow')}
                    onPress={() => {
                      void triggerSync();
                      setOpen(false);
                    }}
                    disabled={!isOnline || isSyncing}
                    loading={isSyncing}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setOpen(false)}
                    style={[
                      styles.closeButton,
                      { borderColor: colors.borderStrong },
                    ]}
                  >
                    <Text
                      style={[
                        styles.closeLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t('sync.actions.close')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

export const SyncStatusBadge = React.memo(SyncStatusBadgeImpl);

const styles = StyleSheet.create({
  actions: {
    gap: 10,
    marginTop: 16,
  },
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  body: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'right',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
  },
  closeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  rowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    width: '100%',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'right',
  },
});
