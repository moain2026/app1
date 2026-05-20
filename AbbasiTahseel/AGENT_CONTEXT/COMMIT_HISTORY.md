# COMMIT_HISTORY — Last 10 Commits (newest first)

> Generated from `git log --oneline -10` on the active branch.

| Hash | Subject | What |
|------|---------|------|
| `6c8423d` | `feat(printer): Zustand printerStore + ESC/POS test page` | `src/stores/printerStore.ts` + `src/services/printer/testPage.ts` + barrel update. Store owns scan/pair/print UI state, subscribes to PrinterManager events. |
| `6e4e63a` | `feat(printer): receipt builders — reading + bond + daily summary` | `src/services/printer/receiptBuilders/{buildReadingReceipt,buildBondReceipt,buildDailySummary,index}.ts`. All builders use cp1256 + ESC/POS primitives; bond supports multi-currency totals; daily summary supports per-area aggregation. |
| `76b678d` | `feat(printer): cp1256 encoder + ESC/POS builder + PrinterManager singleton` | 3 files: encoder/shaper, ESC/POS primitives, BT Classic wrapper. Added `react-native-bluetooth-classic` + `buffer` deps. Added `prepared-assets/` to `.gitignore`. |
| `3d9b1bf` | `docs(playbook): record Wave 4 CI APK build (46.93 MB)` | Just a playbook entry — no code change. |
| `8da6f7a` | `feat: Wave 4 — Readings Module + Dev Bypass Mode (#22)` | Squash merge of Wave 4 PR. Readings list, ReadingDetail, FlashList, mock data seeder, dev bypass login. |
| `113c68b` | `fix(auth): legacy-compatible secureId + override UI + error diagnostics (#21)` | `getLegacySecureId()` matches legacy Java `Defence.getDeviceId()`; added override field in ServerSettings; login error capture for diagnostics. |
| `fc18ad3` | `fix(auth): align login with legacy /Login JSON contract + debug logging (#20)` | Login body now `{username, password, appId, secureId}`; capital L endpoint; debug logging. |
| `9aae83d` | `feat(wave-3): Main Shell + Tailscale settings + Home dashboard (#19)` | RootNavigator, MainStack (Drawer), MainTabs, ServerSettings, Home dashboard. |
| `5fea87f` | `fix(wave-2): unblock Metro bundle (alias precedence + namespace export) (#18)` | Babel alias resolution fix. |
| `9cc3e45` | `feat(wave-2): auth flow + license manager + navigation (#16)` | LicenseManager + LicenseActivation + AuthStack + PIN setup. |

## Branch ahead-of-main delta

The 3 Wave-5 commits (`76b678d`, `6e4e63a`, `6c8423d`) are NOT yet on
`main` — they live only on `feat/wave-5-printer-scanner` waiting for the
wave PR.

## How to regenerate this file

```bash
cd /home/user/webapp/AbbasiTahseel && git log --oneline -10
```

Then rewrite this table. The "What" column comes from reading each commit's
message + diff stat.
