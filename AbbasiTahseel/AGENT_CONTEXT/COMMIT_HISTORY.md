# COMMIT_HISTORY — Decoded Recent Commits

> Most-recent first. Run `git log --oneline -20` for the live view.

## feat/wave-7-p1-sync-activation branch — Wave 7 P1 Sync Activation (PR — OPEN)

| SHA       | Date       | Message                                                                          | Files | +/-     |
|-----------|------------|----------------------------------------------------------------------------------|-------|---------|
| `13c22af` | 2026-05-22 | `feat(wave-7-p1): start/stop sync engine on auth-state transitions`              | 1     | +60/−4  |
| `123aaf5` | 2026-05-22 | `feat(wave-7-p1): trigger syncNow('after_login') after real login success`        | 1     | +35/−0  |
| `8471d14` | 2026-05-22 | `feat(wave-7-p1): add 'after_login' to SyncTriggerReason union`                    | 1     | +1/−0   |

- **`13c22af`** Subscribes `App.tsx` to `useAuthStore` and brings the
  full sync engine online on the rising edge of
  `(isAuthenticated && !isDevBypass)` via `initSyncEngine()` from
  `services/sync/syncBootstrap.ts`. Tears it down on the falling edge
  via `shutdownSync()`. Cold-restart hot-path included: if the effect
  runs AFTER `loadFromStorage` already restored a real session, the
  engine is brought up synchronously inside the effect. Both calls are
  wrapped in `.catch(() => {})` so emulator / headless environments
  (BackgroundFetch unavailable) don't crash the app — the
  `SyncStatusBadge` simply stays 'offline'.

- **`123aaf5`** Adds a private `fireAfterLoginSync()` helper in
  `authStore.ts` and calls it at both STAGE 1 (`/Authenticate`) and
  STAGE 2 (`/Login`) success branches. The helper is strictly
  fire-and-forget: `login()` still returns `true` the moment tokens
  are persisted. Errors from the coordinator are caught + logged at
  WARN; the coordinator's own preconditions (online + auth token)
  make this safe to call even during a network blip.

- **`8471d14`** One-line additive change to
  `src/services/sync/types.ts`: extends the `SyncTriggerReason` union
  with `'after_login'`. No runtime behaviour change in this commit —
  it just unlocks the type for the call sites that land in `123aaf5`.

## feat/wave-6-beta-data-layer branch — Wave 6-Β Data Layer (PR #29 — MERGED a9a5da5)

| SHA       | Date       | Message                                                                                                  | Files | +/-           |
|-----------|------------|----------------------------------------------------------------------------------------------------------|-------|----------------|
| `cdcca90` | 2026-05-22 | `fix(wave-6-β): rename bonds getStats/observeStats to avoid barrel export collision with readingsRepository (TS2308)` | 2     | +4 / −4        |
| `c4cb704` | 2026-05-22 | `feat(wave-6-β): data layer — repositories, seeders, migration runner, observable pickers + 3 screens`   | 22    | +1958 / −161   |

- **`cdcca90`** Mechanical fix for the only `tsc --noEmit` error on PR #29's
  first push: both `readingsRepository` and `bondsRepository` exported a
  `getStats` / `observeStats` symbol, causing TS2308 in the
  `services/repository/index.ts` barrel. Renamed the bonds exports to
  `getBondStats` / `observeBondStats` and updated the only consumer
  (`BondsListScreen.tsx`). CI went green on the second push (job
  `77335964528`, 37s).

- **`c4cb704`** Wave 6-Β Data Layer per user decision D2 + E-alt.
  Repositories (5 new) + view-models (2 new + barrel) + seeders (5 new
  incl. orchestrator) + migration runner skeleton (no hooks registered).
  Wires 6 surfaces to observables: 3 pickers (Account, Place, Currency) +
  3 screens (BondsList, BondDetail, ReadingsHistory header). Untouched:
  forms (need WCF push contracts), Reports (need aggregation tables),
  Profile/About/Bulk (need Settings store), Model field expansion
  (separate PR after WCF Help dump). Migration runner version is `0`
  with empty `HOOKS` — explicitly "جاهز بدون تطبيق" per user.

## main branch — Wave 6-Α UI Skeleton line (PR #28 — MERGED)

- **`69b22c6`** `feat(wave-6-α): UI Skeleton — bonds, reports, readings, settings, pickers, design-system, mocks, i18n (#28)`
  Squash-merge of PR #28 (head branch superseded by the merge). Wave 6-Α
  UI skeleton: bond screens (List/Detail/Form/PaymentForm), reports
  screens, readings history skeleton, settings, pickers (Account/Place/
  Currency), design-system primitives (Chip, FAB, SearchBar, EmptyState,
  MockBanner, ErrorBanner, Card, SectionHeader, etc.), mock fixtures
  (bonds, accounts, places, currencies, bondPayments), i18n keys.
  CI green: `tsc --noEmit` (30s) + `Assemble Debug APK` (6m 15s).
  Final fix on the PR head: commit `001bf3b` resolved 8 tsc errors.

## main branch — docs sync (PR #27 — MERGED)

- **`75f72d8`** `chore(docs): sync CURRENT_STATE + COMMIT_HISTORY after PR #26 merge (#27)`
  Small documentation-only sync; no source code touched. NOTE: this file
  appears to have NOT been updated by that PR (its head was still
  pointing at PR #26 reality when Wave 6-Α started). PR #29 follow-up
  commit `docs(agent-context): sync state after Wave 6-Β PR #29`
  catches both this PR and PR #28 up at once.

## main branch — Auth Fix line (PR #26 — MERGED `2026-05-22T01:01:00Z`)

- **`3e7e557`** `fix(auth): use /Authenticate (WCF) as primary, /Login as fallback (#26)`
  Squash-merge of PR #26 (head branch `fix/wcf-authenticate-endpoint`).
  Two-stage login flow. STAGE 1 calls `/Authenticate` with the official
  WCF contract `{ User, Password, appId }` (Capital U/P, camelCase appId)
  and expects a JSON string literal response. STAGE 2 falls back to the
  legacy `/Login` with `{ username, password, appId, secureId }` and the
  Users-object response shape. On STAGE 2 failure, STAGE 1's raw body is
  prepended to the diagnostic surface so the operator can copy BOTH
  attempts from the LoginScreen error box (separator `──────────`).
  Documented as ADR-019 in `PROJECT_PLAYBOOK.md`.

## main branch — Wave 5 line

- **`3ba68ac`** `Prep/wave 5 7 assets (#24)`
  Moves the bulk-loaded reference material (printer SDK docs, cp1256
  maps, mock JSON for waves 6/7, ProGuard rules, keystore docs) into
  `prepared-assets/` and adds it to `.gitignore`.

- **`5ead240`** `feat: Wave 5 — Printer (Datecs DPP-250) + Scanner + Company Info (#23)`
  Squash-merge of the whole Wave 5 train (head branch
  `feat/wave-5-printer-scanner`): printer module, ESC/POS builder,
  cp1256 encoder + Arabic shaper, PrinterManager singleton, printerStore,
  PrinterSettingsScreen, receipt builders, drawer status dot, FAB on
  ReadingsScreen, stubs for Scanner and CompanyInfo.

## main branch — Wave 4 line

- **`3d9b1bf`** `docs(playbook): record Wave 4 CI APK build (46.93 MB)`
  Updates PROJECT_PLAYBOOK.md §11 with the Wave 4 APK build telemetry.

- **`8da6f7a`** `feat: Wave 4 — Readings Module + Dev Bypass Mode (#22)`
  Squash-merge of head branch `feat/wave-4-readings-and-dev-bypass`.
  Reactive readings list via WatermelonDB observe + `useReadingsStore`
  for filters/sort. Dev bypass path (`dev`/`0000`) seeds mock readings.
  Pull-to-refresh, swipe-actions, search, filter chips.

## Earlier — Waves 2..3 (squash-merged into main)

- **Wave 3** — head branch `feat/wave-3-main-shell`: navigation
  (Drawer + Tabs), Splash, License, Login, PinSetup, ServerSettings,
  ThemeProvider, design-system tokens, RTL bootstrap.
- **Wave 2** — head branch `feat/wave-2-auth-license-navigation`:
  i18next setup, MMKV prefs, secureStorage (Keychain), HTTP client
  (axios + interceptors), zod schema registry, AppError type.

## Wave 0 / 1 — earliest history

Project scaffold (RN 0.74.5 bare init, TS strict, ESLint, Prettier,
Babel module-resolver `@/`, WatermelonDB adapter+schema, 12 tables in
schema v1). Branch ancestry for these waves is partly absorbed into
`phase-stabilization-bootable` on origin; exact per-wave branch names
were not preserved as separate remote branches.

## PRs (recent — most-recent first)

- **#29** (OPEN, head `feat/wave-6-beta-data-layer`) — `feat(wave-6-β): Data Layer — Repositories, Observables, Migration Runner Skeleton`
- **#28** (merged, squash-commit `69b22c6`) — `feat(wave-6-α): UI Skeleton — bonds, reports, readings, settings, pickers, design-system, mocks, i18n`
- **#27** (merged, squash-commit `75f72d8`) — `chore(docs): sync CURRENT_STATE + COMMIT_HISTORY after PR #26 merge`
- **#26** (merged `2026-05-22T01:01:00Z`, head `fix/wcf-authenticate-endpoint`)
  — `fix(auth): use /Authenticate (WCF) as primary, /Login as fallback`
- **#25** (closed, replaced by #26) — `fix(auth): send 'appid' lowercase` (was wrong)
- **#24** (merged) — `Prep/wave 5 7 assets`
- **#23** (merged, head `feat/wave-5-printer-scanner`) — `Wave 5 — Printer + Scanner + Company Info`
- **#22** (merged, head `feat/wave-4-readings-and-dev-bypass`) — `Wave 4 — Readings + Dev Bypass`

## CI artifacts

| Run | Branch | Commit | Status | Used for |
|---|---|---|---|---|
| `26274668684` | feat/wave-6-beta-data-layer | `cdcca90` | ✅ `tsc --noEmit` pass (37s); APK in flight at handoff | PR #29 (Wave 6-Β Data Layer) |
| `26274606920` | feat/wave-6-beta-data-layer | `c4cb704` | ❌ `tsc --noEmit` fail (TS2308 barrel collision); fixed by `cdcca90` | PR #29 first push |
| (PR #28 final)| (Wave 6-Α PR) | `001bf3b` (pre-squash) → `69b22c6` (squash) | ✅ tsc 30s + APK 6m 15s | Wave 6-Α UI Skeleton merge |
| `26262216831` | main | `3e7e557` | ✅ success | Post-merge APK for PR #26 (WCF auth) |
| `26170412059` | main | `3ba68ac` | ✅ success | Wave 5 + assets prep |
| `26259193684` | fix/wcf-authenticate-endpoint | (pre-merge) | ✅ success | WCF auth field-test APK |
| `26170089729` | (Wave 5 PR) | `5ead240` | ✅ success | First real-server login attempt |

Download from the workflow run page (Actions tab on GitHub) → "Artifacts"
section at the bottom. Artifact name: `abbasi-tahseel-debug-apk`,
30-day retention.
