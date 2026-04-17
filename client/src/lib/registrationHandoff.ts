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
 * Hand off to registration step 3 (player list / skill-level selection).
 *
 * Behavior is intentionally browser-only on the web: both the email-verify
 * flow and the account-claim flow continue registration in whatever browser
 * the user clicked the email link from. The user is only invited to open or
 * download the native app once they reach the profile gateway page (see
 * `client/src/pages/profile-gateway.tsx`).
 *
 * The only special case is when the caller is already running INSIDE the
 * Capacitor native app — in that case we skip the URL navigation and use
 * the in-app router fallback so wouter can transition without a page load.
 */
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
  _options?: { handoffCode?: string | null },
): void {
  const redirectPath = buildRegistrationStep3Path(email, organizationId);
  const fallback = webFallback ?? (() => {
    window.location.href = redirectPath;
  });

  // Always continue in the current browser. This applies to BOTH the
  // email-verify flow and the account-claim flow on every platform —
  // mobile users finish registration in their mobile browser and only
  // get the open-in-app / download prompt when they reach the profile
  // gateway. The previous iOS custom-scheme + Android intent handoff
  // attempts were intentionally removed because they caused brittle
  // double-redirects and silent black-screens when the app wasn't
  // installed or the OS suppressed the scheme prompt.
  //
  // Inside the native app the caller already provides a wouter-aware
  // fallback, so the same call path works there too.
  fallback();
}
