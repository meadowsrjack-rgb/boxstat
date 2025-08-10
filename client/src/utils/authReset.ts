/**
 * Auth Reset Utility
 * Call this function to clear all authentication storage and reset the app state
 */
export function resetAuthState() {
  try {
    // Clear all local storage
    localStorage.clear();
    
    // Clear all session storage
    sessionStorage.clear();
    
    // Clear any auth-related cookies by setting them to expire
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    console.log("Auth state cleared successfully");
    
    // Reload the page to restart the app
    window.location.reload();
  } catch (error) {
    console.error("Error clearing auth state:", error);
  }
}

// Auto-execute if this script is imported during an auth error
if (typeof window !== 'undefined') {
  // Check for auth error in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth_error') === 'true') {
    console.log("Auth error detected, clearing state...");
    resetAuthState();
  }
}