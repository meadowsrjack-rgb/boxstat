import { db } from "../db";
import { 
  notifications, 
  notificationPreferences, 
  pushSubscriptions,
  type Notification,
  type NotificationPreferences,
  type PushSubscription,
  type InsertNotification,
  type InsertNotificationPreferences,
  type InsertPushSubscription
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import webpush from "web-push";

// Configure web push with VAPID keys (should be in environment variables)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa40HEgfcQgdmUt_D4REvBPzq-RrftKUOvvhp_yOvMZkgUJGHk5Jb6s7j6vBpY";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "vXGl7jHHlh7p1v9cYxmVjmGQ6Gxi4l1fEUXwQ1yBUY8";

webpush.setVapidDetails(
  'mailto:notifications@uyp.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export class NotificationService {
  
  // ===== Push Subscription Management =====
  
  async subscribeToPush(userId: string, subscription: Omit<InsertPushSubscription, 'userId'>): Promise<void> {
    try {
      await db.insert(pushSubscriptions).values({
        userId,
        ...subscription
      }).onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
        set: {
          p256dhKey: subscription.p256dhKey,
          authKey: subscription.authKey,
          userAgent: subscription.userAgent,
          deviceType: subscription.deviceType,
          isActive: true,
          lastUsed: new Date()
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
      return preferences || null;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(userId: string, updates: Partial<InsertNotificationPreferences>): Promise<void> {
    try {
      // Build a set object that only includes fields that were actually provided
      const setFields: any = {
        updatedAt: new Date()
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
      if (updates.smsNotifications !== undefined) setFields.smsNotifications = updates.smsNotifications;
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
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [created] = await db.insert(notifications).values(notification).returning();
      
      // Immediately try to send push notification
      if (created) {
        await this.sendPushNotification(created);
      }
      
      return created;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  async sendPushNotification(notification: Notification): Promise<void> {
    try {
      // Check user preferences
      const preferences = await this.getNotificationPreferences(notification.userId);
      if (preferences && !preferences.pushNotifications) {
        return; // User has disabled push notifications
      }

      // Check if notification type is enabled
      if (preferences && !this.isNotificationTypeEnabled(notification.type, preferences)) {
        return;
      }

      // Check quiet hours
      if (preferences && this.isInQuietHours(preferences)) {
        return; // Don't send push during quiet hours
      }

      // Get user's push subscriptions
      const subscriptions = await db.select()
        .from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, notification.userId),
          eq(pushSubscriptions.isActive, true)
        ));

      if (subscriptions.length === 0) {
        return; // No active push subscriptions
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: `notification-${notification.id}`,
        data: {
          notificationId: notification.id,
          actionUrl: notification.actionUrl,
          ...notification.data
        },
        actions: notification.actionUrl ? [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ] : undefined
      });

      // Send to all user's devices
      const promises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey
            }
          }, payload);

          // Update last used timestamp
          await db.update(pushSubscriptions)
            .set({ lastUsed: new Date() })
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

      // Mark notification as push sent
      await db.update(notifications)
        .set({ 
          isPushSent: true,
          pushSentAt: new Date()
        })
        .where(eq(notifications.id, notification.id));

    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  private isNotificationTypeEnabled(type: string, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'event_rsvp_available': return preferences.eventRsvp ?? true;
      case 'event_checkin_available': return preferences.eventCheckin ?? true;
      case 'event_reminder': return preferences.eventReminders ?? true;
      case 'trophy_progress': return preferences.trophyProgress ?? true;
      case 'badge_earned': return preferences.badgeEarned ?? true;
      case 'training_reminder': return preferences.trainingReminders ?? true;
      case 'skills_evaluation': return preferences.skillsEvaluation ?? true;
      case 'improvement_recommendation': return preferences.improvementRecommendation ?? true;
      case 'payment_due': return preferences.paymentDue ?? true;
      case 'team_message': return preferences.teamMessages ?? true;
      // Coach-specific notifications
      case 'coach_team_update': return preferences.teamUpdates ?? true;
      case 'coach_event_change': return preferences.eventChanges ?? true;
      case 'coach_player_checkin': return preferences.playerCheckIn ?? true;
      case 'coach_player_rsvp': return preferences.playerRsvp ?? true;
      case 'coach_player_award': return preferences.playerAwards ?? true;
      case 'coach_player_progress': return preferences.playerProgress ?? true;
      default: return true;
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
    profileId?: string | null;
  } = {}): Promise<Notification[]> {
    try {
      const { limit = 20, offset = 0, unreadOnly = false, profileId } = options;
      
      // Build where conditions
      const conditions = [eq(notifications.userId, userId)];
      
      if (unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }
      
      // If profileId is provided, show only profile-specific AND user-general notifications
      // Profile-specific: notifications.profileId = profileId
      // User-general: notifications.profileId IS NULL
      if (profileId) {
        // Using OR condition via sql
        const query = db.select()
          .from(notifications)
          .where(and(
            eq(notifications.userId, userId),
            unreadOnly ? eq(notifications.isRead, false) : sql`true`,
            sql`(${notifications.profileId} = ${profileId} OR ${notifications.profileId} IS NULL)`
          ))
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset);
          
        return await query;
      } else {
        // No profile filter - show all user notifications
        return await db.select()
          .from(notifications)
          .where(and(...conditions))
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number, userId: string): Promise<void> {
    try {
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  async getUnreadCount(userId: string, profileId?: string | null): Promise<number> {
    try {
      if (profileId) {
        // Count profile-specific AND user-general unread notifications
        const [result] = await db.select({ count: sql<number>`COUNT(*)` })
          .from(notifications)
          .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
            sql`(${notifications.profileId} = ${profileId} OR ${notifications.profileId} IS NULL)`
          ));
        return result?.count || 0;
      } else {
        // Count all unread notifications for user
        const [result] = await db.select({ count: sql<number>`COUNT(*)` })
          .from(notifications)
          .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          ));
        return result?.count || 0;
      }
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // ===== Notification Triggers =====
  
  async notifyEventRSVPAvailable(userId: string, eventId: number, eventTitle: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'event_rsvp_available',
      title: 'RSVP Now Available',
      message: `You can now RSVP for "${eventTitle}"`,
      priority: 'normal',
      actionUrl: `/events/${eventId}`,
      data: { eventId, eventTitle },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
    });
  }

  async notifyEventCheckInAvailable(userId: string, eventId: number, eventTitle: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'event_checkin_available',
      title: 'Check-in Available',
      message: `You can now check in to "${eventTitle}"`,
      priority: 'high',
      actionUrl: `/events/${eventId}/checkin`,
      data: { eventId, eventTitle },
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // Expires in 2 hours
    });
  }

  async notifyEventReminder(userId: string, eventId: number, eventTitle: string, timeUntil: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'event_reminder',
      title: 'Event Reminder',
      message: `"${eventTitle}" starts ${timeUntil}`,
      priority: 'normal',
      actionUrl: `/events/${eventId}`,
      data: { eventId, eventTitle, timeUntil }
    });
  }

  async notifyBadgeEarned(userId: string, badgeName: string, badgeDescription: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'badge_earned',
      title: 'Badge Earned! 🏆',
      message: `You earned the ${badgeName} badge! ${badgeDescription}`,
      priority: 'high',
      actionUrl: '/trophies-badges',
      data: { badgeName, badgeDescription }
    });
  }

  async notifyTrophyProgress(userId: string, trophyName: string, progress: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'trophy_progress',
      title: 'Trophy Progress',
      message: `You're ${progress}% of the way to earning the ${trophyName} trophy!`,
      priority: 'normal',
      actionUrl: '/trophies-badges',
      data: { trophyName, progress }
    });
  }

  async notifyTrainingReminder(userId: string, programName: string, moduleTitle: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'training_reminder',
      title: 'Training Reminder',
      message: `Don't forget to complete "${moduleTitle}" in your ${programName} program`,
      priority: 'normal',
      actionUrl: '/training',
      data: { programName, moduleTitle }
    });
  }

  async notifySkillsEvaluation(userId: string, quarter: string, improvement: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'skills_evaluation',
      title: 'Skills Evaluation Complete',
      message: `Your ${quarter} evaluation is ready! ${improvement}`,
      priority: 'high',
      actionUrl: '/skills',
      data: { quarter, improvement }
    });
  }

  async notifyImprovementRecommendation(userId: string, recommendation: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'improvement_recommendation',
      title: 'Improvement Recommendation',
      message: recommendation,
      priority: 'normal',
      actionUrl: '/training',
      data: { recommendation }
    });
  }

  // ===== Coach-Specific Notification Triggers =====

  async notifyCoachTeamUpdate(coachUserId: string, playerName: string, teamName: string): Promise<void> {
    await this.createNotification({
      userId: coachUserId,
      type: 'coach_team_update',
      title: 'Team Roster Update',
      message: `${playerName} has joined ${teamName}`,
      priority: 'normal',
      actionUrl: '/coach-dashboard',
      data: { playerName, teamName }
    });
  }

  async notifyCoachEventChange(coachUserId: string, eventTitle: string, changeType: string): Promise<void> {
    await this.createNotification({
      userId: coachUserId,
      type: 'coach_event_change',
      title: 'Event Updated',
      message: `"${eventTitle}" has been ${changeType}`,
      priority: 'normal',
      actionUrl: '/calendar',
      data: { eventTitle, changeType }
    });
  }

  async notifyCoachPlayerCheckIn(coachUserId: string, playerName: string, eventTitle: string): Promise<void> {
    await this.createNotification({
      userId: coachUserId,
      type: 'coach_player_checkin',
      title: 'Player Check-In',
      message: `${playerName} checked in to "${eventTitle}"`,
      priority: 'normal',
      actionUrl: '/coach-dashboard',
      data: { playerName, eventTitle }
    });
  }

  async notifyCoachPlayerRSVP(coachUserId: string, playerName: string, eventTitle: string, status: string): Promise<void> {
    await this.createNotification({
      userId: coachUserId,
      type: 'coach_player_rsvp',
      title: 'Player RSVP',
      message: `${playerName} ${status} for "${eventTitle}"`,
      priority: 'normal',
      actionUrl: '/coach-dashboard',
      data: { playerName, eventTitle, status }
    });
  }

  async notifyCoachPlayerAward(coachUserId: string, playerName: string, awardName: string, awardType: string): Promise<void> {
    await this.createNotification({
      userId: coachUserId,
      type: 'coach_player_award',
      title: 'Player Achievement',
      message: `${playerName} earned ${awardType === 'badge' ? 'the' : 'a'} ${awardName} ${awardType}!`,
      priority: 'normal',
      actionUrl: '/coach-dashboard',
      data: { playerName, awardName, awardType }
    });
  }

  async notifyCoachPlayerProgress(coachUserId: string, playerName: string, progressDescription: string): Promise<void> {
    await this.createNotification({
      userId: coachUserId,
      type: 'coach_player_progress',
      title: 'Player Progress',
      message: `${playerName}: ${progressDescription}`,
      priority: 'normal',
      actionUrl: '/coach-dashboard',
      data: { playerName, progressDescription }
    });
  }
}

export const notificationService = new NotificationService();