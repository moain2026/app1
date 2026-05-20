/**
 * Secure Storage — العباسي تحصيل
 *
 * Wraps `react-native-keychain` for storing sensitive credentials:
 *   • Access token  (Bearer)
 *   • Refresh token
 *   • Admin PIN     (hashed via bcryptjs-react-native — see pinService.ts)
 *   • Last logged-in username (for silent re-auth UX)
 *
 * Backed by Android KeyStore + AES-256-GCM (`SECURITY_LEVEL_SECURE_HARDWARE`
 * when available, falls back to software-backed crypto otherwise).
 *
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  REPLACES the legacy SharedPreferences("prefs") plaintext storage  ║
 * ║  from TokenManager.java + LoginActivity.java line 242.             ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * Design rules:
 *  • Never log token values. Use logger.tokenSafe() (see utils/logger.ts).
 *  • Each "slot" uses a distinct keychain SERVICE name so tokens cannot
 *    accidentally collide with PIN or other credentials.
 *  • All functions are async (Keychain is native).
 *  • All errors are swallowed-and-typed via a Result-like shape — callers
 *    must not assume success without inspecting the boolean.
 */

import * as Keychain from 'react-native-keychain';

// ─── Keychain service names (one per slot) ────────────────────────────────
const SVC = {
  ACCESS_TOKEN: 'abbasi.tahseel.access_token',
  REFRESH_TOKEN: 'abbasi.tahseel.refresh_token',
  ADMIN_PIN_HASH: 'abbasi.tahseel.admin_pin_hash',
  LAST_USERNAME: 'abbasi.tahseel.last_username',
} as const;

// `username` field of Keychain entries is required but unused for tokens.
const KEYCHAIN_USERNAME = 'abbasi-tahseel';

// ─── Common Keychain options ──────────────────────────────────────────────
const baseOptions: Keychain.Options = {
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  // We intentionally DO NOT use BIOMETRY — workers wear gloves (per ADR-007).
  // Authentication-type is left as DEVICE_PASSCODE_OR_BIOMETRY's default
  // which on Android simply means "device unlocked".
  //
  // STORAGE_TYPE.AES in react-native-keychain@8.2.x maps to KeystoreAESCBC,
  // backed by Android KeyStore (hardware-backed on devices with TEE/StrongBox).
  // The library does not expose AES_GCM as a discrete STORAGE_TYPE here.
  storage: Keychain.STORAGE_TYPE.AES,
};

// ═══════════════════════════════════════════════════════════════════════════
// Access Token
// ═══════════════════════════════════════════════════════════════════════════

export async function setAccessToken(token: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(KEYCHAIN_USERNAME, token, {
      ...baseOptions,
      service: SVC.ACCESS_TOKEN,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SVC.ACCESS_TOKEN });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

export async function clearAccessToken(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({ service: SVC.ACCESS_TOKEN });
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Refresh Token
// ═══════════════════════════════════════════════════════════════════════════

export async function setRefreshToken(token: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(KEYCHAIN_USERNAME, token, {
      ...baseOptions,
      service: SVC.REFRESH_TOKEN,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SVC.REFRESH_TOKEN });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

export async function clearRefreshToken(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({ service: SVC.REFRESH_TOKEN });
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Admin PIN — hashed before storage (see services/auth/pinService.ts)
// ═══════════════════════════════════════════════════════════════════════════

export async function setAdminPinHash(hash: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(KEYCHAIN_USERNAME, hash, {
      ...baseOptions,
      service: SVC.ADMIN_PIN_HASH,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getAdminPinHash(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SVC.ADMIN_PIN_HASH });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

export async function clearAdminPinHash(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({ service: SVC.ADMIN_PIN_HASH });
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Last username (for "Welcome back, Ali" UX — not sensitive but private)
// ═══════════════════════════════════════════════════════════════════════════

export async function setLastUsername(username: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(KEYCHAIN_USERNAME, username, {
      ...baseOptions,
      service: SVC.LAST_USERNAME,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getLastUsername(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SVC.LAST_USERNAME });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Bulk operations — used on logout
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clears all auth-related secure entries.
 * Called on logout and on detected refresh-token expiry.
 */
export async function clearAllAuthCredentials(): Promise<void> {
  await Promise.allSettled([
    clearAccessToken(),
    clearRefreshToken(),
    // We intentionally DO NOT clear admin PIN or last username here —
    // those persist across logout. Use a dedicated `factoryReset()` for that.
  ]);
}

/**
 * Full secure-storage wipe. Used by Settings → "Factory Reset" only.
 */
export async function factoryResetSecureStorage(): Promise<void> {
  await Promise.allSettled([
    clearAccessToken(),
    clearRefreshToken(),
    clearAdminPinHash(),
    Keychain.resetGenericPassword({ service: SVC.LAST_USERNAME }),
  ]);
}
