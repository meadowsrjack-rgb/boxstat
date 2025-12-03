import { useQuery } from "@tanstack/react-query";
import { Capacitor } from '@capacitor/core';

// API base URL - use production backend when running in Capacitor native app
const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://boxstat.app' 
  : '';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // Get JWT token from localStorage (for mobile/JWT auth)
      const token = localStorage.getItem('authToken');
      console.log("🔑 useAuth: Token from localStorage:", token ? token.substring(0, 20) + "..." : "NULL");
      
      // Build headers
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("✅ useAuth: Added Authorization header");
      } else {
        console.log("⚠️ useAuth: No token, using cookies only");
      }
      
      const url = `${API_BASE_URL}/api/auth/user`;
      console.log("📡 useAuth: Fetching from:", url);
      
      const res = await fetch(url, {
        headers,
        credentials: "include",
      });
      
      console.log("📥 useAuth: Response status:", res.status);
      
      if (res.status === 401) {
        console.log("🚫 useAuth: Not authenticated (401)");
        return null;
      }
      if (!res.ok) {
        console.error("❌ useAuth: Fetch failed with status:", res.status);
        throw new Error("Failed to fetch user");
      }
      const userData = await res.json();
      console.log("👤 useAuth: User data received:", userData?.email);
      return userData;
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
