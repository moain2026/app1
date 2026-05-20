/**
 * License Manager — العباسي تحصيل
 *
 * Replaces the legacy Defence XOR scheme (per ADR-004) with a SHA-256-based
 * derivation. The new design:
 *
 *   1. Device ID is obtained from `react-native-device-info` (Android ID
 *      on Android — stable across app reinstalls until factory reset).
 *
 *   2. License key is derived as:
 *        rawHash    = SHA-256(deviceId + SECRET_SALT)
 *        keyBody    = first 16 hex chars of rawHash, uppercased
 *        checksum   = SHA-256(keyBody + SECRET_SALT) → first 4 hex chars
 *        finalKey   = keyBody + "-" + checksum
 *      e.g. "9F3A1C8E22B704D6-A1B2"
 *
 *   3. Validation is purely LOCAL:
 *        • Recompute keyBody from the device ID.
 *        • Recompute checksum from the supplied keyBody.
 *        • Compare both halves verbatim.
 *      No network call. The admin who issues the key runs the same
 *      derivation off-device.
 *
 *   4. Persistence uses Keychain with a dedicated service name distinct
 *      from auth tokens (`com.alabbasi.tahseel.license`).
 *
 * SECRET_SALT note:
 *   The salt below is shared between this app and the license-issuing tool.
 *   It is NOT a cryptographic secret in the strict sense — anyone with the
 *   APK can extract it. The scheme protects against casual key sharing
 *   (one key is only valid for one device ID), not against a determined
 *   reverse-engineer. This is consistent with the legacy Defence XOR
 *   protection model — see ADR-004.
 *
 * Implementation note — SHA-256:
 *   We ship a small pure-JS SHA-256 implementation rather than pull in an
 *   extra native module. The hash is computed at most twice per activation
 *   flow, so performance is irrelevant.
 */

import DeviceInfo from 'react-native-device-info';
import * as Keychain from 'react-native-keychain';

import { getSecureIdOverride } from '@/services/storage/prefs';

// ─── Keychain configuration ───────────────────────────────────────────────
const LICENSE_SERVICE = 'com.alabbasi.tahseel.license';
const LICENSE_USERNAME = 'license';

const KEYCHAIN_OPTIONS: Keychain.Options = {
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  storage: Keychain.STORAGE_TYPE.AES,
};

// ─── Shared salt (see file header — NOT a true cryptographic secret) ──────
const SECRET_SALT = 'AbbasiTahseel::v1::salt::8f2c7d4a9b3e1f6c';

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns a stable, per-device identifier.
 *
 * On Android this is `Settings.Secure.ANDROID_ID` — a 64-bit value scoped
 * to the signing key + user + device. It changes only on factory reset.
 *
 * Throws no exceptions: on failure returns a deterministic fallback string
 * so the license flow can still proceed (the issued key will simply not
 * survive reinstall in that pathological case).
 */
export async function generateDeviceId(): Promise<string> {
  try {
    const id = await DeviceInfo.getUniqueId();
    if (id && id.length > 0) {
      return id;
    }
  } catch {
    // fall through
  }
  // Last-resort fallback — DeviceInfo should never fail on Android.
  return 'unknown-device';
}

/**
 * Compute the LEGACY-compatible secureId.
 *
 * Mirrors `com.yd.electricecollector.Defence.getDeviceId()` of the legacy
 * Java app, which is what the backend has registered for existing users:
 *
 *   Long.toString(
 *     Long.parseLong(
 *       Settings.Secure.getString(ctx, "android_id").substring(0, 8),
 *       16
 *     )
 *   )
 *
 * In plain English:
 *   1. Take the device ANDROID_ID (a 16-hex-char string like
 *      "9993a14105fc49aa").
 *   2. Slice the first 8 hex chars ("9993a141").
 *   3. Parse those as a base-16 integer (= 2576949569).
 *   4. Convert back to a decimal string ("2576949569") — a 10-digit number.
 *
 * Returns 'unknown-device' on failure so the call chain never throws.
 */
export async function getLegacySecureId(): Promise<string> {
  try {
    const raw = await DeviceInfo.getUniqueId();
    if (!raw || raw.length < 8) {
      return 'unknown-device';
    }
    // Strip any prefix like "android-" and non-hex chars defensively.
    const hex = raw.replace(/[^0-9a-fA-F]/g, '');
    const first8 = hex.slice(0, 8);
    if (first8.length !== 8) {
      return 'unknown-device';
    }
    // Number.MAX_SAFE_INTEGER is 9_007_199_254_740_992 (~16 hex digits) so
    // 8-hex-digit values fit comfortably without precision loss.
    const decimal = parseInt(first8, 16);
    if (!Number.isFinite(decimal)) {
      return 'unknown-device';
    }
    return decimal.toString(10);
  } catch {
    return 'unknown-device';
  }
}

/**
 * Resolves the secureId value used by /Login.
 *
 * Resolution order:
 *   1. Manual override saved in ServerSettings (`getSecureIdOverride()`),
 *      if non-empty — used verbatim (no normalization). This lets the
 *      operator paste the exact value the legacy device used so the
 *      server-side record continues to match.
 *   2. Auto-computed legacy-compatible value (`getLegacySecureId()`).
 */
export async function getSecureId(): Promise<string> {
  const override = getSecureIdOverride();
  if (override.length > 0) {
    return override;
  }
  return getLegacySecureId();
}

/**
 * Derives the license key for a given device ID.
 *
 * The same function MUST be runnable on the license-issuing tool so the
 * issued key matches what the device computes locally during validation.
 */
export function generateLicenseKey(deviceId: string): string {
  const trimmedId = (deviceId ?? '').trim();
  if (trimmedId.length === 0) {
    throw new Error('generateLicenseKey: deviceId is empty');
  }

  const fullHash = sha256Hex(trimmedId + SECRET_SALT);
  const keyBody = fullHash.slice(0, 16).toUpperCase();
  const checksum = sha256Hex(keyBody + SECRET_SALT).slice(0, 4).toUpperCase();
  return `${keyBody}-${checksum}`;
}

/**
 * Validates that the supplied key matches the expected one for the device.
 *
 * Steps:
 *   1. Normalize input (trim, upper-case).
 *   2. Recompute the expected key with `generateLicenseKey`.
 *   3. Compare verbatim.
 *
 * Returns false on any mismatch or malformed input — never throws.
 */
export function validateLicense(key: string, deviceId: string): boolean {
  const normalized = (key ?? '').trim().toUpperCase();
  if (normalized.length === 0 || (deviceId ?? '').length === 0) {
    return false;
  }
  try {
    const expected = generateLicenseKey(deviceId);
    return normalized === expected;
  } catch {
    return false;
  }
}

/**
 * Persists the validated license key in Keychain.
 * Returns true on success, false on Keychain failure (errors swallowed).
 */
export async function saveLicense(key: string): Promise<boolean> {
  const normalized = (key ?? '').trim().toUpperCase();
  if (normalized.length === 0) {
    return false;
  }
  try {
    await Keychain.setGenericPassword(LICENSE_USERNAME, normalized, {
      ...KEYCHAIN_OPTIONS,
      service: LICENSE_SERVICE,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the persisted license key (if any).
 */
export async function getStoredLicense(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: LICENSE_SERVICE });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

/**
 * Returns true iff a valid (key, device) pair is currently persisted.
 *
 * We re-validate the stored key against the current device ID so that an
 * APK side-loaded with a transferred Keychain (rare but possible on rooted
 * devices) cannot bypass licensing.
 */
export async function isLicensed(): Promise<boolean> {
  const stored = await getStoredLicense();
  if (!stored) {
    return false;
  }
  const deviceId = await generateDeviceId();
  return validateLicense(stored, deviceId);
}

/**
 * Removes the persisted license. Used by Settings → Factory Reset.
 */
export async function resetLicense(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({ service: LICENSE_SERVICE });
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal — SHA-256 implementation (pure JS, no native dependency)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns the SHA-256 hash of the input UTF-8 string as a lowercase hex
 * string of length 64.
 *
 * The implementation follows FIPS 180-4 §6.2.2 directly. No external
 * library — the algorithm is stable, simple, and runs in microseconds for
 * the short inputs used by the license flow.
 */
function sha256Hex(input: string): string {
  const bytes = utf8Encode(input);
  const hash = sha256Bytes(bytes);
  return toHex(hash);
}

/** Encode a JS string to a UTF-8 byte array. */
function utf8Encode(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      // Surrogate pair → code point
      const low = str.charCodeAt(i + 1);
      const cp = 0x10000 + (((c & 0x3ff) << 10) | (low & 0x3ff));
      i++;
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return Uint8Array.from(out);
}

/** Hex-encode a byte array (lowercase). */
function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] ?? 0;
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function sha256Bytes(data: Uint8Array): Uint8Array {
  // ─── Pad message ──────────────────────────────────────────────────────
  const bitLen = data.length * 8;
  const padLen = (data.length + 9 + 63) & ~63; // multiple of 64
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;
  // 64-bit big-endian length at the tail
  // Top 32 bits — input is well under 2^32 bits in practice
  padded[padLen - 4] = (bitLen >>> 24) & 0xff;
  padded[padLen - 3] = (bitLen >>> 16) & 0xff;
  padded[padLen - 2] = (bitLen >>> 8) & 0xff;
  padded[padLen - 1] = bitLen & 0xff;

  // ─── Initial hash values ──────────────────────────────────────────────
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const W = new Uint32Array(64);

  // ─── Process each 512-bit block ───────────────────────────────────────
  for (let block = 0; block < padLen; block += 64) {
    for (let i = 0; i < 16; i++) {
      const j = block + i * 4;
      W[i] =
        (((padded[j] ?? 0) << 24) |
          ((padded[j + 1] ?? 0) << 16) |
          ((padded[j + 2] ?? 0) << 8) |
          (padded[j + 3] ?? 0)) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const w15 = W[i - 15] ?? 0;
      const w2 = W[i - 2] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      W[i] = ((W[i - 16] ?? 0) + s0 + (W[i - 7] ?? 0) + s1) >>> 0;
    }

    let a = H[0] ?? 0;
    let b = H[1] ?? 0;
    let c = H[2] ?? 0;
    let d = H[3] ?? 0;
    let e = H[4] ?? 0;
    let f = H[5] ?? 0;
    let g = H[6] ?? 0;
    let h = H[7] ?? 0;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + (K[i] ?? 0) + (W[i] ?? 0)) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = ((H[0] ?? 0) + a) >>> 0;
    H[1] = ((H[1] ?? 0) + b) >>> 0;
    H[2] = ((H[2] ?? 0) + c) >>> 0;
    H[3] = ((H[3] ?? 0) + d) >>> 0;
    H[4] = ((H[4] ?? 0) + e) >>> 0;
    H[5] = ((H[5] ?? 0) + f) >>> 0;
    H[6] = ((H[6] ?? 0) + g) >>> 0;
    H[7] = ((H[7] ?? 0) + h) >>> 0;
  }

  // ─── Emit hash as 32 bytes (big-endian) ──────────────────────────────
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    const v = H[i] ?? 0;
    out[i * 4] = (v >>> 24) & 0xff;
    out[i * 4 + 1] = (v >>> 16) & 0xff;
    out[i * 4 + 2] = (v >>> 8) & 0xff;
    out[i * 4 + 3] = v & 0xff;
  }
  return out;
}
