/**
 * License Store — العباسي تحصيل
 *
 * Wraps `services/security/licenseManager` in a Zustand store so the
 * RootNavigator can subscribe to license state changes reactively.
 *
 * Lifecycle:
 *   1. App boot → `check()` is invoked from RootNavigator/Splash.
 *      This loads the device ID and verifies any persisted key.
 *   2. If `isLicensed === false`, the user lands on LicenseActivation.
 *   3. After successful `activate(key)`, the navigator switches to Login.
 */

import { create } from 'zustand';

import {
  generateDeviceId,
  getStoredLicense,
  isLicensed as isLicensedCheck,
  resetLicense as resetLicenseCall,
  saveLicense,
  validateLicense,
} from '@/services/security/licenseManager';

export interface LicenseState {
  isLicensed: boolean;
  licenseKey: string | null;
  deviceId: string | null;
  isLoading: boolean;
  /** i18n key OR raw error string. */
  error: string | null;

  // Actions
  /** Validates + persists a key. Returns true on success. */
  activate(key: string): Promise<boolean>;
  /** Loads device ID + existing license; sets isLicensed accordingly. */
  check(): Promise<void>;
  /** Wipes the persisted key. */
  reset(): Promise<boolean>;
  clearError(): void;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  isLicensed: false,
  licenseKey: null,
  deviceId: null,
  isLoading: false,
  error: null,

  async activate(key) {
    const trimmed = (key ?? '').trim();
    if (trimmed.length === 0) {
      set({ error: 'auth.license.invalidKey' });
      return false;
    }

    set({ isLoading: true, error: null });

    // Ensure deviceId is loaded.
    let deviceId = get().deviceId;
    if (!deviceId) {
      deviceId = await generateDeviceId();
    }

    if (!validateLicense(trimmed, deviceId)) {
      set({ isLoading: false, error: 'auth.license.invalidKey', deviceId });
      return false;
    }

    const saved = await saveLicense(trimmed);
    if (!saved) {
      set({ isLoading: false, error: 'auth.license.saveFailed', deviceId });
      return false;
    }

    set({
      isLicensed: true,
      licenseKey: trimmed.toUpperCase(),
      deviceId,
      isLoading: false,
      error: null,
    });
    return true;
  },

  async check() {
    set({ isLoading: true, error: null });
    const deviceId = await generateDeviceId();
    const [licensed, stored] = await Promise.all([
      isLicensedCheck(),
      getStoredLicense(),
    ]);

    set({
      deviceId,
      isLicensed: licensed,
      licenseKey: licensed ? stored : null,
      isLoading: false,
    });
  },

  async reset() {
    const ok = await resetLicenseCall();
    if (ok) {
      set({ isLicensed: false, licenseKey: null, error: null });
    }
    return ok;
  },

  clearError() {
    set({ error: null });
  },
}));
