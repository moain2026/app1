# CURRENT_STATE — ▶️ RESUME FROM HERE

> Living document. Update **before** stopping. Always reflects the next
> concrete action, not history.

## ▶️ RESUME FROM HERE

**PR #29 (Wave 6-Β Data Layer) is OPEN, CI green on `tsc --noEmit`, awaiting merge.**
**Wave 6-Α UI Skeleton (PR #28) merged as `69b22c6`. WCF auth (PR #26) and Wave 5 train fully landed.**
👉 Next concrete work (after PR #29 merges): **Wave 6-Γ — Bond mutations + Reports aggregation + Model field expansion**.

**Next concrete action when you return:**
1. Confirm PR #29 merged into `main`; pull `main` and delete `feat/wave-6-beta-data-layer`.
2. Branch off `main` as `feat/wave-6-gamma-mutations` (or comparable).
3. **Wave 6-Γ scope** (deferred from Wave 6-Β by user decision D2 + E-alt):
   - Bond mutation paths (`createBond` / `updateBond` / `deleteBond`) in
     `bondsRepository.ts` — requires finalized WCF push contract for `ItemBonds`.
   - `BondFormScreen` + `BondPaymentFormScreen` wire from MOCK → repository.
   - Reports screens — need new aggregation tables for monthly cas/asts rollup.
   - `ReadingsHistoryScreen.history` table — same aggregation dependency.
   - Model field expansion: `sk`, `mt`, `kmsn`, `matm33`, `rtrdn` (Reading),
     `name_s`, `balance`, `cas`, `currencyname`, `balance_local` (Bond) —
     **separate PR after the user provides the WCF Help dump**.
   - Boolean → int32 user permission migration — separate PR.
4. Authoritative API truth = the live WCF Service Explorer at
   `http://100.87.131.115:3000/electric/help` (Tailscale-only). Use
   `LEGACY_JAVA_MAP.md` + `Bond.java` / `BondPayment.java` decompiles only
   as a tie-breaker when the live help page is ambiguous (see rule in
   `.claude/skills/legacy-java-decompile-analysis.md`).
5. **If any DB field name is unclear → STOP and ask the user.** Do not
   guess. PR #25 shipped on a guess and was thrown away.

## Critical context for the new agent

**The backend is a .NET WCF service**, NOT PHP. This was discovered late
in the previous session (PR #25 shipped on a wrong PHP assumption and was
closed in favour of PR #26). Full investigation history is in
`AGENT_CONTEXT/AUTH_INVESTIGATION.md`. The short version:

- Live server: `http://100.87.131.115:3000/electric/` (over Tailscale VPN)
- Primary auth endpoint: `/Authenticate` with `{ "User", "Password", "appId" }`
  (Capital U, Capital P, camelCase appId) → returns a JSON string literal
- Fallback auth endpoint: `/Login` with `{ username, password, appId, secureId }`
- All other endpoints use `appId` (camelCase) in their query strings

`src/stores/authStore.ts` tries `/Authenticate` first, falls back to
`/Login` on failure, and surfaces BOTH raw responses in the diagnostic
error box for the user to copy (separator: `──────────`). ADR-019 in
`PROJECT_PLAYBOOK.md` documents the contract in full.

## Branches / PRs

- **Active branch:** `feat/wave-6-beta-data-layer` (PR #29 open, awaiting merge)
- **Last commit on main:** `69b22c6 feat(wave-6-α): UI Skeleton — bonds, reports, readings, settings, pickers, design-system, mocks, i18n (#28)`
- **Last commit on active branch:** `cdcca90 fix(wave-6-β): rename bonds getStats/observeStats to avoid barrel export collision (TS2308)`
- **Next branch to create (after PR #29 merges):** `feat/wave-6-gamma-mutations` (off main)
- **Open PRs:** **#29** (Wave 6-Β Data Layer — CI green on tsc, APK pending)
- **Recently merged PRs:** #28 (Wave 6-Α UI Skeleton), #27 (docs sync), #26 (WCF two-stage auth), #24 (Wave 5/7 prep assets), #23 (Wave 5)
- **Closed-without-merge PRs:** #25 (wrong PHP-style fix, replaced by #26)

## Wave 5 — DONE (merged via PR #23, head branch `feat/wave-5-printer-scanner`)

### Services
- ✅ `src/services/printer/cp1256.ts` (encoder + Arabic shaper + 226-entry map)
- ✅ `src/services/printer/escposBuilder.ts` (ESC/POS primitives)
- ✅ `src/services/printer/PrinterManager.ts` (singleton + TinyEmitter)
- ✅ `src/services/printer/receiptBuilders/buildReadingReceipt.ts`
- ✅ `src/services/printer/receiptBuilders/buildBondReceipt.ts`
- ✅ `src/services/printer/receiptBuilders/buildDailySummary.ts`
- ✅ `src/services/printer/receiptBuilders/index.ts` (barrel)
- ✅ `src/services/printer/testPage.ts`

### State + hooks
- ✅ `src/stores/printerStore.ts` (11 actions, event-subscribed)
- ✅ `src/stores/index.ts` re-export
- ✅ `src/hooks/usePrinter.ts` + `src/hooks/index.ts` (barrel)

### Screens
- ✅ `src/screens/settings/PrinterSettingsScreen.tsx` (full impl)
- ✅ `src/screens/main/ReadingDetailScreen.tsx` (print button)
- ✅ `src/screens/main/ReadingsScreen.tsx` (red FAB → Scanner)
- ✅ `src/screens/settings/CompanyInfoScreen.tsx` (stub — Wave 5.3)
- ✅ `src/screens/main/ScannerScreen.tsx` (stub — Wave 5.2)

### Navigation
- ✅ `src/navigation/types.ts` (3 new routes)
- ✅ `src/navigation/MainStack.tsx` (3 new Drawer.Screens)
- ✅ `src/navigation/DrawerContent.tsx` (MENU_ITEMS + status dot)

### Platform / i18n / docs
- ✅ `android/app/src/main/AndroidManifest.xml` (BT + Camera perms)
- ✅ `src/i18n/locales/ar.json` (printer / scanner / company / drawer keys)
- ✅ `PROJECT_PLAYBOOK.md` (Wave 5 history + ADR-015..018 + backlog refresh)
- ✅ `react-native-bluetooth-classic@^1.73.0-rc.12` + `buffer` installed

## Auth Fix Wave — DONE (merged via PR #26)

- ✅ `src/services/api/endpoints.ts` — added `authenticate` endpoint;
  kept `login` as documented fallback
- ✅ `src/services/api/schemas/auth.ts` — added `AuthenticateRequestSchema`
  + `AuthenticateResponseSchema` (z.string for the raw quoted-string body)
- ✅ `src/stores/authStore.ts` — rewrote `login()` as a two-stage flow:
  STAGE 1 `/Authenticate` → STAGE 2 `/Login` fallback; cross-stage
  diagnostics in `lastLoginError.responseBody`
- ✅ CI: both checks pass — last green run `26262216831` at `3e7e557`

## Deferred follow-ups (not blocking Wave 6)

- ⏳ **Wave 5.2** — `ScannerScreen.tsx` real camera (`react-native-vision-camera@3.x`).
  Currently a stub showing camera-off icon + manual-entry CTA. The user
  chose to defer this until after Wave 6.
- ⏳ **Wave 5.3** — `CompanyInfoScreen.tsx` real form (`react-hook-form` + `zod`)
  bound to `company_info` table. Currently a stub. Will be picked up
  alongside or after Wave 6.

## Build State

- `npx tsc --noEmit`: **claimed 0 errors** at `3e7e557` based on the
  green typecheck CI check; cannot be re-verified locally because
  `node_modules/` is gitignored and `npm install` is not run in this
  agent sandbox.
- Last green main-branch CI: workflow run `26262216831` (Build Android
  Debug APK) at `2026-05-22T01:01:03Z`, head `3e7e557`. APK artifact name:
  `abbasi-tahseel-debug-apk` (30-day retention).

## Wave 6-Β: Data Layer (PR #29 — OPEN)

**Branch:** `feat/wave-6-beta-data-layer` (off `main` @ `69b22c6`)
**Commits:** `c4cb704` (initial, 22 files, +1958/−161) + `cdcca90` (TS2308 fix)
**CI:** `tsc --noEmit` ✅ green; `Assemble Debug APK` was running at handoff.
**User decision applied:** D2 + E-alt — extend existing `src/services/api/`
tree (no new top-level folders), use the existing field set only, defer
Model expansion and boolean→int32 to later PRs.

### What shipped

**Repositories (6 total — 5 new + 1 pre-existing):**
- `src/services/repository/bondsRepository.ts` — `observeBonds`,
  `observeBondStats`, `observeBondByUuid`, `applyNumericBondNoFilter`,
  `fetchBonds`, `findBondByUuid`, `getBondStats`
- `src/services/repository/bondPaymentsRepository.ts` —
  `observePaymentsByBond`, `fetchPaymentsByBond`
- `src/services/repository/accountsRepository.ts` — `observeAccounts`,
  `fetchAccounts`, `findAccountByCode`, `observeAccountByCode`,
  `findAccountByRemoteId`
- `src/services/repository/placesRepository.ts` — `observePlaces`,
  `fetchPlaces`, `findPlaceByRemoteId`
- `src/services/repository/currenciesRepository.ts` — `observeCurrencies`,
  `fetchCurrencies`, `findCurrencyByRemoteId`, `findBaseCurrency`
- `src/services/repository/readingsRepository.ts` (pre-existing, untouched)
- `src/services/repository/index.ts` — barrel

All `observe*` return `Observable<T[]>` from rxjs (proper ES import,
never `require()`). Search uses `Q.like` with `%/_` escaping. Read-only —
**no mutations** in this PR (deferred to Wave 6-Γ).

**View-Models (3 files):**
- `src/services/repository/viewModels/bondListItem.vm.ts` — `BondLookups`,
  `emptyBondLookups`, `indexByRemoteId`, `toBondListItem(s)` (Bond →
  MockBond, 5→3 syncStatus collapse, denormalized `account.code` +
  `currency.symbol` via lookup map)
- `src/services/repository/viewModels/pickers.vm.ts` — `toMockPlace`,
  `toMockAccount`, `toMockCurrency` (+ array variants) with static
  MOCK_* fallback for fields not on WMDB (placeName, groupName,
  subscriberCount, active)
- `src/services/repository/viewModels/index.ts` — barrel

**Seeders (5 new + 1 pre-existing):**
- `src/services/mock/seedCurrencies.ts` — symbol-as-code
- `src/services/mock/seedPlaces.ts` — drops subscriberCount
- `src/services/mock/seedAccounts.ts` — drops place/group
- `src/services/mock/seedBonds.ts` — **two-phase write** (bonds → query
  back for WMDB local ids → bond_payments with `bond_id` FK)
- `src/services/mock/seedAll.ts` — orchestrator:
  `parallel(currencies, places, accounts) → bonds → readings`
- `src/services/mock/seedMockData.ts` (pre-existing readings seeder,
  invoked by `seedAll`)

**Migration Runner Skeleton:**
- `src/database/migrationRunner.ts` — `MIGRATION_RUNNER_VERSION = 0`,
  empty `HOOKS` registry, MMKV-backed version persistence
  (id: `abbasi-tahseel-migrations`), fail-open per hook, idempotent.
  Wired into `App.tsx` bootstrap (`initI18n → runMigrationHooks →
  syncStore.init`) but is a no-op until Wave 6-Γ registers the first hook.
  Rules in header: ADDITIVE ONLY, IDEMPOTENT, FAIL-OPEN, NO NETWORK.

### Wired surfaces — 6 of ~25 (deliberate narrowing)

| ✅ Wired in PR #29 (6) | Observable used |
|---|---|
| `AccountPicker` | `observeAccounts({searchQuery})` → `toMockAccounts` |
| `PlacePicker` | `observePlaces` → `toMockPlaces` |
| `CurrencyPicker` | `observeCurrencies` → `toMockCurrencies` |
| `BondsListScreen` | `observeBonds` + `observeBondStats` + `observeAccounts` + `observeCurrencies` → `BondLookups` → `toBondListItems` |
| `BondDetailScreen` | `observeBondByUuid` + `observePaymentsByBond(bond.id)` + `findCurrencyByRemoteId` (3-state load: undefined/null/Bond) |
| `ReadingsHistoryScreen` | `observeAccountByCode` (header only; history table stays MOCK) |

Untouched: `BondCard`, picker rows, chip bars, etc. The view-model layer
absorbed the shape difference so no presentation component needed editing.

### Deferred to Wave 6-Γ (documented in code headers + PR #29 body)

- **Bond mutation paths** (`createBond` / `updateBond` / `deleteBond`) —
  waiting on finalized WCF Help dump for `ItemBonds` + `SaveBondPayment`.
- **Form screens** (`BondFormScreen`, `BondPaymentFormScreen`) — still on
  MOCK; depend on the mutation paths above.
- **Reports screens** — need new aggregation tables on WMDB (monthly
  cas/asts rollup). The current `readings` table has one row per
  (account, month) but no rollup columns.
- **Readings history aggregation** in `ReadingsHistoryScreen` — same
  table dependency as Reports.
- **Profile / About / Bulk screens** — wait on Settings store wiring.
- **Model field expansion** (`sk`, `mt`, `kmsn`, `matm33`, `rtrdn`,
  `name_s`, `balance`, `cas`, `currencyname`, `balance_local`) —
  separate PR after WCF Help dump (user E-alt).
- **Boolean → int32 user permission migration** — separate PR.
- **Place filter on `accountsRepository`** — currently client-side
  because `accounts.tblh_id` is not yet on the live pull.

### Files in PR #29

22 files in commit `c4cb704` + 2 files in `cdcca90`. Net diff:
+1962 / −165. Created: 1 migrationRunner + 6 repositories + 3 viewModels
+ 5 seeders. Modified: `App.tsx` + 3 pickers + 3 screens.

## Wave 6 — NEXT (planned scope — superseded; kept for context)

- **Goal:** Bonds + BondPayments full screens, store, API, offline-first
  enqueue, printer integration via existing `buildBondReceipt`.
- **Branch:** `feat/wave-6-bonds`
- **Files (new):**
  - `src/screens/main/Bonds/BondsListScreen.tsx`
  - `src/screens/main/Bonds/BondDetailScreen.tsx`
  - `src/screens/main/Bonds/NewBondScreen.tsx`
  - `src/screens/main/Bonds/PaymentModal.tsx`
  - `src/stores/bondsStore.ts` (Zustand, follows pattern in
    `.claude/skills/zustand-store-architecture.md`)
  - `src/services/api/bondsApi.ts` (zod schemas + axios)
- **Files (touch):**
  - `src/navigation/types.ts` + `MainStack.tsx` (new routes)
  - `src/navigation/DrawerContent.tsx` (menu entry)
  - `src/i18n/locales/ar.json` (merge from
    `prepared-assets/i18n/ar-wave6-bonds.json` if present)
  - `src/database/models/Bond.ts` / `BondPayment.ts` (verify alignment
    with WCF help-page reality before extending)
  - Possibly `src/database/migrations.ts` (schema v2 via forward-only
    migration step — **NOT** a schema bump that discards data)
- **Success criteria:** `tsc --noEmit` clean, `eslint` clean, CI APK
  builds green, PR opened with conventional title `feat(wave-6): bonds + bond payments`.

## Wave 7 (Future)

- **Wave 7 — Reports + Profile + About + Release v1.0.0:**
  - ReportsScreen (uses `posts` / `GetRepBalanceHeader` endpoint alias)
  - ProfileScreen, AboutScreen
  - Real release keystore + ProGuard rules
  - Signed APK pipeline (`./gradlew assembleRelease`)
  - Branch suggestion: `feat/wave-7-release`

## Quick links

- **Repo:** https://github.com/moain2026/app1
- **PR #29 (Wave 6-Β Data Layer, OPEN):** https://github.com/moain2026/app1/pull/29
- **PR #28 (Wave 6-Α UI Skeleton, merged):** https://github.com/moain2026/app1/pull/28
- **PR #27 (docs sync, merged):** https://github.com/moain2026/app1/pull/27
- **PR #26 (merged, WCF auth):** https://github.com/moain2026/app1/pull/26
- **PR #25 (closed, archived):** https://github.com/moain2026/app1/pull/25
- **PR #23 (Wave 5 merged):** https://github.com/moain2026/app1/pull/23
- **PR #24 (assets prep merged):** https://github.com/moain2026/app1/pull/24
- **Playbook:** `PROJECT_PLAYBOOK.md`
- **Coding rules:** `AGENT_CONTEXT/CODING_RULES.md`
- **Auth investigation:** `AGENT_CONTEXT/AUTH_INVESTIGATION.md`
- **Network topology:** `AGENT_CONTEXT/NETWORK_TOPOLOGY.md`
- **Legacy Java map:** `AGENT_CONTEXT/LEGACY_JAVA_MAP.md`
- **Skills folder:** `.claude/skills/` (10 skill files, see `.claude/skills/README.md`)
- **Handoff prompt:** `/home/user/webapp/HANDOFF_PROMPT.md` (root of repo)
