# Sync Engine — العباسي تحصيل

Offline-first synchronization layer for the collector app.

> **Single Source of Truth:** WatermelonDB. Server is a slave-replica for
> reference data and a sink for collector-owned mutations.

## Architecture (top-down)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       UI (Phases 5-9)                                     │
│   • Screens never import handlers / worker directly                       │
│   • They call: enqueueReadingSave(), syncNow(), getStats()                │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────────┐
│                    Public Façade (index.ts)                              │
│      syncCoordinator • enqueueHelpers • syncEvents                       │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
           ┌─────────────────┼──────────────────┐
           │                 │                  │
           ▼                 ▼                  ▼
   ┌───────────────┐ ┌───────────────┐ ┌──────────────────┐
   │  SyncWorker   │ │ PullHandlers  │ │  Connectivity    │
   │  (push side)  │ │ (pull side)   │ │  + BackgroundFetch│
   │               │ │               │ │                   │
   │  drainQueue   │ │ readings      │ │ NetInfo events    │
   │  ↑ backoff    │ │ accounts      │ │ → auto pushOnly() │
   │  ↑ classify   │ │ places ...    │ │                   │
   └──────┬────────┘ └───────┬───────┘ └──────────────────┘
          │                  │
          ▼                  ▼
   ┌──────────────────────────────────┐
   │      Push Handlers (3 entities)   │
   │   readingPushHandler              │
   │   bondPushHandler                 │
   │   bondPaymentPushHandler          │
   └──────────────┬───────────────────┘
                  │ uses
                  ▼
   ┌──────────────────────────────────────────────────────┐
   │            Network Layer (Phase 3)                    │
   │   api.call() → axios + interceptors + Zod + mappers   │
   └──────────────────────────────────────────────────────┘
```

## Data flow: SAVING a reading

```
User taps Save
   │
   ▼
enqueueReadingSave(reading, domain)
   │
   ├──► database.write({ reading.syncStatus = 'dirty' })
   ├──► sync_queue.create({ payload, priority: 5, attempts: 0 })
   │
   └──► pushOnly('after_write')   [fire-and-forget]
        │
        ▼
   syncWorker.drainQueueOnce()
        │
        ├── claimBatch() ──► status: pending → processing
        │
        ▼
   readingPushHandler.execute(payload, 'create' | 'update')
        │
        ├── api.call('saveReading', { body, idempotent: true })
        │       │
        │       ▼
        │  ┌────────────────────────────────────────┐
        │  │  Network Layer (Phase 3)                │
        │  │    auth + retry + refresh + error       │
        │  │    Zod validates response                │
        │  └────────────────────────────────────────┘
        │
        ▼
   classifyError(thrown) → outcome
        │
        ├── 'success'    → markDone(item) + markEntityAsSynced
        │
        ├── 'transient'  → markPending(item, backoff) + markEntityAsDirty
        │                  next_run_at = now + 2^attempt × 2s + jitter
        │
        └── 'permanent'  → markFailed(item) + markEntityAsFailed
                          (dashboard surfaces for manual review)
```

## Data flow: PULLING readings (with LWW)

```
syncNow('manual')
   │
   ▼
runAllPulls()
   │
   ▼
readingPullHandler.run()
   │
   ├── api.call('getListReadingCounter')
   │       │
   │       ▼
   │   parseReadingList(raw)  // Zod-validated DTOs
   │
   ├── For each DTO:
   │     ├── Find local row by noadad
   │     ├── If local.syncStatus ∈ {dirty, syncing, failed} → SKIP (LWW)
   │     └── Else → upsert with server data, mark 'pristine'
   │
   └── prefs.setLastSync('readings')
```

## Conflict Resolution Rules (LWW = Local Wins)

| Local state | Server pull behavior |
|-------------|---------------------|
| `pristine`  | OVERWRITE — server is authoritative |
| `synced`    | OVERWRITE — server may have remote updates |
| `dirty`     | **SKIP** — collector edited, push first |
| `syncing`   | **SKIP** — push in flight, don't disturb |
| `failed`    | **SKIP** — needs manual review |

> **Rule of thumb:** if the collector has touched a row since the last
> successful sync, his data wins. Server pulls never silently overwrite
> collector input.

## Retry / Backoff Schedule

Default `DEFAULT_SYNC_CONFIG`:
- `baseMs = 2000` — initial delay
- `maxMs = 300000` — 5 min cap
- `jitterMs = 1000` — random spread
- `maxAttempts = 6` — then row is `failed`

Resulting attempt timeline (without jitter):

| Attempt | Delay until next | Cumulative wait |
|---------|------------------|-----------------|
| 1 (fail)| 2 s              | 2 s             |
| 2       | 4 s              | 6 s             |
| 3       | 8 s              | 14 s            |
| 4       | 16 s             | 30 s            |
| 5       | 32 s             | 62 s            |
| 6       | 64 s             | 126 s           |
| 7+      | → marked `failed`|                 |

## Error Classification

`classifyError(err)` decides retry vs. abandon:

| Error                              | Kind        | Reasoning |
|------------------------------------|-------------|-----------|
| `NETWORK_OFFLINE`                  | transient   | wait for connectivity |
| `NETWORK_TIMEOUT`                  | transient   | slow signal in the field |
| `HTTP_SERVER_ERROR` (5xx)          | transient   | server hiccup |
| `HTTP_RATE_LIMITED` (429)          | transient   | back off respectfully |
| `HTTP_UNAUTHORIZED` (401)          | transient   | refresh might recover |
| `HTTP_BAD_REQUEST` (400)           | **permanent** | payload is wrong |
| `HTTP_FORBIDDEN` (403)             | **permanent** | user lacks permission |
| `HTTP_NOT_FOUND` (404)             | **permanent** | endpoint or row missing |
| `HTTP_CONFLICT` (409)              | **permanent** | server-side merge needed |
| `VALIDATION_FAILED` (Zod)          | **permanent** | malformed payload |
| `BUSINESS_*` (reading rules)       | **permanent** | data violates business rule |

## Idempotency

Every queued mutation carries an `entity_local_uuid` that the legacy
backend can use as a de-duplication key. We also pass `idempotent: true`
to `api.call()` so the retry interceptor (Phase 3) is allowed to replay
POSTs on transient failures.

> The server is expected to honor `local_uuid` — if it doesn't yet, the
> worst case is duplicate rows under poor network conditions. The new
> server team has been asked to add this key.

## Background Fetch

Configured via `react-native-background-fetch` with a 15-minute floor
(Android minimum). When the OS wakes us up:
1. Check connectivity. Bail if offline.
2. Run `pushOnly('background_fetch')` — drain queue only.
3. `BackgroundFetch.finish(taskId)` MUST be called within 30 s.

> We never PULL in the background. Pulls are reserved for foreground
> triggers because they're heavier and use more data.

## Connectivity-Triggered Sync

When NetInfo reports `online`, `syncBootstrap` automatically calls
`pushOnly('connectivity')`. This is how a long-offline collector gets his
back-log uploaded the moment he walks into signal range.

## Event Bus

All sync activity emits structured events on `syncEvents`. The Sync
Dashboard (Phase 11) subscribes to render real-time progress.

Event types: `engine:started/finished/skipped`, `push:item_*`,
`pull:started/finished/failed`, `connectivity:online/offline`.

## Public Façade (what features should import)

```typescript
import {
  // Trigger sync
  syncNow,
  pushOnly,
  pullEntities,

  // Enqueue mutations
  enqueueReadingSave,
  enqueueReadingDelete,
  enqueueBondSave,
  enqueueBondPaymentSave,

  // Queue / dashboard
  getStats,
  listFailed,
  retryFailed,
  resetFailedEntities,

  // Bootstrap
  initSyncEngine,
  shutdownSync,

  // Events
  syncEvents,
} from '@/services/sync';
```

## Bootstrap (call once from App.tsx)

```typescript
useEffect(() => {
  void initSyncEngine({
    syncOnStartup: true,
    syncOnReconnect: true,
    enableBackgroundFetch: true,
    foregroundPeriodMs: 5 * 60 * 1000,
    backgroundIntervalMinutes: 15,
  });
  return () => { void shutdownSync(); };
}, []);
```

## Golden Rules

1. **NEVER push without the queue.** All writes go through `enqueue*` helpers.
2. **NEVER pull-overwrite locally-edited data.** The LWW skip is non-negotiable.
3. **NEVER call axios directly.** Use `api.call(endpointKey)` from Phase 3.
4. **NEVER store secrets in MMKV.** Tokens live in Keychain (Phase 3).
5. **ALWAYS pass `idempotent: true`** for queued POST/PUT/DELETE calls.
6. **ALWAYS finish background fetch tasks within 30 s** to avoid throttling.
