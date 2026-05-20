/**
 * Reading Model — العباسي تحصيل
 *
 * Mirrors ItemReading.java from the legacy app (12 original fields).
 * Field names are KEPT IDENTICAL to the legacy backend JSON to enable
 * transparent sync with the existing server.
 *
 * Clean UI-facing names are exposed via getters below (without renaming
 * the underlying columns) — that way the DB schema and the API payloads
 * remain 1:1 compatible while the React layer enjoys readable names.
 */

import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

/**
 * Local push lifecycle for an entity row.
 *
 * NOTE: This is intentionally NOT named `SyncStatus` to avoid colliding with
 * WatermelonDB's internal `Model.syncStatus` accessor (which uses its own
 * tri-state union: 'created' | 'updated' | 'deleted' | 'synced' | 'disposable').
 * The DB column name stays `sync_status` to preserve the existing schema
 * (legacy compatibility) — only the TypeScript property is renamed.
 */
export type PushStatus =
  | 'pristine' // server-fetched, never modified locally
  | 'dirty' // modified locally, not yet pushed
  | 'syncing' // push in flight
  | 'synced' // successfully pushed
  | 'failed'; // push failed after max attempts

export class Reading extends Model {
  static table = 'readings';

  // ─── Sync metadata ────────────────────────────────────────────────────────
  @text('local_uuid') localUuid!: string;
  @field('remote_id') remoteId?: number | null;

  // ─── Legacy fields (KEEP NAMES IDENTICAL — DO NOT RENAME) ─────────────────
  @field('num') num!: number;
  @text('name') name!: string;
  @text('namet') namet?: string | null;
  @field('ind') ind!: number;
  @field('nomstlm') nomstlm!: number;
  @field('notblh') notblh!: number;
  @text('noadad') noadad!: string;
  @field('nog') nog!: number;
  @field('ks') ks!: number;
  @field('kh') kh?: number | null;
  @field('cas') cas!: number;
  @field('asts') asts!: number;

  // ─── Sync state ───────────────────────────────────────────────────────────
  // Property is `pushStatus` to avoid shadowing WatermelonDB's Model.syncStatus.
  // The underlying column name stays `sync_status` for backward DB compat.
  @text('sync_status') pushStatus!: PushStatus;
  @date('last_sync_attempt_at') lastSyncAttemptAt?: Date | null;
  @text('last_error') lastError?: string | null;
  @field('sync_attempts') syncAttempts!: number;

  // ─── Timestamps ───────────────────────────────────────────────────────────
  @date('reading_date') readingDate?: Date | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /* ──────────────────────────────────────────────────────────────────────
   * Computed / clean accessors for the UI layer.
   * These DO NOT change the underlying columns — they just provide
   * readable aliases so screens never need to remember legacy names.
   * ────────────────────────────────────────────────────────────────────── */

  /** رقم العداد — Meter number (alias for `noadad`). */
  get meterNumber(): string {
    return this.noadad;
  }

  /** اسم المشترك — Customer name (alias for `name`). */
  get customerName(): string {
    return this.name;
  }

  /** الاسم البديل — Customer alias (alias for `namet`). */
  get customerAlias(): string | null {
    return this.namet ?? null;
  }

  /** القراءة السابقة — Previous reading (alias for `ks`). */
  get previousReading(): number {
    return this.ks;
  }

  /** القراءة الحالية — Current reading (alias for `kh`). */
  get currentReading(): number | null {
    return this.kh ?? null;
  }

  /** الاستهلاك المتوقع — Expected consumption (alias for `asts`). */
  get expectedConsumption(): number {
    return this.asts;
  }

  /** المنطقة/المستلم — Area/receiver (alias for `nomstlm`). */
  get receiverArea(): number {
    return this.nomstlm;
  }

  /** التابلة/الدفتر — Book/tabla number (alias for `notblh`). */
  get bookNumber(): number {
    return this.notblh;
  }

  /** المجموعة — Group number (alias for `nog`). */
  get groupNumber(): number {
    return this.nog;
  }

  /** النوع — Meter type (alias for `ind`). */
  get meterType(): number {
    return this.ind;
  }

  /**
   * هل القراءة مرحّلة؟ — Is this reading posted?
   * In the legacy app: `cas != 0` means posted.
   */
  get isPosted(): boolean {
    return this.cas !== 0;
  }

  /**
   * Actual consumption = currentReading - previousReading.
   * Returns null if currentReading is not yet entered.
   *
   * NOTE: The legacy app computes the same way. We preserve the math 1:1.
   */
  get actualConsumption(): number | null {
    if (this.kh == null) {
      return null;
    }
    return this.kh - this.ks;
  }

  /**
   * هل الاستهلاك يتجاوز المتوقع؟ — Is consumption above expected?
   * Used to highlight the row in red (#D81B60) — matching legacy `sk > asts`
   * visual rule from ListReadingActivity.java.
   */
  get isOverConsumption(): boolean {
    const actual = this.actualConsumption;
    if (actual == null) {
      return false;
    }
    return actual > this.asts;
  }

  /**
   * Should this reading block editing in the UI?
   * Mirrors: `if (cas != 0) → block edit "لا يمكن تعديل القراءة المرحلة"`.
   */
  get isEditLocked(): boolean {
    return this.isPosted;
  }
}
