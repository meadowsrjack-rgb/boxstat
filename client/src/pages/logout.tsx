import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export default function Logout() {
  useEffect(() => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => {
        queryClient.clear();
        window.location.href = '/';
      })
      .catch(() => {
        window.location.href = '/';
      });
  }, []);

  return (
    <>
      {/* FIX: DETACHED BACKGROUND LAYER - never moves with keyboard */}
      <div className="fixed inset-0 w-full h-full bg-gray-50 z-0 pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="ios-fixed-page relative z-10 w-full h-full bg-transparent overscroll-none flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Logging out...</p>
        </div>
      </div>
    </>
  );
}
