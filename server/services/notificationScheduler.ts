import cron from 'node-cron';
import { storage } from '../storage';
import { notificationService } from './notificationService';

export class NotificationScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  start() {
    console.log('Starting notification scheduler...');
    
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

    this.jobs.set('eventReminders', eventReminderJob);
    this.jobs.set('checkinAvailable', checkinAvailableJob);

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
}

export const notificationScheduler = new NotificationScheduler();