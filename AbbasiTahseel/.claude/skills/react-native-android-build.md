# Skill — React Native Android Build (RN 0.74.5 Bare)

> Building APKs for AbbasiTahseel — local + CI. RN 0.74.5 is finicky;
> here's what works.

## Skill summary

- Local debug APK via Gradle
- CI debug APK via GitHub Actions
- Troubleshooting common failures
- What's pinned and why

## Project setup

- RN version: **0.74.5** (Bare, not Expo).
- JS engine: Hermes (Android only — iOS not targeted).
- Min SDK: 24, Target SDK: 34, Compile SDK: 34.
- Kotlin: 1.9.22 (RN 0.74.5 default).
- Gradle: 8.8 (RN 0.74.5 ships this).
- AGP: 8.1.1.

## Pinned dependencies (DO NOT CASUALLY BUMP)

```json
// package.json — pinned because of bad surprises
"react-native": "0.74.5",                       // ecosystem alignment
"react-native-bluetooth-classic": "~1.73.0-rc.12", // newer breaks types
"@nozbe/watermelondb": "0.27.1",                // ADR-002 — works with our JSI bridge
"buffer": "~6.0.3",                             // polyfill for ESC/POS byte arrays
"axios": "^1.6.0",                              // <2.0 — keep CommonJS-friendly
"zustand": "^4.4.7",                            // v5 changes API; not done yet
"zod": "^3.22.4"                                // v4 split into multiple packages
```

If you upgrade any of these, **run a full Wave 1..5 regression** before
merging.

## Local debug APK

```bash
cd /home/user/webapp/AbbasiTahseel
# 1) Ensure deps are installed
npm install --legacy-peer-deps

# 2) Type-check (REQUIRED before push)
npx tsc --noEmit

# 3) Build the APK
cd android
./gradlew assembleDebug

# 4) The APK lands at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

⚠️ In the sandbox, **Gradle is NOT available**. Always rely on CI for
APK output. Local builds are only documented here for the user's PC.

## CI debug APK (GitHub Actions)

See `.github/workflows/build.yml`. Triggers on push to:
- `main`
- Any branch matching `feat/**`, `fix/**`, `chore/**`

Two jobs run:

| Job | Step | Time | Output |
|---|---|---|---|
| `tsc --noEmit` | TypeScript check | ~36s | Pass/fail |
| `Assemble Debug APK` | Full Gradle build | 6-8 min | Artifact `abbasi-tahseel-debug-apk` |

**Check CI status:**
```bash
gh pr checks <PR-number>
gh run view <workflow-run-id>
gh run download <workflow-run-id> --dir ./apk-download
```

**APK artifact size:** ~47 MB debug (no minify). Release will be ~25-30 MB.

## How to read CI logs when a build fails

```bash
# Find the failing run
gh run list --branch <branch-name> --limit 5

# Get the run ID, then:
gh run view <run-id> --log-failed | head -100

# Or open in browser:
gh run view <run-id> --web
```

## Common failures and fixes

### `JavaScript heap out of memory`

Metro ran out of RAM during the JS bundle step. Fix: bump
`NODE_OPTIONS=--max-old-space-size=8192` in the CI workflow `env:` block.

### `Could not resolve com.facebook.react:react-android:0.74.5`

Maven repo is missing or rate-limited. CI YAML must include:
```yaml
- uses: gradle/gradle-build-action@v2
  with:
    cache-read-only: false
```

### `Lint failed with errors`

We disable lint in `android/app/build.gradle`:
```gradle
android {
  lintOptions {
    abortOnError false
    checkReleaseBuilds false
  }
}
```
If a new dependency overrides this, re-set it.

### `BluetoothDevice cannot be resolved`

You bumped `react-native-bluetooth-classic` past 1.73.0-rc.12.
Roll back: `npm i react-native-bluetooth-classic@~1.73.0-rc.12 --save-exact`.

### `:app:processDebugMainManifest FAILED — uses-permission ... already exists`

Two libraries (or your code + a library) declare the same permission in
their manifests. Open `AndroidManifest.xml`, remove the duplicate, or
add `tools:replace="android:name"` to the manifest tag.

### `Hermes: SyntaxError ... in node_modules/<pkg>`

Some library is shipping non-Hermes-compatible JS. Try adding it to
`babel.config.js` plugins so Babel transpiles it:
```js
plugins: [
  ['@babel/plugin-transform-private-methods', { loose: true }],
]
```

### `Could not find :react-native:hermes:...`

The Hermes prebuilt cache is corrupted. In the CI workflow, add:
```yaml
- run: rm -rf node_modules/react-native/sdks/hermes-engine
- run: npm install --legacy-peer-deps
```

### `tsc errors after npm install`

Usually a `@types/...` mismatch. Pin to the exact version that worked:
```bash
npm i @types/react@~18.2.79 --save-exact --save-dev
```

## How to update CI without breaking it

1. Always test in a feature branch — `genspark_ai_developer` style.
2. The build YAML is at `.github/workflows/build.yml`.
3. Keep `actions/checkout@v4`, `actions/setup-java@v4`, `setup-node@v4`
   pinned to major versions.
4. After editing, push and watch the CI run on a draft PR — don't
   merge unless both jobs pass.

## When to bump RN

Not soon. RN 0.75 broke `react-native-bluetooth-classic`. RN 0.76 made
the new architecture default (not ready for our printer module). Stay
on 0.74.5 until Wave 7 release, then re-evaluate.

## APK install on real device

The user follows `apk-install-and-test.md` (next skill file).
