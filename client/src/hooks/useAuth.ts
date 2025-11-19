import { useQuery } from "@tanstack/react-query";
import { logout as performLogout } from "@/utils/logout";
import { Capacitor } from '@capacitor/core';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // Build headers with JWT token if available (for Capacitor)
      const headers: HeadersInit = {};
      if (Capacitor.isNativePlatform()) {
        const token = localStorage.getItem('authToken');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      // Determine the API base URL
      const apiBaseUrl = Capacitor.isNativePlatform() 
        ? 'https://boxstat.replit.app' 
        : '';
      
      const res = await fetch(`${apiBaseUrl}/api/auth/user`, {
        credentials: "include",
        headers,
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
    performLogout();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
