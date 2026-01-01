import type { Express } from "express";
import { notificationService } from "../services/notificationService";
import { requireAuth } from "../auth";
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
  app.post('/api/notifications/subscribe', requireAuth, async (req: any, res) => {
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
  app.post('/api/notifications/unsubscribe', requireAuth, async (req: any, res) => {
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
  app.post('/api/push/register', requireAuth, async (req: any, res) => {
    try {
      const { token, apnsEnvironment } = req.body;
      
      console.log('[Push Register] 📱 Received push token registration request');
      console.log('[Push Register] User ID:', req.user.id);
      console.log('[Push Register] Token length:', token?.length || 0);
      console.log('[Push Register] Token preview:', token?.substring(0, 30) + '...');
      console.log('[Push Register] APNs Environment:', apnsEnvironment || 'not specified');
      
      if (!token || typeof token !== 'string') {
        console.log('[Push Register] ❌ Token missing or invalid');
        return res.status(400).json({ error: 'Token is required' });
      }

      const userId = req.user.id;
      const userAgent = req.headers['user-agent'] || '';
      
      // Detect platform from user agent
      const platform = userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'ios' : 'android';
      const deviceType = platform === 'ios' ? 'iPhone' : 'Android';
      
      // For iOS, use the provided APNs environment
      // Default to 'production' for deployed apps (TestFlight/App Store), 'sandbox' for local dev
      const resolvedApnsEnv = platform === 'ios' 
        ? (apnsEnvironment || (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'))
        : undefined;
      
      console.log('[Push Register] Platform detected:', platform);
      console.log('[Push Register] Device type:', deviceType);
      console.log('[Push Register] Resolved APNs Environment:', resolvedApnsEnv || 'N/A');
      
      await notificationService.subscribeToPush(userId, {
        fcmToken: token,
        platform,
        userAgent,
        deviceType,
        apnsEnvironment: resolvedApnsEnv,
      });

      console.log('[Push Register] ✅ Token registered successfully for user', userId);
      res.json({ success: true, platform, deviceType, apnsEnvironment: resolvedApnsEnv });
    } catch (error) {
      console.error('[Push Register] ❌ Error registering push token:', error);
      res.status(500).json({ error: 'Failed to register push token' });
    }
  });
  
  // Debug endpoint to check push configuration status
  app.get('/api/push/debug', async (req, res) => {
    try {
      const { isAPNsConfigured } = await import("../services/apnsService");
      const { db } = await import("../db");
      const { pushSubscriptions } = await import("../../shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      
      // Count registered devices by platform
      const iosCount = await db.select({ count: sql<number>`count(*)` })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.platform, 'ios'));
      
      const androidCount = await db.select({ count: sql<number>`count(*)` })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.platform, 'android'));
      
      const webCount = await db.select({ count: sql<number>`count(*)` })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.platform, 'web'));
      
      res.json({
        apnsConfigured: isAPNsConfigured(),
        apnsHost: process.env.NODE_ENV === 'development' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com',
        bundleId: process.env.APNS_BUNDLE_ID || 'boxstat.app',
        registeredDevices: {
          ios: Number(iosCount[0]?.count) || 0,
          android: Number(androidCount[0]?.count) || 0,
          web: Number(webCount[0]?.count) || 0,
        },
        vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
        nodeEnv: process.env.NODE_ENV
      });
    } catch (error) {
      console.error('Error in push debug:', error);
      res.status(500).json({ error: 'Failed to get debug info' });
    }
  });

  // Get user notifications
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
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
  app.get('/api/notifications/unread-count', requireAuth, async (req: any, res) => {
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
  app.post('/api/notifications/:id/read', requireAuth, async (req: any, res) => {
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
  app.post('/api/notifications/read-all', requireAuth, async (req: any, res) => {
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
  app.get('/api/notifications/preferences', requireAuth, async (req: any, res) => {
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
  app.post('/api/notifications/preferences', requireAuth, async (req: any, res) => {
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
  app.get('/api/notifications/feed', requireAuth, async (req: any, res) => {
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

  // Get announcements (type='announcement' or 'legacy_subscription' from notification_recipients)
  app.get('/api/notifications/announcements', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const { db } = await import("../db");
      const { notifications, notificationRecipients } = await import("../../shared/schema");
      const { eq, and, desc, sql, or } = await import("drizzle-orm");
      
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
          or(
            sql`'announcement' = ANY(${notifications.types})`,
            sql`'legacy_subscription' = ANY(${notifications.types})`
          ),
          eq(notificationRecipients.isRead, false)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(5);

      res.json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  // Mark notification as read (update notification_recipients)
  app.post('/api/notifications/:id/mark-read', requireAuth, async (req: any, res) => {
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

  // Test iOS push notification endpoint (admin only)
  app.post('/api/push/test-ios', requireAuth, async (req: any, res) => {
    try {
      const { deviceToken, title, body } = req.body;
      const userId = req.user.id;
      
      // Check if user is admin
      const { db } = await import("../db");
      const { users } = await import("../../shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Import APNs service
      const { sendAPNsNotification, isAPNsConfigured } = await import("../services/apnsService");
      
      if (!isAPNsConfigured()) {
        return res.status(503).json({ 
          error: 'APNs not configured',
          message: 'Missing APNS_KEY_ID, APNS_TEAM_ID, or APNS_AUTH_KEY'
        });
      }
      
      let targetDevices: Array<{ token: string; environment?: string }> = [];
      
      if (deviceToken) {
        // Use provided token - default to sandbox for manual testing
        targetDevices = [{ token: deviceToken, environment: 'sandbox' }];
      } else {
        // Get all active iOS devices with their APNs environment
        const { pushSubscriptions } = await import("../../shared/schema");
        const iosDevices = await db.select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.platform, 'ios'));
        
        targetDevices = iosDevices
          .filter(d => d.isActive && d.fcmToken)
          .map(d => ({ 
            token: d.fcmToken!, 
            environment: d.apnsEnvironment || 'production' // Use stored environment, default to production for TestFlight/App Store
          }));
      }
      
      if (targetDevices.length === 0) {
        return res.status(400).json({ 
          error: 'No iOS devices registered',
          message: 'Install the app on an iOS device and grant notification permissions first'
        });
      }
      
      console.log('[Test Push] Sending to devices:', targetDevices.map(d => `${d.token.substring(0, 20)}... (${d.environment})`));
      
      const result = await sendAPNsNotification(targetDevices, {
        title: title || '🏀 BoxStat Test',
        body: body || 'This is a test push notification from BoxStat!',
        data: { type: 'test', timestamp: Date.now() }
      });
      
      res.json({
        success: result.successCount > 0,
        message: `Sent to ${result.successCount}/${targetDevices.length} devices`,
        details: result
      });
    } catch (error) {
      console.error('Error sending test push:', error);
      res.status(500).json({ error: 'Failed to send test push notification' });
    }
  });

  // Get registered iOS devices (admin only)
  app.get('/api/push/ios-devices', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const { db } = await import("../db");
      const { users, pushSubscriptions } = await import("../../shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const iosDevices = await db.select({
        id: pushSubscriptions.id,
        userId: pushSubscriptions.userId,
        platform: pushSubscriptions.platform,
        deviceType: pushSubscriptions.deviceType,
        isActive: pushSubscriptions.isActive,
        createdAt: pushSubscriptions.createdAt,
        tokenPreview: pushSubscriptions.fcmToken
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.platform, 'ios'));
      
      // Mask tokens for security
      const maskedDevices = iosDevices.map(d => ({
        ...d,
        tokenPreview: d.tokenPreview ? `${d.tokenPreview.substring(0, 20)}...` : null
      }));
      
      res.json({
        count: maskedDevices.length,
        devices: maskedDevices
      });
    } catch (error) {
      console.error('Error fetching iOS devices:', error);
      res.status(500).json({ error: 'Failed to fetch iOS devices' });
    }
  });

}