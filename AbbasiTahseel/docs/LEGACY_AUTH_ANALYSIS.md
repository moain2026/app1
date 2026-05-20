# Legacy Auth Analysis — ElectricCollector28 → AbbasiTahseel RN

## Phase 1 — Findings from `ElectricCollector_Full_Analysis/source_code/`

### Login Endpoint (actually-used path)

- **Method / URL:** `POST  http://<host>:<port>/electric/Login`  (capital `L`)
- **Content-Type:** `application/json`
- **Body fields (camelCase):**
  ```json
  { "username": "...", "password": "...", "appId": "1", "secureId": "<10-digit-decimal>" }
  ```
- **Source:** `model/AuthRepository.java` lines 21–34 — manually builds a `JSONObject` with `"username","password","appId","secureId"`.

> Note: `entities/AuthData.java` has `@Json(name="appid")` (lowercase) and is wired
> through Retrofit's `userAuth(AuthData)` — but **`LoginActivity.loginRetrofit()`
> does NOT use that path**. It instantiates `LoginPresenter` → `AuthRepository.auth()`
> which builds the JSON by hand with **camelCase `appId`**. So the camelCase form
> is the one the server actually sees and accepts.

### Source of `secureId` ← **CRITICAL**

- **Code path:** `LoginActivity.loginRetrofit()` →
  `act.setSecurId(Utils.GetDeviceId(this))` →
  `Utils.GetDeviceId(ctx)` → `new Defence(ctx).getDeviceId()`.
- **Algorithm (`Defence.getDeviceId()`, line 21):**
  ```java
  Long.toString(
    Long.parseLong(
      Settings.Secure.getString(ctx, "android_id").substring(0, 8),  // first 8 hex chars of ANDROID_ID
      16                                                              // parsed as base-16
    )
  )                                                                   // → decimal string
  ```
- **Effect:** ANDROID_ID `9993a14105fc49aa` → first 8 hex `9993a141` →
  parse base-16 = `2576949569` → decimal string **`"2576949569"`** (10 digits).
- **User screenshot match:** legacy app shows "الرقم التسلسلي: `2098897319`" —
  exactly a 10-digit decimal, matching this algorithm.

### Headers / Encryption

- `APIClient.java` adds only `Accept: application/json` + `Connection: close`.
- **NO password encryption** — password is sent in plaintext inside the JSON body.
- No User-Agent, no X-App-Version, no other custom headers.

### Response Shape

- The endpoint returns a `Users` object (`entities/Users.java`) with:
  - `id, username, name, email, phone`
  - permission flags `DE, ED, REP, S_K, S_S, SYS, NOA, NOU`
  - embedded `access_token` (no separate refresh_token field)
- On success `appConfig.setToken(var1.getAccessToken())` + persist to prefs.

### `appId` Value

- Read from `_prefManager.getValue("appid", "1")` — string, **default `"1"`**.
- This is the **branch number**, persisted in `SharedPreferences("prefs")` under key `"appid"`.

### PIN system

- Separate from `/Login`. `EnterPasswordActivity.java` + `ChangePasswordActivity.java`
  handle a 4-digit "settings password" — stored locally only, never sent to the server.
- `/Login` always uses the actual user `password` (not the PIN).

---

## Phase 2 — Comparison: Legacy vs Current (post-fix)

| Field         | Legacy (works)                                | Current (after PR #20)                              | Match  |
|---------------|-----------------------------------------------|------------------------------------------------------|--------|
| Method        | `POST`                                        | `POST`                                               | ✅     |
| Path          | `/electric/Login` (capital L, JSON)           | `/electric/Login`                                    | ✅     |
| Content-Type  | `application/json`                            | `application/json`                                   | ✅     |
| `username`    | UI text (plain UTF-8 Arabic OK)               | UI text                                              | ✅     |
| `password`    | UI text, plaintext                            | UI text, plaintext                                   | ✅     |
| `appId`       | `"1"` (camelCase key)                         | `"1"` from `getBranchNumber()` (camelCase key)        | ✅     |
| **`secureId`**| **First 8 hex of ANDROID_ID → parseLong base16 → decimal** (e.g. `"2576949569"`) | SHA-256-derived 16-char hex (e.g. `"9993a14105fc49aa"`) | ❌ |
| Response      | Users object + embedded access_token          | Users object + embedded access_token                 | ✅     |

**Only mismatch:** `secureId`. The legacy server has the original 10-digit
decimal value registered against this user; the new app sends a brand-new
16-hex-char string the server has never seen, so it returns
"بيانات الدخول غير صحيحة".

---

## Phase 3 — Fix plan (this PR)

1. **`getSecureId()`** in `licenseManager.ts` — returns the manual override if
   set, otherwise computes the **legacy-compatible** 10-digit decimal from
   `ANDROID_ID` using the same algorithm as `Defence.getDeviceId()`.
2. **`prefs.ts`** — add `SECURE_ID_OVERRIDE` key + get/set helpers.
3. **`authStore.login`** — call `getSecureId()` instead of `generateDeviceId()`.
4. **`ServerSettingsScreen`** — new field "الرقم التسلسلي للجهاز" with hint and
   "Default auto" subtext that previews the auto-computed value.
5. **LoginScreen** — show truncated `secureId: 9993a141…` under the debug button
   so the user can verify which value is being sent, plus
   **"📋 Copy error details"** button when a login fails.
6. **i18n** — add `settings.server.secureId*` and `auth.login.copyError*` keys.
