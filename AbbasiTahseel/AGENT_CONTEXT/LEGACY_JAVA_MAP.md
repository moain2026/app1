# LEGACY_JAVA_MAP — Where to Find What in the Decompiled Java App

> The folder `/home/user/webapp/ElectricCollector_Full_Analysis/source_code/`
> contains JADX-decompiled Java code from the original Android app
> `ElectricCollector28.apk`. This is **reference only** — never modify
> these files. Use them to verify wire formats, field names, and business
> logic when the WCF Service Explorer is ambiguous.

## High-level package tree

```
ElectricCollector_Full_Analysis/source_code/com/yd/electricecollector/
├── LoginActivity.java                   Entry point; calls LoginPresenter
├── LoginPresenter.java                  Wraps AuthRepository; checks errorNo
├── MainActivity.java                    Post-login navigation host
├── SettingsActivity.java                Connection settings (server IP + branch)
├── Defence.java                         Device-ID / secureId generator (XOR-based)
│
├── entities/                            Moshi @JsonClass DTOs
│   ├── AuthData.java                    /Login request body
│   ├── AccessToken.java                 /UserAuth response (token only)
│   ├── Users.java                       /Login response (user + permissions)
│   ├── Reading.java                     SaveReading body / response
│   ├── Bond.java                        Bond entity (Wave 6 reference)
│   ├── BondPayment.java                 Bond payment entity (Wave 6 reference)
│   ├── Company.java                     GetCompanyData response
│   ├── Account.java                     GetListAccounts entry
│   ├── Place.java                       GetListPlaces entry
│   ├── User.java                        GetListUsers entry
│   ├── Currency.java                    GetListCurrency entry
│   ├── Group.java                       GetListGroup entry (TGroup in our DB)
│   └── ...
│
├── model/
│   ├── AuthRepository.java              POST /Login implementation (uses raw OkHttp)
│   ├── ReadingRepository.java           /SaveReading + /GetListReadingCounter
│   ├── BondRepository.java              /GetListBonds + /GetListBondsPayment
│   ├── CompanyRepository.java           /GetCompanyData
│   └── ...
│
├── network/
│   ├── ApiService.java                  Retrofit interface (declares all 30+ endpoints)
│   ├── RestServiceHelper.java           Singleton Retrofit + OkHttp builder
│   ├── CustomAuthenticator.java         OkHttp Authenticator (has the "+a" bug)
│   └── ...
│
└── ui/                                  Activities + Fragments (not our concern)
```

## The auth contract — three competing definitions in Java

This is the root cause of all our login confusion. The legacy app
contains **three different login endpoint definitions** that disagree:

### Definition 1 — `ApiService.java` (Retrofit interface)

```java
@FormUrlEncoded
@POST("login")                                  // lowercase, form-encoded
Call<Users> login(@FieldMap Map<String, String> map);

@Headers({"Content-Type:application/json"})
@POST("UserAuth")                               // capital, JSON body
Call<AccessToken> userAuth(@Body AuthData authData);
```

→ Suggests `/login` (lowercase) form-encoded.

### Definition 2 — `AuthRepository.java` (the code path actually used)

```java
String url = _baseUrl + "Login";                // capital L
JSONObject body = new JSONObject();
body.put("username", username);
body.put("password", password);
body.put("appId", appId);                       // camelCase
body.put("secureId", secureId);
// fires POST with Content-Type: application/json
```

→ Suggests `/Login` (capital L) JSON body with `appId` camelCase. **This
is the code path the legacy app actually uses.**

### Definition 3 — `AuthData.java` (Moshi DTO, only used by `UserAuth`)

```java
@JsonClass(generateAdapter = true)
public class AuthData {
  @Json(name = "appid")    String appid;        // lowercase
  @Json(name = "secureId") String secureId;
  @Json(name = "username") String username;
  @Json(name = "password") String password;
}
```

→ Suggests `appid` lowercase. **But this DTO is only used in the
`/UserAuth` path, not `/Login`.** PR #25 mistakenly thought this
applied to `/Login` too.

### Resolution

The WCF Service Explorer (the live server's own documentation) is the
ultimate source of truth:

- `/Authenticate` uses `{ User, Password, appId }` — capital U/P, camelCase appId
- `/Login` exists but has no Help page (legacy stub)

Definition 2 is the closest to what `/Login` ACTUALLY expects on the
live server — `appId` is camelCase in BOTH endpoints. PR #25's lowercase
choice was incorrect.

## The "Defence" obfuscation

`Defence.java` is the legacy app's home-rolled obfuscation layer:

```java
public static String getDeviceId(Context ctx) {
  String androidId = Settings.Secure.getString(
      ctx.getContentResolver(), Settings.Secure.ANDROID_ID);
  // XOR with a constant + first 8 hex chars → decimal
  return convertHexToDecimal(androidId.substring(0, 8))
       ^ MAGIC_CONSTANT;
}
```

→ Output is a 10-digit decimal. For phone "motech" the result is
`2098897319`. We replicated the algorithm in
`src/services/security/licenseManager.ts` (`getSecureId()`).

**ADR-004 documents the choice to replicate the OUTPUT without the XOR
math — we just generate a stable decimal per device.** The legacy
backend doesn't validate the XOR; it just stores whatever string the
app sends.

## The "+a" Authenticator bug

`CustomAuthenticator.java` line 41:

```java
// Appends HtmlTags.A (which is just the literal string "a") to the
// refresh token. This is unintentional — HtmlTags is the iText PDF lib
// import that someone autocompleted by accident.
String token = refreshToken + HtmlTags.A;
```

→ The legacy app sends `<refresh_token>a` instead of `<refresh_token>`.
The server tolerates it (probably trims trailing junk before lookup).
We **DO NOT** reproduce this bug — our `/refresh` sends the clean token.
Documented in `src/services/api/schemas/auth.ts` (`RefreshRequestSchema`
comment).

## Print bytes — `Print.java`

The legacy app uses Datecs's official Android SDK (jar). We don't ship
the jar. Instead, our `src/services/printer/escposBuilder.ts`
re-implements the ESC/POS bytes manually. Reference comparison:

```java
// Java legacy
DatecsBluetoothManager.print(deviceMac, escposBytes);

// Our TS
await PrinterManager.print(escposBytes);
```

Both send the same byte stream. The cp1256 mapping in
`prepared-assets/printer/cp1256-map.json` was extracted from the
Datecs SDK's `Cp1256Encoding.java`.

## Reading model field names — DON'T RENAME

`Reading.java`:

```java
@Json(name = "num")     String num;        // meter serial number
@Json(name = "name")    String name;       // Arabic customer name
@Json(name = "namet")   String namet;      // English/transliterated name
@Json(name = "ind")     int ind;           // current reading
@Json(name = "ks")      int ks;            // previous reading
@Json(name = "kh")      int kh;            // consumed
@Json(name = "cas")     int cas;           // amount due (currency unit-less)
@Json(name = "asts")    int asts;          // status flag
@Json(name = "nomstlm") String nomstlm;    // recipient name
@Json(name = "notblh")  String notblh;     // tablet/group code
@Json(name = "noadad")  String noadad;     // count
@Json(name = "nog")     String nog;        // sub-group code
```

→ All these names must be sent back to the server VERBATIM on
`/SaveReading`. Our DB schema preserves them in `database/schema.ts`.

## Cross-reference table

When you need to verify something on the wire, find it here:

| You need to know... | Look in (Java side) |
|---|---|
| `/Login` JSON body shape | `model/AuthRepository.java` (the actually-used path) |
| `/Login` response shape | `entities/Users.java` |
| `/UserAuth` request | `entities/AuthData.java` |
| `/UserAuth` response | `entities/AccessToken.java` |
| `/SaveReading` payload | `entities/Reading.java` |
| `/GetCompanyData` response | `entities/Company.java` |
| Device-ID algorithm | `Defence.java` |
| List of all endpoints | `network/ApiService.java` |
| OkHttp config (timeouts etc.) | `network/RestServiceHelper.java` |
| Refresh-token bug | `network/CustomAuthenticator.java` line 41 |
| Bond list response | `entities/Bond.java` + `model/BondRepository.java` |
| Currency entity | `entities/Currency.java` |

## DO NOT

- Edit anything in `ElectricCollector_Full_Analysis/`. It's reference only.
- Assume Java is right when WCF Service Explorer disagrees. The live
  server is the source of truth.
- Re-introduce the `+a` bug, the XOR Defence math, or any of the legacy
  cruft we explicitly avoided in ADRs 003, 004, 011.
