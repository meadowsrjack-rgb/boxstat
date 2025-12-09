import cron from 'node-cron';
import { storage } from '../storage';
import { notificationService } from './notificationService';

export class NotificationScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  start() {
    console.log('Starting notification scheduler...');
    
    // Process scheduled campaigns every minute
    const campaignProcessorJob = cron.schedule('* * * * *', async () => {
      await this.processScheduledCampaigns();
    }, {
      scheduled: false
    });
    
    this.jobs.set('campaignProcessor', campaignProcessorJob);
    
    // DISABLED: storage.getUpcomingEvents not implemented yet
    // Check for upcoming events every 15 minutes
    // const eventReminderJob = cron.schedule('*/15 * * * *', async () => {
    //   await this.processEventReminders();
    // }, {
    //   scheduled: false
    // });

    // Check for check-in availability every 5 minutes  
    // const checkinAvailableJob = cron.schedule('*/5 * * * *', async () => {
    //   await this.processCheckInAvailability();
    // }, {
    //   scheduled: false
    // });

    // this.jobs.set('eventReminders', eventReminderJob);
    // this.jobs.set('checkinAvailable', checkinAvailableJob);

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
      const upcomingEvents = await storage.getUpcomingEvents(24);
      
      for (const event of upcomingEvents) {
        const eventStart = new Date(event.startTime);
        const now = new Date();
        const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Send reminders at 24 hours, 2 hours, and 30 minutes before
        const reminderTimes = [24, 2, 0.5];
        
        for (const reminderHours of reminderTimes) {
          // Check if we're within 5 minutes of the reminder time
          if (Math.abs(hoursUntilEvent - reminderHours) <= 0.08) { // 5 minutes tolerance
            
            let timeUntil = '';
            if (reminderHours >= 24) {
              timeUntil = 'in 1 day';
            } else if (reminderHours >= 2) {
              timeUntil = `in ${Math.round(reminderHours)} hours`;
            } else {
              timeUntil = 'in 30 minutes';
            }

            // Get team members for the event
            if (event.teamId) {
              const teamMembers = await storage.getTeamMembers(event.teamId);
              
              for (const member of teamMembers) {
                // Check if reminder was already sent by looking for recent notifications
                const recentNotifications = await notificationService.getUserNotifications(member.userId, {
                  limit: 10,
                  unreadOnly: false
                });
                
                const alreadySent = recentNotifications.some(n => 
                  n.type === 'event_reminder' && 
                  n.data?.eventId === event.id &&
                  n.createdAt > new Date(now.getTime() - 30 * 60 * 1000).toISOString() // Last 30 minutes
                );

                if (!alreadySent) {
                  await notificationService.notifyEventReminder(
                    member.userId,
                    event.id,
                    event.title,
                    timeUntil
                  );
                }
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
      const upcomingEvents = await storage.getUpcomingEvents(2);
      
      for (const event of upcomingEvents) {
        const eventStart = new Date(event.startTime);
        const now = new Date();
        const minutesUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60);
        
        // Notify about check-in availability 30 minutes before event starts
        if (minutesUntilEvent <= 30 && minutesUntilEvent > 25) {
          
          if (event.teamId) {
            const teamMembers = await storage.getTeamMembers(event.teamId);
            
            for (const member of teamMembers) {
              // Check if user already has a check-in for this event
              const existingCheckin = await storage.getUserAttendances(member.userId);
              const hasCheckedIn = existingCheckin.some(attendance => attendance.eventId === event.id);
              
              if (!hasCheckedIn) {
                // Check if notification was already sent
                const recentNotifications = await notificationService.getUserNotifications(member.userId, {
                  limit: 10,
                  unreadOnly: false
                });
                
                const alreadySent = recentNotifications.some(n => 
                  n.type === 'event_checkin_available' && 
                  n.data?.eventId === event.id &&
                  n.createdAt > new Date(now.getTime() - 15 * 60 * 1000).toISOString() // Last 15 minutes
                );

                if (!alreadySent) {
                  await notificationService.notifyEventCheckInAvailable(
                    member.userId,
                    event.id,
                    event.title
                  );
                }
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