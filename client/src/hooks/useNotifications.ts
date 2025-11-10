import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const queryClient = useQueryClient();

  // Check if push notifications are supported
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Check if already subscribed
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  // Get VAPID public key
  const { data: vapidKey }: { data: { publicKey: string } | undefined } = useQuery({
    queryKey: ['/api/notifications/vapid-public-key'],
    enabled: isSupported,
  });

  // Subscribe to push notifications
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log('Starting push notification subscription...');
        
        if (!isSupported) {
          throw new Error('Push notifications are not supported in this browser');
        }

        if (!vapidKey?.publicKey) {
          throw new Error('VAPID public key not available. Please refresh the page and try again.');
        }

        console.log('Requesting notification permission...');
        // Request permission
        const newPermission = await Notification.requestPermission();
        setPermission(newPermission);
        console.log('Permission result:', newPermission);

        if (newPermission !== 'granted') {
          throw new Error('Notification permission was denied. Please enable notifications in your browser settings.');
        }

        console.log('Waiting for service worker to be ready...');
        // Get service worker registration - with timeout
        const swTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service worker took too long to activate. Please refresh the page and try again.')), 10000)
        );
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          swTimeout
        ]) as ServiceWorkerRegistration;
        
        console.log('Service worker ready, subscribing to push manager...');
        // Subscribe to push service
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey),
        });
        console.log('Push subscription successful');

        // Send subscription to server
        const subscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!),
          },
          userAgent: navigator.userAgent,
          deviceType: getDeviceType(),
        };

        console.log('Sending subscription to server...');
        await apiRequest('/api/notifications/subscribe', {
          method: 'POST',
          data: subscriptionData,
        });
        console.log('Subscription saved to server');

        setIsSubscribed(true);
        return subscription;
      } catch (error: any) {
        console.error('Push notification subscription error:', error);
        // Rethrow with more context
        throw new Error(error.message || 'Failed to enable push notifications. Please try again.');
      }
    },
  });

  // Unsubscribe from push notifications
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        await apiRequest('/api/notifications/unsubscribe', {
          method: 'POST',
          data: { endpoint: subscription.endpoint },
        });
      }

      setIsSubscribed(false);
    },
  });

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    subscribeError: subscribeMutation.error,
    unsubscribeError: unsubscribeMutation.error,
  };
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = String.fromCharCode.apply(null, Array.from(bytes));
  return btoa(binary);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/tablet|ipad|playbook|silk/.test(userAgent)) {
    return 'tablet';
  }
  
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
    return 'mobile';
  }
  
  return 'desktop';
}