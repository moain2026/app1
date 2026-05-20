# AGENT_CONTEXT — Handoff Knowledge Base

> **Read this folder FIRST.** Every file is < 80 lines, designed to bring a
> fresh AI agent up-to-speed on the AbbasiTahseel React Native rebuild in
> under five minutes.

## Project

- **Name:** AbbasiTahseel — meter-reading & bond-collection field app.
- **Customer:** شركة العباسي لتوليد الكهرباء التجارية.
- **Replaces:** Legacy Java/Android app `ElectricCollector28`.
- **Stack:** React Native 0.74.5 (Bare) + TypeScript 5.4.5 strict + Zustand
  + WatermelonDB 0.27.1 + i18next (ar primary, RTL).
- **Repo:** `moain2026/app1` (this directory: `/home/user/webapp/AbbasiTahseel/`).

## Current Wave

- **Wave 5** — Printer (Datecs DPP-250 / ESC/POS / cp1256), Bluetooth
  Classic, Barcode Scanner, Company Info, Drawer integration.
- **Branch:** `feat/wave-5-printer-scanner`
- **PR:** not yet opened (held until Wave 5 phases complete).
- **Status:** ~50% — core printer module + receipt builders + store DONE.

## Reading Order

1. `README.md` (this file)
2. `CURRENT_STATE.md` ← **▶ START HERE on resume**
3. `WAVE_5_PLAN.md` ← what to build next, in order
4. `CODING_RULES.md` ← red lines you must respect
5. `PROJECT_MAP.md` ← directory layout cheat sheet
6. `KEY_PATHS.md` ← file location lookup
7. `KNOWN_ISSUES.md` ← gotchas + magic values
8. `PREPARED_ASSETS_GUIDE.md` ← what's in `prepared-assets/`
9. `COMMIT_HISTORY.md` ← what already shipped
10. `HANDOFF_PROTOCOL.md` ← how to stop gracefully

## Top 3 Rules (the rest are in CODING_RULES.md)

1. **Zero `any`, zero `@ts-ignore`, zero `as unknown as`** — keep tsc clean.
2. **Preserve legacy column names verbatim** (`num`, `ks`, `kh`, `cas`,
   `asts`, `noadad`, `nomstlm`, `notblh`, `nog`, `ind`, `name`, `namet`,
   `sync_status`). The backend depends on these exact spellings.
3. **Push after every commit.** No local-only commits. Branch state on
   GitHub = source of truth.

## Don't Touch

- `prepared-assets/` is git-ignored — reference material only. Never merge.
- `main` branch — every wave gets a separate PR; do not commit to main.
