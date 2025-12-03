import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { X, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface Announcement {
  id: number;
  types: string[];
  title: string;
  message: string;
  createdAt: string;
  recipientId: number;
  isRead: boolean;
}

const DISMISSED_KEY = "dismissed_announcements";

function getDismissedAnnouncements(): number[] {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function dismissAnnouncement(id: number) {
  try {
    const dismissed = getDismissedAnnouncements();
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    }
  } catch (error) {
    console.error("Error dismissing announcement:", error);
  }
}

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setDismissed(getDismissedAnnouncements());
  }, []);

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/notifications/announcements"],
    refetchInterval: 60000,
  });

  const markAsRead = useMutation({
    mutationFn: async (recipientId: number) => {
      return await apiRequest("POST", `/api/notifications/${recipientId}/mark-read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/feed"] });
    },
  });

  const handleDismiss = async (announcement: Announcement) => {
    dismissAnnouncement(announcement.id);
    setDismissed([...dismissed, announcement.id]);

    if (!announcement.isRead) {
      await markAsRead.mutateAsync(announcement.recipientId);
    }
  };

  const handleAction = (announcement: Announcement) => {
    const isLegacySubscription = announcement.types.includes("legacy_subscription");
    if (isLegacySubscription) {
      setLocation("/account?tab=home");
    }
  };

  const visibleAnnouncements = announcements.filter(
    (announcement) => !dismissed.includes(announcement.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-4">
      {visibleAnnouncements.map((announcement) => {
        const isLegacySubscription = announcement.types.includes("legacy_subscription");
        
        return (
          <Alert
            key={announcement.recipientId}
            className="border-l-4 border-l-primary bg-primary/5"
            data-testid={`announcement-${announcement.id}`}
          >
            <Megaphone className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              <span>{announcement.title}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2"
                onClick={() => handleDismiss(announcement)}
                data-testid={`button-dismiss-announcement-${announcement.id}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p>{announcement.message}</p>
              {isLegacySubscription && (
                <Button
                  variant="default"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleAction(announcement)}
                  data-testid={`button-assign-subscriptions-${announcement.id}`}
                >
                  Assign to Players
                </Button>
              )}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
