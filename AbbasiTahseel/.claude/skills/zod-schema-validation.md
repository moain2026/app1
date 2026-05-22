# Skill — Zod Schema Patterns (Project-Specific)

> How schemas are built in this project. Lenient parsers, common
> transforms, response patterns.

## Where schemas live

```
src/services/api/schemas/
├── common.ts          Shared helpers (zBoolLoose, zIntLoose, zStringOrEmpty)
├── auth.ts            Login / Authenticate / Refresh / Register
├── readings.ts        Reading list + SaveReading + UpdateReading
├── bonds.ts           Bond list + payments (Wave 6)
├── reports.ts         Report rows (Wave 7)
├── company.ts         GetCompanyData / GetCompanyInfo
└── ... etc
```

Every new endpoint that returns structured data gets its own schema
file or section. Every schema gets a matching `type Foo = z.infer<...>`.

## The lenient helpers (READ THIS FIRST)

```ts
// common.ts

/** Accepts `true`, `false`, `"true"`, `"false"`, `0`, `1`, `"0"`, `"1"`.
 *  Returns boolean. */
export const zBoolLoose = z.preprocess(
  (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || v === 'true' || v === 'True') return true;
    if (v === 0 || v === '0' || v === 'false' || v === 'False') return false;
    return v; // let z.boolean() reject
  },
  z.boolean(),
);

/** Accepts `42`, `"42"`, `null`, `""`. Returns number | undefined. */
export const zIntLoose = z.preprocess(
  (v) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && /^-?\d+$/.test(v)) return parseInt(v, 10);
    if (v == null || v === '') return undefined;
    return v;
  },
  z.number().int().optional(),
);

/** String OR empty-string (treats `""` as `undefined`). */
export const zStringOrEmpty = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().optional(),
);
```

## When to use what

| Server returns... | Use |
|---|---|
| Always proper booleans | `z.boolean()` |
| Sometimes `"true"`/`1`/etc | `zBoolLoose` |
| Always proper numbers | `z.number()` |
| Numbers sometimes as strings | `zIntLoose` |
| Strings, some empty | `zStringOrEmpty` |
| Strings, always present | `z.string().min(1)` |
| Strings, may be missing | `z.string().optional()` |
| Raw text body (WCF `string` return) | `z.string()` (NOT inside `z.object`) |

## Request vs Response schemas

By convention:

```ts
// auth.ts

// Request — what we SEND (strict, never lenient — we control this)
export const AuthenticateRequestSchema = z.object({
  Password: z.string().min(1),
  User: z.string().min(1),
  appId: z.string().min(1),
});

// Response — what we RECEIVE (lenient, server might be weird)
export const AuthenticateResponseSchema = z.string().min(1);

// Always export types
export type AuthenticateRequest = z.infer<typeof AuthenticateRequestSchema>;
export type AuthenticateResponse = z.infer<typeof AuthenticateResponseSchema>;
```

Rules:
- **Request schemas are strict** — we generate the data ourselves
- **Response schemas are lenient** — server might surprise us
- **Always export the type** via `z.infer`
- **Always name as `XxxRequestSchema` / `XxxResponseSchema`** (PascalCase + suffix)

## How to handle WCF's "string" response

WCF endpoints declared `string MyMethod()` return a JSON string literal
on the wire: `"value"`. Axios decodes this to a plain JS string. Your
schema:

```ts
// ✅ Correct
export const MyResponseSchema = z.string().min(1);

// ❌ Wrong — would expect an object
export const MyResponseSchema = z.object({ value: z.string() });
```

## How to handle arrays

```ts
// Server returns [ { ... }, { ... } ]
export const ItemSchema = z.object({ id: zIntLoose, name: zStringOrEmpty });
export const ItemListSchema = z.array(ItemSchema);

// Tolerate missing array entirely
export const ItemListResponseSchema = z.union([
  z.array(ItemSchema),
  z.object({ items: z.array(ItemSchema) }),
  z.null(),
]).transform((v) => Array.isArray(v) ? v : v?.items ?? []);
```

## How to handle the "wrapper or direct" pattern

Some legacy endpoints return either:
```json
{ "data": [ ... ], "error_no": 0 }
```
or
```json
[ ... ]
```
…depending on server version. Use a union with transform:

```ts
export const FlexibleResponseSchema = z.union([
  z.object({ data: z.array(ItemSchema), error_no: zIntLoose }),
  z.array(ItemSchema),
]).transform((v) => Array.isArray(v) ? v : v.data);
```

## Parsing in stores

ALWAYS use `safeParse`, never `parse`:

```ts
// ✅ Correct — recoverable
const raw = await api.call<unknown>('endpoint', { body: {...} });
const parsed = FooResponseSchema.safeParse(raw);
if (!parsed.success) {
  set({ error: 'foo.invalid', lastError: { rawResponse: raw } });
  return false;
}
// use parsed.data ...

// ❌ Wrong — throws, hard to surface error
const data = FooResponseSchema.parse(raw);
```

The `lastError` snapshot pattern (see `authStore.ts`) lets the UI show
the raw server response when parsing fails — invaluable for debugging
WCF quirks.

## Common pitfalls

### Schema accepts too much

```ts
// ❌ Lenient default — accidentally accepts garbage
z.object({
  id: z.unknown(),    // ← accepts anything
})

// ✅ Be explicit
z.object({
  id: zIntLoose,      // accepts number or numeric string only
})
```

### Schema rejects empty server fields

```ts
// ❌ Server returns name: "" → schema fails
z.object({ name: z.string().min(1) })

// ✅ Tolerate empty
z.object({ name: zStringOrEmpty })
```

### `noUncheckedIndexedAccess` and Zod

TypeScript's `noUncheckedIndexedAccess: true` means array/object lookups
return `T | undefined`. Zod's `.array().optional()` returns
`T[] | undefined`, but indexing into `T[]` still returns `T`. After
`.transform`, indexes return `T | undefined`. Be explicit:

```ts
const list = parsed.data;        // ReadingDto[]
const first = list[0];           // ReadingDto | undefined
if (first) { ... }
```

## Date handling

Server returns dates as ISO strings (`"2025-01-15T10:30:00Z"`). Schema:

```ts
import { z } from 'zod';

export const zIsoDate = z.string().datetime({ offset: true })
  .transform((s) => new Date(s));
// → After parse, the field is a JS Date object.
```

Avoid `z.date()` for incoming data — it only validates JS `Date`
objects, not strings.

## When to add a schema file

- If you add a NEW endpoint to `endpoints.ts`, add at least its
  Response schema.
- If you add MULTIPLE related endpoints (e.g. all the report endpoints),
  group them in one file (`reports.ts`).
- Export both the schema and the inferred type.
- Reference the schema from the store action via `safeParse`.

## DO NOT

- **Don't put types in `.d.ts` files.** Use `z.infer<>` so types stay in
  sync with runtime validation.
- **Don't use `z.any()`.** Use `z.unknown()` if you truly don't know
  the shape (rare).
- **Don't use `.parse()` in production code.** Always `.safeParse()`.
- **Don't skip the response schema** for new endpoints "because we'll
  add it later." It always grows up to bite you when a server change
  silently corrupts data.
