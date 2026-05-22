# COMMIT_HISTORY — Decoded Recent Commits

> Most-recent first. Run `git log --oneline -20` for the live view.

## fix/wcf-authenticate-endpoint branch (PR #26 — open)

- **`8c0c48b`** `fix(auth): switch to /Authenticate (WCF) with /Login fallback`
  Two-stage login flow. STAGE 1 calls `/Authenticate` with the official
  WCF contract `{ User, Password, appId }` (Capital U/P, camelCase appId)
  and expects a JSON string literal response. STAGE 2 falls back to the
  legacy `/Login` with `{ username, password, appId, secureId }` and the
  Users-object response shape. On STAGE 2 failure, STAGE 1's raw body is
  prepended to the diagnostic surface so the operator can copy BOTH
  attempts from the LoginScreen error box.

## main branch — Wave 5 line

- **`3ba68ac`** `Prep/wave 5 7 assets (#24)`
  Moves the bulk-loaded reference material (printer SDK docs, cp1256
  maps, mock JSON for waves 6/7, ProGuard rules, keystore docs) into
  `prepared-assets/` and adds it to `.gitignore`.

- **`5ead240`** `feat: Wave 5 — Printer (Datecs DPP-250) + Scanner + Company Info (#23)`
  Squash-merge of the whole Wave 5 train (printer module, ESC/POS
  builder, cp1256 encoder + Arabic shaper, PrinterManager singleton,
  printerStore, PrinterSettingsScreen, receipt builders, drawer status
  dot, FAB on ReadingsScreen, stubs for Scanner and CompanyInfo).

## main branch — Wave 4 line

- **`3d9b1bf`** `docs(playbook): record Wave 4 CI APK build (46.93 MB)`
  Updates PROJECT_PLAYBOOK.md §11 with the Wave 4 APK build telemetry.

- **`8da6f7a`** `feat: Wave 4 — Readings Module + Dev Bypass Mode (#22)`
  Reactive readings list via WatermelonDB observe + `useReadingsStore`
  for filters/sort. Dev bypass path (`dev`/`0000`) seeds mock readings.
  Pull-to-refresh, swipe-actions, search, filter chips.

## Earlier — Waves 1..3

Squash-merged into `main`. Per-wave PRs:
- Wave 3: navigation (Drawer + Tabs), Splash, License, Login, PinSetup,
  ServerSettings, ThemeProvider, design-system tokens, RTL bootstrap.
- Wave 2: i18next setup, MMKV prefs, secureStorage (Keychain), HTTP
  client (axios + interceptors), zod schema registry, AppError type.
- Wave 1: project scaffold (RN 0.74.5 bare init, TS strict, ESLint,
  Prettier, Babel module-resolver `@/`, WatermelonDB adapter+schema).

## PRs (recent)

- **#26** (open) — `fix(auth): use /Authenticate (WCF) as primary, /Login as fallback`
- **#25** (closed, replaced by #26) — `fix(auth): send 'appid' lowercase` (was wrong)
- **#24** (merged) — `Prep/wave 5 7 assets`
- **#23** (merged) — `Wave 5 — Printer + Scanner + Company Info`
- **#22** (merged) — `Wave 4 — Readings + Dev Bypass`

## CI artifacts

| Run | Build | Size | Used for |
|---|---|---|---|
| `26259193684` | PR #26 debug | TBD | WCF auth field test |
| `26170089729` | Wave 5 debug | 46.98 MB | First real-server login attempt (failed → led to PR #26) |
| (Wave 4) | debug | 46.93 MB | First Tailscale connectivity test |

Download from the workflow run page (Actions tab on GitHub) → "Artifacts"
section at the bottom.
