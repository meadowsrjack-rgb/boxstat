import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { notionService } from "./notion";
import Stripe from "stripe";
import * as emailService from "./email";
import crypto from "crypto";
import cron from "node-cron";
import searchRoutes from "./routes/search";
import { setupNotificationRoutes } from "./routes/notifications";
import { setupAdminNotificationRoutes } from "./routes/adminNotifications";
import { requireAuth, isAdmin, isCoachOrAdmin } from "./auth";
import multer from "multer";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import {
  insertUserSchema,
  insertTeamSchema,
  insertEventSchema,
  insertAttendanceSchema,
  insertAwardSchema,
  insertUserAwardSchema,
  insertAnnouncementSchema,
  insertMessageSchema,
  insertPaymentSchema,
  insertProgramSchema,
  insertPackageSelectionSchema,
  insertDivisionSchema,
  insertSkillSchema,
  insertNotificationSchema,
  insertEventWindowSchema,
  insertRsvpResponseSchema,
  insertFacilitySchema,
  insertAwardDefinitionSchema,
  insertUserAwardRecordSchema,
} from "@shared/schema";
import { evaluateAwardsForUser } from "./utils/awardEngine";
import { populateAwards } from "./utils/populateAwards";
import { db } from "./db";
import { notifications, notificationRecipients, users, teamMemberships, waivers, waiverVersions, waiverSignatures, productEnrollments, products } from "@shared/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

let wss: WebSocketServer | null = null;

// Helper function to create a legacy subscription notification for a user
async function createLegacySubscriptionNotification(userId: string, subscriptionCount: number, organizationId: string = "default-org"): Promise<void> {
  try {
    // Check if a legacy_subscription notification already exists and is unread for this user
    const existingNotification = await db.select({
      id: notifications.id,
      recipientId: notificationRecipients.id,
    })
      .from(notificationRecipients)
      .innerJoin(notifications, eq(notificationRecipients.notificationId, notifications.id))
      .where(and(
        eq(notificationRecipients.userId, userId),
        sql`'legacy_subscription' = ANY(${notifications.types})`,
        eq(notificationRecipients.isRead, false)
      ))
      .limit(1);
    
    if (existingNotification.length > 0) {
      console.log(`📋 Legacy subscription notification already exists for user ${userId}`);
      return;
    }
    
    // Create a new notification
    const [createdNotification] = await db.insert(notifications).values({
      organizationId,
      types: ['announcement', 'legacy_subscription'],
      title: '🎁 You Have Subscriptions to Assign!',
      message: `You have ${subscriptionCount} subscription${subscriptionCount > 1 ? 's' : ''} from your previous account that need${subscriptionCount === 1 ? 's' : ''} to be assigned to your players.`,
      recipientTarget: 'users',
      recipientUserIds: [userId],
      deliveryChannels: ['in_app'],
      sentBy: 'system',
      status: 'sent',
    }).returning();
    
    // Create the recipient record
    await db.insert(notificationRecipients).values({
      notificationId: createdNotification.id,
      userId,
      isRead: false,
      deliveryStatus: { in_app: 'sent' },
    });
    
    console.log(`✅ Created legacy subscription notification for user ${userId}`);
  } catch (error) {
    console.error('Error creating legacy subscription notification:', error);
  }
}

// Helper function to clear legacy subscription notification when all subscriptions are assigned
async function clearLegacySubscriptionNotification(userId: string): Promise<void> {
  try {
    // Find and mark as read all legacy_subscription notifications for this user
    const legacyNotifications = await db.select({
      recipientId: notificationRecipients.id,
    })
      .from(notificationRecipients)
      .innerJoin(notifications, eq(notificationRecipients.notificationId, notifications.id))
      .where(and(
        eq(notificationRecipients.userId, userId),
        sql`'legacy_subscription' = ANY(${notifications.types})`,
        eq(notificationRecipients.isRead, false)
      ));
    
    if (legacyNotifications.length > 0) {
      for (const notification of legacyNotifications) {
        await db.update(notificationRecipients)
          .set({ 
            isRead: true,
            readAt: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(notificationRecipients.id, notification.recipientId));
      }
      console.log(`✅ Cleared ${legacyNotifications.length} legacy subscription notification(s) for user ${userId}`);
    }
  } catch (error) {
    console.error('Error clearing legacy subscription notification:', error);
  }
}

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-06-30.basil" })
  : null;

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
const awardImageDir = path.join(process.cwd(), 'client', 'public', 'trophiesbadges');

// Ensure upload directories exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(awardImageDir)) {
  fs.mkdirSync(awardImageDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const awardImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, awardImageDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'award-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const uploadAwardImage = multer({ 
  storage: awardImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Simple password hashing for development (use bcrypt in production)
function hashPassword(password: string): string {
  // Very basic hashing - in production use bcrypt
  return Buffer.from(password).toString('base64');
}

// Auth middleware now imported from ./auth.ts - supports both session AND JWT tokens
const isAuthenticated = requireAuth;

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize test users and facilities in development
  if (process.env.NODE_ENV === 'development') {
    // Type assertion to access the method
    await (storage as any).initializeTestUsers?.();
    await (storage as any).initializeFacilities?.();
    
    // Populate all 99 awards from the registry
    await populateAwards(storage, "default-org");
  }
  
  // =============================================
  // STATIC ASSETS ROUTES
  // =============================================
  
  // Apple App Site Association for Universal Links (magic link deep linking)
  app.get('/.well-known/apple-app-site-association', (req, res) => {
    const teamId = process.env.APNS_TEAM_ID || 'TEAMID';
    const bundleId = 'boxstat.app'; // Must match iOS app bundle ID exactly
    
    const aasa = {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${teamId}.${bundleId}`,
            paths: [
              "/magic-link-login",
              "/magic-link-login/*",
              "/claim-verify",
              "/claim-verify/*"
            ]
          }
        ]
      },
      webcredentials: {
        apps: [`${teamId}.${bundleId}`]
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.json(aasa);
  });
  
  // Serve BoxStat logo for emails
  app.get('/assets/logo', (req, res) => {
    const logoPath = new URL('../attached_assets/BoxStats_1761255444178.png', import.meta.url).pathname;
    res.sendFile(logoPath);
  });
  
  // =============================================
  // SEARCH ROUTES
  // =============================================
  
  app.use('/api/search', searchRoutes);
  
  // =============================================
  // NOTIFICATION ROUTES
  // =============================================
  
  setupNotificationRoutes(app);
  setupAdminNotificationRoutes(app);
  
  // =============================================
  // AUTH ROUTES
  // =============================================
  
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    
    // If parent, set activeProfileId to first child
    if (user && user.role === "parent") {
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      const linkedPlayers = allUsers.filter(u => u.accountHolderId === user.id && u.role === "player");
      if (linkedPlayers.length > 0) {
        (user as any).activeProfileId = linkedPlayers[0].id;
      }
    }
    
    res.json(user);
  });
  
  // Update user's default dashboard preference
  app.patch('/api/auth/user/preferences', requireAuth, async (req: any, res) => {
    try {
      const { defaultDashboardView } = req.body;
      
      // Validate input
      if (defaultDashboardView !== undefined && typeof defaultDashboardView !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid dashboard view value" 
        });
      }
      
      // Update user's preference
      const updated = await storage.updateUser(req.user.id, {
        defaultDashboardView,
      });
      
      res.json({ 
        success: true, 
        user: updated
      });
    } catch (error: any) {
      console.error("Preference update error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update preferences" 
      });
    }
  });
  
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Email and password are required" 
        });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email, "default-org");
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password" 
        });
      }
      
      // Check password (using simple base64 encoding for development)
      const hashedPassword = hashPassword(password);
      if (user.password !== hashedPassword) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password" 
        });
      }
      
      // Check if email is verified
      if (!user.verified) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email before logging in. Check your inbox for the verification link.",
          requiresVerification: true,
        });
      }
      
      // Set session (for web app compatibility)
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.role = user.role;
      
      // Generate JWT token (for mobile app)
      const token = jwt.sign(
        {
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
      
      // Check for unassigned subscriptions and create notification if needed
      const unassignedSubs = await storage.getUnassignedSubscriptionsByOwner(user.id);
      if (unassignedSubs.length > 0) {
        await createLegacySubscriptionNotification(user.id, unassignedSubs.length, user.organizationId);
      }
      
      res.json({ 
        success: true,
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          defaultDashboardView: user.defaultDashboardView
        } 
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Login failed" 
      });
    }
  });
  
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ success: false, message: "Logout failed" });
      }
      // Clear the session cookie
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
  
  // Send verification email (called at step 1 of registration)
  app.post('/api/auth/send-verification', async (req: any, res) => {
    try {
      const { email, organizationId = "default-org", sourcePlatform = "web" } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      // Check if user already exists (completed registration)
      const existingUser = await storage.getUserByEmail(email, organizationId);
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "This email is already registered. Please login instead." 
        });
      }
      
      // Get session ID for notifying original session when verified
      const sessionId = req.sessionID || crypto.randomBytes(16).toString('hex');
      
      // Check if there's a pending registration
      let pending = await storage.getPendingRegistration(email, organizationId);
      
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      if (pending) {
        // Update existing pending registration
        await storage.deletePendingRegistration(email, organizationId);
        pending = await storage.createPendingRegistration(email, organizationId, verificationToken, verificationExpiry, sourcePlatform, sessionId);
        
        await emailService.sendVerificationEmail({
          email,
          firstName: 'User',
          verificationToken,
        });
        
        return res.json({ 
          success: true, 
          message: "Verification email re-sent. Please check your inbox.",
          exists: true,
          sessionId // Return session ID so frontend can poll for verification status
        });
      }
      
      // Create new pending registration
      pending = await storage.createPendingRegistration(email, organizationId, verificationToken, verificationExpiry, sourcePlatform, sessionId);
      
      // Send verification email
      await emailService.sendVerificationEmail({
        email,
        firstName: 'User',
        verificationToken,
      });
      
      res.json({ 
        success: true, 
        message: "Verification email sent! Please check your inbox.",
        exists: false,
        sessionId // Return session ID so frontend can poll for verification status
      });
    } catch (error: any) {
      console.error("Send verification error:", error);
      res.status(500).json({ success: false, message: "Failed to send verification email" });
    }
  });
  
  // Email verification endpoint
  app.get('/api/auth/verify-email', async (req: any, res) => {
    try {
      const { token, email } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Verification token is required" });
      }
      
      const organizationId = "default-org";
      const allUsers = await storage.getUsersByOrganization(organizationId);
      
      // First check if there's already a verified user with this token (shouldn't happen but safe check)
      const existingUser = allUsers.find(u => u.verificationToken === token && u.verified);
      if (existingUser) {
        return res.json({ 
          success: true, 
          message: "Email already verified! Continue with registration.",
          email: existingUser.email,
        });
      }
      
      // Find pending registration - first try by email if provided, then by token as fallback
      let pendingReg: any = null;
      
      // If email is provided, use it for lookup
      if (email) {
        pendingReg = await storage.getPendingRegistration(email as string, organizationId);
        // Verify the token matches
        if (pendingReg && pendingReg.verificationToken !== token) {
          pendingReg = null;
        }
      }
      
      // If not found by email, try direct token lookup
      if (!pendingReg) {
        pendingReg = await storage.getPendingRegistrationByToken(token as string, organizationId);
      }
      
      // If still not found, invalid token
      if (!pendingReg) {
        return res.status(404).json({ success: false, message: "Invalid or expired verification token" });
      }
      
      // Check if token is expired (24 hours)
      if (new Date() > new Date(pendingReg.verificationExpiry)) {
        await storage.deletePendingRegistration(pendingReg.email, organizationId);
        return res.status(400).json({ success: false, message: "Verification token has expired. Please request a new one." });
      }
      
      // Mark pending registration as verified
      await storage.updatePendingRegistration(pendingReg.email, organizationId, true);
      
      // Determine if user should check original session
      const sourcePlatform = pendingReg.sourcePlatform || 'web';
      const hasOriginalSession = !!pendingReg.sessionId;
      
      res.json({ 
        success: true, 
        message: hasOriginalSession 
          ? "Email verified! Return to your original session to continue registration."
          : "Email verified successfully! Continue with registration.",
        email: pendingReg.email,
        sourcePlatform,
        hasOriginalSession,
        // Indicate that user should NOT continue in this tab if they have an original session
        shouldRedirect: !hasOriginalSession
      });
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.status(500).json({ success: false, message: "Verification failed" });
    }
  });
  
  // Poll for verification status (used by original session to detect when email is verified)
  app.get('/api/auth/check-verification-status', async (req: any, res) => {
    try {
      const { email, organizationId = "default-org" } = req.query;
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      const pendingReg = await storage.getPendingRegistration(email as string, organizationId);
      
      if (!pendingReg) {
        // No pending registration - either verified and completed, or never existed
        return res.json({ 
          success: true, 
          verified: false,
          notFound: true,
          message: "No pending registration found for this email"
        });
      }
      
      res.json({ 
        success: true, 
        verified: pendingReg.verified,
        email: pendingReg.email,
        message: pendingReg.verified 
          ? "Email verified! You can continue with registration."
          : "Email not yet verified. Please check your inbox."
      });
    } catch (error: any) {
      console.error("Check verification status error:", error);
      res.status(500).json({ success: false, message: "Failed to check verification status" });
    }
  });
  
  // Test-only endpoint for automated testing
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    app.post('/api/test/verify-email', async (req: any, res) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ success: false, message: "Email is required" });
        }
        
        const organizationId = "default-org";
        
        // Check for pending registration first (new flow)
        const pendingReg = await storage.getPendingRegistration(email, organizationId);
        
        if (pendingReg) {
          // Mark pending registration as verified
          await storage.updatePendingRegistration(email, organizationId, true);
          
          console.log(`[TEST] Pending registration for ${email} marked as verified for testing`);
          
          return res.json({ 
            success: true, 
            message: "Email verified for testing (pending registration)",
            email: email,
          });
        }
        
        // Fallback to checking existing user (for backwards compatibility)
        const user = await storage.getUserByEmail(email, organizationId);
        
        if (user) {
          // Mark user as verified
          await storage.updateUser(user.id, {
            verified: true,
            verificationToken: null as any,
            verificationExpiry: null as any,
          });
          
          console.log(`[TEST] User ${email} marked as verified for testing`);
          
          return res.json({ 
            success: true, 
            message: "Email verified for testing (existing user)",
            email: user.email,
          });
        }
        
        // Not found in either table
        return res.status(404).json({ 
          success: false, 
          message: "No pending registration or user found with this email" 
        });
      } catch (error: any) {
        console.error("Test verification error:", error);
        res.status(500).json({ success: false, message: "Test verification failed" });
      }
    });
  }
  
  // Request magic link
  app.post('/api/auth/request-magic-link', async (req: any, res) => {
    try {
      const { email, sourcePlatform = "web" } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email, "default-org");
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ success: true, message: "If an account exists with that email, a magic link has been sent." });
      }
      
      // Check if verified
      if (!user.verified) {
        return res.status(403).json({ success: false, message: "Please verify your email first before using magic link login." });
      }
      
      // Generate cryptographically secure magic link token (valid for 15 minutes)
      const magicLinkToken = crypto.randomBytes(32).toString('hex');
      const magicLinkExpiry = new Date(Date.now() + 15 * 60 * 1000);
      
      // Update user with magic link token and source platform
      await storage.updateUser(user.id, {
        magicLinkToken,
        magicLinkExpiry,
        magicLinkSourcePlatform: sourcePlatform, // Track where magic link was requested from
      });
      
      // Send magic link email
      await emailService.sendMagicLink({
        email: user.email,
        firstName: user.firstName,
        magicLinkToken,
      });
      
      res.json({ success: true, message: "If an account exists with that email, a magic link has been sent." });
    } catch (error: any) {
      console.error("Magic link request error:", error);
      res.status(500).json({ success: false, message: "Failed to send magic link" });
    }
  });
  
  // In-memory store for app redirect tokens (valid for 60 seconds)
  const appRedirectTokens = new Map<string, { userId: string; expires: Date }>();
  
  // Clean up expired tokens periodically
  setInterval(() => {
    const now = new Date();
    for (const [token, data] of appRedirectTokens.entries()) {
      if (data.expires < now) {
        appRedirectTokens.delete(token);
      }
    }
  }, 30000); // Clean every 30 seconds
  
  // Magic link login endpoint
  app.get('/api/auth/magic-link-login', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Magic link token is required" });
      }
      
      // Find user by magic link token
      const allUsers = await storage.getUsersByOrganization("default-org");
      const user = allUsers.find(u => u.magicLinkToken === token && u.isActive !== false);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "Invalid magic link" });
      }
      
      // Check if token is expired (15 minutes)
      if (user.magicLinkExpiry && new Date() > user.magicLinkExpiry) {
        return res.status(400).json({ success: false, message: "Magic link has expired. Please request a new one." });
      }
      
      // Get source platform before clearing (so we know if it came from iOS app)
      const sourcePlatform = (user as any).magicLinkSourcePlatform || 'web';
      
      // Clear magic link token
      await storage.updateUser(user.id, {
        magicLinkToken: null as any,
        magicLinkExpiry: null as any,
        magicLinkSourcePlatform: null as any,
      });
      
      // Set session
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.role = user.role;
      
      // Generate a one-time app redirect token (valid for 60 seconds)
      const appRedirectToken = crypto.randomBytes(32).toString('hex');
      appRedirectTokens.set(appRedirectToken, {
        userId: user.id,
        expires: new Date(Date.now() + 60000) // 60 seconds
      });
      
      res.json({ 
        success: true, 
        message: "Logged in successfully!",
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          defaultDashboardView: user.defaultDashboardView
        },
        appRedirectToken, // Token for iOS app to use
        sourcePlatform, // Where the magic link was originally requested from
        shouldRedirectToApp: sourcePlatform === 'ios' // Indicate if user should be redirected to iOS app
      });
    } catch (error: any) {
      console.error("Magic link login error:", error);
      res.status(500).json({ success: false, message: "Login failed" });
    }
  });
  
  // Exchange app redirect token for session (used by iOS app after browser auth)
  app.get('/api/auth/app-redirect', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Token is required" });
      }
      
      const tokenData = appRedirectTokens.get(token as string);
      
      if (!tokenData) {
        return res.status(404).json({ success: false, message: "Invalid or expired token" });
      }
      
      if (tokenData.expires < new Date()) {
        appRedirectTokens.delete(token as string);
        return res.status(400).json({ success: false, message: "Token has expired" });
      }
      
      // Delete the token (one-time use)
      appRedirectTokens.delete(token as string);
      
      // Get user and set session
      const user = await storage.getUser(tokenData.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.role = user.role;
      
      res.json({ 
        success: true, 
        message: "Session created successfully!",
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          defaultDashboardView: user.defaultDashboardView
        }
      });
    } catch (error: any) {
      console.error("App redirect error:", error);
      res.status(500).json({ success: false, message: "Failed to create session" });
    }
  });
  
  // =============================================
  // PASSWORD RESET ROUTES
  // =============================================
  
  app.post('/api/auth/request-password-reset', async (req: any, res) => {
    try {
      const { email } = req.body;
      console.log(`[Password Reset] Request received for email: ${email}`);
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email, "default-org");
      
      if (!user) {
        console.log(`[Password Reset] No user found for email: ${email}`);
        return res.json({ success: true, message: "If an account exists with that email, a password reset link has been sent." });
      }
      
      console.log(`[Password Reset] User found: ${user.id}, verified: ${user.verified}`);
      
      if (!user.verified) {
        return res.status(403).json({ success: false, message: "Please verify your email first before resetting your password." });
      }
      
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
      
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      });
      
      console.log(`[Password Reset] Token saved to database, sending email...`);
      
      try {
        await emailService.sendPasswordResetEmail({
          email: user.email,
          firstName: user.firstName,
          resetToken,
        });
        console.log(`[Password Reset] Email sent successfully to ${user.email}`);
      } catch (emailError: any) {
        console.error(`[Password Reset] Email sending failed:`, emailError);
        throw emailError;
      }
      
      res.json({ success: true, message: "If an account exists with that email, a password reset link has been sent." });
    } catch (error: any) {
      console.error("Password reset request error:", error);
      res.status(500).json({ success: false, message: "Failed to process password reset request" });
    }
  });
  
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: "Token and new password are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
      }
      
      const allUsers = await storage.getUsersByOrganization("default-org");
      const user = allUsers.find(u => u.passwordResetToken === token && u.isActive !== false);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "Invalid or expired reset link" });
      }
      
      if (user.passwordResetExpiry && new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(400).json({ success: false, message: "Reset link has expired. Please request a new one." });
      }
      
      const hashedPassword = hashPassword(newPassword);
      
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null as any,
        passwordResetExpiry: null as any,
      });
      
      res.json({ success: true, message: "Password reset successfully! You can now log in with your new password." });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ success: false, message: "Failed to reset password" });
    }
  });
  
  app.get('/api/auth/verify-reset-token', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Token is required" });
      }
      
      const allUsers = await storage.getUsersByOrganization("default-org");
      const user = allUsers.find(u => u.passwordResetToken === token && u.isActive !== false);
      
      if (!user) {
        return res.status(404).json({ success: false, valid: false, message: "Invalid or expired reset link" });
      }
      
      if (user.passwordResetExpiry && new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(400).json({ success: false, valid: false, message: "Reset link has expired. Please request a new one." });
      }
      
      res.json({ success: true, valid: true, email: user.email });
    } catch (error: any) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ success: false, valid: false, message: "Failed to verify token" });
    }
  });
  
  // =============================================
  // STRIPE PAYMENT ROUTES
  // =============================================
  
  // Initialize Stripe
  const stripe = process.env.STRIPE_SECRET_KEY 
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-06-30.basil" })
    : null;
  
  // Verify Stripe mode on initialization
  if (stripe && process.env.STRIPE_SECRET_KEY) {
    const keyPrefix = process.env.STRIPE_SECRET_KEY.substring(0, 8);
    const mode = keyPrefix.startsWith('sk_test') ? '🧪 TEST' : '🔴 LIVE';
    console.log(`Stripe initialized in ${mode} mode (key: ${keyPrefix}...)`);
  }
  
  app.post("/api/create-payment-intent", async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    try {
      const { amount, packageId, packageName } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Amount should already be in cents
        currency: "usd",
        metadata: {
          packageId: packageId || "",
          packageName: packageName || "",
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ 
        error: "Error creating payment intent", 
        message: error.message 
      });
    }
  });
  
  app.post("/api/payments/checkout-session", requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Fetch all unpaid package selections for the user
      const packageSelections = await storage.getPackageSelectionsByParent(req.user.id);
      const unpaidSelections = packageSelections.filter(selection => !selection.isPaid);
      
      if (unpaidSelections.length === 0) {
        return res.status(404).json({ error: "No unpaid package selections found" });
      }
      
      // Build line items
      const lineItems = [];
      for (const selection of unpaidSelections) {
        const program = await storage.getProgram(selection.programId);
        if (program && program.price) {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: program.name,
              },
              unit_amount: program.price, // Price is already in cents
            },
            quantity: 1,
          });
        }
      }
      
      if (lineItems.length === 0) {
        return res.status(404).json({ error: "No valid programs found for selections" });
      }
      
      // Create or retrieve Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        stripeCustomerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(user.id, { stripeCustomerId });
      }
      
      // Get origin for URLs
      const origin = `${req.protocol}://${req.get('host')}`;
      
      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: lineItems,
        mode: 'payment',
        success_url: `${origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payments?canceled=true`,
        metadata: {
          userId: user.id,
          packageSelectionIds: unpaidSelections.map(s => s.id).join(','),
        },
      });
      
      res.json({
        sessionUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        error: "Error creating checkout session",
        message: error.message,
      });
    }
  });
  
  // Create checkout session for a specific package and player
  app.post("/api/payments/create-checkout", requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    try {
      const { packageId, playerId } = req.body;
      
      if (!packageId) {
        return res.status(400).json({ error: "Package ID is required" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get the program/package
      const program = await storage.getProgram(packageId);
      if (!program || !program.price) {
        return res.status(404).json({ error: "Package not found or has no price" });
      }
      
      // Validate playerId if provided
      if (playerId) {
        const player = await storage.getUser(playerId);
        if (!player) {
          return res.status(400).json({ error: "Invalid player ID" });
        }
        
        // Ensure player belongs to the paying user or is the paying user
        // Check both parentId and guardianId to handle all parent-child relationships
        const isValidPlayer = playerId === req.user.id || 
                             (player as any).parentId === req.user.id || 
                             (player as any).guardianId === req.user.id;
        
        if (!isValidPlayer) {
          return res.status(403).json({ error: "You can only make payments for yourself or your children" });
        }
      }
      
      // Create or retrieve Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        stripeCustomerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId });
      }
      
      // Get origin for URLs
      const origin = `${req.protocol}://${req.get('host')}`;
      
      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: program.name,
              description: program.description || undefined,
            },
            unit_amount: program.price, // Price is already in cents
          },
          quantity: 1,
        }],
        mode: program.type === 'Subscription' ? 'subscription' : 'payment',
        success_url: `${origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/unified-account?payment=canceled`,
        metadata: {
          userId: user.id,
          packageId: packageId,
          playerId: playerId || '',
          type: 'package_purchase',
        },
      });
      
      res.json({
        url: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        error: "Error creating checkout session",
        message: error.message,
      });
    }
  });
  
  // Stripe webhook endpoint (PUBLIC - no authentication)
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("⚠️ STRIPE_WEBHOOK_SECRET is not configured");
      return res.status(400).json({ 
        error: "Webhook secret not configured",
        message: "Set STRIPE_WEBHOOK_SECRET environment variable for webhook verification" 
      });
    }
    
    let event: Stripe.Event;
    
    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error("⚠️ Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    // Handle the event
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log("✅ Checkout session completed:", session.id);
        
        // Check if this is an "add_player" payment
        if (session.metadata?.type === 'add_player') {
          const playerId = session.metadata.playerId;
          const accountHolderId = session.metadata.accountHolderId;
          const packageId = session.metadata.packageId;
          
          if (!playerId || !accountHolderId) {
            console.error("Missing required metadata for add_player:", { playerId, accountHolderId });
            return res.status(400).json({ 
              error: "Missing required metadata for add_player",
              received: { playerId, accountHolderId }
            });
          }
          
          // Update player to finalize registration
          const updatedPlayer = await storage.updateUser(playerId, {
            paymentStatus: "paid",
            hasRegistered: true,
            stripeCheckoutSessionId: session.id,
          });
          
          if (updatedPlayer) {
            console.log(`✅ Player ${playerId} registration finalized after payment`);
            
            // Create a payment record
            if (session.amount_total) {
              try {
                await storage.createPayment({
                  organizationId: updatedPlayer.organizationId,
                  userId: playerId,
                  amount: session.amount_total, // Store in cents (Stripe convention)
                  currency: 'usd',
                  paymentType: 'add_player',
                  status: 'completed',
                  description: `Player Registration: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
                });
                console.log(`✅ Created payment record for player ${playerId}`);
              } catch (paymentError: any) {
                console.error("Error creating payment record:", paymentError);
                // Don't fail the webhook if payment record creation fails
              }
            }
          } else {
            console.error(`⚠️ Could not find player ${playerId} to update`);
          }
          
          return res.json({ received: true });
        }
        
        // Handle new package purchase from unified account payments tab
        if (session.metadata?.type === 'package_purchase') {
          const userId = session.metadata.userId;
          const packageId = session.metadata.packageId;
          const playerId = session.metadata.playerId || null;
          
          if (!userId || !packageId) {
            console.error("Missing metadata for package purchase:", { userId, packageId });
            return res.status(400).json({ 
              error: "Missing required metadata for package purchase",
              received: { userId, packageId }
            });
          }
          
          // Create payment record with playerId
          if (session.amount_total) {
            try {
              const program = await storage.getProgram(packageId);
              await storage.createPayment({
                organizationId: "default-org",
                userId: userId,
                playerId: playerId,
                amount: session.amount_total, // Store in cents (Stripe convention)
                currency: 'usd',
                paymentType: program?.type || 'package',
                status: 'completed',
                description: program?.name || `Package Purchase`,
                packageId: packageId,
                programId: packageId,
                stripePaymentId: session.payment_intent as string,
              });
              console.log(`✅ Created payment record for user ${userId}${playerId ? ` (player: ${playerId})` : ''}`);
            } catch (paymentError: any) {
              console.error("Error creating payment record:", paymentError);
              // Don't fail the webhook if payment record creation fails
            }
          }
          
          return res.json({ received: true });
        }
        
        // Handle package selection payments (existing family onboarding flow)
        const userId = session.metadata?.userId;
        const selectionIds = session.metadata?.packageSelectionIds;
        
        if (!userId || !selectionIds) {
          console.error("Missing metadata in checkout session:", { userId, selectionIds });
          return res.status(400).json({ 
            error: "Missing required metadata",
            received: { userId, selectionIds }
          });
        }
        
        // Mark each package selection as paid
        const selectionIdArray = selectionIds.split(',');
        for (const selectionId of selectionIdArray) {
          const updated = await storage.markPackageSelectionPaid(selectionId.trim());
          if (updated) {
            console.log(`✅ Marked package selection ${selectionId} as paid`);
          } else {
            console.error(`⚠️ Could not find package selection ${selectionId}`);
          }
        }
        
        // Create one consolidated payment record for the entire checkout
        if (session.amount_total) {
          try {
            await storage.createPayment({
              organizationId: "default-org",
              userId,
              amount: session.amount_total,
              currency: 'usd',
              paymentType: 'stripe_checkout',
              status: 'completed',
              description: `Package Selections Payment`,
              stripePaymentId: session.payment_intent as string,
            });
            console.log(`✅ Created consolidated payment record for user ${userId}`);
          } catch (paymentError: any) {
            console.error("Error creating payment record:", paymentError);
            // Don't fail the webhook if payment record creation fails
          }
        }
        
        return res.json({ received: true });
      }
      
      // Handle other event types
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
      res.json({ received: true });
    } catch (error: any) {
      console.error("Error processing webhook event:", error);
      return res.status(500).json({ 
        error: "Error processing webhook",
        message: error.message 
      });
    }
  });

  // Payment success callback (for when webhooks don't fire in test mode)
  app.post('/api/payments/verify-session', async (req: any, res) => {
    try {
      console.log('🔍 verify-session request body:', req.body);
      console.log('🔍 verify-session headers:', req.headers['content-type']);
      
      const { sessionId } = req.body;
      
      if (!sessionId || !stripe) {
        console.error('❌ Missing sessionId:', sessionId, 'or Stripe not configured:', !!stripe);
        return res.status(400).json({ error: 'Missing session ID or Stripe not configured' });
      }

      console.log(`🔍 Verifying checkout session: ${sessionId}`);
      
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return res.json({ success: false, message: 'Payment not completed' });
      }

      console.log(`✅ Session verified: ${sessionId}, payment_status: ${session.payment_status}`);

      // Process based on metadata type (same logic as webhook)
      if (session.metadata?.type === 'add_player') {
        const playerId = session.metadata.playerId;
        const accountHolderId = session.metadata.accountHolderId;
        
        if (!playerId || !accountHolderId) {
          return res.status(400).json({ error: 'Missing required metadata' });
        }
        
        // Check if payment already exists (check by stripePaymentId for webhook compatibility)
        const existingPayments = await storage.getPaymentsByUser(playerId);
        const alreadyProcessed = existingPayments.some(p => 
          p.stripePaymentId === session.payment_intent && p.status === 'completed'
        );
        
        if (!alreadyProcessed) {
          const updatedPlayer = await storage.updateUser(playerId, {
            paymentStatus: "paid",
            hasRegistered: true,
            stripeCheckoutSessionId: session.id,
          });
          
          if (updatedPlayer && session.amount_total) {
            await storage.createPayment({
              organizationId: updatedPlayer.organizationId,
              userId: playerId,
              amount: session.amount_total,
              currency: 'usd',
              paymentType: 'add_player',
              status: 'completed',
              description: `Player Registration: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
              stripePaymentId: session.payment_intent as string,
            });
            console.log(`✅ Created add_player payment record via callback for player ${playerId}`);
          }
        } else {
          console.log(`ℹ️ Payment already processed for player ${playerId}`);
        }
      }
      
      if (session.metadata?.type === 'package_purchase') {
        const userId = session.metadata.userId;
        const packageId = session.metadata.packageId;
        const playerId = session.metadata.playerId || null;
        
        if (!userId || !packageId) {
          return res.status(400).json({ error: 'Missing required metadata' });
        }
        
        // Check if payment already exists
        const existingPayments = await storage.getPaymentsByUser(userId);
        const alreadyProcessed = existingPayments.some(p => 
          p.stripePaymentId === session.payment_intent && p.status === 'completed'
        );
        
        if (!alreadyProcessed && session.amount_total) {
          const program = await storage.getProgram(packageId);
          await storage.createPayment({
            organizationId: "default-org",
            userId: userId,
            playerId: playerId,
            amount: session.amount_total,
            currency: 'usd',
            paymentType: program?.type || 'package',
            status: 'completed',
            description: program?.name || `Package Purchase`,
            packageId: packageId,
            programId: packageId,
            stripePaymentId: session.payment_intent as string,
          });
          console.log(`✅ Created package_purchase payment record via callback for user ${userId}`);
        } else {
          console.log(`ℹ️ Payment already processed for user ${userId}`);
        }
      }

      // Handle package selection flow (existing family onboarding)
      if (session.metadata?.packageSelectionIds) {
        const userId = session.metadata.userId;
        const selectionIds = session.metadata.packageSelectionIds;
        
        if (!userId || !selectionIds) {
          return res.status(400).json({ error: 'Missing required metadata for package selections' });
        }
        
        // Check if payment already exists (check by stripePaymentId for webhook compatibility)
        const existingPayments = await storage.getPaymentsByUser(userId);
        const alreadyProcessed = existingPayments.some(p => 
          p.stripePaymentId === session.payment_intent && p.status === 'completed'
        );
        
        if (!alreadyProcessed) {
          // Mark each package selection as paid
          const selectionIdArray = selectionIds.split(',');
          for (const selectionId of selectionIdArray) {
            try {
              await storage.markPackageSelectionPaid(selectionId.trim());
              console.log(`✅ Marked package selection ${selectionId} as paid via callback`);
            } catch (err) {
              console.error(`Error marking selection ${selectionId} as paid:`, err);
            }
          }
          
          // Create one consolidated payment record (matching webhook logic)
          if (session.amount_total) {
            await storage.createPayment({
              organizationId: "default-org",
              userId,
              amount: session.amount_total,
              currency: 'usd',
              paymentType: 'stripe_checkout',
              status: 'completed',
              description: `Package Selections Payment`,
              stripePaymentId: session.payment_intent as string,
            });
            console.log(`✅ Created consolidated payment record via callback for user ${userId}`);
          }
        } else {
          console.log(`ℹ️ Package selection payment already processed for session ${session.id}`);
        }
      }

      res.json({ success: true, message: 'Payment verified and processed' });
    } catch (error: any) {
      console.error('Error verifying session:', error);
      res.status(500).json({ error: 'Failed to verify session', message: error.message });
    }
  });
  
  // =============================================
  // REGISTRATION ROUTES
  // =============================================
  
  // Check if user exists by email (for pre-registration check)
  app.post('/api/registration/check-email', async (req: any, res) => {
    try {
      const { email, organizationId } = req.body;
      const user = await storage.getUserByEmail(email, organizationId || "default-org");
      
      let stripeData = null;
      let stripeCustomerId = user?.stripeCustomerId;
      
      // Search Stripe for customer by email (even if no user exists)
      if (stripe) {
        try {
          // First try to get customer by ID if user has one
          if (stripeCustomerId) {
            const customer = await stripe.customers.retrieve(stripeCustomerId, {
              expand: ['subscriptions'],
            });
            stripeData = customer;
          } else {
            // Search for customer by email
            const customers = await stripe.customers.list({
              email: email,
              limit: 1,
            });
            
            if (customers.data.length > 0) {
              stripeCustomerId = customers.data[0].id;
              const customer = await stripe.customers.retrieve(stripeCustomerId, {
                expand: ['subscriptions'],
              });
              stripeData = customer;
            }
          }
          
          if (stripeData) {
            // Fetch recent payment intents
            const paymentIntents = await stripe.paymentIntents.list({
              customer: stripeCustomerId,
              limit: 10,
            });
            
            const subscriptions = (stripeData as any).subscriptions?.data || [];
            const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === 'active');
            
            // Find most recent successful payment
            const successfulPayments = paymentIntents.data.filter((pi: any) => pi.status === 'succeeded');
            const lastPayment = successfulPayments.length > 0 ? successfulPayments[0] : null;
            const lastPaymentDate = lastPayment ? new Date(lastPayment.created * 1000) : null;
            
            // Calculate next payment date (28 days from last payment)
            let nextPaymentDate = null;
            let paymentOverdue = false;
            if (lastPaymentDate) {
              nextPaymentDate = new Date(lastPaymentDate);
              nextPaymentDate.setDate(nextPaymentDate.getDate() + 28);
              paymentOverdue = new Date() > nextPaymentDate;
            }
            
            // Extract prefill data from Stripe customer
            const prefillData = {
              firstName: (stripeData as any).metadata?.firstName || (stripeData as any).name?.split(' ')[0] || '',
              lastName: (stripeData as any).metadata?.lastName || (stripeData as any).name?.split(' ').slice(1).join(' ') || '',
              phone: (stripeData as any).phone || '',
              email: (stripeData as any).email || email,
            };
            
            return res.json({
              exists: !!user,
              hasRegistered: user?.hasRegistered || false,
              stripeCustomer: {
                id: stripeCustomerId,
                prefillData,
                lastPaymentDate,
                nextPaymentDate,
                paymentOverdue,
                needsPayment: !lastPayment || paymentOverdue,
                subscriptions: activeSubscriptions.map((sub: any) => ({
                  id: sub.id,
                  status: sub.status,
                  currentPeriodEnd: sub.current_period_end,
                  priceId: sub.items.data[0]?.price.id,
                  amount: sub.items.data[0]?.price.unit_amount,
                  interval: sub.items.data[0]?.price.recurring?.interval,
                  productId: sub.items.data[0]?.price.product,
                })),
                payments: paymentIntents.data.map((pi: any) => ({
                  id: pi.id,
                  amount: pi.amount,
                  status: pi.status,
                  created: pi.created,
                  packageId: pi.metadata.packageId,
                  packageName: pi.metadata.packageName,
                })),
              },
            });
          }
        } catch (stripeError: any) {
          console.error("Error fetching Stripe data:", stripeError);
          if (user) {
            return res.json({
              exists: true,
              hasRegistered: user.hasRegistered || false,
              stripeError: "Could not fetch payment information",
            });
          }
        }
      }
      
      // No user and no Stripe data
      if (!user) {
        return res.json({ exists: false });
      }
      
      // User exists but no Stripe data
      return res.json({
        exists: true,
        hasRegistered: user.hasRegistered || false,
      });
    } catch (error: any) {
      console.error("Check email error:", error);
      res.status(500).json({ message: "Error checking email" });
    }
  });
  
  app.post('/api/registration/complete', async (req: any, res) => {
    try {
      const { registrationType, parentInfo, players, password, email } = req.body;
      
      const organizationId = "default-org";
      
      // Helper function to sanitize date strings (convert empty strings to null)
      const sanitizeDate = (date: any) => {
        if (!date || date === '') return null;
        return date;
      };
      
      // Determine the primary email (where verification was sent)
      const primaryEmail = registrationType === "my_child" 
        ? parentInfo?.email 
        : (email || players[0]?.email);
      
      if (!primaryEmail) {
        return res.status(400).json({ 
          success: false, 
          message: "Email is required to complete registration" 
        });
      }
      
      // Check for pending registration
      const pendingReg = await storage.getPendingRegistration(primaryEmail, organizationId);
      
      if (!pendingReg) {
        return res.status(400).json({ 
          success: false, 
          message: "No pending registration found. Please start registration again." 
        });
      }
      
      if (!pendingReg.verified) {
        return res.status(403).json({ 
          success: false, 
          message: "Please verify your email before completing registration. Check your inbox for the verification link." 
        });
      }
      
      // Check if user already exists (check ALL users including inactive ones)
      // This is important because the database has a global unique constraint on email
      const existingUserResults = await db.select({ id: users.id, email: users.email })
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${primaryEmail})`);
      
      if (existingUserResults.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "This email is already registered. Please login instead." 
        });
      }
      
      // Validate all required fields
      if (!password || password.length < 8) {
        return res.status(400).json({ 
          success: false, 
          message: "Password is required and must be at least 8 characters" 
        });
      }
      
      if (registrationType === "my_child") {
        if (!parentInfo?.firstName || !parentInfo?.lastName) {
          return res.status(400).json({ 
            success: false, 
            message: "Parent/Guardian first and last name are required" 
          });
        }
        if (!players || players.length === 0) {
          return res.status(400).json({ 
            success: false, 
            message: "At least one player is required" 
          });
        }
      } else {
        if (!players || players.length === 0 || !players[0].firstName || !players[0].lastName) {
          return res.status(400).json({ 
            success: false, 
            message: "First and last name are required" 
          });
        }
      }
      
      // Hash the password
      const hashedPassword = hashPassword(password);
      
      // Create user account(s) - this is where the actual account is created
      let accountHolderId: string | undefined;
      let primaryUser: any = null;
      
      try {
        if (registrationType === "my_child" && parentInfo) {
          // Create parent user account
          primaryUser = await storage.createUser({
            organizationId,
            email: primaryEmail,
            role: "parent",
            firstName: parentInfo.firstName,
            lastName: parentInfo.lastName,
            phoneNumber: parentInfo.phoneNumber,
            dateOfBirth: sanitizeDate(parentInfo.dateOfBirth),
            password: hashedPassword,
            hasRegistered: true,
            verified: true,
            isActive: true,
            awards: [],
            totalPractices: 0,
            totalGames: 0,
            consecutiveCheckins: 0,
            videosCompleted: 0,
            yearsActive: 0,
          });
          accountHolderId = primaryUser.id;
          
          // Create player profiles for children - no email needed
          // Child players are managed through parent's account
          const createdPlayers = [];
          for (const player of players) {
            const playerUser = await storage.createUser({
              organizationId,
              email: null as any, // Child players don't need email - managed through parent account
              role: "player",
              firstName: player.firstName,
              lastName: player.lastName,
              dateOfBirth: sanitizeDate(player.dateOfBirth),
              gender: player.gender,
              accountHolderId,
              teamAssignmentStatus: "pending",
              paymentStatus: "pending", // Player needs to complete product selection
              hasRegistered: true,
              verified: true, // Child profiles are auto-verified through parent
              isActive: true,
              awards: [],
              totalPractices: 0,
              totalGames: 0,
              consecutiveCheckins: 0,
              videosCompleted: 0,
              yearsActive: 0,
            });
            createdPlayers.push(playerUser);
          }
        } else {
          // "myself" registration - create parent account first
          // User will add themselves as a player through the Add Player flow
          const player = players[0];
          primaryUser = await storage.createUser({
            organizationId,
            email: primaryEmail,
            role: "parent",
            firstName: player.firstName,
            lastName: player.lastName,
            dateOfBirth: sanitizeDate(player.dateOfBirth),
            gender: player.gender,
            password: hashedPassword,
            hasRegistered: true,
            verified: true,
            registrationType: "myself",
            isActive: true,
            awards: [],
            totalPractices: 0,
            totalGames: 0,
            consecutiveCheckins: 0,
            videosCompleted: 0,
            yearsActive: 0,
          });
          accountHolderId = primaryUser.id;
        }
      } catch (createError: any) {
        console.error("Error creating user:", createError);
        if (createError.message?.includes("duplicate key") || createError.code === '23505') {
          return res.status(400).json({ 
            success: false, 
            message: "This email is already registered. Please login instead." 
          });
        }
        throw createError;
      }
      
      // Delete the pending registration now that account is created
      await storage.deletePendingRegistration(primaryEmail, organizationId);
      
      // Check for migrated subscriptions from legacy UYP system
      let hasUnassignedSubs = false;
      let migratedSubsCount = 0;
      
      if (primaryUser) {
        try {
          const migrationLookups = await storage.getMigrationLookupsByEmail(primaryEmail);
          
          if (migrationLookups.length > 0) {
            console.log(`🔄 Found ${migrationLookups.length} legacy subscriptions for ${primaryEmail}`);
            
            // Create subscription records for each migrated subscription
            for (const lookup of migrationLookups) {
              await storage.createSubscription({
                ownerUserId: primaryUser.id,
                assignedPlayerId: null,
                stripeCustomerId: lookup.stripeCustomerId,
                stripeSubscriptionId: lookup.stripeSubscriptionId,
                productName: lookup.productName,
                status: 'active',
                isMigrated: true,
              });
              
              // Mark the lookup as claimed
              await storage.markMigrationLookupClaimed(lookup.id);
              migratedSubsCount++;
            }
            
            hasUnassignedSubs = true;
            console.log(`✅ Migrated ${migratedSubsCount} subscriptions to wallet for user ${primaryUser.id}`);
            
            // Update user with stripe customer ID from first subscription
            if (migrationLookups[0].stripeCustomerId) {
              await storage.updateUser(primaryUser.id, {
                stripeCustomerId: migrationLookups[0].stripeCustomerId,
              });
            }
          }
        } catch (migrationError: any) {
          console.error("Migration lookup error (non-fatal):", migrationError);
          // Don't fail registration if migration lookup fails
        }
      }
      
      res.json({
        success: true,
        message: hasUnassignedSubs 
          ? `Registration complete! We found ${migratedSubsCount} subscription(s) linked to your email.`
          : "Registration complete! You can now login.",
        requiresVerification: false,
        email: primaryEmail,
        hasUnassignedSubs,
        migratedSubsCount,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Registration failed" 
      });
    }
  });
  
  // =============================================
  // SUBSCRIPTION WALLET ROUTES (Legacy Migration)
  // =============================================
  
  // Get unassigned subscriptions for current user
  app.get('/api/subscriptions/unassigned', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const unassignedSubs = await storage.getUnassignedSubscriptionsByOwner(userId);
      
      res.json({
        success: true,
        subscriptions: unassignedSubs,
        count: unassignedSubs.length,
      });
    } catch (error: any) {
      console.error("Error fetching unassigned subscriptions:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch unassigned subscriptions" 
      });
    }
  });
  
  // Get all subscriptions for current user
  app.get('/api/subscriptions', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const subs = await storage.getSubscriptionsByOwner(userId);
      
      res.json({
        success: true,
        subscriptions: subs,
        count: subs.length,
      });
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch subscriptions" 
      });
    }
  });
  
  // Assign subscription to player
  app.post('/api/subscriptions/assign', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { subscriptionId, playerId } = req.body;
      
      if (!subscriptionId || !playerId) {
        return res.status(400).json({ 
          success: false, 
          message: "Subscription ID and Player ID are required" 
        });
      }
      
      // Verify the subscription belongs to the current user
      const subscription = await storage.getSubscription(subscriptionId);
      
      if (!subscription) {
        return res.status(404).json({ 
          success: false, 
          message: "Subscription not found" 
        });
      }
      
      if (subscription.ownerUserId !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "You don't have permission to assign this subscription" 
        });
      }
      
      if (subscription.assignedPlayerId) {
        return res.status(400).json({ 
          success: false, 
          message: "This subscription is already assigned to a player" 
        });
      }
      
      // Verify the player belongs to the current user
      const player = await storage.getUser(playerId);
      
      if (!player) {
        return res.status(404).json({ 
          success: false, 
          message: "Player not found" 
        });
      }
      
      if (player.accountHolderId !== userId && player.id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only assign subscriptions to your own players" 
        });
      }
      
      // Assign the subscription
      const updatedSubscription = await storage.assignSubscriptionToPlayer(subscriptionId, playerId);
      
      if (!updatedSubscription) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to assign subscription" 
        });
      }
      
      console.log(`✅ Assigned subscription ${subscriptionId} to player ${playerId}`);
      
      // Check if user has any remaining unassigned subscriptions
      const remainingUnassigned = await storage.getUnassignedSubscriptionsByOwner(userId);
      if (remainingUnassigned.length === 0) {
        // Clear the legacy subscription notification
        await clearLegacySubscriptionNotification(userId);
      }
      
      res.json({
        success: true,
        message: `Successfully assigned "${subscription.productName}" to ${player.firstName} ${player.lastName}`,
        subscription: updatedSubscription,
      });
    } catch (error: any) {
      console.error("Error assigning subscription:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to assign subscription" 
      });
    }
  });
  
  // Get users by account holder (for unified account page)
  app.get('/api/account/players', requireAuth, async (req: any, res) => {
    const { id } = req.user;
    const user = await storage.getUser(id);
    
    let players: any[] = [];
    
    if (user?.role === "parent" || user?.role === "admin") {
      // Get all players linked to this parent/admin
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      players = allUsers.filter(u => u.accountHolderId === id && u.role === "player");
    } else if (user?.role === "player") {
      // Return self
      players = [user];
    }
    
    // Fetch active subscriptions and status tags for each player with defensive error handling
    const playersWithSubscriptions = await Promise.all(
      players.map(async (player: any) => {
        try {
          const subscriptions = await storage.getSubscriptionsByPlayerId(player.id);
          const statusTag = await storage.getPlayerStatusTag(player.id);
          return {
            ...player,
            activeSubscriptions: (subscriptions || []).map(s => ({
              id: s.id,
              productName: s.productName,
              status: s.status,
            })),
            statusTag: statusTag.tag,
            remainingCredits: statusTag.remainingCredits,
            lowBalance: statusTag.lowBalance,
          };
        } catch (error) {
          console.error(`Error fetching subscriptions for player ${player.id}:`, error);
          return {
            ...player,
            activeSubscriptions: [],
            statusTag: player.paymentStatus === 'pending' ? 'payment_due' : 'none',
          };
        }
      })
    );
    
    res.json(playersWithSubscriptions);
  });
  
  // Add player to account (for parents and admins adding players)
  app.post('/api/account/players', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.user;
      const user = await storage.getUser(id);
      
      if (!user || (user.role !== "parent" && user.role !== "admin")) {
        return res.status(403).json({ 
          success: false, 
          message: "Only parent and admin accounts can add players" 
        });
      }
      
      const { firstName, lastName, dateOfBirth, gender, aauMembershipId, postalCode, concussionWaiverAcknowledged, clubAgreementAcknowledged, packageId } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          success: false, 
          message: "First name and last name are required" 
        });
      }
      
      // Validate package selection
      if (!packageId) {
        return res.status(400).json({ 
          success: false, 
          message: "Package selection is required" 
        });
      }
      
      // Get the selected program to check price
      const program = await storage.getProgram(packageId);
      if (!program) {
        return res.status(404).json({ 
          success: false, 
          message: "Selected program not found" 
        });
      }
      
      if (!program.price || program.price <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Selected program has no valid price" 
        });
      }
      
      // Child players don't need their own email - they're managed through parent's account
      // The unique email constraint only applies to parent accounts (account_holder_id IS NULL)
      
      // Create child player user with PENDING payment status
      const playerUser = await storage.createUser({
        organizationId: user.organizationId,
        email: null as any, // Child players don't need email - managed through parent account
        role: "player",
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        aauMembershipId: aauMembershipId || null,
        postalCode: postalCode || null,
        concussionWaiverAcknowledged: concussionWaiverAcknowledged || false,
        concussionWaiverDate: concussionWaiverAcknowledged ? new Date().toISOString() : null,
        clubAgreementAcknowledged: clubAgreementAcknowledged || false,
        clubAgreementDate: clubAgreementAcknowledged ? new Date().toISOString() : null,
        accountHolderId: id,
        packageSelected: packageId,
        teamAssignmentStatus: "pending",
        hasRegistered: false, // Will be set to true after payment
        verified: true, // Child profiles are auto-verified through parent
        isActive: true,
        awards: [],
        totalPractices: 0,
        totalGames: 0,
        consecutiveCheckins: 0,
        videosCompleted: 0,
        yearsActive: 0,
      });
      
      // Create or retrieve Stripe customer
      if (!stripe) {
        return res.status(500).json({ 
          success: false, 
          message: "Payment processing is not configured" 
        });
      }
      
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        stripeCustomerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(user.id, { stripeCustomerId });
      }
      
      // Get origin for URLs
      const origin = `${req.protocol}://${req.get('host')}`;
      
      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: program.name,
              description: `Registration for ${firstName} ${lastName}`,
            },
            unit_amount: program.price, // Price is already in cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/add-player?step=5&payment=cancelled`,
        metadata: {
          type: 'add_player',
          playerId: playerUser.id,
          accountHolderId: id,
          packageId: packageId,
        },
      });
      
      // Update player with checkout session ID
      await storage.updateUser(playerUser.id, {
        stripeCheckoutSessionId: session.id,
      });
      
      res.json({
        success: true,
        checkoutUrl: session.url,
        playerId: playerUser.id,
        message: "Player created. Please complete payment to finalize registration."
      });
    } catch (error: any) {
      console.error("Add player error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to add player" 
      });
    }
  });
  
  // Delete user account (self-deletion)
  app.post('/api/account/delete', requireAuth, async (req: any, res) => {
    try {
      const { id, organizationId } = req.user;
      const { confirmEmail } = req.body;
      
      // Get user info
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      // STRICTLY require email confirmation - not optional
      if (!confirmEmail) {
        return res.status(400).json({ 
          success: false, 
          message: "Email confirmation is required" 
        });
      }
      
      if (confirmEmail !== user.email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email confirmation does not match your account email" 
        });
      }
      
      // Track Stripe cancellation issues
      const stripeErrors: string[] = [];
      
      // For parent accounts, delete all linked child players first
      if (user.role === "parent" || user.role === "admin") {
        const allUsers = await storage.getUsersByOrganization(organizationId);
        const linkedPlayers = allUsers.filter(u => u.accountHolderId === id);
        
        for (const player of linkedPlayers) {
          // Cancel Stripe subscriptions for child players if they have their own customer
          if (stripe && player.stripeCustomerId) {
            try {
              const subscriptions = await stripe.subscriptions.list({
                customer: player.stripeCustomerId,
              });
              
              for (const subscription of subscriptions.data) {
                if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
                  await stripe.subscriptions.cancel(subscription.id);
                }
              }
            } catch (stripeError: any) {
              console.error(`Error canceling Stripe subscriptions for player ${player.id}:`, stripeError);
              stripeErrors.push(`Player ${player.firstName}: ${stripeError.message}`);
            }
          }
          
          // Soft delete child players
          await storage.updateUser(player.id, {
            isActive: false,
            password: null,
            verificationToken: null,
            verificationExpiry: null,
            magicLinkToken: null,
            magicLinkExpiry: null,
            email: `deleted_${player.id}@deleted.local`,
          });
        }
      }
      
      // Cancel any active Stripe subscriptions for the main user
      if (stripe && user.stripeCustomerId) {
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
          });
          
          for (const subscription of subscriptions.data) {
            if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
              await stripe.subscriptions.cancel(subscription.id);
            }
          }
        } catch (stripeError: any) {
          console.error('Error canceling Stripe subscriptions:', stripeError);
          stripeErrors.push(`Main account: ${stripeError.message}`);
        }
      }
      
      // Soft delete the user account
      await storage.updateUser(id, {
        isActive: false,
        password: null,
        verificationToken: null,
        verificationExpiry: null,
        magicLinkToken: null,
        magicLinkExpiry: null,
        email: `deleted_${id}@deleted.local`,
      });
      
      // Clear session cookie and destroy session
      res.clearCookie('connect.sid', { path: '/' });
      
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
      }
      
      // Return success with any Stripe warnings
      res.json({ 
        success: true, 
        message: "Account deactivated successfully",
        warnings: stripeErrors.length > 0 ? stripeErrors : undefined
      });
    } catch (error: any) {
      console.error("Account deletion error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to delete account" 
      });
    }
  });
  
  // Get profile by ID
  app.get('/api/profile/:id', requireAuth, async (req: any, res) => {
    try {
      const profileId = req.params.id;
      const profile = await storage.getUser(profileId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch profile', message: error.message });
    }
  });

  // Upload profile photo
  app.post('/api/upload-profile-photo', requireAuth, upload.single('photo'), async (req: any, res) => {
    const uploadedFilePath = req.file ? path.join(uploadDir, req.file.filename) : null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const requestingUserId = req.user.id;
      const targetUserId = req.query.profileId || req.body.profileId || requestingUserId;
      const filename = req.file.filename;
      const imageUrl = `/uploads/${filename}`;
      
      // Authorization: parent can update their children, or user can update self
      const requestingUser = await storage.getUser(requestingUserId);
      const targetUser = await storage.getUser(targetUserId);
      
      if (!targetUser) {
        // Delete uploaded file on authorization failure
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(404).json({ error: 'User not found' });
      }
      
      const isParentOfChild = requestingUser?.role === 'parent' && targetUser.accountHolderId === requestingUserId;
      const isUpdatingSelf = requestingUserId === targetUserId;
      const isAdmin = requestingUser?.role === 'admin';
      
      if (!isParentOfChild && !isUpdatingSelf && !isAdmin) {
        // Delete uploaded file on authorization failure
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(403).json({ error: 'Not authorized to update this profile' });
      }
      
      // Update user's profile image
      await storage.updateUser(targetUserId, { profileImageUrl: imageUrl });
      
      res.json({ 
        success: true, 
        imageUrl,
        message: 'Profile photo uploaded successfully' 
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      // Delete uploaded file on any error
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try {
          fs.unlinkSync(uploadedFilePath);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      res.status(500).json({ error: 'Failed to upload photo', message: error.message });
    }
  });

  // Upload award image
  app.post('/api/upload/award-image', requireAuth, uploadAwardImage.single('image'), async (req: any, res) => {
    const uploadedFilePath = req.file ? path.join(awardImageDir, req.file.filename) : null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Only admins can upload award images
      if (req.user.role !== 'admin') {
        // Delete uploaded file on authorization failure
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(403).json({ error: 'Only admins can upload award images' });
      }
      
      const filename = req.file.filename;
      const imageUrl = `/trophiesbadges/${filename}`;
      
      res.json({ 
        success: true, 
        imageUrl,
        message: 'Award image uploaded successfully' 
      });
    } catch (error: any) {
      console.error('Award image upload error:', error);
      // Delete uploaded file on any error
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try {
          fs.unlinkSync(uploadedFilePath);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      res.status(500).json({ error: 'Failed to upload award image', message: error.message });
    }
  });

  // Update player profile (for parents updating child profiles or players updating self)
  app.patch('/api/profile/:id', requireAuth, async (req: any, res) => {
    try {
      const profileId = req.params.id;
      const userId = req.user.id;
      
      // Get the user making the request and the profile being updated
      const requestingUser = await storage.getUser(userId);
      const profileToUpdate = await storage.getUser(profileId);
      
      if (!profileToUpdate) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      
      // Authorization: parent can update their children, or user can update self
      const isParentOfChild = requestingUser?.role === 'parent' && profileToUpdate.accountHolderId === userId;
      const isUpdatingSelf = userId === profileId;
      const isAdmin = requestingUser?.role === 'admin';
      
      if (!isParentOfChild && !isUpdatingSelf && !isAdmin) {
        return res.status(403).json({ message: 'Not authorized to update this profile' });
      }
      
      // Update the profile
      const updated = await storage.updateUser(profileId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });
  
  // =============================================
  // ORGANIZATION ROUTES
  // =============================================
  
  app.get('/api/organization', requireAuth, async (req: any, res) => {
    const org = await storage.getOrganization(req.user.organizationId);
    res.json(org);
  });
  
  app.patch('/api/organization', requireAuth, async (req: any, res) => {
    const { role, organizationId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update organization settings' });
    }
    
    const updated = await storage.updateOrganization(organizationId, req.body);
    res.json(updated);
  });
  
  // =============================================
  // USER MANAGEMENT ROUTES (Admin only)
  // =============================================
  
  app.get('/api/users', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const users = await storage.getUsersByOrganization(organizationId);
    
    // Separate players from non-players
    const players = users.filter((u: any) => u.role === 'player');
    const nonPlayers = users.filter((u: any) => u.role !== 'player');
    
    // Fetch status tags for all players in a single bulk query
    const playerIds = players.map((p: any) => p.id);
    let statusTagsMap = new Map<string, {tag: string; remainingCredits?: number; lowBalance?: boolean}>();
    
    try {
      statusTagsMap = await storage.getPlayerStatusTagsBulk(playerIds);
    } catch (error) {
      console.error('Error fetching bulk status tags:', error);
    }
    
    // Enrich players with status tags from the bulk result
    const enrichedPlayers = players.map((player: any) => {
      const statusTag = statusTagsMap.get(player.id) || { tag: player.paymentStatus === 'pending' ? 'payment_due' : 'none' };
      return {
        ...player,
        statusTag: statusTag.tag || 'none',
        remainingCredits: statusTag.remainingCredits,
        lowBalance: statusTag.lowBalance,
      };
    });
    
    // Add explicit null statusTag to non-players for consistent sorting
    const enrichedNonPlayers = nonPlayers.map((user: any) => ({
      ...user,
      statusTag: null,
    }));
    
    // Combine and return all users
    res.json([...enrichedNonPlayers, ...enrichedPlayers]);
  });
  
  app.get('/api/users/role/:role', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const { role } = req.params;
    const users = await storage.getUsersByRole(organizationId, role);
    res.json(users);
  });
  
  app.post('/api/users', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create users' });
    }
    
    const userData = insertUserSchema.parse(req.body);
    // Admin-created users are automatically verified so they can use magic link login
    userData.verified = true;
    const user = await storage.createUser(userData);
    res.json(user);
  });
  
  app.patch('/api/users/:id', requireAuth, async (req: any, res) => {
    const { role, organizationId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update users' });
    }
    
    const userId = req.params.id;
    const updateData = req.body;
    
    console.log(`[PATCH /api/users/${userId}] Update data:`, JSON.stringify(updateData, null, 2));
    
    // If updating a coach's teamIds, also update the team records and team_memberships
    if (updateData.teamIds !== undefined) {
      const user = await storage.getUser(userId);
      console.log(`[PATCH] User role: ${user?.role}, teamIds to set:`, updateData.teamIds);
      
      if (user && user.role === 'coach') {
        const newTeamIds = updateData.teamIds || [];
        const allTeams = await storage.getTeamsByOrganization(organizationId);
        console.log(`[PATCH] Found ${allTeams.length} teams in org, syncing coach ${userId} to teams:`, newTeamIds);
        
        // For each team in the organization, update coach assignments
        for (const team of allTeams) {
          const teamIdNum = team.id;
          const isInNewTeams = newTeamIds.includes(teamIdNum);
          const isCurrentlyHead = team.coachId === userId;
          const isCurrentlyAssistant = team.assistantCoachIds?.includes(userId) || false;
          
          console.log(`[PATCH] Team ${teamIdNum} "${team.name}": inNew=${isInNewTeams}, isHead=${isCurrentlyHead}, isAssistant=${isCurrentlyAssistant}`);
          
          if (isInNewTeams) {
            if (isCurrentlyHead) {
              // Coach is already head coach - ensure team_memberships has correct entry
              console.log(`[PATCH] Coach is head of team ${teamIdNum}, ensuring team_memberships entry`);
              await db.insert(teamMemberships)
                .values({
                  teamId: teamIdNum,
                  profileId: userId,
                  role: 'coach',
                  status: 'active',
                })
                .onConflictDoUpdate({
                  target: [teamMemberships.teamId, teamMemberships.profileId],
                  set: { status: 'active', role: 'coach' },
                });
            } else if (isCurrentlyAssistant) {
              // Coach is already assistant - ensure team_memberships has correct entry
              console.log(`[PATCH] Coach is assistant of team ${teamIdNum}, ensuring team_memberships entry`);
              await db.insert(teamMemberships)
                .values({
                  teamId: teamIdNum,
                  profileId: userId,
                  role: 'assistant_coach',
                  status: 'active',
                })
                .onConflictDoUpdate({
                  target: [teamMemberships.teamId, teamMemberships.profileId],
                  set: { status: 'active', role: 'assistant_coach' },
                });
            } else {
              // Add coach to this team as assistant (since head coach might already exist)
              const updatedAssistantIds = [...(team.assistantCoachIds || []), userId];
              console.log(`[PATCH] Adding coach to team ${teamIdNum} as assistant:`, updatedAssistantIds);
              await storage.updateTeam(String(teamIdNum), { assistantCoachIds: updatedAssistantIds });
              
              // Also add to team_memberships table
              await db.insert(teamMemberships)
                .values({
                  teamId: teamIdNum,
                  profileId: userId,
                  role: 'assistant_coach',
                  status: 'active',
                })
                .onConflictDoUpdate({
                  target: [teamMemberships.teamId, teamMemberships.profileId],
                  set: { status: 'active', role: 'assistant_coach' },
                });
            }
          } else if (!isInNewTeams && (isCurrentlyHead || isCurrentlyAssistant)) {
            // Remove coach from this team
            if (isCurrentlyHead) {
              console.log(`[PATCH] Removing coach as head from team ${teamIdNum}`);
              await storage.updateTeam(String(teamIdNum), { coachId: null });
            }
            if (isCurrentlyAssistant) {
              const updatedAssistantIds = (team.assistantCoachIds || []).filter((id: string) => id !== userId);
              console.log(`[PATCH] Removing coach as assistant from team ${teamIdNum}:`, updatedAssistantIds);
              await storage.updateTeam(String(teamIdNum), { assistantCoachIds: updatedAssistantIds });
            }
            
            // Mark membership as inactive instead of deleting
            await db.update(teamMemberships)
              .set({ status: 'inactive' })
              .where(
                and(
                  eq(teamMemberships.teamId, teamIdNum),
                  eq(teamMemberships.profileId, userId)
                )
              );
          }
        }
      }
    }
    
    const updated = await storage.updateUser(userId, updateData);
    console.log(`[PATCH] User ${userId} updated successfully`);
    res.json(updated);
  });
  
  // Add a new role profile for an existing account
  app.post('/api/users/:userId/add-role', requireAuth, async (req: any, res) => {
    const { role: adminRole, organizationId } = req.user;
    if (adminRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can add roles' });
    }
    
    const { userId } = req.params;
    const { role: newRole, firstName, lastName } = req.body;
    
    // Validate role
    const validRoles = ['player', 'parent', 'coach', 'admin'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: 'Invalid role. Must be one of: player, parent, coach, admin' });
    }
    
    try {
      // Get the target user (should be an account holder)
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Determine the account holder ID
      // If target user IS an account holder, use their ID
      // Otherwise, use their accountHolderId
      const accountHolderId = targetUser.accountHolderId || targetUser.id;
      const accountHolder = targetUser.accountHolderId 
        ? await storage.getUser(targetUser.accountHolderId) 
        : targetUser;
      
      if (!accountHolder) {
        return res.status(404).json({ message: 'Account holder not found' });
      }
      
      // Get all existing profiles for this account
      const allUsers = await storage.getUsersByOrganization(organizationId);
      const existingProfiles = allUsers.filter((u: any) => 
        u.id === accountHolderId || u.accountHolderId === accountHolderId
      );
      
      // Check if this role already exists for this account
      const roleExists = existingProfiles.some((u: any) => u.role === newRole);
      if (roleExists) {
        return res.status(400).json({ 
          message: `This account already has a ${newRole} profile` 
        });
      }
      
      // Generate unique ID for new profile
      const newId = `${newRole}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      // Create the new role profile with the same email
      const newProfile = await storage.createUser({
        id: newId,
        organizationId: accountHolder.organizationId,
        email: accountHolder.email,
        role: newRole,
        firstName: firstName || accountHolder.firstName,
        lastName: lastName || accountHolder.lastName,
        accountHolderId: accountHolderId,
        hasRegistered: true,
        verified: true,
        isActive: true,
        awards: [],
        totalPractices: 0,
        totalGames: 0,
        consecutiveCheckins: 0,
        videosCompleted: 0,
        yearsActive: 0,
      });
      
      res.json({ 
        success: true, 
        message: `${newRole} profile created successfully`,
        profile: newProfile 
      });
    } catch (error: any) {
      console.error('Error adding role:', error);
      res.status(500).json({ message: 'Failed to add role', error: error.message });
    }
  });
  
  app.delete('/api/users/:id', requireAuth, async (req: any, res) => {
    const { role, organizationId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }
    
    const userId = req.params.id;
    
    // Get the user being deleted
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    try {
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      const deletedIds = new Set<string>();
      
      // Find ALL profiles with the same email (complete account deletion)
      const sameEmailUsers = user.email 
        ? allUsers.filter((u: any) => u.email?.toLowerCase() === user.email?.toLowerCase())
        : [user];
      
      // Delete all profiles with the same email and their children
      for (const emailUser of sameEmailUsers) {
        if (deletedIds.has(emailUser.id)) continue;
        
        // Get all children of this user
        const childUsers = allUsers.filter((u: any) => u.accountHolderId === emailUser.id);
        
        // Delete all child profiles first
        for (const child of childUsers) {
          if (deletedIds.has(child.id)) continue;
          if (child.email) {
            await storage.deletePendingRegistration(child.email, child.organizationId);
          }
          await storage.deleteUser(child.id);
          deletedIds.add(child.id);
        }
        
        // Delete pending registration for this user's email
        if (emailUser.email) {
          await storage.deletePendingRegistration(emailUser.email, emailUser.organizationId);
        }
        
        // Delete the user
        await storage.deleteUser(emailUser.id);
        deletedIds.add(emailUser.id);
      }
      
      res.json({ success: true, deletedCount: deletedIds.size });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
  });
  
  // Get user's team information (returns single team for backward compatibility)
  app.get('/api/users/:userId/team', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { id: requesterId, organizationId: requesterOrgId, role: requesterRole } = req.user;
      
      // Get the user first to get their teamId
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Authorization: Allow user to view their own team, or users in same organization, or admins
      const isSameUser = requesterId === userId;
      const isSameOrg = requesterOrgId === user.organizationId;
      const isAdmin = requesterRole === 'admin';
      const isCoach = requesterRole === 'coach';
      
      if (!isSameUser && !isSameOrg && !isAdmin && !isCoach) {
        return res.status(403).json({ message: 'Unauthorized to view this user\'s team' });
      }
      
      if (!user.teamId) {
        return res.json(null);
      }
      
      // Get the team details - ensure teamId is converted to string
      const teamIdString = String(user.teamId);
      const team = await storage.getTeam(teamIdString);
      
      if (!team) {
        return res.json(null);
      }
      
      // Return team info in the format expected by the frontend
      res.json({
        id: team.id,
        name: team.name,
        divisionId: team.divisionId, // Include divisionId for division lookup
        ageGroup: team.divisionId ? `Division ${team.divisionId}` : 'N/A',
        programType: team.programType || 'N/A',
        program: team.programType || 'N/A',
        coachId: team.coachId,
        color: '#d82428', // Default UYP red
      });
    } catch (error: any) {
      console.error('Error fetching user team:', error);
      res.status(500).json({ message: 'Failed to fetch user team' });
    }
  });
  
  // Get all teams for a user (supports multiple team assignments via team_memberships)
  app.get('/api/users/:userId/teams', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { id: requesterId, organizationId: requesterOrgId, role: requesterRole } = req.user;
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Authorization check
      const isSameUser = requesterId === userId;
      const isSameOrg = requesterOrgId === user.organizationId;
      const isAdmin = requesterRole === 'admin';
      const isCoach = requesterRole === 'coach';
      
      if (!isSameUser && !isSameOrg && !isAdmin && !isCoach) {
        return res.status(403).json({ message: 'Unauthorized to view this user\'s teams' });
      }
      
      // Query team_memberships table for this user's teams
      const memberships = await db
        .select({
          teamId: teamMemberships.teamId,
          role: teamMemberships.role,
          status: teamMemberships.status,
        })
        .from(teamMemberships)
        .where(eq(teamMemberships.profileId, userId));
      
      if (memberships.length === 0) {
        // Fallback to legacy teamId field for backwards compatibility
        if (user.teamId) {
          const team = await storage.getTeam(String(user.teamId));
          if (team) {
            return res.json([{
              id: team.id,
              name: team.name,
              ageGroup: team.divisionId ? `Division ${team.divisionId}` : 'N/A',
              program: team.programType || 'N/A',
              color: '#d82428',
            }]);
          }
        }
        return res.json([]);
      }
      
      // Fetch all teams from memberships
      const teams = await Promise.all(
        memberships.map(async (m) => {
          const team = await storage.getTeam(String(m.teamId));
          if (!team) return null;
          return {
            id: team.id,
            name: team.name,
            ageGroup: team.divisionId ? `Division ${team.divisionId}` : 'N/A',
            program: team.programType || 'N/A',
            color: '#d82428',
            membershipRole: m.role,
          };
        })
      );
      
      res.json(teams.filter(t => t !== null));
    } catch (error: any) {
      console.error('Error fetching user teams:', error);
      res.status(500).json({ message: 'Failed to fetch user teams' });
    }
  });
  
  // Get linked profiles for a user (other roles with same email)
  app.get('/api/users/:userId/linked-profiles', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { organizationId } = req.user;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Find all users with the same email in the same organization
      const allUsers = await storage.getUsersByOrganization(organizationId);
      const linkedProfiles = allUsers.filter(u => 
        u.email === user.email && u.id !== userId
      ).map(u => ({
        id: u.id,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
      }));
      
      res.json(linkedProfiles);
    } catch (error: any) {
      console.error('Error fetching linked profiles:', error);
      res.status(500).json({ message: 'Failed to fetch linked profiles' });
    }
  });
  
  // =============================================
  // TEAM ROUTES
  // =============================================
  
  app.get('/api/teams', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const teams = await storage.getTeamsByOrganization(organizationId);
      
      // Add roster count to each team
      const teamsWithRosterCount = await Promise.all(
        teams.map(async (team) => {
          const roster = await storage.getUsersByTeam(String(team.id));
          return {
            ...team,
            rosterCount: roster.length,
          };
        })
      );
      
      res.json(teamsWithRosterCount);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: 'Failed to fetch teams' });
    }
  });
  
  app.get('/api/teams/coach/:coachId', requireAuth, async (req: any, res) => {
    const teams = await storage.getTeamsByCoach(req.params.coachId);
    res.json(teams);
  });
  
  app.post('/api/teams', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can create teams' });
    }
    
    const teamData = insertTeamSchema.parse(req.body);
    const team = await storage.createTeam(teamData);
    res.json(team);
  });
  
  app.patch('/api/teams/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can update teams' });
    }
    
    const teamId = parseInt(req.params.id);
    const updateData = req.body;
    
    // Get current team state to detect changes
    const currentTeam = await storage.getTeam(req.params.id);
    
    // Update the team in storage
    const updated = await storage.updateTeam(req.params.id, updateData);
    
    // Get the FINAL state of the team after update for syncing memberships
    const finalTeam = await storage.getTeam(req.params.id);
    const finalCoachId = finalTeam?.coachId;
    const finalAssistantIds = finalTeam?.assistantCoachIds || [];
    
    // Handle head coach changes - mark old coach as inactive if coach changed
    if (updateData.coachId !== undefined && currentTeam?.coachId && currentTeam.coachId !== finalCoachId) {
      await db.update(teamMemberships)
        .set({ status: 'inactive' })
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.profileId, currentTeam.coachId),
            eq(teamMemberships.role, 'coach')
          )
        );
    }
    
    // Always ensure head coach membership is active if there is a coachId
    // This runs on EVERY team update to ensure consistency
    if (finalCoachId) {
      await db.insert(teamMemberships)
        .values({
          teamId,
          profileId: finalCoachId,
          role: 'coach',
          status: 'active',
        })
        .onConflictDoUpdate({
          target: [teamMemberships.teamId, teamMemberships.profileId],
          set: { status: 'active', role: 'coach' },
        });
    }
    
    // Handle assistant coach changes only when assistantCoachIds is in the payload
    if (updateData.assistantCoachIds !== undefined) {
      const oldAssistantIds = currentTeam?.assistantCoachIds || [];
      const newAssistantIdsSet = new Set(finalAssistantIds);
      
      // Upsert ALL assistants in the final array (reactivates previously inactive ones)
      for (const assistantId of finalAssistantIds) {
        await db.insert(teamMemberships)
          .values({
            teamId,
            profileId: assistantId,
            role: 'assistant_coach',
            status: 'active',
          })
          .onConflictDoUpdate({
            target: [teamMemberships.teamId, teamMemberships.profileId],
            set: { status: 'active', role: 'assistant_coach' },
          });
      }
      
      // Mark removed assistants as inactive
      for (const oldAssistantId of oldAssistantIds) {
        if (!newAssistantIdsSet.has(oldAssistantId)) {
          await db.update(teamMemberships)
            .set({ status: 'inactive' })
            .where(
              and(
                eq(teamMemberships.teamId, teamId),
                eq(teamMemberships.profileId, oldAssistantId),
                eq(teamMemberships.role, 'assistant_coach')
              )
            );
        }
      }
    }
    
    res.json(updated);
  });
  
  app.delete('/api/teams/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete teams' });
    }
    
    await storage.deleteTeam(req.params.id);
    res.json({ success: true });
  });
  
  // Get team roster including Notion-synced players
  app.get('/api/teams/:teamId/roster-with-notion', requireAuth, async (req: any, res) => {
    try {
      const teamId = req.params.teamId;
      
      // Get the team from database
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Get users assigned to this team
      const appUsers = await storage.getUsersByTeam(teamId);
      
      // Get Notion players for this team if it has a notionSlug
      let notionPlayers: any[] = [];
      if (team.notionSlug) {
        const notionTeam = notionService.getTeam(team.notionSlug);
        notionPlayers = notionTeam?.roster || [];
      }
      
      // Build roster combining app users and notion players
      const roster: any[] = [];
      
      // Add app users
      for (const user of appUsers) {
        roster.push({
          appAccountId: user.id,
          notionId: null,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          jerseyNumber: user.jerseyNumber,
          position: user.position,
          grade: user.grade,
          hasAppAccount: true,
        });
      }
      
      // Add Notion players who don't have app accounts yet
      for (const notionPlayer of notionPlayers) {
        // Check if this Notion player already has an app account
        const existingUser = appUsers.find(u => 
          `${u.firstName} ${u.lastName}`.toLowerCase().trim() === notionPlayer.name.toLowerCase().trim()
        );
        
        if (!existingUser) {
          const nameParts = notionPlayer.name.split(' ');
          const firstName = nameParts.slice(0, -1).join(' ') || notionPlayer.name;
          const lastName = nameParts[nameParts.length - 1] || '';
          
          roster.push({
            appAccountId: null,
            notionId: notionPlayer.id,
            name: notionPlayer.name,
            firstName,
            lastName,
            profileImageUrl: notionPlayer.profileImageUrl,
            jerseyNumber: notionPlayer.jerseyNumber,
            position: notionPlayer.position,
            grade: notionPlayer.grade,
            hasAppAccount: false,
          });
        }
      }
      
      res.json(roster);
    } catch (error: any) {
      console.error('Error fetching team roster with notion:', error);
      res.status(500).json({ message: 'Failed to fetch team roster' });
    }
  });

  // Assign a player to a team (uses team_memberships table)
  app.post('/api/teams/:teamId/assign-player', requireAuth, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { playerId, role: memberRole = 'player' } = req.body;
      const { role } = req.user;

      // Only coaches and admins can assign players
      if (role !== 'coach' && role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches and admins can assign players' });
      }

      if (!playerId) {
        return res.status(400).json({ message: 'playerId is required' });
      }

      // Validate teamId is a valid integer
      const teamIdNum = parseInt(teamId);
      if (!Number.isInteger(teamIdNum) || teamIdNum <= 0) {
        return res.status(400).json({ message: 'Invalid teamId' });
      }

      // Get the player
      const player = await storage.getUser(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Get the team to verify it exists
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Add to team_memberships table (upsert to handle existing memberships)
      await db.insert(teamMemberships)
        .values({
          teamId: teamIdNum,
          profileId: playerId,
          role: memberRole,
          status: 'active',
          jerseyNumber: player.jerseyNumber,
          position: player.position,
        })
        .onConflictDoUpdate({
          target: [teamMemberships.teamId, teamMemberships.profileId],
          set: { status: 'active', role: memberRole },
        });
      
      // Also update legacy teamId field for backwards compatibility
      const updatedPlayer = await storage.updateUser(playerId, { teamId: teamIdNum } as any);
      
      console.log(`Assigned player ${playerId} to team ${teamId} via team_memberships`);
      res.json({ success: true, player: updatedPlayer });
    } catch (error: any) {
      console.error('Error assigning player to team:', error);
      res.status(500).json({ message: 'Failed to assign player to team' });
    }
  });

  // Remove a player from a team (uses team_memberships table)
  app.post('/api/teams/:teamId/remove-player', requireAuth, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { playerId } = req.body;
      const { role, organizationId } = req.user;

      // Only coaches and admins can remove players
      if (role !== 'coach' && role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches and admins can remove players' });
      }

      if (!playerId) {
        return res.status(400).json({ message: 'playerId is required' });
      }

      // Validate teamId is a valid integer
      const teamIdNum = parseInt(teamId);
      if (!Number.isInteger(teamIdNum) || teamIdNum <= 0) {
        return res.status(400).json({ message: 'Invalid teamId' });
      }

      // Get the player
      const player = await storage.getUser(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Security check: ensure player is in the same organization
      if (player.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot remove players from other organizations' });
      }

      // Remove from team_memberships table
      await db.delete(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamIdNum),
            eq(teamMemberships.profileId, playerId)
          )
        );
      
      // Also clear legacy teamId field for backwards compatibility
      const updatedPlayer = await storage.updateUser(playerId, { teamId: null } as any);
      
      console.log(`Removed player ${playerId} from team ${teamId} via team_memberships`);
      res.json({ success: true, player: updatedPlayer });
    } catch (error: any) {
      console.error('Error removing player from team:', error);
      res.status(500).json({ message: 'Failed to remove player from team' });
    }
  });
  
  // Get teams for a specific coach
  app.get('/api/coaches/:coachId/teams', requireAuth, async (req: any, res) => {
    try {
      const teams = await storage.getTeamsByCoach(req.params.coachId);
      res.json(teams);
    } catch (error: any) {
      console.error('Error fetching coach teams:', error);
      res.status(500).json({ message: 'Failed to fetch coach teams' });
    }
  });
  
  // Get all players from a coach's teams
  app.get('/api/coaches/:coachId/players', requireAuth, async (req: any, res) => {
    try {
      const teams = await storage.getTeamsByCoach(req.params.coachId);
      const allPlayers: any[] = [];
      
      for (const team of teams) {
        const players = await storage.getUsersByTeam(String(team.id));
        allPlayers.push(...players);
      }
      
      // Remove duplicates (if a player is on multiple teams)
      const uniquePlayers = allPlayers.filter((player, index, self) => 
        index === self.findIndex(p => p.id === player.id)
      );
      
      res.json(uniquePlayers);
    } catch (error: any) {
      console.error('Error fetching coach players:', error);
      res.status(500).json({ message: 'Failed to fetch coach players' });
    }
  });
  
  // Join a team (add coach to assistantCoachIds)
  app.post('/api/coaches/:coachId/teams/:teamId/join', requireAuth, async (req: any, res) => {
    try {
      const { coachId, teamId } = req.params;
      const { id: userId, role } = req.user;
      
      // Verify the user is a coach or admin
      if (role !== 'coach' && role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can join teams' });
      }
      
      // Verify the coachId matches the authenticated user (unless admin)
      if (role !== 'admin' && userId !== coachId) {
        return res.status(403).json({ message: 'You can only join teams for yourself' });
      }
      
      // Get the team
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if coach is already assigned
      if (team.coachId === coachId) {
        return res.status(400).json({ message: 'You are already the head coach of this team' });
      }
      
      if (team.assistantCoachIds?.includes(coachId)) {
        return res.status(400).json({ message: 'You are already an assistant coach on this team' });
      }
      
      // Add coach to assistantCoachIds
      const updatedAssistantCoachIds = [...(team.assistantCoachIds || []), coachId];
      await storage.updateTeam(teamId, { assistantCoachIds: updatedAssistantCoachIds });
      
      res.json({ success: true, message: 'Successfully joined team' });
    } catch (error: any) {
      console.error('Error joining team:', error);
      res.status(500).json({ message: 'Failed to join team' });
    }
  });
  
  // =============================================
  // EVENT ROUTES
  // =============================================
  
  // Helper function to get team and division IDs for a user based on their role
  async function getUserEventScope(userId: string, role: string, organizationId: string, childProfileId?: string) {
    let teamIds: (string | number)[] = [];
    let divisionIds: (string | number)[] = [];
    let targetUserId = userId;
    
    if (childProfileId) {
      // Player Mode: Viewing as a specific child - only show that child's events
      const childProfile = await storage.getUser(childProfileId);
      if (childProfile) {
        if (childProfile.teamId) teamIds = [childProfile.teamId];
        if (childProfile.divisionId) divisionIds = [childProfile.divisionId];
        targetUserId = childProfileId;
      }
    } else if (role === 'parent') {
      // Parent Mode: Show events from ALL children's teams + parent's own events
      const allUsersInOrg = await storage.getUsersByOrganization(organizationId);
      const childProfiles = allUsersInOrg.filter(u => u.parentId === userId || u.guardianId === userId);
      
      // Collect all team IDs and division IDs from children
      for (const child of childProfiles) {
        if (child.teamId) teamIds.push(child.teamId);
        if (child.divisionId) divisionIds.push(child.divisionId);
      }
      
      // Also include parent's own team/division if they have one
      const userProfile = await storage.getUser(userId);
      if (userProfile?.teamId) teamIds.push(userProfile.teamId);
      if (userProfile?.divisionId) divisionIds.push(userProfile.divisionId);
      
      // Deduplicate team and division IDs
      teamIds = [...new Set(teamIds.map(String))];
      divisionIds = [...new Set(divisionIds.map(String))];
    } else if (role === 'coach') {
      // Coach: Get all teams they're assigned to (as head coach or assistant)
      const coachTeams = await storage.getTeamsByCoach(userId);
      teamIds = coachTeams.map(team => team.id);
      
      // Also collect division IDs from those teams
      for (const team of coachTeams) {
        if (team.divisionId) divisionIds.push(team.divisionId);
      }
      
      // Deduplicate
      teamIds = [...new Set(teamIds.map(String))];
      divisionIds = [...new Set(divisionIds.map(String))];
    } else {
      // Regular user (player): Use their own team/division
      const userProfile = await storage.getUser(userId);
      if (userProfile) {
        if (userProfile.teamId) teamIds = [userProfile.teamId];
        if (userProfile.divisionId) divisionIds = [userProfile.divisionId];
      }
    }
    
    return { teamIds, divisionIds, targetUserId };
  }
  
  // Helper function to filter events based on visibility and assignment
  function filterEventsByScope(
    events: any[],
    role: string,
    teamIds: (string | number)[],
    divisionIds: (string | number)[],
    targetUserId: string,
    debug = false
  ) {
    return events.filter((event: any) => {
      const visibility = event.visibility || {};
      const assignTo = event.assignTo || {};
      
      if (debug) {
        console.log(`  📅 Event "${event.title}" (ID: ${event.id}) - assignTo: ${JSON.stringify(assignTo)}, visibility: ${JSON.stringify(visibility)}`);
      }
      
      // Check role-based visibility
      if (visibility.roles?.includes(role) || assignTo.roles?.includes(role)) {
        if (debug) console.log(`    ✅ MATCH: Role "${role}"`);
        return true;
      }
      
      // Check team-based visibility (check all team IDs)
      for (const teamId of teamIds) {
        if (visibility.teams?.includes(String(teamId)) || assignTo.teams?.includes(String(teamId))) {
          if (debug) console.log(`    ✅ MATCH: Team ${teamId}`);
          return true;
        }
      }
      
      // Check division-based visibility (check all division IDs)
      for (const divisionId of divisionIds) {
        if (visibility.divisions?.includes(String(divisionId)) || assignTo.divisions?.includes(String(divisionId))) {
          if (debug) console.log(`    ✅ MATCH: Division ${divisionId}`);
          return true;
        }
      }
      
      // Check user-specific assignment
      if (assignTo.users?.includes(targetUserId) || visibility.users?.includes(targetUserId)) {
        if (debug) console.log(`    ✅ MATCH: User ${targetUserId}`);
        return true;
      }
      
      // Event doesn't match any targeting criteria for this user
      if (debug) console.log(`    ❌ NO MATCH`);
      return false;
    });
  }
  
  app.get('/api/events', requireAuth, async (req: any, res) => {
    const { organizationId, id: userId, role } = req.user;
    const { childProfileId } = req.query;
    const allEvents = await storage.getEventsByOrganization(organizationId);
    
    console.log('🔍 EVENT FILTERING DEBUG - Start');
    console.log('  userId:', userId);
    console.log('  role:', role);
    console.log('  childProfileId:', childProfileId);
    
    // Admins see all events ONLY when viewing their own dashboard (not a child's)
    if (role === 'admin' && !childProfileId) {
      console.log('  Admin viewing own dashboard - showing all events');
      return res.json(allEvents);
    }
    
    // Verify user exists to prevent data leaks
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.json([]);
    }
    
    // Get user's event scope (teams, divisions, target user ID)
    const { teamIds, divisionIds, targetUserId } = await getUserEventScope(
      userId,
      role,
      organizationId,
      childProfileId as string | undefined
    );
    
    console.log('  teamIds collected:', teamIds);
    console.log('  divisionIds collected:', divisionIds);
    console.log('  targetUserId:', targetUserId);
    console.log('  Total events to filter:', allEvents.length);
    
    // Filter events using shared helper
    const filteredEvents = filterEventsByScope(allEvents, role, teamIds, divisionIds, targetUserId, true);
    
    console.log('  Filtered result:', filteredEvents.length, 'events shown');
    console.log('🔍 EVENT FILTERING DEBUG - End\n');
    
    res.json(filteredEvents);
  });
  
  app.get('/api/events/upcoming', requireAuth, async (req: any, res) => {
    const { organizationId, id: userId, role } = req.user;
    const { childProfileId } = req.query;
    const allEvents = await storage.getUpcomingEvents(organizationId);
    
    // Admins see all events ONLY when viewing their own dashboard (not a child's)
    if (role === 'admin' && !childProfileId) {
      return res.json(allEvents);
    }
    
    // Get user's event scope (teams, divisions, target user ID)
    const { teamIds, divisionIds, targetUserId } = await getUserEventScope(
      userId,
      role,
      organizationId,
      childProfileId as string | undefined
    );
    
    // Filter events using shared helper
    const filteredEvents = filterEventsByScope(allEvents, role, teamIds, divisionIds, targetUserId, false);
    
    res.json(filteredEvents);
  });
  
  // Coach-specific events endpoint (delegates to shared filtering logic)
  app.get('/api/coach/events', requireAuth, async (req: any, res) => {
    const { organizationId, id: userId, role } = req.user;
    
    // Only coaches can access this endpoint
    if (role !== 'coach') {
      return res.status(403).json({ message: 'Only coaches can access this endpoint' });
    }
    
    const allEvents = await storage.getEventsByOrganization(organizationId);
    
    // Use shared helper to get coach's event scope
    const { teamIds, divisionIds, targetUserId } = await getUserEventScope(
      userId,
      role,
      organizationId
    );
    
    // Filter events using shared helper
    const filteredEvents = filterEventsByScope(allEvents, role, teamIds, divisionIds, targetUserId, false);
    
    res.json(filteredEvents);
  });
  
  app.get('/api/events/team/:teamId', requireAuth, async (req: any, res) => {
    const events = await storage.getEventsByTeam(req.params.teamId);
    res.json(events);
  });
  
  app.get('/api/events/:eventId/participants', requireAuth, async (req: any, res) => {
    const { role, organizationId } = req.user;
    const { eventId } = req.params;
    
    // Only admins and coaches can view participant lists
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can view participant lists' });
    }
    
    // Get the event to check its assignTo/visibility configuration
    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get all users in the organization
    const allUsers = await storage.getUsersByOrganization(organizationId);
    
    // Filter users based on event visibility configuration
    const assignTo = event.assignTo || {};
    const visibility = event.visibility || {};
    
    // If event has no targeting, show all users
    if (!assignTo.users && !assignTo.teams && !assignTo.divisions && !assignTo.roles && 
        !visibility.users && !visibility.teams && !visibility.divisions && !visibility.roles) {
      return res.json(allUsers);
    }
    
    // Filter users who are invited to the event
    const invitedUsers = allUsers.filter(user => {
      // Check user-specific assignment
      if (assignTo.users?.includes(user.id)) {
        return true;
      }
      
      // Check team-based visibility
      if (user.teamId && (assignTo.teams?.includes(String(user.teamId)) || visibility.teams?.includes(String(user.teamId)))) {
        return true;
      }
      
      // Check division-based visibility
      if (user.divisionId && (assignTo.divisions?.includes(String(user.divisionId)) || visibility.divisions?.includes(String(user.divisionId)))) {
        return true;
      }
      
      // Check role-based visibility
      if (assignTo.roles?.includes(user.role) || visibility.roles?.includes(user.role)) {
        return true;
      }
      
      return false;
    });
    
    res.json(invitedUsers);
  });
  
  app.post('/api/events', requireAuth, async (req: any, res) => {
    try {
      const { role, id: userId } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can create events' });
      }
      
      console.log('📍 CREATE EVENT - Received body:', JSON.stringify({
        location: req.body.location,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        assignTo: req.body.assignTo,
        visibility: req.body.visibility
      }, null, 2));
      
      // Handle both legacy (targetType/targetId) and new (assignTo/visibility) formats
      const { targetType, targetId, ...restData } = req.body;
      let visibility: any = restData.visibility || {};
      let assignTo: any = restData.assignTo || {};
      
      // Legacy format transformation (for backward compatibility)
      if (targetType && !restData.assignTo) {
        if (targetType === 'all') {
          visibility = { roles: ['player', 'coach', 'parent', 'admin'] };
          assignTo = { roles: ['player', 'coach', 'parent', 'admin'] };
        } else if (targetType === 'team' && targetId) {
          visibility = { teams: [targetId] };
          assignTo = { teams: [targetId] };
        } else if (targetType === 'program' && targetId) {
          visibility = { programs: [targetId] };
          assignTo = { programs: [targetId] };
        } else if (targetType === 'role' && targetId) {
          visibility = { roles: [targetId] };
          assignTo = { roles: [targetId] };
        }
      }
      
      // Remove assignTo/visibility from restData to avoid duplication
      const { assignTo: _, visibility: __, ...cleanData } = restData;
      
      const eventData = insertEventSchema.parse({
        ...cleanData,
        visibility,
        assignTo,
        createdBy: userId,
      });
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error: any) {
      console.error('Error creating event:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Invalid event data', 
          errors: error.errors 
        });
      }
      return res.status(500).json({ 
        message: 'Failed to create event',
        error: error.message 
      });
    }
  });
  
  app.patch('/api/events/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can update events' });
      }
      
      console.log('📍 UPDATE EVENT - Received body:', JSON.stringify({
        location: req.body.location,
        latitude: req.body.latitude,
        longitude: req.body.longitude
      }, null, 2));
      
      const updated = await storage.updateEvent(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating event:', error);
      return res.status(500).json({ 
        message: 'Failed to update event',
        error: error.message 
      });
    }
  });
  
  app.delete('/api/events/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can delete events' });
    }
    
    await storage.deleteEvent(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // ATTENDANCE ROUTES
  // =============================================
  
  // Get all attendances for a specific event
  app.get('/api/attendances/:eventId', requireAuth, async (req: any, res) => {
    try {
      const attendances = await storage.getAttendancesByEvent(req.params.eventId);
      res.json(attendances);
    } catch (error: any) {
      console.error('Error fetching attendances:', error);
      res.status(500).json({ error: 'Failed to fetch attendances' });
    }
  });
  
  // Create a new attendance/check-in
  app.post('/api/attendances', requireAuth, async (req: any, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      
      // Get user role for location bypass check
      const userRole = req.user?.role;
      
      // Location validation (skip for admin/coach)
      if (userRole !== 'admin' && userRole !== 'coach') {
        // Get event to check location requirements
        const event = await storage.getEvent(attendanceData.eventId.toString());
        
        // Check for GPS coordinates using null/undefined checks (not falsy)
        if (event && event.latitude != null && event.longitude != null) {
          // Event has GPS coordinates, location check required
          if (attendanceData.latitude == null || attendanceData.longitude == null) {
            return res.status(400).json({
              error: 'Location required',
              message: 'You must provide your location to check in to this event.',
            });
          }
          
          // Calculate distance using server-side geo utility
          const { distanceMeters } = await import('./utils/geo.js');
          const distance = distanceMeters(
            { lat: attendanceData.latitude, lng: attendanceData.longitude },
            { lat: event.latitude, lng: event.longitude }
          );
          
          // Use event's configured radius or default to 200m (use ?? to allow 0)
          const radiusMeters = event.checkInRadius ?? 200;
          
          if (distance > radiusMeters) {
            return res.status(403).json({
              error: 'Too far away',
              message: `You must be within ${radiusMeters}m of the event location to check in. You are currently ${Math.round(distance)}m away.`,
              distance: Math.round(distance),
              required: radiusMeters,
            });
          }
        }
      }
      
      const attendance = await storage.createAttendance(attendanceData);
      
      // Credit deduction for pack holders
      try {
        if (attendanceData.userId) {
          // Get player's active enrollments with remaining credits
          const enrollments = await storage.getActiveEnrollmentsWithCredits(attendanceData.userId);
          
          // Find an enrollment with remaining credits (pack_holder type)
          const enrollmentWithCredits = enrollments.find((e: any) => 
            e.remainingCredits && e.remainingCredits > 0
          );
          
          if (enrollmentWithCredits) {
            // Deduct one credit
            await storage.deductEnrollmentCredit(enrollmentWithCredits.id);
            console.log(`💳 Deducted 1 credit from enrollment ${enrollmentWithCredits.id} for user ${attendanceData.userId}`);
          }
        }
      } catch (creditError: any) {
        // Log error but don't fail the attendance creation
        console.error('⚠️ Credit deduction failed (non-fatal):', creditError.message);
      }
      
      // Award engine integration - update tracking and evaluate awards
      try {
        // Get event details to determine event type
        const event = await storage.getEvent(attendanceData.eventId.toString());
        
        if (event && attendanceData.userId) {
          // Get current user to read existing values
          const user = await storage.getUser(attendanceData.userId);
          
          if (user) {
            // Prepare tracking updates based on event type
            const trackingUpdates: any = {
              consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
            };
            
            // Determine if it's a practice or game and update accordingly
            const eventType = event.eventType?.toLowerCase() || '';
            if (eventType.includes('practice') || eventType.includes('skills session')) {
              trackingUpdates.totalPractices = (user.totalPractices || 0) + 1;
            } else if (eventType.includes('game') || eventType.includes('tournament')) {
              trackingUpdates.totalGames = (user.totalGames || 0) + 1;
            }
            
            // Update user tracking fields
            await storage.updateUserAwardTracking(attendanceData.userId, trackingUpdates);
            
            // Evaluate and grant any newly earned awards
            await evaluateAwardsForUser(attendanceData.userId, storage);
            
            console.log(`✅ Awards evaluated for user ${attendanceData.userId} after check-in`);
          }
        }
      } catch (awardError: any) {
        // Log error but don't fail the attendance creation
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      res.json(attendance);
    } catch (error: any) {
      console.error("Attendance creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid attendance data", 
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: "Failed to create attendance record" 
      });
    }
  });
  
  // Legacy routes (kept for backward compatibility)
  app.get('/api/attendance/event/:eventId', requireAuth, async (req: any, res) => {
    const attendances = await storage.getAttendancesByEvent(req.params.eventId);
    res.json(attendances);
  });
  
  app.get('/api/attendance/user/:userId', requireAuth, async (req: any, res) => {
    const attendances = await storage.getAttendancesByUser(req.params.userId);
    res.json(attendances);
  });
  
  app.post('/api/attendance', requireAuth, async (req: any, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(attendanceData);
      
      // Award engine integration - update tracking and evaluate awards
      try {
        // Get event details to determine event type
        const event = await storage.getEvent(attendanceData.eventId.toString());
        
        if (event && attendanceData.userId) {
          // Get current user to read existing values
          const user = await storage.getUser(attendanceData.userId);
          
          if (user) {
            // Prepare tracking updates based on event type
            const trackingUpdates: any = {
              consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
            };
            
            // Determine if it's a practice or game and update accordingly
            const eventType = event.eventType?.toLowerCase() || '';
            if (eventType.includes('practice') || eventType.includes('skills session')) {
              trackingUpdates.totalPractices = (user.totalPractices || 0) + 1;
            } else if (eventType.includes('game') || eventType.includes('tournament')) {
              trackingUpdates.totalGames = (user.totalGames || 0) + 1;
            }
            
            // Update user tracking fields
            await storage.updateUserAwardTracking(attendanceData.userId, trackingUpdates);
            
            // Evaluate and grant any newly earned awards
            await evaluateAwardsForUser(attendanceData.userId, storage);
            
            console.log(`✅ Awards evaluated for user ${attendanceData.userId} after check-in`);
          }
        }
      } catch (awardError: any) {
        // Log error but don't fail the attendance creation
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      res.json(attendance);
    } catch (error: any) {
      console.error("Attendance creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid attendance data", 
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: "Failed to create attendance record" 
      });
    }
  });
  
  // =============================================
  // EVENT WINDOW ROUTES
  // =============================================
  
  app.get('/api/event-windows/event/:eventId', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const windows = await storage.getEventWindowsByEvent(eventId);
      res.json(windows);
    } catch (error: any) {
      console.error('Error fetching event windows:', error);
      res.status(500).json({ error: 'Failed to fetch event windows' });
    }
  });
  
  app.post('/api/event-windows', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can create event windows' });
    }
    
    try {
      const windowData = insertEventWindowSchema.parse(req.body);
      const window = await storage.createEventWindow(windowData);
      res.json(window);
    } catch (error: any) {
      console.error("Event window creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid event window data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create event window" });
    }
  });
  
  app.patch('/api/event-windows/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can update event windows' });
    }
    
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateEventWindow(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating event window:', error);
      res.status(500).json({ error: 'Failed to update event window' });
    }
  });
  
  app.delete('/api/event-windows/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can delete event windows' });
    }
    
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEventWindow(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting event window:', error);
      res.status(500).json({ error: 'Failed to delete event window' });
    }
  });

  app.delete('/api/event-windows/event/:eventId', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can delete event windows' });
    }
    
    try {
      const eventId = parseInt(req.params.eventId);
      await storage.deleteEventWindowsByEvent(eventId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting event windows:', error);
      res.status(500).json({ error: 'Failed to delete event windows' });
    }
  });
  
  // =============================================
  // RSVP RESPONSE ROUTES
  // =============================================
  
  app.get('/api/rsvp/event/:eventId', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const responses = await storage.getRsvpResponsesByEvent(eventId);
      res.json(responses);
    } catch (error: any) {
      console.error('Error fetching RSVP responses:', error);
      res.status(500).json({ error: 'Failed to fetch RSVP responses' });
    }
  });
  
  app.get('/api/rsvp/user/:userId/event/:eventId', requireAuth, async (req: any, res) => {
    try {
      const { userId, eventId } = req.params;
      const response = await storage.getRsvpResponseByUserAndEvent(userId, parseInt(eventId));
      res.json(response || null);
    } catch (error: any) {
      console.error('Error fetching RSVP response:', error);
      res.status(500).json({ error: 'Failed to fetch RSVP response' });
    }
  });
  
  app.post('/api/rsvp', requireAuth, async (req: any, res) => {
    try {
      const rsvpData = insertRsvpResponseSchema.parse(req.body);
      
      // Check if response already exists
      const existing = await storage.getRsvpResponseByUserAndEvent(rsvpData.userId, rsvpData.eventId);
      
      let result;
      if (existing) {
        // Update existing response
        result = await storage.updateRsvpResponse(existing.id, { response: rsvpData.response });
      } else {
        // Create new response
        result = await storage.createRsvpResponse(rsvpData);
      }
      
      // Award engine integration - evaluate awards for 'attending' RSVPs
      try {
        if (rsvpData.response === 'attending' && rsvpData.userId) {
          // Optionally increment consecutiveCheckins for positive RSVPs
          const user = await storage.getUser(rsvpData.userId);
          
          if (user) {
            await storage.updateUserAwardTracking(rsvpData.userId, {
              consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
            });
            
            // Evaluate and grant any newly earned awards
            await evaluateAwardsForUser(rsvpData.userId, storage);
            
            console.log(`✅ Awards evaluated for user ${rsvpData.userId} after RSVP`);
          }
        }
      } catch (awardError: any) {
        // Log error but don't fail the RSVP operation
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("RSVP creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid RSVP data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create/update RSVP response" });
    }
  });
  
  app.patch('/api/rsvp/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateRsvpResponse(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating RSVP response:', error);
      res.status(500).json({ error: 'Failed to update RSVP response' });
    }
  });
  
  app.delete('/api/rsvp/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRsvpResponse(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting RSVP response:', error);
      res.status(500).json({ error: 'Failed to delete RSVP response' });
    }
  });
  
  // =============================================
  // AWARD ROUTES
  // =============================================
  
  app.get('/api/awards', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const awards = await storage.getAwardsByOrganization(organizationId);
    res.json(awards);
  });
  
  app.post('/api/awards', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create awards' });
    }
    
    const awardData = insertAwardSchema.parse(req.body);
    const award = await storage.createAward(awardData);
    res.json(award);
  });
  
  app.patch('/api/awards/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update awards' });
    }
    
    const updated = await storage.updateAward(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/awards/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete awards' });
    }
    
    await storage.deleteAward(req.params.id);
    res.json({ success: true });
  });
  
  // User Awards (legacy endpoint - kept for backwards compatibility)
  // Alias endpoint for frontend compatibility: /api/users/:userId/awards
  app.get('/api/users/:userId/awards', requireAuth, async (req: any, res) => {
    // Disable HTTP caching to ensure React Query refetches get fresh data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const { userId } = req.params;
      const { id: currentUserId, role, organizationId } = req.user;
      
      // Authorization: users can view their own awards, admins/coaches can view any user's awards
      if (userId !== currentUserId && role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Not authorized to view these awards' });
      }
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Not authorized to view awards from other organizations' });
      }
      
      const userAwardRecords = await storage.getUserAwardRecords(userId);
      
      // Fetch award definitions to get tier information
      const allAwardDefinitions = await storage.getAwardDefinitions(organizationId);
      const awardDefMap = new Map(allAwardDefinitions.map(ad => [ad.id, ad]));
      
      // Enrich user awards with award definition data
      const enrichedAwards = userAwardRecords.map((ua: any) => {
        const def = awardDefMap.get(ua.awardId);
        return {
          ...ua,
          tier: def?.tier,
          name: def?.name,
          description: def?.description,
          imageUrl: def?.imageUrl,
          prestige: def?.prestige,
        };
      });
      
      // Return summary with counts for frontend display
      const badges = enrichedAwards.filter((a: any) => a.tier === 'Badge');
      const trophies = enrichedAwards.filter((a: any) => a.tier === 'Trophy');
      
      res.json({
        totalBadges: badges.length,
        totalTrophies: trophies.length,
        badges,
        trophies,
        allAwards: enrichedAwards,
      });
    } catch (error: any) {
      console.error('Error fetching user awards:', error);
      res.status(500).json({ error: 'Failed to fetch user awards', message: error.message });
    }
  });

  // Badges endpoint
  app.get('/api/users/:userId/badges', requireAuth, async (req: any, res) => {
    // Disable HTTP caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const { userId } = req.params;
      const { id: currentUserId, role, organizationId } = req.user;
      
      if (userId !== currentUserId && role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.organizationId !== organizationId) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userAwardRecords = await storage.getUserAwardRecords(userId);
      
      // Fetch award definitions to get tier information
      const allAwardDefinitions = await storage.getAwardDefinitions(organizationId);
      const awardDefMap = new Map(allAwardDefinitions.map(ad => [ad.id, ad]));
      
      // Enrich and filter badges
      const badges = userAwardRecords
        .map((ua: any) => {
          const def = awardDefMap.get(ua.awardId);
          return {
            ...ua,
            tier: def?.tier,
            name: def?.name,
            description: def?.description,
            imageUrl: def?.imageUrl,
            prestige: def?.prestige,
          };
        })
        .filter((a: any) => a.tier === 'Badge');
      
      res.json(badges);
    } catch (error: any) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges', message: error.message });
    }
  });

  // Trophies endpoint
  app.get('/api/users/:userId/trophies', requireAuth, async (req: any, res) => {
    // Disable HTTP caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const { userId } = req.params;
      const { id: currentUserId, role, organizationId } = req.user;
      
      if (userId !== currentUserId && role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.organizationId !== organizationId) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userAwardRecords = await storage.getUserAwardRecords(userId);
      
      // Fetch award definitions to get tier information
      const allAwardDefinitions = await storage.getAwardDefinitions(organizationId);
      const awardDefMap = new Map(allAwardDefinitions.map(ad => [ad.id, ad]));
      
      // Enrich and filter trophies
      const trophies = userAwardRecords
        .map((ua: any) => {
          const def = awardDefMap.get(ua.awardId);
          return {
            ...ua,
            tier: def?.tier,
            name: def?.name,
            description: def?.description,
            imageUrl: def?.imageUrl,
            prestige: def?.prestige,
          };
        })
        .filter((a: any) => a.tier === 'Trophy');
      
      res.json(trophies);
    } catch (error: any) {
      console.error('Error fetching trophies:', error);
      res.status(500).json({ error: 'Failed to fetch trophies', message: error.message });
    }
  });

  app.get('/api/user-awards/:userId', requireAuth, async (req: any, res) => {
    const userAwards = await storage.getUserAwards(req.params.userId);
    res.json(userAwards);
  });
  
  // =============================================
  // ANNOUNCEMENT ROUTES
  // =============================================
  
  app.get('/api/announcements', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const announcements = await storage.getAnnouncementsByOrganization(organizationId);
    res.json(announcements);
  });
  
  app.get('/api/announcements/team/:teamId', requireAuth, async (req: any, res) => {
    const announcements = await storage.getAnnouncementsByTeam(req.params.teamId);
    res.json(announcements);
  });
  
  app.post('/api/announcements', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can create announcements' });
    }
    
    const announcementData = insertAnnouncementSchema.parse(req.body);
    const announcement = await storage.createAnnouncement(announcementData);
    res.json(announcement);
  });
  
  app.patch('/api/announcements/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can update announcements' });
    }
    
    const updated = await storage.updateAnnouncement(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/announcements/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can delete announcements' });
    }
    
    await storage.deleteAnnouncement(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // MESSAGE ROUTES (Team Chat)
  // =============================================
  
  // Legacy route (kept for backwards compatibility)
  app.get('/api/messages/team/:teamId', requireAuth, async (req: any, res) => {
    const messages = await storage.getMessagesByTeam(req.params.teamId);
    res.json(messages);
  });
  
  // Team-scoped message routes (used by TeamChat component)
  app.get('/api/teams/:teamId/messages', requireAuth, async (req: any, res) => {
    const messages = await storage.getMessagesByTeam(req.params.teamId);
    res.json(messages);
  });
  
  app.post('/api/teams/:teamId/messages', requireAuth, async (req: any, res) => {
    const { message, messageType = 'text', profileId } = req.body;
    
    // Security: Validate that profileId belongs to authenticated user or is the user themselves
    let validatedSenderId = req.user.id;
    if (profileId) {
      // Check if profileId is the authenticated user
      if (profileId === req.user.id) {
        validatedSenderId = profileId;
      } else {
        // Check if profileId is a child profile of the authenticated user
        const accountProfiles = await storage.getAccountProfiles(req.user.id) || [];
        const isValidProfile = accountProfiles.some((profile: any) => profile.id === profileId);
        if (isValidProfile) {
          validatedSenderId = profileId;
        }
        // If not valid, fall back to req.user.id (don't allow spoofing)
      }
    }
    
    const messageData = {
      teamId: parseInt(req.params.teamId),
      senderId: validatedSenderId,
      content: message, // Database field is 'content'
      messageType,
    };
    
    const newMessage = await storage.createMessage(messageData);
    
    // Broadcast to WebSocket clients if available
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: 'new_team_message', 
            teamId: parseInt(req.params.teamId),
            message: newMessage 
          }));
        }
      });
    }
    
    res.json(newMessage);
  });
  
  // Legacy route (kept for backwards compatibility)
  app.post('/api/messages', requireAuth, async (req: any, res) => {
    const messageData = insertMessageSchema.parse(req.body);
    const message = await storage.createMessage(messageData);
    
    // Broadcast to WebSocket clients if available
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'new_message', data: message }));
        }
      });
    }
    
    res.json(message);
  });
  
  // =============================================
  // PAYMENT ROUTES
  // =============================================
  
  // Stripe Products endpoint
  app.get('/api/stripe/products', requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    try {
      // Fetch all products with their default prices expanded
      const products = await stripe.products.list({
        active: true,
        expand: ['data.default_price'],
        limit: 100,
      });
      
      // Fetch all prices to get additional pricing info
      const prices = await stripe.prices.list({
        active: true,
        limit: 100,
      });
      
      // Group prices by product
      const pricesByProduct: any = {};
      prices.data.forEach(price => {
        const productId = typeof price.product === 'string' ? price.product : price.product?.id;
        if (productId) {
          if (!pricesByProduct[productId]) {
            pricesByProduct[productId] = [];
          }
          pricesByProduct[productId].push(price);
        }
      });
      
      // Map products to include all prices
      const productsWithPrices = products.data.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        metadata: product.metadata,
        active: product.active,
        defaultPrice: product.default_price,
        prices: pricesByProduct[product.id] || [],
      }));
      
      res.json(productsWithPrices);
    } catch (error: any) {
      console.error("Error fetching Stripe products:", error);
      res.status(500).json({
        error: "Error fetching products",
        message: error.message,
      });
    }
  });

  app.get('/api/payments', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const payments = await storage.getPaymentsByOrganization(organizationId);
    res.json(payments);
  });
  
  app.get('/api/payments/user/:userId', requireAuth, async (req: any, res) => {
    const payments = await storage.getPaymentsByUser(req.params.userId);
    res.json(payments);
  });
  
  // Get payment history with Stripe subscription details
  app.get('/api/payments/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get all child player IDs if user is a parent
      const allUsers = await storage.getUsersByOrganization(req.user.organizationId);
      const childPlayerIds = allUsers
        .filter(u => u.parentId === userId || u.guardianId === userId)
        .map(u => u.id);
      
      // Get payments for the user and all their children
      const userIds = [userId, ...childPlayerIds];
      const allPayments = await Promise.all(
        userIds.map(id => storage.getPaymentsByUser(id))
      );
      const payments = allPayments.flat();
      
      // Enrich with Stripe data
      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          let stripeData: any = null;
          
          if (payment.stripePaymentId && stripe) {
            try {
              // Check if it's a subscription or payment intent
              if (payment.stripePaymentId.startsWith('sub_')) {
                // It's a subscription
                const subscription = await stripe.subscriptions.retrieve(payment.stripePaymentId);
                stripeData = {
                  type: 'subscription',
                  status: subscription.status,
                  currentPeriodEnd: subscription.current_period_end,
                  currentPeriodStart: subscription.current_period_start,
                  cancelAtPeriodEnd: subscription.cancel_at_period_end,
                  interval: subscription.items.data[0]?.price?.recurring?.interval,
                };
              } else if (payment.stripePaymentId.startsWith('pi_')) {
                // It's a payment intent
                const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
                stripeData = {
                  type: 'one_time',
                  status: paymentIntent.status,
                };
              } else if (payment.stripePaymentId.startsWith('cs_')) {
                // It's a checkout session
                const session = await stripe.checkout.sessions.retrieve(payment.stripePaymentId);
                stripeData = {
                  type: session.mode === 'subscription' ? 'subscription' : 'one_time',
                  status: session.payment_status,
                };
                
                // If it's a subscription, try to get the subscription ID
                if (session.subscription && typeof session.subscription === 'string') {
                  const subscription = await stripe.subscriptions.retrieve(session.subscription);
                  stripeData.subscriptionDetails = {
                    id: subscription.id,
                    status: subscription.status,
                    currentPeriodEnd: subscription.current_period_end,
                    currentPeriodStart: subscription.current_period_start,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    interval: subscription.items.data[0]?.price?.recurring?.interval,
                  };
                }
              }
            } catch (error: any) {
              console.error(`Error fetching Stripe data for ${payment.stripePaymentId}:`, error.message);
            }
          }
          
          // Get player info if applicable
          let playerInfo = null;
          if (payment.playerId) {
            const player = await storage.getUser(payment.playerId);
            if (player) {
              playerInfo = {
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
              };
            }
          }
          
          return {
            ...payment,
            stripeData,
            playerInfo,
          };
        })
      );
      
      // Sort by creation date (newest first)
      enrichedPayments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json(enrichedPayments);
    } catch (error: any) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });
  
  app.post('/api/payments', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create payments' });
    }
    
    const paymentData = insertPaymentSchema.parse(req.body);
    
    // Validate playerId if provided
    if (paymentData.playerId) {
      const player = await storage.getUser(paymentData.playerId);
      
      // Ensure player exists
      if (!player) {
        return res.status(400).json({ 
          message: 'Invalid playerId: player does not exist' 
        });
      }
      
      // For non-admin users, ensure playerId belongs to them or their children
      if (role !== 'admin') {
        const payingUser = await storage.getUser(paymentData.userId);
        if (!payingUser) {
          return res.status(400).json({ 
            message: 'Invalid userId: user does not exist' 
          });
        }
        
        // Check if playerId is the paying user or a child of the paying user
        // Check both parentId and guardianId to handle all parent-child relationships
        const isValidPlayer = paymentData.playerId === paymentData.userId || 
                             (player as any).parentId === paymentData.userId ||
                             (player as any).guardianId === paymentData.userId;
        
        if (!isValidPlayer) {
          return res.status(400).json({ 
            message: 'Invalid playerId: player must be the paying user or their child' 
          });
        }
      }
    }
    
    const payment = await storage.createPayment(paymentData);
    res.json(payment);
  });
  
  app.patch('/api/payments/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update payments' });
    }
    
    const updated = await storage.updatePayment(req.params.id, req.body);
    res.json(updated);
  });
  
  // =============================================
  // WAIVER ROUTES
  // =============================================
  
  app.get('/api/waivers', async (req: any, res) => {
    const organizationId = req.user?.organizationId || 'default-org';
    const waivers = await storage.getWaiversByOrganization(organizationId);
    res.json(waivers);
  });
  
  app.get('/api/waivers/:id', async (req: any, res) => {
    const waiver = await storage.getWaiver(req.params.id);
    if (!waiver) {
      return res.status(404).json({ message: 'Waiver not found' });
    }
    res.json(waiver);
  });
  
  app.post('/api/waivers', requireAuth, async (req: any, res) => {
    const { role, organizationId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create waivers' });
    }
    
    const waiverData = {
      ...req.body,
      organizationId,
    };
    const waiver = await storage.createWaiver(waiverData);
    res.json(waiver);
  });
  
  app.patch('/api/waivers/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update waivers' });
    }
    
    const updated = await storage.updateWaiver(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/waivers/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete waivers' });
    }
    
    await storage.deleteWaiver(req.params.id);
    res.json({ success: true });
  });

  // =============================================
  // WAIVER VERSION ROUTES
  // =============================================

  // Get all versions for a waiver
  app.get('/api/waivers/:waiverId/versions', requireAuth, async (req: any, res) => {
    const versions = await db.select()
      .from(waiverVersions)
      .where(eq(waiverVersions.waiverId, req.params.waiverId))
      .orderBy(desc(waiverVersions.version));
    res.json(versions);
  });

  // Get active version of a waiver
  app.get('/api/waivers/:waiverId/active-version', async (req: any, res) => {
    const [version] = await db.select()
      .from(waiverVersions)
      .where(
        and(
          eq(waiverVersions.waiverId, req.params.waiverId),
          eq(waiverVersions.isActive, true)
        )
      )
      .limit(1);
    
    if (!version) {
      return res.status(404).json({ message: 'No active version found' });
    }
    res.json(version);
  });

  // Create a new version (draft)
  app.post('/api/waivers/:waiverId/versions', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create waiver versions' });
    }

    // Get the latest version number
    const [latestVersion] = await db.select({ maxVersion: sql<number>`MAX(version)` })
      .from(waiverVersions)
      .where(eq(waiverVersions.waiverId, req.params.waiverId));

    const newVersion = (latestVersion?.maxVersion || 0) + 1;

    const [version] = await db.insert(waiverVersions)
      .values({
        waiverId: req.params.waiverId,
        version: newVersion,
        title: req.body.title,
        content: req.body.content,
        requiresScroll: req.body.requiresScroll ?? true,
        requiresCheckbox: req.body.requiresCheckbox ?? true,
        checkboxLabel: req.body.checkboxLabel,
        isActive: false, // Draft by default
      })
      .returning();

    res.json(version);
  });

  // Publish a version (makes it active, deactivates others, supersedes old signatures)
  app.post('/api/waivers/:waiverId/versions/:versionId/publish', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can publish waiver versions' });
    }

    const versionId = parseInt(req.params.versionId);
    const waiverId = req.params.waiverId;

    // Get all version IDs for this waiver (to mark their signatures as superseded)
    const allVersions = await db.select({ id: waiverVersions.id })
      .from(waiverVersions)
      .where(eq(waiverVersions.waiverId, waiverId));
    
    const allVersionIds = allVersions.map(v => v.id);

    // Mark all existing signatures for this waiver as superseded
    // (users will need to re-sign the new version)
    if (allVersionIds.length > 0) {
      await db.update(waiverSignatures)
        .set({ status: 'superseded' })
        .where(
          and(
            inArray(waiverSignatures.waiverVersionId, allVersionIds),
            eq(waiverSignatures.status, 'valid')
          )
        );
    }

    // Deactivate all versions of this waiver
    await db.update(waiverVersions)
      .set({ isActive: false })
      .where(eq(waiverVersions.waiverId, waiverId));

    // Activate this version
    const [publishedVersion] = await db.update(waiverVersions)
      .set({ 
        isActive: true, 
        publishedAt: new Date().toISOString(),
        publishedBy: userId,
      })
      .where(eq(waiverVersions.id, versionId))
      .returning();

    res.json(publishedVersion);
  });

  // =============================================
  // WAIVER SIGNATURE ROUTES
  // =============================================

  // Get signatures for a profile
  app.get('/api/profiles/:profileId/waiver-signatures', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const profileId = req.params.profileId;

    // Users can view their own or their children's signatures
    // Admins can view anyone's
    if (role !== 'admin') {
      const profile = await storage.getUser(profileId);
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      const isOwnProfile = profile.id === userId;
      const isChildProfile = profile.accountHolderId === userId || profile.parentId === userId;
      if (!isOwnProfile && !isChildProfile) {
        return res.status(403).json({ message: 'Not authorized to view these signatures' });
      }
    }

    const signatures = await db.select({
      signature: waiverSignatures,
      version: waiverVersions,
      waiver: waivers,
    })
      .from(waiverSignatures)
      .innerJoin(waiverVersions, eq(waiverSignatures.waiverVersionId, waiverVersions.id))
      .innerJoin(waivers, eq(waiverVersions.waiverId, waivers.id))
      .where(
        and(
          eq(waiverSignatures.profileId, profileId),
          eq(waiverSignatures.status, 'valid')
        )
      );

    res.json(signatures);
  });

  // Sign a waiver (create signature)
  app.post('/api/waiver-signatures', requireAuth, async (req: any, res) => {
    const { id: userId } = req.user;
    const { waiverVersionId, profileId, metadata } = req.body;

    // Verify user can sign for this profile
    const profile = await storage.getUser(profileId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const isOwnProfile = profile.id === userId;
    const isChildProfile = profile.accountHolderId === userId || profile.parentId === userId;
    if (!isOwnProfile && !isChildProfile) {
      return res.status(403).json({ message: 'Not authorized to sign for this profile' });
    }

    // Mark any existing signatures for the same waiver as superseded
    const [version] = await db.select()
      .from(waiverVersions)
      .where(eq(waiverVersions.id, waiverVersionId));

    if (version) {
      // Get all version IDs for this waiver
      const allVersions = await db.select({ id: waiverVersions.id })
        .from(waiverVersions)
        .where(eq(waiverVersions.waiverId, version.waiverId));
      
      const allVersionIds = allVersions.map(v => v.id);

      // Mark old signatures as superseded
      if (allVersionIds.length > 0) {
        await db.update(waiverSignatures)
          .set({ status: 'superseded' })
          .where(
            and(
              eq(waiverSignatures.profileId, profileId),
              inArray(waiverSignatures.waiverVersionId, allVersionIds),
              eq(waiverSignatures.status, 'valid')
            )
          );
      }
    }

    // Create new signature
    const [signature] = await db.insert(waiverSignatures)
      .values({
        waiverVersionId,
        profileId,
        signedBy: userId,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: metadata || {},
        status: 'valid',
      })
      .returning();

    res.json(signature);
  });

  // Check if profile has signed required waivers
  app.get('/api/profiles/:profileId/waiver-status', requireAuth, async (req: any, res) => {
    const profileId = req.params.profileId;
    const organizationId = req.user?.organizationId || 'default-org';

    // Get all active waiver versions for the organization
    const activeWaivers = await db.select({
      waiver: waivers,
      version: waiverVersions,
    })
      .from(waivers)
      .innerJoin(waiverVersions, eq(waivers.id, waiverVersions.waiverId))
      .where(
        and(
          eq(waivers.organizationId, organizationId),
          eq(waivers.isActive, true),
          eq(waiverVersions.isActive, true)
        )
      );

    // Get profile's valid signatures
    const signatures = await db.select()
      .from(waiverSignatures)
      .where(
        and(
          eq(waiverSignatures.profileId, profileId),
          eq(waiverSignatures.status, 'valid')
        )
      );

    const signedVersionIds = new Set(signatures.map(s => s.waiverVersionId));

    const waiverStatus = activeWaivers.map(({ waiver, version }) => ({
      waiverId: waiver.id,
      waiverName: waiver.name,
      versionId: version.id,
      versionNumber: version.version,
      isSigned: signedVersionIds.has(version.id),
      isRequired: waiver.isBuiltIn, // Built-in waivers are required
    }));

    const allRequiredSigned = waiverStatus
      .filter(w => w.isRequired)
      .every(w => w.isSigned);

    res.json({
      waivers: waiverStatus,
      allRequiredSigned,
    });
  });

  // =============================================
  // PROGRAM ROUTES
  // =============================================
  
  app.get('/api/programs', async (req: any, res) => {
    // Allow unauthenticated access during registration
    const organizationId = req.user?.organizationId || 'default-org';
    const programs = await storage.getProgramsByOrganization(organizationId);
    res.json(programs);
  });
  
  app.post('/api/programs', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create programs' });
    }
    
    const programData = insertProgramSchema.parse(req.body);
    const program = await storage.createProgram(programData);
    res.json(program);
  });
  
  app.patch('/api/programs/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update programs' });
    }
    
    const updated = await storage.updateProgram(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/programs/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete programs' });
    }
    
    await storage.deleteProgram(req.params.id);
    res.json({ success: true });
  });

  // =============================================
  // PRODUCT ENROLLMENT ROUTES
  // =============================================

  // Get all enrollments for a profile
  app.get('/api/profiles/:profileId/enrollments', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const profileId = req.params.profileId;

    // Users can view their own or their children's enrollments
    if (role !== 'admin') {
      const profile = await storage.getUser(profileId);
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      const isOwnProfile = profile.id === userId;
      const isChildProfile = profile.accountHolderId === userId || profile.parentId === userId;
      if (!isOwnProfile && !isChildProfile) {
        return res.status(403).json({ message: 'Not authorized to view these enrollments' });
      }
    }

    const enrollments = await db.select({
      enrollment: productEnrollments,
      product: products,
    })
      .from(productEnrollments)
      .leftJoin(products, eq(productEnrollments.programId, products.id))
      .where(eq(productEnrollments.profileId, profileId));

    res.json(enrollments);
  });

  // Get all enrollments for an account holder (parent)
  app.get('/api/accounts/:accountHolderId/enrollments', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const accountHolderId = req.params.accountHolderId;

    // Users can only view their own account enrollments
    if (role !== 'admin' && accountHolderId !== userId) {
      return res.status(403).json({ message: 'Not authorized to view these enrollments' });
    }

    const enrollments = await db.select({
      enrollment: productEnrollments,
      product: products,
    })
      .from(productEnrollments)
      .leftJoin(products, eq(productEnrollments.programId, products.id))
      .where(eq(productEnrollments.accountHolderId, accountHolderId));

    res.json(enrollments);
  });

  // Create an enrollment (admin only for now)
  app.post('/api/enrollments', requireAuth, async (req: any, res) => {
    const { role, organizationId, id: userId } = req.user;
    
    const {
      programId,
      accountHolderId,
      profileId,
      status = 'active',
      source = 'direct',
      paymentId,
      stripeSubscriptionId,
      startDate,
      endDate,
      autoRenew = true,
      metadata = {},
    } = req.body;

    // Non-admins can only create enrollments for themselves
    if (role !== 'admin' && accountHolderId !== userId) {
      return res.status(403).json({ message: 'Not authorized to create enrollment for another user' });
    }

    const [enrollment] = await db.insert(productEnrollments)
      .values({
        organizationId: organizationId || 'default-org',
        programId,
        accountHolderId: accountHolderId || userId,
        profileId,
        status,
        source,
        paymentId,
        stripeSubscriptionId,
        startDate: startDate || new Date().toISOString(),
        endDate,
        autoRenew,
        metadata,
      })
      .returning();

    res.json(enrollment);
  });

  // Update an enrollment
  app.patch('/api/enrollments/:id', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const enrollmentId = parseInt(req.params.id);

    // Get the enrollment first
    const [existingEnrollment] = await db.select()
      .from(productEnrollments)
      .where(eq(productEnrollments.id, enrollmentId));

    if (!existingEnrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Non-admins can only update their own enrollments
    if (role !== 'admin' && existingEnrollment.accountHolderId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this enrollment' });
    }

    const updateData: any = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.profileId !== undefined) updateData.profileId = req.body.profileId;
    if (req.body.autoRenew !== undefined) updateData.autoRenew = req.body.autoRenew;
    if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate;
    if (req.body.metadata !== undefined) updateData.metadata = req.body.metadata;
    updateData.updatedAt = new Date().toISOString();

    const [updated] = await db.update(productEnrollments)
      .set(updateData)
      .where(eq(productEnrollments.id, enrollmentId))
      .returning();

    res.json(updated);
  });

  // Cancel an enrollment
  app.post('/api/enrollments/:id/cancel', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const enrollmentId = parseInt(req.params.id);

    const [existingEnrollment] = await db.select()
      .from(productEnrollments)
      .where(eq(productEnrollments.id, enrollmentId));

    if (!existingEnrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (role !== 'admin' && existingEnrollment.accountHolderId !== userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this enrollment' });
    }

    const [cancelled] = await db.update(productEnrollments)
      .set({ 
        status: 'cancelled',
        autoRenew: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(productEnrollments.id, enrollmentId))
      .returning();

    res.json(cancelled);
  });
  
  // =============================================
  // DIVISION ROUTES
  // =============================================
  
  app.get('/api/divisions', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const divisions = await storage.getDivisionsByOrganization(organizationId);
      res.json(divisions);
    } catch (error: any) {
      console.error('Error fetching divisions:', error);
      res.status(500).json({ error: 'Failed to fetch divisions', message: error.message });
    }
  });
  
  app.get('/api/divisions/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid division ID' });
      }
      
      const division = await storage.getDivision(id);
      if (!division) {
        return res.status(404).json({ error: 'Division not found' });
      }
      
      res.json(division);
    } catch (error: any) {
      console.error('Error fetching division:', error);
      res.status(500).json({ error: 'Failed to fetch division', message: error.message });
    }
  });
  
  app.post('/api/divisions', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can create divisions' });
      }
      
      const divisionData = insertDivisionSchema.parse(req.body);
      const division = await storage.createDivision(divisionData);
      res.status(201).json(division);
    } catch (error: any) {
      console.error('Error creating division:', error);
      res.status(400).json({ error: 'Failed to create division', message: error.message });
    }
  });
  
  app.patch('/api/divisions/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can update divisions' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid division ID' });
      }
      
      const updated = await storage.updateDivision(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Division not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating division:', error);
      res.status(400).json({ error: 'Failed to update division', message: error.message });
    }
  });
  
  app.delete('/api/divisions/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can delete divisions' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid division ID' });
      }
      
      await storage.deleteDivision(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting division:', error);
      res.status(500).json({ error: 'Failed to delete division', message: error.message });
    }
  });
  
  // =============================================
  // SKILL ROUTES
  // =============================================
  
  app.get('/api/skills', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const { playerId } = req.query;
      
      let skills;
      if (playerId) {
        skills = await storage.getSkillsByPlayer(playerId as string);
      } else {
        skills = await storage.getSkillsByOrganization(organizationId);
      }
      
      res.json(skills);
    } catch (error: any) {
      console.error('Error fetching skills:', error);
      res.status(500).json({ error: 'Failed to fetch skills', message: error.message });
    }
  });
  
  app.get('/api/skills/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid skill ID' });
      }
      
      const skill = await storage.getSkill(id);
      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }
      
      res.json(skill);
    } catch (error: any) {
      console.error('Error fetching skill:', error);
      res.status(500).json({ error: 'Failed to fetch skill', message: error.message });
    }
  });
  
  app.post('/api/skills', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can create skills' });
      }
      
      const skillData = insertSkillSchema.parse(req.body);
      const skill = await storage.createSkill(skillData);
      res.status(201).json(skill);
    } catch (error: any) {
      console.error('Error creating skill:', error);
      res.status(400).json({ error: 'Failed to create skill', message: error.message });
    }
  });
  
  app.patch('/api/skills/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can update skills' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid skill ID' });
      }
      
      const updated = await storage.updateSkill(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Skill not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating skill:', error);
      res.status(400).json({ error: 'Failed to update skill', message: error.message });
    }
  });
  
  app.delete('/api/skills/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can delete skills' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid skill ID' });
      }
      
      await storage.deleteSkill(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting skill:', error);
      res.status(500).json({ error: 'Failed to delete skill', message: error.message });
    }
  });
  
  // =============================================
  // EVALUATION ROUTES (Coach Dashboard)
  // =============================================
  
  app.get('/api/coach/evaluations', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const { playerId, quarter, year } = req.query;
      
      // If specific player/quarter/year requested, return that evaluation
      if (playerId && quarter && year) {
        const evaluation = await storage.getEvaluationByPlayerQuarter(playerId as string, quarter as string, parseInt(year as string));
        return res.json(evaluation || null);
      }
      
      // If only playerId, return all evaluations for that player
      if (playerId) {
        const evaluations = await storage.getEvaluationsByPlayer(playerId as string);
        return res.json(evaluations);
      }
      
      // Otherwise return all evaluations for the organization
      const evaluations = await storage.getEvaluationsByOrganization(organizationId);
      res.json(evaluations);
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
      res.status(500).json({ error: 'Failed to fetch evaluations', message: error.message });
    }
  });
  
  app.post('/api/coach/evaluations', requireAuth, async (req: any, res) => {
    try {
      const { role, id: coachId, organizationId } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can create evaluations' });
      }
      
      const evaluationData = {
        ...req.body,
        organizationId,
        coachId,
      };
      
      const evaluation = await storage.createEvaluation(evaluationData);
      res.status(201).json(evaluation);
    } catch (error: any) {
      console.error('Error creating evaluation:', error);
      res.status(400).json({ error: 'Failed to create evaluation', message: error.message });
    }
  });
  
  app.get('/api/evaluations', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const { playerId } = req.query;
      
      if (playerId) {
        const evaluations = await storage.getEvaluationsByPlayer(playerId as string);
        return res.json(evaluations);
      }
      
      const evaluations = await storage.getEvaluationsByOrganization(organizationId);
      res.json(evaluations);
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
      res.status(500).json({ error: 'Failed to fetch evaluations', message: error.message });
    }
  });
  
  app.delete('/api/evaluations/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can delete evaluations' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid evaluation ID' });
      }
      
      await storage.deleteEvaluation(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting evaluation:', error);
      res.status(500).json({ error: 'Failed to delete evaluation', message: error.message });
    }
  });
  
  // =============================================
  // NOTIFICATION ROUTES
  // =============================================
  
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const { id: userId, organizationId } = req.user;
      const allNotifications = await storage.getNotificationsByOrganization(organizationId);
      
      // Filter notifications where current user is a recipient
      const userNotifications = allNotifications.filter(notification => 
        notification.recipientIds && notification.recipientIds.includes(userId)
      );
      
      res.json(userNotifications);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications', message: error.message });
    }
  });
  
  app.get('/api/notifications/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      res.json(notification);
    } catch (error: any) {
      console.error('Error fetching notification:', error);
      res.status(500).json({ error: 'Failed to fetch notification', message: error.message });
    }
  });
  
  app.post('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can create notifications' });
      }
      
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error: any) {
      console.error('Error creating notification:', error);
      res.status(400).json({ error: 'Failed to create notification', message: error.message });
    }
  });
  
  app.patch('/api/notifications/:id', requireAuth, async (req: any, res) => {
    try {
      const { role, id: userId } = req.user;
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      
      // Get the notification to check ownership
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Only admin can update any notification
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can update notifications' });
      }
      
      const updated = await storage.updateNotification(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating notification:', error);
      res.status(400).json({ error: 'Failed to update notification', message: error.message });
    }
  });
  
  app.delete('/api/notifications/:id', requireAuth, async (req: any, res) => {
    try {
      const { role, id: userId } = req.user;
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      
      // Get the notification to check ownership
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Admin or user who created the notification can delete it
      const isSender = notification.sentBy === userId;
      if (role !== 'admin' && !isSender) {
        return res.status(403).json({ message: 'You can only delete notifications you created or be an admin' });
      }
      
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification', message: error.message });
    }
  });
  
  app.patch('/api/notifications/:id/read', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      
      // Get the notification to check if user is a recipient
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Only recipients can mark as read
      const isRecipient = notification.recipientIds && notification.recipientIds.includes(userId);
      if (!isRecipient) {
        return res.status(403).json({ message: 'You can only mark your own notifications as read' });
      }
      
      const updated = await storage.markNotificationAsRead(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res.status(400).json({ error: 'Failed to mark notification as read', message: error.message });
    }
  });
  
  // =============================================
  // PACKAGE SELECTION ROUTES (Family Registration)
  // =============================================
  
  app.get('/api/family/package-selections', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;
      const selections = await storage.getPackageSelectionsByParent(userId);
      res.json(selections);
    } catch (error: any) {
      console.error("Error fetching package selections:", error);
      res.status(500).json({ error: "Failed to fetch package selections" });
    }
  });
  
  app.post('/api/family/package-selections', requireAuth, async (req: any, res) => {
    try {
      const { id: parentUserId, organizationId } = req.user;
      const { selections } = req.body;
      
      if (!Array.isArray(selections) || selections.length === 0) {
        return res.status(400).json({ error: "selections must be a non-empty array" });
      }
      
      // Validate and create each selection
      const createdSelections = [];
      for (const selection of selections) {
        const selectionData = insertPackageSelectionSchema.parse({
          organizationId,
          parentUserId,
          childUserId: selection.childUserId,
          programId: selection.programId,
          isPaid: false,
        });
        
        const created = await storage.createPackageSelection(selectionData);
        createdSelections.push(created);
      }
      
      res.json(createdSelections);
    } catch (error: any) {
      console.error("Error creating package selections:", error);
      res.status(500).json({ error: "Failed to create package selections", details: error.message });
    }
  });
  
  // =============================================
  // FACILITY ROUTES
  // =============================================
  
  app.get('/api/facilities', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const facilities = await storage.getFacilitiesByOrganization(organizationId);
      res.json(facilities);
    } catch (error: any) {
      console.error('Error fetching facilities:', error);
      res.status(500).json({ error: 'Failed to fetch facilities', message: error.message });
    }
  });
  
  app.get('/api/facilities/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid facility ID' });
      }
      
      const facility = await storage.getFacility(id);
      if (!facility) {
        return res.status(404).json({ error: 'Facility not found' });
      }
      
      res.json(facility);
    } catch (error: any) {
      console.error('Error fetching facility:', error);
      res.status(500).json({ error: 'Failed to fetch facility', message: error.message });
    }
  });
  
  app.post('/api/facilities', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId, id } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create facilities' });
      }
      
      const facilityData = insertFacilitySchema.parse({
        ...req.body,
        organizationId,
        createdBy: id,
      });
      const facility = await storage.createFacility(facilityData);
      res.status(201).json(facility);
    } catch (error: any) {
      console.error('Error creating facility:', error);
      res.status(400).json({ error: 'Failed to create facility', message: error.message });
    }
  });
  
  app.patch('/api/facilities/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can update facilities' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid facility ID' });
      }
      
      const updated = await storage.updateFacility(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Facility not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating facility:', error);
      res.status(400).json({ error: 'Failed to update facility', message: error.message });
    }
  });
  
  app.delete('/api/facilities/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can delete facilities' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid facility ID' });
      }
      
      await storage.deleteFacility(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting facility:', error);
      res.status(500).json({ error: 'Failed to delete facility', message: error.message });
    }
  });
  
  // =============================================
  // AWARD DEFINITION ROUTES (Admin/Coach Only)
  // =============================================
  
  // Get all award definitions for organization
  app.get('/api/award-definitions', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const awardDefinitions = await storage.getAwardDefinitions(organizationId);
      res.json(awardDefinitions);
    } catch (error: any) {
      console.error('Error fetching award definitions:', error);
      res.status(500).json({ error: 'Failed to fetch award definitions', message: error.message });
    }
  });

  // Get badges from registry (for coaches to award)
  app.get('/api/admin/badges', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can view badges' });
      }
      
      // Import the awards registry
      const { AWARDS } = await import('@shared/awards.registry');
      
      // Filter to only return badges (not trophies) that can be manually awarded
      const badges = AWARDS.filter((award: any) => 
        award.kind === 'Badge' && 
        award.triggerSources && 
        award.triggerSources.includes('coachAward')
      );
      
      res.json(badges);
    } catch (error: any) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges', message: error.message });
    }
  });
  
  // Get single award definition
  app.get('/api/award-definitions/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid award definition ID' });
      }
      
      const awardDefinition = await storage.getAwardDefinition(id);
      if (!awardDefinition) {
        return res.status(404).json({ error: 'Award definition not found' });
      }
      
      res.json(awardDefinition);
    } catch (error: any) {
      console.error('Error fetching award definition:', error);
      res.status(500).json({ error: 'Failed to fetch award definition', message: error.message });
    }
  });
  
  // Create new award definition (admin only)
  app.post('/api/award-definitions', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create award definitions' });
      }
      
      const awardDefinitionData = insertAwardDefinitionSchema.parse({
        ...req.body,
        organizationId,
      });
      const awardDefinition = await storage.createAwardDefinition(awardDefinitionData);
      res.status(201).json(awardDefinition);
    } catch (error: any) {
      console.error('Error creating award definition:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid award definition data', 
          details: error.errors 
        });
      }
      res.status(400).json({ error: 'Failed to create award definition', message: error.message });
    }
  });
  
  // Update award definition (admin only)
  app.put('/api/award-definitions/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can update award definitions' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid award definition ID' });
      }
      
      // Validate request body
      const awardDefinitionData = insertAwardDefinitionSchema.partial().parse(req.body);
      
      const updated = await storage.updateAwardDefinition(id, awardDefinitionData);
      if (!updated) {
        return res.status(404).json({ error: 'Award definition not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating award definition:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid award definition data', 
          details: error.errors 
        });
      }
      res.status(400).json({ error: 'Failed to update award definition', message: error.message });
    }
  });
  
  // Delete award definition (admin only)
  app.delete('/api/award-definitions/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can delete award definitions' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid award definition ID' });
      }
      
      await storage.deleteAwardDefinition(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting award definition:', error);
      res.status(500).json({ error: 'Failed to delete award definition', message: error.message });
    }
  });
  
  // =============================================
  // USER AWARDS ROUTES
  // =============================================
  
  // Get user awards (for specific user or current user)
  app.get('/api/user-awards', requireAuth, async (req: any, res) => {
    // Disable HTTP caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const { id: currentUserId, role, organizationId } = req.user;
      const { userId} = req.query;
      
      // Determine which user's awards to fetch
      const targetUserId = userId || currentUserId;
      
      // Authorization: users can view their own awards, admins/coaches can view any user's awards
      if (targetUserId !== currentUserId && role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Not authorized to view these awards' });
      }
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Not authorized to view awards from other organizations' });
      }
      
      const userAwardRecords = await storage.getUserAwardRecords(targetUserId);
      
      // Fetch award definitions to enrich the data
      const allAwardDefinitions = await storage.getAwardDefinitions(organizationId);
      const awardDefMap = new Map(allAwardDefinitions.map(ad => [ad.id, ad]));
      
      // Enrich user awards with award definition data
      const enrichedAwards = userAwardRecords.map((ua: any) => {
        const def = awardDefMap.get(ua.awardId);
        return {
          ...ua,
          tier: def?.tier,
          name: def?.name,
          description: def?.description,
          imageUrl: def?.imageUrl,
          prestige: def?.prestige,
        };
      });
      
      res.json(enrichedAwards);
    } catch (error: any) {
      console.error('Error fetching user awards:', error);
      res.status(500).json({ error: 'Failed to fetch user awards', message: error.message });
    }
  });
  
  // Get all user awards for organization (admin/coach only)
  app.get('/api/user-awards/organization', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can view organization awards' });
      }
      
      const userAwards = await storage.getUserAwardsByOrganization(organizationId);
      res.json(userAwards);
    } catch (error: any) {
      console.error('Error fetching organization awards:', error);
      res.status(500).json({ error: 'Failed to fetch organization awards', message: error.message });
    }
  });
  
  // Coach award endpoint (alias for /api/user-awards with different parameter naming)
  app.post('/api/coach/award', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId, id: awardedById } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can award users' });
      }
      
      // Map frontend parameters to backend format
      const { playerId, awardId, category, year, notes } = req.body;
      const userId = playerId; // Frontend sends playerId, backend expects userId
      
      if (!userId || !awardId) {
        return res.status(400).json({ error: 'playerId and awardId are required' });
      }
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot award users from other organizations' });
      }
      
      // awardId is a string from the registry (e.g., "game-mvp")
      // Find the corresponding award in the registry and then look up the DB record by name
      const { AWARDS } = await import('@shared/awards.registry');
      const registryAward = AWARDS.find((a: any) => a.id === awardId);
      if (!registryAward) {
        return res.status(404).json({ error: `Award not found in registry: ${awardId}` });
      }
      
      // Look up the database award definition by name
      const allAwardDefs = await storage.getAwardDefinitions(organizationId);
      const awardDefinition = allAwardDefs.find((a: any) => a.name === registryAward.name);
      if (!awardDefinition) {
        return res.status(404).json({ error: `Award definition not found in database: ${registryAward.name}` });
      }
      
      const dbAwardId = awardDefinition.id; // This is the integer ID
      
      // Check if user already has this award for the same year
      const currentYear = year || new Date().getFullYear();
      const hasAward = await storage.checkUserHasAward(userId, dbAwardId, currentYear);
      if (hasAward) {
        return res.status(400).json({ error: 'User already has this award for the specified year' });
      }
      
      const userAwardData = insertUserAwardRecordSchema.parse({
        userId,
        awardId: dbAwardId,
        awardedBy: awardedById,
        year: currentYear,
        notes: notes || null,
        visible: true,
      });
      
      const userAward = await storage.createUserAward(userAwardData);
      
      // Trigger award evaluation to update user's cached awards array
      await evaluateAwardsForUser(userId, storage);
      
      res.status(201).json(userAward);
    } catch (error: any) {
      console.error('Error awarding user:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid user award data', 
          details: error.errors 
        });
      }
      res.status(400).json({ error: 'Failed to award user', message: error.message });
    }
  });

  // Manually award to user (admin/coach only)
  app.post('/api/user-awards', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId, id: awardedById } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can award users' });
      }
      
      const { userId, awardId, year, notes } = req.body;
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot award users from other organizations' });
      }
      
      // Verify the award definition exists
      const awardDefinition = await storage.getAwardDefinition(awardId);
      if (!awardDefinition) {
        return res.status(404).json({ error: 'Award definition not found' });
      }
      
      // Check if user already has this award for the same year
      const hasAward = await storage.checkUserHasAward(userId, awardId, year);
      if (hasAward) {
        return res.status(400).json({ error: 'User already has this award for the specified year' });
      }
      
      const userAwardData = insertUserAwardRecordSchema.parse({
        userId,
        awardId,
        awardedBy: awardedById,
        year: year || null,
        notes: notes || null,
        visible: true,
      });
      
      const userAward = await storage.createUserAward(userAwardData);
      
      // Trigger award evaluation to update user's cached awards array
      await evaluateAwardsForUser(userId, storage);
      
      res.status(201).json(userAward);
    } catch (error: any) {
      console.error('Error awarding user:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid user award data', 
          details: error.errors 
        });
      }
      res.status(400).json({ error: 'Failed to award user', message: error.message });
    }
  });
  
  // Delete user award (admin/coach only)
  app.delete('/api/user-awards/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can delete user awards' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid user award ID' });
      }
      
      await storage.deleteUserAward(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user award:', error);
      res.status(500).json({ error: 'Failed to delete user award', message: error.message });
    }
  });
  
  // =============================================
  // AWARD SYNC ROUTES
  // =============================================
  
  // Manually trigger award evaluation for a user (admin/coach only)
  app.post('/api/awards/sync/:userId', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can sync awards' });
      }
      
      const { userId } = req.params;
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot sync awards for users from other organizations' });
      }
      
      // Trigger award evaluation
      const updatedAwards = await evaluateAwardsForUser(userId, storage);
      
      res.json({ 
        success: true, 
        message: 'Awards synced successfully',
        awardsCount: updatedAwards.length,
        awards: updatedAwards
      });
    } catch (error: any) {
      console.error('Error syncing awards:', error);
      res.status(500).json({ error: 'Failed to sync awards', message: error.message });
    }
  });
  
  // =============================================
  // SCHEDULED TASKS - Award Synchronization
  // =============================================
  
  // Sync awards for all users every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🏆 Starting hourly award sync for all users...');
      const allUsers = await storage.getAllUsers();
      
      let syncCount = 0;
      for (const user of allUsers) {
        try {
          await evaluateAwardsForUser(user.id, storage);
          syncCount++;
        } catch (error) {
          console.error(`Failed to sync awards for user ${user.id}:`, error);
        }
      }
      
      console.log(`✅ Award sync completed: ${syncCount}/${allUsers.length} users synced`);
    } catch (error) {
      console.error('Error in hourly award sync:', error);
    }
  });

  // =============================================
  // HTTP SERVER SETUP
  // =============================================
  
  const server = createServer(app);
  
  // Note: WebSocket server disabled to avoid conflicts with Vite HMR
  // Uncomment if you need WebSocket functionality for real-time updates
  // wss = new WebSocketServer({ server });
  // wss.on('connection', (ws) => {
  //   console.log('WebSocket client connected');
  //   ws.on('message', (message) => {
  //     console.log('Received:', message.toString());
  //   });
  //   ws.on('close', () => {
  //     console.log('WebSocket client disconnected');
  //   });
  // });
  
  return server;
}
