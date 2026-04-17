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

  const absoluteUrl = window.location.origin + redirectPath;
  const customSchemeUrl = `boxstat://boxstat.app${redirectPath}`;

  if (isIOS) {
    window.location.href = customSchemeUrl;
    setTimeout(() => {
      window.location.href = absoluteUrl;
    }, 1500);
  } else if (isAndroid) {
    window.location.href = `intent://boxstat.app${redirectPath}#Intent;scheme=boxstat;package=com.boxstat.app;S.browser_fallback_url=${encodeURIComponent(absoluteUrl)};end`;
  } else {
    fallback();
  }
}
