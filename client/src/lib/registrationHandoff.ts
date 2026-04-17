export function buildRegistrationStep3Path(
  email: string,
  organizationId?: string | null,
): string {
  let path = `/registration?email=${encodeURIComponent(email)}&verified=true`;
  if (organizationId) {
    path += `&organizationId=${encodeURIComponent(organizationId)}`;
  }
  return path;
}

/**
 * Hand off to the registration step 3 (player list / skill-level selection),
 * preferring the installed BoxStat native app via Universal Links / App Links
 * / `boxstat://` custom scheme. If the app isn't installed the user lands on
 * the same registration step in the browser as a normal web fallback.
 *
 * Mirrors the logic used by `verify-email.tsx` so that the email-verify flow
 * and the account-claim flow drop the user in the exact same place.
 */
const APP_STORE_URL = "https://apps.apple.com/us/app/boxstat/id6754899159";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.boxstat.app&hl=en_US";

function isNativeApp(): boolean {
  try {
    const cap = (window as any).Capacitor;
    if (!cap) return false;
    if (typeof cap.isNativePlatform === "function") return !!cap.isNativePlatform();
    return cap.platform === "ios" || cap.platform === "android";
  } catch {
    return false;
  }
}

export const PENDING_CLAIM_CODE_KEY = "pendingClaimCode";
export const PENDING_CLAIM_CODE_AT_KEY = "pendingClaimCodeAt";
const PENDING_CLAIM_TTL_MS = 10 * 60 * 1000;

export async function mintClaimHandoffCode(input: {
  email: string;
  organizationId?: string | null;
  accountId?: string | null;
}): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/claim/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        organizationId: input.organizationId ?? null,
        accountId: input.accountId ?? null,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.handoffCode === "string" ? data.handoffCode : null;
  } catch {
    return null;
  }
}

export function rememberPendingClaimCode(code: string): void {
  try {
    localStorage.setItem(PENDING_CLAIM_CODE_KEY, code);
    localStorage.setItem(PENDING_CLAIM_CODE_AT_KEY, String(Date.now()));
  } catch {
    /* localStorage may be unavailable (private mode); non-fatal */
  }
}

export function readRecentPendingClaimCode(): string | null {
  try {
    const code = localStorage.getItem(PENDING_CLAIM_CODE_KEY);
    const at = Number(localStorage.getItem(PENDING_CLAIM_CODE_AT_KEY) || "0");
    if (!code) return null;
    if (!at || Date.now() - at > PENDING_CLAIM_TTL_MS) {
      clearPendingClaimCode();
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearPendingClaimCode(): void {
  try {
    localStorage.removeItem(PENDING_CLAIM_CODE_KEY);
    localStorage.removeItem(PENDING_CLAIM_CODE_AT_KEY);
  } catch {
    /* ignore */
  }
}

export function redirectToRegistrationStep3(
  email: string,
  organizationId?: string | null,
  webFallback?: () => void,
  options?: { handoffCode?: string | null },
): void {
  const redirectPath = buildRegistrationStep3Path(email, organizationId);
  const fallback = webFallback ?? (() => {
    window.location.href = redirectPath;
  });

  // When we're already inside the native app, skip the custom-scheme/App
  // Store dance entirely — just navigate in-app via the provided fallback
  // (which is wired to wouter's setLocation by the caller).
  if (isNativeApp()) {
    fallback();
    return;
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isAndroid = /android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // Prefer the SHORT custom-scheme URL when we have a handoff code. This
  // reduces the payload that has to survive the iOS browser → boxstat://
  // → Capacitor handoff (the long token URL is what was getting dropped).
  const handoffCode = options?.handoffCode || null;
  const claimResumePath = handoffCode
    ? `/claim-resume?code=${encodeURIComponent(handoffCode)}&email=${encodeURIComponent(email)}`
    : redirectPath;
  const customSchemeUrl = handoffCode
    ? `boxstat://boxstat.app${claimResumePath}`
    : `boxstat://boxstat.app${redirectPath}`;

  if (isIOS) {
    // Try the custom scheme to hand off to the installed app. If the page is
    // still visible ~1.5s later, the app isn't installed (or the user
    // dismissed the prompt) — send them to the App Store instead.
    const startedAt = Date.now();
    window.location.href = customSchemeUrl;
    setTimeout(() => {
      if (document.visibilityState === "visible" && Date.now() - startedAt < 3000) {
        window.location.href = APP_STORE_URL;
      }
    }, 1500);
  } else if (isAndroid) {
    // Android intent URL: opens the app if installed, otherwise falls back
    // to the Play Store listing via S.browser_fallback_url.
    window.location.href = `intent://boxstat.app${claimResumePath}#Intent;scheme=boxstat;package=com.boxstat.app;S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;
  } else {
    fallback();
  }
}
