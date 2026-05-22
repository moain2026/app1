# CURRENT_STATE — ▶️ RESUME FROM HERE

> Living document. Update **before** stopping. Always reflects the next
> concrete action, not history.

## ▶️ RESUME FROM HERE

**PR #26 (WCF two-stage authentication) is MERGED. Wave 5 train fully landed.**
👉 Next concrete work: **Wave 6 — Bonds + BondPayments**.

**Next concrete action when you return:**
1. Branch off `main` as `feat/wave-6-bonds`.
2. Read `WAVE_5_PLAN.md` "Wave 6 preview" + `PROJECT_PLAYBOOK.md` §8 backlog
   + `prepared-assets/mock/mock-bonds.json` (gitignored reference) for the
   expected bond + payment shape.
3. Authoritative API truth = the live WCF Service Explorer at
   `http://100.87.131.115:3000/electric/help` (Tailscale-only). Use
   `LEGACY_JAVA_MAP.md` + `Bond.java` / `BondPayment.java` decompiles only
   as a tie-breaker when the live help page is ambiguous (see rule in
   `.claude/skills/legacy-java-decompile-analysis.md`).
4. **If any DB field name is unclear → STOP and ask the user.** Do not
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

- **Active branch:** `main` (clean, in sync with origin)
- **Last commit on main:** `3e7e557 fix(auth): use /Authenticate (WCF) as primary, /Login as fallback (#26)`
- **Next branch to create:** `feat/wave-6-bonds` (off main)
- **Open PRs:** none
- **Recently merged PRs:** #26 (WCF two-stage auth), #24 (Wave 5/7 prep assets), #23 (Wave 5)
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

## Wave 6 — NEXT (planned scope)

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
