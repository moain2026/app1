/**
 * ReportTable — generic table renderer for report sub-screens.
 *
 * Each report has a different row shape; this component accepts a column
 * descriptor + a row dataset and renders a sticky header + alternating-row
 * body inside a horizontal ScrollView (so wide tables remain readable on
 * narrow phones).
 *
 * Wave 6-Α — UI skeleton component.
 *
 * TODO Wave 6-Β:
 *   • Replace dataset with WatermelonDB query observables.
 *   • Add column-level sort + filter.
 *   • Add summary footer row (totals/averages).
 *   • Add export-to-PDF / export-to-CSV action.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens/spacing';

export interface ReportColumn<TRow> {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  /** Optional cell renderer override. Receives the row + the raw value. */
  render?: (row: TRow) => React.ReactNode;
  /** Field accessor when `render` is not provided. */
  accessor?: (row: TRow) => string | number;
}

export interface ReportTableProps<TRow> {
  columns: ReportColumn<TRow>[];
  data: TRow[];
  /** Stable key extractor. */
  keyExtractor: (row: TRow, index: number) => string;
  style?: StyleProp<ViewStyle>;
}

export function ReportTable<TRow>(
  props: ReportTableProps<TRow>,
): React.JSX.Element {
  const { columns, data, keyExtractor, style } = props;
  const { colors } = useTheme();

  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);

  return (
    <View
      style={[
        styles.outer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: totalWidth }}>
          {/* ─── Header row ──────────────────────────────────────── */}
          <View
            style={[
              styles.row,
              styles.headerRow,
              { backgroundColor: colors.brandSecondary },
            ]}
          >
            {columns.map((col) => (
              <View
                key={col.key}
                style={[
                  styles.cell,
                  {
                    width: col.width,
                    alignItems:
                      col.align === 'left'
                        ? 'flex-start'
                        : col.align === 'center'
                        ? 'center'
                        : 'flex-end',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.headerText,
                    { color: colors.white },
                  ]}
                  numberOfLines={1}
                >
                  {col.label}
                </Text>
              </View>
            ))}
          </View>

          {/* ─── Body rows ───────────────────────────────────────── */}
          {data.map((row, i) => (
            <View
              key={keyExtractor(row, i)}
              style={[
                styles.row,
                {
                  backgroundColor:
                    i % 2 === 0
                      ? colors.surface
                      : colors.surfaceElevated ?? colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              {columns.map((col) => (
                <View
                  key={col.key}
                  style={[
                    styles.cell,
                    {
                      width: col.width,
                      alignItems:
                        col.align === 'left'
                          ? 'flex-start'
                          : col.align === 'center'
                          ? 'center'
                          : 'flex-end',
                    },
                  ]}
                >
                  {col.render ? (
                    col.render(row)
                  ) : (
                    <Text
                      style={[
                        styles.bodyText,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {col.accessor ? col.accessor(row) : ''}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    fontSize: 12,
  },
  cell: {
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2] + 2,
  },
  headerRow: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  outer: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
});
