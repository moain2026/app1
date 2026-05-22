# Skill — Reading the Legacy Java App

> The decompiled Java sources live in
> `/home/user/webapp/ElectricCollector_Full_Analysis/source_code/`. Use
> them to verify wire formats, business logic, and edge cases. **Never
> trust Java over the live WCF Service Explorer** — but Java is the
> next-best source.

## Skill summary

- How to navigate the decompiled tree
- Retrofit / Moshi / OkHttp idioms in the legacy app
- How to extract a wire format from a Java class
- What to ignore (artifacts of JADX decompilation)

## Tools used to decompile

- JADX 1.4 — the source we're reading
- Some classes are partially obfuscated (look for `a.b.c.d` package
  names); the legacy team didn't fully strip
- Inner classes show as `OuterClass$InnerClass` or unnamed `$1.java` etc.
- The `R.java` file (Android resources) is massive and useless — ignore

## Where things live

See `AGENT_CONTEXT/LEGACY_JAVA_MAP.md` for a full index. Key shortcuts:

| You want to know... | File |
|---|---|
| What endpoint calls X return | `entities/<X>.java` (Moshi DTO) |
| What endpoint X expects in its body | `entities/<X>Data.java` or `model/<X>Repository.java` |
| All available endpoints | `network/ApiService.java` |
| Per-call HTTP timeouts | `network/RestServiceHelper.java` |
| The Defence-XOR algorithm | `Defence.java` |
| The login flow | `LoginActivity.java` → `LoginPresenter.java` → `model/AuthRepository.java` |

## Retrofit idioms

```java
@FormUrlEncoded               // → Content-Type: application/x-www-form-urlencoded
@POST("path/here")            // → HTTP method + URL relative to baseURL
Call<ResponseType> methodName(@FieldMap Map<String, String> map);
//                            ↑ each map entry becomes a form field

@POST("path/here")            // implicit JSON
@Headers({"Content-Type:application/json"})
Call<ResponseType> methodName(@Body RequestDTO body);
//                            ↑ Moshi serializes the DTO

@GET("path/here")
Call<List<Item>> methodName(@Query("key") String value);
//                          ↑ becomes ?key=value
```

For the AbbasiTahseel app:

- `@FormUrlEncoded` endpoints we register in `endpoints.ts` use the
  `form()` builder
- `@POST` with `@Body` we register with `json()` builder
- Path strings are EXACTLY what we put in the descriptor's `path` field

## Moshi idioms

```java
@JsonClass(generateAdapter = true)
public class FooDto {
  @Json(name = "wire_field_name") String tsFieldName;
  // ↑ @Json overrides the field name on the wire
  // Without @Json, Moshi uses the Java field name directly
}
```

**Trap:** Moshi's `@Json` annotation is only consulted by Retrofit calls
that use this DTO. If the same endpoint is called with a raw
`JSONObject`, the field names come from `put("...", value)` calls, NOT
from the DTO. The legacy `AuthRepository` uses both styles for `/Login` —
that's why we can't trust `AuthData.java` alone.

## OkHttp idioms

```java
// In RestServiceHelper.java:
OkHttpClient client = new OkHttpClient.Builder()
    .connectTimeout(200, TimeUnit.SECONDS)    // ← we use 30s in our app
    .readTimeout(200, TimeUnit.SECONDS)
    .writeTimeout(200, TimeUnit.SECONDS)
    .addInterceptor(new RefreshInterceptor()) // ← bug: appends "a"
    .build();
```

Translation to our stack:
- timeouts: `httpClient.ts` → `DEFAULT_TIMEOUT_MS = 30_000`
- Refresh interceptor: `services/api/interceptors/refresh.ts`

## Anti-patterns we explicitly avoided

The legacy code has these — **don't copy them.**

### 1. The "+a" Authenticator bug

```java
// CustomAuthenticator.java line 41
String token = refreshToken + HtmlTags.A; // accidental import → adds "a"
```
**ADR-005:** our `/refresh` sends the clean token.

### 2. XOR Defence math

```java
// Defence.java
return convertHexToDecimal(androidId.substring(0, 8)) ^ MAGIC_CONSTANT;
```
**ADR-004:** we replicate the OUTPUT shape (10-digit decimal) but not
the XOR. The backend doesn't verify the XOR; it just stores whatever.

### 3. Mixed AsyncHttpClient + Retrofit

The legacy app uses two HTTP clients:
- Retrofit for `/Login`, `/UserAuth`, `/SaveReading`
- loopj AsyncHttpClient (deprecated 2015) for `/GetCompanyData`, etc.

**ADR-006:** we unify on axios. All endpoints go through one client.

### 4. Hardcoded JSON keys in strings

```java
JSONObject body = new JSONObject();
body.put("appId", "1");           // typo-prone
body.put("usernme", username);    // ← actual typo in the wild
```
**Our stack:** Zod schemas enforce field names at compile time + runtime.

## How to extract a wire format from a Java class

Procedure:

1. Open `entities/<Foo>.java` (the DTO)
2. Note `@JsonClass(generateAdapter = true)` — confirms this is Moshi
3. List every field; note `@Json(name = "...")` overrides
4. Note the Java type:
   - `String` → `z.string()` in our schema
   - `int` / `Integer` → `z.number().int()` (or `zIntLoose` for lenient)
   - `boolean` / `Boolean` → `z.boolean()` (or `zBoolLoose`)
   - `double` → `z.number()`
   - `List<X>` → `z.array(XSchema)`
   - nested DTOs → `XSchema` (recursive)
5. Note nullability:
   - `Java field has @Nullable / Boxed type` → `.optional().nullable()`
   - `Java primitive (int, boolean)` → required (Moshi rejects null)

## Lenient schemas — when to use

The legacy server sometimes returns:
- Numbers as strings (`"42"` vs `42`)
- Booleans as `"true"` / `0` / `1`
- Empty strings for null fields

Use our lenient helpers from `src/services/api/schemas/common.ts`:

```ts
import { zBoolLoose, zIntLoose, zStringOrEmpty } from './common';

const Schema = z.object({
  count: zIntLoose,           // accepts 42 or "42"
  active: zBoolLoose,         // accepts true, "true", 1, "1"
  name: zStringOrEmpty,       // accepts "name" or "" (transforms "" → undefined)
});
```

## Things JADX gets wrong

- **`switch` on strings:** decompiles into a giant `hashCode()` dispatch.
  Look for the original string literals in adjacent comments.
- **Closures / lambdas:** show as inner classes `Foo$$Lambda$1`. The
  body is usually a one-liner; trust it.
- **Generics:** type parameters are often erased. `Call<T>` shows as
  `Call`. Cross-reference with method signatures.
- **Default constructors:** shown empty but may actually do field init
  via bytecode. If a field has a non-default value at runtime that
  isn't set in the constructor, look for `<clinit>` blocks (static init).

## Searching the legacy code

```bash
# Find all endpoint declarations
grep -rn "@POST\|@GET\|@PUT\|@DELETE" \
  /home/user/webapp/ElectricCollector_Full_Analysis/source_code/

# Find a specific field name (e.g. "secureId")
grep -rn "secureId" \
  /home/user/webapp/ElectricCollector_Full_Analysis/source_code/

# Find what uses class FooRepository
grep -rn "FooRepository\|FooRepo " \
  /home/user/webapp/ElectricCollector_Full_Analysis/source_code/
```

## DO NOT

- Modify any file under `ElectricCollector_Full_Analysis/`. It's reference
  only and git-tracked (so changes would show up in diffs).
- Copy Java field names mechanically into TS. The legacy is inconsistent;
  always cross-check with the live WCF docs.
- Use the legacy "+a" bug, XOR Defence math, or any of the
  intentionally-avoided cruft.
