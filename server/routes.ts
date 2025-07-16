import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEventSchema, insertAnnouncementSchema, insertMessageSchema, insertPaymentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.get('/api/users/:id/team', isAuthenticated, async (req: any, res) => {
    try {
      const team = await storage.getUserTeam(req.params.id);
      res.json(team);
    } catch (error) {
      console.error("Error fetching user team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.get('/api/users/:id/events', isAuthenticated, async (req: any, res) => {
    try {
      const events = await storage.getUserEvents(req.params.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/users/:id/badges', isAuthenticated, async (req: any, res) => {
    try {
      const badges = await storage.getUserBadges(req.params.id);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  app.get('/api/users/:id/payments', isAuthenticated, async (req: any, res) => {
    try {
      const payments = await storage.getUserPayments(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching user payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Team routes
  app.get('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const team = await storage.getTeam(parseInt(req.params.id));
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.get('/api/teams/:id/players', isAuthenticated, async (req: any, res) => {
    try {
      const players = await storage.getTeamPlayers(parseInt(req.params.id));
      res.json(players);
    } catch (error) {
      console.error("Error fetching team players:", error);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.get('/api/teams/:id/events', isAuthenticated, async (req: any, res) => {
    try {
      const events = await storage.getTeamEvents(parseInt(req.params.id));
      res.json(events);
    } catch (error) {
      console.error("Error fetching team events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/teams/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getTeamMessages(parseInt(req.params.id));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching team messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Event routes
  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.post('/api/events/:id/checkin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = parseInt(req.params.id);
      const qrCodeData = `UYP-PLAYER-${userId}-${eventId}-${Date.now()}`;
      
      const attendance = await storage.createAttendance({
        userId,
        eventId,
        qrCodeData,
      });
      
      res.json(attendance);
    } catch (error) {
      console.error("Error checking in:", error);
      res.status(500).json({ message: "Failed to check in" });
    }
  });

  // Announcement routes
  app.get('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.query.teamId ? parseInt(req.query.teamId) : undefined;
      const announcements = await storage.getAnnouncements(teamId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.post('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const announcementData = insertAnnouncementSchema.parse({
        ...req.body,
        authorId: req.user.claims.sub,
      });
      const announcement = await storage.createAnnouncement(announcementData);
      res.json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Message routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.claims.sub,
      });
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Payment routes - SportsEngine Integration
  app.post('/api/payments', isAuthenticated, async (req: any, res) => {
    try {
      const paymentData = insertPaymentSchema.parse({
        ...req.body,
        userId: req.user.claims.sub,
      });
      const payment = await storage.createPayment(paymentData);
      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // SportsEngine payment integration
  app.post('/api/payments/sportsengine/create', isAuthenticated, async (req: any, res) => {
    try {
      const { amount, paymentType, description } = req.body;
      const userId = req.user.claims.sub;
      
      // Create payment record in our database
      const payment = await storage.createPayment({
        userId,
        amount,
        paymentType,
        description,
        status: 'pending',
      });

      // In a real SportsEngine integration, you would:
      // 1. Make API call to SportsEngine to create payment session
      // 2. Get payment URL/token from SportsEngine
      // 3. Return the payment URL to frontend
      
      // For now, return a mock response structure
      res.json({
        paymentId: payment.id,
        sportsEnginePaymentUrl: `https://sportsengine.com/payment/${payment.id}`,
        amount,
        description,
        status: 'pending'
      });
    } catch (error) {
      console.error("Error creating SportsEngine payment:", error);
      res.status(500).json({ message: "Failed to create SportsEngine payment" });
    }
  });

  // SportsEngine payment webhook/completion
  app.post('/api/payments/sportsengine/complete', async (req: any, res) => {
    try {
      const { paymentId, sportsEnginePaymentId, sportsEngineTransactionId, status } = req.body;
      
      // Update payment status in our database
      await storage.updatePaymentStatus(
        parseInt(paymentId),
        status,
        status === 'completed' ? new Date() : undefined
      );

      // Update SportsEngine IDs if payment completed
      if (status === 'completed') {
        // You might want to store these IDs for reference
        console.log(`Payment ${paymentId} completed with SportsEngine ID: ${sportsEnginePaymentId}`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error completing SportsEngine payment:", error);
      res.status(500).json({ message: "Failed to complete payment" });
    }
  });

  // Drill routes
  app.get('/api/drills', isAuthenticated, async (req: any, res) => {
    try {
      const category = req.query.category as string;
      const drills = category 
        ? await storage.getDrillsByCategory(category)
        : await storage.getAllDrills();
      res.json(drills);
    } catch (error) {
      console.error("Error fetching drills:", error);
      res.status(500).json({ message: "Failed to fetch drills" });
    }
  });

  // Badge routes
  app.get('/api/badges', isAuthenticated, async (req: any, res) => {
    try {
      const badges = await storage.getAllBadges();
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join':
            clients.set(message.userId, ws);
            break;
            
          case 'message':
            // Broadcast message to all team members
            const messageData = await storage.createMessage({
              senderId: message.senderId,
              content: message.content,
              teamId: message.teamId,
              messageType: message.messageType || 'text',
            });
            
            // Send to all connected clients
            clients.forEach((client, userId) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'message',
                  data: messageData,
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from map
      clients.forEach((client, userId) => {
        if (client === ws) {
          clients.delete(userId);
        }
      });
    });
  });

  return httpServer;
}
