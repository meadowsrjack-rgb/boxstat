import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';

// Helper to check if native storage is available
function isNativeStorageAvailable(): boolean {
  try {
    const isNative = Capacitor.isNativePlatform();
    const hasPreferences = typeof Preferences !== 'undefined' && typeof Preferences.set === 'function';
    return isNative && hasPreferences;
  } catch {
    return false;
  }
}

export const authPersistence = {
  async setToken(token: string): Promise<void> {
    const useNative = isNativeStorageAvailable();
    console.log(`🔐 AuthPersistence.setToken - Native storage available: ${useNative}, Token length: ${token?.length}`);
    
    // Always save to localStorage first (immediate, synchronous)
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    console.log('✅ AuthPersistence: Token saved to localStorage');
    
    // Then save to native Preferences (async, for persistence across app restarts)
    if (useNative) {
      try {
        await Preferences.set({ key: AUTH_TOKEN_KEY, value: token });
        console.log('✅ AuthPersistence: Token saved to native Preferences');
        
        // Verify the save worked
        const verify = await Preferences.get({ key: AUTH_TOKEN_KEY });
        if (verify.value) {
          console.log('🔍 AuthPersistence: Verification PASSED - Token persisted to native storage');
        } else {
          console.error('❌ AuthPersistence: Verification FAILED - Token not in native storage after save!');
        }
      } catch (error) {
        console.error('❌ AuthPersistence: Failed to save to native Preferences:', error);
      }
    }
  },

  async getToken(): Promise<string | null> {
    const useNative = isNativeStorageAvailable();
    console.log(`🔐 AuthPersistence.getToken - Native storage available: ${useNative}`);
    
    // First, check native Preferences (most reliable for iOS app restarts)
    if (useNative) {
      try {
        const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
        console.log('🔍 AuthPersistence: Native token exists?', value ? 'YES' : 'NO');
        if (value) {
          // Sync to localStorage for consistency
          localStorage.setItem(AUTH_TOKEN_KEY, value);
          return value;
        }
      } catch (error) {
        console.error('❌ AuthPersistence: Failed to get from native Preferences:', error);
      }
    }
    
    // Fallback to localStorage (works for web and as cache)
    const localToken = localStorage.getItem(AUTH_TOKEN_KEY);
    console.log('🔍 AuthPersistence: localStorage token exists?', localToken ? 'YES' : 'NO');
    
    // If we found a token in localStorage but not in native storage, sync it back
    if (localToken && useNative) {
      try {
        console.log('🔄 AuthPersistence: Syncing localStorage token to native Preferences');
        await Preferences.set({ key: AUTH_TOKEN_KEY, value: localToken });
      } catch (error) {
        console.error('❌ AuthPersistence: Failed to sync to native:', error);
      }
    }
    
    return localToken;
  },

  async removeToken(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: AUTH_TOKEN_KEY });
      console.log('🔐 AuthPersistence: Token removed from native storage');
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  async setUserData(userData: object): Promise<void> {
    const serialized = JSON.stringify(userData);
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: USER_DATA_KEY, value: serialized });
    }
    localStorage.setItem(USER_DATA_KEY, serialized);
  },

  async getUserData(): Promise<object | null> {
    let value: string | null = null;
    
    if (Capacitor.isNativePlatform()) {
      const result = await Preferences.get({ key: USER_DATA_KEY });
      value = result.value;
    }
    
    if (!value) {
      value = localStorage.getItem(USER_DATA_KEY);
    }
    
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return null;
  },

  async clearAll(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: AUTH_TOKEN_KEY });
      await Preferences.remove({ key: USER_DATA_KEY });
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  },

  async restoreToLocalStorage(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    
    console.log('🔄 AuthPersistence: Restoring session from native storage...');
    
    const { value: token } = await Preferences.get({ key: AUTH_TOKEN_KEY });
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      console.log('✅ AuthPersistence: Token restored to localStorage');
      return true;
    }
    
    console.log('ℹ️ AuthPersistence: No saved session found');
    return false;
  }
};
