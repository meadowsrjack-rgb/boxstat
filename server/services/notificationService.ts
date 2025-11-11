import { db } from "../db";
import { 
  notifications, 
  notificationRecipients,
  notificationPreferences, 
  pushSubscriptions,
  type SelectNotification,
  type SelectNotificationRecipient,
  type NotificationPreferences,
  type PushSubscription,
  type InsertNotification,
  type InsertNotificationRecipient,
  type InsertNotificationPreferences,
  type InsertPushSubscription
} from "../../shared/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import webpush from "web-push";
import admin from 'firebase-admin';

// Configure web push with VAPID keys from environment variables
// SECURITY: VAPID keys MUST be set in environment variables for production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('⚠️  VAPID keys not configured - push notifications will not work');
  console.warn('   Run: node scripts/generate-vapid-keys.js to generate production keys');
  console.warn('   Then add them to Replit Secrets or environment variables');
} else {
  webpush.setVapidDetails(
    'mailto:notifications@boxstat.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('✅ Push notifications configured with VAPID keys');
}

const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!firebaseServiceAccount) {
  console.warn('⚠️  Firebase Admin not configured - native push notifications will not work');
  console.warn('   Add FIREBASE_SERVICE_ACCOUNT_KEY to environment variables');
} else {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(firebaseServiceAccount))
    });
    console.log('✅ Firebase Admin initialized for FCM push notifications');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
  }
}

export class NotificationService {
  
  // ===== Push Subscription Management =====
  
  async subscribeToPush(userId: string, subscription: Omit<InsertPushSubscription, 'userId'>): Promise<void> {
    try {
      const isWebPush = !!subscription.endpoint;
      const isFCM = !!subscription.fcmToken;
      
      await db.insert(pushSubscriptions).values({
        userId,
        ...subscription
      }).onConflictDoUpdate({
        target: isWebPush 
          ? [pushSubscriptions.userId, pushSubscriptions.endpoint]
          : [pushSubscriptions.userId, pushSubscriptions.fcmToken],
        set: {
          ...(isWebPush && {
            p256dhKey: subscription.p256dhKey,
            authKey: subscription.authKey,
          }),
          ...(isFCM && {
            fcmToken: subscription.fcmToken,
          }),
          platform: subscription.platform,
          userAgent: subscription.userAgent,
          deviceType: subscription.deviceType,
          isActive: true,
          lastUsed: sql`CURRENT_TIMESTAMP`
        }
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw new Error('Failed to subscribe to push notifications');
    }
  }

  async unsubscribeFromPush(userId: string, endpoint: string): Promise<void> {
    try {
      await db.update(pushSubscriptions)
        .set({ isActive: false })
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        ));
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw new Error('Failed to unsubscribe from push notifications');
    }
  }

  // ===== Notification Preferences =====
  
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const [preferences] = await db.select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);
      return preferences ? (preferences as unknown as NotificationPreferences) : null;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(userId: string, updates: Partial<InsertNotificationPreferences>): Promise<void> {
    try {
      // Build a set object that only includes fields that were actually provided
      const setFields: any = {
        updatedAt: sql`CURRENT_TIMESTAMP`
      };
      
      // Only update fields that are explicitly provided in the updates object
      if (updates.eventRsvp !== undefined) setFields.eventRsvp = updates.eventRsvp;
      if (updates.eventCheckin !== undefined) setFields.eventCheckin = updates.eventCheckin;
      if (updates.eventReminders !== undefined) setFields.eventReminders = updates.eventReminders;
      if (updates.trophyProgress !== undefined) setFields.trophyProgress = updates.trophyProgress;
      if (updates.badgeEarned !== undefined) setFields.badgeEarned = updates.badgeEarned;
      if (updates.trainingReminders !== undefined) setFields.trainingReminders = updates.trainingReminders;
      if (updates.skillsEvaluation !== undefined) setFields.skillsEvaluation = updates.skillsEvaluation;
      if (updates.improvementRecommendation !== undefined) setFields.improvementRecommendation = updates.improvementRecommendation;
      if (updates.paymentDue !== undefined) setFields.paymentDue = updates.paymentDue;
      if (updates.teamMessages !== undefined) setFields.teamMessages = updates.teamMessages;
      // Coach-specific notifications
      if (updates.teamUpdates !== undefined) setFields.teamUpdates = updates.teamUpdates;
      if (updates.eventChanges !== undefined) setFields.eventChanges = updates.eventChanges;
      if (updates.playerCheckIn !== undefined) setFields.playerCheckIn = updates.playerCheckIn;
      if (updates.playerRsvp !== undefined) setFields.playerRsvp = updates.playerRsvp;
      if (updates.playerAwards !== undefined) setFields.playerAwards = updates.playerAwards;
      if (updates.playerProgress !== undefined) setFields.playerProgress = updates.playerProgress;
      // Delivery methods
      if (updates.pushNotifications !== undefined) setFields.pushNotifications = updates.pushNotifications;
      if (updates.emailNotifications !== undefined) setFields.emailNotifications = updates.emailNotifications;
      if (updates.quietHoursStart !== undefined) setFields.quietHoursStart = updates.quietHoursStart;
      if (updates.quietHoursEnd !== undefined) setFields.quietHoursEnd = updates.quietHoursEnd;

      await db.insert(notificationPreferences).values({
        userId,
        ...updates
      } as InsertNotificationPreferences).onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: setFields
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  // ===== Notification Creation and Delivery =====
  
  async sendPushNotification(notificationId: number, userId: string, title: string, message: string): Promise<void> {
    try {
      // Check user preferences
      const preferences = await this.getNotificationPreferences(userId);
      if (preferences && !preferences.pushNotifications) {
        // Update delivery status to skipped
        await db.update(notificationRecipients)
          .set({ 
            deliveryStatus: sql`jsonb_set(COALESCE(delivery_status, '{}'::jsonb), '{push}', '"skipped_user_preference"')` 
          })
          .where(and(
            eq(notificationRecipients.notificationId, notificationId),
            eq(notificationRecipients.userId, userId)
          ));
        return;
      }

      // Check quiet hours
      if (preferences && this.isInQuietHours(preferences)) {
        await db.update(notificationRecipients)
          .set({ 
            deliveryStatus: sql`jsonb_set(COALESCE(delivery_status, '{}'::jsonb), '{push}', '"skipped_quiet_hours"')` 
          })
          .where(and(
            eq(notificationRecipients.notificationId, notificationId),
            eq(notificationRecipients.userId, userId)
          ));
        return;
      }

      // Get all active subscriptions for the user
      const subscriptions = await db.select()
        .from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.isActive, true)
        ));

      // Split into web push and FCM subscriptions
      const webPushSubscriptions = subscriptions.filter(
        sub => sub.endpoint && sub.p256dhKey && sub.authKey
      );

      const fcmSubscriptions = subscriptions.filter((sub: any) => 
        sub.fcmToken && (sub.platform === 'ios' || sub.platform === 'android')
      );

      // Only skip if BOTH groups are empty
      if (webPushSubscriptions.length === 0 && fcmSubscriptions.length === 0) {
        await db.update(notificationRecipients)
          .set({ 
            deliveryStatus: sql`jsonb_set(COALESCE(delivery_status, '{}'::jsonb), '{push}', '"skipped_no_subscription"')` 
          })
          .where(and(
            eq(notificationRecipients.notificationId, notificationId),
            eq(notificationRecipients.userId, userId)
          ));
        return;
      }

      const payload = JSON.stringify({
        title,
        body: message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: `notification-${notificationId}`,
        data: {
          notificationId,
          url: '/notifications'
        },
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });

      // Track overall success
      let sentSuccessfully = false;

      // Send to web push devices if any exist
      if (webPushSubscriptions.length > 0) {
        const promises = webPushSubscriptions.map(async (subscription) => {
          try {
            await webpush.sendNotification({
              endpoint: subscription.endpoint!,
              keys: {
                p256dh: subscription.p256dhKey!,
                auth: subscription.authKey!
              }
            }, payload);

            sentSuccessfully = true;
            
            // Update last used timestamp
            await db.update(pushSubscriptions)
              .set({ lastUsed: sql`CURRENT_TIMESTAMP` })
              .where(eq(pushSubscriptions.id, subscription.id));

          } catch (error) {
            console.error(`Failed to send push to ${subscription.endpoint}:`, error);
            
            // If subscription is no longer valid, mark as inactive
            if ((error as any).statusCode === 410 || (error as any).statusCode === 404) {
              await db.update(pushSubscriptions)
                .set({ isActive: false })
                .where(eq(pushSubscriptions.id, subscription.id));
            }
          }
        });

        await Promise.allSettled(promises);
      }

      // Send to FCM devices if any exist
      if (fcmSubscriptions.length > 0) {
        const fcmTokens = fcmSubscriptions.map((sub: any) => sub.fcmToken).filter(Boolean);
        if (fcmTokens.length > 0) {
          try {
            await this.sendNativePush(fcmTokens, {
              title: title,
              body: message,
            });
            sentSuccessfully = true;
          } catch (error) {
            console.error('Failed to send FCM notifications:', error);
          }
        }
      }

      // Update delivery status in notification_recipients
      await db.update(notificationRecipients)
        .set({ 
          deliveryStatus: sql`jsonb_set(COALESCE(delivery_status, '{}'::jsonb), '{push}', '${sentSuccessfully ? '"sent"' : '"failed"'}')`
        })
        .where(and(
          eq(notificationRecipients.notificationId, notificationId),
          eq(notificationRecipients.userId, userId)
        ));

    } catch (error) {
      console.error('Error sending push notification:', error);
      // Mark as failed
      await db.update(notificationRecipients)
        .set({ 
          deliveryStatus: sql`jsonb_set(COALESCE(delivery_status, '{}'::jsonb), '{push}', '"failed"')` 
        })
        .where(and(
          eq(notificationRecipients.notificationId, notificationId),
          eq(notificationRecipients.userId, userId)
        ));
    }
  }

  private async sendNativePush(fcmTokens: string[], notification: { title: string; body: string }): Promise<void> {
    if (!firebaseServiceAccount) {
      console.warn('Skipping FCM send - Firebase not configured');
      return;
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        tokens: fcmTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ Sent FCM notifications: ${response.successCount} successful, ${response.failureCount} failed`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            console.error(`FCM send failed for token ${fcmTokens[idx]}:`, resp.error);
          }
        });
      }
    } catch (error) {
      console.error('Error sending FCM notifications:', error);
      throw new Error('Failed to send native push notifications');
    }
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const quietStart = preferences.quietHoursStart || "22:00";
    const quietEnd = preferences.quietHoursEnd || "07:00";
    
    const [startHour, startMin] = quietStart.split(':').map(Number);
    const [endHour, endMin] = quietEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  // ===== Notification Queries =====
  
  async getUserNotifications(userId: string, options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    hideReadAfterHours?: number;
  } = {}): Promise<Array<SelectNotification & { isRead: boolean; readAt: string | null }>> {
    try {
      const { limit = 20, offset = 0, unreadOnly = false, hideReadAfterHours } = options;
      
      // Build where conditions
      const conditions = [eq(notificationRecipients.userId, userId)];
      
      if (unreadOnly) {
        conditions.push(eq(notificationRecipients.isRead, false));
      } else if (hideReadAfterHours !== undefined) {
        conditions.push(
          or(
            eq(notificationRecipients.isRead, false),
            sql`${notificationRecipients.readAt} >= NOW() - INTERVAL '${sql.raw(hideReadAfterHours.toString())} hours'`
          )!
        );
      }
      
      // Join notification_recipients with notifications
      const results = await db.select({
        id: notifications.id,
        organizationId: notifications.organizationId,
        types: notifications.types,
        title: notifications.title,
        message: notifications.message,
        recipientTarget: notifications.recipientTarget,
        recipientUserIds: notifications.recipientUserIds,
        recipientRoles: notifications.recipientRoles,
        recipientTeamIds: notifications.recipientTeamIds,
        recipientDivisionIds: notifications.recipientDivisionIds,
        deliveryChannels: notifications.deliveryChannels,
        sentBy: notifications.sentBy,
        sentAt: notifications.sentAt,
        relatedEventId: notifications.relatedEventId,
        status: notifications.status,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
        isRead: notificationRecipients.isRead,
        readAt: notificationRecipients.readAt
      })
        .from(notificationRecipients)
        .innerJoin(notifications, eq(notifications.id, notificationRecipients.notificationId))
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
          
      return results as Array<SelectNotification & { isRead: boolean; readAt: string | null }>;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number, userId: string): Promise<void> {
    try {
      await db.update(notificationRecipients)
        .set({ 
          isRead: true,
          readAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(
          eq(notificationRecipients.notificationId, notificationId),
          eq(notificationRecipients.userId, userId)
        ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      await db.update(notificationRecipients)
        .set({ 
          isRead: true,
          readAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(
          eq(notificationRecipients.userId, userId),
          eq(notificationRecipients.isRead, false)
        ));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const [result] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(notificationRecipients)
        .where(and(
          eq(notificationRecipients.userId, userId),
          eq(notificationRecipients.isRead, false)
        ));
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

}

export const notificationService = new NotificationService();