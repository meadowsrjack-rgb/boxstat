import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'coach' | 'player' | 'parent';
  organizationId?: string;
  teamId?: number;
  profileImageUrl?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

class AuthService {
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  async saveUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  }

  async getUser(): Promise<User | null> {
    const userData = await SecureStore.getItemAsync(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  async removeUser(): Promise<void> {
    await SecureStore.deleteItemAsync(USER_KEY);
  }

  async login(email: string, password: string): Promise<User> {
    const response = await api.auth.login(email, password) as any;
    
    if (response.user) {
      await this.saveUser(response.user);
      if (response.token) {
        await this.saveToken(response.token);
      }
      return response.user;
    }
    
    throw new Error('Login failed');
  }

  async logout(): Promise<void> {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await this.removeToken();
      await this.removeUser();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.auth.getCurrentUser() as any;
      if (response.user) {
        await this.saveUser(response.user);
        return response.user;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  async getAuthState(): Promise<AuthState> {
    const token = await this.getToken();
    const user = await this.getUser();
    
    return {
      isAuthenticated: !!token && !!user,
      user,
      token,
    };
  }
}

export const authService = new AuthService();
export default authService;
