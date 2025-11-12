import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const initPushNotifications = async () => {
  if (!isNativePlatform()) {
    console.log('Not running on native platform, skipping push notification setup');
    return;
  }

  console.log('🔔 Initializing push notification listeners...');

  // Registration listener - send token to backend
  await PushNotifications.addListener('registration', async (token) => {
    console.log('✅ Push registration success, token:', token.value);
    
    try {
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          token: token.value
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to register push token with backend:', response.status, errorText);
      } else {
        const data = await response.json();
        console.log('✅ Push token successfully registered with backend:', data);
      }
    } catch (error) {
      console.error('❌ Error registering push token with backend:', error);
    }
  });

  // Registration error listener
  await PushNotifications.addListener('registrationError', (error) => {
    console.error('❌ Push registration error:', error);
  });

  // Foreground notification listener
  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('📬 Push notification received (foreground):', notification);
  });

  // Notification tap listener
  await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('👆 Push notification action performed:', notification);
  });

  console.log('✅ Push notification listeners initialized');
};

export const registerPushNotifications = async () => {
  if (!isNativePlatform()) {
    console.log('Not on native platform, skipping push notification registration');
    return;
  }
  
  try {
    // Check permissions
    let permStatus = await PushNotifications.checkPermissions();
    console.log('🔐 Current push notification permission status:', permStatus.receive);
    
    if (permStatus.receive === 'prompt') {
      console.log('🔐 Requesting push notification permissions...');
      permStatus = await PushNotifications.requestPermissions();
    }
    
    if (permStatus.receive !== 'granted') {
      console.error('❌ Push notification permissions denied');
      return;
    }
    
    console.log('✅ Push notification permissions granted');
    console.log('📱 Registering for push notifications...');
    await PushNotifications.register();
    console.log('📱 Registration triggered, waiting for token...');
  } catch (error) {
    console.error('❌ Error during push notification registration:', error);
  }
};
