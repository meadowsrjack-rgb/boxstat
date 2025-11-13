import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  isWebPushSupported,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  getWebPushSubscription,
} from '@/services/webPushService';

export function BrowserPushNotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSupport = async () => {
      const supported = isWebPushSupported();
      setIsSupported(supported);

      if (supported) {
        const subscription = await getWebPushSubscription();
        setIsSubscribed(!!subscription);
      }
    };

    checkSupport();
  }, []);

  const handleTogglePush = async () => {
    if (!isSupported) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed) {
        await unsubscribeFromWebPush();
        setIsSubscribed(false);
        toast({
          title: 'Unsubscribed',
          description: 'You will no longer receive browser push notifications',
        });
      } else {
        await subscribeToWebPush();
        setIsSubscribed(true);
        toast({
          title: 'Subscribed!',
          description: 'You will now receive push notifications in your browser',
        });
      }
    } catch (error) {
      console.error('Push notification error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to toggle push notifications',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant={isSubscribed ? 'outline' : 'default'}
      size="sm"
      onClick={handleTogglePush}
      disabled={isLoading}
      data-testid={isSubscribed ? 'button-unsubscribe-push' : 'button-subscribe-push'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <>
          <BellOff className="h-4 w-4 mr-2" />
          Disable Browser Notifications
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 mr-2" />
          Enable Browser Notifications
        </>
      )}
    </Button>
  );
}
