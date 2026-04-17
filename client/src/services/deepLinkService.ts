import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { authPersistence } from './authPersistence';

let deepLinkCallback: ((path: string) => void) | null = null;
let isReady = false;
const pendingUrls: string[] = [];
let listenerAttached = false;
let launchUrlConsumed = false;
// True once we've successfully queried `App.getLaunchUrl()` at least once and
// can confidently say whether the cold-start carried a deep link or not.
// Used by `hasPendingOrUnconsumedLaunchUrl()` so UI surfaces (e.g. the home
// route's PlatformAwareLanding) can briefly wait instead of racing a deep-link
// navigation with their own redirect.
let launchUrlChecked = false;

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
      // Mark that the launch-URL probe has completed (success path), even if
      // the result was empty. This lets `hasPendingOrUnconsumedLaunchUrl()`
      // stop blocking the home route once we know there was no cold-start
      // deep link.
      launchUrlChecked = true;
      if (launchUrl && launchUrl.url) {
        launchUrlConsumed = true;
        console.log('[DeepLink early] Cold-start launch URL detected:', launchUrl.url);
        enqueueOrHandle(launchUrl.url);
      } else {
        console.log('[DeepLink early] No cold-start launch URL');
      }
    } catch (error) {
      console.error('[DeepLink early] Failed to read launch URL (will retry on next call):', error);
    }
  }
}

/**
 * Returns true when the deep-link service either has a queued URL waiting to
 * be flushed, or hasn't yet finished probing for a cold-start launch URL.
 *
 * UI that conditionally redirects on mount (e.g. the home route deciding
 * between Landing and /home based on auth state) can use this to render a
 * brief loader instead of racing the deep-link navigation. On non-native
 * platforms there's never a launch URL, so this always returns false.
 */
export function hasPendingOrUnconsumedLaunchUrl(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  if (pendingUrls.length > 0) return true;
  if (!launchUrlChecked) return true;
  return false;
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

  // Belt-and-suspenders: retry the launch-URL probe a couple more times over
  // the first ~1.5s of launch in case the App plugin wasn't ready when the
  // first call ran. The dedupe layer in `enqueueOrHandle` keeps repeats from
  // double-handling.
  const retryDelays = [250, 750, 1500];
  for (const delay of retryDelays) {
    setTimeout(() => {
      if (launchUrlConsumed) return;
      App.getLaunchUrl()
        .then((launchUrl) => {
          launchUrlChecked = true;
          if (launchUrl?.url && !launchUrlConsumed) {
            launchUrlConsumed = true;
            console.log(`[DeepLink] Late launch URL detected (+${delay}ms):`, launchUrl.url);
            enqueueOrHandle(launchUrl.url);
          }
        })
        .catch((err) => console.warn(`[DeepLink] Late launch-URL probe (+${delay}ms) failed:`, err));
    }, delay);
  }

  // For the first 5 seconds after launch, also re-probe whenever the app
  // becomes active. iOS occasionally delivers a Universal Link slightly
  // after launch — without this it would be silently dropped.
  const launchedAt = Date.now();
  let stateListener: { remove: () => Promise<void> } | null = null;
  try {
    stateListener = await App.addListener('appStateChange', async (state) => {
      if (!state.isActive) return;
      if (Date.now() - launchedAt > 5000) {
        try { await stateListener?.remove(); } catch { /* ignore */ }
        return;
      }
      if (launchUrlConsumed) return;
      try {
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url && !launchUrlConsumed) {
          launchUrlConsumed = true;
          console.log('[DeepLink] Launch URL recovered on appStateChange→active:', launchUrl.url);
          enqueueOrHandle(launchUrl.url);
        }
      } catch (err) {
        console.warn('[DeepLink] appStateChange launch-URL probe failed:', err);
      }
    });
  } catch (err) {
    console.warn('[DeepLink] appStateChange listener registration failed:', err);
  }
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
      const reason = classifyDeepLinkError(response.status, data?.message);
      navigateInApp(buildLinkErrorPath('auth', reason, { message: data?.message }));
      return false;
    }
  } catch (error: any) {
    console.error('[DeepLink] Error exchanging auth token:', error);
    navigateInApp(buildLinkErrorPath('auth', 'network', { message: error?.message }));
    return false;
  }
}

type LinkErrorType = 'verify-email' | 'magic-link' | 'claim-verify' | 'auth';
type LinkErrorReason = 'expired' | 'used' | 'invalid' | 'network' | 'unknown';

function classifyDeepLinkError(status: number, message?: string): LinkErrorReason {
  const text = (message || '').toLowerCase();
  if (/expired/.test(text)) return 'expired';
  if (/already.*used|already.*consumed|already used/.test(text)) return 'used';
  if (/invalid|not found/.test(text)) return 'invalid';
  if (status === 404) return 'invalid';
  if (status === 410 || status === 401) return 'expired';
  if (status >= 500) return 'network';
  return 'unknown';
}

function buildLinkErrorPath(
  type: LinkErrorType,
  reason: LinkErrorReason,
  extras: { email?: string | null; organizationId?: string | null; message?: string | null } = {},
): string {
  const params = new URLSearchParams({ type, reason });
  if (extras.email) params.set('email', extras.email);
  if (extras.organizationId) params.set('organizationId', extras.organizationId);
  if (extras.message) params.set('message', extras.message);
  return `/link-error?${params.toString()}`;
}

async function handleMagicLinkDirectly(
  magicToken: string,
  opts: { fromProbe?: boolean } = {},
): Promise<void> {
  // Stash for cold-start recovery: if a future launch loses the deep link
  // in transit we can re-attempt this exact token. The probe has
  // single-retry semantics so a stale stash can't hijack later launches.
  // A freshly-delivered deep link gets a clean retry budget; the probe
  // path passes fromProbe so the single-retry marker (already set by the
  // probe before it called us) survives even if this attempt fails on
  // the network. See task #200.
  rememberPendingMagicLinkToken(magicToken, { resetRetried: !opts.fromProbe });
  try {
    console.log('[DeepLink] Processing magic link token directly in app...');
    const response = await fetch(`https://boxstat.app/api/auth/magic-link-login?token=${magicToken}`, {
      credentials: 'include',
    });
    const data = await response.json();

    if (response.ok && data.success) {
      console.log('[DeepLink] Magic link login successful!');
      clearPendingMagicLinkToken();

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
      clearPendingMagicLinkToken();
      const reason = classifyDeepLinkError(response.status, data?.message);
      navigateInApp(buildLinkErrorPath('magic-link', reason, { message: data?.message }));
    }
  } catch (error: any) {
    console.error('[DeepLink] Error processing magic link:', error);
    // Keep the stash on transient network errors so a quick relaunch can
    // retry; the single-retry semantics in the cold-start probe still cap
    // the blast radius. The stash naturally expires after PENDING_MAGIC_LINK_TTL_MS.
    navigateInApp(buildLinkErrorPath('magic-link', 'network', { message: error?.message }));
  }
}

async function resumeFromHandoffCode(code: string): Promise<{ email: string; organizationId: string | null } | null> {
  try {
    const res = await fetch(`https://boxstat.app/api/auth/claim/pending?code=${encodeURIComponent(code)}`);
    if (!res.ok) {
      console.log('[ClaimResume] pending lookup failed', res.status);
      return null;
    }
    const data = await res.json();
    if (!data?.success || !data?.pending?.email) return null;
    return {
      email: data.pending.email,
      organizationId: data.pending.organizationId || null,
    };
  } catch (err) {
    console.error('[ClaimResume] pending lookup network error', err);
    return null;
  }
}

async function resumeFromEmail(email: string): Promise<{ email: string; organizationId: string | null } | null> {
  try {
    const res = await fetch(`https://boxstat.app/api/auth/claim/pending-by-email?email=${encodeURIComponent(email)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data?.pending?.email) return null;
    return {
      email: data.pending.email,
      organizationId: data.pending.organizationId || null,
    };
  } catch {
    return null;
  }
}

// Set after a successful claim-resume (either via deep link or cold-start
// probe) so a slightly-later-delivered duplicate claim-resume URL whose
// single-use code has already been consumed doesn't bounce the user to
// /claim and clobber the successful step-3 navigation.
let recentClaimResumeSuccessAt = 0;
const RECENT_CLAIM_RESUME_WINDOW_MS = 30000;
function markClaimResumeSuccess(): void {
  recentClaimResumeSuccessAt = Date.now();
}
function recentlyResumedClaim(): boolean {
  return Date.now() - recentClaimResumeSuccessAt < RECENT_CLAIM_RESUME_WINDOW_MS;
}

function clearLocalPendingClaim(): void {
  try {
    localStorage.removeItem('pendingClaimCode');
    localStorage.removeItem('pendingClaimCodeAt');
    localStorage.removeItem('pendingClaimCodeRetried');
  } catch {
    /* ignore */
  }
}

// Cold-start recovery for the /invite/:token email flow. When the InviteClaim
// page mounts (via a delivered deep link) it stashes its token here so a
// subsequent cold-start that loses the deep link in transit can still re-route
// the user to the invite flow instead of being stranded on /app.
const PENDING_INVITE_TOKEN_KEY = 'pendingInviteToken';
const PENDING_INVITE_TOKEN_AT_KEY = 'pendingInviteTokenAt';
const PENDING_INVITE_TOKEN_RETRIED_KEY = 'pendingInviteTokenRetried';
// Short TTL: the second-tap race we're fixing happens within seconds of the
// first tap. A long window risks hijacking a normal launch shortly after a
// legitimate invite visit.
const PENDING_INVITE_TTL_MS = 2 * 60 * 1000;

const PENDING_MAGIC_LINK_TOKEN_KEY = 'pendingMagicLinkToken';
const PENDING_MAGIC_LINK_TOKEN_AT_KEY = 'pendingMagicLinkTokenAt';
const PENDING_MAGIC_LINK_TOKEN_RETRIED_KEY = 'pendingMagicLinkTokenRetried';
const PENDING_MAGIC_LINK_TTL_MS = 2 * 60 * 1000;

function rememberPendingMagicLinkToken(token: string, opts: { resetRetried?: boolean } = {}): void {
  try {
    localStorage.setItem(PENDING_MAGIC_LINK_TOKEN_KEY, token);
    localStorage.setItem(PENDING_MAGIC_LINK_TOKEN_AT_KEY, String(Date.now()));
    // Only clear the retried marker on a fresh deep-link arrival. The
    // cold-start probe re-invokes handleMagicLinkDirectly and must NOT
    // wipe the marker, otherwise a network failure on the retry would
    // allow another cold-start to retry again, breaking the single-retry
    // guarantee.
    if (opts.resetRetried) {
      localStorage.removeItem(PENDING_MAGIC_LINK_TOKEN_RETRIED_KEY);
    }
  } catch {
    /* ignore */
  }
}

function clearPendingMagicLinkToken(): void {
  try {
    localStorage.removeItem(PENDING_MAGIC_LINK_TOKEN_KEY);
    localStorage.removeItem(PENDING_MAGIC_LINK_TOKEN_AT_KEY);
    localStorage.removeItem(PENDING_MAGIC_LINK_TOKEN_RETRIED_KEY);
  } catch {
    /* ignore */
  }
}

export function rememberPendingInviteToken(token: string): void {
  try {
    localStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
    localStorage.setItem(PENDING_INVITE_TOKEN_AT_KEY, String(Date.now()));
    localStorage.removeItem(PENDING_INVITE_TOKEN_RETRIED_KEY);
  } catch {
    /* ignore */
  }
}

export function clearPendingInviteToken(): void {
  try {
    localStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
    localStorage.removeItem(PENDING_INVITE_TOKEN_AT_KEY);
    localStorage.removeItem(PENDING_INVITE_TOKEN_RETRIED_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve a claim-resume payload that arrived via deep link. On miss,
 * routes the user to /claim so they can request a fresh link instead of
 * being stranded on Landing — appropriate here because the user
 * explicitly tapped a claim email.
 */
export async function handleClaimResume(code: string | null, fallbackEmail: string | null): Promise<boolean> {
  let resumed: { email: string; organizationId: string | null } | null = null;
  if (code) {
    resumed = await resumeFromHandoffCode(code);
    if (resumed) console.log('[ClaimResume] resolved via code', code, resumed.email);
  }
  if (!resumed && fallbackEmail) {
    resumed = await resumeFromEmail(fallbackEmail);
    if (resumed) console.log('[ClaimResume] resolved via email fallback', resumed.email);
  }
  if (!resumed) {
    if (recentlyResumedClaim()) {
      console.log('[ClaimResume] miss within recent-success window; ignoring duplicate claim-resume');
      return false;
    }
    console.warn('[ClaimResume] no pending claim found; routing to claim landing');
    clearLocalPendingClaim();
    navigateInApp('/claim');
    return false;
  }
  clearLocalPendingClaim();
  markClaimResumeSuccess();
  navigateInApp(buildRegistrationStep3Path(resumed.email, resumed.organizationId));
  return true;
}

/**
 * Cold-start backup: if the deep link was lost in transit but the WebView
 * (which loads the same origin as the web /claim-verify page) still has a
 * recently-stashed handoff code in localStorage, recover the claim flow
 * from that.
 *
 * Unlike `handleClaimResume`, this is a silent best-effort probe — on miss
 * or network failure it does NOT navigate anywhere. We only get one retry:
 * if the first probe attempt comes up empty, we clear the local backup so
 * we never repeatedly hijack future cold-launches.
 *
 * Returns true only if we successfully resumed the claim flow.
 */
export async function probeColdStartPendingClaim(): Promise<boolean> {
  let code: string | null = null;
  try {
    code = localStorage.getItem('pendingClaimCode');
    const at = Number(localStorage.getItem('pendingClaimCodeAt') || '0');
    if (!code || !at) return false;
    if (Date.now() - at > 10 * 60 * 1000) {
      clearLocalPendingClaim();
      return false;
    }
  } catch {
    return false;
  }

  const previouslyRetried = (() => {
    try {
      return localStorage.getItem('pendingClaimCodeRetried') === '1';
    } catch {
      return false;
    }
  })();

  console.log('[ClaimResume] cold-start probe found localStorage code', code);
  let resumed: { email: string; organizationId: string | null } | null = null;
  try {
    resumed = await resumeFromHandoffCode(code);
  } catch {
    resumed = null;
  }

  if (resumed) {
    console.log('[ClaimResume] cold-start probe resolved', resumed.email);
    clearLocalPendingClaim();
    markClaimResumeSuccess();
    navigateInApp(buildRegistrationStep3Path(resumed.email, resumed.organizationId));
    return true;
  }

  // Miss/network error: silently fall through to normal startup. After the
  // first retry, drop the local backup so subsequent launches aren't
  // affected.
  if (previouslyRetried) {
    console.log('[ClaimResume] cold-start probe missed twice; clearing local backup');
    clearLocalPendingClaim();
  } else {
    try {
      localStorage.setItem('pendingClaimCodeRetried', '1');
    } catch {
      /* ignore */
    }
    console.log('[ClaimResume] cold-start probe missed; will retry once on next launch');
  }
  return false;
}

/**
 * Cold-start backup for the /invite/:token email flow. If the deep link was
 * lost in transit on a second tap but the InviteClaim page recently stashed
 * its token in localStorage, route the user back to /invite/:token instead
 * of stranding them on /app. Single-retry semantics — after a miss, the
 * stashed token is cleared so it can't hijack later launches.
 *
 * Returns true when a navigation was performed.
 */
export async function probeColdStartPendingInvite(): Promise<boolean> {
  let token: string | null = null;
  try {
    token = localStorage.getItem(PENDING_INVITE_TOKEN_KEY);
    const at = Number(localStorage.getItem(PENDING_INVITE_TOKEN_AT_KEY) || '0');
    if (!token || !at) return false;
    if (Date.now() - at > PENDING_INVITE_TTL_MS) {
      clearPendingInviteToken();
      return false;
    }
  } catch {
    return false;
  }

  const previouslyRetried = (() => {
    try {
      return localStorage.getItem(PENDING_INVITE_TOKEN_RETRIED_KEY) === '1';
    } catch {
      return false;
    }
  })();

  if (previouslyRetried) {
    console.log('[InviteResume] cold-start probe already retried once; clearing stash');
    clearPendingInviteToken();
    return false;
  }

  try {
    localStorage.setItem(PENDING_INVITE_TOKEN_RETRIED_KEY, '1');
  } catch {
    /* ignore */
  }

  console.log('[InviteResume] cold-start probe routing to /invite/', token);
  navigateInApp(`/invite/${encodeURIComponent(token)}`);
  return true;
}

/**
 * Cold-start backup for the /magic-link-login email flow. Mirrors the
 * /invite/:token probe — if a previous in-app handler stashed a magic
 * link token (because handleMagicLinkDirectly was invoked from a delivered
 * deep link) and a subsequent cold-start lost the deep link in transit,
 * re-attempt the same token. The server will either log the user in (if
 * still valid) or surface "already used" / "expired" — both of which
 * route through buildLinkErrorPath inside handleMagicLinkDirectly. Either
 * way the user lands somewhere actionable instead of /app.
 *
 * Single-retry semantics — after one attempt the stash is cleared so it
 * can't hijack later launches.
 *
 * Returns true when a navigation/handler was kicked off.
 */
export async function probeColdStartPendingMagicLink(): Promise<boolean> {
  let token: string | null = null;
  try {
    token = localStorage.getItem(PENDING_MAGIC_LINK_TOKEN_KEY);
    const at = Number(localStorage.getItem(PENDING_MAGIC_LINK_TOKEN_AT_KEY) || '0');
    if (!token || !at) return false;
    if (Date.now() - at > PENDING_MAGIC_LINK_TTL_MS) {
      clearPendingMagicLinkToken();
      return false;
    }
  } catch {
    return false;
  }

  const previouslyRetried = (() => {
    try {
      return localStorage.getItem(PENDING_MAGIC_LINK_TOKEN_RETRIED_KEY) === '1';
    } catch {
      return false;
    }
  })();

  if (previouslyRetried) {
    console.log('[MagicLinkResume] cold-start probe already retried once; clearing stash');
    clearPendingMagicLinkToken();
    return false;
  }

  try {
    localStorage.setItem(PENDING_MAGIC_LINK_TOKEN_RETRIED_KEY, '1');
  } catch {
    /* ignore */
  }

  console.log('[MagicLinkResume] cold-start probe re-attempting magic link token');
  // Fire-and-forget: handleMagicLinkDirectly handles its own navigation
  // (success → dashboard, failure → /link-error). Pass fromProbe so the
  // single-retry marker we just set above is preserved even if the
  // network attempt fails.
  void handleMagicLinkDirectly(token, { fromProbe: true });
  return true;
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
    const reason = classifyDeepLinkError(response.status, message);
    navigateInApp(
      buildLinkErrorPath('verify-email', reason, {
        email,
        organizationId,
        message,
      }),
    );
  } catch (error: any) {
    console.error('[DeepLink] Error verifying email:', error);
    navigateInApp(
      buildLinkErrorPath('verify-email', 'network', {
        email,
        organizationId,
        message: error?.message,
      }),
    );
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

    // Normalize: a custom-scheme URL like `boxstat://claim-verify?token=...`
    // parses to host='claim-verify' and pathname='' (or '/'), while the
    // matching Universal Link `https://boxstat.app/claim-verify?token=...`
    // parses to pathname='/claim-verify'. Treat both shapes the same way by
    // checking host (for boxstat: scheme) AND pathname.
    const isCustomScheme = protocol === 'boxstat:';
    const matches = (segment: string): boolean => {
      if (pathname === `/${segment}` || pathname.startsWith(`/${segment}`)) return true;
      if (isCustomScheme && host === segment) return true;
      return false;
    };

    if (matches('magic-link-login')) {
      const token = searchParams.get('token');
      if (token) {
        console.log('[DeepLink] Magic link token detected, processing directly...');
        handleMagicLinkDirectly(token);
      }
    } else if (matches('claim-verify')) {
      const token = searchParams.get('token');
      if (token) {
        console.log('[DeepLink] Claim verify token detected, navigating...');
        navigateInApp(`/claim-verify?token=${token}`);
      } else {
        console.warn('[DeepLink] /claim-verify deep link missing token; navigating to claim page anyway');
        navigateInApp('/claim-verify');
      }
    } else if (matches('claim-resume')) {
      const code = searchParams.get('code');
      const emailParam = searchParams.get('email');
      console.log('[ClaimResume] claim-resume deep link received', { code, email: emailParam });
      handleClaimResume(code, emailParam);
    } else if (matches('verify-email')) {
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
    } else if (matches('registration')) {
      // Explicit handling for the verify-email -> app handoff URL:
      //   boxstat://boxstat.app/registration?email=...&verified=true
      // (and the equivalent https Universal Link). Preserve all query params
      // so registration-flow.tsx can read `email`, `verified`, and
      // `organizationId` and start at step 3.
      console.log('[DeepLink] Registration deep link detected, navigating with preserved query');
      navigateInApp(`/registration${urlObj.search}`);
    } else if (matches('invite')) {
      // Email invite acceptance: /invite/:token
      console.log('[DeepLink] Invite deep link detected, navigating with preserved path');
      navigateInApp(pathname + urlObj.search);
    } else {
      // Last-resort fallback: try host-as-path for custom-scheme URLs so
      // boxstat://something/extra still routes somewhere visible instead of
      // silently sticking on the landing page.
      const fallback = isCustomScheme && host
        ? `/${host}${pathname}${urlObj.search}`
        : pathname + urlObj.search;
      console.log('[DeepLink] Unknown path, navigating to:', fallback);
      navigateInApp(fallback);
    }
  } catch (error) {
    console.error('[DeepLink] Error handling deep link:', error);
    // Last-resort: never silently strand the user on /app. Send them to
    // /link-error so they have a clear next action (resend / back to login).
    try {
      const message = error instanceof Error ? error.message : String(error);
      navigateInApp(buildLinkErrorPath('auth', 'unknown', { message }));
    } catch {
      /* ignore */
    }
  }
}
