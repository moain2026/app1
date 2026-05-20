/**
 * ReadingStatBadge — global aggregates pill under the search bar.
 *
 * Shows the four canonical counts:
 *   إجمالي : مرحّلة | معلّقة | زائدة
 *
 * Refreshes via a DB observable so any save/sync auto-updates the badge.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { database } from '@/database';
import type { Reading } from '@/database/models/Reading';
import { useTheme } from '@/design-system/theme';

interface Stats {
  total: number;
  posted: number;
  pending: number;
  over: number;
}

const ZERO: Stats = { total: 0, posted: 0, pending: 0, over: 0 };

export function ReadingStatBadge(): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats>(ZERO);

  useEffect(() => {
    const collection = database.collections.get<Reading>('readings');

    // Subscribe to changes on the whole collection. Each change triggers a
    // recount across all 4 buckets. WMDB internally debounces collection
    // changes so we don't pay per-row recount cost.
    const sub = collection
      .query()
      .observe()
      .subscribe((rows) => {
        let posted = 0;
        let pending = 0;
        let over = 0;
        for (const r of rows) {
          if (r.cas !== 0) {
            posted += 1;
          } else {
            pending += 1;
          }
          if (r.kh != null && r.kh - r.ks > r.asts) {
            over += 1;
          }
        }
        setStats({ total: rows.length, posted, pending, over });
      });
    return () => sub.unsubscribe();
  }, []);

  // Suppress the badge until the DB has at least one row — avoids a flicker
  // of "0/0/0/0" on cold start while the seeder is still inserting.
  if (stats.total === 0) {
    // We still render a sized placeholder so the layout doesn't jump when
    // the first batch lands.
    return (
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.dim, { color: colors.textTertiary }]}>
          {t('readings.list.stats.total', { count: 0 })}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        {t('readings.list.stats.total', { count: stats.total })}
      </Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.text, { color: colors.success }]}>
        {t('readings.list.stats.posted', { count: stats.posted })}
      </Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.text, { color: colors.warning }]}>
        {t('readings.list.stats.pending', { count: stats.pending })}
      </Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.text, { color: colors.danger }]}>
        {t('readings.list.stats.over', { count: stats.over })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 12,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dim: {
    flex: 1,
    fontSize: 11,
    textAlign: 'center',
  },
  divider: {
    height: 12,
    width: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
