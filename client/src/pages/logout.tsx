import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { BanterLoader } from "@/components/BanterLoader";

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
      {/* iOS FULL BLEED - extends into all safe areas to prevent white gaps */}
      <div className="ios-full-bleed" />
      
      {/* DETACHED BACKGROUND LAYER - never moves with keyboard */}
      <div className="fixed inset-0 w-full h-full bg-black z-0 pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="ios-fixed-page relative z-10 w-full bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center">
          <BanterLoader />
          <p className="mt-6 text-white">Logging out...</p>
        </div>
      </div>
    </>
  );
}
