import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1, // Retry once if failed
    refetchOnWindowFocus: true, // Refetch when window gets focus (after auth redirect)
    refetchOnMount: true, // Always refetch on mount
    staleTime: 0, // Always consider data stale to refetch
  });

  console.log("useAuth - user:", user);
  console.log("useAuth - isLoading:", isLoading);
  console.log("useAuth - isAuthenticated:", !!user);

  const logout = async () => {
    window.location.href = "/api/logout";
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
