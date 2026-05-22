# Skill — WCF API Debugging

> The AbbasiTahseel backend is a .NET WCF service. Most "weird HTTP"
> bugs in this project come from misunderstanding WCF idioms. This skill
> tells you what to look for.

## Skill summary

- Recognize WCF responses by their fingerprints
- Read the live Service Explorer pages
- Decode `{}` empty bodies, 405 errors, 415 errors, raw string responses

## The 5-second fingerprint test

Is the backend WCF? Check for any of these:

1. **Arabic 405 page** at the root URL:
   > "الأسلوب غير مسموح. الرجاء مراجعة صفحة تعليمات الخدمة لإنشاء طلبات صالحة للخدمة"
   That's a `.NET 4.x WCF` Service Host fallback in Arabic culture.
2. **`xmlns="http://schemas.datacontract.org/2004/07/<Namespace>.models"`**
   in any returned XML. DataContract namespace is WCF-only.
3. **Help page exists at `/<endpoint>`** showing JSON+XML schemas.
4. Operations index at the root of the service that LISTS all `[OperationContract]`-decorated methods.

If you see ANY of these → it's WCF.

## How to read the Service Explorer

Visit `http://<host>:<port>/<service-root>/<EndpointName>` in a browser
to see the auto-generated Help page. It shows:

```
Request schema:
{
  "FieldA": "string",
  "FieldB": "int"
}

Response schema:
"string"          ← means [OperationContract] returns a string
{ ... }           ← means returns a complex type
```

**Casing in the schema is EXACT.** WCF is case-sensitive. `"FieldA"` and
`"fielda"` are different members. If the schema shows `"User"`, send
`"User"`, not `"user"` or `"username"`.

## WCF response idioms — what you'll actually see

| Method signature | JSON wire format | Notes |
|---|---|---|
| `string Foo()` | `"value"` | Quoted string literal. **Not an object.** |
| `int Foo()` | `42` | Bare integer. |
| `bool Foo()` | `true` / `false` | Lowercase. |
| `[DataContract] Bar Foo()` | `{ "fieldA": ..., "fieldB": ... }` | Standard object, fields use the contract's member names. |
| `List<Bar> Foo()` | `[ { ... }, { ... } ]` | Array. |
| `void Foo()` | empty body (status 204 or 200) | Nothing returned. |

**Empty `{}` is suspicious.** It means either:
- WCF Auto-Routing matched the URL but a `[DataContract]` request DTO
  deserialized to all-default values (your request body field names
  didn't match), so the service returned a default-initialized DTO.
- The service threw a swallowed exception and the WCF error handler
  returned a default response.

## How to handle a `string` response in our Axios + Zod stack

Axios decodes a body of `"hello"` (with literal quotes) into the JS
string `'hello'`. So in your Zod schema:

```ts
// Correct
export const FooResponseSchema = z.string().min(1);

// WRONG — would expect an object
export const FooResponseSchema = z.object({ value: z.string() });
```

See `src/services/api/schemas/auth.ts` → `AuthenticateResponseSchema`
for the canonical example.

## How to send the EXACT field names WCF expects

In our stack:

```ts
// authStore.ts STAGE 1
const raw = await api.call<unknown>('authenticate', {
  body: { User: username, Password: password, appId },
  //      ↑ Capital U   ↑ Capital P     ↑ camelCase
});
```

The `api.call()` helper passes `body` straight through to Axios `data`,
which JSON-stringifies it with the exact casing you give it. Don't
"normalize" field names — WCF won't forgive you.

## Common WCF status codes (in this project)

| Status | Meaning in WCF context |
|---|---|
| 200 + `{}` | Request matched but body fields didn't bind. Check casing. |
| 200 + `""` | Auth-style endpoint returned empty string = failed credentials. |
| 400 | Malformed JSON body, or required field missing. |
| 404 | URL didn't match any `[WebInvoke]` route. Maybe missing trailing slash, wrong endpoint name, wrong HTTP verb. |
| 405 | URL matched but the HTTP verb didn't. (e.g. POST to a GET-only endpoint.) |
| 415 | `Content-Type` not accepted. WCF often wants `application/json` exactly (no charset). |
| 500 | Server-side exception. The body usually contains a SOAP-style fault XML if `IncludeExceptionDetailInFaults=true`. |

## How to triage a failed call

1. **Get the raw response body.** In our app, `lastLoginError.responseBody`
   on `useAuthStore` has it. For other endpoints, add a temporary debug
   log in `httpClient.ts` `installDebugInterceptor`.
2. **Check the casing of every field in your request body** against the
   Service Explorer Help page for that endpoint.
3. **Verify the URL path.** WCF endpoints are case-sensitive too. `Login`
   ≠ `login` ≠ `LOGIN`.
4. **Verify Content-Type.** Default Axios sends `application/json` —
   that's correct for our backend. Don't add `charset=utf-8` unless you
   verify the server accepts it.
5. **If still failing, OPEN THE HELP PAGE in a browser** and copy the
   `Sample Request JSON` block — that's what the server expects byte-for-byte.

## Specific bugs we hit

### Bug 1 — PR #25's `appid` mistake

Symptom: `/Login` returned `200 OK` + `{}`.
Wrong fix: lowercased `appId` → `appid` to match Moshi annotation.
Right fix: switched to `/Authenticate` and kept `appId` camelCase.
Lesson: **Trust the live Service Explorer over the decompiled Java.**

### Bug 2 — Empty `""` from `/Authenticate`

Symptom: Schema validation fails because `z.string().min(1)` rejects `""`.
Cause: Server returns empty string on bad credentials.
Fix: That's the correct behavior — schema failure = "credentials wrong".
The error code becomes `SCHEMA_INVALID` which i18n maps to
`auth.login.invalidCredentials`.

### Bug 3 — Axios pre-parses string response

Symptom: We expected `'"token"'` (4 chars) but got `'token'` (5 chars).
Cause: Axios auto-detects JSON and strips the outer quotes.
Fix: That's also correct — our schema is `z.string()`, which accepts
the unwrapped value.

## Reference

- All endpoints registered in `src/services/api/endpoints.ts`.
- All schemas in `src/services/api/schemas/`.
- The two-stage flow that handles auth uncertainty:
  `src/stores/authStore.ts` → `login()` method.
- Full story of the WCF discovery: `AGENT_CONTEXT/AUTH_INVESTIGATION.md`.
