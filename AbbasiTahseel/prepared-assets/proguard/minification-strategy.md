# Minification Strategy — AbbasiTahseel

> Decisions about when, how and to what extent we shrink/obfuscate the APK.

---

## 1. Build flavours and minification matrix

| Flavour            | `minifyEnabled` | `shrinkResources` | `proguardFiles`                   | Use case                |
|--------------------|:---------------:|:-----------------:|-----------------------------------|-------------------------|
| `debug`            | ❌              | ❌                | —                                  | Local dev               |
| `releaseQa`        | ✅              | ❌                | `proguard-rules.pro` + log-keep    | QA on real devices      |
| **`release`**      | ✅              | ✅                | `proguard-rules.pro`               | **Production**          |

Only `release` is shipped to end users. `releaseQa` is shipped to internal testers; same shrinking, but logs preserved.

### android/app/build.gradle (target)

```groovy
android {
    buildTypes {
        debug {
            minifyEnabled false
            shrinkResources false
            signingConfig signingConfigs.debug
        }

        releaseQa {
            initWith release
            matchingFallbacks = ['release']
            minifyEnabled true
            shrinkResources false
            applicationIdSuffix ".qa"
            versionNameSuffix "-qa"
            signingConfig signingConfigs.release
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                          'proguard-rules.pro',
                          'proguard-rules-keep-logs.pro'
        }

        release {
            minifyEnabled true
            shrinkResources true
            signingConfig signingConfigs.release
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                          'proguard-rules.pro'
        }
    }
}
```

---

## 2. R8 vs ProGuard

| Concern              | R8 (we use)                                  | Legacy ProGuard                     |
|----------------------|----------------------------------------------|-------------------------------------|
| Speed                | 2–3× faster than ProGuard                    | Slow                                 |
| Output size          | Slightly smaller (better dead-code analysis) | Larger                               |
| Kotlin support       | First-class                                   | Needs extra rules                    |
| Mapping format       | Same `mapping.txt`                            | Same                                 |
| Activation           | **Default in AGP 7+** — no config needed     | Opt-out only                         |

We're on AGP 8.x → **R8 is on by default.** We don't need to touch `android.enableR8`.

### Full mode (post-v1 target)

```properties
# gradle.properties
android.enableR8.fullMode = true
```

R8 full mode is more aggressive:
- removes more dead code,
- allows class merging across packages,
- stricter "Throwable Tags" stripping.

→ We'll enable this **only after** we have stable crash data for two releases. It tends to surface latent bugs in third-party libs.

---

## 3. APK size budget

Target: **< 60 MB** uncompressed (per `release-checklist.md` AC).

Current Wave-2 CI artefact: **44.71 MB** (already minified, but no resource shrinking yet).

Projected after Wave 7 (with all new libs):

| Component                          | Estimated addition |
|------------------------------------|--------------------|
| Wave 5 (BT classic + camera + ML)  | +6.5 MB             |
| Wave 6 (no new native deps)        | +0.2 MB             |
| Wave 7 (charts + pdf)              | +3.5 MB             |
| **Sub-total**                      | +10.2 MB            |
| After `shrinkResources true`       | −3.0 to −4.0 MB     |
| **Projected final size**           | **~52 MB ✅**       |

Headroom: 8 MB.

### What we measure

Per release, run:
```bash
ls -lh android/app/build/outputs/apk/release/app-release.apk
unzip -l android/app/build/outputs/apk/release/app-release.apk | tail -20
```

If size jumps unexpectedly:
```bash
# Inspect biggest contributors:
unzip -l app-release.apk | sort -k1 -n -r | head -30
```

---

## 4. Resource shrinking caveats

`shrinkResources true` removes drawables, layouts, strings that R8 can prove are
unused. **Pitfalls:**

- Resources referenced via `getIdentifier()` (string lookup) are **not detected**.
  → We avoid `getIdentifier` in app code. If we ever need it, add to
  `res/raw/keep.xml`:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <resources xmlns:tools="http://schemas.android.com/tools"
      tools:keep="@drawable/icon_*,@string/feature_*" />
  ```
- Resources referenced from native libs (e.g. Bluetooth status notification icon)
  must also be kept via `keep.xml`.
- Vector-icons fonts in `assets/fonts/` are **assets** not resources — never
  touched by R8.

---

## 5. Mapping files (de-obfuscation)

Every minified build emits `app/build/outputs/mapping/release/mapping.txt`.

This file is **mandatory** for de-obfuscating crash stack traces. Our CI:

1. Builds release APK.
2. Uploads APK to GitHub Release.
3. Uploads `mapping.txt` to the same release as a separate asset.
4. (Future) Posts mapping to Sentry / Crashlytics via their CLI.

### `.gitignore` discipline

`mapping.txt` is generated → must be `.gitignore`d locally but **archived per
release** (GitHub Release assets + S3 backup if used).

---

## 6. Measuring before/after

### Run once per release
```bash
# clean
cd android && ./gradlew clean

# debug
./gradlew assembleDebug
ls -lh app/build/outputs/apk/debug/app-debug.apk
# → ~56 MB

# release (minify + shrink)
./gradlew assembleRelease
ls -lh app/build/outputs/apk/release/app-release.apk
# → ~52 MB

# method count check (optional)
./gradlew :app:dependencies --configuration releaseRuntimeClasspath | wc -l
```

### Per-PR check (CI)
Already in our CI: the bundle job prints APK size. Failing builds **must** have
no size regression > +5 % unless justified in the PR.

---

## 7. Decision log

| Date       | Decision                                                                 |
|------------|--------------------------------------------------------------------------|
| Wave 7     | Enable `minifyEnabled true` for **all** release builds.                  |
| Wave 7     | Enable `shrinkResources true` for `release` only (not `releaseQa`).      |
| Wave 7     | Strip `android.util.Log.*` calls in `release` (keep in `releaseQa`).     |
| Wave 7+1   | Re-evaluate `enableR8.fullMode` after two production releases.            |
| Wave 7+2   | Re-evaluate Android App Bundle (`.aab`) — currently we ship APK side-load. |

---

## 8. Sign-off checklist (before flipping minify on production)

- [ ] All third-party libs have rules in `proguard-rules.pro`.
- [ ] `mapping.txt` is archived alongside APK in GitHub Releases.
- [ ] Crash-reporter de-obfuscation pipeline tested end-to-end.
- [ ] Full smoke test on **release** APK (not debug):
  - login, license activation, sync, printer connect+test, scan barcode,
    create bond, print bond, daily summary report, export PDF.
- [ ] APK size < 60 MB.
- [ ] Confirm no regressions in cold-start time (< 2.5 s on mid-range device).
