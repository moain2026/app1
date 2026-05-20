/**
 * ReadingsSearchBar — debounced text input that drives the list search.
 *
 * Why debounce: the parent screen rebuilds the WMDB query on every change.
 * Without debounce, each keystroke would re-subscribe to a fresh observable
 * — wasteful when the user is mid-typing. 250ms is a sweet spot that feels
 * responsive without thrashing.
 *
 * Local state vs store: the *display* value is local (so the input stays
 * snappy), and we push the debounced value up to the readings store after
 * the timer fires. A clear-X button skips debouncing for instant reset.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '@/design-system/theme';
import { useReadingsStore } from '@/stores/readingsStore';

const DEBOUNCE_MS = 250;

export function ReadingsSearchBar(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const storeValue = useReadingsStore((s) => s.searchQuery);
  const setSearch = useReadingsStore((s) => s.setSearchQuery);
  const [draft, setDraft] = useState<string>(storeValue);

  // Sync local draft with store when the store is cleared externally
  // (e.g. resetFilters() pressed in the filter sheet).
  useEffect(() => {
    if (storeValue === '' && draft !== '') {
      setDraft('');
    }
    // We intentionally don't fully mirror — that would create a feedback
    // loop. We only catch the explicit "reset to empty" case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeValue]);

  // Push debounced value up.
  useEffect(() => {
    if (draft === storeValue) {
      return;
    }
    const handle = setTimeout(() => {
      setSearch(draft);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [draft, storeValue, setSearch]);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Feather name="search" size={16} color={colors.textTertiary} />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={t('readings.list.searchPlaceholder')}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary }]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {draft.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="clear search"
          onPress={() => {
            setDraft('');
            setSearch('');
          }}
          hitSlop={8}
        >
          <Feather name="x-circle" size={16} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  wrap: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
