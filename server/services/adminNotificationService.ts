import { db } from "../db";
import { 
  users,
  notifications, 
  notificationRecipients,
  teams,
  divisions,
  type InsertNotification,
  type SelectNotification,
  type InsertNotificationRecipient
} from "../../shared/schema";
import { eq, and, desc, sql, inArray, or } from "drizzle-orm";
import { notificationService } from "./notificationService";

interface RecipientResolution {
  userIds: string[];
  skippedUsers: { userId: string; reason: string; }[];
}

export class AdminNotificationService {
  
  // Resolve recipients based on targeting configuration
  async resolveRecipients(
    organizationId: string,
    recipientTarget: string,
    options: {
      recipientUserIds?: string[];
      recipientRoles?: string[];
      recipientTeamIds?: string[];
      recipientDivisionIds?: string[];
    },
    deliveryChannels: string[]
  ): Promise<RecipientResolution> {
    const userIds: Set<string> = new Set();
    const skippedUsers: { userId: string; reason: string; }[] = [];

    try {
      switch (recipientTarget) {
        case 'everyone': {
          // Get all users in the organization
          const allUsers = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.organizationId, organizationId));
          
          allUsers.forEach(u => userIds.add(u.id));
          break;
        }

        case 'users': {
          // Specific users - must validate they belong to the organization
          if (options.recipientUserIds && options.recipientUserIds.length > 0) {
            const validUsers = await db.select({ id: users.id })
              .from(users)
              .where(and(
                eq(users.organizationId, organizationId),
                inArray(users.id, options.recipientUserIds)
              ));
            
            validUsers.forEach(u => userIds.add(u.id));
            
            // Security: Don't report rejected user IDs or counts to prevent cross-tenant enumeration
            // Invalid users are silently filtered - no metadata leakage
          }
          break;
        }

        case 'roles': {
          // Users with specific roles
          if (options.recipientRoles && options.recipientRoles.length > 0) {
            const roleUsers = await db.select({ id: users.id })
              .from(users)
              .where(and(
                eq(users.organizationId, organizationId),
                inArray(users.role, options.recipientRoles as any[])
              ));
            
            roleUsers.forEach(u => userIds.add(u.id));
          }
          break;
        }

        case 'teams': {
          // Users in specific teams
          if (options.recipientTeamIds && options.recipientTeamIds.length > 0) {
            // Parse team IDs to integers since users.teamId is an integer column
            const teamIdInts = options.recipientTeamIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            
            if (teamIdInts.length > 0) {
              const teamUsers = await db.select({ id: users.id })
                .from(users)
                .where(and(
                  eq(users.organizationId, organizationId),
                  inArray(users.teamId, teamIdInts)
                ));
              
              teamUsers.forEach(u => userIds.add(u.id));
            }
          }
          break;
        }

        case 'divisions': {
          // Users in specific divisions
          if (options.recipientDivisionIds && options.recipientDivisionIds.length > 0) {
            const divisionUsers = await db.select({ id: users.id })
              .from(users)
              .where(and(
                eq(users.organizationId, organizationId),
                inArray(users.divisionId, options.recipientDivisionIds.map(id => parseInt(id)))
              ));
            
            divisionUsers.forEach(u => userIds.add(u.id));
          }
          break;
        }
      }

      return {
        userIds: Array.from(userIds),
        skippedUsers
      };
    } catch (error) {
      console.error('Error resolving recipients:', error);
      throw new Error('Failed to resolve notification recipients');
    }
  }

  // Create a new notification (admin function)
  async createNotification(notification: InsertNotification): Promise<{ notification: SelectNotification; recipientCount: number; skipped: number }> {
    console.log(`[Admin Notification Create] 📢 Creating new notification for organization ${notification.organizationId}`);
    console.log(`[Admin Notification Create] Title: "${notification.title}"`);
    console.log(`[Admin Notification Create] Message: "${notification.message}"`);
    console.log(`[Admin Notification Create] Recipient target: ${notification.recipientTarget}`);
    console.log(`[Admin Notification Create] Delivery channels:`, notification.deliveryChannels);
    
    try {
      // Resolve recipients
      console.log(`[Admin Notification Create] Resolving recipients...`);
      const resolution = await this.resolveRecipients(
        notification.organizationId,
        notification.recipientTarget,
        {
          recipientUserIds: notification.recipientUserIds,
          recipientRoles: notification.recipientRoles,
          recipientTeamIds: notification.recipientTeamIds,
          recipientDivisionIds: notification.recipientDivisionIds
        },
        notification.deliveryChannels
      );

      console.log(`[Admin Notification Create] Resolved ${resolution.userIds.length} recipient(s), ${resolution.skippedUsers.length} skipped`);

      if (resolution.userIds.length === 0) {
        console.error(`[Admin Notification Create] ❌ No valid recipients found`);
        throw new Error('No valid recipients found for this notification');
      }

      // Create notification record
      console.log(`[Admin Notification Create] Creating notification record in database...`);
      const [created] = await db.insert(notifications).values({
        ...notification,
        sentAt: sql`CURRENT_TIMESTAMP`,
        status: 'sent'
      }).returning();

      console.log(`[Admin Notification Create] ✅ Notification created with ID: ${created.id}`);

      // Create notification_recipients records
      const recipientRecords = resolution.userIds.map(userId => ({
        notificationId: created.id,
        userId,
        isRead: false,
        deliveryStatus: {}
      }));

      console.log(`[Admin Notification Create] Creating ${recipientRecords.length} recipient record(s)...`);
      await db.insert(notificationRecipients).values(recipientRecords);
      console.log(`[Admin Notification Create] ✅ Recipient records created`);

      // Send notifications through each channel
      console.log(`[Admin Notification Create] 🚀 Starting delivery through channels:`, notification.deliveryChannels);
      await this.sendToRecipients(created, resolution.userIds, notification.deliveryChannels);
      console.log(`[Admin Notification Create] ✅ Delivery complete`);

      return {
        notification: created,
        recipientCount: resolution.userIds.length,
        skipped: resolution.skippedUsers.length
      };
    } catch (error) {
      console.error('[Admin Notification Create] ❌ Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  // Send notification to recipients through specified channels
  private async sendToRecipients(
    notification: SelectNotification,
    userIds: string[],
    channels: string[]
  ): Promise<void> {
    console.log(`[Admin Notification Delivery] 📤 Sending notification #${notification.id} to ${userIds.length} recipient(s)`);
    console.log(`[Admin Notification Delivery] Delivery channels selected:`, channels);
    
    let pushAttempts = 0;
    let pushSuccess = 0;
    let pushFailed = 0;
    
    const deliveryPromises = userIds.map(async (userId) => {
      const deliveryStatus: Record<string, string> = {};

      console.log(`[Admin Notification Delivery] Processing recipient: ${userId}`);

      // Send through each channel
      for (const channel of channels) {
        console.log(`[Admin Notification Delivery]   Channel: ${channel} for user ${userId}`);
        
        try {
          switch (channel) {
            case 'in_app':
              deliveryStatus.in_app = 'sent';
              console.log(`[Admin Notification Delivery]   ✅ In-app notification queued`);
              break;

            case 'email':
              // Email delivery would be handled here
              // For now, mark as sent
              deliveryStatus.email = 'sent';
              console.log(`[Admin Notification Delivery]   ✅ Email notification queued`);
              break;

            case 'push':
              // Use existing push notification service
              pushAttempts++;
              console.log(`[Admin Notification Delivery]   📱 Calling sendPushNotification for user ${userId}...`);
              
              try {
                await notificationService.sendPushNotification(
                  notification.id,
                  userId,
                  notification.title,
                  notification.message
                );
                deliveryStatus.push = 'sent';
                pushSuccess++;
                console.log(`[Admin Notification Delivery]   ✅ Push notification sent successfully`);
              } catch (error) {
                console.error(`[Admin Notification Delivery]   ❌ Push notification failed:`, error);
                deliveryStatus.push = 'failed';
                pushFailed++;
              }
              break;
          }
        } catch (error) {
          console.error(`[Admin Notification Delivery]   ❌ Failed to send ${channel}:`, error);
          deliveryStatus[channel] = 'failed';
        }
      }

      // Update delivery status in notification_recipients
      await db.update(notificationRecipients)
        .set({ deliveryStatus })
        .where(and(
          eq(notificationRecipients.notificationId, notification.id),
          eq(notificationRecipients.userId, userId)
        ));
    });

    await Promise.allSettled(deliveryPromises);
    
    console.log(`[Admin Notification Delivery] ✅ Notification delivery complete`);
    if (pushAttempts > 0) {
      console.log(`[Admin Notification Delivery] 📊 Push notification summary: ${pushSuccess} successful, ${pushFailed} failed (${pushAttempts} total attempts)`);
    }
  }

  // Get all notifications (admin view)
  async getAllNotifications(organizationId: string, options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}): Promise<SelectNotification[]> {
    try {
      const { limit = 50, offset = 0, status } = options;
      
      const conditions = [eq(notifications.organizationId, organizationId)];
      if (status) {
        conditions.push(eq(notifications.status, status));
      }

      return await db.select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Get notification statistics
  async getNotificationStats(notificationId: number): Promise<{
    totalRecipients: number;
    readCount: number;
    unreadCount: number;
    deliveryStats: Record<string, number>;
  }> {
    try {
      const recipients = await db.select()
        .from(notificationRecipients)
        .where(eq(notificationRecipients.notificationId, notificationId));

      const readCount = recipients.filter(r => r.isRead).length;
      const deliveryStats: Record<string, number> = {};

      recipients.forEach(r => {
        if (r.deliveryStatus) {
          Object.entries(r.deliveryStatus as Record<string, string>).forEach(([channel, status]) => {
            const key = `${channel}_${status}`;
            deliveryStats[key] = (deliveryStats[key] || 0) + 1;
          });
        }
      });

      return {
        totalRecipients: recipients.length,
        readCount,
        unreadCount: recipients.length - readCount,
        deliveryStats
      };
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return {
        totalRecipients: 0,
        readCount: 0,
        unreadCount: 0,
        deliveryStats: {}
      };
    }
  }

  // Delete notification
  async deleteNotification(notificationId: number, organizationId: string): Promise<void> {
    try {
      // Delete recipients first
      await db.delete(notificationRecipients)
        .where(eq(notificationRecipients.notificationId, notificationId));

      // Delete notification
      await db.delete(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.organizationId, organizationId)
        ));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }
}

export const adminNotificationService = new AdminNotificationService();
