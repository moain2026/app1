/**
 * Bonds Store — UI-facing state for the bonds list & new-bond wizard
 * ============================================================================
 *  TEMPLATE FILE — DO NOT IMPORT FROM src/
 *
 *  Final path:  src/stores/bondsStore.ts
 *  Barrel:      add `export { useBondsStore } from './bondsStore';` to
 *               src/stores/index.ts
 * ============================================================================
 *
 * Scope of this store
 * -------------------
 * UI-only state:
 *   - search / filter / sort selections
 *   - currently-selected bond (for detail screen lazy-load)
 *   - the in-flight DRAFT used by NewBondScreen (multi-step wizard)
 *
 * NOT in this store:
 *   - the bond list itself (comes from `bondsRepository.observeBonds()`
 *     via WatermelonDB observables)
 *   - per-bond payment/reading data (queried lazily through the model
 *     relations on demand)
 *
 * Why a separate store and not local component state
 * --------------------------------------------------
 * 1. The wizard is multi-screen — Step 1 selects readings, Step 2 enters
 *    payments, Step 3 reviews, Step 4 confirms. Sharing state across
 *    those routes without prop-drilling needs a store.
 * 2. The filter/sort selections persist across tab switches (the user
 *    expects the same view when they come back). Local state would reset.
 *
 * Persistence
 * -----------
 * Filter/sort/searchQuery are persisted to MMKV (same instance id as
 * the other stores: `abbasi-tahseel-prefs`). Draft state is intentionally
 * NOT persisted — abandoning the app mid-wizard should NOT silently
 * resurrect a half-built bond. The wizard explicitly calls `startDraft()`
 * on mount.
 *
 * Pattern source
 * --------------
 * Mirrors `licenseStore.ts` and `syncStore.ts` style:
 *   - explicit interface above `create<...>(...)`
 *   - inline actions (no factored sub-modules)
 *   - hand-rolled MMKV reads/writes (no `persist` middleware)
 */

import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';

import type { BondPaymentMethod, CurrencyId } from '@/database/models/BondPayment';
import { logger } from '@/utils/logger';

const log = logger.scope('BondsStore');

// ─── MMKV instance — shared with prefs.ts via the same id ────────────────
const storage = new MMKV({ id: 'abbasi-tahseel-prefs' });

// ─── Storage keys ────────────────────────────────────────────────────────
export const BONDS_STORE_KEYS = {
  SEARCH:      'bonds.search',
  FILTER:      'bonds.filter',
  SORT_KEY:    'bonds.sort_key',
  SORT_ORDER:  'bonds.sort_order',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────

/**
 * Filter keys map 1:1 to `bondsRepository.observeBonds({ kind: ... })`
 * AND to the i18n keys at `bonds.list.filter.*`.
 */
export type BondsFilterKey =
  | 'all'
  | 'unsynced'
  | 'today'
  | 'printed'
  | 'voided';

export type BondsSortKey = 'date' | 'amount' | 'subscriber';
export type SortOrder = 'asc' | 'desc';

/**
 * A draft payment row in the wizard. Mirrors the shape that
 * `bondsRepository.addPayment()` accepts.
 */
export interface DraftPayment {
  /** ephemeral id, NOT a UUID — local row key for the wizard list. */
  rowKey: string;
  paymentMethod: BondPaymentMethod;
  amount: number;
  currency: CurrencyId;
  referenceNo: string | null;
  notes: string | null;
}

/**
 * A draft reading link. The `readingId` is the Watermelon local id of
 * the Reading model row; `readingNum` is the legacy sequence number
 * (cached for fast lookup); `subscriberName` is denormalised here so
 * the wizard UI doesn't need to re-query the reading on every render.
 */
export interface DraftReadingLink {
  readingId: string;
  readingNum: number;
  subscriberName: string;
  /** Amount applied against this reading (legacy `valuer`). */
  amount: number;
  currency: CurrencyId;
}

// ─── Store state ─────────────────────────────────────────────────────────

export interface BondsStoreState {
  // ── List view state ─────────────────────────────────────────────────
  searchQuery: string;
  filterKey: BondsFilterKey;
  sortKey: BondsSortKey;
  sortOrder: SortOrder;

  // ── Detail view state ───────────────────────────────────────────────
  selectedBondId: string | null;

  // ── Wizard / draft state ────────────────────────────────────────────
  isDraftMode: boolean;
  draftBondNo: number | null;
  draftAccountId: number | null;
  draftAccountName: string | null;
  draftCurrency: CurrencyId;
  draftNotes: string | null;
  draftPayments: DraftPayment[];
  draftReadingLinks: DraftReadingLink[];
  draftStep: 1 | 2 | 3 | 4;

  // ── Actions ─────────────────────────────────────────────────────────
  setSearchQuery(q: string): void;
  setFilter(key: BondsFilterKey): void;
  toggleSort(key: BondsSortKey): void;
  selectBond(localUuid: string | null): void;

  startDraft(seed?: Partial<DraftSeed>): void;
  setDraftStep(step: 1 | 2 | 3 | 4): void;
  setDraftMeta(meta: Partial<DraftMeta>): void;
  addDraftPayment(payment: Omit<DraftPayment, 'rowKey'>): void;
  removeDraftPayment(rowKey: string): void;
  addDraftReadingLink(link: DraftReadingLink): void;
  removeDraftReadingLink(readingId: string): void;
  setDraftReadingAmount(readingId: string, amount: number): void;
  resetDraft(): void;

  hydrate(): void;
}

export interface DraftSeed {
  bondNo: number | null;
  accountId: number | null;
  accountName: string | null;
  currency: CurrencyId;
  notes: string | null;
}

export interface DraftMeta {
  bondNo: number | null;
  accountId: number | null;
  accountName: string | null;
  currency: CurrencyId;
  notes: string | null;
}

// ─── Defaults ────────────────────────────────────────────────────────────

const DEFAULT_FILTER: BondsFilterKey = 'all';
const DEFAULT_SORT_KEY: BondsSortKey = 'date';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const EMPTY_DRAFT: Pick<
  BondsStoreState,
  | 'isDraftMode'
  | 'draftBondNo'
  | 'draftAccountId'
  | 'draftAccountName'
  | 'draftCurrency'
  | 'draftNotes'
  | 'draftPayments'
  | 'draftReadingLinks'
  | 'draftStep'
> = {
  isDraftMode: false,
  draftBondNo: null,
  draftAccountId: null,
  draftAccountName: null,
  draftCurrency: 'IQD',
  draftNotes: null,
  draftPayments: [],
  draftReadingLinks: [],
  draftStep: 1,
};

// ─── Hydration helpers ───────────────────────────────────────────────────

function readFilter(): BondsFilterKey {
  const v = storage.getString(BONDS_STORE_KEYS.FILTER);
  switch (v) {
    case 'all':
    case 'unsynced':
    case 'today':
    case 'printed':
    case 'voided':
      return v;
    default:
      return DEFAULT_FILTER;
  }
}

function readSortKey(): BondsSortKey {
  const v = storage.getString(BONDS_STORE_KEYS.SORT_KEY);
  return v === 'amount' || v === 'subscriber' ? v : DEFAULT_SORT_KEY;
}

function readSortOrder(): SortOrder {
  return storage.getString(BONDS_STORE_KEYS.SORT_ORDER) === 'asc' ? 'asc' : 'desc';
}

// ─── Store ───────────────────────────────────────────────────────────────

export const useBondsStore = create<BondsStoreState>((set, get) => ({
  searchQuery: '',
  filterKey: DEFAULT_FILTER,
  sortKey: DEFAULT_SORT_KEY,
  sortOrder: DEFAULT_SORT_ORDER,

  selectedBondId: null,

  ...EMPTY_DRAFT,

  // ── List view actions ────────────────────────────────────────────────

  setSearchQuery(q) {
    storage.set(BONDS_STORE_KEYS.SEARCH, q);
    set({ searchQuery: q });
  },

  setFilter(key) {
    storage.set(BONDS_STORE_KEYS.FILTER, key);
    set({ filterKey: key });
  },

  /**
   * Toggling the same sort key flips the order; selecting a new key
   * resets the order to 'desc' (most recent/largest first — the
   * default field operator's expectation).
   */
  toggleSort(key) {
    const current = get();
    if (current.sortKey === key) {
      const next = current.sortOrder === 'desc' ? 'asc' : 'desc';
      storage.set(BONDS_STORE_KEYS.SORT_ORDER, next);
      set({ sortOrder: next });
    } else {
      storage.set(BONDS_STORE_KEYS.SORT_KEY, key);
      storage.set(BONDS_STORE_KEYS.SORT_ORDER, 'desc');
      set({ sortKey: key, sortOrder: 'desc' });
    }
  },

  selectBond(localUuid) {
    set({ selectedBondId: localUuid });
  },

  // ── Wizard actions ───────────────────────────────────────────────────

  startDraft(seed) {
    log.info('startDraft', seed ?? {});
    set({
      ...EMPTY_DRAFT,
      isDraftMode: true,
      draftBondNo: seed?.bondNo ?? null,
      draftAccountId: seed?.accountId ?? null,
      draftAccountName: seed?.accountName ?? null,
      draftCurrency: seed?.currency ?? 'IQD',
      draftNotes: seed?.notes ?? null,
    });
  },

  setDraftStep(step) {
    set({ draftStep: step });
  },

  setDraftMeta(meta) {
    const current = get();
    if (!current.isDraftMode) {
      log.warn('setDraftMeta called outside draft mode — ignored');
      return;
    }
    set({
      draftBondNo: meta.bondNo ?? current.draftBondNo,
      draftAccountId: meta.accountId ?? current.draftAccountId,
      draftAccountName: meta.accountName ?? current.draftAccountName,
      draftCurrency: meta.currency ?? current.draftCurrency,
      draftNotes: meta.notes ?? current.draftNotes,
    });
  },

  addDraftPayment(payment) {
    const current = get();
    if (!current.isDraftMode) return;
    const rowKey = `dp_${Date.now()}_${current.draftPayments.length}`;
    set({
      draftPayments: [...current.draftPayments, { rowKey, ...payment }],
    });
  },

  removeDraftPayment(rowKey) {
    const current = get();
    set({
      draftPayments: current.draftPayments.filter((p) => p.rowKey !== rowKey),
    });
  },

  addDraftReadingLink(link) {
    const current = get();
    if (!current.isDraftMode) return;
    // Idempotent: replace if same readingId already linked.
    const filtered = current.draftReadingLinks.filter(
      (l) => l.readingId !== link.readingId,
    );
    set({ draftReadingLinks: [...filtered, link] });
  },

  removeDraftReadingLink(readingId) {
    const current = get();
    set({
      draftReadingLinks: current.draftReadingLinks.filter(
        (l) => l.readingId !== readingId,
      ),
    });
  },

  setDraftReadingAmount(readingId, amount) {
    const current = get();
    set({
      draftReadingLinks: current.draftReadingLinks.map((l) =>
        l.readingId === readingId ? { ...l, amount } : l,
      ),
    });
  },

  resetDraft() {
    log.info('resetDraft');
    set(EMPTY_DRAFT);
  },

  hydrate() {
    set({
      searchQuery: storage.getString(BONDS_STORE_KEYS.SEARCH) ?? '',
      filterKey: readFilter(),
      sortKey: readSortKey(),
      sortOrder: readSortOrder(),
    });
  },
}));

// ─── Derived selectors (pure, exported for screens) ──────────────────────

/**
 * Per-currency total of the current draft's payments. Returned as a Map
 * to preserve insertion order (IQD first, then USD, then anything else).
 *
 * Used by NewBondScreen Step 3 (review) to compare against the sum of
 * reading-link amounts before enabling the Confirm button.
 */
export function selectDraftPaymentTotals(
  s: BondsStoreState,
): Map<CurrencyId, number> {
  const out = new Map<CurrencyId, number>();
  for (const p of s.draftPayments) {
    out.set(p.currency, (out.get(p.currency) ?? 0) + p.amount);
  }
  return out;
}

export function selectDraftReadingTotals(
  s: BondsStoreState,
): Map<CurrencyId, number> {
  const out = new Map<CurrencyId, number>();
  for (const l of s.draftReadingLinks) {
    out.set(l.currency, (out.get(l.currency) ?? 0) + l.amount);
  }
  return out;
}

/**
 * Validation predicate: do the payment totals match the reading totals
 * for EVERY currency? Used to gate the wizard's Confirm button.
 *
 * Currencies are compared with their natural decimals tolerance:
 *   IQD: integer compare (diff < 1)
 *   USD/EUR/SAR: 0.01 tolerance
 */
export function selectIsDraftBalanced(s: BondsStoreState): boolean {
  const payments = selectDraftPaymentTotals(s);
  const readings = selectDraftReadingTotals(s);

  // Every currency present in either side must balance.
  const allCurrencies = new Set<CurrencyId>([
    ...payments.keys(),
    ...readings.keys(),
  ]);

  for (const cur of allCurrencies) {
    const p = payments.get(cur) ?? 0;
    const r = readings.get(cur) ?? 0;
    const tolerance = cur === 'IQD' ? 0.5 : 0.005;
    if (Math.abs(p - r) > tolerance) {
      return false;
    }
  }
  return allCurrencies.size > 0;
}
