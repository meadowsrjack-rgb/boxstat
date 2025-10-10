import * as cron from 'node-cron';
import { scheduledCalendarSync } from './google-calendar';
import { notionService } from './notion';

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
    timezone: "America/Los_Angeles" // UYP is in Costa Mesa, CA (Pacific Time)
  });

  // Sync Notion database every 24 hours at 2 AM Pacific Time
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled Notion sync...');
    try {
      if (process.env.NOTION_API_KEY && process.env.NOTION_DB_ID) {
        await notionService.syncFromNotion();
        console.log('Scheduled Notion sync completed successfully');
      } else {
        console.log('Notion sync skipped: API key or database ID not configured');
      }
    } catch (error) {
      console.error('Scheduled Notion sync failed:', error);
    }
  }, {
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