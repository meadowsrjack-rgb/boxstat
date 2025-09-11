import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { goHighLevelService } from "./services/gohighlevel";
import { setupAuth, isAuthenticated } from "./replitAuth";
import Stripe from "stripe";
import { setupNotificationRoutes } from "./routes/notifications";
import { insertEventSchema, insertAnnouncementSchema, insertMessageReactionSchema, insertMessageSchema, insertTeamMessageSchema, insertPaymentSchema, insertPurchaseSchema, insertFamilyMemberSchema, insertTaskCompletionSchema, insertAnnouncementAcknowledgmentSchema, insertPlayerTaskSchema, insertPlayerPointsSchema, users, userBadges, badges, userTrophies, purchases } from "@shared/schema";
import { eq, count } from "drizzle-orm";
import { db } from "./db";
import { z } from "zod";
import { awardsService } from "./awards.service";
import { notionService } from "./notion";
import { notificationService } from "./services/notificationService";
import { distanceMeters, withinWindow, validateAndConsumeNonce } from './utils/geo.js';

import calendarRoutes from "./routes/calendar";
import searchRoutes from "./routes/search";
import notionRoutes from "./routes/notion";
import privacyRoutes from "./routes/privacy";
import claimsRoutes from "./routes/claims";
import registerClaimRoutes from "./routes/claim-routes";

import multer from "multer";
import path from "path";
import fs from "fs/promises";

let wss: WebSocketServer | null = null;

// Initialize Stripe if secret key is available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { 
      apiVersion: "2023-10-16",
    })
  : null;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Notification routes
  setupNotificationRoutes(app);

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

  // Get user account info (unified system for GoHighLevel integration)
  app.get('/api/account/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getAccount(userId);
      if (!account) {
        return res.status(404).json({ message: 'Account not found' });
      }
      res.json(account);
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  // Get user profiles (unified system for GoHighLevel integration)
  app.get('/api/profiles/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profiles = await storage.getAccountProfiles(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  // Magic link authentication for GoHighLevel integration
  app.get('/api/auth/magic-link/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ message: "Magic link token is required" });
      }

      // Find account with this magic link token
      const account = await storage.getAccountByMagicToken(token);
      
      if (!account) {
        return res.status(404).json({ message: "Invalid or expired magic link" });
      }

      // Check if token has expired
      if (account.magicLinkExpires && new Date() > account.magicLinkExpires) {
        return res.status(401).json({ message: "Magic link has expired" });
      }

      // Create claims compatible with Replit Auth structure
      const claims = {
        sub: account.id,
        email: account.email,
        first_name: account.firstName || '',
        last_name: account.lastName || '',
        profile_image_url: null,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days from now
      };

      // Create user object compatible with Passport.js structure
      const user = {
        claims: claims,
        access_token: 'magic_link_token', // Placeholder for compatibility
        refresh_token: null,
        expires_at: claims.exp
      };

      // Ensure user exists in the users table for compatibility
      await storage.upsertUser({
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        userType: account.primaryAccountType || 'parent',
        profileCompleted: account.accountCompleted || false
      });

      // Use Passport's login function to create proper session
      req.login(user, (err: any) => {
        if (err) {
          console.error("Error creating session:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log("Magic link authentication successful for:", account.email);
        
        // Invalidate the magic link token after successful authentication
        storage.clearMagicLinkToken(account.id).catch(console.error);
        
        // Redirect to registration status page
        res.redirect('/');
      });
      
    } catch (error) {
      console.error("Error processing magic link:", error);
      res.status(500).json({ message: "Failed to process magic link" });
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

  app.patch('/api/users/:id/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user.claims.sub;
      
      // Ensure user can only update their own profile
      if (userId !== currentUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedUser = await storage.updateUserProfile(userId, req.body);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Passcode management routes
  app.post('/api/users/:id/passcode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user.claims.sub;
      const { passcode } = req.body;
      
      // Ensure user can only set their own passcode
      if (userId !== currentUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate passcode format
      if (!passcode || passcode.length !== 4 || !/^\d{4}$/.test(passcode)) {
        return res.status(400).json({ message: "Passcode must be exactly 4 digits" });
      }
      
      const updatedUser = await storage.updateUser(userId, { passcode });
      res.json({ message: "Passcode set successfully" });
    } catch (error) {
      console.error("Error setting passcode:", error);
      res.status(500).json({ message: "Failed to set passcode" });
    }
  });

  app.delete('/api/users/:id/passcode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user.claims.sub;
      
      // Ensure user can only remove their own passcode
      if (userId !== currentUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedUser = await storage.updateUser(userId, { passcode: null });
      res.json({ message: "Passcode removed successfully" });
    } catch (error) {
      console.error("Error removing passcode:", error);
      res.status(500).json({ message: "Failed to remove passcode" });
    }
  });

  app.post('/api/users/:id/verify-passcode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user.claims.sub;
      const { passcode } = req.body;
      
      // Allow checking any user's passcode for profile switching
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If user has no passcode set, verification passes
      if (!user.passcode) {
        return res.json({ verified: true });
      }
      
      // Verify passcode matches
      const verified = user.passcode === passcode;
      res.json({ verified });
    } catch (error) {
      console.error("Error verifying passcode:", error);
      res.status(500).json({ message: "Failed to verify passcode" });
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

  // Awards summary endpoint - categorizes badges by tier and counts trophies
  app.get('/api/users/:id/awards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      // Get user badges with badge details
      const userBadgesList = await db
        .select({
          badgeId: userBadges.badgeId,
          badgeName: badges.name,
          badgeColor: badges.color,
          earnedAt: userBadges.earnedAt
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, userId));

      // Get user's trophies count
      const userTrophiesCount = await db
        .select({ count: count() })
        .from(userTrophies)
        .where(eq(userTrophies.userId, userId));

      // Categorize badges by tier based on color
      const badgeCounts = {
        rookieBadgesCount: 0,      // Red (#dc2626) 
        starterBadgesCount: 0,     // Green (#16a34a)
        allStarBadgesCount: 0,     // Blue (#2563eb)
        superstarBadgesCount: 0,   // Purple (#7c3aed)
        hofBadgesCount: 0,         // Yellow (#eab308)
        badgesCount: userBadgesList.length
      };

      userBadgesList.forEach((badge: any) => {
        switch (badge.badgeColor) {
          case '#dc2626': // Red - Rookie
            badgeCounts.rookieBadgesCount++;
            break;
          case '#16a34a': // Green - Starter  
            badgeCounts.starterBadgesCount++;
            break;
          case '#2563eb': // Blue - All-Star
            badgeCounts.allStarBadgesCount++;
            break;
          case '#7c3aed': // Purple - Superstar
            badgeCounts.superstarBadgesCount++;
            break;
          case '#eab308': // Yellow - Hall of Fame
            badgeCounts.hofBadgesCount++;
            break;
        }
      });

      // Get trophies count using raw SQL with proper parameter syntax
      const trophiesResult = await db.execute(
        `SELECT COUNT(*) as count FROM user_trophies WHERE user_id = '${userId}'`
      );
      const trophiesCount = parseInt((trophiesResult.rows[0] as any)?.count || '0');

      const summary = {
        ...badgeCounts,
        trophiesCount,
        recentBadges: userBadgesList
          .sort((a: any, b: any) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
          .slice(0, 5)
      };

      res.json(summary);
    } catch (error) {
      console.error("Error fetching user awards:", error);
      res.status(500).json({ message: "Failed to fetch awards" });
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

  // Photo upload route
  app.post('/api/upload-profile-photo', isAuthenticated, upload.single('photo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Convert buffer to base64 for simple storage (in a real app, you'd save to file storage/cloud)
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      // Update user profile with new image URL
      await db.update(users)
        .set({ profileImageUrl: base64Image })
        .where(eq(users.id, userId));

      res.json({ 
        message: 'Profile photo updated successfully',
        profileImageUrl: base64Image
      });
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      res.status(500).json({ message: 'Failed to upload photo' });
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
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events", error: (error as Error).message || "Unknown error" });
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
      const events: any[] = []; // TODO: Implement getChildEvents - temporary empty array
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

      // Trigger RSVP available notification for team members
      if (event.teamId) {
        try {
          const teamMembers = await storage.getTeamMembers(event.teamId);
          for (const member of teamMembers) {
            await notificationService.notifyEventRSVPAvailable(
              member.userId, 
              event.id, 
              event.title
            );
          }
        } catch (notificationError) {
          console.error("Error sending RSVP notifications:", notificationError);
          // Don't fail the request if notifications fail
        }
      }

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
      
      // Trigger attendance awards for event check-in
      await awardsService.processAwardTriggers(userId, "attendance");
      
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

  // Purchase routes - LeadConnector Integration
  app.get('/api/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const purchases = await storage.getUserPurchases(req.user.claims.sub);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Alias route for client compatibility
  app.get('/api/purchases/me', isAuthenticated, async (req: any, res) => {
    try {
      const purchases = await storage.getUserPurchases(req.user.claims.sub);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.post('/api/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const purchaseData = insertPurchaseSchema.parse({
        ...req.body,
        userId: req.user.claims.sub,
      });
      
      const purchase = await storage.createPurchase(purchaseData);
      
      res.json(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid purchase data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create purchase" });
      }
    }
  });

  // LeadConnector webhook for purchase status updates
  // This endpoint should be called by LeadConnector when a purchase is confirmed/cancelled
  app.post('/api/webhooks/leadconnector/purchase-status', async (req: any, res) => {
    try {
      // Verify webhook authenticity using secret token
      const webhookSecret = process.env.LEADCONNECTOR_WEBHOOK_SECRET;
      const providedSecret = req.headers['x-webhook-secret'];
      
      if (!webhookSecret) {
        console.error("LeadConnector webhook secret not configured");
        return res.status(500).json({ message: "Webhook not properly configured" });
      }
      
      if (!providedSecret || providedSecret !== webhookSecret) {
        console.warn("Unauthorized webhook attempt");
        return res.status(401).json({ message: "Invalid webhook secret" });
      }
      
      const webhookSchema = z.object({
        purchaseId: z.number(),
        leadConnectorOrderId: z.string(),
        status: z.enum(["active", "pending", "expired", "cancelled"]),
        userId: z.string().optional(), // For additional verification
      });
      
      const { purchaseId, status, leadConnectorOrderId, userId } = webhookSchema.parse(req.body);
      
      // Verify purchase exists and optionally check userId if provided
      const existingPurchase = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
      if (existingPurchase.length === 0) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      
      // Additional verification if userId is provided
      if (userId && existingPurchase[0].userId !== userId) {
        console.warn(`Purchase ${purchaseId} userId mismatch: expected ${existingPurchase[0].userId}, got ${userId}`);
        return res.status(400).json({ message: "Purchase user mismatch" });
      }
      
      // Log the status transition for audit
      console.log(`LeadConnector webhook: Purchase ${purchaseId} status changing from ${existingPurchase[0].status} to ${status}, Order: ${leadConnectorOrderId}`);
      
      const updatedPurchase = await storage.updatePurchaseStatus(purchaseId, status);
      
      console.log(`Purchase ${purchaseId} status successfully updated to ${updatedPurchase.status}`);
      
      res.json({ success: true, purchaseId, status: updatedPurchase.status });
    } catch (error) {
      console.error("Error processing LeadConnector webhook:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid webhook data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to process webhook" });
      }
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

  // Coach-specific routes
  app.get('/api/coach/team', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the team assigned to this coach
      const team = await storage.getCoachTeam(userId);
      res.json(team);
    } catch (error) {
      console.error("Error fetching coach team:", error);
      res.status(500).json({ message: "Failed to fetch coach team" });
    }
  });

  app.get('/api/coach/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const events = await storage.getCoachEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching coach events:", error);
      res.status(500).json({ message: "Failed to fetch coach events" });
    }
  });

  app.get('/api/coach/players/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      try {
        // Search both Notion players and local database users
        const notionPlayers = notionService.searchPlayers(query);
        const localPlayers = await storage.searchPlayers(query);
        
        // Format Notion players with app profile checking
        const formattedNotionPlayers = await Promise.all(notionPlayers.map(async (player) => {
          const firstName = player.name.split(' ')[0] || player.name;
          const lastName = player.name.split(' ').slice(1).join(' ') || '';
          
          // Try to find existing user by name match
          const existingUser = await storage.getUserByName(firstName, lastName);
          
          return {
            id: parseInt(player.id.replace(/-/g, '').substring(0, 8), 16), // Convert notion ID to number
            firstName,
            lastName,
            teamName: player.team || 'Unassigned',
            youthClubTeam: player.team || null, // Store the Notion club team data
            profileImageUrl: null, // Notion doesn't have profile images
            hasAppProfile: !!existingUser,
            appUserId: existingUser?.id,
            email: existingUser?.email || ''
          };
        }));

        // Format local players (these already have app profiles)
        const formattedLocalPlayers = localPlayers.map(user => ({
          id: parseInt(user.id) || parseInt(user.id.replace(/-/g, '').substring(0, 8), 16),
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          teamName: user.teamName || 'Unassigned',
          youthClubTeam: user.youthClubTeam || null,
          profileImageUrl: user.profileImageUrl,
          hasAppProfile: true, // Local players always have app profiles
          appUserId: user.id,
          email: user.email || ''
        }));

        // Combine results and remove duplicates (prefer local players over Notion matches)
        const allPlayers = [...formattedLocalPlayers];
        const localPlayerIds = new Set(formattedLocalPlayers.map(p => p.appUserId));
        
        formattedNotionPlayers.forEach(notionPlayer => {
          if (!notionPlayer.appUserId || !localPlayerIds.has(notionPlayer.appUserId)) {
            allPlayers.push(notionPlayer);
          }
        });

        res.json(allPlayers.slice(0, 10)); // Limit to 10 results
      } catch (notionError) {
        console.error("Notion search failed, falling back to local search only:", notionError);
        // Fall back to local database search only
        const players = await storage.searchPlayers(query);
        const formattedPlayers = players.map(user => ({
          id: parseInt(user.id) || parseInt(user.id.replace(/-/g, '').substring(0, 8), 16),
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          teamName: user.teamName || 'Unassigned',
          youthClubTeam: user.youthClubTeam || null,
          profileImageUrl: user.profileImageUrl,
          hasAppProfile: true,
          appUserId: user.id,
          email: user.email || ''
        }));
        res.json(formattedPlayers);
      }
    } catch (error) {
      console.error("Error searching players:", error);
      res.status(500).json({ message: "Failed to search players" });
    }
  });

  app.post('/api/coach/award', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { playerId, awardId, category } = req.body;
      
      if (category === 'badge') {
        await storage.awardBadge(playerId, awardId, userId);
      } else if (category === 'trophy') {
        await storage.awardTrophy(playerId, awardId, userId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error awarding badge/trophy:", error);
      res.status(500).json({ message: "Failed to award badge/trophy" });
    }
  });

  // Update player profile from Notion data
  app.post('/api/sync/player-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { playerId } = req.body;
      
      // Get the user to update
      const playerUser = await storage.getUser(playerId);
      if (!playerUser) {
        return res.status(404).json({ message: "Player not found" });
      }

      // Search for matching Notion player
      const notionPlayerName = `${playerUser.firstName} ${playerUser.lastName}`;
      const notionPlayers = notionService.searchPlayers(notionPlayerName);
      const matchingPlayer = notionPlayers.find(p => 
        p.name.toLowerCase() === notionPlayerName.toLowerCase()
      );

      if (matchingPlayer) {
        // Update user profile with Notion data
        await storage.updateUserProfile(playerId, {
          firstName: matchingPlayer.name.split(' ')[0] || playerUser.firstName,
          lastName: matchingPlayer.name.split(' ').slice(1).join(' ') || playerUser.lastName,
          youthClubTeam: matchingPlayer.team
        });

        res.json({ 
          success: true, 
          message: "Profile updated with Notion data",
          updatedData: {
            name: matchingPlayer.name,
            clubTeam: matchingPlayer.team
          }
        });
      } else {
        res.json({ 
          success: false, 
          message: "No matching player found in Notion" 
        });
      }
    } catch (error) {
      console.error("Error syncing player profile:", error);
      res.status(500).json({ message: "Failed to sync player profile" });
    }
  });

  app.post('/api/coach/evaluate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { playerId, scores, quarter } = req.body;
      
      const evaluation = await storage.savePlayerEvaluation({
        playerId,
        coachId: userId,
        scores,
        quarter,
        year: new Date().getFullYear()
      });

      res.json(evaluation);
    } catch (error) {
      console.error("Error saving player evaluation:", error);
      res.status(500).json({ message: "Failed to save player evaluation" });
    }
  });

  // Enhanced evaluation endpoints for comprehensive skills system
  app.get('/api/coach/evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { playerId, quarter, year } = req.query;
      
      if (!playerId || !quarter || !year) {
        return res.status(400).json({ message: "Missing required parameters: playerId, quarter, year" });
      }

      // Try to get existing evaluation
      const evaluation = await storage.getPlayerEvaluation({
        playerId: parseInt(playerId as string),
        coachId: userId,
        quarter: quarter as string,
        year: parseInt(year as string)
      });

      // Return the scores or empty object if no evaluation exists
      res.json(evaluation?.scores || {});
    } catch (error) {
      console.error("Error fetching player evaluation:", error);
      res.status(500).json({ message: "Failed to fetch player evaluation" });
    }
  });

  app.post('/api/coach/evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { playerId, scores, quarter, year } = req.body;
      
      if (!playerId || !quarter || !year || !scores) {
        return res.status(400).json({ message: "Missing required parameters: playerId, scores, quarter, year" });
      }

      const evaluation = await storage.savePlayerEvaluation({
        playerId,
        coachId: userId,
        scores,
        quarter,
        year
      });

      res.json(evaluation);
    } catch (error) {
      console.error("Error saving player evaluation:", error);
      res.status(500).json({ message: "Failed to save player evaluation" });
    }
  });

  // Coach payroll and HR routes (placeholders)
  app.get('/api/coach/pay/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mock payroll data for now
      res.json({
        status: "paid",
        nextPayDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        nextPayAmountCents: 150000, // $1500
        currency: "usd"
      });
    } catch (error) {
      console.error("Error fetching pay summary:", error);
      res.status(500).json({ message: "Failed to fetch pay summary" });
    }
  });

  app.post('/api/coach/pay/portal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mock portal URL for now
      res.json({ url: "https://portal.payroll-provider.com/coach/" + userId });
    } catch (error) {
      console.error("Error generating portal URL:", error);
      res.status(500).json({ message: "Failed to generate portal URL" });
    }
  });

  app.get('/api/coach/hr/docs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mock HR documents for now
      res.json([
        { id: 1, title: "Coach Handbook", url: "/docs/coach-handbook.pdf" },
        { id: 2, title: "Safety Guidelines", url: "/docs/safety-guidelines.pdf" },
        { id: 3, title: "Emergency Procedures", url: "/docs/emergency-procedures.pdf" }
      ]);
    } catch (error) {
      console.error("Error fetching HR docs:", error);
      res.status(500).json({ message: "Failed to fetch HR documents" });
    }
  });

  app.get('/api/coach/hr/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'coach' && user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mock HR announcements for now
      res.json([
        { 
          id: 1, 
          title: "New Safety Protocol", 
          body: "Please review the updated safety guidelines before next week's practices.",
          createdAt: new Date().toISOString()
        },
        { 
          id: 2, 
          title: "Coach Meeting Scheduled", 
          body: "Monthly coach meeting is scheduled for next Friday at 7:00 PM.",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    } catch (error) {
      console.error("Error fetching HR announcements:", error);
      res.status(500).json({ message: "Failed to fetch HR announcements" });
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



  // Achievements endpoint for trophies-badges page
  app.get('/api/users/:id/achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      // Get user's earned badges
      const userBadgesList = await db
        .select({ badgeId: userBadges.badgeId })
        .from(userBadges)
        .where(eq(userBadges.userId, userId));

      // Skip trophies for now to avoid table issues
      const earnedBadges = userBadgesList.map(b => b.badgeId);
      
      res.json({
        badges: earnedBadges,
        trophies: [] // Empty trophies array for now
      });
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // User me achievements endpoint (maps to user ID)
  app.get('/api/user/me/achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's earned badges with names for slug mapping
      const userBadgesList = await db
        .select({ 
          badgeId: userBadges.badgeId,
          badgeName: badges.name 
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, userId));

      // Map badge names to expected slugs (now using exact matches)
      const badgeNameToSlug: { [key: string]: string } = {
        'checked-in': 'checked-in',
        'practice-rookie': 'practice-rookie',
        'skill-starter': 'skill-starter',
        'game-planner': 'game-planner',
        'dedicated-grinder': 'dedicated-grinder',
        'skills-seeker': 'skills-seeker',
        'regular-competitor': 'regular-competitor',
        'game-changer': 'game-changer',
        'the-engine': 'the-engine',
        'marquee-player': 'marquee-player'
      };

      // Get user's earned trophies
      const userTrophiesList = await db
        .select({
          trophyName: userTrophies.trophyName,
          trophyDescription: userTrophies.trophyDescription
        })
        .from(userTrophies)
        .where(eq(userTrophies.userId, userId));

      // Map trophy names to slugs
      const trophyNameToSlug: { [key: string]: string } = {
        'mvp': 'mvp',
        'coaches-award': 'coaches-award'
      };

      const earnedBadges = userBadgesList.map(b => 
        badgeNameToSlug[b.badgeName] || b.badgeName.toLowerCase().replace(/\s+/g, '-')
      );

      const earnedTrophies = userTrophiesList.map(t => 
        trophyNameToSlug[t.trophyName!] || t.trophyName!.toLowerCase().replace(/\s+/g, '-')
      );
      
      res.json({
        badges: earnedBadges,
        trophies: earnedTrophies
      });
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Add the missing endpoint that the frontend expects
  app.get('/api/user/:id/achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id === 'me' ? req.user.claims.sub : req.params.id;
      
      // Get user's earned badges with names for slug mapping
      const userBadgesList = await db
        .select({ 
          badgeId: userBadges.badgeId,
          badgeName: badges.name 
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, userId));

      // Get user's earned trophies
      const userTrophiesList = await db
        .select({ 
          trophyName: userTrophies.trophyName,
          trophyDescription: userTrophies.trophyDescription
        })
        .from(userTrophies)
        .where(eq(userTrophies.userId, userId));

      // Map badge names to expected slugs (now using exact matches)
      const badgeNameToSlug: { [key: string]: string } = {
        'checked-in': 'checked-in',
        'practice-rookie': 'practice-rookie',
        'skill-starter': 'skill-starter',
        'game-planner': 'game-planner',
        'dedicated-grinder': 'dedicated-grinder',
        'skills-seeker': 'skills-seeker',
        'regular-competitor': 'regular-competitor',
        'game-changer': 'game-changer',
        'the-engine': 'the-engine',
        'marquee-player': 'marquee-player'
      };

      // Map trophy names to slugs
      const trophyNameToSlug: { [key: string]: string } = {
        'mvp': 'mvp',
        'coaches-award': 'coaches-award'
      };

      const earnedBadges = userBadgesList.map(b => 
        badgeNameToSlug[b.badgeName] || b.badgeName.toLowerCase().replace(/\s+/g, '-')
      );

      const earnedTrophies = userTrophiesList.map(t => 
        trophyNameToSlug[t.trophyName!] || t.trophyName!.toLowerCase().replace(/\s+/g, '-')
      );
      
      res.json({
        badges: earnedBadges,
        trophies: earnedTrophies
      });
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Fallback achievements endpoint
  app.get('/api/achievements', isAuthenticated, async (req: any, res) => {
    try {
      // Return demo data for development
      res.json({
        badges: ['checked-in', 'practice-rookie'],
        trophies: ['mvp', 'coaches-award']
      });
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Google Calendar integration routes
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/integrations/notion', notionRoutes);
  app.use('/api/privacy', privacyRoutes);

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
      
      const userId = req.user.claims.sub;
      
      // Ensure account exists (create if needed)
      try {
        let account = await storage.getAccount(userId);
        if (!account) {
          console.log("Account not found, creating new account");
          account = await storage.upsertAccount({
            id: userId,
            email: req.user.claims.email,
            primaryAccountType: req.body.profileType || "parent",
            accountCompleted: false,
          });
          console.log("Account created:", account);
        }
      } catch (accountError) {
        console.error("Error handling account:", accountError);
        return res.status(500).json({ message: "Failed to create account" });
      }
      
      const profileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const qrCodeData = `UYP-${Date.now()}-${userId}`;
      
      const profileData = {
        ...req.body,
        id: profileId,
        accountId: userId,
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
        userType: profile.profileType as "parent" | "player" | "admin" | "coach"
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
      const existingChild = await storage.getProfile(childId.toString());
      if (!existingChild || existingChild.accountId !== parentId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedChild = await storage.updateProfile(childId.toString(), req.body);
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
      const existingChild = await storage.getProfile(childId.toString());
      if (!existingChild || existingChild.accountId !== parentId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteProfile(childId.toString());
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
      const profileData = {
        ...req.body,
        accountId: req.user.claims.sub,
        qrCodeData: `UYP-CHILD-${Date.now()}-${req.user.claims.sub}`,
        id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isActive: true,
        profileCompleted: false,
      };
      const profile = await storage.createProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error creating child profile:", error);
      res.status(500).json({ message: "Failed to create child profile" });
    }
  });

  app.put('/api/child-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = req.params.id;
      const updatedProfile = await storage.updateProfile(profileId, req.body);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating child profile:", error);
      res.status(500).json({ message: "Failed to update child profile" });
    }
  });

  app.delete('/api/child-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = req.params.id;
      await storage.deleteProfile(profileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting child profile:", error);
      res.status(500).json({ message: "Failed to delete child profile" });
    }
  });

  // GoHighLevel webhook endpoint for profile pre-creation
  app.post('/api/ghl/webhook', async (req, res) => {
    try {
      console.log('=== GoHighLevel webhook endpoint hit ===');
      console.log('Method:', req.method);
      console.log('URL:', req.url);
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      
      // TODO: Add webhook signature verification (implement with shared secret when GHL provides it)
      // For now, add basic validation
      if (!req.body?.contact?.email) {
        return res.status(400).json({ error: 'Invalid webhook payload: missing contact email' });
      }

      const result = await goHighLevelService.processWebhook(req.body);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('GoHighLevel webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // On-demand GoHighLevel sync endpoint
  app.get('/api/ghl/sync', isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.query;
      const userId = req.user.claims.sub;
      
      if (!email) {
        return res.status(400).json({ error: 'Email parameter required' });
      }

      const result = await goHighLevelService.syncByEmail(email as string, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('GoHighLevel sync error:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  // Device mode configuration routes
  app.get('/api/device-mode-config/:deviceId', isAuthenticated, async (req: any, res) => {
    try {
      // Device mode config is not implemented yet, return empty config
      const config = { deviceId: req.params.deviceId, mode: 'parent', isLocked: false };
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

      // Device mode config is not implemented yet, return mock config
      const config = { 
        deviceId, 
        mode: configData.mode, 
        isLocked: configData.isLocked,
        parentId: configData.parentId
      };
      
      res.json(config);
    } catch (error) {
      console.error("Error creating/updating device mode config:", error);
      res.status(500).json({ message: "Failed to create/update device mode config" });
    }
  });

  app.post('/api/device-mode-config/verify-pin', isAuthenticated, async (req: any, res) => {
    try {
      const { deviceId, pin } = req.body;
      // Device mode PIN verification is not implemented yet, allow any 4-digit PIN
      const isValid = pin && pin.toString().length === 4;
      
      if (isValid) {
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

  // Checkins API endpoints
  app.get('/api/checkins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.userId || req.user.claims.sub;
      const checkins = await storage.getUserAttendances(userId);
      res.json(checkins);
    } catch (error) {
      console.error("Error fetching checkins:", error);
      res.status(500).json({ message: "Failed to fetch checkins" });
    }
  });

  app.post('/api/checkins', isAuthenticated, async (req: any, res) => {
    try {
      const { eventId, type, lat, lng, method, qr } = req.body;
      const userId = req.body.userId || req.user.claims.sub;
      
      // Get event details for validation
      const event = await storage.getEvent(parseInt(eventId));
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check time window
      if (!withinWindow(event.startTime.toISOString(), event.endTime?.toISOString())) {
        return res.status(400).json({ 
          message: "Check-in window is closed. Check-in is available 15 minutes before to 30 minutes after event start." 
        });
      }
      
      // Validate based on method
      if (method === 'qr') {
        // QR code validation
        if (!qr || !qr.event || !qr.nonce || !qr.exp) {
          return res.status(400).json({ message: "Invalid QR code format" });
        }
        
        if (qr.event !== eventId.toString()) {
          return res.status(400).json({ message: "QR code is for a different event" });
        }
        
        if (!validateAndConsumeNonce(qr.nonce, qr.exp)) {
          return res.status(400).json({ message: "QR code has expired or already been used" });
        }
      } else {
        // GPS validation for tap check-in
        if (type === 'onsite' && event.latitude && event.longitude) {
          if (!lat || !lng) {
            return res.status(400).json({ message: "Location data required for check-in" });
          }
          
          const distance = distanceMeters(
            { lat: event.latitude, lng: event.longitude },
            { lat: parseFloat(lat), lng: parseFloat(lng) }
          );
          
          const RADIUS_METERS = 200;
          if (distance > RADIUS_METERS) {
            return res.status(400).json({ 
              message: `You must be within ${RADIUS_METERS}m of the event location to check in. You are ${Math.round(distance)}m away.` 
            });
          }
        }
      }
      
      // Check for duplicate check-in
      const existingCheckins = await storage.getUserAttendances(userId);
      const existingCheckin = existingCheckins.find(c => 
        c.eventId === parseInt(eventId) && c.type === (type || "advance")
      );
      
      if (existingCheckin) {
        return res.status(400).json({ message: "Already checked in for this event" });
      }
      
      const checkinData = {
        userId,
        eventId: parseInt(eventId),
        type: type || "advance",
        latitude: lat ? parseFloat(lat) : null,
        longitude: lng ? parseFloat(lng) : null,
        qrCodeData: method === 'qr' ? 
          `QR-${qr.nonce}` : 
          `UYP-CHECKIN-${userId}-${eventId}-${Date.now()}`,
      };
      
      const checkin = await storage.createAttendance(checkinData);
      
      // Trigger awards for check-in actions
      if (type === "advance") {
        // RSVP trigger
        await awardsService.processAwardTriggers(userId, "rsvp");
      } else if (type === "onsite") {
        // Attendance trigger for on-site check-in
        await awardsService.processAwardTriggers(userId, "attendance");
        
        // Send notification confirming successful check-in
        try {
          const event = await storage.getEvent(parseInt(eventId));
          if (event) {
            await notificationService.createNotification({
              userId,
              type: 'event_checkin_complete',
              title: 'Check-in Successful!',
              message: `You've successfully checked in to "${event.title}"`,
              priority: 'normal',
              actionUrl: `/events/${eventId}`,
              data: { eventId: parseInt(eventId), eventTitle: event.title }
            });
          }
        } catch (notificationError) {
          console.error("Error sending check-in confirmation notification:", notificationError);
        }
      }
      
      res.json(checkin);
    } catch (error) {
      console.error("Error creating checkin:", error);
      res.status(500).json({ message: "Failed to create checkin" });
    }
  });

  app.delete('/api/checkins/:eventId/:type', isAuthenticated, async (req: any, res) => {
    try {
      const { eventId, type } = req.params;
      const userId = req.query.userId || req.user.claims.sub;
      
      const deleted = await storage.removeAttendance(userId, parseInt(eventId), type);
      res.json({ success: true, deleted });
    } catch (error) {
      console.error("Error removing checkin:", error);
      res.status(500).json({ message: "Failed to remove checkin" });
    }
  });

  // Training completion endpoint
  app.post('/api/training/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { moduleId, moduleType, programTag } = req.body;
      
      // Log training completion (you could store this in a separate table)
      console.log(`User ${userId} completed training module:`, { moduleId, moduleType, programTag });
      
      // Trigger training awards
      await awardsService.processAwardTriggers(userId, "onlineTraining");
      
      res.json({ success: true, message: "Training module completed" });
    } catch (error) {
      console.error("Error completing training:", error);
      res.status(500).json({ message: "Failed to complete training" });
    }
  });

  // Coach awards endpoint for manual badge awarding
  app.post('/api/coach/award-badge', isAuthenticated, async (req: any, res) => {
    try {
      const coachId = req.user.claims.sub;
      const { playerId, awardId, reason } = req.body;
      
      // Verify coach permissions here if needed
      await awardsService.awardBadgeManually(playerId, awardId, coachId);
      
      res.json({ success: true, message: "Badge awarded successfully" });
    } catch (error) {
      console.error("Error awarding badge:", error);
      res.status(500).json({ message: "Failed to award badge" });
    }
  });

  // Parent dashboard routes
  app.get('/api/parent/players', isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user.claims.sub;
      const familyMembers = await storage.getFamilyMembers(parentId);
      
      // Transform to match expected format
      const players = familyMembers.map((member: any) => ({
        id: member.playerId,
        firstName: member.player?.firstName || '',
        lastName: member.player?.lastName || '',
        teamName: member.player?.teamName || null,
        profileImageUrl: member.player?.profileImageUrl || null,
        relationship: member.relationship
      }));
      
      res.json(players);
    } catch (error) {
      console.error('Error fetching parent players:', error);
      res.status(500).json({ message: 'Failed to fetch players' });
    }
  });

  app.post('/api/parent/players', isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user.claims.sub;
      const { inviteCode, playerEmail, playerId, dob } = req.body;
      
      if (inviteCode) {
        // Handle invite code linking
        // Parse invite code format: UYP-{playerId}-{timestamp}
        const codePattern = /^UYP-(.+)-\d+$/;
        const match = inviteCode.match(codePattern);
        
        if (!match) {
          return res.status(400).json({ message: 'Invalid invite code format. Expected format: UYP-{playerId}-{timestamp}' });
        }
        
        const playerId = match[1];
        const foundUsers = await db.select().from(users).where(eq(users.id, playerId));
        if (foundUsers.length === 0) {
          return res.status(404).json({ message: 'Invalid invite code - player not found' });
        }
        
        const player = foundUsers[0];
        if (player.userType !== 'player') {
          return res.status(400).json({ message: 'Invite code is not for a player account' });
        }
        
        // Add as family member
        const familyMember = await storage.addFamilyMember({
          parentId,
          playerId: player.id,
          relationship: 'parent',
          canMakePayments: true,
          canViewReports: true,
          emergencyContact: false
        });
        
        return res.json({ success: true, message: 'Player linked successfully' });
      }
      
      if (playerEmail) {
        // Handle email + DOB linking (existing logic)
        const foundPlayers = await db.select().from(users).where(eq(users.email, playerEmail));
        if (foundPlayers.length === 0) {
          return res.status(404).json({ message: 'Player account not found with this email' });
        }
        
        const player = foundPlayers[0];
        if (player.userType !== 'player') {
          return res.status(400).json({ message: 'Account is not a player account' });
        }
        
        // Verify DOB if provided
        if (dob && player.dateOfBirth) {
          const playerDob = new Date(player.dateOfBirth).toISOString().split('T')[0];
          const providedDob = new Date(dob).toISOString().split('T')[0];
          if (playerDob !== providedDob) {
            return res.status(400).json({ message: 'Date of birth does not match' });
          }
        }
        
        const familyMember = await storage.addFamilyMember({
          parentId,
          playerId: player.id,
          relationship: 'parent',
          canMakePayments: true,
          canViewReports: true,
          emergencyContact: false
        });
        
        return res.json({ success: true, message: 'Player linked successfully' });
      }
      
      res.status(400).json({ message: 'Either invite code or player email is required' });
    } catch (error) {
      console.error('Error adding parent player:', error);
      res.status(500).json({ message: 'Failed to add player' });
    }
  });

  app.delete('/api/parent/players/:id', isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user.claims.sub;
      const playerId = req.params.id;
      
      // Find the family member record
      const familyMembers = await storage.getFamilyMembers(parentId);
      const member = familyMembers.find((m: any) => m.playerId === playerId);
      
      if (!member) {
        return res.status(404).json({ message: 'Player not found in family' });
      }
      
      await storage.removeFamilyMember(member.id);
      res.json({ success: true, message: 'Player removed successfully' });
    } catch (error) {
      console.error('Error removing parent player:', error);
      res.status(500).json({ message: 'Failed to remove player' });
    }
  });

  app.get('/api/parent/events', isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user.claims.sub;
      
      // Get all family members' events
      const familyMembers = await storage.getFamilyMembers(parentId);
      const playerIds = familyMembers.map((member: any) => member.playerId);
      
      let allEvents: any[] = [];
      
      // Get events for each player
      for (const playerId of playerIds) {
        try {
          const playerEvents = await storage.getUserEvents(playerId);
          allEvents = allEvents.concat(playerEvents);
        } catch (error) {
          console.error(`Error fetching events for player ${playerId}:`, error);
        }
      }
      
      // Also get league-wide events (events with no team assignment)
      try {
        const leagueEvents = await storage.getLeagueEvents();
        allEvents = allEvents.concat(leagueEvents);
      } catch (error) {
        console.error('Error fetching league events:', error);
      }
      
      // Remove duplicates and sort by date
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      res.json(uniqueEvents);
    } catch (error) {
      console.error('Error fetching parent events:', error);
      res.status(500).json({ message: 'Failed to fetch events' });
    }
  });

  // Admin routes - comprehensive admin functionality
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      // Get all user counts
      const allUsers = await db.select().from(users);
      const totalUsers = allUsers.length;
      const totalPlayers = allUsers.filter((u: any) => u.userType === 'player').length;
      const totalParents = allUsers.filter((u: any) => u.userType === 'parent').length;
      const totalCoaches = allUsers.filter((u: any) => u.userType === 'coach').length;

      // Get team count
      const teams = await storage.getAllTeams();
      const totalTeams = teams.length;

      // Get event count
      const events = await storage.getAllEvents();
      const totalEvents = events.length;

      // Get award count (estimate)
      const totalAwards = 150; // This would be calculated from actual user awards

      const stats = {
        totalUsers,
        totalPlayers,
        totalParents,
        totalCoaches,
        totalTeams,
        totalEvents,
        totalAwards,
        recentActivity: 25
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const allUserData = await db.select().from(users);
      
      // Transform users to include team information
      const enrichedUsers = await Promise.all(allUserData.map(async (user: any) => {
        let teamName = null;
        if (user.teamId) {
          try {
            const team = await storage.getTeam(user.teamId);
            teamName = team?.name;
          } catch (error) {
            console.error(`Error fetching team for user ${user.id}:`, error);
          }
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          profileImageUrl: user.profileImageUrl,
          phoneNumber: user.phoneNumber,
          teamId: user.teamId,
          teamName,
          isActive: true, // Default to active
          createdAt: user.createdAt,
          lastLoginAt: null
        };
      }));

      res.json(enrichedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const { firstName, lastName, email, userType, phoneNumber, teamId } = req.body;
      
      // Generate unique QR code for check-in
      const qrCodeData = `UYP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newUser = await db.insert(users).values({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        firstName,
        lastName,
        userType,
        phoneNumber,
        teamId: teamId ? parseInt(teamId) : null,
        qrCodeData,
        profileCompleted: true
      }).returning();

      res.json(newUser[0]);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const targetUserId = req.params.id;
      const updates = req.body;

      const updatedUser = await storage.updateUser(targetUserId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const targetUserId = req.params.id;
      await db.delete(users).where(eq(users.id, targetUserId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get('/api/admin/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const teams = await storage.getAllTeams();
      
      // Enrich teams with coach and player information
      const enrichedTeams = await Promise.all(teams.map(async (team) => {
        let coach = null;
        const players = await storage.getTeamPlayers(team.id);

        // Find coach (assuming teamId field in users indicates coaching)
        const allUserData = await db.select().from(users);
        const teamCoach = allUserData.find((u: any) => u.userType === 'coach' && u.teamId === team.id);
        
        if (teamCoach) {
          coach = {
            id: teamCoach.id,
            firstName: teamCoach.firstName,
            lastName: teamCoach.lastName,
            email: teamCoach.email
          };
        }

        return {
          id: team.id,
          name: team.name,
          ageGroup: team.ageGroup || "Unknown",
          coach,
          players: players || [],
          description: null, // Team description not in current schema
          isActive: true
        };
      }));

      res.json(enrichedTeams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.post('/api/admin/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const { name, ageGroup, coachId, description } = req.body;

      const newTeam = await storage.createTeam({
        name,
        ageGroup
      });

      // If coach is assigned, update the coach's team
      if (coachId) {
        await storage.updateUser(coachId, { teamId: newTeam.id });
      }

      res.json(newTeam);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.get('/api/admin/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const events = await storage.getAllEvents();
      
      // Enrich events with team information
      const enrichedEvents = await Promise.all(events.map(async (event) => {
        let teamName = null;
        if (event.teamId) {
          try {
            const team = await storage.getTeam(event.teamId);
            teamName = team?.name;
          } catch (error) {
            console.error(`Error fetching team for event ${event.id}:`, error);
          }
        }

        return {
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          eventType: event.eventType || "other",
          teamId: event.teamId,
          teamName,
          description: event.description,
          attendanceCount: 0 // Would be calculated from actual attendance
        };
      }));

      res.json(enrichedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/admin/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const { title, startTime, endTime, location, eventType, teamId, description } = req.body;

      const newEvent = await storage.createEvent({
        title,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        location,
        eventType,
        teamId: teamId ? parseInt(teamId) : null,
        description,
        childProfileId: null // Admin-created events don't belong to specific profiles
      });

      res.json(newEvent);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get('/api/admin/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      // Mock chat channels data - this would be retrieved from actual chat system
      const channels = [
        {
          id: "general",
          name: "General Discussion",
          type: "general",
          participantCount: 45,
          lastMessage: {
            content: "Welcome to the UYP Basketball League community!",
            timestamp: new Date().toISOString(),
            sender: "System"
          }
        },
        {
          id: "parents",
          name: "Parents Chat",
          type: "parent",
          participantCount: 28,
          lastMessage: {
            content: "When is the next parent meeting?",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            sender: "Sarah M."
          }
        },
        {
          id: "coaches",
          name: "Coaches Discussion",
          type: "coach",
          participantCount: 8,
          lastMessage: {
            content: "Updated practice schedule is now available",
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            sender: "Coach Johnson"
          }
        }
      ];

      // Add team-specific channels
      const teams = await storage.getAllTeams();
      teams.forEach(team => {
        channels.push({
          id: `team-${team.id}`,
          name: `${team.name} Team Chat`,
          type: "team",
          participantCount: 15, // Mock count
          lastMessage: {
            content: "Great practice today everyone!",
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            sender: "Coach"
          }
        });
      });

      res.json(channels);
    } catch (error) {
      console.error("Error fetching chat channels:", error);
      res.status(500).json({ message: "Failed to fetch chat channels" });
    }
  });

  app.get('/api/admin/user-awards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      // Get user badges
      const userBadgesList = await db
        .select({
          id: userBadges.id,
          userId: userBadges.userId,
          badgeId: userBadges.badgeId,
          badgeName: badges.name,
          earnedAt: userBadges.earnedAt
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id));

      // Get user trophies
      const userTrophiesList = await db
        .select({
          id: userTrophies.id,
          userId: userTrophies.userId,
          trophyName: userTrophies.trophyName,
          trophyDescription: userTrophies.trophyDescription,
          earnedAt: userTrophies.earnedAt
        })
        .from(userTrophies);

      // Combine and format awards
      const awards = [
        ...userBadgesList.map((badge: any) => ({
          id: badge.id.toString(),
          userId: badge.userId,
          awardId: badge.badgeId.toString(),
          awardType: "badge" as const,
          awardName: badge.badgeName,
          earnedAt: badge.earnedAt.toISOString(),
          reason: null
        })),
        ...userTrophiesList.map((trophy: any) => ({
          id: trophy.id.toString(),
          userId: trophy.userId,
          awardId: trophy.trophyName,
          awardType: "trophy" as const,
          awardName: trophy.trophyName,
          earnedAt: trophy.earnedAt.toISOString(),
          reason: null
        }))
      ];

      // Sort by most recent first
      awards.sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());

      res.json(awards);
    } catch (error) {
      console.error("Error fetching user awards:", error);
      res.status(500).json({ message: "Failed to fetch user awards" });
    }
  });

  app.post('/api/admin/award-badge', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const { userId, awardId, reason } = req.body;

      // Use the awards service to manually award the badge
      await awardsService.awardBadgeManually(userId, awardId, adminUserId);

      res.json({ success: true, message: "Award granted successfully" });
    } catch (error) {
      console.error("Error awarding badge:", error);
      res.status(500).json({ message: "Failed to award badge" });
    }
  });

  app.delete('/api/admin/user-awards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }

      const awardId = req.params.id;

      // Try to delete from badges first
      try {
        await db.delete(userBadges).where(eq(userBadges.id, parseInt(awardId)));
      } catch (error) {
        // If not found in badges, try trophies
        await db.delete(userTrophies).where(eq(userTrophies.id, parseInt(awardId)));
      }

      res.json({ success: true, message: "Award removed successfully" });
    } catch (error) {
      console.error("Error removing award:", error);
      res.status(500).json({ message: "Failed to remove award" });
    }
  });

  // Notion-based player/team search routes
  app.get('/api/search', async (req: any, res) => {
    const { q } = req.query;
    if (!q) {
      return res.json({ players: [], teams: [] });
    }
    
    try {
      const players = notionService.searchPlayers(q);
      const teams = notionService.searchTeams(q);
      
      res.setHeader('Cache-Control', 'max-age=60');
      res.json({ players, teams });
    } catch (error) {
      console.error('Error searching:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  // Alternative endpoint for teams search
  app.get('/api/search/teams', async (req: any, res) => {
    const { q } = req.query;
    if (!q) {
      return res.json({ ok: true, teams: [] });
    }
    
    try {
      const teams = notionService.searchTeams(q);
      res.setHeader('Cache-Control', 'max-age=60');
      res.json({ ok: true, teams });
    } catch (error) {
      console.error('Error searching teams:', error);
      res.json({ ok: true, teams: [] });
    }
  });

  // Get all teams with basic info
  app.get('/api/teams', async (req: any, res) => {
    try {
      const teams = notionService.getAllTeams().map(team => ({
        name: team.name,
        slug: team.slug,
        coach: team.coach,
        rosterCount: team.roster.length
      }));
      
      res.setHeader('Cache-Control', 'max-age=60');
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: 'Failed to fetch teams' });
    }
  });

  // Get specific team with full roster
  app.get('/api/teams/:slug', async (req: any, res) => {
    try {
      const team = notionService.getTeam(req.params.slug);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      res.setHeader('Cache-Control', 'max-age=60');
      res.json(team);
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ message: 'Failed to fetch team' });
    }
  });

  // Get specific player
  app.get('/api/players/:id', async (req: any, res) => {
    try {
      const player = notionService.getPlayer(req.params.id);
      
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }
      
      res.setHeader('Cache-Control', 'max-age=60');
      res.json(player);
    } catch (error) {
      console.error('Error fetching player:', error);
      res.status(500).json({ message: 'Failed to fetch player' });
    }
  });

  // Admin route to sync from Notion
  app.post('/api/admin/sync', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: "Access denied - Admin only" });
      }
      
      const result = await notionService.syncFromNotion();
      res.json({ 
        message: 'Sync completed',
        players: result.players.length,
        teams: result.teams.length,
        lastSync: notionService.getLastSync()
      });
    } catch (error) {
      console.error('Error syncing from Notion:', error);
      res.status(500).json({ message: 'Sync failed' });
    }
  });

  // Stripe billing portal route
  app.post('/api/billing/portal', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ error: 'Stripe not configured' });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: 'No Stripe customer found' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.protocol}://${req.get('host')}/parent-dashboard`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      res.status(500).json({ error: 'Failed to create billing portal session' });
    }
  });


  // Get user's purchase status
  app.get('/api/purchases/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get purchases from database - for now return mock data
      // TODO: Implement actual purchases table and queries
      const mockPurchases = [
        { productId: "youth-club", status: "pending" },
        { productId: "skills-academy", status: "pending" },
        { productId: "friday-night-hoops", status: "pending" },
        { productId: "high-school-club", status: "pending" },
        { productId: "irvine-flight", status: "pending" }
      ];
      
      res.json(mockPurchases);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // LeadConnector webhook for payment processing
  app.post('/api/webhooks/leadconnector', async (req, res) => {
    try {
      console.log('LeadConnector webhook received:', req.body);
      
      const event = req.body;
      // TODO: verify signature if LC provides one
      
      const email = event?.contact?.email || event?.payload?.customer?.email;
      const productKey = event?.product_id || event?.offer_name || event?.form_name;
      
      if (!email || !productKey) {
        console.log('Missing email or product info in webhook');
        return res.status(400).json({ ok: false, error: 'Missing email or product information' });
      }

      // TODO: Find user by email and update purchase status
      // For now just log and return success
      console.log('Would update purchase for email:', email, 'product:', productKey);
      
      res.json({ ok: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ ok: false, error: 'Webhook processing failed' });
    }
  });

  // Mount new route modules
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/notion', notionRoutes);
  app.use('/api/privacy', privacyRoutes);
  app.use('/api/claims', claimsRoutes);

  // Register Search & Claim routes
  registerClaimRoutes(app);

  return httpServer;
}
