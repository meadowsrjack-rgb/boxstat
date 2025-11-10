import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Trophy,
  Calendar,
  Target,
  Book,
  TrendingUp,
  MessageSquare,
  CreditCard,
  Star,
  Clock,
  X,
  ExternalLink
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

interface NotificationDetailDialogProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkAsRead?: (id: number) => void;
}

function getNotificationIcon(type: string, size: string = "h-5 w-5") {
  switch (type) {
    case 'badge_earned':
      return <Star className={`${size} text-yellow-500`} />;
    case 'trophy_progress':
      return <Trophy className={`${size} text-amber-500`} />;
    case 'event_rsvp_available':
    case 'event_checkin_available':
    case 'event_reminder':
      return <Calendar className={`${size} text-blue-500`} />;
    case 'training_reminder':
      return <Book className={`${size} text-green-500`} />;
    case 'skills_evaluation':
      return <Target className={`${size} text-purple-500`} />;
    case 'improvement_recommendation':
      return <TrendingUp className={`${size} text-indigo-500`} />;
    case 'payment_due':
      return <CreditCard className={`${size} text-red-500`} />;
    case 'team_message':
      return <MessageSquare className={`${size} text-cyan-500`} />;
    default:
      return <Bell className={`${size} text-gray-500`} />;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return <Badge variant="destructive">High Priority</Badge>;
    case 'normal':
      return <Badge variant="default">Normal</Badge>;
    case 'low':
      return <Badge variant="secondary">Low Priority</Badge>;
    default:
      return null;
  }
}

export default function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
  onMarkAsRead
}: NotificationDetailDialogProps) {
  if (!notification) return null;

  const handleActionClick = () => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
      onOpenChange(false);
    }
  };

  const handleMarkAsRead = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-notification-detail">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-1">
                {getNotificationIcon(notification.types?.[0] || 'notification', 'h-6 w-6')}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl leading-tight pr-8">
                  {notification.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  {getPriorityBadge(notification.priority)}
                  {!notification.isRead && (
                    <Badge variant="outline" className="bg-primary/10">
                      Unread
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-4">
          {/* Message Content */}
          <div>
            <DialogDescription className="text-base leading-relaxed whitespace-pre-wrap">
              {notification.message}
            </DialogDescription>
          </div>

          {/* Additional Data */}
          {notification.data && Object.keys(notification.data).length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Additional Information</p>
              <div className="text-sm text-muted-foreground space-y-1">
                {Object.entries(notification.data).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </div>
            {notification.expiresAt && (
              <div className="flex items-center gap-1.5">
                <span>Expires:</span>
                {formatDistanceToNow(new Date(notification.expiresAt), { addSuffix: true })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            {notification.actionUrl && (
              <Button
                onClick={handleActionClick}
                className="flex-1"
                data-testid="button-notification-action"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Take Action
              </Button>
            )}
            {!notification.isRead && (
              <Button
                variant="outline"
                onClick={handleMarkAsRead}
                data-testid="button-mark-read"
              >
                Mark as Read
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-dialog"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
