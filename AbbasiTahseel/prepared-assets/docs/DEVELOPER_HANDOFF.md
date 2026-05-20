# Developer Handoff — AbbasiTahseel

> For whoever inherits this codebase. Read this once **before** changing anything.
> Updated: end of Wave 7 prep cycle.

---

## 1. Project structure (10,000-ft view)

```
AbbasiTahseel/
├─ android/                       # Bare RN Android project (no iOS)
│  └─ app/
│     ├─ build.gradle             # signing, flavours, proguard wiring
│     ├─ proguard-rules.pro       # from prepared-assets/proguard/
│     └─ src/main/
│        ├─ AndroidManifest.xml   # perms, deep links, network security
│        └─ java/com/alabbasi/tahseel/   # MainActivity, MainApplication
├─ src/
│  ├─ App.tsx                     # root: providers, navigation, i18n
│  ├─ design-system/              # theme tokens, primitives (Button, Card)
│  ├─ navigation/                 # RootNavigator, AuthStack, MainStack, Drawer
│  ├─ screens/
│  │  ├─ auth/                    # Login, LicenseActivation
│  │  ├─ home/                    # Home dashboard
│  │  ├─ readings/                # list, detail, new   (Wave 4)
│  │  ├─ bonds/                   # list, detail, new   (Wave 6)
│  │  ├─ reports/                 # daily/weekly/monthly (Wave 7)
│  │  ├─ profile/                 # Wave 7
│  │  ├─ about/                   # Wave 7
│  │  └─ settings/                # server, printer, theme
│  ├─ db/                         # WatermelonDB
│  │  ├─ schema.ts
│  │  ├─ models/                  # Account, Reading, Bond, Payment, ...
│  │  └─ migrations/              # versioned schema migrations
│  ├─ services/
│  │  ├─ api/                     # axios client + endpoints
│  │  ├─ auth/                    # JWT handling, refresh, license
│  │  ├─ sync/                    # queue, push, pull, event bus
│  │  ├─ printer/                 # Wave 5: bluetoothclassic + escposBuilder + cp1256
│  │  └─ mock/                    # Dev-only seeders
│  ├─ stores/                     # Zustand slices (auth, license, sync, prefs, printer)
│  ├─ hooks/                      # custom RN hooks
│  ├─ utils/                      # formatters, validators, date helpers
│  ├─ i18n/                       # i18next setup + locales/ar.json
│  ├─ dev/                        # DevBypassPanel, debug screens (gated by __DEV__)
│  └─ types/                      # shared TS types
├─ prepared-assets/               # ← THIS FOLDER — reference material only
├─ docs/                          # user-facing docs (lifted from prepared-assets/docs/)
├─ PROJECT_PLAYBOOK.md            # the canonical living doc
└─ package.json
```

---

## 2. How sync works

Sync is **event-driven, not polled**.

### Push path
1. User saves a record (e.g. new bond) → row goes into the local WatermelonDB with `sync_status = 'pending'`.
2. The `syncEvents` bus emits `RECORD_QUEUED`.
3. `syncEngine.tick()` is debounced (250 ms) and triggered by `RECORD_QUEUED` + `CONNECTIVITY_UP` + a 5-min heartbeat.
4. `pushQueue.run()` reads all `pending` rows, batches them by table, sends to `POST /electric/bonds`, etc.
5. On 2xx → mark `sync_status = 'synced'`, write `server_id`, fire `RECORD_SYNCED`.
6. On 4xx → mark `sync_status = 'error'`, store error reason, surface a banner.
7. On 5xx / network error → keep `pending`, exponential backoff (1s, 2s, 4s, 8s, max 60s).

### Pull path
1. App start + every 15 min (foreground) → `pullEngine.fetch(lastPulledAt)`.
2. Server returns rows modified since `lastPulledAt`.
3. Insert / update locally inside `database.write()` so observers refresh UI.
4. Store new `lastPulledAt` in MMKV.

### Conflict resolution
- **Last-write-wins** based on server `updated_at` (we trust the server).
- Bond receipts cannot be edited after `sync_status = 'synced'` to avoid confusion — only reprinted.

### Subscribing in UI
- `useSyncStore()` exposes `{ status, queueDepth, lastSyncedAt }`.
- `SyncStatusBadge` subscribes; tap opens a modal with details.

---

## 3. Add a new feature — recipe

Suppose you're adding "Subscriber complaints" in Wave 8.

### Step 1: Schema
`src/db/schema.ts`:
```ts
tableSchema({
  name: 'complaints',
  columns: [
    { name: 'subscriber_id', type: 'string', isIndexed: true },
    { name: 'category', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'severity', type: 'number' },
    { name: 'status', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'sync_status', type: 'string', isIndexed: true },
    { name: 'server_id', type: 'number', isOptional: true },
  ],
}),
```

### Step 2: Migration
`src/db/migrations/v3.ts` — add the table via `addColumns` / `createTable`. **Never alter v1 / v2**; always make a new migration step.

### Step 3: Model
`src/db/models/Complaint.ts` — extends `Model`, decorators `@field`, `@date`.

### Step 4: API endpoint wiring
`src/services/api/complaints.ts` — wrap `POST /complaints`, `GET /complaints?since=...`.

### Step 5: Sync registration
Register the table in `pushQueue.tables` and `pullEngine.tables` so it gets picked up automatically.

### Step 6: Screen + Store + i18n
- `src/screens/complaints/...`.
- `src/stores/complaintsStore.ts` (only if you need cross-screen state — most lists should drive from WDB observers directly).
- Add keys under `src/i18n/locales/ar.json` (use the `prepared-assets/i18n/` style).

### Step 7: Wire into navigation
Add a tab / drawer item in `src/navigation/MainStack.tsx`.

### Step 8: Test
- Unit test the model (`__tests__/Complaint.test.ts`).
- Smoke test: create offline → confirm queued → reconnect → confirm synced.

### Step 9: Docs
Update `PROJECT_PLAYBOOK.md` (new wave entry) and `docs/USER_GUIDE_AR.md` if user-facing.

---

## 4. Where common errors hide

| Error symptom                                | Most likely cause                       | Where to look                                                  |
|----------------------------------------------|-----------------------------------------|----------------------------------------------------------------|
| Login succeeds, blank Home screen             | sync queue stuck                        | `src/services/sync/pushQueue.ts` — check error log              |
| KPI cards show 0 even with data                | `observeCount()` subscription leaked    | `src/screens/home/Home.tsx` useEffect cleanup                   |
| Drawer doesn't open on right                  | `drawerPosition` reset                  | `src/navigation/MainStack.tsx`                                   |
| Arabic looks reversed in receipt              | shaper or cp1256 mismatch               | `src/services/printer/cp1256.ts` + arabicShaper                 |
| Crash on dev bypass toggle                    | unsafeResetDatabase before stores reset  | `src/dev/DevBypassPanel.tsx` ordering                            |
| Release build crashes only                     | ProGuard rule missing                   | `android/app/proguard-rules.pro` + try `releaseQa` first        |
| 401 every 60 min                              | JWT refresh not wired                   | `src/services/auth/jwtRefreshInterceptor.ts`                     |

---

## 5. Coding conventions

- **Strict TypeScript** — `tsconfig.json` has `strict: true`. Don't widen.
- **Imports**: use `@/...` alias for `src/...` paths.
- **No default exports** for components — named only (helps grep + IDE refactors).
- **Async/await**, never `.then().catch()` chains.
- **React Native screens** export a single function component + a `route name` constant.
- **All visible strings via `t()`**. No raw Arabic in JSX outside `i18n/`.
- **Styles**: theme-driven via `useTheme()` from design-system. No magic colours in JSX.
- **Validation**: zod schemas in `src/schemas/` reused by RHF resolvers + server-bound types.

### File naming
- Components: `BondListScreen.tsx`, `SyncStatusBadge.tsx` (PascalCase).
- Hooks: `useBonds.ts` (camelCase, starts with `use`).
- Stores: `bondsStore.ts`.
- Types: `bond.ts` (one type per file under `src/types/`).

---

## 6. Tech debt (known)

| Item                                                            | Severity | Where                              |
|-----------------------------------------------------------------|----------|------------------------------------|
| `arabicReshaper` is a hand-written switch table — not all forms covered | Med      | `src/services/printer/cp1256.ts`   |
| No E2E test suite (Detox or Maestro) — manual only              | Med      | post-v1                            |
| Sync queue retries are in-memory only — lost on app kill         | Low      | `src/services/sync/pushQueue.ts`   |
| WatermelonDB migrations have no down-migration                   | Low      | accepted trade-off                 |
| No crash reporter wired (Sentry / Crashlytics) yet              | Med      | post-v1 ops decision               |
| iOS unsupported (intentional for v1)                             | Low      | post-v1 if needed                  |
| Print queue not persisted (in-memory)                            | Med      | `src/services/printer/printQueue` |
| OTA bundle updates not used (full APK only)                     | Low      | accepted trade-off                 |

---

## 7. Roadmap suggestions (post-v1)

- **OTA JS bundle updates** via CodePush or Microsoft App Center (server-controlled push of `index.android.bundle`).
- **Detox or Maestro E2E** running on a Pixel emulator in CI for the happy paths.
- **Sentry** with breadcrumb-rich error reports + de-obfuscation via `mapping.txt`.
- **In-app feedback**: button in About → opens form → posts to support endpoint.
- **Admin pre-paired printer profiles**: zero-touch printer config via QR code at deployment time.
- **Offline OCR for handwritten readings** (back-up to camera barcode scan).
- **iOS port** (requires re-evaluating Bluetooth Classic since iOS is MFi-only).

---

## 8. Quick command reference

```bash
# inside AbbasiTahseel/
npm ci                    # install
npm run start             # Metro
npm run android           # run on attached device (debug)
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm test                  # jest
npm run build:android:release   # signed release APK (needs keystore + secrets)
npm run clean:android     # gradle clean

# CI
git tag v1.2.3 -m "wave 8"
git push origin v1.2.3    # triggers build-release-apk.yml
```

---

## 9. Who to ask

| Topic                                  | Original author / SME                            |
|----------------------------------------|--------------------------------------------------|
| Sync engine                             | @moain2026                                       |
| Printer (Wave 5)                        | Wave 5 prep agent / @moain2026                   |
| Database schema                         | initial setup commit (`Wave-1 Foundations`)      |
| Auth / License                          | Wave 2 PR (#16)                                  |
| Tailscale config                        | Wave 3 PR (#19)                                  |
| Release / CI                            | Wave 7 prep                                      |
| UI design tokens                        | Wave 1 — `src/design-system/theme.ts`            |

---

## 10. Welcome — and good luck

Start by reading `PROJECT_PLAYBOOK.md` end-to-end, then this file. Then clone,
`npm ci`, plug in an Android device, `npm run android`. You should be running
in < 20 minutes if your env (JDK 17, Node 20, Android SDK 34) is set up.

If something feels wrong: **don't merge a quick fix**. Open an issue, document
the symptom, and ping the SME table above.
