export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
  
  return isIOS && isSafari;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function canUsePushNotifications(): boolean {
  if (typeof window === 'undefined') return false;
  
  if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
    return false;
  }
  
  if (isIOS()) {
    return isStandalone();
  }
  
  return true;
}

export function needsIOSInstallPrompt(): boolean {
  return isIOSSafari() && !isStandalone();
}
