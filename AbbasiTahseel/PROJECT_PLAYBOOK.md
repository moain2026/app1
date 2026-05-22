# PROJECT PLAYBOOK — AbbasiTahseel (شركة العباسي لتوليد الكهرباء التجارية)

> Operational reference for the React Native rebuild of the legacy
> `ElectricCollector28` Android field-collection app.
> **Last updated:** Wave 5 — Printer (Datecs DPP-250 SPP) + Scanner stub + Company Info stub.

---

## 1. Current State (End of Wave 5)

- **Build status:** Wave 4 APK shipped via GitHub Actions (46.93 MB); Wave 5 CI run pending the open PR.
- **App entry flow:** Splash → License Activation (if not activated) → Login → MainStack (Drawer wrapping Tabs).
- **Network default:** Tailscale VPN IP `100.87.131.115:3000/electric/` over HTTP (cleartext allowed globally).
- **Active branch under work:** `feat/wave-5-printer-scanner`.
- **Persisted preferences:** hosting IP, port, useHttps, branch number, language, theme.
- **Sync engine:** event-driven push+pull coordinator with queue + connectivity monitor.
- **Printer engine (new):** Datecs DPP-250 over Bluetooth Classic SPP; cp1256 encoder + Arabic shaper; ESC/POS builder; 3 receipt builders (reading/bond/dailySummary); Zustand `printerStore` + `usePrinter` hook + `PrinterSettingsScreen`.
- **i18n:** Arabic-first (RTL) via `i18next` + `react-i18next`; all visible strings via `t()`. `ar.json` extended with `printer.*`, `scanner.*`, `company.*` trees.

## 2. Operational Context

- **Customer:** Internal field-staff of "شركة العباسي لتوليد الكهرباء التجارية" (Iraq, Baghdad-based small electricity generation/billing operator).
- **Use-case:** Door-to-door meter reading and cash-bond collection for prepaid electricity.
- **Connectivity model:** offline-first; sync runs when Tailscale tunnel is up.
- **Devices:** mid-range Android phones; APK side-loaded by branch admin.
- **Server:** PHP+MySQL backend exposed via Tailscale (`/electric/` API root).
- **Auth model:** server-issued JWT + license-activation tied to deviceId.

## 3. Tech Stack (Locked Versions)

| Layer            | Library                                  | Version    |
|------------------|------------------------------------------|------------|
| Runtime          | React Native (Bare)                      | 0.74.5     |
| Language         | TypeScript (strict)                      | 5.4.5      |
| State            | Zustand                                  | 4.5.x      |
| Navigation       | @react-navigation/native                 | 6.1.x      |
| Navigation       | @react-navigation/native-stack           | 6.9.x      |
| Navigation       | @react-navigation/bottom-tabs            | ~6.6.1     |
| Navigation       | @react-navigation/drawer                 | ~6.7.2     |
| DB               | @nozbe/watermelondb                      | 0.27.x     |
| Forms            | react-hook-form + @hookform/resolvers    | 7.x        |
| Schemas          | zod                                      | 3.x        |
| i18n             | i18next + react-i18next                  | 23.x       |
| Icons            | react-native-vector-icons (Feather)      | 10.x       |
| Network          | axios                                    | 1.x        |
| Storage          | @react-native-async-storage/async-storage| 1.23.x     |
| Reactive         | rxjs (transitively via watermelondb)     | 7.x        |
| Printer (BT/SPP) | react-native-bluetooth-classic           | 1.73.0-rc.12 |
| Binary buffers   | buffer                                   | ~6.0.3     |
| Camera (Wave 5.2)| react-native-vision-camera (deferred)    | 3.x        |

## 4. Wave-by-Wave History

- **Wave 0 — Bootstrap:** RN 0.74.5 bare project, Android target SDK, Arabic RTL by default, brand theme tokens.
- **Wave 1 — Foundations:** design-system theme, prefs storage, HTTP client base, network_security_config (cleartext for Tailscale CIDR), license manager scaffold.
- **Wave 2 — Auth + License + Navigation:** authStore + licenseStore (Zustand); RootNavigator switching between Splash/Auth/License/Main; AuthStack with LoginScreen + LicenseActivationScreen; hotfix to unblock Metro bundle (alias precedence + `@babel/plugin-transform-export-namespace-from`).
- **Wave 3 — Main Shell + Tailscale Settings + Home Dashboard:**
  - Default IP switched to Tailscale (`100.87.131.115`) + `BRANCH_NUMBER` pref.
  - ServerSettingsScreen reachable from both Login (pre-auth gear icon) and Drawer.
  - MainStack rewritten as right-side Drawer wrapping a 4-tab BottomTab navigator.
  - SyncStatusBadge live-bound to `syncStore` (online/syncing/error/offline) with detail modal.
  - HomeScreen rebuilt with welcome card, 2x2 KPI grid backed by WatermelonDB `observeCount()`, CTA, RefreshControl, and recent-activity stub.
  - Vector-icon fonts wired in `android/app/build.gradle` via `fonts.gradle`.
- **Wave 4 — Readings Module + Dev Bypass Mode (this wave):**
  - **Section A — Dev Bypass:** `dev`/`0000` shortcut short-circuits `authStore.login()` BEFORE any network call, mints a local admin session with sentinel tokens (`dev.bypass.token.local.only`), persists them via Keychain, and surfaces a yellow Home banner + dashed Dev Mode card on the Login screen.
  - **Section A bugfix:** the LoginScreen `secureId` preview was stale because its `useEffect` had no dependency on focus events. Replaced with `useFocusEffect` so the override is re-resolved every time the user returns from ServerSettings.
  - **Section B — Mock Data:** 25 hand-crafted Arabic readings (`MOCK_READINGS`) seeded via `seedMockDataIfDevBypass()` — idempotent (sentinel UUID dedup), gated on `isDevBypass`, uses `database.batch(prepareCreate(...))`.
  - **Section C — Readings module:** repository + Zustand store + 5 building-block components (`ReadingRow`, `ReadingsSearchBar`, `ReadingsFilterChips`, `ReadingsEmptyState`, `ReadingStatBadge`) + `ReadingsScreen` (FlashList, RefreshControl, sync action) + `ReadingDetailScreen` (3 cards, kh validation, very-high confirmation modal, retry).
  - **Section C navigation:** `ReadingDetail: { localUuid }` added to `MainStackParamList`; mounted as Drawer.Screen but hidden from the drawer menu because `DrawerContent` uses a fixed `MENU_ITEMS` list (not `DrawerItemList`).
- **Wave 5 — Printer (Datecs DPP-250 SPP) + Scanner stub + Company Info stub:**
  - **Section A — ESC/POS core:** `src/services/printer/cp1256.ts` (Windows-1256 encoder, 226-entry Unicode map, Lam-Alef ligature U+FEFB → 2 bytes, lookup-based Arabic contextual shaper with isolated/initial/medial/final forms reversed for LTR thermal heads). `src/services/printer/escposBuilder.ts` (concatBytes + `ESC @`, `ESC t 0x16`, `ESC a n`, `ESC E n`, `GS ! n`, `GS V 1`, `GS k 73` helpers). `src/services/printer/testPage.ts` (self-test sequence).
  - **Section B — Bluetooth transport:** `src/services/printer/PrinterManager.ts` singleton wrapping `react-native-bluetooth-classic@1.73.0-rc.12` (SPP); base64 chunked writes via `buffer@~6.0.3` (512-byte chunks); typed `connected`/`disconnected`/`error` events via TinyEmitter pattern.
  - **Section C — Receipt builders:** `src/services/printer/receiptBuilders/{buildReadingReceipt, buildBondReceipt, buildDailySummary}.ts` + barrel. Bond builder aggregates multi-currency totals, payment-type labels, reprint banner, verification barcode `B-<num>-<hash6>`. Daily summary builder produces per-area top-8 aggregation with "remaining" line and signature block.
  - **Section D — State + UI:** `src/stores/printerStore.ts` Zustand slice (11 actions, subscribes to PrinterManager events on module load). `src/hooks/usePrinter.ts` thin wrapper hook. `src/screens/settings/PrinterSettingsScreen.tsx` (status card, device scan list, test print, error banner). `src/screens/main/ReadingDetailScreen.tsx` gains a print button disabled when `kh == null || !isConnected || isPrinting`.
  - **Section E — Permissions:** `AndroidManifest.xml` adds CAMERA + `camera`/`autofocus`/`bluetooth` features (required=false); `tools:targetApi="s"` + `neverForLocation` on BLUETOOTH_SCAN; `maxSdkVersion="30"` on legacy BLUETOOTH/BLUETOOTH_ADMIN.
  - **Section F — Navigation:** `PrinterSettings`, `CompanyInfo`, `Scanner` added to `MainStackParamList`; mounted in `MainStack`; appended to `DrawerContent.MENU_ITEMS` (Feather `printer` + `briefcase`) with a live green/red status dot next to PrinterSettings driven by `usePrinterStore((s) => s.isConnected)`. Red FAB on `ReadingsScreen` navigates to `Scanner` with `{ returnTo: 'Readings' }`.
  - **Section G — Stubs (deferred):** `CompanyInfoScreen.tsx` (form for `company_info` table → Wave 5.3 follow-up) and `ScannerScreen.tsx` (camera-off placeholder + manual-entry CTA → Wave 5.2 follow-up requiring `react-native-vision-camera@3.x`).
  - **Section H — i18n:** `ar.json` extended with `printer.*`, `scanner.*`, `company.*`, and `navigation.drawer.{printerSettings,companyInfo,scanner}` trees.

## 5. Architecture Decision Records (ADRs)

- **ADR-001:** Zustand over Redux. Smaller surface, no boilerplate, sufficient for ~10 slices.
- **ADR-002:** WatermelonDB over Realm/SQLite-direct. Reactive queries (`observeCount`) drive KPI cards.
- **ADR-003:** Drawer mounted on right with `drawerPosition: 'right'` (correct for RTL with `swipeEnabled` from right edge).
- **ADR-004:** Bottom tabs nested inside Drawer (not the reverse) so tabs persist while drawer opens over them.
- **ADR-005:** Sync engine is event-bus driven (`syncEvents.subscribe`) rather than polled; UI subscribes and stays cheap.
- **ADR-006:** Module-level subscription handles (outside Zustand `set`) for non-serializable resources (rxjs `Subscription`, listener unsubscribes).
- **ADR-007:** No `withObservables` HOC — direct `observeCount().subscribe()` inside `useEffect` for tighter control of cleanup and to keep components plain.
- **ADR-008:** Feather as the single icon family across the app for visual consistency.
- **ADR-009:** Use `@/design-system/theme` import alias (the `@/ds/...` alias has resolver ambiguity in tsc).
- **ADR-010:** ServerSettingsScreen mounted in **both** AuthStack and MainStack so it is reachable before login (Tailscale/IP setup) and after (drawer).
- **ADR-011 (Wave 4):** Dev Bypass short-circuits inside `authStore.login()` BEFORE any HTTP attempt. Sentinel tokens (`dev.bypass.token.local.only`) are persisted via Keychain so cold-start rehydrate sees them in `loadFromStorage()` and restores the bypass session without a network round-trip. This is the ONLY auth path that bypasses the legacy server.
- **ADR-012 (Wave 4):** Mock data is seeded only on dev-bypass via a Zustand subscription (`useAuthStore.subscribe(state, prev) → if state.isDevBypass && !prev.isDevBypass → seed`). Idempotency is enforced by querying `Q.where('local_uuid', MOCK_READINGS[0].local_uuid)` before any insert — re-running the seeder is a no-op.
- **ADR-013 (Wave 4):** WatermelonDB cannot express cross-column WHERE clauses (the "over-consumption" rule is `kh - ks > asts`). We apply this filter in the JS layer via an rxjs `map` operator on the observable — preserving reactivity while keeping the SQL simple. `getStats()` uses the same trick with a one-shot fetch.
- **ADR-014 (Wave 4):** The Reading model uses a `pushStatus` TypeScript property that aliases the `sync_status` DB column. This avoids shadowing WatermelonDB's internal `Model.syncStatus` accessor (which has its own tri-state union) while keeping the DB column name unchanged for backward compatibility with the legacy server schema.
- **ADR-015 (Wave 5):** `react-native-bluetooth-classic` (SPP) over BLE for the Datecs DPP-250 thermal printer. The legacy Java app uses RFCOMM/SPP exclusively; the Datecs DPP-250 firmware advertises the standard SPP UUID `00001101-0000-1000-8000-00805F9B34FB`; BLE would require Datecs' proprietary GATT profile (not publicly documented). Trade-off: SPP requires Bluetooth Classic pairing UX and forces `targetApi='s'`/`neverForLocation` on the SCAN permission, but reuses field operators' existing muscle memory.
- **ADR-016 (Wave 5):** Pre-rendered Windows-1256 (cp1256) bytes with a lookup-based Arabic shaper, NOT image rendering of Arabic. The DPP-250 firmware natively supports cp1256 (selected via `ESC t 0x16`), and shaped Arabic glyphs print 10× faster than rasterized bitmaps. Lam-Alef ligature (U+FEFB) is the only 1→2 byte expansion; encoded as `0xE1 0xC7`. Text is reversed BEFORE encoding because the print head is LTR and Arabic must arrive byte-reversed to appear correct visually.
- **ADR-017 (Wave 5):** `PrinterManager` is a module-level singleton with a TinyEmitter event bus (`connected` / `disconnected` / `error`), NOT a React context. Bluetooth state must survive screen unmounts, the print queue must serialize across stores (printerStore, ReadingDetailScreen, future BondScreen), and module singletons are how the existing sync engine is structured (ADR-005). The Zustand `printerStore` subscribes to these events on module load to mirror state into UI.
- **ADR-018 (Wave 5):** Base64 + 512-byte chunked writes via the `buffer` package. The `react-native-bluetooth-classic@1.73.0-rc.12` JSI bridge requires base64-encoded payloads for `writeToDevice()`; writing the full receipt (~2-4 KB) in one call risks TX-buffer overflow on the printer firmware. 512 bytes is the documented safe chunk size from Datecs' SDK research notes (see `prepared-assets/printer/datecs-sdk-research.md`).
- **ADR-019 (PR #26):** **Two-stage authentication** — `/Authenticate` primary, `/Login` fallback. Field testing the Wave 5 APK revealed the backend is **.NET WCF, not PHP** (confirmed by the Arabic WCF Service Host error string `"الأسلوب غير مسموح..."`, the DataContract namespace `http://schemas.datacontract.org/2004/07/MProgService.models`, and the live Service Explorer at `/electric/`). The OFFICIAL auth endpoint per the live WCF docs is `POST /electric/Authenticate` with JSON body `{User, Password, appId}` (Capital U/P, camelCase appId, no secureId) returning a JSON string literal token. The legacy `/Login` endpoint exists but appears deprecated (returns HTTP 200 + `{}`). PR #25 had attempted to switch `appId` → `appid` lowercase based on a misread of the decompiled `AuthData.java` (which only applies to `/UserAuth`, not `/Login`); PR #25 was closed and replaced by PR #26 which restores `appId` camelCase consistently across the entire surface (also matches every `GetX?appId={APPID}` query string) and adds a two-stage flow with cross-stage diagnostics surfaced in `lastLoginError.responseBody` for in-app debugging without adb. See `AGENT_CONTEXT/AUTH_INVESTIGATION.md` for the full evidence trail.

## 6. API Endpoints (`/electric/` root)

These are the endpoints the sync engine and screens consume. All under `http(s)://<host>:<port>/electric/`.

1. `POST /auth/login` — username/password → JWT + user.
2. `POST /auth/logout`
3. `POST /license/activate` — deviceId + activationCode.
4. `GET  /license/status`
5. `GET  /sync/pull/readings`
6. `GET  /sync/pull/bonds`
7. `GET  /sync/pull/bond_payments`
8. `GET  /sync/pull/accounts`
9. `GET  /sync/pull/places`
10. `GET  /sync/pull/groups`
11. `GET  /sync/pull/tblh`
12. `GET  /sync/pull/currencies`
13. `GET  /sync/pull/users`
14. `GET  /sync/pull/company_info`
15. `POST /sync/push/readings`
16. `POST /sync/push/bonds`
17. `POST /sync/push/bond_payments`
18. `POST /sync/push/accounts`
19. `POST /sync/push/places`
20. `POST /sync/push/groups`
21. `POST /sync/ack`
22. `GET  /reports/daily`
23. `GET  /reports/branch`
24. `GET  /reports/collector`
25. `GET  /lookup/branches`
26. `GET  /lookup/tariffs`
27. `GET  /lookup/places`
28. `GET  /health`
29. `GET  /version`
30. `POST /device/register`
31. `POST /device/heartbeat`

## 7. Database Tables (WatermelonDB)

1. `readings` — meter reads (account_id, value, photo_uri, created_at).
2. `bonds` — collection receipts (account_id, amount, created_at).
3. `bond_payments` — per-bond payment lines.
4. `accounts` — customer accounts (place_id, group_id, balance).
5. `places` — geographic places.
6. `groups` — billing groups.
7. `tblh` — tariff lookup.
8. `currencies` — currency definitions.
9. `users` — local-cached user catalog.
10. `company_info` — branding/footer info.
11. `sync_queue` — outbound queue (status: pending|processing|failed|done).
12. `sync_log` — audit trail of sync runs.

## 8. Backlog (Next Waves)

- **Wave 5.2 (follow-up) — Scanner camera integration** via `react-native-vision-camera@3.x` (code scanner for QR/CODE128 to fast-locate readings/bonds).
- **Wave 5.3 (follow-up) — CompanyInfoScreen form** (react-hook-form + zod) writing to `company_info` table; logo upload to local storage.
- **Wave 6 — Bonds + BondPayments:** model activation, multi-currency aggregation, `NewBondScreen` / `BondDetailScreen` / `BondsScreen`, `PaymentModal`, integrate `buildBondReceipt`.
- **Wave 7 — Reports + Profile + About + Release v1.0.0:** reports module, ProfileScreen, AboutScreen, release keystore, ProGuard rules, signed APK pipeline.
- **Wave 8 — Recent-activity feed wired to real DB events + push notifications.**
- **Wave 9 — Performance pass + APK signing/CI release pipeline hardening.**

## 9. Warnings & Known Risks

- **Alias resolver:** `@/ds/theme` is only consistently resolved by Babel — keep using `@/design-system/theme` in TS files to satisfy tsc.
- **Cleartext HTTP:** `network_security_config.xml` permits cleartext globally. Acceptable today (Tailscale tunnel), but restrict to specific CIDR before any public release.
- **License binding:** `deviceId` is derived from device characteristics — wiping app data may invalidate license activation; document for field operators.
- **Drawer + RTL swipe edge:** with `drawerPosition: 'right'` the swipe-open edge is the **right** screen edge; verify on physical RTL device.
- **Sync queue growth:** no UI yet to inspect/retry queue items. Counter visible in SyncStatusBadge modal; full UI deferred.
- **Wave-2 components are sealed:** do not modify `authStore`, `licenseStore`, `LoginScreen` logic, `LicenseActivationScreen`, or `RootNavigator` beyond additive routes/imports.

## 10. Local Build & Run

```bash
# Install
cd AbbasiTahseel && npm ci

# TypeCheck (must be 0 errors before commit)
npx tsc --noEmit

# Smoke-test the Metro bundle
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/test-bundle.js \
  --assets-dest /tmp/test-assets

# Run on a connected device
npx react-native run-android

# Or build a release APK locally
cd android && ./gradlew assembleRelease
```

## 11. Build History

| Wave | Date     | Branch                          | Result   | APK Size |
|------|----------|---------------------------------|----------|----------|
| 1    | Pre-set  | `main`                          | Success  | ~40 MB   |
| 2    | Wave-2   | `feat/wave-2-auth-nav`          | Success  | 44.71 MB |
| 3    | Wave-3   | `feat/wave-3-main-shell`        | Success  | 46.87 MB |
| 4    | Wave-4   | `feat/wave-4-readings-and-dev-bypass` | Success  | 46.93 MB |
| 5    | Wave-5   | `feat/wave-5-printer-scanner`   | Pending  | ~50 MB est. |

## 12. Token & Secrets Hygiene

- Auth for `git push` uses gh CLI credential helper only.
- No PAT is ever written into `.git/config` URLs; we never commit secrets.
- After PR merge, the credential helper is the only place auth lives, and it is per-sandbox/ephemeral.
- Never log `$GSK_TOKEN`, GitHub PATs, or any value from `~/.git-credentials`.
