/**
 * AccountPicker — bottom sheet listing subscribers (مشتركين), searchable.
 *
 * Mock-only data source in Wave 6-Α.
 *
 *   const [showPicker, setShowPicker] = useState(false);
 *   const [accountId, setAccountId] = useState<number | null>(null);
 *   ...
 *   <AccountPicker
 *     visible={showPicker}
 *     onClose={() => setShowPicker(false)}
 *     onSelect={(acct) => { setAccountId(acct.id); setShowPicker(false); }}
 *   />
 *
 * Wave 6-Α — UI skeleton component.
 */

import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { EmptyState, SearchBar } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';
import { MOCK_ACCOUNTS, type MockAccount } from '@/mocks/accounts';

import { PickerSheet } from './PickerSheet';

export interface AccountPickerProps {
  visible: boolean;
  onClose(): void;
  onSelect(account: MockAccount): void;
  /** Limit to a specific place (optional). */
  placeId?: number;
  /** Only show active accounts (default true). */
  activeOnly?: boolean;
}

export function AccountPicker(props: AccountPickerProps): React.JSX.Element {
  const { visible, onClose, onSelect, placeId, activeOnly = true } = props;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let list = MOCK_ACCOUNTS;
    if (activeOnly) list = list.filter((a) => a.active);
    if (placeId != null) list = list.filter((a) => a.placeId === placeId);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.num.toLowerCase().includes(q) ||
          (a.nameT?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [query, placeId, activeOnly]);

  return (
    <PickerSheet
      visible={visible}
      onClose={onClose}
      title={t('pickers.account.title')}
      subtitle={t('pickers.account.subtitle', { count: filtered.length })}
    >
      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('pickers.account.searchPlaceholder')}
          autoFocus
        />
      </View>
      {filtered.length === 0 ? (
        <EmptyState
          icon="user-x"
          title={t('pickers.account.emptyTitle')}
          subtitle={t('pickers.account.emptySubtitle')}
        />
      ) : (
        <FlashList<MockAccount>
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={72}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed
                    ? colors.surfaceElevated ?? colors.surface
                    : colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.rowBody}>
                <Text
                  style={[styles.name, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[styles.meta, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  #{item.num} · {item.placeName} · {item.groupName}
                </Text>
              </View>
              {item.balance !== 0 ? (
                <Text
                  style={[
                    styles.balance,
                    {
                      color:
                        item.balance > 0
                          ? colors.danger ?? '#C41E24'
                          : colors.success ?? '#1A7F3D',
                    },
                  ]}
                >
                  {Math.abs(item.balance).toLocaleString('ar-EG')} ر.ي
                </Text>
              ) : null}
              <Feather
                name="chevron-left"
                size={16}
                color={colors.textTertiary}
              />
            </Pressable>
          )}
        />
      )}
    </PickerSheet>
  );
}

const styles = StyleSheet.create({
  balance: {
    fontSize: 12,
    fontWeight: '700',
    marginEnd: spacing[2],
  },
  list: {
    paddingBottom: spacing[6],
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  rowBody: {
    flex: 1,
  },
  searchWrap: {
    marginBottom: spacing[2],
  },
});
