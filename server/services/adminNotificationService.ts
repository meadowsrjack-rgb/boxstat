import { db } from "../db";
import { 
  users,
  notifications, 
  notificationRecipients,
  teams,
  divisions,
  teamMemberships,
  type InsertNotification,
  type SelectNotification,
  type InsertNotificationRecipient
} from "../../shared/schema";
import { eq, and, desc, sql, inArray, or, ne } from "drizzle-orm";
import { notificationService } from "./notificationService";
import { sendNotificationEmail } from "../email";

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

    console.log(`[Recipient Resolution] 🎯 Resolving recipients`);
    console.log(`[Recipient Resolution] Organization: ${organizationId}`);
    console.log(`[Recipient Resolution] Target: ${recipientTarget}`);
    console.log(`[Recipient Resolution] Options:`, JSON.stringify(options, null, 2));

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
          console.log(`[Recipient Resolution] Processing 'users' target`);
          console.log(`[Recipient Resolution] Requested user IDs:`, options.recipientUserIds);
          if (options.recipientUserIds && options.recipientUserIds.length > 0) {
            const validUsers = await db.select({ id: users.id })
              .from(users)
              .where(and(
                eq(users.organizationId, organizationId),
                inArray(users.id, options.recipientUserIds)
              ));
            
            console.log(`[Recipient Resolution] Found ${validUsers.length} valid users in org`);
            validUsers.forEach(u => {
              console.log(`[Recipient Resolution]   Adding user: ${u.id}`);
              userIds.add(u.id);
            });
            
            // Security: Don't report rejected user IDs or counts to prevent cross-tenant enumeration
            // Invalid users are silently filtered - no metadata leakage
          } else {
            console.log(`[Recipient Resolution] ⚠️ No recipientUserIds provided for 'users' target`);
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
          // Users in specific teams - using team_memberships table
          console.log(`[Recipient Resolution] Processing 'teams' target`);
          console.log(`[Recipient Resolution] Requested team IDs:`, options.recipientTeamIds);
          if (options.recipientTeamIds && options.recipientTeamIds.length > 0) {
            // Parse team IDs to integers since team_memberships.teamId is an integer column
            const teamIdInts = options.recipientTeamIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            console.log(`[Recipient Resolution] Parsed team IDs to integers:`, teamIdInts);
            
            if (teamIdInts.length > 0) {
              // Query team_memberships to find users (profile_id = user id)
              const teamMembers = await db.select({ 
                profileId: teamMemberships.profileId, 
                teamId: teamMemberships.teamId,
                role: teamMemberships.role
              })
                .from(teamMemberships)
                .where(and(
                  inArray(teamMemberships.teamId, teamIdInts),
                  eq(teamMemberships.status, 'active')
                ));
              
              console.log(`[Recipient Resolution] Found ${teamMembers.length} team memberships`);
              
              // Verify these profile IDs exist as users in the organization
              if (teamMembers.length > 0) {
                const profileIds = teamMembers.map(m => m.profileId);
                const validUsers = await db.select({ id: users.id })
                  .from(users)
                  .where(and(
                    eq(users.organizationId, organizationId),
                    inArray(users.id, profileIds)
                  ));
                
                console.log(`[Recipient Resolution] Found ${validUsers.length} valid users from team memberships`);
                validUsers.forEach(u => {
                  console.log(`[Recipient Resolution]   Adding user: ${u.id}`);
                  userIds.add(u.id);
                });
              }
            } else {
              console.log(`[Recipient Resolution] ⚠️ No valid team IDs after parsing`);
            }
          } else {
            console.log(`[Recipient Resolution] ⚠️ No recipientTeamIds provided for 'teams' target`);
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

      const resolvedUserIds = Array.from(userIds);
      console.log(`[Recipient Resolution] ✅ Final result: ${resolvedUserIds.length} recipients`);
      if (resolvedUserIds.length <= 10) {
        console.log(`[Recipient Resolution] User IDs:`, resolvedUserIds);
      }
      
      return {
        userIds: resolvedUserIds,
        skippedUsers
      };
    } catch (error) {
      console.error('[Recipient Resolution] ❌ Error resolving recipients:', error);
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
              // Look up user email and name for sending
              try {
                const [user] = await db.select({ 
                  email: users.email, 
                  firstName: users.firstName 
                })
                  .from(users)
                  .where(eq(users.id, userId))
                  .limit(1);
                
                if (user?.email) {
                  const emailResult = await sendNotificationEmail({
                    email: user.email,
                    firstName: user.firstName || '',
                    title: notification.title,
                    message: notification.message,
                  });
                  
                  if (emailResult.success) {
                    deliveryStatus.email = 'sent';
                    console.log(`[Admin Notification Delivery]   ✅ Email sent to ${user.email}`);
                  } else {
                    deliveryStatus.email = 'failed';
                    console.error(`[Admin Notification Delivery]   ❌ Email failed: ${emailResult.error}`);
                  }
                } else {
                  deliveryStatus.email = 'skipped';
                  console.log(`[Admin Notification Delivery]   ⏭️ No email address for user ${userId}`);
                }
              } catch (emailError) {
                deliveryStatus.email = 'failed';
                console.error(`[Admin Notification Delivery]   ❌ Email error:`, emailError);
              }
              break;

            case 'push':
              // Use existing push notification service - uses stored APNs environment for each device
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

  // Get all notifications (admin view) - excludes system-sent notifications
  async getAllNotifications(organizationId: string, options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}): Promise<SelectNotification[]> {
    try {
      const { limit = 50, offset = 0, status } = options;
      
      // Filter to only show manually sent notifications (exclude system-sent ones)
      const conditions = [
        eq(notifications.organizationId, organizationId),
        ne(notifications.sentBy, 'system')
      ];
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
