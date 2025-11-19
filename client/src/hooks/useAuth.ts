import { useQuery } from "@tanstack/react-query";
import { Capacitor } from '@capacitor/core';

// API base URL - use production backend when running in Capacitor native app
const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://boxstat.replit.app' 
  : '';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // Get JWT token from localStorage (for mobile/JWT auth)
      const token = localStorage.getItem('authToken');
      
      // Build headers
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_BASE_URL}/api/auth/user`, {
        headers,
        credentials: "include",
      });
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      return await res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
  });

  const logout = async () => {
    // Clear JWT token from localStorage
    localStorage.removeItem('authToken');
    window.location.href = "/api/logout";
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
