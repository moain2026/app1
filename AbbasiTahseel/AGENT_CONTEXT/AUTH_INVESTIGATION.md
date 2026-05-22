# AUTH_INVESTIGATION — The WCF Discovery Story

> Full chronology of how we discovered the backend is .NET WCF (not PHP)
> and arrived at the two-stage `/Authenticate` + `/Login` strategy in
> PR #26. Read this if anyone ever questions why login was so painful.

## TL;DR

1. We assumed the legacy server was PHP because the Retrofit `ApiService.java`
   in the decompiled Java app defined `@FormUrlEncoded @POST("login")` —
   a PHP-style contract.
2. First real-device test failed: HTTP 200 with `{}` empty body.
3. We diagnosed it as `appId` vs `appid` case mismatch (PR #25). Wrong.
4. The user opened the server URL in a browser. The error message
   `"الأسلوب غير مسموح. الرجاء مراجعة صفحة تعليمات الخدمة"` revealed
   it was a **.NET WCF** service.
5. The user found the WCF Service Explorer page documenting all endpoints
   including `/Authenticate` with schema `{ User, Password, appId }`.
6. We closed PR #25 and shipped PR #26 with a two-stage flow: try
   `/Authenticate` first, fall back to `/Login`.

## Evidence trail

### Phase 1 — First field test (failed)

User installed the Wave 5 debug APK on phone "motech" over Tailscale VPN.
Entered credentials `معين العباسي` / `771771`. Result:

```
HTTP 200 OK
Body: {}
```

Schema validation failed: `LoginUserResponseSchema` requires
`access_token`, the response had none. Error code: `NO_ACCESS_TOKEN`.

### Phase 2 — PR #25 (wrong diagnosis)

Inspecting the legacy Java sources:

```java
// AuthData.java (used by Retrofit Moshi)
@Json(name = "appid")    // ← lowercase
String appid;
@Json(name = "secureId") String secureId;
@Json(name = "username") String username;
@Json(name = "password") String password;
```

```java
// AuthRepository.java (older code path, uses raw JSONObject)
String url = _baseUrl + "Login";  // capital L
// JSON body assembled with put("appId", ...) — camelCase
```

The two files contradicted each other. PR #25 picked `appid` (lowercase)
to match the Moshi annotation. **This was the wrong choice.**

### Phase 3 — User's investigation (THE GAME-CHANGER)

User opened `http://100.87.131.115:3000/` in a browser. Saw:

> "الأسلوب غير مسموح. الرجاء مراجعة صفحة تعليمات الخدمة لإنشاء طلبات
> صالحة للخدمة"
>
> (Method not allowed. Please review the service help page to create
> valid requests for the service.)

This is **the canonical WCF Service Explorer fallback error in Arabic** —
.NET 4.x renders this exact string when the root URL is accessed with
no operation specified.

The user then navigated to `/electric/` and got the WCF operations index:

```
Authenticate       POST    /electric/Authenticate
Login              POST    /electric/Login
ReSetPassword      POST    /electric/ReSetPassword
SaveReading        POST    /electric/SaveReading
GetCompanyData     GET     /electric/GetCompanyData
GetCompanyInfo     GET     /electric/GetCompanyInfo?appId={APPID}
GetListUsers       GET     /electric/GetListUsers?id={ID}&appId={APPID}
... (30+ endpoints, all using appId camelCase in query strings)
```

Then `/electric/Authenticate` (the Help page):

```json
Request schema:
{
  "Password": "string",
  "User": "string",
  "appId": "string"
}

Response schema:
"string"  ← raw JSON string literal
```

### Phase 4 — Final diagnosis

| Clue | What it told us |
|---|---|
| Arabic error string verbatim from .NET 4.x | Backend is WCF |
| `xmlns="http://schemas.datacontract.org/2004/07/MProgService.models"` | DataContract namespace from .NET WCF |
| `xs:complexType` in the XML schema | Canonical WCF schema rendering |
| All `appId` in URL query strings are camelCase | Service is .NET-style (camelCase JSON convention) |
| `/Authenticate` has docs, `/Login` does not | `/Login` is a legacy/internal stub |
| Response is `"string"` literal | WCF `[OperationContract]` returning `string` |

### Phase 5 — PR #26 design

We could not be 100% sure `/Login` would NOT work — the Java app does
target it, and the user said the legacy app still functions. So we
went with a **two-stage flow**:

```
                       ┌──────────────────────────────┐
LoginScreen → login() ─┤ STAGE 1: POST /Authenticate  │
                       │   { User, Password, appId }  │
                       │   Expect: "token-string"     │
                       └──────────┬───────────────────┘
                                  │ success?
                                  ▼
                  ┌──────────────────────────────────┐
                  │ YES → mint AuthUser + persist     │
                  │      tokens → isAuthenticated=true│
                  └──────────────────────────────────┘
                                  │ no
                                  ▼
                       ┌──────────────────────────────┐
                       │ STAGE 2: POST /Login          │
                       │   { username, password,       │
                       │     appId, secureId }         │
                       │   Expect: Users object        │
                       └──────────┬───────────────────┘
                                  │ success?
                                  ▼
            success → hydrate user OR
            failure → diagnostic shows BOTH raw bodies
```

### Phase 6 — Diagnostic surface

If STAGE 2 also fails, `lastLoginError.responseBody` looks like:

```
STAGE 1 — POST http://100.87.131.115:3000/electric/Authenticate
Result: HTTP 200 schema invalid or empty token.
Server returned:
""

──────────
STAGE 2 (/Login) — schema invalid.
Server returned:
{}
```

The user copies this from LoginScreen and pastes it to the agent. The
agent can then read **both raw responses** and know what the server
actually does in this network/credential combination.

## Network context (Tailscale)

| Host | Tailscale IP | Status | Role |
|---|---|---|---|
| `motech` | `100.110.191.9` | online | User's phone (test device) |
| (server, name unclear) | `100.87.131.115` | online | WCF backend (port 3000) |
| `abbasiyserver` | `100.120.149.26` | offline | Old backup server |
| `server.tail1e8010.ts.net` | `100.119.58.61` | online | Tailscale Admin |

The user authenticates Tailscale VPN before opening the app. The legacy
Java app's "اعدادات الاتصال" screen shows:

```
عنوان السيرفر:  100.87.131.115
رقم الفرع:      1
الرقم التسلسلي:  2098897319
```

→ `الرقم التسلسلي = 2098897319` is the legacy `Defence.getDeviceId()`
output for this specific phone. **It is the `secureId` field in the
`/Login` JSON body.** Hardcoded fallback baked into the legacy app for
this specific user.

## Open questions for the new agent

If the user's field test of PR #26 **fails**, the diagnostic will
expose which of these is true:

1. **`/Authenticate` returns 404 / 405** → endpoint name is wrong on
   this specific server build (maybe needs `/electric/Authenticate` not
   `Authenticate`? — check baseURL resolution)
2. **`/Authenticate` returns 200 with empty `""`** → credentials wrong,
   or server expects extra fields (try adding `secureId` to the body)
3. **`/Authenticate` returns 415 Unsupported Media Type** → maybe wants
   `application/json; charset=utf-8` exactly (vs the default
   `application/json`); inspect `httpClient.ts` interceptor headers
4. **`/Authenticate` returns the right token but app rejects it** →
   bug in `AuthenticateResponseSchema` parsing (maybe Axios auto-parses
   the `"string"` body as a plain string, dropping quotes; check
   `parsed.success`)
5. **Both endpoints return empty** → server is configured to only accept
   requests with a specific `Origin` / `User-Agent` header; legacy Java
   uses OkHttp's default UA, our app uses Axios default; might need
   to spoof a UA matching the Java client

## Things the new agent should NOT do

1. **DO NOT** lowercase `appId` → `appid` again. PR #25 already tried that;
   it broke the WCF query-string consistency.
2. **DO NOT** delete the `/Login` fallback. Until the user confirms
   `/Authenticate` works in production, fallback is our safety net.
3. **DO NOT** strip the cross-stage diagnostic in `lastLoginError`.
   That copy-paste error box is the user's only debugging surface on
   the physical device.
4. **DO NOT** change `LoginUserResponseSchema` (used by STAGE 2). The
   legacy `/Login` shape — if it ever DOES return data — is well-defined
   in the Users.java decompiled class. Adding lenient parsers (e.g.
   making `access_token` optional) would silently break STAGE 2.

## File-by-file pointer

- `src/services/api/endpoints.ts` — both endpoints registered (lines 65–110 ish)
- `src/services/api/schemas/auth.ts` — both schemas + types
- `src/stores/authStore.ts` — `login()` has the two-stage flow with
  STAGE 1/STAGE 2 comments
- `src/screens/auth/LoginScreen.tsx` — shows `lastLoginError` (line ~336)
  via a copyable error block
- `ElectricCollector_Full_Analysis/source_code/com/yd/electricecollector/` —
  the decompiled Java sources used for reference

## How to reproduce the field test

1. User downloads APK from PR #26 artifact: `abbasi-tahseel-debug-apk`
   (workflow run `26259193684`).
2. Sideloads on phone "motech" (`adb install` or just transfer + tap).
3. Connects to Tailscale (uses Tailscale app on Android).
4. Opens the app → Server settings already pointed at `100.87.131.115:3000`
   (Wave 3 default) — or the user can change in `ServerSettingsScreen`.
5. Logs in with `معين العباسي` / `771771`.
6. If failure: taps "نسخ التفاصيل" on the error box, pastes the resulting
   diagnostic into the chat with the agent.
