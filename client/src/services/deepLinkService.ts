import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { authPersistence } from './authPersistence';

let deepLinkCallback: ((url: string) => void) | null = null;

export function setDeepLinkCallback(callback: (url: string) => void) {
  deepLinkCallback = callback;
}

export async function initDeepLinks(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('[DeepLink] App opened with URL:', event.url);
      
      if (deepLinkCallback) {
        deepLinkCallback(event.url);
      } else {
        handleDeepLink(event.url);
      }
    });

    console.log('[DeepLink] Deep link listener initialized');

    const launchUrl = await App.getLaunchUrl();
    if (launchUrl && launchUrl.url) {
      console.log('[DeepLink] Cold start launch URL detected:', launchUrl.url);
      handleDeepLink(launchUrl.url);
    }
  } catch (error) {
    console.error('[DeepLink] Failed to initialize deep links:', error);
  }
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
      
      window.location.href = redirectPath;
      return true;
    } else {
      console.error('[DeepLink] Failed to exchange token:', data.message);
      window.location.href = '/login?error=auth_failed';
      return false;
    }
  } catch (error) {
    console.error('[DeepLink] Error exchanging auth token:', error);
    window.location.href = '/login?error=auth_failed';
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
        window.location.href = '/set-password';
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
      window.location.href = redirectPath;
    } else {
      console.error('[DeepLink] Magic link login failed:', data.message);
      window.location.href = '/login?error=magic_link_failed';
    }
  } catch (error) {
    console.error('[DeepLink] Error processing magic link:', error);
    window.location.href = '/login?error=magic_link_failed';
  }
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
      const orgId = organizationId || '';
      let redirectPath = `/registration?email=${encodeURIComponent(userEmail)}&verified=true`;
      if (orgId) {
        redirectPath += `&organizationId=${encodeURIComponent(orgId)}`;
      }
      window.location.href = redirectPath;
    } else {
      console.error('[DeepLink] Email verification failed:', data.message);
      const errMsg = encodeURIComponent(data.message || 'Verification failed. Please try again.');
      window.location.href = `/verify-email?error=${errMsg}`;
    }
  } catch (error) {
    console.error('[DeepLink] Error verifying email:', error);
    const errMsg = encodeURIComponent('An error occurred during verification. Please try again.');
    window.location.href = `/verify-email?error=${errMsg}`;
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
        window.location.href = `/unified-account?payment=success&session_id=${sessionId || ''}`;
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
      window.location.href = '/unified-account?payment=canceled';
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
        window.location.href = `/claim-verify?token=${token}`;
      }
    } else if (pathname === '/verify-email' || pathname.startsWith('/verify-email')) {
      const token = searchParams.get('token');
      const emailParam = searchParams.get('email');
      const organizationId = searchParams.get('organizationId');
      if (token) {
        console.log('[DeepLink] Verify-email token detected, processing in app...');
        handleVerifyEmailDirectly(token, emailParam, organizationId);
      }
    } else {
      console.log('[DeepLink] Unknown path, navigating to:', pathname);
      window.location.href = pathname + urlObj.search;
    }
  } catch (error) {
    console.error('[DeepLink] Error handling deep link:', error);
  }
}
