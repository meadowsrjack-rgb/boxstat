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

export function redirectToRegistrationStep3(
  email: string,
  organizationId?: string | null,
  webFallback?: () => void,
): void {
  const redirectPath = buildRegistrationStep3Path(email, organizationId);
  const fallback = webFallback ?? (() => {
    window.location.href = redirectPath;
  });

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isAndroid = /android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  const customSchemeUrl = `boxstat://boxstat.app${redirectPath}`;

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
    window.location.href = `intent://boxstat.app${redirectPath}#Intent;scheme=boxstat;package=com.boxstat.app;S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;
  } else {
    fallback();
  }
}
