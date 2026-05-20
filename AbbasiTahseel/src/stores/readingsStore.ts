/**
 * Readings Store — العباسي تحصيل
 *
 * Zustand slice that owns the filter/sort/UI state for the Readings list.
 * It does NOT own the data — the rows come from a reactive WMDB observable
 * built by `readingsRepository.observeReadings()` in the screen layer.
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │   readingsStore   (filter, sort, error, lastSyncAt — Zustand)   │
 *   └────────┬─────────────────────────────────────┬──────────────────┘
 *            │ filters object                      │ actions
 *            ▼                                     ▼
 *   ┌──────────────────┐               ┌──────────────────────┐
 *   │ ReadingsScreen   │ observe()────►│ readingsRepository   │ → DB
 *   │ + FlashList      │               │  + sync helpers      │
 *   └──────────────────┘               └──────────────────────┘
 *
 * Why Zustand and not URL-params: the readings list is short-lived; users
 * leave it via tap (ReadingDetail) then return, expecting the same filters
 * to be preserved. A module-level Zustand store gives us that for free
 * without leaking into navigation params.
 */

import { create } from 'zustand';

import type {
  ReadingSortBy,
  ReadingSortOrder,
  ReadingStatusFilter,
  ReadingsQueryFilters,
} from '@/services/repository/readingsRepository';
import { logger } from '@/utils/logger';

const log = logger.scope('ReadingsStore');

// ─── State shape ──────────────────────────────────────────────────────────

export type ReadingsFilterKey = 'area' | 'book' | 'group' | 'status';

export interface ReadingsState {
  // ─── Filters ───────────────────────────────────────────────────────
  searchQuery: string;
  area: number | null;
  book: number | null;
  group: number | null;
  status: ReadingStatusFilter;

  // ─── Sort ──────────────────────────────────────────────────────────
  sortBy: ReadingSortBy;
  sortOrder: ReadingSortOrder;

  // ─── Sync UI state ────────────────────────────────────────────────
  isRefreshing: boolean;
  lastSyncAt: number | null;
  error: string | null;

  // ─── Actions ──────────────────────────────────────────────────────
  setSearchQuery(q: string): void;
  setFilter(key: ReadingsFilterKey, value: number | ReadingStatusFilter | null): void;
  resetFilters(): void;
  setSort(by: ReadingSortBy, order: ReadingSortOrder): void;
  setRefreshing(value: boolean): void;
  setError(message: string | null): void;
  markSynced(): void;

  /** Convenience: returns the current filter object in repository shape. */
  getFilters(): ReadingsQueryFilters;
}

// ─── Defaults ─────────────────────────────────────────────────────────────

const INITIAL_FILTERS: Pick<
  ReadingsState,
  'searchQuery' | 'area' | 'book' | 'group' | 'status' | 'sortBy' | 'sortOrder'
> = {
  searchQuery: '',
  area: null,
  book: null,
  group: null,
  status: 'all',
  sortBy: 'num',
  sortOrder: 'asc',
};

// ─── Store ────────────────────────────────────────────────────────────────

export const useReadingsStore = create<ReadingsState>((set, get) => ({
  ...INITIAL_FILTERS,
  isRefreshing: false,
  lastSyncAt: null,
  error: null,

  setSearchQuery(q) {
    set({ searchQuery: q });
  },

  setFilter(key, value) {
    if (key === 'status') {
      // Narrow: status is a string union, not a number.
      const next: ReadingStatusFilter =
        value === null ? 'all' : (value as ReadingStatusFilter);
      set({ status: next });
      return;
    }
    // area / book / group are number | null.
    const next: number | null = typeof value === 'number' ? value : null;
    set({ [key]: next } as Partial<ReadingsState>);
  },

  resetFilters() {
    set({ ...INITIAL_FILTERS });
  },

  setSort(by, order) {
    set({ sortBy: by, sortOrder: order });
  },

  setRefreshing(value) {
    set({ isRefreshing: value });
  },

  setError(message) {
    if (message !== null) {
      log.warn('readings error surfaced', { message });
    }
    set({ error: message });
  },

  markSynced() {
    set({ lastSyncAt: Date.now(), error: null, isRefreshing: false });
  },

  getFilters() {
    const s = get();
    return {
      searchQuery: s.searchQuery,
      area: s.area,
      book: s.book,
      group: s.group,
      status: s.status,
      sortBy: s.sortBy,
      sortOrder: s.sortOrder,
    };
  },
}));
