# CURRENT_STATE — ▶️ RESUME FROM HERE

> Living document. Update **before** stopping. Always reflects the next
> concrete action, not history.

## ▶️ RESUME FROM HERE

**PR #26 (WCF authentication fix) is OPEN and CI is GREEN. Awaiting field-test by the user.**
👉 https://github.com/moain2026/app1/pull/26

**Next concrete action when you return:**
1. Ask the user to install the APK from PR #26's CI artifact and test login
   with real credentials (`معين العباسي` / `771771`) against the live
   WCF server at `http://100.87.131.115:3000/electric/`.
2. **If login succeeds** → merge PR #26 → start **Wave 6 — Bonds**
   (see PROJECT_PLAYBOOK.md §8 backlog and WAVE_5_PLAN.md "Wave 6 preview").
3. **If login fails** → the user will copy the "تفاصيل" diagnostic from
   the error box on LoginScreen. The box will now contain raw responses
   from BOTH `/Authenticate` (STAGE 1) AND `/Login` (STAGE 2). Use those
   raw bodies to decide the next fix (the two-stage code in
   `src/stores/authStore.ts` makes this debuggable).

## Critical context for the new agent

**The backend is a .NET WCF service**, NOT PHP. This was discovered late
in the session (after PR #25 was shipped on a wrong assumption). Full
investigation history is in `AGENT_CONTEXT/AUTH_INVESTIGATION.md`. The
short version:

- Live server: `http://100.87.131.115:3000/electric/` (over Tailscale VPN)
- Official auth endpoint: `/Authenticate` with `{ "User", "Password", "appId" }`
  (Capital U, Capital P, camelCase appId) → returns a JSON string literal
- Legacy `/Login` endpoint exists but appears deprecated (returns `{}`)
- All other endpoints use `appId` (camelCase) in their query strings —
  consistent with `/Authenticate`'s field naming

`src/stores/authStore.ts` now tries `/Authenticate` first, falls back to
`/Login` on failure, and surfaces BOTH raw responses in the diagnostic
error box for the user to copy.

## Branches / PRs

- **Active branch:** `fix/wcf-authenticate-endpoint`
- **Last commit:** `8c0c48b fix(auth): switch to /Authenticate (WCF) with /Login fallback`
- **Main branch:** at `3ba68ac Prep/wave 5 7 assets (#24)` (Wave 5 merged)
- **Open PRs:** #26 (WCF fix, this branch → main)
- **Closed PRs this session:** #25 (was a wrong-direction fix; replaced by #26)
- **Merged PRs this session:** #23 (Wave 5), #24 (Wave 5 prep assets)

## Wave 5 — DONE (merged via PR #23)

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
- ✅ `react-native-bluetooth-classic@~1.73.0-rc.12` + `buffer@~6.0.3` installed

## Wave 5 — DEFERRED (follow-ups, not blocking)

- ⏳ **Wave 5.2** — `ScannerScreen.tsx` real camera (`react-native-vision-camera@3.x`).
  Currently a stub showing camera-off icon + manual-entry CTA.
- ⏳ **Wave 5.3** — `CompanyInfoScreen.tsx` real form (`react-hook-form` + `zod`)
  bound to `company_info` table. Currently a stub.

## Auth Fix Wave (PR #26) — current

- ✅ `src/services/api/endpoints.ts` — added `authenticate` endpoint;
  kept `login` as documented fallback
- ✅ `src/services/api/schemas/auth.ts` — added `AuthenticateRequestSchema`
  + `AuthenticateResponseSchema` (z.string for the raw quoted-string body)
- ✅ `src/stores/authStore.ts` — rewrote `login()` as a two-stage flow:
  STAGE 1 `/Authenticate` → STAGE 2 `/Login` fallback; cross-stage
  diagnostics in `lastLoginError.responseBody`
- ✅ `tsc --noEmit` → 0 errors
- ✅ CI: both checks pass (`tsc --noEmit` 36s, `Assemble Debug APK` 6m18s)
- ⏳ User field-test pending

## Build State

- `npx tsc --noEmit`: **0 errors** (last run after `8c0c48b`).
- PR #26 CI: ✅ both checks pass — APK artifact `abbasi-tahseel-debug-apk`
  ready on workflow run `26259193684`.

## Wave 6 + 7 (Future)

- **Wave 6 — Bonds + BondPayments:**
  - Activate `Bond` + `BondPayment` models in `src/database/models/`
  - Multi-currency (IQD/USD) totals + per-currency aggregation
  - `NewBondScreen`, `BondDetailScreen`, `BondsScreen`, `PaymentModal`
  - Integrate `buildBondReceipt` from Wave 5
  - Branch suggestion: `feat/wave-6-bonds`
- **Wave 7 — Reports + Profile + About + Release v1.0.0:**
  - ReportsScreen, ProfileScreen, AboutScreen
  - Release keystore + ProGuard rules
  - Signed APK pipeline (`./gradlew assembleRelease`)
  - Branch suggestion: `feat/wave-7-release`

## Quick links

- **PR #26 (current):** https://github.com/moain2026/app1/pull/26
- **PR #25 (closed, archived):** https://github.com/moain2026/app1/pull/25
- **PR #23 (Wave 5 merged):** https://github.com/moain2026/app1/pull/23
- **Repo:** https://github.com/moain2026/app1
- **Playbook:** `PROJECT_PLAYBOOK.md`
- **Coding rules:** `AGENT_CONTEXT/CODING_RULES.md`
- **Auth investigation:** `AGENT_CONTEXT/AUTH_INVESTIGATION.md`
- **Network topology:** `AGENT_CONTEXT/NETWORK_TOPOLOGY.md`
- **Legacy Java map:** `AGENT_CONTEXT/LEGACY_JAVA_MAP.md`
- **Skills folder:** `.claude/skills/` (8 skill files, see `.claude/skills/README.md`)
- **Handoff prompt:** `/home/user/webapp/HANDOFF_PROMPT.md` (root of repo)
