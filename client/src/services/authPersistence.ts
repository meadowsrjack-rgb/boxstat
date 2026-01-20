import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';

export const authPersistence = {
  async setToken(token: string): Promise<void> {
    const isNative = Capacitor.isNativePlatform();
    console.log(`🔐 AuthPersistence.setToken called - Native: ${isNative}, Token length: ${token?.length}`);
    
    if (isNative) {
      try {
        await Preferences.set({ key: AUTH_TOKEN_KEY, value: token });
        console.log('✅ AuthPersistence: Token saved to native Preferences');
        
        // Verify the save worked
        const verify = await Preferences.get({ key: AUTH_TOKEN_KEY });
        console.log('🔍 AuthPersistence: Verification - Token saved?', verify.value ? 'YES' : 'NO');
      } catch (error) {
        console.error('❌ AuthPersistence: Failed to save to native Preferences:', error);
      }
    }
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    console.log('✅ AuthPersistence: Token saved to localStorage');
  },

  async getToken(): Promise<string | null> {
    const isNative = Capacitor.isNativePlatform();
    console.log(`🔐 AuthPersistence.getToken called - Native: ${isNative}`);
    
    if (isNative) {
      try {
        const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
        console.log('🔍 AuthPersistence: Native token exists?', value ? 'YES' : 'NO');
        if (value) {
          localStorage.setItem(AUTH_TOKEN_KEY, value);
          return value;
        }
      } catch (error) {
        console.error('❌ AuthPersistence: Failed to get from native Preferences:', error);
      }
    }
    
    const localToken = localStorage.getItem(AUTH_TOKEN_KEY);
    console.log('🔍 AuthPersistence: localStorage token exists?', localToken ? 'YES' : 'NO');
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
