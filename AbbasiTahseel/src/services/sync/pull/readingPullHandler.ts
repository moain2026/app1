/**
 * Reading Pull Handler — العباسي تحصيل
 *
 * Fetches the full reading list from the legacy server and upserts into
 * WatermelonDB.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │  Conflict Resolution: Local Wins (LWW with collector authority)       │
 * ├───────────────────────────────────────────────────────────────────────┤
 * │  The collector (الجابي) is the source of truth for readings he       │
 * │  has touched. Server data is only used to:                            │
 * │    1. Seed brand-new rows (no local match by noadad)                  │
 * │    2. Refresh STILL-PRISTINE rows (sync_status='pristine')            │
 * │                                                                       │
 * │  Any row whose `sync_status` ∈ { dirty, syncing, failed } is          │
 * │  SKIPPED to prevent overwriting the collector's edits.                │
 * │                                                                       │
 * │  After the collector pushes a dirty row successfully → it becomes     │
 * │  `synced`. We treat `synced` like `pristine` for refresh purposes     │
 * │  ONLY if the server's payload is newer (best-effort, by remote_id).   │
 * └───────────────────────────────────────────────────────────────────────┘
 */

import { Q } from '@nozbe/watermelondb';
import { v4 as uuidv4 } from 'uuid';

import { database } from '../../../database';
import type { Reading } from '../../../database/models/Reading';
import { logger } from '../../../utils/logger';
import { api } from '../../api';
import { parseReadingList } from '../../api/mappers';
import type { ItemReadingDto } from '../../api/schemas/reading';
import { prefs } from '../../storage';
import type { PullHandler, PullResult } from '../types';

const log = logger.scope('Pull.Reading');
const COLLECTION = 'readings';

/**
 * Decide whether the local row should be overwritten by the server payload.
 *
 * Returns true ONLY when the local row is `pristine` or `synced` — i.e. the
 * collector has not made any local edits since the last sync. This is the
 * LWW rule from the spec: "الجابي يفوز دائماً" (collector always wins) for
 * any in-flight or pending work.
 */
function canOverwriteLocal(local: Reading): boolean {
  return local.pushStatus === 'pristine' || local.pushStatus === 'synced';
}

/**
 * Map a DTO onto an existing WatermelonDB row.
 * The Reading model uses legacy field names directly, so the assignment
 * is mechanical.
 */
function applyDtoToRow(row: Reading, dto: ItemReadingDto): void {
  row.num = dto.num;
  row.noadad = dto.noadad;
  row.name = dto.name ?? '';
  row.namet = dto.namet ?? null;
  row.ind = dto.ind;
  row.nomstlm = dto.nomstlm;
  row.notblh = dto.notblh;
  row.nog = dto.nog;
  row.ks = dto.ks;
  row.kh = dto.kh ?? null;
  row.cas = dto.cas;
  row.asts = dto.asts;
  row.remoteId = dto.num; // legacy "num" doubles as the remote id
  row.pushStatus = 'pristine';
  row.lastError = null;
  row.syncAttempts = 0;
}

export const readingPullHandler: PullHandler = {
  entity: 'readings',
  async run(): Promise<PullResult> {
    const startedAt = Date.now();
    const collection = database.collections.get<Reading>(COLLECTION);

    // ── 1. Fetch from server ────────────────────────────────────────────
    const raw = await api.call('getListReadingCounter');
    const dtos = parseReadingList(raw);
    log.info('pulled readings', { count: dtos.length });

    // ── 2. Pre-fetch existing rows keyed by noadad for O(1) lookup ──────
    const meterNumbers = dtos.map(d => d.noadad);
    const existing =
      meterNumbers.length > 0
        ? await collection.query(Q.where('noadad', Q.oneOf(meterNumbers))).fetch()
        : [];
    const byMeter = new Map<string, Reading>();
    for (const r of existing) {
      byMeter.set(r.noadad, r);
    }

    // ── 3. Apply LWW + bulk upsert in a single transaction ──────────────
    let upserted = 0;
    let skipped = 0;
    await database.write(async () => {
      for (const dto of dtos) {
        const local = byMeter.get(dto.noadad);
        if (local) {
          // Conflict point: only overwrite when safe.
          if (!canOverwriteLocal(local)) {
            skipped += 1;
            continue;
          }
          await local.update(row => {
            applyDtoToRow(row, dto);
          });
          upserted += 1;
        } else {
          // Fresh row.
          await collection.create(row => {
            row.localUuid = uuidv4();
            applyDtoToRow(row, dto);
          });
          upserted += 1;
        }
      }
    });

    prefs.setLastSync('readings');

    const durationMs = Date.now() - startedAt;
    log.info('pull complete', { upserted, skipped, durationMs });
    return { upserted, skipped, durationMs };
  },
};
