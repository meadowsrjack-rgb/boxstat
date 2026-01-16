import { db } from "../db";
import { 
  notifications, 
  notificationRecipients,
  notificationPreferences, 
  pushSubscriptions,
  users,
  type SelectNotification,
  type SelectNotificationRecipient,
  type NotificationPreferences,
  type PushSubscription,
  type InsertNotification,
  type InsertNotificationRecipient,
  type InsertNotificationPreferences,
  type InsertPushSubscription
} from "../../shared/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import webpush from "web-push";
import { sendAPNsNotification, isAPNsConfigured } from "./apnsService";
import { sendNotificationEmail } from "../email";
import admin from 'firebase-admin';

// Firebase Admin SDK for Android push notifications
const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (firebaseServiceAccount) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(firebaseServiceAccount))
      });
      console.log('✅ Firebase Admin initialized for Android FCM push notifications');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
  }
} else {
  console.warn('⚠️ Firebase Admin not configured - Android push notifications will not work');
}

// Configure web push with VAPID keys from environment variables
// SECURITY: VAPID keys MUST be set in environment variables for production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('⚠️  VAPID keys not configured - web push notifications will not work');
  console.warn('   Run: node scripts/generate-vapid-keys.js to generate production keys');
  console.warn('   Then add them to Replit Secrets or environment variables');
} else {
  webpush.setVapidDetails(
    'mailto:notifications@boxstat.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push notifications configured with VAPID keys');
}

export class NotificationService {
  
  // ===== Push Subscription Management =====
  
  async subscribeToPush(userId: string, subscription: Omit<InsertPushSubscription, 'userId'>): Promise<void> {
    try {
      const isWebPush = !!subscription.endpoint;
      const isFCM = !!subscription.fcmToken;
      
      // For iOS native push (FCM tokens), deactivate previous tokens for this user
      // to ensure only the latest device token is active. This prevents:
      // 1. Sending to stale/invalid tokens from previous app installs
      // 2. Confusion between sandbox vs production APNs environments
      if (isFCM && subscription.platform === 'ios') {
        console.log(`[Push Subscribe] Deactivating previous iOS tokens for user ${userId}`);
        await db.update(pushSubscriptions)
          .set({ isActive: false })
          .where(and(
            eq(pushSubscriptions.userId, userId),
            eq(pushSubscriptions.platform, 'ios'),
            subscription.fcmToken ? sql`${pushSubscriptions.fcmToken} != ${subscription.fcmToken}` : sql`1=1`
          ));
      }
      
      await db.insert(pushSubscriptions).values({
        userId,
        ...subscription,
        isActive: true, // Explicitly set active for new subscriptions
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
            apnsEnvironment: subscription.apnsEnvironment, // Store APNs environment for iOS
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
      const setFields: any = {};
      
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
    const startTime = Date.now();
    console.log(`[Push Send] ========================================`);
    console.log(`[Push Send] 🚀 START push notification #${notificationId} to user ${userId}`);
    console.log(`[Push Send] Title: "${title}"`);
    console.log(`[Push Send] Message: "${message}"`);
    console.log(`[Push Send] Step 1: Checking user preferences...`);
    
    try {
      // Check user preferences with timeout
      let preferences;
      try {
        const prefPromise = this.getNotificationPreferences(userId);
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Preferences lookup timed out after 5s')), 5000)
        );
        preferences = await Promise.race([prefPromise, timeoutPromise]);
        console.log(`[Push Send] ✅ Step 1 COMPLETE - User preferences:`, preferences ? 'Found' : 'Not set (using defaults)');
      } catch (prefError) {
        console.error(`[Push Send] ❌ Step 1 ERROR fetching user preferences:`, prefError);
        console.log(`[Push Send] Continuing without preferences (defaults will be used)`);
        preferences = null;
      }
      
      if (preferences && !preferences.pushNotifications) {
        console.log(`[Push Send] ⏭️  Skipping - user has disabled push notifications in preferences`);
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
        console.log(`[Push Send] 🌙 Skipping - user is in quiet hours`);
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

      // Get all active subscriptions for the specific user only
      // Push notifications go to the exact user ID - no cross-profile delivery
      console.log(`[Push Send] Step 2: 🔍 Looking up active push subscriptions for user ${userId}...`);
      let subscriptions: any[];
      try {
        // Query subscriptions for this specific user only
        const subPromise = db.select()
          .from(pushSubscriptions)
          .where(and(
            eq(pushSubscriptions.userId, userId),
            eq(pushSubscriptions.isActive, true)
          ));
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Subscription lookup timed out after 5s')), 5000)
        );
        subscriptions = await Promise.race([subPromise, timeoutPromise]);
        
        // Enhanced logging to debug subscription lookup
        const webSubs = subscriptions.filter((s: any) => s.endpoint);
        const iosSubs = subscriptions.filter((s: any) => s.platform === 'ios' && s.fcmToken);
        const androidSubs = subscriptions.filter((s: any) => s.platform === 'android' && s.fcmToken);
        
        console.log(`[Push Send] ✅ Step 2 COMPLETE - Found ${subscriptions.length} active subscription(s) for user ${userId}`);
        console.log(`[Push Send]   📊 Breakdown: Web=${webSubs.length}, iOS=${iosSubs.length}, Android=${androidSubs.length}`);
      } catch (subError) {
        console.error(`[Push Send] ❌ Step 2 ERROR querying subscriptions:`, subError);
        console.log(`[Push Send] ======== END (error) after ${Date.now() - startTime}ms ========`);
        throw subError;
      }
      
      console.log(`[Push Send] Subscription details:`);
      subscriptions.forEach((sub, idx) => {
        console.log(`[Push Send]   Subscription ${idx + 1}: Platform=${sub.platform}, Type=${sub.fcmToken ? 'FCM' : 'WebPush'}`);
      });

      // Split into web push and FCM subscriptions
      const webPushSubscriptions = subscriptions.filter(
        sub => sub.endpoint && sub.p256dhKey && sub.authKey
      );

      const fcmSubscriptions = subscriptions.filter((sub: any) => 
        sub.fcmToken && (sub.platform === 'ios' || sub.platform === 'android')
      );

      console.log(`[Push Send] Split into ${webPushSubscriptions.length} WebPush and ${fcmSubscriptions.length} FCM subscriptions`);

      // Only skip if BOTH groups are empty
      if (webPushSubscriptions.length === 0 && fcmSubscriptions.length === 0) {
        console.log(`[Push Send] ⏭️  No subscriptions found - skipping push notification`);
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
        console.log(`[Push Send] 🌐 Processing ${webPushSubscriptions.length} Web Push subscription(s)...`);
        
        let webPushSuccessCount = 0;
        let webPushFailCount = 0;
        const webPushErrors: Array<{ endpoint: string; error: string }> = [];
        
        const promises = webPushSubscriptions.map(async (subscription) => {
          const truncatedEndpoint = subscription.endpoint!.substring(0, 50) + '...';
          
          try {
            await webpush.sendNotification({
              endpoint: subscription.endpoint!,
              keys: {
                p256dh: subscription.p256dhKey!,
                auth: subscription.authKey!
              }
            }, payload);

            webPushSuccessCount++;
            sentSuccessfully = true;
            
            // Update last used timestamp
            await db.update(pushSubscriptions)
              .set({ lastUsed: sql`CURRENT_TIMESTAMP` })
              .where(eq(pushSubscriptions.id, subscription.id));

          } catch (error) {
            webPushFailCount++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            webPushErrors.push({ endpoint: truncatedEndpoint, error: errorMessage });
            
            console.error(`[Push Send] ❌ Failed to send to endpoint ${truncatedEndpoint}:`, errorMessage);
            
            // If subscription is no longer valid, mark as inactive
            if ((error as any).statusCode === 410 || (error as any).statusCode === 404) {
              console.log(`[Push Send] 🗑️  Marking inactive subscription: ${truncatedEndpoint}`);
              await db.update(pushSubscriptions)
                .set({ isActive: false })
                .where(eq(pushSubscriptions.id, subscription.id));
            }
          }
        });

        await Promise.allSettled(promises);
        
        // Log final Web Push results
        console.log(`[Push Send] Web Push Results: ${webPushSuccessCount} succeeded, ${webPushFailCount} failed`);
        if (webPushSuccessCount > 0) {
          console.log(`[Push Send] ✅ ${webPushSuccessCount} Web Push notification(s) sent successfully`);
        }
        if (webPushFailCount > 0) {
          console.log(`[Push Send] ❌ ${webPushFailCount} Web Push notification(s) failed:`);
          webPushErrors.forEach((err, idx) => {
            console.log(`[Push Send]   Failure ${idx + 1}: ${err.endpoint}`);
            console.log(`[Push Send]     Error: ${err.error}`);
          });
        }
      }

      // Send to iOS devices via APNs (direct to Apple)
      console.log(`[Push Send] Step 3: 🍎 iOS APNs processing for user ${userId}...`);
      console.log(`[Push Send]   Total FCM subscriptions: ${fcmSubscriptions.length}`);
      const iosSubscriptions = fcmSubscriptions.filter((sub: any) => sub.platform === 'ios');
      console.log(`[Push Send]   iOS subscriptions after filter: ${iosSubscriptions.length}`);
      if (iosSubscriptions.length > 0) {
        console.log(`[Push Send] 🍎 Processing ${iosSubscriptions.length} iOS subscription(s) via APNs...`);
        // Extract tokens with their environment (sandbox vs production)
        // Each device uses its registered environment - sandbox for Xcode builds, production for TestFlight/App Store
        const devices = iosSubscriptions
          .filter((sub: any) => sub.fcmToken)
          .map((sub: any) => ({
            token: sub.fcmToken,
            environment: sub.apnsEnvironment || 'production' // Use stored environment, default to production
          }));
        console.log(`[Push Send] Extracted ${devices.length} APNs device(s)`);
        devices.forEach((d: any) => console.log(`[Push Send]   Token: ${d.token.substring(0, 20)}... (${d.environment})`));
        
        if (devices.length > 0 && isAPNsConfigured()) {
          try {
            console.log(`[Push Send] 🚀 Sending directly to Apple APNs...`);
            const apnsResult = await sendAPNsNotification(devices, {
              title: title,
              body: message,
            });
            
            console.log(`[Push Send] APNs Results: ${apnsResult.successCount} succeeded, ${apnsResult.failureCount} failed`);
            if (apnsResult.successCount > 0) {
              console.log(`[Push Send] ✅ ${apnsResult.successCount} APNs notification(s) sent successfully`);
              sentSuccessfully = true;
            }
            if (apnsResult.failureCount > 0) {
              console.log(`[Push Send] ❌ ${apnsResult.failureCount} APNs notification(s) failed`);
              apnsResult.results.filter(r => !r.success).forEach((result, idx) => {
                console.log(`[Push Send]   Failure ${idx + 1}: Token ${result.deviceToken.substring(0, 20)}...`);
                console.log(`[Push Send]     Error: ${result.error}`);
              });
              
              // Mark invalid tokens as inactive
              for (const result of apnsResult.results) {
                if (!result.success && (result.statusCode === 410 || result.error?.includes('BadDeviceToken'))) {
                  const sub = iosSubscriptions.find((s: any) => s.fcmToken === result.deviceToken);
                  if (sub) {
                    console.log(`[Push Send] 🗑️ Marking inactive iOS subscription`);
                    await db.update(pushSubscriptions)
                      .set({ isActive: false })
                      .where(eq(pushSubscriptions.id, sub.id));
                  }
                }
              }
            }
          } catch (error) {
            console.error('[Push Send] ❌ EXCEPTION during APNs send:', error);
            console.error('[Push Send] Error message:', error instanceof Error ? error.message : String(error));
          }
        } else if (!isAPNsConfigured()) {
          console.warn('[Push Send] ⚠️ APNs not configured - skipping iOS push notifications');
        }
      }

      // Send to Android devices via FCM
      const androidSubscriptions = fcmSubscriptions.filter((sub: any) => sub.platform === 'android');
      if (androidSubscriptions.length > 0) {
        console.log(`[Push Send] 🤖 Processing ${androidSubscriptions.length} Android subscription(s) via FCM...`);
        const fcmTokens = androidSubscriptions.map((sub: any) => sub.fcmToken).filter(Boolean);
        
        if (fcmTokens.length > 0 && firebaseServiceAccount) {
          try {
            const fcmMessage = {
              notification: {
                title: title,
                body: message,
              },
              tokens: fcmTokens,
            };

            console.log(`[Push Send] 📡 Calling Firebase Admin SDK for Android...`);
            const response = await admin.messaging().sendEachForMulticast(fcmMessage);
            console.log(`[Push Send] FCM Results: ${response.successCount} succeeded, ${response.failureCount} failed`);
            
            if (response.successCount > 0) {
              console.log(`[Push Send] ✅ ${response.successCount} Android notification(s) sent successfully`);
              sentSuccessfully = true;
            }
            if (response.failureCount > 0) {
              console.log(`[Push Send] ❌ ${response.failureCount} Android notification(s) failed`);
              response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                  const errorMessage = resp.error?.message || 'Unknown error';
                  console.log(`[Push Send]   Failure ${idx + 1}: ${errorMessage}`);
                  
                  // Mark invalid tokens as inactive
                  if (resp.error?.code === 'messaging/registration-token-not-registered') {
                    const sub = androidSubscriptions[idx];
                    if (sub) {
                      db.update(pushSubscriptions)
                        .set({ isActive: false })
                        .where(eq(pushSubscriptions.id, sub.id));
                    }
                  }
                }
              });
            }
          } catch (error) {
            console.error('[Push Send] ❌ EXCEPTION during FCM send:', error);
          }
        } else if (!firebaseServiceAccount) {
          console.warn('[Push Send] ⚠️ Firebase not configured - skipping Android push notifications');
        }
      }

      // Update delivery status in notification_recipients
      const finalStatus = sentSuccessfully ? 'sent' : 'failed';
      console.log(`[Push Send] ${sentSuccessfully ? '✅' : '❌'} Final result: ${finalStatus}`);
      
      const pushStatus = sentSuccessfully ? '"sent"' : '"failed"';
      await db.update(notificationRecipients)
        .set({ 
          deliveryStatus: sql`jsonb_set(COALESCE(delivery_status, '{}'::jsonb), '{push}', ${pushStatus}::jsonb)`
        })
        .where(and(
          eq(notificationRecipients.notificationId, notificationId),
          eq(notificationRecipients.userId, userId)
        ));

      console.log(`[Push Send] ✅ Delivery status updated in database`);
      console.log(`[Push Send] ======== END (success) after ${Date.now() - startTime}ms ========`);

    } catch (error) {
      console.error('[Push Send] ❌ EXCEPTION sending push notification:', error);
      console.error('[Push Send] Error type:', error instanceof Error ? error.name : typeof error);
      console.error('[Push Send] Error message:', error instanceof Error ? error.message : String(error));
      
      // Mark as failed
      const failedStatus = '"failed"';
      try {
        await db.update(notificationRecipients)
          .set({ 
            deliveryStatus: sql`jsonb_set(COALESCE(delivery_status, '{}'::jsonb), '{push}', ${failedStatus}::jsonb)` 
          })
          .where(and(
            eq(notificationRecipients.notificationId, notificationId),
            eq(notificationRecipients.userId, userId)
          ));
        console.log(`[Push Send] ❌ Delivery status marked as failed in database`);
      } catch (dbError) {
        console.error(`[Push Send] ❌ Failed to update database with failure status:`, dbError);
      }
      console.log(`[Push Send] ======== END (failed) after ${Date.now() - startTime}ms ========`);
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
  
  // Send notification via multiple channels (in-app, push, email)
  async sendMultiChannelNotification(params: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    data?: Record<string, any>;
    channels?: Array<'in_app' | 'push' | 'email'>;
  }): Promise<void> {
    const { userId, title, message, type = 'notification', data = {}, channels = ['in_app', 'push'] } = params;
    
    try {
      // Create in-app notification if channel includes it
      if (channels.includes('in_app')) {
        // Create the notification record
        const [notification] = await db.insert(notifications)
          .values({
            organizationId: 'default-org',
            title,
            message,
            types: ['notification'],
            recipientTarget: 'users',
            recipientUserIds: [userId],
            deliveryChannels: channels,
            status: 'sent',
            sentAt: new Date().toISOString(),
            sentBy: 'system',
          })
          .returning();
        
        // Create recipient record
        if (notification) {
          await db.insert(notificationRecipients)
            .values({
              notificationId: notification.id,
              userId,
              isRead: false,
            });
          
          // Send push notification if channel includes it
          if (channels.includes('push')) {
            await this.sendPushNotification(notification.id, userId, title, message);
          }
        }
      } else if (channels.includes('push')) {
        // Push-only notification (no in-app record)
        await this.sendPushNotification(0, userId, title, message);
      }
      
      // Send email notification if requested
      if (channels.includes('email')) {
        try {
          const [user] = await db.select({ 
            email: users.email, 
            firstName: users.firstName 
          })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          
          if (user?.email) {
            await sendNotificationEmail({
              email: user.email,
              firstName: user.firstName || '',
              title,
              message,
            });
            console.log(`✅ Email notification sent to ${user.email}`);
          }
        } catch (emailError) {
          console.error(`❌ Email notification failed for ${userId}:`, emailError);
        }
      }
    } catch (error) {
      console.error('Error sending multi-channel notification:', error);
      throw error;
    }
  }

  // ===== Scheduled Event Notifications =====
  
  async notifyEventReminder(userId: string | number, eventId: number, eventTitle: string, timeUntil: string): Promise<void> {
    await this.sendMultiChannelNotification({
      userId: userId.toString(),
      title: `Event Reminder: ${eventTitle}`,
      message: `Your event "${eventTitle}" starts ${timeUntil}. Don't forget to check in!`,
      type: 'event_reminder',
      data: { eventId, eventTitle },
      channels: ['in_app', 'push']
    });
  }
  
  async notifyEventCheckInAvailable(userId: string | number, eventId: number, eventTitle: string): Promise<void> {
    await this.sendMultiChannelNotification({
      userId: userId.toString(),
      title: 'Check-In Now Available',
      message: `Check-in is now open for "${eventTitle}". Tap to check in!`,
      type: 'event_checkin_available',
      data: { eventId, eventTitle },
      channels: ['in_app', 'push']
    });
  }
  
  async notifyRsvpClosing(userId: string | number, eventId: number, eventTitle: string, timeUntil: string): Promise<void> {
    await this.sendMultiChannelNotification({
      userId: userId.toString(),
      title: 'RSVP Closing Soon',
      message: `RSVP for "${eventTitle}" closes in ${timeUntil}. Let us know if you're attending!`,
      type: 'event_rsvp_closing',
      data: { eventId, eventTitle },
      channels: ['in_app', 'push']
    });
  }

}

export const notificationService = new NotificationService();