/**
 * ProfileScreen — current operator's profile.
 *
 * Wave 6-Α — UI skeleton (mock user + disabled actions).
 *
 * Sections:
 *   • Hero (avatar + name + branch)
 *   • Account info (username, role, branch, last login)
 *   • Actions (change password, change PIN, logout)
 *
 * TODO Wave 6-Β:
 *   • Pull operator data from authStore (Zustand).
 *   • Wire "change password" → calls ReSetPassword endpoint.
 *   • Wire "change PIN" → updates secure storage.
 *   • Wire logout → authStore.logout() + nav reset to Auth.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { AppHeader } from '@/components/layout/AppHeader';
import {
  Card,
  MockBanner,
  SecondaryButton,
  SectionHeader,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

// Mock user — Wave 6-Β: replace with useAuthStore().
const MOCK_USER = {
  name: 'معين العباسي',
  username: 'mu3ayyad',
  role: 'مسؤول الجباية',
  branch: 'الفرع رقم 1',
  lastLogin: '2026-05-21 17:42',
  initials: 'مع',
};

export function ProfileScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <AppHeader title={t('profile.title')} showBack />
      <MockBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ─── Hero ───────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.brandPrimary },
            ]}
          >
            <Text
              style={[styles.avatarText, { color: colors.brandSecondary }]}
            >
              {MOCK_USER.initials}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {MOCK_USER.name}
          </Text>
          <Text style={[styles.userRole, { color: colors.textSecondary }]}>
            {MOCK_USER.role} · {MOCK_USER.branch}
          </Text>
        </View>

        {/* ─── Account info ───────────────────────────────────── */}
        <SectionHeader title={t('profile.accountSection')} />
        <Card variant="outlined" style={styles.card}>
          <Row
            icon="user"
            label={t('profile.username')}
            value={MOCK_USER.username}
          />
          <Divider color={colors.border} />
          <Row
            icon="briefcase"
            label={t('profile.branch')}
            value={MOCK_USER.branch}
          />
          <Divider color={colors.border} />
          <Row
            icon="clock"
            label={t('profile.lastLogin')}
            value={MOCK_USER.lastLogin}
          />
        </Card>

        {/* ─── Actions ────────────────────────────────────────── */}
        <SectionHeader title={t('profile.actionsSection')} />
        <Card variant="outlined" style={styles.card}>
          <View style={styles.actionsList}>
            <SecondaryButton
              title={t('profile.changePassword')}
              icon="key"
              variant="outlined"
              onPress={() => {
                // TODO Wave 6-Β: open change-password sheet → call ReSetPassword.
              }}
              disabled
            />
            <SecondaryButton
              title={t('profile.changePin')}
              icon="lock"
              variant="outlined"
              onPress={() => {
                // TODO Wave 6-Β: open change-PIN sheet → secure storage.
              }}
              disabled
            />
            <SecondaryButton
              title={t('profile.logout')}
              icon="log-out"
              variant="danger"
              onPress={() => {
                // TODO Wave 6-Β: useAuthStore.getState().logout()
              }}
              disabled
            />
          </View>
        </Card>

        <View style={styles.footerHint}>
          <Feather name="info" size={12} color={colors.textTertiary} />
          <Text
            style={[styles.footerHintText, { color: colors.textTertiary }]}
          >
            {t('profile.actionsHint')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row(props: {
  icon: string;
  label: string;
  value: string;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Feather name={props.icon} size={16} color={colors.textTertiary} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
          {props.label}
        </Text>
        <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
          {props.value}
        </Text>
      </View>
    </View>
  );
}

function Divider(props: { color: string }): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: props.color,
        height: StyleSheet.hairlineWidth,
        marginVertical: spacing[1],
      }}
    />
  );
}

const styles = StyleSheet.create({
  actionsList: {
    gap: spacing[2],
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
  },
  card: {
    marginBottom: spacing[2],
  },
  flex: { flex: 1 },
  footerHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  footerHintText: {
    fontSize: 11,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing[4],
    paddingVertical: spacing[4],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    textAlign: 'right',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  scroll: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing[3],
  },
  userRole: {
    fontSize: 13,
    marginTop: 4,
  },
});
