import * as cron from 'node-cron';
import { scheduledCalendarSync } from './google-calendar';

// Initialize scheduled tasks
export function initializeScheduler() {
  console.log('Initializing calendar sync scheduler...');

  // Sync Google Calendar every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled Google Calendar sync...');
    try {
      await scheduledCalendarSync();
    } catch (error) {
      console.error('Scheduled calendar sync failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/Los_Angeles" // UYP is in Costa Mesa, CA (Pacific Time)
  });

  // Initial sync on startup (wait 5 seconds to let server fully initialize)
  setTimeout(async () => {
    console.log('Running initial Google Calendar sync...');
    try {
      await scheduledCalendarSync();
    } catch (error) {
      console.error('Initial calendar sync failed:', error);
    }
  }, 5000);

  console.log('Calendar sync scheduler initialized');
}