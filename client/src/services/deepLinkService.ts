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

export function handleDeepLink(url: string): void {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    console.log('[DeepLink] Handling URL:', { pathname, params: Object.fromEntries(searchParams) });

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
