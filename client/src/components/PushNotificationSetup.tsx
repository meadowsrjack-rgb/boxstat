import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Smartphone, X } from 'lucide-react';
import { useState } from 'react';

interface PushNotificationSetupProps {
  onDismiss?: () => void;
  compact?: boolean;
}

export default function PushNotificationSetup({ onDismiss, compact = false }: PushNotificationSetupProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    isSubscribing,
    isUnsubscribing,
    subscribeError,
    unsubscribeError,
  } = useNotifications();

  const handleSubscribe = () => {
    subscribe(undefined, {
      onSuccess: () => {
        toast({
          title: "Push Notifications Enabled!",
          description: "You'll now receive notifications on this device.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to Enable Notifications",
          description: error.message || "Please try again or check your browser settings.",
          variant: "destructive",
        });
      },
    });
  };

  const handleUnsubscribe = () => {
    unsubscribe(undefined, {
      onSuccess: () => {
        toast({
          title: "Push Notifications Disabled",
          description: "You won't receive push notifications on this device anymore.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to Disable Notifications",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  // Don't show if not supported, already subscribed, or dismissed
  if (!isSupported || isSubscribed || isDismissed) {
    return null;
  }

  // Don't show if permission was explicitly denied
  if (permission === 'denied') {
    return null;
  }

  if (compact) {
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Get instant notifications
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Stay updated on events, badges, and team news
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="text-xs"
                data-testid="button-enable-notifications-compact"
              >
                {isSubscribing ? 'Enabling...' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="p-1 h-auto text-blue-600 hover:text-blue-800"
                data-testid="button-dismiss-notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
                Enable Push Notifications
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Get instant updates on your phone's lock screen
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            data-testid="button-dismiss-notifications"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-800 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <Bell className="h-3 w-3" />
              Event reminders & check-ins
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-3 w-3" />
              Badge & trophy progress
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-3 w-3" />
              Training reminders
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-3 w-3" />
              Team messages & updates
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-enable-notifications"
            >
              {isSubscribing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300"
              data-testid="button-maybe-later"
            >
              Maybe Later
            </Button>
          </div>

          {subscribeError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {subscribeError.message || 'Failed to enable notifications. Please try again.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Component for managing existing subscription
export function PushNotificationManager() {
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    permission,
    unsubscribe,
    isUnsubscribing,
  } = useNotifications();

  const handleUnsubscribe = () => {
    unsubscribe(undefined, {
      onSuccess: () => {
        toast({
          title: "Push Notifications Disabled",
          description: "You won't receive push notifications on this device anymore.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to Disable Notifications",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  if (!isSupported || !isSubscribed) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-5 w-5 text-green-600" />
          Push Notifications Active
        </CardTitle>
        <CardDescription>
          You're receiving notifications on this device
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={handleUnsubscribe}
          disabled={isUnsubscribing}
          data-testid="button-disable-notifications"
        >
          {isUnsubscribing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Disabling...
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Disable Notifications
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}