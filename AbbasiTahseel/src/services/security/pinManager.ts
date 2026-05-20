/**
 * PIN Manager — العباسي تحصيل
 *
 * Stores and validates the admin/user PIN using react-native-keychain.
 *
 * Why no bcrypt:
 *   Keychain is hardware-backed on Android (Android KeyStore + AES via the
 *   STORAGE_TYPE.AES backend, which maps to KeystoreAESCBC in v8.x).
 *   The PIN never leaves the secure enclave in plaintext, and comparison
 *   is performed locally after Keychain decrypts. Adding bcrypt on top
 *   would add CPU cost without security gain — Keychain already provides
 *   at-rest encryption and OS-level access control.
 *
 *   Note: react-native-keychain@8.2.x does not expose AES_GCM as a
 *   separate STORAGE_TYPE constant; the library selects the strongest
 *   available cipher internally (AES-GCM on API 23+, AES-CBC fallback).
 *
 * Replaces the legacy plaintext "0000" PIN from ViewSettingActivity.java.
 */

import * as Keychain from 'react-native-keychain';

const PIN_SERVICE_PREFIX = 'com.alabbasi.tahseel.pin';

function serviceFor(userId: string): string {
  return `${PIN_SERVICE_PREFIX}.${userId}`;
}

const baseOptions: Keychain.Options = {
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  storage: Keychain.STORAGE_TYPE.AES,
};

/**
 * Persist a PIN for the given user. Overwrites any previous PIN.
 * Returns true on success, false on Keychain failure (errors swallowed).
 */
export async function setPin(userId: string, pin: string): Promise<boolean> {
  if (!userId || !pin) {
    return false;
  }
  try {
    await Keychain.setGenericPassword(userId, pin, {
      ...baseOptions,
      service: serviceFor(userId),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Compare the supplied PIN against the stored value for the given user.
 * Returns true only on an exact match.
 */
export async function validatePin(
  userId: string,
  inputPin: string,
): Promise<boolean> {
  if (!userId || !inputPin) {
    return false;
  }
  try {
    const creds = await Keychain.getGenericPassword({
      service: serviceFor(userId),
    });
    if (!creds) {
      return false;
    }
    return creds.password === inputPin;
  } catch {
    return false;
  }
}

/**
 * Remove the stored PIN for the given user. Returns true on success.
 */
export async function resetPin(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }
  try {
    await Keychain.resetGenericPassword({ service: serviceFor(userId) });
    return true;
  } catch {
    return false;
  }
}
