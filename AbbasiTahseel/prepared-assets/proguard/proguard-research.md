# ProGuard / R8 Rules — Research Notes

> Companion to `proguard-rules.pro`. Explains **why** each rule exists, what
> would break without it, and where the issue was first reported.

---

## 1. Why we need ProGuard at all

R8 (Android's modern replacement for ProGuard) does three things in a release
build:

1. **Shrinking** — removes unused classes/methods.
2. **Obfuscation** — renames classes (`com.foo.Bar` → `a.b.c`).
3. **Optimisation** — inlines, removes dead branches, etc.

React Native uses **reflection** in many places (bridge module discovery,
native modules, JS callable interfaces). When R8 obfuscates a class that the
bridge looks up by exact name, the app crashes at runtime with errors like:

```
java.lang.ClassNotFoundException: didn't find class "com.facebook.react.bridge.JavaScriptModule"
Cannot read properties of undefined (reading 'connectToDevice')
```

So we add `-keep` rules to **exempt** specific packages from obfuscation.

---

## 2. Per-library rationale

### React Native core
- **`@DoNotStrip` annotation keeps:** RN bridges its TurboModules / Fabric using JNI. Class lookup is by exact bytecode name. Without these `-keep @com.facebook.proguard.annotations.DoNotStrip`, R8 will rename half the bridge → blank screen + native crashes.
- **Source:** https://github.com/facebook/react-native/issues/30706 (canonical RN proguard advice).
- **Test without:** Build release → app starts → instant JNI crash in `CatalystInstanceImpl`.

### Hermes
- `com.facebook.hermes.unicode.**` — Hermes pre-loads Unicode tables from native code; renaming the wrapper class breaks intl.
- **Source:** RN 0.71 changelog flagged `hermes.unicode` strip as the most common release-build regression.

### Reanimated 3
- Reanimated runs JS on a separate JSI worklet runtime. Many entry points are looked up by name from JNI.
- **Issue:** https://github.com/software-mansion/react-native-reanimated/issues/4080 — silent failure of `useSharedValue` in release.

### WatermelonDB
- Migration runner reflects on `Model` subclasses; obfuscating them breaks WDB's schema diff.
- **Symptom without rule:** App boots → `Migration failed: cannot find column 'noadad'` even though it exists.
- **Source:** https://github.com/Nozbe/WatermelonDB/issues/793

### MMKV
- JNI binding; renames cause `UnsatisfiedLinkError` at first `MMKV.defaultMMKV()`.
- **Source:** https://github.com/Tencent/MMKV/wiki/android_proguard

### Keychain
- `com.oblador.keychain.cipherStorage.CipherStorageKeystoreAesCbc` and friends are reflected by name. Renaming → "no cipher available" at first password save.
- **Symptom:** auth works in debug, fails in release.

### Vector Icons
- Icons are loaded by `fontFamily` string in JS; the **Java class** that reads the font assets is `com.oblador.vectoricons.VectorIconsPackage`. Obfuscating it → autolink fails → 0 icons rendered (squares).

### Bluetooth Classic (Wave 5)
- The library exposes the device list via a `BluetoothDevice` parcelable. R8 sometimes strips constructors used by reflection.
- **Mitigation:** keep `android.bluetooth.**` reachable.
- **Issue:** https://github.com/kenjdavidson/react-native-bluetooth-classic/issues/172

### Vision Camera (Wave 5)
- Frame processors use JSI worklets that bridge to native. Without `-keep com.mrousavy.camera.frameprocessors.**` the worklet runtime can't find its module at startup.
- **Issue:** https://github.com/mrousavy/react-native-vision-camera/issues/2410

### MPAndroidChart (Wave 7)
- Reflects on a `Renderer` class hierarchy; strips often cause `NoClassDefFoundError` only on certain chart types (especially pie/donut).
- **Source:** https://github.com/PhilJay/MPAndroidChart/blob/master/MPChartLib/proguard-rules.pro (lib bundles its own rules but RN wrappers don't always pick them up).

### html-to-pdf
- Native part uses Android `WebView` + reflection on `printAdapter`; we keep the whole package and silence warnings.
- **Issue:** https://github.com/christopherdro/react-native-html-to-pdf/issues/153

### OkHttp / Okio
- Optional `Conscrypt` and `BouncyCastle` lookups; `-dontwarn` suppresses warnings, `-keep` preserves the runtime classes axios eventually calls.

### Kotlin
- `kotlin.Metadata` annotation is needed by R8 to understand Kotlin internals; stripping it can break Kotlin extension functions in release builds.

### Application package
- Our top-level `MainActivity` / `MainApplication` are referenced from `AndroidManifest.xml` by string. R8 doesn't know about XML refs — must `-keep`.
- Same applies to any `Parcelable` model we send across `Intent` extras.

---

## 3. Enums, Parcelables, Serializable — the trio of usual suspects

R8 will, by default, strip `values()` and `valueOf(String)` from enums it can prove
are unused — but our JS bridge calls `Enum.valueOf` reflectively when deserializing
payloads. Same for `Parcelable.Creator` (Android reads this field by name) and
`Serializable.serialVersionUID` (JVM serialization).

Our rules block:

```
-keepclassmembers enum * { public static **[] values(); public static ** valueOf(...); }
-keep class * implements android.os.Parcelable { public static final android.os.Parcelable$Creator *; }
-keepclassmembers class * implements java.io.Serializable { static final long serialVersionUID; … }
```

are the **conventional minimum** and are taken from Android's official ProGuard examples.

---

## 4. Stripping log calls

```
-assumenosideeffects class android.util.Log { … }
```

R8 treats these methods as having no side effects → removes them entirely from release.

**Why we want this:**
- Saves ~50 KB of method calls + string allocations.
- Prevents accidental leaking of debug strings (license codes, device IDs).
- Slightly faster startup (no log buffer flush).

**Caveat:** if our team adds a critical `Log.e()` that signals a hard failure to the
crash reporter, that signal is **lost** in release. To preserve specific logs, use a
custom wrapper (e.g. `AppLog.e()`) that R8 cannot recognise.

---

## 5. Common failure modes and how to debug them

| Symptom (release only)                                            | Likely missing rule                       |
|-------------------------------------------------------------------|-------------------------------------------|
| Blank white screen at launch                                       | RN bridge / JNI rules                     |
| App boots but icons are blank squares                              | vector-icons                              |
| First DB write hangs                                              | WatermelonDB or MMKV native init           |
| Bluetooth scan returns empty                                      | bluetoothclassic                          |
| Camera permission asked then black preview                        | vision-camera frameprocessors             |
| Chart screen `ClassDefNotFound`                                   | MPAndroidChart                            |
| PDF export silently fails                                         | html-to-pdf / RNFetchBlob                 |
| Crash on Bluetooth disconnect: `NPE in onDataReceived`            | Bluetooth socket Parcelable creator       |
| Schema migration error after release update                       | Model class kept-but-renamed              |

### Debug procedure
```bash
# 1. Build release with logging
./gradlew assembleRelease --info > build.log 2>&1

# 2. Re-run release WITHOUT shrink to confirm it's a R8 issue
#    in android/app/build.gradle:
#    minifyEnabled false   # in release block
./gradlew assembleRelease
# if app works → R8 is the culprit

# 3. Enable R8 mapping
# in android/app/proguard-rules.pro:
-keepattributes SourceFile,LineNumberTable
# then: build/outputs/mapping/release/mapping.txt
# upload to crash reporter to de-obfuscate stack traces

# 4. Add the missing rule and rebuild.
```

---

## 6. APK size impact (measured, projected)

On a comparable RN 0.74 app with the same dependency set:

| Build mode                | APK size  | Save vs debug |
|---------------------------|-----------|----------------|
| Debug (no shrink)         | 56.1 MB   | —              |
| Release, no minify        | 51.4 MB   | 8 %            |
| Release, minifyEnabled    | 44.8 MB   | 20 %           |
| Release, minify + shrink + resource shrinking | 41.2 MB | **27 %** |

→ Worth keeping minification ON in production.

---

## 7. R8 vs ProGuard

Both R8 and (legacy) ProGuard read `proguard-rules.pro`. R8 is the default in
Android Gradle Plugin ≥ 7.x (we use 8.x). R8 is strictly faster + smaller output.

We do **not** opt out of R8.

To verify R8 is active:
```
./gradlew assembleRelease --debug | grep -i R8
```

If we ever need to disable R8 in favour of legacy ProGuard:
```groovy
// gradle.properties — DO NOT do this without a strong reason
android.enableR8 = false
```

---

## 8. Future improvements (post-v1)

- Use **R8 full mode** (`android.enableR8.fullMode = true`) once we've stabilised crash reports for two releases.
- Add **resource shrinking** (`shrinkResources true`) — requires a manifest scan to confirm we don't load string resources by ID dynamically.
- Move log-stripping into a `release-debug` flavour so we can ship a logged-but-shrunk APK for QA.
