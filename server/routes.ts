import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEventSchema, insertAnnouncementSchema, insertMessageReactionSchema, insertMessageSchema, insertTeamMessageSchema, insertPaymentSchema, insertFamilyMemberSchema, insertTaskCompletionSchema, insertAnnouncementAcknowledgmentSchema, insertPlayerTaskSchema, insertPlayerPointsSchema, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { z } from "zod";
import sportsEngineRoutes from "./sportsengine-routes";
import calendarRoutes from "./routes/calendar";

let wss: WebSocketServer | null = null;

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

  // Moved to Event routes section below

  app.get('/api/users/:id/badges', isAuthenticated, async (req: any, res) => {
    try {
      const badges = await storage.getUserBadges(req.params.id);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  app.get('/api/users/:id/trophies', isAuthenticated, async (req: any, res) => {
    try {
      const trophies = await storage.getUserTrophies(req.params.id);
      res.json(trophies);
    } catch (error) {
      console.error("Error fetching user trophies:", error);
      res.status(500).json({ message: "Failed to fetch trophies" });
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
      const messages = await storage.getTeamMessagesNew(parseInt(req.params.id));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching team messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Event routes
  // General events route for all calendar events (no auth required for demo)
  app.get('/api/events', async (req: any, res) => {
    try {
      console.log('API /api/events route hit directly');
      res.setHeader('Content-Type', 'application/json');
      const events = await storage.getAllEvents();
      console.log(`Found ${events.length} events in database`);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error, error.stack);
      res.status(500).json({ message: "Failed to fetch events", error: error.message });
    }
  });

  app.get('/api/users/:userId/events', isAuthenticated, async (req: any, res) => {
    try {
      const events = await storage.getUserEvents(req.params.userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/child-profiles/:childId/events', isAuthenticated, async (req: any, res) => {
    try {
      const events = []; // TODO: Implement getChildEvents - temporary empty array
      res.json(events);
    } catch (error) {
      console.error("Error fetching child events:", error);
      res.status(500).json({ message: "Failed to fetch child events" });
    }
  });

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

  app.post('/api/events/recurring', isAuthenticated, async (req: any, res) => {
    try {
      const { eventData, occurrences } = req.body;
      const parsedEventData = insertEventSchema.parse(eventData);
      // TODO: Implement createRecurringEvent
      const events = [await storage.createEvent(parsedEventData)]; // Fallback for now
      res.json(events);
    } catch (error) {
      console.error("Error creating recurring events:", error);
      res.status(500).json({ message: "Failed to create recurring events" });
    }
  });

  // Initialize sample schedule data
  app.post('/api/schedule/initialize-sample', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childProfiles = await storage.getChildProfiles(userId);
      
      if (childProfiles.length < 2) {
        return res.status(400).json({ message: "Need at least 2 child profiles to create sample schedule" });
      }

      const bobProfile = childProfiles.find(child => child.firstName.toLowerCase().includes('bob')) || childProfiles[0];
      const doraProfile = childProfiles.find(child => child.firstName.toLowerCase().includes('dora')) || childProfiles[1];

      const events = [];

      // Generate recurring weekly events for the rest of 2025
      const generateRecurringEvents = (startDate: Date, endDate: Date, childProfile: any, eventData: any) => {
        const events = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          events.push({
            ...eventData,
            childProfileId: childProfile.id,
            startTime: new Date(currentDate.getTime() + eventData.startHour * 60 * 60 * 1000),
            endTime: new Date(currentDate.getTime() + eventData.endHour * 60 * 60 * 1000),
          });
          currentDate.setDate(currentDate.getDate() + 7); // Next week
        }
        return events;
      };

      // Set up date ranges - reduced to only 1 week for minimal events
      const startOfJuly = new Date('2025-07-01');
      const endOfJuly = new Date('2025-07-07');

      // Bob's Monday & Wednesday Skills Training (5:00-6:00 PM)
      const bobMondaySkills = generateRecurringEvents(
        new Date('2025-07-07'), // First Monday
        endOfJuly,
        bobProfile,
        { 
          title: "Skills Training", 
          description: "Individual skills development session",
          eventType: "skills", 
          location: "UYP Main Court", 
          startHour: 17, 
          endHour: 18 
        }
      );

      const bobWednesdaySkills = generateRecurringEvents(
        new Date('2025-07-09'), // First Wednesday  
        endOfJuly,
        bobProfile,
        { 
          title: "Skills Training", 
          description: "Individual skills development session",
          eventType: "skills", 
          location: "UYP Main Court", 
          startHour: 17, 
          endHour: 18 
        }
      );

      // Dora's Monday & Wednesday Skills Training (6:00-7:00 PM)
      const doraMondaySkills = generateRecurringEvents(
        new Date('2025-07-07'),
        endOfJuly,
        doraProfile,
        { 
          title: "Skills Training", 
          description: "Individual skills development session",
          eventType: "skills", 
          location: "UYP Main Court", 
          startHour: 18, 
          endHour: 19 
        }
      );

      const doraWednesdaySkills = generateRecurringEvents(
        new Date('2025-07-09'),
        endOfJuly,
        doraProfile,
        { 
          title: "Skills Training", 
          description: "Individual skills development session",
          eventType: "skills", 
          location: "UYP Main Court", 
          startHour: 18, 
          endHour: 19 
        }
      );

      // Team Practice - Tuesdays & Thursdays
      const bobTuesdayPractice = generateRecurringEvents(
        new Date('2025-07-08'),
        endOfJuly,
        bobProfile,
        { 
          title: "Team Practice", 
          description: "Team practice session",
          eventType: "practice", 
          location: "UYP Main Court", 
          startHour: 17.5, 
          endHour: 18.5 
        }
      );

      const bobThursdayPractice = generateRecurringEvents(
        new Date('2025-07-10'),
        endOfJuly,
        bobProfile,
        { 
          title: "Team Practice", 
          description: "Team practice session",
          eventType: "practice", 
          location: "UYP Main Court", 
          startHour: 17.5, 
          endHour: 18.5 
        }
      );

      const doraTuesdayPractice = generateRecurringEvents(
        new Date('2025-07-08'),
        endOfJuly,
        doraProfile,
        { 
          title: "Team Practice", 
          description: "Team practice session",
          eventType: "practice", 
          location: "UYP Main Court", 
          startHour: 18.5, 
          endHour: 20 
        }
      );

      const doraThursdayPractice = generateRecurringEvents(
        new Date('2025-07-10'),
        endOfJuly,
        doraProfile,
        { 
          title: "Team Practice", 
          description: "Team practice session",
          eventType: "practice", 
          location: "UYP Main Court", 
          startHour: 18.5, 
          endHour: 20 
        }
      );

      // Friday Night Hoops
      const bobFridayHoops = generateRecurringEvents(
        new Date('2025-07-11'),
        endOfJuly,
        bobProfile,
        { 
          title: "Friday Night Hoops", 
          description: "Fun scrimmage games",
          eventType: "game", 
          location: "UYP Main Court", 
          startHour: 18, 
          endHour: 19 
        }
      );

      const doraFridayHoops = generateRecurringEvents(
        new Date('2025-07-11'),
        endOfJuly,
        doraProfile,
        { 
          title: "Friday Night Hoops", 
          description: "Fun scrimmage games",
          eventType: "game", 
          location: "UYP Main Court", 
          startHour: 19, 
          endHour: 20 
        }
      );

      // Special Events - reduced to only 2 events (keep 10%)
      const specialEvents = [
        {
          title: "Weekend Game",
          description: "Saturday morning game",
          eventType: "game",
          startTime: new Date('2025-07-12T10:00:00'),
          endTime: new Date('2025-07-12T11:00:00'),
          location: "UYP Main Court",
          childProfileId: bobProfile.id
        },
        {
          title: "UYP Summer Skills Camp",
          description: "5-day intensive skills camp",
          eventType: "camp",
          startTime: new Date('2025-07-21T09:00:00'),
          endTime: new Date('2025-07-21T12:00:00'),
          location: "UYP Main Court",
          childProfileId: bobProfile.id
        }
      ];

      // No events - empty calendar
      const allEvents: any[] = [];

      // Create all events
      const createdEvents = [];
      for (const event of allEvents) {
        try {
          const createdEvent = await storage.createEvent(event);
          createdEvents.push(createdEvent);
        } catch (error) {
          console.error("Error creating event:", error);
        }
      }

      res.json({ 
        message: `Created ${createdEvents.length} events for Bob and Dora`,
        events: createdEvents.length
      });
    } catch (error) {
      console.error("Error initializing sample schedule:", error);
      res.status(500).json({ message: "Failed to initialize sample schedule" });
    }
  });

  // Account setup route
  app.post("/api/setup-account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const {
        userType,
        firstName,
        lastName,
        dateOfBirth,
        phoneNumber,
        address,
        emergencyContact,
        emergencyPhone,
        medicalInfo,
        allergies,
        schoolGrade,
        parentalConsent
      } = req.body;

      // Generate unique QR code for check-in
      const qrCodeData = `UYP-${userId}-${Date.now()}`;

      const updatedUser = await storage.updateUserProfile(userId, {
        userType,
        firstName,
        lastName,
        dateOfBirth,
        phoneNumber,
        address,
        emergencyContact,
        emergencyPhone,
        medicalInfo,
        allergies,
        schoolGrade,
        parentalConsent,
        profileCompleted: true,
        qrCodeData,
      });

      res.json({ 
        message: "Account setup completed successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Account setup error:", error);
      res.status(500).json({ message: "Account setup failed" });
    }
  });

  // Family member management routes
  app.get("/api/family-members", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user.claims.sub;
      const familyMembers = await storage.getFamilyMembers(parentId);
      res.json(familyMembers);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  app.post("/api/family-members", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user.claims.sub;
      const { playerEmail, relationship, canMakePayments, canViewReports, emergencyContact } = req.body;
      
      // Find player by email
      const players = await db.select().from(users).where(eq(users.email, playerEmail));
      if (players.length === 0) {
        return res.status(404).json({ message: "Player account not found with this email" });
      }
      
      const player = players[0];
      if (player.userType !== 'player') {
        return res.status(400).json({ message: "Account is not a player account" });
      }

      const familyMember = await storage.addFamilyMember({
        parentId,
        playerId: player.id,
        relationship,
        canMakePayments,
        canViewReports,
        emergencyContact
      });

      res.json(familyMember);
    } catch (error) {
      console.error("Error adding family member:", error);
      res.status(500).json({ message: "Failed to add family member" });
    }
  });

  app.put("/api/family-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.claims.sub;
      
      // Verify ownership - check if this is the parent's family member
      const familyMembers = await storage.getFamilyMembers(parentId);
      const member = familyMembers.find(m => m.id === parseInt(id));
      
      if (!member) {
        return res.status(403).json({ message: "Access denied" });
      }

      const permissions = req.body;
      const updatedMember = await storage.updateFamilyMemberPermissions(parseInt(id), permissions);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating family member:", error);
      res.status(500).json({ message: "Failed to update family member" });
    }
  });

  app.delete("/api/family-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.claims.sub;
      
      // Verify ownership
      const familyMembers = await storage.getFamilyMembers(parentId);
      const member = familyMembers.find(m => m.id === parseInt(id));
      
      if (!member) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.removeFamilyMember(parseInt(id));
      res.json({ message: "Family member removed successfully" });
    } catch (error) {
      console.error("Error removing family member:", error);
      res.status(500).json({ message: "Failed to remove family member" });
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

  app.get('/api/announcements/team/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const announcements = await storage.getTeamAnnouncements(teamId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching team announcements:", error);
      res.status(500).json({ message: "Failed to fetch team announcements" });
    }
  });

  app.post('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      // Remove fields that don't exist in the database schema
      const { messageType, targetAudience, recipientId, ...announcementBody } = req.body;
      const announcementData = insertAnnouncementSchema.parse({
        ...announcementBody,
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

  // Message reaction routes
  app.get('/api/messages/:id/reactions', isAuthenticated, async (req: any, res) => {
    try {
      const reactions = await storage.getMessageReactions(parseInt(req.params.id));
      res.json(reactions);
    } catch (error) {
      console.error("Error fetching message reactions:", error);
      res.status(500).json({ message: "Failed to fetch reactions" });
    }
  });

  app.post('/api/messages/:id/reactions', isAuthenticated, async (req: any, res) => {
    try {
      const reactionData = insertMessageReactionSchema.parse({
        messageId: parseInt(req.params.id),
        userId: req.user.claims.sub,
        emoji: req.body.emoji,
      });
      const reaction = await storage.addMessageReaction(reactionData);
      res.json(reaction);
    } catch (error) {
      console.error("Error adding message reaction:", error);
      res.status(500).json({ message: "Failed to add reaction" });
    }
  });

  app.delete('/api/messages/:id/reactions', isAuthenticated, async (req: any, res) => {
    try {
      const success = await storage.removeMessageReaction(
        parseInt(req.params.id),
        req.user.claims.sub,
        req.body.emoji
      );
      res.json({ success });
    } catch (error) {
      console.error("Error removing message reaction:", error);
      res.status(500).json({ message: "Failed to remove reaction" });
    }
  });

  // Team messaging routes (duplicate removed)

  app.post('/api/teams/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = parseInt(req.params.id);
      console.log("Creating team message:", { 
        teamId, 
        senderId: req.user.claims.sub, 
        body: req.body 
      });
      
      const messageData = insertTeamMessageSchema.parse({
        teamId,
        senderId: req.user.claims.sub,
        message: req.body.message,
        messageType: req.body.messageType || 'text',
      });
      
      const message = await storage.createTeamMessage(messageData);
      console.log("Message created successfully:", message);
      
      // Broadcast to WebSocket clients if connected
      if (wss) {
        const wsMessage = JSON.stringify({
          type: 'new_team_message',
          teamId,
          message
        });
        
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(wsMessage);
          }
        });
      }
      
      res.json(message);
    } catch (error) {
      console.error("Error creating team message:", error);
      res.status(500).json({ message: "Failed to create team message", error: (error as Error).message });
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

  // Teams routes
  app.get('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Get teams by coach (for admin dashboard)
  app.get('/api/teams/coach/:coachId', isAuthenticated, async (req: any, res) => {
    try {
      const coachId = req.params.coachId;
      const teams = await storage.getTeamsByCoach(coachId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching coach teams:", error);
      res.status(500).json({ message: "Failed to fetch coach teams" });
    }
  });

  // Team events route (alias for compatibility)
  app.get('/api/team-events/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const events = await storage.getTeamEvents(teamId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching team events:", error);
      res.status(500).json({ message: "Failed to fetch team events" });
    }
  });

  // Team players route (alias for compatibility)
  app.get('/api/team-players/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const players = await storage.getTeamPlayers(teamId);
      res.json(players);
    } catch (error) {
      console.error("Error fetching team players:", error);
      res.status(500).json({ message: "Failed to fetch team players" });
    }
  });

  // Task completion routes
  app.get('/api/tasks/:announcementId/completion/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const completion = await storage.getTaskCompletion(
        parseInt(req.params.announcementId),
        req.params.userId
      );
      res.json(completion);
    } catch (error) {
      console.error("Error fetching task completion:", error);
      res.status(500).json({ message: "Failed to fetch task completion" });
    }
  });

  app.post('/api/tasks/:announcementId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const completionData = insertTaskCompletionSchema.parse({
        announcementId: parseInt(req.params.announcementId),
        userId: req.user.claims.sub,
        notes: req.body.notes,
      });
      const completion = await storage.completeTask(completionData);
      res.json(completion);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Announcement acknowledgment routes
  app.get('/api/announcements/:announcementId/acknowledgment/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const acknowledgment = await storage.getAnnouncementAcknowledgment(
        parseInt(req.params.announcementId),
        req.params.userId
      );
      res.json(acknowledgment);
    } catch (error) {
      console.error("Error fetching acknowledgment:", error);
      res.status(500).json({ message: "Failed to fetch acknowledgment" });
    }
  });

  app.post('/api/announcements/:announcementId/acknowledge', isAuthenticated, async (req: any, res) => {
    try {
      const acknowledgmentData = insertAnnouncementAcknowledgmentSchema.parse({
        announcementId: parseInt(req.params.announcementId),
        userId: req.user.claims.sub,
      });
      const acknowledgment = await storage.acknowledgeAnnouncement(acknowledgmentData);
      res.json(acknowledgment);
    } catch (error) {
      console.error("Error acknowledging announcement:", error);
      res.status(500).json({ message: "Failed to acknowledge announcement" });
    }
  });

  // Test account creation endpoint for unified demo
  app.post('/api/test-accounts/create-unified', async (req: any, res) => {
    try {
      // Create the demo parent account
      const parentUser = await storage.upsertUser({
        id: 'demo-parent-sarah-001',
        email: 'sarah.johnson@email.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        userType: 'parent',
        teamId: null,
        profileCompleted: true,
        phoneNumber: '(555) 123-4567',
        address: '123 Family Lane, Costa Mesa, CA 92626'
      });

      // Create family relationships for demo
      try {
        // TODO: Implement createFamilyMember method
        // await storage.createFamilyMember(...)
      } catch (error) {
        // Family relationships may already exist
      }

      res.json({
        success: true,
        message: "Demo account created successfully",
        loginUrl: `/api/demo-login?userId=demo-parent-sarah-001`,
        accountId: 'demo-parent-sarah-001'
      });
    } catch (error) {
      console.error("Error creating demo account:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create demo account",
        error: (error as Error).message 
      });
    }
  });

  // Demo login endpoint
  app.get('/api/demo-login', async (req: any, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.redirect('/?error=missing_user_id');
      }

      // Get the demo user to verify it exists
      const demoUser = await storage.getUser(userId);
      if (!demoUser) {
        return res.redirect('/?error=demo_user_not_found');
      }

      // Set demo mode in session
      req.session.demoUserId = userId;
      req.session.isDemoMode = true;
      req.session.demoUser = demoUser;
      
      console.log("Demo session created:", { userId, isDemoMode: true });
      
      // Redirect to demo profiles page with query param
      res.redirect('/demo-profiles?demo=active');
    } catch (error) {
      console.error("Demo login error:", error);
      res.redirect('/?error=demo_login_failed');
    }
  });

  // Demo auth check endpoint
  app.get('/api/auth/demo-status', async (req: any, res) => {
    if (req.session.isDemoMode && req.session.demoUser) {
      res.json({
        isDemoMode: true,
        user: req.session.demoUser,
        hasMultipleProfiles: true
      });
    } else {
      res.status(401).json({ message: "No demo session active" });
    }
  });

  // SportsEngine integration routes
  app.use('/api/sportsengine', sportsEngineRoutes);

  // Google Calendar integration routes
  app.use('/api/calendar', calendarRoutes);

  // Profile Management Routes (new unified system)
  app.get('/api/profiles/:accountId', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = req.params.accountId;
      const userId = req.user.claims.sub;
      
      // Ensure user can only access their own profiles
      if (accountId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const profiles = await storage.getAccountProfiles(accountId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.post('/api/profiles', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Creating profile with request body:", req.body);
      console.log("User claims:", req.user.claims);
      
      const profileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const qrCodeData = `UYP-${Date.now()}-${req.user.claims.sub}`;
      
      const profileData = {
        ...req.body,
        id: profileId,
        accountId: req.user.claims.sub,
        qrCodeData: qrCodeData,
        profileCompleted: false,
        isActive: true,
      };
      
      console.log("Profile data to create:", profileData);
      
      const profile = await storage.createProfile(profileData);
      console.log("Profile created successfully:", profile);
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.post('/api/profiles/:profileId/select', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = req.params.profileId;
      const userId = req.user.claims.sub;
      
      const profile = await storage.selectProfile(userId, profileId);
      
      // Update the user's current profile status
      await storage.updateUser(userId, { 
        profileCompleted: true,
        userType: profile.profileType
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error selecting profile:", error);
      res.status(500).json({ message: "Failed to select profile" });
    }
  });

  // Child Profile Management Routes
  app.get('/api/child-profiles/:parentId', isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.params.parentId;
      const userId = req.user.claims.sub;
      
      // Ensure user can only access their own child profiles
      if (parentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const childProfiles = await storage.getChildProfiles(parentId);
      res.json(childProfiles);
    } catch (error) {
      console.error("Error fetching child profiles:", error);
      res.status(500).json({ message: "Failed to fetch child profiles" });
    }
  });

  // TODO: Implement child profile functionality
  /*
  app.post('/api/child-profiles', isAuthenticated, async (req: any, res) => {
    // Child profile creation - needs implementation in storage
  });
  */

  app.put('/api/child-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const childId = parseInt(req.params.id);
      const parentId = req.user.claims.sub;
      
      // Verify the child belongs to the authenticated parent
      const existingChild = await storage.getChildProfile(childId);
      if (!existingChild || existingChild.parentId !== parentId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData = insertChildProfileSchema.partial().parse(req.body);
      const updatedChild = await storage.updateChildProfile(childId, updateData);
      res.json(updatedChild);
    } catch (error) {
      console.error("Error updating child profile:", error);
      res.status(500).json({ message: "Failed to update child profile" });
    }
  });

  app.delete('/api/child-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const childId = parseInt(req.params.id);
      const parentId = req.user.claims.sub;
      
      // Verify the child belongs to the authenticated parent
      const existingChild = await storage.getChildProfile(childId);
      if (!existingChild || existingChild.parentId !== parentId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteChildProfile(childId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting child profile:", error);
      res.status(500).json({ message: "Failed to delete child profile" });
    }
  });

  // Device Mode Configuration Routes
  app.get('/api/device-mode-config/:deviceId', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = req.params.deviceId;
      const parentId = req.user.claims.sub;
      
      const deviceConfig = await storage.getDeviceModeConfig(deviceId, parentId);
      res.json(deviceConfig);
    } catch (error) {
      console.error("Error fetching device config:", error);
      res.status(500).json({ message: "Failed to fetch device config" });
    }
  });

  app.post('/api/device-mode-config', isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user.claims.sub;
      const { deviceId, mode, childProfileId, pin } = req.body;
      
      const deviceConfig = await storage.createOrUpdateDeviceModeConfig({
        deviceId,
        parentId,
        mode,
        childProfileId,
        pin,
      });
      
      res.json(deviceConfig);
    } catch (error) {
      console.error("Error updating device config:", error);
      res.status(500).json({ message: "Failed to update device config" });
    }
  });

  app.post('/api/device-mode-config/verify-pin', isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user.claims.sub;
      const { deviceId, pin } = req.body;
      
      const isValid = await storage.verifyDevicePin(deviceId, parentId, pin);
      
      if (isValid) {
        // Unlock the device by setting mode to parent
        await storage.unlockDevice(deviceId, parentId);
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "Invalid PIN" });
      }
    } catch (error) {
      console.error("Error verifying PIN:", error);
      res.status(500).json({ message: "Failed to verify PIN" });
    }
  });

  // Child profile routes
  app.get('/api/child-profiles/:parentId', isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.params.parentId;
      const profiles = await storage.getChildProfiles(parentId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching child profiles:", error);
      res.status(500).json({ message: "Failed to fetch child profiles" });
    }
  });

  app.post('/api/child-profiles', isAuthenticated, async (req: any, res) => {
    try {
      const { insertChildProfileSchema } = await import("@shared/schema");
      const profileData = insertChildProfileSchema.parse({
        ...req.body,
        parentId: req.user.claims.sub,
        qrCodeData: `UYP-CHILD-${Date.now()}-${req.user.claims.sub}`,
      });
      const profile = await storage.createChildProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error creating child profile:", error);
      res.status(500).json({ message: "Failed to create child profile" });
    }
  });

  app.put('/api/child-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const updatedProfile = await storage.updateChildProfile(profileId, req.body);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating child profile:", error);
      res.status(500).json({ message: "Failed to update child profile" });
    }
  });

  app.delete('/api/child-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      await storage.deleteChildProfile(profileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting child profile:", error);
      res.status(500).json({ message: "Failed to delete child profile" });
    }
  });

  // Device mode configuration routes
  app.get('/api/device-mode-config/:deviceId', isAuthenticated, async (req: any, res) => {
    try {
      const config = await storage.getDeviceModeConfig(req.params.deviceId);
      res.json(config);
    } catch (error) {
      console.error("Error fetching device mode config:", error);
      res.status(500).json({ message: "Failed to fetch device mode config" });
    }
  });

  app.post('/api/device-mode-config', isAuthenticated, async (req: any, res) => {
    try {
      const { deviceId, mode, childProfileId, pin } = req.body;
      
      // Hash the PIN if provided
      const pinHash = pin ? Buffer.from(pin).toString('base64') : null;
      
      const configData = {
        deviceId,
        parentId: req.user.claims.sub,
        mode,
        childProfileId: childProfileId || null,
        pinHash,
        isLocked: mode === 'player',
      };

      // Check if config already exists
      const existingConfig = await storage.getDeviceModeConfig(deviceId);
      
      let config;
      if (existingConfig) {
        config = await storage.updateDeviceModeConfig(deviceId, configData);
      } else {
        config = await storage.createDeviceModeConfig(configData);
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error creating/updating device mode config:", error);
      res.status(500).json({ message: "Failed to create/update device mode config" });
    }
  });

  app.post('/api/device-mode-config/verify-pin', isAuthenticated, async (req: any, res) => {
    try {
      const { deviceId, pin } = req.body;
      const isValid = await storage.verifyDevicePin(deviceId, pin);
      
      if (isValid) {
        // Temporarily unlock the device
        await storage.updateDeviceModeConfig(deviceId, { isLocked: false });
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: "Invalid PIN" });
      }
    } catch (error) {
      console.error("Error verifying PIN:", error);
      res.status(500).json({ message: "Failed to verify PIN" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time messaging
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join':
            clients.set(message.userId, ws);
            ws.teamId = message.teamId; // Store team ID on the connection
            break;
            
          case 'team_message':
            // This is now handled by the REST API endpoint
            // WebSocket is just for broadcasting
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

  // Test accounts endpoint for development/testing
  app.post('/api/test-accounts/create', async (req, res) => {
    try {
      const { id, type, name, email } = req.body;
      
      console.log('Creating test account with data:', { id, type, name, email });
      
      // Create dedicated test user in database
      const testUser = await storage.upsertUser({
        id: id,
        email: email,
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1] || '',
        userType: type,
        profileCompleted: true,
        qrCodeData: `UYP-${id}-${Date.now()}`,
        // Add basic required fields
        profileImageUrl: 'https://replit.com/public/images/mark.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('Test user created successfully:', testUser);

      res.json({ 
        success: true, 
        testUser: {
          id: testUser.id,
          name: `${testUser.firstName} ${testUser.lastName}`,
          email: testUser.email,
          type: testUser.userType
        },
        loginUrl: `/test-login/${testUser.id}`
      });
    } catch (error) {
      console.error("Detailed error creating test account:", error);
      res.status(500).json({ 
        message: "Failed to create test account", 
        error: (error as Error).message || "Unknown error"
      });
    }
  });

  // Test login endpoint - simulates signing in as a test user
  app.get('/test-login/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Test user not found" });
      }

      // Create a test session by manually setting up the user session
      const testUserSession = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: 'https://replit.com/public/images/mark.png'
        },
        access_token: 'test-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      // Set up the session
      req.login(testUserSession, (err) => {
        if (err) {
          console.error('Test login error:', err);
          return res.status(500).json({ message: "Failed to create test session" });
        }
        
        // Redirect to appropriate dashboard based on user type
        const redirectPath = user.userType === 'player' ? '/player-dashboard' : 
                           user.userType === 'admin' ? '/admin-dashboard' : '/parent-dashboard';
        console.log(`Redirecting ${user.userType} user to: ${redirectPath}`);
        res.redirect(redirectPath);
      });
    } catch (error) {
      console.error("Error in test login:", error);
      res.status(500).json({ message: "Failed to sign in as test user" });
    }
  });

  // Player Task routes
  app.get('/api/players/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const playerId = req.params.id;
      const date = req.query.date as string;
      
      const tasks = await storage.getPlayerTasks(playerId, date);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching player tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/players/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const playerId = req.params.id;
      const taskData = insertPlayerTaskSchema.parse({
        ...req.body,
        playerId,
      });
      
      const task = await storage.createPlayerTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating player task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put('/api/tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { completionMethod } = req.body;
      
      const task = await storage.completePlayerTask(taskId, completionMethod);
      
      // Award points for completion
      await storage.addPlayerPoints({
        playerId: task.playerId,
        taskId: task.id,
        points: task.pointsValue || 10,
        reason: `Completed: ${task.title}`
      });
      
      res.json(task);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.get('/api/players/:id/points', isAuthenticated, async (req: any, res) => {
    try {
      const playerId = req.params.id;
      const points = await storage.getPlayerPoints(playerId);
      const totalPoints = await storage.getPlayerTotalPoints(playerId);
      
      res.json({ points, totalPoints });
    } catch (error) {
      console.error("Error fetching player points:", error);
      res.status(500).json({ message: "Failed to fetch points" });
    }
  });

  // Auto-generate daily tasks for players
  app.post('/api/players/:id/generate-daily-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const playerId = req.params.id;
      const today = new Date().toISOString().split('T')[0];
      
      // Check if tasks already exist for today
      const existingTasks = await storage.getPlayerTasks(playerId, today);
      if (existingTasks.length > 0) {
        return res.json({ message: "Tasks already exist for today", tasks: existingTasks });
      }

      // Get player's events for today
      const events = await storage.getUserEvents(playerId);
      const todayEvents = events.filter(event => {
        const eventDate = new Date(event.startTime).toISOString().split('T')[0];
        return eventDate === today;
      });

      const tasksToCreate = [];

      // Create tasks for today's events
      todayEvents.forEach(event => {
        if (event.eventType === 'practice') {
          tasksToCreate.push({
            playerId,
            taskType: 'practice' as const,
            title: `${event.title}`,
            description: `Attend ${event.eventType} session`,
            pointsValue: 10,
            dueDate: today,
            eventId: event.id,
          });
        } else if (event.eventType === 'game') {
          tasksToCreate.push({
            playerId,
            taskType: 'game' as const,
            title: `${event.title}`,
            description: `Participate in game`,
            pointsValue: 15,
            dueDate: today,
            eventId: event.id,
          });
        }
      });

      // Add standard daily tasks
      if (tasksToCreate.length === 0) {
        tasksToCreate.push(
          {
            playerId,
            taskType: 'video' as const,
            title: 'Foundation Program: Week 3',
            description: 'Watch and complete training module',
            pointsValue: 10,
            dueDate: today,
          },
          {
            playerId,
            taskType: 'homework' as const,
            title: "Coach's Homework",
            description: 'Complete assigned ball handling drills',
            pointsValue: 10,
            dueDate: today,
          }
        );
      }

      // Create all tasks
      const createdTasks = [];
      for (const taskData of tasksToCreate) {
        const task = await storage.createPlayerTask(taskData);
        createdTasks.push(task);
      }

      res.json({ message: "Daily tasks generated", tasks: createdTasks });
    } catch (error) {
      console.error("Error generating daily tasks:", error);
      res.status(500).json({ message: "Failed to generate daily tasks" });
    }
  });

  return httpServer;
}
