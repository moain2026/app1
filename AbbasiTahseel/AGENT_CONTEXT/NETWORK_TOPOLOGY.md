# NETWORK_TOPOLOGY — Tailscale + Server Map

> The app only works over Tailscale VPN. This file documents the
> network shape so a new agent doesn't waste time guessing IPs.

## The Tailscale tailnet

The user (`moain2026`) owns a Tailscale tailnet with these nodes:

| Hostname | Tailscale IP | OS | Status | Role |
|---|---|---|---|---|
| `motech` | `100.110.191.9` | Android | ✅ online | User's phone — runs the app under test |
| (unnamed in screenshot) | `100.87.131.115` | Windows Server | ✅ online | **WCF backend** (port 3000) |
| `abbasiyserver` | `100.120.149.26` | Windows | ❌ offline | Old/backup server (do not target) |
| `server.tail1e8010.ts.net` | `100.119.58.61` | Linux | ✅ online | Tailscale Admin / control plane |
| `medpc-2` | `100.100.37.76` | Windows | ✅ online | Another internal host (not the API) |

**The only server the app talks to is `100.87.131.115:3000`.**

## Why Tailscale at all

The customer (`شركة العباسي لتوليد الكهرباء التجارية`) runs the WCF backend
on an internal Windows machine that has **no public IP**. Tailscale gives:

- Mesh VPN so the phone reaches the server from anywhere
- Auto-renewing TLS-ish encryption (WireGuard under the hood)
- No firewall config on the customer's end

The legacy Java app embeds the Tailscale IP directly in
`RestServiceHelper.java` and `_baseUrl`. We replicate that decision in
`src/services/storage/prefs.ts` (`getBaseUrl()` default).

## Default config

In `src/services/storage/prefs.ts`:

```ts
const DEFAULT_BASE_URL = 'http://100.87.131.115:3000/electric/';
const DEFAULT_BRANCH_NUMBER = '1';
```

Both can be overridden by the user in `ServerSettingsScreen` (Wave 3
shipped that screen). Edits persist to MMKV.

## The full URL contract

The Axios baseURL is set lazily from MMKV on every request — see
`src/services/api/httpClient.ts` interceptor. The endpoint path is
relative — `Authenticate` (no slash) is enough; the baseURL provides
the trailing slash.

```
http  ://  100.87.131.115  :  3000  /  electric/  +  Authenticate
↑          ↑                    ↑       ↑              ↑
scheme    host              port    base path    endpoint.path
```

## HTTPS toggle

- **Default:** `http://` (the WCF server runs plain HTTP)
- **Override:** `ServerSettingsScreen` has a toggle that prepends
  `https://` instead. Not used in production yet because the server has
  no cert.
- **Wave 7 TODO:** if customer enables HTTPS, the toggle is the entry
  point; no other code changes needed.

## Why port 3000 specifically

Hard-coded in the legacy Java code in at least three places:

1. `RestServiceHelper.java` — `private static final int PORT = 3000;`
2. `Defence.java` — config string defaults
3. `Constants.java` — `BASE_URL_PORT = "3000"`

This is **NOT a Node.js convention**. The WCF service is configured to
host on port 3000 via its `web.config` `<service>` binding. The user
cannot easily change it without IT-side intervention on the server box.

## Important — `secureId` for this customer

For phone "motech" specifically:
- ANDROID_ID → hex → first 8 chars converted to decimal: should yield
  a 10-digit number
- Legacy app's value (shown in "اعدادات الاتصال" screen): **`2098897319`**
- This is the value to send as `secureId` in `/Login` STAGE 2 body
- It's set automatically by `src/services/security/licenseManager.ts`
  via `getSecureId()` on the same phone
- Override available via `setSecureIdOverride()` if the new agent ever
  needs to test from a different device

## Connectivity preflight

Before any real-server testing, the new agent should ask the user to:

1. Open Tailscale app on the phone → confirm "Connected"
2. Open a browser on the phone → navigate to
   `http://100.87.131.115:3000/electric/` → confirm the WCF Service
   Explorer page loads (Arabic UI)
3. Only THEN open the test APK and try to log in

If the browser test fails:
- Server is down → user must contact IT
- Tailscale not connected → toggle Tailscale on
- Wrong tailnet → check Tailscale account is `moain2026`

## How to debug network issues

In the app:

- **`__DEV__` debug interceptor** in `httpClient.ts` logs every request
  + response with masked sensitive fields. Visible in Android logcat
  filtered to tag `ReactNativeJS`.
- **`lastLoginError`** in `useAuthStore` exposes the last failed
  attempt to the LoginScreen UI (raw response body + status + URL).
- **`ServerSettingsScreen`** has a "Test Connection" button (Wave 3) —
  fires `GET /electric/` and reports HTTP status.

## DO NOT

- Hardcode IPs anywhere outside `prefs.ts` defaults. Read from MMKV.
- Strip the `__DEV__` debug interceptor. The user relies on it.
- Test against the dev server with production credentials by default —
  use the Dev Bypass path (`dev`/`0000`) for offline testing.
