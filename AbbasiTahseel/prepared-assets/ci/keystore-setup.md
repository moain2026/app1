# Keystore Setup — AbbasiTahseel

> Step-by-step guide for generating, securing and wiring the Android signing
> keystore used by the `build-release-apk.yml` workflow.

---

## 1. Generate the keystore (one-time)

Run **once** on a secure local machine (NOT in CI, NOT in a shared dev box).

```bash
keytool -genkeypair -v \
  -keystore abbasi-release.keystore \
  -alias abbasi-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storetype JKS
```

> 10000 days ≈ 27 years. Google Play requires ≥ 25 years for upload keys; we
> aim for 27 to be safe even though we side-load.

You'll be prompted:

| Prompt                                  | Recommended answer                                       |
|-----------------------------------------|----------------------------------------------------------|
| Enter keystore password                 | strong random 24+ chars (save in password manager)        |
| Re-enter password                       | same                                                     |
| First and last name (`CN`)              | `AbbasiTahseel`                                          |
| Organisational unit (`OU`)              | `Mobile Apps`                                            |
| Organisation (`O`)                      | `شركة العباسي لتوليد الكهرباء التجارية` (or English equivalent) |
| City or Locality (`L`)                  | `Baghdad`                                                |
| State or Province (`ST`)                | `Baghdad`                                                |
| Country code (`C`)                      | `IQ`                                                     |
| Is the above correct?                   | `yes`                                                    |
| Key password for `<abbasi-release>`     | Press **Enter** to use the keystore password (recommended) |

A file `abbasi-release.keystore` (~2.5 KB) is created in the current directory.

### Sanity check

```bash
keytool -list -v -keystore abbasi-release.keystore -alias abbasi-release
# Verify the SHA-256 fingerprint — record it (we use it as device-trust pin if needed).
```

---

## 2. Back up the keystore (CRITICAL)

> **If this file is lost, we can never sign updates that upgrade an existing install.**
> Users would have to **uninstall + reinstall**, losing all local data (offline bonds!).
> Plan accordingly.

Back up to **at least three places**:

### 2.1 Encrypted USB stick (offline cold storage)

```bash
# On Linux: copy + encrypt with GPG
gpg --symmetric --cipher-algo AES256 --output abbasi-release.keystore.gpg abbasi-release.keystore
cp abbasi-release.keystore.gpg /media/SECURE_USB/

# Verify integrity:
sha256sum abbasi-release.keystore.gpg > abbasi-release.keystore.gpg.sha256
```

Store the USB in a locked drawer at the office. Print the passphrase on paper
and keep it in a separate sealed envelope.

### 2.2 Password manager (1Password / Bitwarden)

- Create a new **Secure Note** named "AbbasiTahseel Release Keystore (v1)".
- Attach the **encrypted** `.gpg` file (NOT the raw `.keystore`).
- Save the **store password** and **key password** in dedicated password fields.
- Share with the project lead + at least one trusted backup (CTO / ops lead).

### 2.3 Encrypted cloud (S3 / Drive with GPG)

```bash
# Re-encrypt with a separate cloud passphrase (don't reuse the USB one)
gpg --symmetric --cipher-algo AES256 \
    --output abbasi-release.keystore.cloud.gpg \
    abbasi-release.keystore

# Upload (example: AWS S3 with SSE-KMS)
aws s3 cp abbasi-release.keystore.cloud.gpg \
  s3://abbasi-tahseel-secrets/keystore/v1.gpg \
  --sse aws:kms --sse-kms-key-id alias/abbasi-keystore
```

---

## 3. Wire into GitHub Actions

The workflow `build-release-apk.yml` reads four secrets:

| Secret name                  | Value                                                    |
|------------------------------|----------------------------------------------------------|
| `ABBASI_KEYSTORE_BASE64`     | `base64 -w0 abbasi-release.keystore` (single line)        |
| `ABBASI_STORE_PASSWORD`      | The keystore password from step 1.                       |
| `ABBASI_KEY_PASSWORD`        | The key password from step 1 (same as store if you pressed Enter). |
| `ABBASI_KEY_ALIAS`           | `abbasi-release`                                         |

### To add a secret

1. GitHub → repo → ⚙ Settings → Secrets and variables → Actions → New repository secret.
2. Name: `ABBASI_KEYSTORE_BASE64` — Value: paste the base64 output.
3. Repeat for the other three.

### Encode keystore to base64

```bash
# macOS / Linux
base64 -w0 abbasi-release.keystore | pbcopy   # macOS clipboard
base64 -w0 abbasi-release.keystore | xclip    # Linux clipboard

# Plain (no clipboard): outputs to stdout — copy manually
base64 -w0 abbasi-release.keystore
```

> ⚠ Use `-w0` (no line wrapping). The workflow decodes a single-line base64.

---

## 4. Wire into local development (optional)

Local release builds (for QA on your laptop) need the same secrets in
`AbbasiTahseel/android/gradle.properties` **OR** `~/.gradle/gradle.properties`
(strongly preferred — the latter never lands in git).

### ~/.gradle/gradle.properties

```properties
ABBASI_UPLOAD_STORE_FILE=abbasi-release.keystore
ABBASI_UPLOAD_KEY_ALIAS=abbasi-release
ABBASI_UPLOAD_STORE_PASSWORD=••••••••••
ABBASI_UPLOAD_KEY_PASSWORD=••••••••••
```

### AbbasiTahseel/android/app/build.gradle (signingConfigs block)

```groovy
android {
    signingConfigs {
        release {
            if (project.hasProperty('ABBASI_UPLOAD_STORE_FILE')) {
                storeFile file("${ABBASI_UPLOAD_STORE_FILE}")
                storePassword ABBASI_UPLOAD_STORE_PASSWORD
                keyAlias ABBASI_UPLOAD_KEY_ALIAS
                keyPassword ABBASI_UPLOAD_KEY_PASSWORD
            } else {
                // CI fallback: read from env vars set by the workflow
                storeFile file('abbasi-release.keystore')
                storePassword System.getenv('ABBASI_STORE_PASSWORD')
                keyAlias System.getenv('ABBASI_KEY_ALIAS') ?: 'abbasi-release'
                keyPassword System.getenv('ABBASI_KEY_PASSWORD')
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...minify rules from minification-strategy.md...
        }
    }
}
```

Put the actual `abbasi-release.keystore` file in `AbbasiTahseel/android/app/` for
local builds, but **NEVER commit it**:

```
# AbbasiTahseel/.gitignore — confirm these lines exist
android/app/*.keystore
android/app/*.jks
android/gradle.properties.local
```

---

## 5. Key rotation strategy (for the future)

- Document fingerprint in this repo's `docs/RELEASE_KEY_FINGERPRINT.md`.
- If we move to Google Play, **enrol in Play App Signing** at our first
  publication — Google holds the upload key while we keep a separate signing key.
- If the keystore is suspected compromised → publish a final "migration" build,
  notify field staff, regenerate keystore, **mandatory uninstall+reinstall**.

---

## 6. Common mistakes to avoid

| Mistake                                                   | Consequence                                  |
|-----------------------------------------------------------|----------------------------------------------|
| Committing the `.keystore` file                            | Anyone with repo access can sign fake updates |
| Using debug keystore for production                        | Updates from CI overwrite local installs and vice-versa |
| Different alias casing (`Abbasi-release` vs `abbasi-release`) | Gradle fails to find the key                |
| `validity 1825` (5 years)                                  | Need to rotate too soon                       |
| Storing raw secret in workflow file                        | Leaks in PR logs                              |
| Reusing the keystore password for the GPG backup           | Single compromise = total breach              |

---

## 7. Verification — first release build

After adding the four secrets:

1. **Manually trigger** the workflow:
   - Actions → "Build Signed Release APK" → "Run workflow" → branch `main`.
2. Wait for green. Download the APK artefact.
3. On Android device: install the APK over an existing install.
4. If the install succeeds (no "package conflicts" error) → **same signing key** as previous releases ✅.
5. If you see "App not installed — package conflicts" → either:
   - Different keystore was used previously → uninstall first.
   - Or wrong alias / password is configured.

After step 4 passes once, every subsequent tag push will auto-build a signed
APK and attach it to a GitHub Release.
