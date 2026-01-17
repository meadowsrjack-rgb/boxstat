import cron from 'node-cron';
import { storage } from '../storage';
import { notificationService } from './notificationService';
import type { Event } from '@shared/schema';

export class NotificationScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  // Helper to get all participants for an event based on assignTo targeting
  private async getEventParticipants(event: Event): Promise<number[]> {
    const participantIds = new Set<number>();
    
    // First check teamId (legacy direct team assignment)
    if (event.teamId) {
      const teamMembers = await storage.getUsersByTeam(event.teamId.toString());
      teamMembers.forEach(m => participantIds.add(m.id));
    }
    
    // Then check assignTo for role-based targeting
    const assignTo = event.assignTo as { teams?: string[], roles?: string[], users?: string[], programs?: string[], divisions?: string[] } | null;
    
    if (assignTo) {
      // Team targeting
      if (assignTo.teams && assignTo.teams.length > 0) {
        for (const teamId of assignTo.teams) {
          const teamMembers = await storage.getUsersByTeam(teamId);
          teamMembers.forEach(m => participantIds.add(m.id));
        }
      }
      
      // User targeting (direct user IDs)
      if (assignTo.users && assignTo.users.length > 0) {
        for (const userId of assignTo.users) {
          participantIds.add(parseInt(userId));
        }
      }
      
      // Role targeting
      if (assignTo.roles && assignTo.roles.length > 0) {
        const allUsers = await storage.getAllUsers();
        for (const user of allUsers) {
          if (assignTo.roles.includes(user.role)) {
            participantIds.add(user.id);
          }
        }
      }
      
      // Program targeting
      if (assignTo.programs && assignTo.programs.length > 0) {
        for (const programId of assignTo.programs) {
          const enrollments = await storage.getEnrollmentsByProgram(parseInt(programId));
          for (const enrollment of enrollments) {
            if (enrollment.userId) {
              participantIds.add(enrollment.userId);
            }
          }
        }
      }
    }
    
    return Array.from(participantIds);
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

    this.jobs.set('eventReminders', eventReminderJob);
    this.jobs.set('checkinAvailable', checkinAvailableJob);
    this.jobs.set('rsvpClosing', rsvpClosingJob);

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
          // Check if we're within the reminder window (generous tolerance)
          // For 24h reminder: trigger between 23-24.5 hours before
          // For 2h reminder: trigger between 1.75-2.25 hours before  
          // For 30min reminder: trigger between 25-35 minutes before
          const tolerance = reminderHours >= 24 ? 0.75 : (reminderHours >= 2 ? 0.25 : 0.17);
          if (hoursUntilEvent <= (reminderHours + tolerance) && hoursUntilEvent > (reminderHours - tolerance)) {
            
            let timeUntil = '';
            if (reminderHours >= 24) {
              timeUntil = 'in 1 day';
            } else if (reminderHours >= 2) {
              timeUntil = `in ${Math.round(reminderHours)} hours`;
            } else {
              timeUntil = 'in 30 minutes';
            }

            // Get all participants for the event
            const participantIds = await this.getEventParticipants(event);
            console.log(`  Found ${participantIds.length} participants for reminder ${reminderHours}h: ${participantIds.join(', ')}`);
            
            for (const memberId of participantIds) {
              // Check if reminder was already sent by looking for recent notifications
              const recentNotifications = await notificationService.getUserNotifications(memberId.toString(), {
                limit: 10,
                unreadOnly: false
              });
              
              const alreadySent = recentNotifications.some(n => 
                n.types?.includes('event_reminder') && 
                n.relatedEventId === event.id &&
                n.createdAt && n.createdAt > new Date(now.getTime() - 30 * 60 * 1000).toISOString()
              );

              if (!alreadySent) {
                await notificationService.notifyEventReminder(
                  memberId,
                  event.id,
                  event.title,
                  timeUntil
                );
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
              // Check if notification was already sent
              const recentNotifications = await notificationService.getUserNotifications(memberId.toString(), {
                limit: 10,
                unreadOnly: false
              });
              
              const alreadySent = recentNotifications.some(n => 
                n.types?.includes('event_checkin_available') && 
                n.relatedEventId === event.id &&
                n.createdAt && n.createdAt > new Date(now.getTime() - 15 * 60 * 1000).toISOString()
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
            
            // Only notify users who haven't responded yet
            if (!rsvpResponse || rsvpResponse.response === 'no_response') {
              // Check if notification was already sent
              const recentNotifications = await notificationService.getUserNotifications(memberId.toString(), {
                limit: 10,
                unreadOnly: false
              });
              
              const alreadySent = recentNotifications.some(n => 
                n.types?.includes('event_rsvp_closing') && 
                n.relatedEventId === event.id &&
                n.createdAt && n.createdAt > new Date(now.getTime() - 30 * 60 * 1000).toISOString()
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
          
          // Send notifications to each recipient
          for (const userId of recipients) {
            try {
              // Create in-app notification
              await notificationService.sendMultiChannelNotification({
                userId,
                title: campaign.title,
                message: campaign.message,
                type: 'campaign',
                data: { campaignId: campaign.id },
                channels: campaign.deliveryChannels as Array<'in_app' | 'push' | 'email'>,
                apnsEnvironment: campaign.apnsEnvironment as 'sandbox' | 'production' | undefined,
              });
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
  
  // Manual trigger for campaigns (testing)
  async triggerCampaignProcessor() {
    await this.processScheduledCampaigns();
  }
}

export const notificationScheduler = new NotificationScheduler();