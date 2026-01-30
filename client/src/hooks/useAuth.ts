import { useQuery } from "@tanstack/react-query";
import { Capacitor } from '@capacitor/core';
import { authPersistence } from "@/services/authPersistence";

// API base URL - use production backend when running in Capacitor native app
const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://boxstat.app' 
  : '';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // Restore token from native storage first (for iOS app restarts)
      const token = await authPersistence.getToken();
      console.log("🔑 useAuth: Token from storage:", token ? token.substring(0, 20) + "..." : "NULL");
      
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
    refetchOnWindowFocus: true, // Refetch user data when window regains focus to detect role changes
    refetchOnMount: true,
    staleTime: 30000, // Consider data fresh for 30 seconds to avoid excessive refetches
  });

  const logout = async () => {
    // Clear JWT token from native and local storage
    await authPersistence.clearAll();
    window.location.href = "/api/logout";
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
