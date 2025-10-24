import * as cron from 'node-cron';
import { notionService } from './notion';

// Initialize scheduled tasks
export function initializeScheduler() {
  console.log('Initializing scheduler...');

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

  console.log('Scheduler initialized');
}
