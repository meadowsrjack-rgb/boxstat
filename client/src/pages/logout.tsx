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
    <div className="min-h-screen-safe bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p>Logging out...</p>
      </div>
    </div>
  );
}
