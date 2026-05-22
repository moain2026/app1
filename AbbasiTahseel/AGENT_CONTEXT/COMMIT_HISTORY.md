# COMMIT_HISTORY — Decoded Recent Commits

> Most-recent first. Run `git log --oneline -20` for the live view.

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

- **#26** (merged `2026-05-22T01:01:00Z`, head `fix/wcf-authenticate-endpoint`)
  — `fix(auth): use /Authenticate (WCF) as primary, /Login as fallback`
- **#25** (closed, replaced by #26) — `fix(auth): send 'appid' lowercase` (was wrong)
- **#24** (merged) — `Prep/wave 5 7 assets`
- **#23** (merged, head `feat/wave-5-printer-scanner`) — `Wave 5 — Printer + Scanner + Company Info`
- **#22** (merged, head `feat/wave-4-readings-and-dev-bypass`) — `Wave 4 — Readings + Dev Bypass`

## CI artifacts

| Run | Branch | Commit | Status | Used for |
|---|---|---|---|---|
| `26262216831` | main | `3e7e557` | ✅ success | Post-merge APK for PR #26 (WCF auth) |
| `26170412059` | main | `3ba68ac` | ✅ success | Wave 5 + assets prep |
| `26259193684` | fix/wcf-authenticate-endpoint | (pre-merge) | ✅ success | WCF auth field-test APK |
| `26170089729` | (Wave 5 PR) | `5ead240` | ✅ success | First real-server login attempt |

Download from the workflow run page (Actions tab on GitHub) → "Artifacts"
section at the bottom. Artifact name: `abbasi-tahseel-debug-apk`,
30-day retention.
