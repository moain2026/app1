# KNOWN_ISSUES — Gotchas, Pitfalls, Magic Values

> Things that bit us. Things that will bite you if you forget.

## ⚠️ Auth — THE BIG ONE

**The backend is .NET WCF, NOT PHP.** This was discovered the hard way.
See `AUTH_INVESTIGATION.md` for the full story. Short version:

- **Primary auth endpoint:** `/Authenticate` (Capital A)
  Body: `{ "User", "Password", "appId" }` — Capital U/P, camelCase appId
  Response: a JSON **string literal** (`"token"`), not an object
- **Fallback endpoint:** `/Login` (Capital L)
  Body: `{ "username", "password", "appId", "secureId" }`
  Response: Users object with `access_token` field
- **Both endpoints use `appId` camelCase.** Never lowercase it.
  PR #25 made this mistake and was reverted.
- **All other endpoints use `appId` camelCase in query strings** —
  `GetCompanyInfo?appId={APPID}`, etc. Stay consistent.
- **`secureId` is NOT a field in `/Authenticate`.** Only in `/Login`.
- **Login response from `/Authenticate`** is `"some-token-string"`
  (quoted JSON string). Axios decodes to plain JS string. Empty string
  = failed authentication.

## Auth — other facts

- **HTTPS default:** OFF. The legacy server speaks plain HTTP. Toggle
  in `ServerSettingsScreen` if HTTPS is later enabled server-side.
- **Tailscale IP:** default `100.87.131.115:3000`. This is the
  single-deployment user's VPN IP. Change before forking the app.
- **Branch number:** sent as `appId` value. Default `"1"`.
- **`secureId`:** auto-computed from ANDROID_ID hex prefix → 10-digit
  decimal (matching legacy `Defence.getDeviceId()`). Override via
  `setSecureIdOverride()` if migrating from a legacy device.
- **Current user's `secureId` (for testing):** `2098897319`. Already
  configured if dev tested login.
- **The Java app has THREE competing login endpoint definitions.**
  See `LEGACY_JAVA_MAP.md` — don't get confused.

## Dev Bypass

- Username `dev` + PIN `0000` → skips network, mints sentinel tokens
  (`DEV_BYPASS_ACCESS_TOKEN`, `DEV_BYPASS_REFRESH_TOKEN`), seeds 25 mock
  readings. Wave 7 will hide this behind a `developerModeEnabled` MMKV
  pref activated by 7-tap on About screen.
- The persistent yellow banner in the app UI ("DEV BYPASS — مزيف!")
  is intentional. Don't suppress it.

## Printer (Wave 5)

- **cp1256 encoder is owned by us.** Don't rely on `iconv-lite` etc.
  The mapping has 226 entries including Lam-Alef ligatures
  (U+FEFB → 2 bytes `0xE1 0xC7`). Found at
  `src/services/printer/cp1256.ts`.
- **Arabic shaping is done in-app** via lookup table — no third-party lib.
- **Cp1256 thermal printers render LTR.** The shaper reverses the
  codepoint array at the end so visually-RTL Arabic appears correctly on
  paper. If a future printer renders RTL natively, remove the reverse.
- **Datecs DPP-250 must be paired in Android BT settings first.**
  `discover()` only enumerates bonded devices — no active SPP scan.
- **Print chunk size:** 512 B. Some firmwares truncate writes > 1024 B.
- **`react-native-bluetooth-classic@1.73.0-rc.12`** — pinned because
  newer (post-1.73) had a breaking BluetoothDevice type change. The `1.x`
  stream is what we ship.

## WatermelonDB

- **`sync_status` column** must keep that exact name on disk. The TS
  property is aliased to `pushStatus` to avoid colliding with
  WatermelonDB's internal `Model.syncStatus` accessor.
- **`noUncheckedIndexedAccess`** affects `Q.where(...)` results — array
  destructuring can return `undefined`; always handle.
- **Reactive observe()** doesn't auto-resubscribe on schema migration.
  After a Wave-X migration, the user must restart the app for
  reactivity to apply to new columns.

## React Native quirks

- **`I18nManager.isRTL`** is cached at app start. To force RTL the first
  install runs `I18nManager.forceRTL(true)` + restarts the app.
- **MMKV** is synchronous — safe to read inside ThemeProvider mount.
- **Hermes** is the production JS engine. Don't use APIs only available
  in JSC.
- **No `__DEV__` in release builds.** Debug interceptors / dev bypass
  banner all guard on `__DEV__`. In production these are dead-code
  eliminated.

## Git / Build / CI

- **`prepared-assets/` is git-ignored.** Never commit. If `git ls-files
  prepared-assets/ | head` returns anything, something broke.
- **Squash policy:** waves are squash-merged into main, but commits
  within a feature branch are kept until PR-merge time. Don't squash
  locally before pushing.
- **CI builds debug APKs only.** Release builds are Wave 7 work
  (keystore + ProGuard not configured yet).
- **GitHub Actions on `genspark_ai_developer`-style branches:** any
  branch matching `feat/**`, `fix/**`, `chore/**` triggers the CI
  workflow (see `.github/workflows/build.yml`).

## Auth field test — PR #26 specific

- If you receive a copy-pasted diagnostic from the user that contains
  TWO sections separated by `──────────`, those are STAGE 1
  (`/Authenticate`) and STAGE 2 (`/Login`) raw responses respectively.
  Read both; the first one is usually the more useful.
- If only ONE section appears, STAGE 1 succeeded but parsing failed.
  Inspect `AuthenticateResponseSchema` in `src/services/api/schemas/auth.ts`.

## Wave 5 specific TODOs

- **Vision-camera vs camera-kit:** RN 0.74.5 compat unverified. If
  vision-camera fails to autolink, try
  `react-native-camera-kit@13.x`. If both fail, postpone scanner to
  Wave 5.5.
- **Print button on ReadingDetail** must observe both `pushStatus` (only
  print synced or saved readings) AND `isConnected`. Disable otherwise.
- **`PrinterManager.print` throws if not connected.** Always check
  `isConnected()` first OR use the store's `printReading()` which sets
  `lastError` instead of throwing.

## Future Waves

- Wave 6: Bond model already exists in `database/models/Bond.ts` but is
  unused. Activate by adding to seed + screens.
- Wave 7: keystore not yet generated. Plan documented in
  `prepared-assets/ci/keystore-setup.md`.
