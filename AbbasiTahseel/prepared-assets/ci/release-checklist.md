# Release Checklist — AbbasiTahseel

> Run through this before tagging a release. Treat each unchecked item as a
> blocker.

---

## A. Version & changelog

- [ ] `AbbasiTahseel/package.json` `"version"` bumped (semver).
- [ ] `AbbasiTahseel/android/app/build.gradle` `versionCode` incremented by 1
      and `versionName` matches `package.json`.
- [ ] `CHANGELOG.md` updated with this release's entries (Added / Changed /
      Fixed / Removed).
- [ ] PR linked to a release notes draft.

## B. Code quality

- [ ] `npm run typecheck` passes (0 errors).
- [ ] `npm run lint` passes (`--max-warnings 0`).
- [ ] `npm test` passes (all unit tests green).
- [ ] No `console.log` / `console.warn` / `debugger` in `src/` (search:
      `grep -rE "console\.(log|warn|debug)|debugger" AbbasiTahseel/src`).
- [ ] No `TODO(blocking)` / `FIXME(release)` comments outstanding.
- [ ] No unsigned dependencies added since last release
      (`npm audit --production` clean of high/critical).

## C. Wave-specific manual tests

### Wave 2 — Auth & License
- [ ] Login with valid credentials → lands on Home.
- [ ] Login with invalid credentials → friendly Arabic error.
- [ ] License activation succeeds with a fresh code.
- [ ] License-already-used code shows the correct error.

### Wave 3 — Main Shell & Settings
- [ ] Tailscale-down → SyncStatusBadge shows "offline" and tapping it opens the
      modal with detailed reason.
- [ ] ServerSettingsScreen accepts and saves new IP/port; sync recovers.
- [ ] Drawer opens from the right edge (RTL).
- [ ] Home KPIs update live when a record is added/removed.

### Wave 4 — Readings
- [ ] Reading list loads, search and filter work.
- [ ] New reading: previous → current validation triggers on `kh < ks`.
- [ ] Dev Bypass is **hidden** in release build (not just disabled — gated by
      `__DEV__`).
- [ ] All readings sync within 15 s of network recovery.

### Wave 5 — Printer & Camera
- [ ] Bluetooth permission requested with explanation modal.
- [ ] Datecs DPP-250 discovery → connect → test print works.
- [ ] Test print: Arabic text shaped correctly, numbers right-justified.
- [ ] Printer disconnect mid-print → graceful error toast + queue retry.
- [ ] Camera-based noadad scan recognises CODE128 + EAN13.

### Wave 6 — Bonds & Payments
- [ ] Create bond → pick subscriber → add 2 payments (IQD + USD) → save.
- [ ] Receipt prints with correct multi-currency totals.
- [ ] Reprint marks `is_reprint=true` and shows the banner.
- [ ] Delete bond requires confirmation; soft-delete sync respected.
- [ ] Validation: amount ≤ 0 blocked, future date blocked.

### Wave 7 — Reports & Settings
- [ ] Daily/weekly/monthly reports load with seed data.
- [ ] PDF export succeeds; the file opens in the device's PDF viewer.
- [ ] Theme toggle (light/dark/system) takes effect immediately.
- [ ] Logout → reactivation-not-required (license still valid).

## D. Permissions audit

In `AbbasiTahseel/android/app/src/main/AndroidManifest.xml`:

- [ ] Only the following uses-permissions appear:
      `INTERNET`, `ACCESS_NETWORK_STATE`,
      `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`,
      `ACCESS_FINE_LOCATION` (maxSdkVersion 30 only),
      `CAMERA`,
      `READ_EXTERNAL_STORAGE` (maxSdkVersion 32),
      `WRITE_EXTERNAL_STORAGE` (maxSdkVersion 28),
      `VIBRATE`,
      `RECEIVE_BOOT_COMPLETED` (for background-fetch).
- [ ] No `READ_PHONE_STATE`, no `READ_CONTACTS`, no SMS perms.
- [ ] `usesPermissionFlags="neverForLocation"` on `BLUETOOTH_SCAN`.

## E. APK build

- [ ] `./gradlew clean` first.
- [ ] `./gradlew assembleRelease` succeeds locally (or CI).
- [ ] APK installs OVER an existing v(N-1) install without "package conflicts".
- [ ] **APK size ≤ 60 MB** (warn at > 55 MB).
- [ ] Cold start < 2.5 s on a Samsung A12-class device.
- [ ] First sync after fresh install completes within 30 s.

## F. Signing & artifacts

- [ ] APK signed with the production keystore (verify via `keytool -printcert -jarfile`).
- [ ] `mapping.txt` archived (CI artifact + GitHub Release asset).
- [ ] `mapping.txt` uploaded to crash reporter (if integrated).

## G. Devices tested

- [ ] Real device 1 (Samsung A12 / A21s) — bonded with real Datecs DPP-250.
- [ ] Real device 2 (Xiaomi Redmi 9A) — bonded with real Datecs DPP-250.
- [ ] Real device 3 (Huawei Y9 Prime — Android 9, our minSdk floor).
- [ ] Sync verified end-to-end against the Tailscale backend.

## H. Documentation & comms

- [ ] `docs/USER_GUIDE_AR.md` reflects any UI changes.
- [ ] Release notes drafted in Arabic for the field team
      (WhatsApp-friendly, 5–10 bullet points).
- [ ] Internal ops team notified of upcoming rollout window.

## I. Tag & ship

- [ ] Final commit on `main` (squashed if from a feature branch).
- [ ] Annotated tag: `git tag -a v1.2.3 -m "Wave-7 Reports + Profile"`.
- [ ] `git push origin v1.2.3` (triggers `build-release-apk.yml`).
- [ ] GitHub Release artifacts present: APK + mapping.txt.
- [ ] Release marked **not** as pre-release once smoke-tested.
- [ ] APK published to internal distribution channel (private link / WhatsApp
      group / internal MDM).

## J. Post-release (first 24 h)

- [ ] Sync engine error rate stable (≤ baseline).
- [ ] Crash-free sessions ≥ 99.5 %.
- [ ] Field staff confirm printer + scanner still work.
- [ ] No rollback decision needed (if needed: tag `v{N}.{M}.{P+1}` reverting,
      do **not** delete the bad tag).

---

## Quick "Go / No-Go" summary card

```
GO if:
  ✅ All A–F checked
  ✅ All G devices tested (at least 2 of 3)
  ✅ Release notes ready

NO-GO if:
  ❌ Any "F. Signing" item is uncertain
  ❌ APK > 60 MB without justification
  ❌ Real-device printer test failed
  ❌ Any high-severity npm-audit finding unmitigated
```
