import type { Express } from "express";
import { adminNotificationService } from "../services/adminNotificationService";
import { z } from "zod";
import { insertNotificationSchema } from "../../shared/schema";
import { requireAuth, isAdmin } from "../auth";

export function setupAdminNotificationRoutes(app: Express) {
  
  // Get all notifications (admin view)
  app.get('/api/admin/notifications', requireAuth, isAdmin, async (req: any, res) => {
    try {
      const organizationId = req.user.organizationId || 'default-org';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string | undefined;

      const notifications = await adminNotificationService.getAllNotifications(organizationId, {
        limit,
        offset,
        status
      });

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Get notification statistics
  app.get('/api/admin/notifications/:id/stats', requireAuth, isAdmin, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);

      if (isNaN(notificationId)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }

      const stats = await adminNotificationService.getNotificationStats(notificationId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      res.status(500).json({ error: 'Failed to fetch notification stats' });
    }
  });

  // Create a new notification
  app.post('/api/admin/notifications', requireAuth, isAdmin, async (req: any, res) => {
    try {
      const organizationId = req.user.organizationId || 'default-org';
      const userId = req.user.id;

      // Validate request body
      const notificationData = insertNotificationSchema.parse({
        ...req.body,
        organizationId,
        sentBy: userId
      });

      const result = await adminNotificationService.createNotification(notificationData);

      res.json({
        success: true,
        notification: result.notification,
        recipientCount: result.recipientCount,
        skipped: result.skipped
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid notification data',
          details: error.errors
        });
      }

      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create notification' 
      });
    }
  });

  // Delete a notification
  app.delete('/api/admin/notifications/:id', requireAuth, isAdmin, async (req: any, res) => {
    try {
      const organizationId = req.user.organizationId || 'default-org';
      const notificationId = parseInt(req.params.id);

      if (isNaN(notificationId)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }

      await adminNotificationService.deleteNotification(notificationId, organizationId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  // Test notification endpoint (development only)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/admin/notifications/test', requireAuth, isAdmin, async (req: any, res) => {
      try {
        const organizationId = req.user.organizationId || 'default-org';
        const userId = req.user.id;

        const testNotification = {
          organizationId,
          title: req.body.title || 'Test Message',
          message: req.body.message || 'This is a test message from the admin panel.',
          recipientTarget: req.body.recipientTarget || 'users',
          recipientUserIds: req.body.recipientUserIds || [userId],
          deliveryChannels: req.body.deliveryChannels || ['in_app'],
          sentBy: userId,
          status: 'pending' as const
        };

        const result = await adminNotificationService.createNotification(testNotification);

        res.json({
          success: true,
          message: 'Test notification sent',
          notification: result.notification,
          recipientCount: result.recipientCount
        });
      } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
      }
    });
  }
}
