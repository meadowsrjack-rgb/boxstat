import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  BellRing,
  Trophy,
  Calendar,
  Target,
  Book,
  TrendingUp,
  MessageSquare,
  CreditCard,
  CheckCircle,
  Star,
  Users,
  Clock,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: number;
  types: string[];
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  isRead: boolean;
  actionUrl?: string;
  data?: any;
  createdAt: string;
  expiresAt?: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'badge_earned':
      return <Star className="h-4 w-4 text-yellow-500" />;
    case 'trophy_progress':
      return <Trophy className="h-4 w-4 text-amber-500" />;
    case 'event_rsvp_available':
    case 'event_checkin_available':
    case 'event_reminder':
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case 'training_reminder':
      return <Book className="h-4 w-4 text-green-500" />;
    case 'skills_evaluation':
      return <Target className="h-4 w-4 text-purple-500" />;
    case 'improvement_recommendation':
      return <TrendingUp className="h-4 w-4 text-indigo-500" />;
    case 'payment_due':
      return <CreditCard className="h-4 w-4 text-red-500" />;
    case 'team_message':
      return <MessageSquare className="h-4 w-4 text-cyan-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
    case 'normal':
      return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
    case 'low':
      return 'border-l-gray-400 bg-gray-50/50 dark:bg-gray-950/20';
    default:
      return 'border-l-gray-400';
  }
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current profile based on route
  const { data: profiles } = useQuery({
    queryKey: ['/api/profiles/me'],
  });
  
  // Determine current profile based on URL path
  const currentPath = window.location.pathname;
  const currentProfileType = currentPath.includes('/coach') ? 'coach' 
                           : currentPath.includes('/player') ? 'player' 
                           : currentPath.includes('/parent') ? 'parent' 
                           : null;
  
  const currentProfile = profiles?.find((p: any) => p.profileType === currentProfileType);
  const profileId = currentProfile?.id;

  // Get unread count
  const { data: unreadData } = useQuery({
    queryKey: ['/api/notifications/unread-count', { profileId }],
    queryFn: () => apiRequest(`/api/notifications/unread-count${profileId ? `?profileId=${profileId}` : ''}`),
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Get notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications', { profileId }],
    queryFn: () => apiRequest(`/api/notifications?limit=20${profileId ? `&profileId=${profileId}` : ''}`),
    enabled: isOpen,
  });

  const unreadCount = unreadData?.count || 0;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/notifications/read-all', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notification-center"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        data-testid="popover-notifications"
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                Mark all read
              </Button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see updates about events, badges, and more here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 ${getPriorityColor(notification.priority)} ${
                    !notification.isRead ? 'bg-accent/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.types?.[0] || 'notification')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm font-medium leading-tight ${
                            !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </p>
                          <p className={`text-xs mt-1 leading-relaxed ${
                            !notification.isRead ? 'text-foreground/80' : 'text-muted-foreground/80'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </div>
                        {notification.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            Urgent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                // Could navigate to full notifications page
                setIsOpen(false);
              }}
              data-testid="button-view-all"
            >
              View All Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}