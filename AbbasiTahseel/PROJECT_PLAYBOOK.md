# PROJECT PLAYBOOK — AbbasiTahseel (شركة العباسي لتوليد الكهرباء التجارية)

> Operational reference for the React Native rebuild of the legacy
> `ElectricCollector28` Android field-collection app.
> **Last updated:** Wave 3 — Main Shell + Tailscale Settings + Home Dashboard.

---

## 1. Current State (End of Wave 4)

- **Build status:** APK builds successfully via GitHub Actions (last Wave-2 CI: 44.71 MB).
- **App entry flow:** Splash → License Activation (if not activated) → Login → MainStack (Drawer wrapping Tabs).
- **Network default:** Tailscale VPN IP `100.87.131.115:3000/electric/` over HTTP (cleartext allowed globally).
- **Active branch under work:** `feat/wave-3-main-shell`.
- **Persisted preferences:** hosting IP, port, useHttps, branch number, language, theme.
- **Sync engine:** event-driven push+pull coordinator with queue + connectivity monitor (no UI in this wave beyond the badge).
- **i18n:** Arabic-first (RTL) via `i18next` + `react-i18next`; all visible strings via `t()`.

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

- **Wave 5 — Account lookup + tariff calc + receipt preview.**
- **Wave 6 — BondsScreen:** bond entry, partial payments, receipts printing.
- **Wave 7 — Reports + Profile + general Settings page (theme/language).**
- **Wave 8 — Recent-activity feed wired to real DB events + push notifications.**
- **Wave 9 — Performance pass + APK signing/CI release pipeline.**

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
| 4    | Wave-4   | `feat/wave-4-readings-and-dev-bypass` | Pending  | —        |

## 12. Token & Secrets Hygiene

- Auth for `git push` uses gh CLI credential helper only.
- No PAT is ever written into `.git/config` URLs; we never commit secrets.
- After PR merge, the credential helper is the only place auth lives, and it is per-sandbox/ephemeral.
- Never log `$GSK_TOKEN`, GitHub PATs, or any value from `~/.git-credentials`.
