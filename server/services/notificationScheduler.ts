import cron from 'node-cron';
import { storage } from '../storage';
import { notificationService } from './notificationService';
import { pushNotifications, resolveEventParticipants } from './pushNotificationHelper';
import { analyzePlayerAttendance, getOrgPlayers, getTeamCoachIds, getOrgAdminIds } from './attendanceTracker';
import type { Event } from '@shared/schema';
import { db } from '../db';
import { notifications, notificationRecipients, productEnrollments, products, users, teamMemberships, teams } from '@shared/schema';
import { eq, and, sql, lte, gte, gt, lt, inArray, isNotNull } from 'drizzle-orm';
import { adminNotificationService } from './adminNotificationService';

export class NotificationScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  // Helper to get all participants for an event based on assignTo targeting
  // Returns string user IDs (e.g., "1764873247759-aecinrbny")
  private async getEventParticipants(event: Event): Promise<string[]> {
    return resolveEventParticipants(event, storage);
  }

  start() {
    console.log('Starting notification scheduler...');
    
    // Process scheduled campaigns every minute
    const campaignProcessorJob = cron.schedule('* * * * *', async () => {
      await this.processScheduledCampaigns();
    }, {
      scheduled: false
    });
    
    this.jobs.set('campaignProcessor', campaignProcessorJob);
    
    // Check for upcoming events every 15 minutes
    const eventReminderJob = cron.schedule('*/15 * * * *', async () => {
      await this.processEventReminders();
    }, {
      scheduled: false
    });

    // Check for check-in availability every 5 minutes  
    const checkinAvailableJob = cron.schedule('*/5 * * * *', async () => {
      await this.processCheckInAvailability();
    }, {
      scheduled: false
    });
    
    // Check for RSVP window closing every 5 minutes
    const rsvpClosingJob = cron.schedule('*/5 * * * *', async () => {
      await this.processRsvpWindowClosing();
    }, {
      scheduled: false
    });

    const attendanceNotificationsJob = cron.schedule('0 8 * * *', async () => {
      await this.processAttendanceNotifications();
    }, {
      scheduled: false
    });

    const abandonedCartRemindersJob = cron.schedule('*/15 * * * *', async () => {
      await this.processAbandonedCartReminders();
    }, {
      scheduled: false
    });

    const enrollmentExpiryJob = cron.schedule('0 6 * * *', async () => {
      await this.processEnrollmentExpiry();
    }, {
      scheduled: false
    });

    const gracePeriodExpiryJob = cron.schedule('0 7 * * *', async () => {
      await this.processGracePeriodExpiry();
    }, {
      scheduled: false
    });

    const enrollmentExpiryWarningsJob = cron.schedule('0 9 * * *', async () => {
      await this.processEnrollmentExpiryWarnings();
    }, {
      scheduled: false
    });

    const missingLocationJob = cron.schedule('0 8 * * *', async () => {
      await this.processMissingLocationAlerts();
    }, {
      scheduled: false
    });

    const invitedClaimRemindersJob = cron.schedule('0 10 * * *', async () => {
      await this.processInvitedClaimReminders();
    }, {
      scheduled: false
    });
    this.jobs.set('invitedClaimReminders', invitedClaimRemindersJob);

    this.jobs.set('eventReminders', eventReminderJob);
    this.jobs.set('checkinAvailable', checkinAvailableJob);
    this.jobs.set('rsvpClosing', rsvpClosingJob);
    this.jobs.set('attendanceNotifications', attendanceNotificationsJob);
    this.jobs.set('abandonedCartReminders', abandonedCartRemindersJob);
    this.jobs.set('enrollmentExpiry', enrollmentExpiryJob);
    this.jobs.set('gracePeriodExpiry', gracePeriodExpiryJob);
    this.jobs.set('enrollmentExpiryWarnings', enrollmentExpiryWarningsJob);
    this.jobs.set('missingLocationAlerts', missingLocationJob);

    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`Started notification job: ${name}`);
    });
  }

  stop() {
    console.log('Stopping notification scheduler...');
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped notification job: ${name}`);
    });
    this.jobs.clear();
  }

  private async processEventReminders() {
    try {
      console.log('Processing event reminders...');
      
      // Get events happening in the next 24 hours
      const upcomingEvents = await storage.getUpcomingEventsWithinHours(24);
      console.log(`Found ${upcomingEvents.length} upcoming events within 24 hours`);
      
      for (const event of upcomingEvents) {
        const eventStart = new Date(event.startTime);
        const now = new Date();
        const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
        console.log(`Checking event: ${event.title} (ID: ${event.id}), hours until: ${hoursUntilEvent.toFixed(2)}`);
        
        // Send reminders at 24 hours, 2 hours, and 30 minutes before
        const reminderTimes = [24, 2, 0.5];
        
        for (const reminderHours of reminderTimes) {
          // Check if we're within the reminder window (tight tolerance matching 15-min cron interval)
          // For 24h reminder: trigger between 23.75-24.25 hours before
          // For 2h reminder: trigger between 1.75-2.25 hours before  
          // For 30min reminder: trigger between 25-35 minutes before
          const tolerance = reminderHours >= 24 ? 0.25 : (reminderHours >= 2 ? 0.25 : 0.17);
          if (hoursUntilEvent <= (reminderHours + tolerance) && hoursUntilEvent > (reminderHours - tolerance)) {
            
            let timeUntil = '';
            if (reminderHours >= 24) {
              timeUntil = 'in 1 day';
            } else if (reminderHours >= 2) {
              timeUntil = `in ${Math.round(reminderHours)} hours`;
            } else {
              timeUntil = 'in 30 minutes';
            }

            const participantIds = await this.getEventParticipants(event);
            console.log(`  Found ${participantIds.length} participants for reminder ${reminderHours}h: ${participantIds.join(', ')}`);
            
            const dedupWindowMinutes = reminderHours >= 24 ? 720 : (reminderHours >= 2 ? 120 : 60);
            
            for (const memberId of participantIds) {
              const alreadySent = await notificationService.hasRecentNotification(
                memberId.toString(),
                'event_reminder',
                event.id,
                dedupWindowMinutes
              );

              if (!alreadySent) {
                await notificationService.notifyEventReminder(
                  memberId,
                  event.id,
                  event.title,
                  timeUntil
                );
              } else {
                console.log(`  Skipping duplicate reminder for user ${memberId}, event ${event.id}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing event reminders:', error);
    }
  }

  private async processCheckInAvailability() {
    try {
      console.log('Processing check-in availability notifications...');
      
      // Get events happening in the next 2 hours
      const upcomingEvents = await storage.getUpcomingEventsWithinHours(2);
      
      for (const event of upcomingEvents) {
        const eventStart = new Date(event.startTime);
        const now = new Date();
        const minutesUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60);
        
        // Notify about check-in availability 30 minutes before event starts
        if (minutesUntilEvent <= 30 && minutesUntilEvent > 25) {
          const participantIds = await this.getEventParticipants(event);
          
          for (const memberId of participantIds) {
            // Check if user already has a check-in for this event
            const existingCheckin = await storage.getAttendance(event.id.toString(), memberId.toString());
            const hasCheckedIn = !!existingCheckin?.checkedInAt;
            
            if (!hasCheckedIn) {
              const alreadySent = await notificationService.hasRecentNotification(
                memberId.toString(),
                'event_checkin_available',
                event.id,
                60
              );

              if (!alreadySent) {
                await notificationService.notifyEventCheckInAvailable(
                  memberId,
                  event.id,
                  event.title
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing check-in availability notifications:', error);
    }
  }

  // Manual trigger for testing
  async triggerEventReminders() {
    await this.processEventReminders();
  }

  async triggerCheckInNotifications() {
    await this.processCheckInAvailability();
  }
  
  async triggerRsvpClosingNotifications() {
    await this.processRsvpWindowClosing();
  }
  
  private async processRsvpWindowClosing() {
    try {
      console.log('Processing RSVP window closing notifications...');
      
      // Get events happening in the next 2 hours
      const upcomingEvents = await storage.getUpcomingEventsWithinHours(2);
      
      for (const event of upcomingEvents) {
        const eventStart = new Date(event.startTime);
        const now = new Date();
        const minutesUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60);
        
        // Notify when RSVP window closes soon (30 minutes before it closes)
        // Default: RSVP closes 30 min before event, so notify at ~60 min before event
        // This gives users 30 min warning that RSVP is about to close
        if (minutesUntilEvent <= 60 && minutesUntilEvent > 55) {
          const participantIds = await this.getEventParticipants(event);
          
          for (const memberId of participantIds) {
            // Check if user has already responded via the RSVP responses table
            const rsvpResponse = await storage.getRsvpResponseByUserAndEvent(memberId.toString(), event.id);
            
            if (!rsvpResponse || rsvpResponse.response === 'no_response') {
              const alreadySent = await notificationService.hasRecentNotification(
                memberId.toString(),
                'event_rsvp_closing',
                event.id,
                120
              );

              if (!alreadySent) {
                await notificationService.notifyRsvpClosing(
                  memberId,
                  event.id,
                  event.title,
                  '30 minutes'
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing RSVP window closing notifications:', error);
    }
  }
  
  // Process scheduled notification campaigns
  private async processScheduledCampaigns() {
    try {
      const now = new Date().toISOString();
      const pendingCampaigns = await storage.getPendingCampaigns(now);
      
      for (const campaign of pendingCampaigns) {
        console.log(`Processing scheduled campaign: ${campaign.id} - ${campaign.title}`);
        
        let runId: number | null = null;
        
        try {
          // Create a campaign run record
          const run = await storage.createCampaignRun({
            campaignId: campaign.id,
            scheduledAt: campaign.nextRunAt || now,
            status: 'executing',
          });
          runId = run.id;
          
          // Resolve recipients based on targeting
          const recipients = await this.resolveRecipients(
            campaign.organizationId,
            campaign.recipientTarget,
            campaign.recipientUserIds || [],
            campaign.recipientRoles || [],
            campaign.recipientTeamIds || [],
            campaign.recipientDivisionIds || [],
            campaign.recipientProgramIds || []
          );
          
          let successCount = 0;
          let failureCount = 0;
          
          // Determine if this campaign includes message type (direct messages)
          const campaignTypes: string[] = Array.isArray(campaign.types) ? campaign.types as string[] : [];
          const hasMessageType = campaignTypes.includes('message');
          const hasNotificationType = campaignTypes.includes('announcement') || campaignTypes.includes('notification');

          // Send to each recipient
          for (const userId of recipients) {
            try {
              // Send direct contact-management message if message type is included
              if (hasMessageType) {
                const recipientUser = await storage.getUser(userId);
                if (recipientUser) {
                  const existingMessages = await storage.getContactManagementMessagesBySender(userId);
                  const existingThread = existingMessages.find((m: any) => !m.parentMessageId);

                  let parentMessageId: number;
                  if (existingThread) {
                    parentMessageId = existingThread.id;
                  } else {
                    const recipientName = `${recipientUser.firstName} ${recipientUser.lastName}`;
                    const threadStarter = await storage.createContactManagementMessage({
                      organizationId: campaign.organizationId,
                      senderId: userId,
                      senderName: recipientName,
                      senderEmail: recipientUser.email || null,
                      message: `Conversation with ${recipientName}`,
                      isAdmin: false,
                    });
                    parentMessageId = threadStarter.id;
                  }

                  await storage.createContactManagementMessage({
                    organizationId: campaign.organizationId,
                    senderId: campaign.createdBy || campaign.organizationId,
                    senderName: 'Admin',
                    senderEmail: null,
                    message: campaign.message,
                    parentMessageId,
                    isAdmin: true,
                  });

                  // Send push notification to match admin-initiate route behavior
                  try {
                    const org = await storage.getOrganization(campaign.organizationId);
                    const orgName = org?.name || 'Your Organization';
                    const recipientRole = recipientUser.role || 'parent';
                    const targetUrl = recipientRole === 'admin'
                      ? '/admin-dashboard?tab=communications&subtab=messages'
                      : '/home?tab=messages';
                    await adminNotificationService.createNotification({
                      organizationId: campaign.organizationId,
                      types: ['message'],
                      title: `New message from ${orgName}`,
                      message: `Admin: ${campaign.message.substring(0, 80)}${campaign.message.length > 80 ? '...' : ''}`,
                      recipientTarget: 'users',
                      recipientUserIds: [userId],
                      deliveryChannels: ['push'],
                      sentBy: campaign.createdBy || campaign.organizationId,
                      status: 'sent',
                    }, { url: targetUrl });
                  } catch (notifError: any) {
                    console.error(`⚠️ Scheduled message push notification failed for user ${userId} (non-fatal):`, notifError.message);
                  }
                }
              }

              // Send notification if announcement/notification type is included
              if (hasNotificationType || !hasMessageType) {
                await notificationService.sendMultiChannelNotification({
                  userId,
                  title: campaign.title,
                  message: campaign.message,
                  type: 'campaign',
                  data: { campaignId: campaign.id },
                  channels: campaign.deliveryChannels as Array<'in_app' | 'push' | 'email'>,
                  apnsEnvironment: campaign.apnsEnvironment as 'sandbox' | 'production' | undefined,
                });
              }

              successCount++;
            } catch (err) {
              console.error(`Failed to send campaign notification to user ${userId}:`, err);
              failureCount++;
            }
          }
          
          // Update campaign run with results
          await storage.updateCampaignRun(run.id, {
            status: 'completed',
            executedAt: new Date().toISOString(),
            recipientCount: recipients.length,
            successCount,
            failureCount,
          });
          
          // Calculate next run time for recurring campaigns
          let nextRunAt: string | null = null;
          if (campaign.scheduleType === 'recurring' && campaign.recurrenceFrequency) {
            nextRunAt = this.calculateNextRun(campaign);
          }
          
          // Update campaign status
          await storage.updateNotificationCampaign(campaign.id, {
            lastRunAt: new Date().toISOString(),
            totalRuns: (campaign.totalRuns || 0) + 1,
            nextRunAt: nextRunAt || undefined,
            status: nextRunAt ? 'active' : 'completed',
          });
          
          console.log(`Campaign ${campaign.id} sent to ${recipients.length} recipients (${successCount} success, ${failureCount} failed)`);
          
        } catch (campaignError) {
          console.error(`Error processing campaign ${campaign.id}:`, campaignError);
          
          // Mark the campaign run and campaign as failed
          try {
            // Update the run record if we created one
            if (runId !== null) {
              await storage.updateCampaignRun(runId, {
                status: 'failed',
                executedAt: new Date().toISOString(),
              });
            }
            
            // Update campaign status to reflect error
            await storage.updateNotificationCampaign(campaign.id, {
              status: 'failed',
            });
          } catch (updateError) {
            console.error(`Failed to update campaign ${campaign.id} status to failed:`, updateError);
          }
          // Don't fail other campaigns
        }
      }
    } catch (error) {
      console.error('Error in processScheduledCampaigns:', error);
    }
  }
  
  // Resolve recipient user IDs based on targeting configuration
  private async resolveRecipients(
    organizationId: string,
    recipientTarget: string,
    userIds: string[],
    roles: string[],
    teamIds: string[],
    divisionIds: string[],
    programIds: string[]
  ): Promise<string[]> {
    const recipientSet = new Set<string>();
    
    try {
      if (recipientTarget === 'everyone') {
        // Get all users in org
        const allUsers = await storage.getUsersByOrganization(organizationId);
        allUsers.forEach(u => recipientSet.add(u.id));
      } else if (recipientTarget === 'users' && userIds.length > 0) {
        userIds.forEach(id => recipientSet.add(id));
      } else if (recipientTarget === 'roles' && roles.length > 0) {
        for (const role of roles) {
          const roleUsers = await storage.getUsersByRole(organizationId, role);
          roleUsers.forEach(u => recipientSet.add(u.id));
        }
      } else if (recipientTarget === 'teams' && teamIds.length > 0) {
        for (const teamId of teamIds) {
          const teamMembers = await storage.getUsersByTeam(teamId);
          teamMembers.forEach(u => recipientSet.add(u.id));
        }
      }
      // TODO: Add division and program targeting
    } catch (error) {
      console.error('Error resolving recipients:', error);
    }
    
    return Array.from(recipientSet);
  }
  
  // Calculate the next run time for recurring campaigns
  private calculateNextRun(campaign: any): string | null {
    const now = new Date();
    const lastRun = campaign.lastRunAt ? new Date(campaign.lastRunAt) : now;
    const interval = campaign.recurrenceInterval || 1;
    
    let nextRun: Date;
    
    switch (campaign.recurrenceFrequency) {
      case 'daily':
        nextRun = new Date(lastRun);
        nextRun.setDate(nextRun.getDate() + interval);
        break;
      case 'weekly':
        nextRun = new Date(lastRun);
        nextRun.setDate(nextRun.getDate() + (interval * 7));
        break;
      case 'monthly':
        nextRun = new Date(lastRun);
        nextRun.setMonth(nextRun.getMonth() + interval);
        break;
      default:
        return null;
    }
    
    // Check end conditions
    if (campaign.recurrenceEndDate && nextRun > new Date(campaign.recurrenceEndDate)) {
      return null;
    }
    
    if (campaign.recurrenceEndAfterOccurrences && 
        (campaign.totalRuns || 0) + 1 >= campaign.recurrenceEndAfterOccurrences) {
      return null;
    }
    
    // Set the time if specified
    if (campaign.recurrenceTime) {
      const [hours, minutes] = campaign.recurrenceTime.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    }
    
    return nextRun.toISOString();
  }
  
  private async hasRecentAttendanceNotification(userId: string, titlePattern: string, withinDays: number): Promise<boolean> {
    try {
      const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
      const results = await db.select({ id: notifications.id })
        .from(notifications)
        .innerJoin(notificationRecipients, eq(notificationRecipients.notificationId, notifications.id))
        .where(and(
          eq(notificationRecipients.userId, userId),
          sql`${notifications.title} = ${titlePattern}`,
          sql`${notifications.createdAt} >= ${cutoff}`
        ))
        .limit(1);
      return results.length > 0;
    } catch {
      return false;
    }
  }

  private async processAttendanceNotifications() {
    try {
      const allOrgs = await storage.getAllOrganizations();

      for (const org of allOrgs) {
        const players = await getOrgPlayers(org.id);
        const adminIds = await getOrgAdminIds(org.id);
        let playersWithMissStreak3Plus = 0;

        for (const player of players) {
          try {
            const analysis = await analyzePlayerAttendance(player.id, org.id);
            if (!analysis) continue;

            const { streak, playerName, parentId, teamIds, isPerfectMonth, isPerfectPracticeMonth } = analysis;

            // --- Missed streak notifications ---
            if (streak <= -2) {
              const missCount = Math.abs(streak);
              const missThresholds = [2, 3, 5, 7];
              const matchedThreshold = missThresholds.filter(t => missCount >= t).pop();
              if (matchedThreshold) {
                if (missCount >= 3) playersWithMissStreak3Plus++;

                const playerTitle = missCount === 2 ? "💪 Get Back in the Grind!" :
                  missCount === 3 ? "⚠️ 3 Events Missed" :
                  missCount === 5 ? "😟 We Miss You!" : "🚨 Time to Come Back";

                if (!(await this.hasRecentAttendanceNotification(player.id, playerTitle, 7))) {
                  await pushNotifications.playerMissedStreak(storage, player.id, matchedThreshold);

                  if (parentId) {
                    const parentThresholds = [2, 3, 5, 7];
                    const parentMatch = parentThresholds.filter(t => missCount >= t).pop();
                    if (parentMatch) {
                      await pushNotifications.parentPlayerMissedStreak(storage, parentId, playerName, parentMatch);
                    }
                  }

                  if (missCount >= 2) {
                    const coachIds = await getTeamCoachIds(teamIds);
                    for (const coachId of coachIds) {
                      const coachThresholds = [2, 3, 5, 7];
                      const coachMatch = coachThresholds.filter(t => missCount >= t).pop();
                      if (coachMatch) {
                        await pushNotifications.coachPlayerMissedStreak(storage, coachId, playerName, coachMatch);
                      }
                    }
                  }

                  if (missCount >= 3) {
                    const adminThresholds = [3, 5, 7];
                    const adminMatch = adminThresholds.filter(t => missCount >= t).pop();
                    if (adminMatch) {
                      for (const adminId of adminIds) {
                        await pushNotifications.adminPlayerMissedStreak(storage, adminId, playerName, adminMatch);
                      }
                    }
                  }
                }
              }
            }

            // --- Attend streak notifications ---
            if (streak >= 3) {
              const streakThresholds = [3, 5, 10, 15, 20];
              const matchedStreak = streakThresholds.filter(t => streak >= t).pop();
              if (matchedStreak && streak === matchedStreak) {
                const streakTitle = streak === 3 ? "🔥 3 in a Row!" :
                  streak === 5 ? "🔥 5-Event Streak!" :
                  streak === 10 ? "🏆 10-Event Streak!" : "👑 Unstoppable!";

                if (!(await this.hasRecentAttendanceNotification(player.id, streakTitle, 7))) {
                  await pushNotifications.playerAttendStreak(storage, player.id, streak);

                  if (parentId) {
                    await pushNotifications.parentPlayerAttendStreak(storage, parentId, playerName, streak);
                  }

                  if (streak >= 5) {
                    const coachIds = await getTeamCoachIds(teamIds);
                    for (const coachId of coachIds) {
                      await pushNotifications.coachPlayerAttendStreak(storage, coachId, playerName, streak);
                    }
                  }

                  if (streak >= 10) {
                    for (const adminId of adminIds) {
                      await pushNotifications.adminPlayerAttendStreak(storage, adminId, playerName, streak);
                    }
                  }
                }
              }
            }

            // --- Perfect month notifications (check on days 28-31) ---
            const dayOfMonth = new Date().getDate();
            if (dayOfMonth >= 28 && isPerfectMonth && analysis.eventsThisMonth >= 3) {
              const monthName = new Date().toLocaleString('default', { month: 'long' });
              if (!(await this.hasRecentAttendanceNotification(player.id, "⭐ Perfect Month!", 30))) {
                await pushNotifications.playerPerfectMonth(storage, player.id, monthName);
                if (parentId) {
                  await pushNotifications.parentPlayerPerfectMonth(storage, parentId, playerName, monthName);
                }
                const coachIds = await getTeamCoachIds(teamIds);
                for (const coachId of coachIds) {
                  await pushNotifications.coachPlayerPerfectMonth(storage, coachId, playerName, monthName);
                }
                for (const adminId of adminIds) {
                  await pushNotifications.adminPlayerPerfectMonth(storage, adminId, playerName, monthName);
                }
              }
            }

            // --- Perfect practice month (coach only) ---
            if (dayOfMonth >= 28 && isPerfectPracticeMonth && analysis.practicesThisMonth >= 2) {
              const monthName = new Date().toLocaleString('default', { month: 'long' });
              const coachIds = await getTeamCoachIds(teamIds);
              for (const coachId of coachIds) {
                if (!(await this.hasRecentAttendanceNotification(coachId, "🤝 Handshake-Worthy!", 30))) {
                  await pushNotifications.coachPlayerPerfectPracticeMonth(storage, coachId, playerName, monthName);
                }
              }
            }

          } catch (playerError) {
            console.error(`Error processing attendance for player ${player.id}:`, playerError);
          }
        }

        // --- Admin: multiple players missing ---
        if (playersWithMissStreak3Plus >= 3) {
          for (const adminId of adminIds) {
            if (!(await this.hasRecentAttendanceNotification(adminId, "📊 Attendance Report", 7))) {
              await pushNotifications.adminMultiplePlayersMissing(storage, adminId, playersWithMissStreak3Plus);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing attendance notifications:', error);
    }
  }

  private async processAbandonedCartReminders() {
    try {
      const pendingCarts = await storage.getPendingAbandonedCarts();
      const now = Date.now();
      const HOUR_MS = 1000 * 60 * 60;

      for (const cart of pendingCarts) {
        try {
          const createdAt = new Date(cart.createdAt!).getTime();
          const ageHours = (now - createdAt) / HOUR_MS;
          const remindersSent = cart.remindersSent || 0;
          const lastReminderAt = cart.lastReminderAt ? new Date(cart.lastReminderAt).getTime() : 0;
          const hoursSinceLastReminder = lastReminderAt ? (now - lastReminderAt) / HOUR_MS : Infinity;

          if (remindersSent === 0 && ageHours >= 1) {
            await pushNotifications.cartReminder1Hour(storage, cart.userId, cart.productName || 'your item', cart.playerName || undefined);
            await storage.updateAbandonedCartReminder(cart.id, 1);
          } else if (remindersSent === 1 && ageHours >= 24 && hoursSinceLastReminder >= 12) {
            await pushNotifications.cartReminder24Hours(storage, cart.userId, cart.productName || 'your item', cart.playerName || undefined);
            await storage.updateAbandonedCartReminder(cart.id, 2);
          } else if (remindersSent === 2 && ageHours >= 72 && hoursSinceLastReminder >= 24) {
            await pushNotifications.cartReminder3Days(storage, cart.userId, cart.productName || 'your item', cart.playerName || undefined);
            await storage.updateAbandonedCartReminder(cart.id, 3);
          }
        } catch (cartError) {
          console.error(`Error processing abandoned cart ${cart.id}:`, cartError);
        }
      }
    } catch (error) {
      console.error('Error processing abandoned cart reminders:', error);
    }
  }

  private async processEnrollmentExpiry() {
    try {
      console.log('[Enrollment Expiry] Checking for expired enrollments...');
      const now = new Date();

      const expiredEnrollments = await db.select({
        enrollment: productEnrollments,
        programName: products.name,
        profileFirstName: users.firstName,
        profileLastName: users.lastName,
        profileEmail: users.email,
      })
        .from(productEnrollments)
        .leftJoin(products, eq(productEnrollments.programId, products.id))
        .leftJoin(users, eq(productEnrollments.profileId, users.id))
        .where(
          and(
            eq(productEnrollments.status, 'active'),
            lte(productEnrollments.endDate, now.toISOString())
          )
        );

      console.log(`[Enrollment Expiry] Found ${expiredEnrollments.length} expired enrollments`);

      for (const row of expiredEnrollments) {
        try {
          const orgId = row.enrollment.organizationId;
          const programName = row.programName || 'Unknown Program';
          const userName = `${row.profileFirstName || ''} ${row.profileLastName || ''}`.trim() || 'A member';
          const profileId = row.enrollment.profileId;

          // Task #243: Unpaid admin_assignment grants skip the grace period.
          // When their pay-by deadline passes with no payment attached, expire
          // them directly so members-only access is revoked immediately.
          const isUnpaidAdminGrant = row.enrollment.source === 'admin_assignment'
            && !row.enrollment.paymentId
            && !row.enrollment.stripeSubscriptionId;
          if (isUnpaidAdminGrant) {
            await db.update(productEnrollments)
              .set({ status: 'expired', updatedAt: now.toISOString() })
              .where(eq(productEnrollments.id, row.enrollment.id));
            console.log(`[Enrollment Expiry] Unpaid admin_assignment enrollment ${row.enrollment.id} for ${userName} in ${programName} expired directly (skipped grace period)`);
            continue;
          }

          // Post-expiry grace window is fixed at 14 days platform-wide.
          // The organizations.gracePeriodDays column is deprecated and no longer read.
          const gracePeriodDays = 14;

          // Transition to grace_period instead of expired
          const gracePeriodEndDate = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
          await db.update(productEnrollments)
            .set({
              status: 'grace_period',
              gracePeriodEndDate: gracePeriodEndDate.toISOString(),
              updatedAt: now.toISOString(),
            })
            .where(eq(productEnrollments.id, row.enrollment.id));

          // Mark team memberships as 'restricted' so downstream server-side gates reflect limited access.
          // For family-wide enrollments (profileId=null), resolve all child profiles under the account holder.
          try {
            const programId = row.enrollment.programId;
            const programTeams = await db.select({ id: teams.id })
              .from(teams)
              .where(eq(teams.programId, programId));
            const programTeamIds = programTeams.map(t => t.id);
            if (programTeamIds.length > 0) {
              let affectedProfileIds: string[] = profileId ? [profileId] : [];
              if (!profileId && row.enrollment.accountHolderId) {
                // Family-wide: restrict all child profiles under the account holder
                const childProfiles = await db.select({ id: users.id })
                  .from(users)
                  .where(
                    and(
                      or(
                        eq(users.accountHolderId, row.enrollment.accountHolderId),
                        eq(users.parentId, row.enrollment.accountHolderId)
                      ),
                      eq(users.isActive, true)
                    )
                  );
                affectedProfileIds = childProfiles.map(c => c.id);
              }
              if (affectedProfileIds.length > 0) {
                await db.update(teamMemberships)
                  .set({ status: 'restricted' })
                  .where(
                    and(
                      inArray(teamMemberships.profileId, affectedProfileIds),
                      inArray(teamMemberships.teamId, programTeamIds)
                    )
                  );
                console.log(`[Enrollment Expiry] Marked program team memberships as restricted for profiles [${affectedProfileIds.join(', ')}] (program: ${programId})`);
              }
            }
          } catch (membershipError) {
            console.error(`[Enrollment Expiry] Failed to restrict team memberships for enrollment ${row.enrollment.id}:`, membershipError);
          }

          const userTargetIds = [profileId, row.enrollment.accountHolderId].filter(Boolean) as string[];
          const uniqueUserIds = [...new Set(userTargetIds)];

          const dedupTitle = `[system:grace-start-${row.enrollment.id}] Enrollment grace period started`;

          const existingNotif = await db.select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.organizationId, orgId),
                eq(notifications.title, dedupTitle)
              )
            )
            .limit(1);

          if (uniqueUserIds.length > 0 && existingNotif.length === 0) {
            try {
              await adminNotificationService.createNotification({
                organizationId: orgId,
                types: ['notification'],
                title: dedupTitle,
                message: `Your enrollment in ${programName} has expired. You have ${gracePeriodDays} days of limited access remaining. Re-enroll through BoxStat to restore full access.`,
                recipientTarget: 'users',
                recipientUserIds: uniqueUserIds,
                deliveryChannels: ['in_app', 'push'],
                sentBy: 'system',
                status: 'sent',
              });
            } catch (notifError) {
              console.error(`[Enrollment Expiry] Failed to notify user for enrollment ${row.enrollment.id}:`, notifError);
            }
          }

          const adminIds = await getOrgAdminIds(orgId);
          if (adminIds.length > 0) {
            try {
              await adminNotificationService.createNotification({
                organizationId: orgId,
                types: ['notification'],
                title: `Grace Period Started: ${userName}`,
                message: `${userName}'s enrollment in ${programName} has expired. They have ${gracePeriodDays} days of limited access before team memberships are removed.`,
                recipientTarget: 'users',
                recipientUserIds: adminIds,
                deliveryChannels: ['in_app'],
                sentBy: 'system',
                status: 'sent',
              });
            } catch (notifError) {
              console.error(`[Enrollment Expiry] Failed to notify admins for enrollment ${row.enrollment.id}:`, notifError);
            }
          }

          console.log(`[Enrollment Expiry] Enrollment ${row.enrollment.id} for ${userName} in ${programName} entered grace period (${gracePeriodDays} days)`);
        } catch (enrollError) {
          console.error(`[Enrollment Expiry] Error processing enrollment ${row.enrollment.id}:`, enrollError);
        }
      }
    } catch (error) {
      console.error('[Enrollment Expiry] Error:', error);
    }
  }

  private async processGracePeriodExpiry() {
    try {
      console.log('[Grace Period Expiry] Checking for enrollments past grace period...');
      const now = new Date();

      const expiredGracePeriods = await db.select({
        enrollment: productEnrollments,
        programName: products.name,
        profileFirstName: users.firstName,
        profileLastName: users.lastName,
      })
        .from(productEnrollments)
        .leftJoin(products, eq(productEnrollments.programId, products.id))
        .leftJoin(users, eq(productEnrollments.profileId, users.id))
        .where(
          and(
            eq(productEnrollments.status, 'grace_period'),
            lte(productEnrollments.gracePeriodEndDate, now.toISOString())
          )
        );

      console.log(`[Grace Period Expiry] Found ${expiredGracePeriods.length} enrollments past grace period`);

      for (const row of expiredGracePeriods) {
        try {
          await db.update(productEnrollments)
            .set({ status: 'expired', updatedAt: now.toISOString() })
            .where(eq(productEnrollments.id, row.enrollment.id));

          const orgId = row.enrollment.organizationId;
          const programName = row.programName || 'Unknown Program';
          const userName = `${row.profileFirstName || ''} ${row.profileLastName || ''}`.trim() || 'A member';
          const profileId = row.enrollment.profileId;

          // Remove team memberships for teams linked to the expired program.
          // For family-wide enrollments (profileId=null), resolve all child profiles under the account holder.
          try {
            const programId = row.enrollment.programId;
            const programTeams = await db.select({ id: teams.id })
              .from(teams)
              .where(eq(teams.programId, programId));
            const programTeamIds = programTeams.map(t => t.id);
            if (programTeamIds.length > 0) {
              let removalProfileIds: string[] = profileId ? [profileId] : [];
              if (!profileId && row.enrollment.accountHolderId) {
                const childProfiles = await db.select({ id: users.id })
                  .from(users)
                  .where(
                    and(
                      or(
                        eq(users.accountHolderId, row.enrollment.accountHolderId),
                        eq(users.parentId, row.enrollment.accountHolderId)
                      ),
                      eq(users.isActive, true)
                    )
                  );
                removalProfileIds = childProfiles.map(c => c.id);
              }
              if (removalProfileIds.length > 0) {
                await db.delete(teamMemberships)
                  .where(
                    and(
                      inArray(teamMemberships.profileId, removalProfileIds),
                      inArray(teamMemberships.teamId, programTeamIds)
                    )
                  );
                console.log(`[Grace Period Expiry] Removed program team memberships for profiles [${removalProfileIds.join(', ')}] (program: ${programId})`);
              }
            }
          } catch (membershipError) {
            console.error(`[Grace Period Expiry] Failed to remove team memberships for enrollment ${row.enrollment.id}:`, membershipError);
          }

          const userTargetIds = [profileId, row.enrollment.accountHolderId].filter(Boolean) as string[];
          const uniqueUserIds = [...new Set(userTargetIds)];

          if (uniqueUserIds.length > 0) {
            try {
              await adminNotificationService.createNotification({
                organizationId: orgId,
                types: ['notification'],
                title: `${programName} Enrollment Expired`,
                message: `Your grace period for ${programName} has ended. You have been unenrolled. Re-enroll through BoxStat to continue.`,
                recipientTarget: 'users',
                recipientUserIds: uniqueUserIds,
                deliveryChannels: ['in_app', 'push'],
                sentBy: 'system',
                status: 'sent',
              });
            } catch (notifError) {
              console.error(`[Grace Period Expiry] Failed to notify user for enrollment ${row.enrollment.id}:`, notifError);
            }
          }

          const adminIds = await getOrgAdminIds(orgId);
          if (adminIds.length > 0) {
            try {
              await adminNotificationService.createNotification({
                organizationId: orgId,
                types: ['notification'],
                title: `Enrollment Fully Expired: ${userName}`,
                message: `${userName}'s grace period for ${programName} has ended. They have been automatically unenrolled.`,
                recipientTarget: 'users',
                recipientUserIds: adminIds,
                deliveryChannels: ['in_app', 'push'],
                sentBy: 'system',
                status: 'sent',
              });
            } catch (notifError) {
              console.error(`[Grace Period Expiry] Failed to notify admins for enrollment ${row.enrollment.id}:`, notifError);
            }
          }

          console.log(`[Grace Period Expiry] Fully expired enrollment ${row.enrollment.id} for ${userName} in ${programName}`);
        } catch (enrollError) {
          console.error(`[Grace Period Expiry] Error processing enrollment ${row.enrollment.id}:`, enrollError);
        }
      }

      // Also send 3-day-before-grace-period-end notifications
      await this.processGracePeriodEndWarnings(now);
    } catch (error) {
      console.error('[Grace Period Expiry] Error:', error);
    }
  }

  private async processGracePeriodEndWarnings(now: Date) {
    try {
      // Target enrollments whose grace period ends in the 24-hour window starting exactly 3 days from now
      const windowStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

      const warningEnrollments = await db.select({
        enrollment: productEnrollments,
        programName: products.name,
        profileFirstName: users.firstName,
        profileLastName: users.lastName,
      })
        .from(productEnrollments)
        .leftJoin(products, eq(productEnrollments.programId, products.id))
        .leftJoin(users, eq(productEnrollments.profileId, users.id))
        .where(
          and(
            eq(productEnrollments.status, 'grace_period'),
            gte(productEnrollments.gracePeriodEndDate, windowStart.toISOString()),
            lt(productEnrollments.gracePeriodEndDate, windowEnd.toISOString())
          )
        );

      for (const row of warningEnrollments) {
        try {
          const orgId = row.enrollment.organizationId;
          const programName = row.programName || 'Unknown Program';
          const userName = `${row.profileFirstName || ''} ${row.profileLastName || ''}`.trim() || 'A member';

          // Single dedup key — no day-count suffix so we never re-send
          const dedupTitle = `[system:grace-warning-${row.enrollment.id}] Grace period ending in 3 days`;

          const existing = await db.select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.organizationId, orgId),
                eq(notifications.title, dedupTitle)
              )
            )
            .limit(1);

          if (existing.length > 0) continue;

          const userTargetIds = [row.enrollment.profileId, row.enrollment.accountHolderId].filter(Boolean) as string[];
          const uniqueUserIds = [...new Set(userTargetIds)];

          if (uniqueUserIds.length > 0) {
            await adminNotificationService.createNotification({
              organizationId: orgId,
              types: ['notification'],
              title: dedupTitle,
              message: `Your limited access to ${programName} ends in 3 days. Re-enroll through BoxStat to restore full access and keep your team memberships.`,
              recipientTarget: 'users',
              recipientUserIds: uniqueUserIds,
              deliveryChannels: ['in_app', 'push'],
              sentBy: 'system',
              status: 'sent',
            });
          }

          console.log(`[Grace Period Expiry] Sent 3-day warning for ${userName} in ${programName}`);
        } catch (rowError) {
          console.error(`[Grace Period Expiry] Error processing grace period warning for enrollment ${row.enrollment.id}:`, rowError);
        }
      }
    } catch (error) {
      console.error('[Grace Period Expiry] Error processing end warnings:', error);
    }
  }

  private async processEnrollmentExpiryWarnings() {
    try {
      console.log('[Enrollment Expiry Warnings] Checking for upcoming expirations...');
      const now = new Date();
      const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const soonExpiringEnrollments = await db.select({
        enrollment: productEnrollments,
        programName: products.name,
        profileFirstName: users.firstName,
        profileLastName: users.lastName,
      })
        .from(productEnrollments)
        .leftJoin(products, eq(productEnrollments.programId, products.id))
        .leftJoin(users, eq(productEnrollments.profileId, users.id))
        .where(
          and(
            eq(productEnrollments.status, 'active'),
            lte(productEnrollments.endDate, fiveDaysFromNow.toISOString()),
            gt(productEnrollments.endDate, now.toISOString())
          )
        );

      console.log(`[Enrollment Expiry Warnings] Found ${soonExpiringEnrollments.length} enrollments expiring within 5 days`);

      for (const row of soonExpiringEnrollments) {
        try {
          const endDate = new Date(row.enrollment.endDate!);
          const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry !== 5 && daysUntilExpiry !== 1) continue;

          const orgId = row.enrollment.organizationId;
          const programName = row.programName || 'Unknown Program';
          const userName = `${row.profileFirstName || ''} ${row.profileLastName || ''}`.trim() || 'A member';
          const userMessage = daysUntilExpiry === 1
            ? `Your enrollment in ${programName} ends tomorrow. Re-enroll through the Payments tab to avoid unenrollment.`
            : `Your enrollment in ${programName} ends in ${daysUntilExpiry} days. Re-enroll through the Payments tab to avoid unenrollment.`;
          // Title encodes enrollment ID + days for per-enrollment dedup; frontend strips the prefix for display
          const dedupTitle = `[system:expiry-${row.enrollment.id}-${daysUntilExpiry}d] Enrollment ending ${daysUntilExpiry === 1 ? 'tomorrow' : `in ${daysUntilExpiry} days`}`;

          // Dedup per enrollment + days: skip if already sent
          const existing = await db.select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.organizationId, orgId),
                eq(notifications.title, dedupTitle)
              )
            )
            .limit(1);

          if (existing.length > 0) continue;

          const userTargetIds = [row.enrollment.profileId, row.enrollment.accountHolderId].filter(Boolean) as string[];
          const uniqueUserIds = [...new Set(userTargetIds)];

          if (uniqueUserIds.length > 0) {
            try {
              await adminNotificationService.createNotification({
                organizationId: orgId,
                types: ['notification'],
                title: dedupTitle,
                message: userMessage,
                recipientTarget: 'users',
                recipientUserIds: uniqueUserIds,
                deliveryChannels: ['in_app', 'push'],
                sentBy: 'system',
                status: 'sent',
              });
            } catch (notifError) {
              console.error(`[Enrollment Expiry Warnings] Failed to notify user for enrollment ${row.enrollment.id}:`, notifError);
            }
          }

          const adminIds = await getOrgAdminIds(orgId);
          const adminDedupTitle = `[system:expiry-admin-${row.enrollment.id}-${daysUntilExpiry}d] Enrollment expiring: ${userName}`;
          const adminMessage = `${userName}'s enrollment in ${programName} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}.`;
          const existingAdminNotif = await db.select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.organizationId, orgId),
                eq(notifications.title, adminDedupTitle)
              )
            )
            .limit(1);

          if (adminIds.length > 0 && existingAdminNotif.length === 0) {
            try {
              await adminNotificationService.createNotification({
                organizationId: orgId,
                types: ['notification'],
                title: adminDedupTitle,
                message: adminMessage,
                recipientTarget: 'users',
                recipientUserIds: adminIds,
                deliveryChannels: ['in_app', 'push'],
                sentBy: 'system',
                status: 'sent',
              });
            } catch (notifError) {
              console.error(`[Enrollment Expiry Warnings] Failed to notify admins:`, notifError);
            }
          }

          console.log(`[Enrollment Expiry Warnings] Sent ${daysUntilExpiry}-day warning for ${userName} in ${programName}`);
        } catch (rowError) {
          console.error(`[Enrollment Expiry Warnings] Error processing enrollment ${row.enrollment.id}:`, rowError);
        }
      }

      console.log('[Enrollment Expiry Warnings] Checking for low credit warnings...');
      const lowCreditEnrollments = await db.select({
        enrollment: productEnrollments,
        programName: products.name,
        profileFirstName: users.firstName,
        profileLastName: users.lastName,
      })
        .from(productEnrollments)
        .leftJoin(products, eq(productEnrollments.programId, products.id))
        .leftJoin(users, eq(productEnrollments.profileId, users.id))
        .where(
          and(
            eq(productEnrollments.status, 'active'),
            lte(productEnrollments.remainingCredits, 2),
            gt(productEnrollments.remainingCredits, 0)
          )
        );

      for (const row of lowCreditEnrollments) {
        try {
          const orgId = row.enrollment.organizationId;
          const programName = row.programName || 'Unknown Program';
          const userName = `${row.profileFirstName || ''} ${row.profileLastName || ''}`.trim() || 'A member';
          const remaining = row.enrollment.remainingCredits;
          const dedupTitle = `low-credits-${row.enrollment.id}-${remaining}`;

          const existing = await db.select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.organizationId, orgId),
                eq(notifications.title, dedupTitle)
              )
            )
            .limit(1);

          if (existing.length > 0) continue;

          const userTargetIds = [row.enrollment.profileId, row.enrollment.accountHolderId].filter(Boolean) as string[];
          const uniqueUserIds = [...new Set(userTargetIds)];

          if (uniqueUserIds.length > 0) {
            try {
              await adminNotificationService.createNotification({
                organizationId: orgId,
                types: ['notification'],
                title: `Low Credits: ${programName}`,
                message: `You have ${remaining} credit${remaining !== 1 ? 's' : ''} remaining for ${programName}. Purchase more to continue attending sessions.`,
                recipientTarget: 'users',
                recipientUserIds: uniqueUserIds,
                deliveryChannels: ['in_app', 'push'],
                sentBy: 'system',
                status: 'sent',
              });
            } catch (notifError) {
              console.error(`[Low Credits] Failed to notify user:`, notifError);
            }
          }

          const adminIds = await getOrgAdminIds(orgId);
          if (adminIds.length > 0) {
            try {
              await adminNotificationService.createNotification({
                organizationId: orgId,
                types: ['notification'],
                title: `Low Credits: ${userName}`,
                message: `${userName} has ${remaining} credit${remaining !== 1 ? 's' : ''} remaining for ${programName}.`,
                recipientTarget: 'users',
                recipientUserIds: adminIds,
                deliveryChannels: ['in_app'],
                sentBy: 'system',
                status: 'sent',
              });
            } catch (notifError) {
              console.error(`[Low Credits] Failed to notify admins:`, notifError);
            }
          }
        } catch (rowError) {
          console.error(`[Low Credits] Error:`, rowError);
        }
      }
    } catch (error) {
      console.error('[Enrollment Expiry Warnings] Error:', error);
    }
  }

  async triggerInvitedClaimReminders() {
    await this.processInvitedClaimReminders();
  }

  private async processInvitedClaimReminders() {
    try {
      console.log('[Invited Claim Reminders] Scanning unclaimed invited accounts...');
      const now = new Date();
      const nowIso = now.toISOString();
      const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
      const DAY_MS = 24 * 60 * 60 * 1000;
      const REMINDER_DAYS = [2, 5];
      const MAX_REMINDERS = REMINDER_DAYS.length;

      const candidates = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          organizationId: users.organizationId,
          inviteToken: users.inviteToken,
          inviteTokenExpiry: users.inviteTokenExpiry,
          inviteReminderCount: users.inviteReminderCount,
          lastInviteReminderAt: users.lastInviteReminderAt,
        })
        .from(users)
        .where(
          and(
            isNotNull(users.inviteToken),
            isNotNull(users.inviteTokenExpiry),
            gt(users.inviteTokenExpiry, nowIso),
            isNotNull(users.email),
            // Either status='invited' OR the account hasn't been registered yet.
            // hasRegistered may be null on legacy rows, so treat null as "not registered".
            sql`(${users.status} = 'invited' OR ${users.hasRegistered} IS NOT TRUE)`,
          ),
        );

      console.log(`[Invited Claim Reminders] Found ${candidates.length} unclaimed invited account(s).`);

      const orgNameCache = new Map<string, string>();
      const { sendInviteReminder } = await import('../emails/inviteEmail');

      let sent = 0;
      let skipped = 0;

      for (const u of candidates) {
        try {
          if (!u.email || !u.inviteToken || !u.inviteTokenExpiry || !u.organizationId) {
            skipped++;
            continue;
          }
          const reminderCount = u.inviteReminderCount ?? 0;
          if (reminderCount >= MAX_REMINDERS) {
            skipped++;
            continue;
          }

          // Derive invite-issued time from the 7-day expiry window.
          const expiryMs = new Date(u.inviteTokenExpiry).getTime();
          const issuedMs = expiryMs - INVITE_LIFETIME_MS;
          const daysSinceInvite = (now.getTime() - issuedMs) / DAY_MS;
          const nextReminderNumber = reminderCount + 1;
          const threshold = REMINDER_DAYS[reminderCount];

          if (daysSinceInvite < threshold) {
            skipped++;
            continue;
          }

          // Avoid sending two reminders on the same day.
          if (u.lastInviteReminderAt) {
            const lastMs = new Date(u.lastInviteReminderAt).getTime();
            if (now.getTime() - lastMs < DAY_MS) {
              skipped++;
              continue;
            }
          }

          let orgName = orgNameCache.get(u.organizationId);
          if (!orgName) {
            const org = await storage.getOrganization(u.organizationId);
            orgName = org?.name || 'Your organization';
            orgNameCache.set(u.organizationId, orgName);
          }

          const result = await sendInviteReminder(
            u.email,
            u.firstName ?? null,
            u.inviteToken,
            orgName,
            nextReminderNumber,
          );

          if (!result.success) {
            console.error(`[Invited Claim Reminders] Failed to email ${u.email}: ${result.error}`);
            skipped++;
            continue;
          }

          await db
            .update(users)
            .set({
              lastInviteReminderAt: nowIso,
              inviteReminderCount: nextReminderNumber,
            })
            .where(eq(users.id, u.id));

          sent++;
          console.log(`[Invited Claim Reminders] Sent reminder #${nextReminderNumber} to ${u.email} (day ${daysSinceInvite.toFixed(1)} since invite).`);
        } catch (rowErr) {
          console.error(`[Invited Claim Reminders] Error processing user ${u.id}:`, rowErr);
          skipped++;
        }
      }

      console.log(`[Invited Claim Reminders] Done. Sent: ${sent}, Skipped: ${skipped}.`);
    } catch (err) {
      console.error('[Invited Claim Reminders] Fatal error:', err);
    }
  }

  private async processMissingLocationAlerts() {
    try {
      console.log('[Missing Location] Processing missing location alerts...');
      const twentyFourHoursOut = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const upcomingEvents = await storage.getUpcomingEventsWithinHours(48);

      const missingLocation = upcomingEvents.filter((e: Event) => {
        if (e.status !== 'active' || !e.isActive) return false;
        const hasLocation = e.location && e.location.trim().length > 0;
        const hasFacility = !!e.facilityId;
        const hasMeetingLink = e.meetingLink && e.meetingLink.trim().length > 0;
        return !hasLocation && !hasFacility && !hasMeetingLink;
      });

      if (missingLocation.length === 0) {
        console.log('[Missing Location] No events missing location found');
        return;
      }

      console.log(`[Missing Location] Found ${missingLocation.length} events missing location`);

      const orgGroups = new Map<string, Event[]>();
      for (const event of missingLocation) {
        const orgId = event.organizationId || 'default-org';
        if (!orgGroups.has(orgId)) orgGroups.set(orgId, []);
        orgGroups.get(orgId)!.push(event);
      }

      for (const [orgId, orgEvents] of orgGroups) {
        const adminIds = await getOrgAdminIds(orgId);
        if (adminIds.length === 0) continue;

        const urgentEvents = orgEvents.filter(e => new Date(e.startTime) <= twentyFourHoursOut);

        try {
          const allTitles = orgEvents.slice(0, 3).map(e => e.title).join(', ');
          const allExtra = orgEvents.length > 3 ? ` +${orgEvents.length - 3} more` : '';
          const hasUrgent = urgentEvents.length > 0;

          const titleText = hasUrgent
            ? `📍 ${urgentEvents.length} Event${urgentEvents.length > 1 ? 's' : ''} Need Location (< 24h)`
            : '📍 Events Need Location Assigned';

          await adminNotificationService.createNotification({
            organizationId: orgId,
            types: ['notification'],
            title: titleText,
            message: `${orgEvents.length} upcoming event${orgEvents.length > 1 ? 's' : ''} need a location: ${allTitles}${allExtra}`,
            recipientTarget: 'users',
            recipientUserIds: adminIds,
            deliveryChannels: hasUrgent ? ['in_app', 'push'] : ['in_app'],
            sentBy: 'system',
            status: 'sent',
          }, { url: '/admin-dashboard?tab=events' });

          console.log(`[Missing Location] Notified ${adminIds.length} admins for org ${orgId}${hasUrgent ? ' (with push for urgent)' : ''}`);
        } catch (notifError) {
          console.error(`[Missing Location] Failed to notify admins for org ${orgId}:`, notifError);
        }
      }

      console.log('[Missing Location] Processing complete');
    } catch (error) {
      console.error('[Missing Location] Error processing missing location alerts:', error);
    }
  }

  // Manual trigger for campaigns (testing)
  async triggerCampaignProcessor() {
    await this.processScheduledCampaigns();
  }
}

export const notificationScheduler = new NotificationScheduler();