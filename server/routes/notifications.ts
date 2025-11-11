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
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(503).json({ 
        error: 'Push notifications not configured',
        message: 'VAPID keys are not set. Contact administrator.'
      });
    }
    res.json({ publicKey });
  });

  // Subscribe to push notifications
  app.post('/api/notifications/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const subscription = subscriptionSchema.parse(req.body);
      const userId = req.user.id;

      await notificationService.subscribeToPush(userId, {
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        platform: 'web',
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
      const userId = req.user.id;

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

  // Register FCM token for native push notifications (iOS/Android)
  app.post('/api/push/register', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.body;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required' });
      }

      const userId = req.user.id;
      const userAgent = req.headers['user-agent'] || '';
      
      // Detect platform from user agent
      const platform = userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'ios' : 'android';
      const deviceType = platform === 'ios' ? 'iPhone' : 'Android';
      
      await notificationService.subscribeToPush(userId, {
        fcmToken: token,
        platform,
        userAgent,
        deviceType,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error registering push token:', error);
      res.status(500).json({ error: 'Failed to register push token' });
    }
  });

  // Get user notifications
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      // Validate hideReadAfterHours to prevent NaN from reaching SQL
      let hideReadAfterHours: number | undefined;
      if (req.query.hideReadAfterHours) {
        const parsed = parseInt(req.query.hideReadAfterHours as string);
        hideReadAfterHours = (!isNaN(parsed) && parsed > 0) ? parsed : undefined;
      }

      const notifications = await notificationService.getUserNotifications(userId, {
        limit,
        offset,
        unreadOnly,
        hideReadAfterHours
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
      const userId = req.user.id;
      const count = await notificationService.getUnreadCount(userId);
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
      const userId = req.user.id;

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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  // Get notification feed (last 5 unread notifications from notification_recipients)
  app.get('/api/notifications/feed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const { db } = await import("../db");
      const { notifications, notificationRecipients } = await import("../../shared/schema");
      const { eq, and, desc } = await import("drizzle-orm");
      
      const feed = await db.select({
        id: notifications.id,
        types: notifications.types,
        title: notifications.title,
        message: notifications.message,
        createdAt: notifications.createdAt,
        relatedEventId: notifications.relatedEventId,
        recipientId: notificationRecipients.id,
        isRead: notificationRecipients.isRead,
      })
        .from(notificationRecipients)
        .innerJoin(notifications, eq(notificationRecipients.notificationId, notifications.id))
        .where(and(
          eq(notificationRecipients.userId, userId),
          eq(notificationRecipients.isRead, false)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(5);

      res.json(feed);
    } catch (error) {
      console.error('Error fetching notification feed:', error);
      res.status(500).json({ error: 'Failed to fetch notification feed' });
    }
  });

  // Get announcements (type='announcement' from notification_recipients)
  app.get('/api/notifications/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const { db } = await import("../db");
      const { notifications, notificationRecipients } = await import("../../shared/schema");
      const { eq, and, desc, sql } = await import("drizzle-orm");
      
      const announcements = await db.select({
        id: notifications.id,
        types: notifications.types,
        title: notifications.title,
        message: notifications.message,
        createdAt: notifications.createdAt,
        recipientId: notificationRecipients.id,
        isRead: notificationRecipients.isRead,
      })
        .from(notificationRecipients)
        .innerJoin(notifications, eq(notificationRecipients.notificationId, notifications.id))
        .where(and(
          eq(notificationRecipients.userId, userId),
          sql`'announcement' = ANY(${notifications.types})`,
          eq(notificationRecipients.isRead, false)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(3);

      res.json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  // Mark notification as read (update notification_recipients)
  app.post('/api/notifications/:id/mark-read', isAuthenticated, async (req: any, res) => {
    try {
      const recipientId = parseInt(req.params.id);
      const userId = req.user.id;

      if (isNaN(recipientId)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }

      const { db } = await import("../db");
      const { notificationRecipients } = await import("../../shared/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      const result = await db.update(notificationRecipients)
        .set({ 
          isRead: true,
          readAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(
          eq(notificationRecipients.id, recipientId),
          eq(notificationRecipients.userId, userId)
        ))
        .returning({ id: notificationRecipients.id });

      if (result.length === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

}