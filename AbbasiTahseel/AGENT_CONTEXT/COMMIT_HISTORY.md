# COMMIT_HISTORY — Last 12 Commits (newest first)

> Generated from `git log --oneline -12` on the active branch
> `feat/wave-5-printer-scanner`.

| Hash | Subject | What |
|------|---------|------|
| `07c3fdc` | `docs(playbook): Wave 5 section + ADR-015..018 + backlog update` | `PROJECT_PLAYBOOK.md`. Adds Wave 5 history bullet (Sections A–H), 4 new ADRs, refreshed Section 1, refreshed tech stack, refreshed backlog. |
| `ebb4440` | `feat(readings): red FAB → Scanner route` | `src/screens/main/ReadingsScreen.tsx`. 56dp danger-colored FAB with `Feather maximize` icon, navigates to `Scanner` with `{ returnTo: 'Readings' }`. NavLike overload added. |
| `127f6b0` | `feat(nav): wire PrinterSettings + CompanyInfo + Scanner routes` | `src/navigation/{types,MainStack,DrawerContent}.tsx` + 2 new stub screens. PrinterSettings + CompanyInfo appended to MENU_ITEMS; live status dot subscribed to `usePrinterStore`. |
| `2260331` | `chore(android): refine bluetooth + camera permissions for API 31+` | `AndroidManifest.xml`. CAMERA + features (required=false), `tools:targetApi="s"` + `neverForLocation` on BLUETOOTH_SCAN, `maxSdkVersion="30"` on legacy BT perms. |
| `831a96a` | `feat(printer): print button on ReadingDetailScreen` | `ReadingDetailScreen.tsx`. Print button below Save; disabled when `kh == null \|\| !isConnected \|\| isPrinting`. Composes ReadingReceiptInput from current reading + authStore user + i18n company name. |
| `b16f0d2` | `feat(printer): PrinterSettingsScreen — discovery + pair + test print` | Full screen: status card, scan card with device list, test print card, error banner. `ar.json` merged with `printer.*`/`scanner.*`/`company.*` keys. |
| `2169653` | `feat(printer): usePrinter hook — store + manager wrapper` | `src/hooks/usePrinter.ts` + barrel. Thin wrapper calling `syncFromManager()` on mount + useCallback-wrapped store actions. |
| `c51ff5b` | `docs(context): agent handoff system — 10 context files for seamless resumption` | `AGENT_CONTEXT/` folder: README, CURRENT_STATE, PROJECT_MAP, CODING_RULES, WAVE_5_PLAN, KEY_PATHS, KNOWN_ISSUES, COMMIT_HISTORY, PREPARED_ASSETS_GUIDE, HANDOFF_PROTOCOL. |
| `6c8423d` | `feat(printer): Zustand printerStore + ESC/POS test page` | `src/stores/printerStore.ts` + `src/services/printer/testPage.ts` + barrel update. Store owns scan/pair/print UI state, subscribes to PrinterManager events. |
| `6e4e63a` | `feat(printer): receipt builders — reading + bond + daily summary` | `src/services/printer/receiptBuilders/{buildReadingReceipt,buildBondReceipt,buildDailySummary,index}.ts`. Multi-currency bond totals; per-area top-8 daily summary; verification barcode `B-<num>-<hash6>`. |
| `76b678d` | `feat(printer): cp1256 encoder + ESC/POS builder + PrinterManager singleton` | 3 files: encoder/shaper, ESC/POS primitives, BT Classic wrapper. Added `react-native-bluetooth-classic` + `buffer` deps. Added `prepared-assets/` to `.gitignore`. |
| `3d9b1bf` | `docs(playbook): record Wave 4 CI APK build (46.93 MB)` | Just a playbook entry — no code change. Last commit on `main` before Wave 5 branched off. |

## Branch ahead-of-main delta

11 Wave-5 commits (`76b678d` through `07c3fdc`) are NOT yet on `main` —
they live only on `feat/wave-5-printer-scanner` and are bundled in
**PR #23** (https://github.com/moain2026/app1/pull/23).

## How to regenerate this file

```bash
cd /home/user/webapp/AbbasiTahseel && git log --oneline -12
```

Then rewrite this table. The "What" column comes from reading each commit's
message + diff stat.
