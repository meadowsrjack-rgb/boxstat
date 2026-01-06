import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import NotificationDetailDialog from "@/components/NotificationDetailDialog";
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
  Star,
  Clock,
  CheckCircle,
  ArrowLeft,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

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
      return <Star className="h-5 w-5 text-yellow-500" />;
    case 'trophy_progress':
      return <Trophy className="h-5 w-5 text-amber-500" />;
    case 'event_rsvp_available':
    case 'event_checkin_available':
    case 'event_reminder':
      return <Calendar className="h-5 w-5 text-blue-500" />;
    case 'training_reminder':
      return <Book className="h-5 w-5 text-green-500" />;
    case 'skills_evaluation':
      return <Target className="h-5 w-5 text-purple-500" />;
    case 'improvement_recommendation':
      return <TrendingUp className="h-5 w-5 text-indigo-500" />;
    case 'payment_due':
      return <CreditCard className="h-5 w-5 text-red-500" />;
    case 'team_message':
      return <MessageSquare className="h-5 w-5 text-cyan-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
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

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState<"all" | "unread">("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get notifications with auto-hide for old read notifications
  const { data: allNotifications = [], isLoading: allLoading } = useQuery({
    queryKey: ['/api/notifications', { hideReadAfterHours: 24 }],
    queryFn: () => apiRequest('/api/notifications?hideReadAfterHours=24'),
    enabled: selectedTab === "all",
  });

  // Get unread notifications only
  const { data: unreadNotifications = [], isLoading: unreadLoading } = useQuery({
    queryKey: ['/api/notifications', { unreadOnly: true }],
    queryFn: () => apiRequest('/api/notifications?unreadOnly=true'),
    enabled: selectedTab === "unread",
  });

  const notifications = selectedTab === "all" ? allNotifications : unreadNotifications;
  const isLoading = selectedTab === "all" ? allLoading : unreadLoading;

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
    onError: () => {
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setDialogOpen(true);

    // Mark as read if unread
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const unreadCount = unreadNotifications.length;

  return (
    <div className="scrollable-page bg-gray-50 dark:bg-gray-900 safe-bottom safe-top">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b sticky z-10" style={{ top: 'var(--safe-area-top, 0px)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read-page"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "all" | "unread")}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6" data-testid="tabs-notifications">
            <TabsTrigger value="all" data-testid="tab-all">
              All
              {allNotifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {allNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" data-testid="tab-unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {isLoading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-4">Loading notifications...</p>
                </CardContent>
              </Card>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have any notifications at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification: Notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${getPriorityColor(notification.priority)} ${
                      !notification.isRead ? 'bg-accent/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-card-${notification.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.types?.[0] || 'notification')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className={`text-base leading-tight ${
                              !notification.isRead ? 'font-bold' : ''
                            }`}>
                              {notification.title}
                            </CardTitle>
                            {!notification.isRead && (
                              <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <CardDescription className="mt-2 line-clamp-2">
                            {notification.message}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pl-8">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </div>
                        {notification.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            Urgent
                          </Badge>
                        )}
                        {notification.isRead && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            Read
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="unread" className="mt-0">
            {isLoading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-4">Loading notifications...</p>
                </CardContent>
              </Card>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">All caught up!</h3>
                  <p className="text-sm text-muted-foreground">
                    You've read all your notifications.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification: Notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${getPriorityColor(notification.priority)} bg-accent/30`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-card-${notification.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.types?.[0] || 'notification')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base leading-tight font-bold">
                              {notification.title}
                            </CardTitle>
                            <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-1" />
                          </div>
                          <CardDescription className="mt-2 line-clamp-2">
                            {notification.message}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pl-8">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </div>
                        {notification.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            Urgent
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Notification Detail Dialog */}
      <NotificationDetailDialog
        notification={selectedNotification}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
      />
    </div>
  );
}
