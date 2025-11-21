import Constants from 'expo-constants';

// Get API base URL from environment or use default
const getApiBaseUrl = (): string => {
  // Check for explicit API URL in environment
  const envApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (envApiUrl) {
    return envApiUrl;
  }

  // In development, try to connect to local backend
  if (__DEV__) {
    // For iOS simulator
    if (Constants.platform?.ios) {
      return 'http://localhost:5000';
    }
    // For Android emulator (10.0.2.2 is the special alias to host machine)
    if (Constants.platform?.android) {
      return 'http://10.0.2.2:5000';
    }
    // For web or other platforms
    return 'http://localhost:5000';
  }

  // In production, use the production URL
  return 'https://boxstat.replit.app';
};

export const API_BASE_URL = getApiBaseUrl();

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options;

    // Build URL with query parameters
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    // Default headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include', // Important for session cookies
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return {} as T;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export typed API methods for common use cases
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/api/auth/login', { email, password }),
    logout: () => apiClient.post('/api/auth/logout'),
    getCurrentUser: () => apiClient.get('/api/auth/me'),
  },
  
  // User endpoints
  users: {
    getProfile: (userId: string) => apiClient.get(`/api/users/${userId}`),
    updateProfile: (userId: string, data: unknown) =>
      apiClient.patch(`/api/users/${userId}`, data),
  },

  // Events endpoints
  events: {
    getAll: (params?: Record<string, string>) =>
      apiClient.get('/api/events', { params }),
    getById: (eventId: number) => apiClient.get(`/api/events/${eventId}`),
    checkIn: (eventId: number, data: unknown) =>
      apiClient.post(`/api/events/${eventId}/check-in`, data),
  },

  // Teams endpoints
  teams: {
    getAll: () => apiClient.get('/api/teams'),
    getById: (teamId: number) => apiClient.get(`/api/teams/${teamId}`),
    getRoster: (teamId: number) => apiClient.get(`/api/teams/${teamId}/roster`),
  },
};

export default apiClient;
