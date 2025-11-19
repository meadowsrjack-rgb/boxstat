import { clearAuthToken } from "@/lib/queryClient";

export function logout() {
  // Clear JWT token for Capacitor apps
  clearAuthToken();
  // Redirect to logout endpoint to clear session
  window.location.href = "/api/logout";
}
