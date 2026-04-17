import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { authPersistence } from './authPersistence';

let deepLinkCallback: ((path: string) => void) | null = null;
let isReady = false;
const pendingUrls: string[] = [];
let listenerAttached = false;
let launchUrlConsumed = false;

// Short-lived dedupe: avoid double-handling the same cold-start URL when it
// arrives via both `appUrlOpen` and `App.getLaunchUrl()` (Capacitor on iOS
// can surface the same launch URL through both channels). Time-bounded so a
// legitimate re-open with the same URL minutes later is still processed.
const recentlySeen = new Map<string, number>();
const DEDUPE_WINDOW_MS = 5000;

function isDuplicate(url: string): boolean {
  const now = Date.now();
  // Sweep old entries to keep the map small.
  for (const [u, ts] of recentlySeen) {
    if (now - ts > DEDUPE_WINDOW_MS) recentlySeen.delete(u);
  }
  const last = recentlySeen.get(url);
  if (last !== undefined && now - last <= DEDUPE_WINDOW_MS) return true;
  recentlySeen.set(url, now);
  return false;
}

function enqueueOrHandle(url: string): void {
  if (isDuplicate(url)) {
    console.log('[DeepLink] Duplicate URL ignored:', url);
    return;
  }
  if (!isReady) {
    console.log('[DeepLink] App not ready yet, queueing URL:', url);
    pendingUrls.push(url);
    return;
  }
  handleDeepLink(url);
}

export function setDeepLinkCallback(callback: (path: string) => void) {
  deepLinkCallback = callback;
}

/**
 * Signal that the app has finished its initial mount + auth check and is
 * ready to receive deep-link navigations. Any URLs received before this point
 * (e.g. from a cold-start launch URL) are queued and flushed in arrival order.
 */
export function markDeepLinkServiceReady() {
  if (isReady) return;
  isReady = true;
  if (pendingUrls.length > 0) {
    console.log('[DeepLink] App ready, flushing', pendingUrls.length, 'queued deep link(s)');
    const queued = pendingUrls.splice(0, pendingUrls.length);
    for (const url of queued) {
      handleDeepLink(url);
    }
  }
}

/**
 * Register the appUrlOpen listener and check for a cold-start launch URL as
 * early as possible — ideally before React mounts.
 *
 * iOS delivers Universal Link URLs to Capacitor very early in the app
 * launch, often *before* a useEffect-driven listener registration would
 * run. If no listener is attached at that moment, the URL is dropped and
 * the WebView simply renders its default `server.url` (which is the
 * landing page in our case). Calling this from `main.tsx` before
 * `ReactDOM.render` plugs that race.
 *
 * Idempotent: safe to invoke from both `main.tsx` and the React-side
 * `initDeepLinks()` — the second call is a no-op for the listener.
 */
export async function registerEarlyDeepLinkCapture(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  console.log('[DeepLink early] Registering early appUrlOpen capture on', Capacitor.getPlatform());

  // Attach the listener at most once. If an earlier call failed to attach
  // (e.g. App plugin not yet registered), we fall through and retry here.
  if (!listenerAttached) {
    try {
      await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        console.log('[DeepLink early] appUrlOpen received:', event.url);
        enqueueOrHandle(event.url);
      });
      listenerAttached = true;
    } catch (error) {
      console.error('[DeepLink early] Failed to add appUrlOpen listener (will retry on next call):', error);
    }
  }

  // Read the cold-start launch URL. Only mark "consumed" once we actually
  // see a URL — that way if the first call returns empty due to the App
  // plugin not yet being ready, a subsequent call (e.g. from
  // `initDeepLinks()` after React mounts) can still pick it up. The dedupe
  // layer in `enqueueOrHandle` prevents double-handling if the listener
  // also delivered the same URL in the interim.
  if (!launchUrlConsumed) {
    try {
      const launchUrl = await App.getLaunchUrl();
      if (launchUrl && launchUrl.url) {
        launchUrlConsumed = true;
        console.log('[DeepLink early] Cold-start launch URL detected:', launchUrl.url);
        enqueueOrHandle(launchUrl.url);
      } else {
        console.log('[DeepLink early] No cold-start launch URL (will recheck on next call)');
      }
    } catch (error) {
      console.error('[DeepLink early] Failed to read launch URL (will retry on next call):', error);
    }
  }
}

export async function initDeepLinks(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Delegate listener + launch-URL setup to the early-capture helper so the
  // two entry points cannot diverge. If `main.tsx` already registered the
  // listener, this is a no-op; otherwise this call still wires it up.
  await registerEarlyDeepLinkCapture();
  console.log('[DeepLink] Deep link listener initialized');
}

/**
 * Navigate within the app. Prefers the registered wouter callback (preserves
 * React state and route guards) and only falls back to a hard navigation when
 * the callback hasn't been wired up yet.
 */
function navigateInApp(path: string): void {
  if (deepLinkCallback) {
    try {
      deepLinkCallback(path);
      return;
    } catch (err) {
      console.error('[DeepLink] Callback navigation failed, falling back to hard navigation:', err);
    }
  }
  window.location.href = path;
}

async function exchangeAuthToken(token: string): Promise<boolean> {
  try {
    console.log('[DeepLink] Exchanging auth token for session...');
    const response = await fetch(`https://boxstat.app/api/auth/app-redirect?token=${token}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('[DeepLink] Session created successfully');
      
      // Persist the JWT token for session persistence across app restarts
      if (data.token) {
        await authPersistence.setToken(data.token);
        console.log('[DeepLink] JWT token saved to native storage');
      }
      
      let redirectPath = "/profile-selection";
      if (data.user?.defaultDashboardView) {
        if (data.user.defaultDashboardView === "parent") {
          redirectPath = "/unified-account";
        } else {
          localStorage.setItem("selectedPlayerId", data.user.defaultDashboardView);
          redirectPath = "/player-dashboard";
        }
      }
      
      navigateInApp(redirectPath);
      return true;
    } else {
      console.error('[DeepLink] Failed to exchange token:', data.message);
      navigateInApp('/login?error=auth_failed');
      return false;
    }
  } catch (error) {
    console.error('[DeepLink] Error exchanging auth token:', error);
    navigateInApp('/login?error=auth_failed');
    return false;
  }
}

async function handleMagicLinkDirectly(magicToken: string): Promise<void> {
  try {
    console.log('[DeepLink] Processing magic link token directly in app...');
    const response = await fetch(`https://boxstat.app/api/auth/magic-link-login?token=${magicToken}`, {
      credentials: 'include',
    });
    const data = await response.json();

    if (response.ok && data.success) {
      console.log('[DeepLink] Magic link login successful!');

      if (data.token) {
        await authPersistence.setToken(data.token);
        console.log('[DeepLink] JWT token saved to native storage');
      }

      if (data.needsPassword) {
        console.log('[DeepLink] User needs to set password, redirecting...');
        navigateInApp('/set-password');
        return;
      }

      let redirectPath = '/profile-selection';
      if (data.user?.defaultDashboardView) {
        if (data.user.defaultDashboardView === 'parent') {
          redirectPath = '/unified-account';
        } else {
          localStorage.setItem('selectedPlayerId', data.user.defaultDashboardView);
          redirectPath = '/player-dashboard';
        }
      }

      console.log('[DeepLink] Redirecting to:', redirectPath);
      navigateInApp(redirectPath);
    } else {
      console.error('[DeepLink] Magic link login failed:', data.message);
      navigateInApp('/login?error=magic_link_failed');
    }
  } catch (error) {
    console.error('[DeepLink] Error processing magic link:', error);
    navigateInApp('/login?error=magic_link_failed');
  }
}

function buildRegistrationStep3Path(email: string, organizationId: string | null): string {
  let path = `/registration?email=${encodeURIComponent(email)}&verified=true`;
  if (organizationId) {
    path += `&organizationId=${encodeURIComponent(organizationId)}`;
  }
  return path;
}

async function handleVerifyEmailDirectly(
  token: string,
  email: string | null,
  organizationId: string | null,
): Promise<void> {
  try {
    console.log('[DeepLink] Verifying email in app...');
    let apiUrl = `https://boxstat.app/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    if (email) {
      apiUrl += `&email=${encodeURIComponent(email)}`;
    }
    if (organizationId) {
      apiUrl += `&organizationId=${encodeURIComponent(organizationId)}`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (response.ok && data.success) {
      console.log('[DeepLink] Email verification successful in app');
      const userEmail = data.email || email || '';
      navigateInApp(buildRegistrationStep3Path(userEmail, organizationId));
      return;
    }

    // If the token was already consumed by the browser handoff (the web
    // verify page hits /api/auth/verify-email first, then opens the app
    // via boxstat://), the API returns 404 "Invalid or expired
    // verification token" or 400 "Verification token has expired". When
    // we have an email param to anchor the user, treat that specific
    // class of failure as a successful handoff and route to step 3.
    const message: string = (data && data.message) || '';
    const isConsumedOrExpired =
      response.status === 404 ||
      response.status === 400 ||
      /invalid|expired/i.test(message);

    if (email && isConsumedOrExpired) {
      console.warn(
        '[DeepLink] Verify-email token appears already consumed/expired and email param is present; routing to registration step 3.',
        { status: response.status, message },
      );
      navigateInApp(buildRegistrationStep3Path(email, organizationId));
      return;
    }

    console.error('[DeepLink] Email verification failed:', message);
    const errMsg = encodeURIComponent(message || 'Verification failed. Please try again.');
    navigateInApp(`/verify-email?error=${errMsg}`);
  } catch (error) {
    console.error('[DeepLink] Error verifying email:', error);
    const errMsg = encodeURIComponent('An error occurred during verification. Please try again.');
    navigateInApp(`/verify-email?error=${errMsg}`);
  }
}

export function handleDeepLink(url: string): void {
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol;
    const pathname = urlObj.pathname;
    const host = urlObj.host;
    const searchParams = urlObj.searchParams;

    console.log('[DeepLink] Handling URL:', { protocol, host, pathname, params: Object.fromEntries(searchParams) });

    if (protocol === 'boxstat:' && (host === 'auth' || pathname === '/auth' || pathname === 'auth')) {
      const token = searchParams.get('token');
      if (token) {
        console.log('[DeepLink] Auth redirect token detected, exchanging for session...');
        exchangeAuthToken(token);
        return;
      }
    }

    // Handle payment success deep link - close in-app browser and show confirmation
    if (protocol === 'boxstat:' && (host === 'payment-success' || pathname === '/payment-success' || pathname === 'payment-success')) {
      console.log('[DeepLink] Payment success detected, closing browser...');
      const sessionId = searchParams.get('session_id');
      
      // Close the in-app browser
      try {
        Browser.close();
        console.log('[DeepLink] In-app browser closed');
      } catch (e) {
        console.log('[DeepLink] Browser close error (may already be closed):', e);
      }
      
      // Verify session token is still valid before navigating
      // The unified-account page will use the persisted token from native storage
      authPersistence.getToken().then((token) => {
        if (token) {
          console.log('[DeepLink] Session token exists, navigating to account page');
        } else {
          console.log('[DeepLink] No session token, user may need to re-login');
        }
        // Navigate regardless - the page will handle auth state
        navigateInApp(`/unified-account?payment=success&session_id=${sessionId || ''}`);
      });
      return;
    }

    // Handle payment canceled deep link
    if (protocol === 'boxstat:' && (host === 'payment-canceled' || pathname === '/payment-canceled' || pathname === 'payment-canceled')) {
      console.log('[DeepLink] Payment canceled, closing browser...');
      
      // Close the in-app browser
      try {
        Browser.close();
      } catch (e) {
        console.log('[DeepLink] Browser close error:', e);
      }
      
      // Navigate to account page
      navigateInApp('/unified-account?payment=canceled');
      return;
    }

    if (pathname === '/magic-link-login' || pathname.startsWith('/magic-link-login')) {
      const token = searchParams.get('token');
      if (token) {
        console.log('[DeepLink] Magic link token detected, processing directly...');
        handleMagicLinkDirectly(token);
      }
    } else if (pathname === '/claim-verify' || pathname.startsWith('/claim-verify')) {
      const token = searchParams.get('token');
      if (token) {
        console.log('[DeepLink] Claim verify token detected, navigating...');
        navigateInApp(`/claim-verify?token=${token}`);
      }
    } else if (pathname === '/verify-email' || pathname.startsWith('/verify-email')) {
      const token = searchParams.get('token');
      const emailParam = searchParams.get('email');
      const organizationId = searchParams.get('organizationId');
      if (token) {
        console.log('[DeepLink] Verify-email token detected, processing in app...');
        handleVerifyEmailDirectly(token, emailParam, organizationId);
      } else if (emailParam) {
        // No token but verified email handed off by the browser flow — treat
        // this just like the /registration handoff so the user lands on step 3.
        console.log('[DeepLink] Verify-email without token but with email param; routing to registration step 3');
        navigateInApp(buildRegistrationStep3Path(emailParam, organizationId));
      }
    } else if (pathname === '/registration' || pathname.startsWith('/registration')) {
      // Explicit handling for the verify-email -> app handoff URL:
      //   boxstat://boxstat.app/registration?email=...&verified=true
      // (and the equivalent https Universal Link). Preserve all query params
      // so registration-flow.tsx can read `email`, `verified`, and
      // `organizationId` and start at step 3.
      console.log('[DeepLink] Registration deep link detected, navigating with preserved query');
      navigateInApp(`/registration${urlObj.search}`);
    } else {
      console.log('[DeepLink] Unknown path, navigating to:', pathname);
      navigateInApp(pathname + urlObj.search);
    }
  } catch (error) {
    console.error('[DeepLink] Error handling deep link:', error);
  }
}
