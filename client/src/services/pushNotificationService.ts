import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

// API base URL - use production backend when running in Capacitor native app
const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://boxstat.app' 
  : '';

function getFullUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const initPushNotifications = async () => {
  if (!isNativePlatform()) {
    console.log('[Push Init] Not running on native platform, skipping push notification setup');
    return;
  }

  console.log('[Push Init] 🔔 Initializing push notification listeners...');
  console.log('[Push Init] Platform:', Capacitor.getPlatform());

  // Registration listener - send token to backend
  await PushNotifications.addListener('registration', async (token) => {
    console.log('[Push Registration] ✅ FCM token received:', token.value);
    console.log('[Push Registration] Token length:', token.value.length);
    
    try {
      const url = getFullUrl('/api/push/register');
      console.log('[Push Registration] Sending token to backend:', url);
      
      const authToken = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('[Push Registration] Including JWT auth token');
      } else {
        console.log('[Push Registration] ⚠️ No auth token found in localStorage');
      }
      
      // Always use production APNs
      const apnsEnvironment = 'production';
      console.log('[Push Registration] Using production APNs');
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ 
          token: token.value,
          apnsEnvironment
        }),
      });
      
      console.log('[Push Registration] Registered with APNs environment:', apnsEnvironment);

      console.log('[Push Registration] Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Push Registration] ❌ Failed to register token with backend');
        console.error('[Push Registration] Status:', response.status);
        console.error('[Push Registration] Error:', errorText);
      } else {
        const data = await response.json();
        console.log('[Push Registration] ✅ Token successfully registered with backend');
        console.log('[Push Registration] Backend response:', data);
      }
    } catch (error) {
      console.error('[Push Registration] ❌ Network error registering token:', error);
    }
  });

  // Registration error listener
  await PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push Registration] ❌ FCM registration failed:', error);
    console.error('[Push Registration] Error details:', JSON.stringify(error));
  });

  // Foreground notification listener
  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push Notification] 📬 Received in foreground');
    console.log('[Push Notification] Title:', notification.title);
    console.log('[Push Notification] Body:', notification.body);
    console.log('[Push Notification] Data:', notification.data);
  });

  // Notification tap listener
  await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('[Push Notification] 👆 User tapped notification');
    console.log('[Push Notification] Action:', notification.actionId);
    console.log('[Push Notification] Data:', notification.notification.data);
  });

  console.log('[Push Init] ✅ All push notification listeners initialized successfully');
};

export const registerPushNotifications = async () => {
  if (!isNativePlatform()) {
    console.log('[Push Register] Not on native platform, skipping push notification registration');
    return;
  }
  
  console.log('[Push Register] Starting push notification registration flow...');
  
  try {
    // Check permissions
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[Push Register] 🔐 Current permission status:', permStatus.receive);
    
    if (permStatus.receive === 'prompt') {
      console.log('[Push Register] 🔐 Permission not yet requested, requesting now...');
      permStatus = await PushNotifications.requestPermissions();
      console.log('[Push Register] Permission request result:', permStatus.receive);
    }
    
    if (permStatus.receive !== 'granted') {
      console.error('[Push Register] ❌ Push notification permissions denied by user');
      console.error('[Push Register] Final permission status:', permStatus.receive);
      return;
    }
    
    console.log('[Push Register] ✅ Push notification permissions granted');
    console.log('[Push Register] 📱 Calling PushNotifications.register() to get FCM token...');
    await PushNotifications.register();
    console.log('[Push Register] 📱 Registration API called successfully, waiting for FCM token callback...');
  } catch (error) {
    console.error('[Push Register] ❌ Error during push notification registration:', error);
    console.error('[Push Register] Error type:', error instanceof Error ? error.name : typeof error);
    console.error('[Push Register] Error message:', error instanceof Error ? error.message : String(error));
  }
};
