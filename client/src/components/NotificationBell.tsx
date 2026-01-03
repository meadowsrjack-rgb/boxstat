import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import NotificationDetailDialog from "@/components/NotificationDetailDialog";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  relatedEventId?: number;
  recipientId: number;
  isRead: boolean;
}

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const { data: feed = [] } = useQuery<NotificationItem[]>({
    queryKey: ["/api/notifications/feed"],
    refetchInterval: 30000,
  });

  const unreadCount = feed.length;

  const markAsRead = useMutation({
    mutationFn: async (recipientId: number) => {
      return await apiRequest("POST", `/api/notifications/${recipientId}/mark-read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/feed"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/notifications/mark-all-read", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/feed"] });
    },
  });

  const handleNotificationClick = async (notification: NotificationItem) => {
    // Convert NotificationItem to match NotificationDetailDialog interface
    const detailNotification = {
      id: notification.id,
      types: [notification.type],
      title: notification.title,
      message: notification.message,
      priority: 'normal' as const,
      isRead: notification.isRead,
      actionUrl: notification.relatedEventId ? `/events/${notification.relatedEventId}` : undefined,
      createdAt: notification.createdAt,
    };
    
    setSelectedNotification(detailNotification);
    setDialogOpen(true);
    setPopoverOpen(false);
    
    if (!notification.isRead) {
      await markAsRead.mutateAsync(notification.recipientId);
    }
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              data-testid="badge-notification-count"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                data-testid="button-mark-all-read"
              >
                {markAllAsRead.isPending ? 'Marking...' : 'Mark all read'}
              </Button>
            )}
          </div>

          <ScrollArea className="h-[300px]">
            {feed.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {feed.map((notification) => (
                  <button
                    key={notification.recipientId}
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border"
                    data-testid={`notification-item-${notification.recipientId}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {feed.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setLocation("/notifications")}
              data-testid="button-view-all-notifications"
            >
              View all notifications
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
    
    {/* Notification Detail Dialog */}
    <NotificationDetailDialog
      notification={selectedNotification}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onMarkAsRead={(id) => {
        // Already marked as read in handleNotificationClick
      }}
    />
    </>
  );
}
