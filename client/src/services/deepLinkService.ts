import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';

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
  } catch (error) {
    console.error('[DeepLink] Failed to initialize deep links:', error);
  }
}

async function exchangeAuthToken(token: string): Promise<boolean> {
  try {
    console.log('[DeepLink] Exchanging auth token for session...');
    const response = await fetch(`/api/auth/app-redirect?token=${token}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('[DeepLink] Session created successfully');
      
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

    if (pathname === '/magic-link-login' || pathname.startsWith('/magic-link-login')) {
      const token = searchParams.get('token');
      if (token) {
        console.log('[DeepLink] Magic link token detected, navigating...');
        window.location.href = `/magic-link-login?token=${token}`;
      }
    } else if (pathname === '/claim-verify' || pathname.startsWith('/claim-verify')) {
      const token = searchParams.get('token');
      if (token) {
        console.log('[DeepLink] Claim verify token detected, navigating...');
        window.location.href = `/claim-verify?token=${token}`;
      }
    } else {
      console.log('[DeepLink] Unknown path, navigating to:', pathname);
      window.location.href = pathname + urlObj.search;
    }
  } catch (error) {
    console.error('[DeepLink] Error handling deep link:', error);
  }
}
