import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import lightThemeLogo from "@assets/light_1773300199014.png";

const APP_STORE_URL = "https://apps.apple.com/us/app/boxstat/id6754899159";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.boxstat.app&hl=en_US";
const DISMISS_AT_KEY = "boxstat_app_download_dismissed_at";
const LEGACY_DISMISS_KEY = "boxstat_app_download_dismissed";
const SNOOZE_MS = 10 * 60 * 1000; // 10 minutes

function getMobilePlatform(): "ios" | "android" | null {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

function isCapacitorNative(): boolean {
  return (
    typeof (window as any).Capacitor !== "undefined" &&
    (window as any).Capacitor.isNativePlatform?.()
  );
}

function isSnoozed(): boolean {
  try {
    if (localStorage.getItem(LEGACY_DISMISS_KEY)) {
      localStorage.removeItem(LEGACY_DISMISS_KEY);
      const now = Date.now();
      localStorage.setItem(DISMISS_AT_KEY, String(now));
      return true;
    }
    const raw = localStorage.getItem(DISMISS_AT_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snoozeNow() {
  try {
    localStorage.setItem(DISMISS_AT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

let activeOwnerId: string | null = null;
const ownershipListeners = new Set<() => void>();

function notifyOwnershipListeners() {
  ownershipListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore
    }
  });
}

export default function OpenBoxStatPrompt() {
  const idRef = useRef<string>(
    Math.random().toString(36).slice(2) + Date.now().toString(36),
  );
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const tryClaim = () => {
      if (activeOwnerId === null) {
        activeOwnerId = idRef.current;
        setIsOwner(true);
      }
    };
    tryClaim();
    if (activeOwnerId !== idRef.current) {
      ownershipListeners.add(tryClaim);
    }
    return () => {
      ownershipListeners.delete(tryClaim);
      if (activeOwnerId === idRef.current) {
        activeOwnerId = null;
        notifyOwnershipListeners();
      }
    };
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    const platform = getMobilePlatform();
    if (!platform) return;
    if (isCapacitorNative()) return;
    if (isSnoozed()) return;
    setOpen(true);
  }, [isOwner]);

  if (!isOwner) return null;

  const dismiss = () => {
    snoozeNow();
    setOpen(false);
  };

  const handleOpenApp = () => {
    const platform = getMobilePlatform();
    if (platform === "ios") {
      const startedAt = Date.now();
      let timer: ReturnType<typeof setTimeout> | null = null;
      const cleanup = () => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        window.removeEventListener("pagehide", cleanup);
        window.removeEventListener("blur", cleanup);
        document.removeEventListener("visibilitychange", onVisChange);
      };
      const onVisChange = () => {
        if (document.hidden) cleanup();
      };
      window.addEventListener("pagehide", cleanup);
      window.addEventListener("blur", cleanup);
      document.addEventListener("visibilitychange", onVisChange);
      timer = setTimeout(() => {
        cleanup();
        if (!document.hidden && Date.now() - startedAt >= 2400) {
          window.location.href = APP_STORE_URL;
        }
      }, 2500);
      window.location.href = "boxstat://";
    } else if (platform === "android") {
      window.location.href =
        "intent://open/#Intent;scheme=boxstat;package=com.boxstat.app;S.browser_fallback_url=" +
        encodeURIComponent(PLAY_STORE_URL) +
        ";end";
    } else {
      window.open(APP_STORE_URL, "_blank");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent
        hideClose
        className="max-w-[320px] rounded-2xl bg-white p-6 border-0 shadow-xl"
      >
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Dismiss app download prompt"
          data-testid="button-dismiss-app-banner"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center pt-2">
          <img src={lightThemeLogo} alt="BoxStat" className="h-14 w-auto mb-5" />
          <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
            Get the full app experience
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mb-6">
            Stay in the know and enjoy more great features on the app
          </DialogDescription>
          <button
            onClick={handleOpenApp}
            className="w-full py-3 rounded-full bg-[#fe2c55] hover:bg-[#e5284d] text-white font-semibold text-base transition-colors"
            data-testid="button-open-boxstat-app"
          >
            Open BoxStat
          </button>
          <button
            onClick={dismiss}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            data-testid="button-not-now-app-banner"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
