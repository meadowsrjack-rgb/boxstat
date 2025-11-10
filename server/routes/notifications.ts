import type { Express } from "express";
import { notificationService } from "../services/notificationService";
import { isAuthenticated } from "../auth";
import { z } from "zod";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  }),
  userAgent: z.string().optional(),
  deviceType: z.enum(["desktop", "mobile", "tablet"]).optional()
});

const preferencesSchema = z.object({
  eventRsvp: z.boolean().optional(),
  eventCheckin: z.boolean().optional(),
  eventReminders: z.boolean().optional(),
  trophyProgress: z.boolean().optional(),
  badgeEarned: z.boolean().optional(),
  trainingReminders: z.boolean().optional(),
  skillsEvaluation: z.boolean().optional(),
  improvementRecommendation: z.boolean().optional(),
  paymentDue: z.boolean().optional(),
  teamMessages: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional()
});

export function setupNotificationRoutes(app: Express) {
  
  // Get VAPID public key for client-side push subscription
  app.get('/api/notifications/vapid-public-key', (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa40HEgfcQgdmUt_D4REvBPzq-RrftKUOvvhp_yOvMZkgUJGHk5Jb6s7j6vBpY";
    res.json({ publicKey });
  });

  // Subscribe to push notifications
  app.post('/api/notifications/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const subscription = subscriptionSchema.parse(req.body);
      const userId = req.user.claims.sub;

      await notificationService.subscribeToPush(userId, {
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userAgent: subscription.userAgent,
        deviceType: subscription.deviceType
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      res.status(400).json({ 
        error: error instanceof z.ZodError ? 'Invalid subscription data' : 'Failed to subscribe' 
      });
    }
  });

  // Unsubscribe from push notifications
  app.post('/api/notifications/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;
      const userId = req.user.claims.sub;

      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint required' });
      }

      await notificationService.unsubscribeFromPush(userId, endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  });

  // Get user notifications
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';
      const profileId = req.query.profileId as string | undefined;

      const notifications = await notificationService.getUserNotifications(userId, {
        limit,
        offset,
        unreadOnly,
        profileId
      });

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileId = req.query.profileId as string | undefined;
      const count = await notificationService.getUnreadCount(userId, profileId);
      res.json({ count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  });

  // Mark notification as read
  app.post('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      if (isNaN(notificationId)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }

      await notificationService.markNotificationAsRead(notificationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await notificationService.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Get notification preferences
  app.get('/api/notifications/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await notificationService.getNotificationPreferences(userId);
      
      // Return default preferences if none exist
      const defaultPreferences = {
        eventRsvp: true,
        eventCheckin: true,
        eventReminders: true,
        trophyProgress: true,
        badgeEarned: true,
      };

      res.json(preferences || defaultPreferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  });

  // Update notification preferences
  app.post('/api/notifications/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = preferencesSchema.parse(req.body);

      await notificationService.updateNotificationPreferences(userId, updates);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(400).json({ 
        error: error instanceof z.ZodError ? 'Invalid preferences data' : 'Failed to update preferences' 
      });
    }
  });

  // Test notification endpoint (for development)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/notifications/test', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { type = 'badge_earned', title = 'Test Notification', message = 'This is a test notification' } = req.body;

        await notificationService.createNotification({
          userId,
          type,
          title,
          message,
          priority: 'normal',
          actionUrl: '/test',
          data: { test: true }
        });

        res.json({ success: true, message: 'Test notification sent' });
      } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
      }
    });
  }
}