# AGENT_CONTEXT — Handoff Knowledge Base

> **Read this folder FIRST.** Every file is < 200 lines, designed to bring
> a fresh AI agent up-to-speed on the AbbasiTahseel React Native rebuild
> in under five minutes.

## Project

- **Name:** AbbasiTahseel — meter-reading & bond-collection field app.
- **Customer:** شركة العباسي لتوليد الكهرباء التجارية.
- **Replaces:** Legacy Java/Android app `ElectricCollector28`.
- **Stack:** React Native 0.74.5 (Bare) + TypeScript 5.4.5 strict + Zustand
  + WatermelonDB 0.27.1 + i18next (ar primary, RTL).
- **Repo:** `moain2026/app1` (this directory: `/home/user/webapp/AbbasiTahseel/`).
- **Backend:** .NET WCF service at `http://100.87.131.115:3000/electric/` (over Tailscale VPN).

## Current Wave

- **PR #26 OPEN** — WCF authentication fix (two-stage `/Authenticate` + `/Login` fallback).
  CI is green; awaiting user field-test on real device.
- **Wave 5 MERGED** (PR #23) — printer module + scanner stub + company info stub.
- **Branch:** `fix/wcf-authenticate-endpoint`
- **Next wave:** Wave 6 — Bonds + BondPayments.

## Reading Order (in this folder)

1. `README.md` (this file)
2. `CURRENT_STATE.md` ← **▶ START HERE on resume**
3. `AUTH_INVESTIGATION.md` ← **the WCF discovery story (READ if touching auth)**
4. `KNOWN_ISSUES.md` ← gotchas + magic values
5. `NETWORK_TOPOLOGY.md` ← Tailscale + server map
6. `LEGACY_JAVA_MAP.md` ← decompiled Java reference index
7. `CODING_RULES.md` ← red lines you must respect
8. `PROJECT_MAP.md` ← directory layout cheat sheet
9. `KEY_PATHS.md` ← file location lookup
10. `PREPARED_ASSETS_GUIDE.md` ← what's in `prepared-assets/`
11. `WAVE_5_PLAN.md` ← archived wave plan (historical)
12. `COMMIT_HISTORY.md` ← what already shipped
13. `HANDOFF_PROTOCOL.md` ← how to stop gracefully

## Skills (specialised know-how)

`.claude/skills/` contains 8 skill briefs, each one for a different
domain you'll hit in this project. **Open them on-demand, not all at once.**

| File | Open when... |
|---|---|
| `wcf-api-debugging.md` | Any backend interaction issue |
| `react-native-android-build.md` | Building APKs / Gradle issues |
| `apk-install-and-test.md` | User is testing an APK on phone |
| `arabic-cp1256-printing.md` | Printer / ESC/POS / Arabic shaping |
| `zustand-store-architecture.md` | Adding/modifying a store |
| `legacy-java-decompile-analysis.md` | Verifying wire format vs legacy app |
| `zod-schema-validation.md` | Adding/modifying API schemas |
| `git-workflow-genspark.md` | Before any commit (READ FIRST SESSION) |
| `watermelondb-models-and-sync.md` | Wave 6+ database work |

## Top 5 Rules (the rest are in CODING_RULES.md)

1. **Zero `any`, zero `@ts-ignore`, zero `as unknown as`** — keep tsc clean.
2. **Preserve legacy column names verbatim** (`num`, `ks`, `kh`, `cas`,
   `asts`, `noadad`, `nomstlm`, `notblh`, `nog`, `ind`, `name`, `namet`,
   `sync_status`). The backend depends on these exact spellings.
3. **Push after every commit.** No local-only commits. Branch state on
   GitHub = source of truth.
4. **`appId` is camelCase everywhere.** Do NOT lowercase it (PR #25 made
   this mistake). All WCF endpoints use `appId` camelCase in both bodies
   and query strings.
5. **Never trust the decompiled Java over the live WCF Service Explorer.**
   The live server is the source of truth. Java is a tie-breaker only.

## Don't Touch

- `prepared-assets/` is git-ignored — reference material only. Never merge.
- `main` branch — every wave gets a separate PR; do not commit to main.
- `ElectricCollector_Full_Analysis/` — read-only decompiled Java reference.
- The `+a` refresh-token bug, XOR Defence math, etc. — intentionally
  avoided. See ADRs in PROJECT_PLAYBOOK.md.

## Quick start (new agent)

```bash
# 1. Where am I?
cd /home/user/webapp/AbbasiTahseel && pwd

# 2. What's the git state?
git status && git branch --show-current && git log --oneline -5

# 3. What did the previous agent leave for me?
cat AGENT_CONTEXT/CURRENT_STATE.md

# 4. Is the baseline clean?
npx tsc --noEmit

# 5. What are the open PRs?
gh pr list
```

Then read `CURRENT_STATE.md`'s "▶️ RESUME FROM HERE" block and start
there.

## Repository links

- **Repo:** https://github.com/moain2026/app1
- **PR #26 (current):** https://github.com/moain2026/app1/pull/26
- **PR #23 (Wave 5, merged):** https://github.com/moain2026/app1/pull/23
- **Actions:** https://github.com/moain2026/app1/actions
