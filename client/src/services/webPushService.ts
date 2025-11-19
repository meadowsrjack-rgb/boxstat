import { Capacitor } from '@capacitor/core';

const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://boxstat.replit.app' 
  : '';

function getFullUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

// VAPID public key (matches backend configuration)
const VAPID_PUBLIC_KEY = 'BAlEnlAUbQITSjTIQoxGppFw8lDmp6qKlvlySV264DR0ddNHKiCYbqsL171T8IctkpZczKOVG3Voms8CFL2PsD0';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isWebPushSupported = (): boolean => {
  // Only enable for browsers (not native apps)
  if (Capacitor.isNativePlatform()) {
    return false;
  }
  
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isWebPushSupported()) {
    throw new Error('Web push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  console.log('🔔 Notification permission:', permission);
  return permission;
};

export const subscribeToWebPush = async (): Promise<PushSubscription> => {
  if (!isWebPushSupported()) {
    throw new Error('Web push notifications are not supported in this browser');
  }

  // Request permission first
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Register service worker if not already registered
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    console.log('📝 Registering service worker...');
    registration = await navigator.serviceWorker.register('/sw.js');
    console.log('✅ Service worker registered');
  }

  // Wait for service worker to be ready
  await navigator.serviceWorker.ready;

  // Check for existing subscription
  let subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
    // Subscribe to push notifications
    console.log('📱 Subscribing to push notifications...');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    console.log('✅ Subscribed to push notifications');
  } else {
    console.log('✅ Already subscribed to push notifications');
  }

  // Always send subscription to backend to ensure sync
  await sendSubscriptionToBackend(subscription);

  return subscription;
};

export const unsubscribeFromWebPush = async (): Promise<void> => {
  if (!isWebPushSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return;
  }

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return;
  }

  // Unsubscribe from push
  await subscription.unsubscribe();
  console.log('🔕 Unsubscribed from push notifications');

  // Notify backend
  await removeSubscriptionFromBackend(subscription);
};

export const getWebPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isWebPushSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return null;
  }

  return await registration.pushManager.getSubscription();
};

async function sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
  const subscriptionJson = subscription.toJSON();
  
  // Build headers with JWT token if available
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(getFullUrl('/api/notifications/subscribe'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
      },
      userAgent: navigator.userAgent,
      deviceType: 'desktop'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to send subscription to backend:', response.status, errorText);
    throw new Error('Failed to register push subscription with server');
  }

  console.log('✅ Push subscription registered with backend');
}

async function removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
  const subscriptionJson = subscription.toJSON();
  
  // Build headers with JWT token if available
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(getFullUrl('/api/notifications/unsubscribe'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      endpoint: subscriptionJson.endpoint
    }),
  });

  if (!response.ok) {
    console.error('❌ Failed to remove subscription from backend');
  } else {
    console.log('✅ Push subscription removed from backend');
  }
}
