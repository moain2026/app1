# Legacy API Reference — `/electric/` root

> Full reference for the 31 endpoints the React Native app consumes from the
> PHP+MySQL backend (`http(s)://<host>:<port>/electric/`).
>
> All requests carry `Authorization: Bearer <JWT>` after login except `auth/login`,
> `license/*`, `health`, `version`, `device/register`.
>
> Conventions:
> - `Content-Type: application/json` on all POSTs.
> - Server times are Unix-ms (`number`) — convert with `new Date(ms)`.
> - All Arabic fields are utf-8.
> - 4xx body shape: `{ error: { code: string, message: string, field?: string } }`.

---

## 1. `POST /auth/login`

Authenticate a collector.

**Request body**
```json
{
  "username": "collector42",
  "password": "•••••••",
  "deviceId": "a1b2c3d4e5f6"
}
```

**Response 200**
```json
{
  "token": "eyJhbGciOiJI...",
  "refreshToken": "rftk_...",
  "expiresInSec": 3600,
  "user": {
    "id": "user_1042",
    "username": "collector42",
    "fullName": "أحمد محمد",
    "role": "collector",
    "branchId": 3,
    "permissions": ["bond.create","bond.reprint","reading.create"]
  }
}
```

**Errors**
- `401 INVALID_CREDENTIALS`
- `403 ACCOUNT_DISABLED`
- `403 LICENSE_REQUIRED`

**curl**
```bash
curl -X POST 'http://100.87.131.115:3000/electric/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"collector42","password":"x","deviceId":"a1b2c3"}'
```

**JS**
```ts
const { data } = await api.post('/auth/login', { username, password, deviceId });
```

---

## 2. `POST /auth/logout`

Invalidate the current JWT server-side.

**Body** `{}`  →  **Response 204** (no body).

---

## 3. `POST /license/activate`

Bind a device to an activation code.

**Body**
```json
{
  "deviceId": "a1b2c3d4e5f6",
  "activationCode": "AB12-CD34-EF56"
}
```

**Response 200**
```json
{
  "licenseId": "lic_998",
  "boundAt": 1737000000000,
  "expiresAt": null,
  "branchId": 3
}
```

**Errors**: `400 BAD_CODE_FORMAT`, `409 CODE_ALREADY_USED`, `410 CODE_EXPIRED`.

---

## 4. `GET /license/status`

Check the license bound to a deviceId (used at app boot).

**Query**: `?deviceId=...`

**Response 200**
```json
{ "active": true, "boundAt": 1737000000000, "expiresAt": null, "branchId": 3 }
```

`200 { active: false }` if no binding.

---

## 5. `GET /sync/pull/readings`

Fetch readings modified since the cursor.

**Query**
- `since` — Unix-ms cursor (default 0).
- `limit` — default 500.

**Response 200**
```json
{
  "rows": [
    {
      "id": 8801,
      "local_uuid": "uuid",
      "noadad": "12345678",
      "subscriber_name": "أحمد",
      "previous_value": 45230,
      "current_value": 45847,
      "consumption": 617,
      "notes": null,
      "collector_id": "user_1042",
      "branch_id": 3,
      "created_at": 1737000000000,
      "updated_at": 1737000300000,
      "deleted_at": null
    }
  ],
  "nextSince": 1737000300000,
  "hasMore": false
}
```

Pagination: when `hasMore=true`, re-call with the returned `nextSince`.

---

## 6. `GET /sync/pull/bonds`

Same shape as readings. Returned fields per row:
`id, local_uuid, num, server_id, noadad, subscriber_name, area_name,
collector_id, total_amount, bond_date, notes, previous_balance, new_balance,
is_reprint, branch_id, created_at, updated_at, deleted_at`.

---

## 7. `GET /sync/pull/bond_payments`

Rows: `id, bond_id, amount, payment_type, currency_id, description, created_at, updated_at, deleted_at`.

---

## 8. `GET /sync/pull/accounts`

Rows: `id, noadad, name, phone, address, area_name, place_id, group_id, balance, last_reading, avg_consumption, updated_at, deleted_at`.

---

## 9. `GET /sync/pull/places`

Geographic places (Baghdad areas, sub-areas).
Rows: `id, name, parent_id, geo, updated_at, deleted_at`.

---

## 10. `GET /sync/pull/groups`

Billing groups (residential, commercial, industrial).
Rows: `id, name, tariff_id, updated_at, deleted_at`.

---

## 11. `GET /sync/pull/tblh`

Tariff lookup table (`tblh` from legacy schema).
Rows: `id, name, rate_iqd_per_kwh, currency_id, breakpoints, updated_at, deleted_at`.

---

## 12. `GET /sync/pull/currencies`

Rows: `id, name, symbol, exchange_rate, is_default, order, updated_at`.

---

## 13. `GET /sync/pull/users`

Local cache of other collectors in the same branch (for "see who created this bond").
Rows: `id, username, full_name, role, branch_id, is_active, updated_at`.

---

## 14. `GET /sync/pull/company_info`

Header / footer info for receipts.
Response (single object, not array):
```json
{
  "name": "شركة العباسي لتوليد الكهرباء التجارية",
  "branchName": "بغداد - الكرادة",
  "branchId": 3,
  "supportPhone": "07700000000",
  "logoBase64": null,
  "updated_at": 1737000000000
}
```

---

## 15. `POST /sync/push/readings`

Batch upload of new/edited readings.

**Body**
```json
{
  "batchId": "uuid-of-this-batch",
  "rows": [
    {
      "local_uuid": "uuid",
      "noadad": "12345678",
      "previous_value": 45230,
      "current_value": 45847,
      "notes": null,
      "created_at": 1737000000000
    }
  ]
}
```

**Response 200**
```json
{
  "results": [
    { "local_uuid": "uuid", "status": "created", "serverId": 8802 }
  ]
}
```

Per-row `status` ∈ `created | updated | duplicate | error`.
On `error`, also `reason` field.

---

## 16. `POST /sync/push/bonds`

Same envelope as readings. Row fields:
`local_uuid, noadad, subscriber_name, area_name, total_amount, bond_date, notes, is_reprint, payments[]`.

`payments[]` is an array of `{ local_uuid, amount, payment_type, currency_id, description }`.

> Pushing bonds with their payments **inline** prevents partial-state on the server.

---

## 17. `POST /sync/push/bond_payments`

Used **only** when editing payments of an already-synced bond. Body:
```json
{
  "batchId": "uuid",
  "rows": [
    { "local_uuid": "p_uuid", "bond_server_id": 1042, "amount": 50000, "payment_type":"cash", "currency_id":"IQD" }
  ]
}
```

---

## 18. `POST /sync/push/accounts`

Edits to subscriber data (phone, address). Limited fields:
`local_uuid OR server_id, phone, address, notes`.
Name and balance are server-managed and cannot be edited from the app.

---

## 19. `POST /sync/push/places`

Reserved — collectors don't create places. Returns `403 NOT_ALLOWED` for `role=collector`.

---

## 20. `POST /sync/push/groups`

Reserved — admin-only. `403 NOT_ALLOWED` for collectors.

---

## 21. `POST /sync/ack`

Acknowledge that the client has fully processed a pull cursor.
Body: `{ "table": "readings", "lastPulledAt": 1737000300000 }`.
Response 204.

---

## 22. `GET /reports/daily`

Daily summary for one collector.

**Query**: `?date=2026-05-20&collectorId=user_1042`

**Response 200**
```json
{
  "date": "2026-05-20",
  "collector": { "id": "user_1042", "fullName": "أحمد محمد" },
  "stats": { "readings": 28, "bonds": 12, "uniqueSubscribers": 24, "avgPerHour": 4.1 },
  "totals": { "iqd": 720000, "usd": 40 },
  "byPaymentType": { "cash": { "iqd": 600000, "usd": 0 }, "transfer": {...}, ... },
  "byArea": [
    { "areaName": "الكرادة", "readings": 12, "bonds": 6, "amount": 380000 }
  ]
}
```

---

## 23. `GET /reports/branch`

Aggregated stats for the whole branch (supervisor-only).
Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
Returns the same shape as `/reports/daily` but aggregated across all collectors in the branch.

---

## 24. `GET /reports/collector`

History for a specific collector across a date range.
Query: `?collectorId=...&from=...&to=...`.
Response includes a `dailyBreakdown[]` array.

---

## 25. `GET /lookup/branches`

Static-ish list of branches (cache for 24 h).
Rows: `id, name, address, supportPhone`.

---

## 26. `GET /lookup/tariffs`

Detailed tariff structures (used by the read-time auto-calc, not visible to user).
Rows: `id, name, breakpoints[{ fromKwh, toKwh, rateIqd }], currency_id, updated_at`.

---

## 27. `GET /lookup/places`

Same as `/sync/pull/places` but **without** the `since` cursor — for one-shot full refresh from Settings.

---

## 28. `GET /health`

Liveness probe. **No auth required.**
Response 200: `{ "status": "ok", "timestamp": 1737000000000 }`.
Used by the connectivity monitor.

---

## 29. `GET /version`

Server build info.
Response 200:
```json
{ "version": "2.4.1", "gitSha": "abc1234", "minClientVersion": "1.0.0" }
```

Client checks `minClientVersion` at boot. If our app version < `minClientVersion`,
show a "تحديث مطلوب" blocking screen.

---

## 30. `POST /device/register`

Called on first launch (before login). Registers device characteristics.

**Body**
```json
{
  "deviceId": "a1b2c3d4e5f6",
  "model": "SM-A125F",
  "androidVersion": "12",
  "appVersion": "1.2.3",
  "isEmulator": false
}
```

**Response 200**
```json
{ "deviceRegistered": true, "knownSinceDays": 0 }
```

---

## 31. `POST /device/heartbeat`

Periodic check-in (every 15 min while app is foreground).

**Body**
```json
{
  "deviceId": "a1b2c3d4e5f6",
  "appVersion": "1.2.3",
  "batteryPct": 78,
  "lastReadingAt": 1737000000000,
  "syncQueueDepth": 0
}
```

Response 204.

---

## Common error codes

| HTTP | Code                       | Meaning                                            |
|------|----------------------------|----------------------------------------------------|
| 400  | `BAD_REQUEST`              | malformed body                                      |
| 400  | `VALIDATION_FAILED`        | field-level error (see body `field`)                |
| 401  | `INVALID_CREDENTIALS`      | login wrong username/password                       |
| 401  | `TOKEN_EXPIRED`            | refresh with `/auth/refresh` (or re-login)          |
| 403  | `ACCOUNT_DISABLED`         | user disabled in admin panel                        |
| 403  | `LICENSE_REQUIRED`         | device not activated                                |
| 403  | `NOT_ALLOWED`              | missing permission                                  |
| 404  | `NOT_FOUND`                | row not found (sync race)                           |
| 409  | `CONFLICT`                 | duplicate `local_uuid`                              |
| 409  | `CODE_ALREADY_USED`        | activation code reuse                               |
| 410  | `CODE_EXPIRED`             | activation code TTL                                 |
| 422  | `BUSINESS_RULE_VIOLATED`   | server-side validation (negative balance, etc.)     |
| 500  | `INTERNAL_ERROR`           | retry with backoff                                  |
| 503  | `MAINTENANCE`              | server in maintenance window; honour `Retry-After`  |

---

## Rate limits

| Endpoint                          | Limit                                  |
|-----------------------------------|----------------------------------------|
| `auth/login`                       | 10 / min / IP                          |
| `license/activate`                 | 5 / hour / device                      |
| `sync/push/*`                      | 30 / min / user                        |
| `device/heartbeat`                 | 1 / 5 min / device                     |
| everything else                    | 60 / min / user                        |

Limit exceeded → `429 RATE_LIMITED` + `Retry-After` header (seconds).

---

## Idempotency

All push endpoints accept an `Idempotency-Key` header (= `local_uuid` for single rows, or `batchId` for batches). If the server sees the same key within 24 h, it returns the **original response** without re-processing — safe to retry on network failure.

---

## Backward compatibility

- The server uses **additive evolution**: new fields are added; existing fields are never removed without a 12-month deprecation cycle.
- The client should **ignore unknown fields** (TypeScript's `as` shouldn't be strict here — use Zod `passthrough()` where applicable).

---

## Sample axios setup (used by Wave 1)

```ts
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { tokenStorage } from '@/services/auth';

export const api = axios.create({
  baseURL: 'http://100.87.131.115:3000/electric',
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (e) => axiosRetry.isNetworkOrIdempotentRequestError(e) || e.response?.status === 503,
});
```
