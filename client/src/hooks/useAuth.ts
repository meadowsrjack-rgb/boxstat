import { useQuery } from "@tanstack/react-query";
import { Capacitor } from '@capacitor/core';
import { authPersistence } from "@/services/authPersistence";

const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://boxstat.app' 
  : '';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = await authPersistence.getToken();
      
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const url = `${API_BASE_URL}/api/auth/user`;
      
      const controller = new AbortController();
      const fetchTimeoutId = setTimeout(() => {
        controller.abort();
      }, 5000);

      let res: Response;
      try {
        res = await fetch(url, {
          headers,
          credentials: "include",
          signal: controller.signal,
        });
      } catch (networkError) {
        return null;
      } finally {
        clearTimeout(fetchTimeoutId);
      }
      
      if (res.status === 401) {
        await authPersistence.clearAll();
        return null;
      }
      if (!res.ok) {
        return null;
      }
      try {
        const userData = await res.json();
        return userData ?? null;
      } catch (jsonError) {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 30000,
  });

  const logout = async () => {
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
