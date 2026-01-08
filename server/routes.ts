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
import privacyRoutes from "./routes/privacy";
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
import { notifications, notificationRecipients, users, teamMemberships, teams, waivers, waiverVersions, waiverSignatures, productEnrollments, products, userAwards } from "@shared/schema";
import { eq, and, or, sql, desc, inArray } from "drizzle-orm";

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

// Helper function to generate stable UUID for pricing options
function generateStablePricingOptionId(): string {
  return `po_${crypto.randomUUID()}`;
}

// Deep clone helper that preserves types (unlike JSON.stringify which loses Dates/BigInt)
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    // Handle primitives including BigInt
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  const cloned: any = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as any)[key]);
  }
  return cloned;
}

// Helper function to ensure all pricing options have stable server-side IDs
function assignStablePricingOptionIds(pricingOptions: any[]): any[] {
  return pricingOptions.map((option: any) => ({
    ...option,
    // Only preserve IDs that are server-generated (start with 'po_')
    // Client-generated IDs get replaced with stable server IDs
    id: option.id && option.id.startsWith('po_') ? option.id : generateStablePricingOptionId(),
  }));
}

// Helper function to sync program pricing options with Stripe
// Creates/updates Stripe Products and Prices for each pricing option
// Note: Pricing options should already have stable IDs assigned before calling this function
async function syncProgramWithStripe(
  program: any,
  pricingOptions: any[] = []
): Promise<{ stripeProductId: string | null; updatedPricingOptions: any[] }> {
  if (!stripe) {
    console.log('Stripe not configured, skipping sync');
    // Just return options as-is (they should already have stable IDs)
    return { stripeProductId: program.stripeProductId || null, updatedPricingOptions: pricingOptions };
  }

  try {
    let stripeProductId = program.stripeProductId;

    // Create or get Stripe Product for this program
    if (!stripeProductId) {
      const stripeProduct = await stripe.products.create({
        name: program.name,
        description: program.description || undefined,
        metadata: {
          programId: program.id,
          organizationId: program.organizationId,
        },
      });
      stripeProductId = stripeProduct.id;
      console.log(`Created Stripe Product ${stripeProductId} for program ${program.name}`);
    } else {
      // Update existing product name/description if changed
      await stripe.products.update(stripeProductId, {
        name: program.name,
        description: program.description || undefined,
      });
    }

    // Create Stripe Prices for each pricing option that doesn't have one
    // Note: All options should already have stable IDs (po_ prefix) from the route handlers
    const updatedPricingOptions = await Promise.all(
      pricingOptions.map(async (option: any) => {
        const updatedOption = { ...option };

        // Create main price for this option if not exists
        // Skip zero-price options as Stripe doesn't allow $0 prices for one-time charges
        if (!option.stripePriceId && option.price && option.price > 0) {
          try {
            // Determine if this is recurring or one-time based on billingCycle
            const isRecurring = option.billingCycle === 'Monthly' || 
                               (option.convertsToMonthly && option.durationDays && option.durationDays > 31);
            
            // For bundles that convert to monthly, create as one-time (the initial bundle payment)
            // The monthly conversion will use a separate price
            const priceParams: Stripe.PriceCreateParams = {
              product: stripeProductId!,
              unit_amount: option.price,
              currency: 'usd',
              metadata: {
                programId: program.id,
                pricingOptionId: option.id,
                pricingOptionName: option.name,
              },
            };

            // If it's a straight monthly subscription (not a bundle), make it recurring
            if (option.billingCycle === 'Monthly' && !option.convertsToMonthly) {
              priceParams.recurring = { interval: 'month' };
            }

            const stripePrice = await stripe.prices.create(priceParams);
            updatedOption.stripePriceId = stripePrice.id;
            console.log(`Created Stripe Price ${stripePrice.id} for option "${option.name}"`);
          } catch (error: any) {
            console.error(`Failed to create Stripe Price for option "${option.name}":`, error.message);
          }
        }

        // Create monthly price for bundle-to-monthly conversion if needed
        if (option.convertsToMonthly && option.monthlyPrice > 0 && !option.monthlyStripePriceId) {
          try {
            const monthlyPriceParams: Stripe.PriceCreateParams = {
              product: stripeProductId!,
              unit_amount: option.monthlyPrice,
              currency: 'usd',
              recurring: { interval: 'month' },
              metadata: {
                programId: program.id,
                pricingOptionId: option.id,
                pricingOptionName: `${option.name} - Monthly`,
                isMonthlyConversion: 'true',
              },
            };

            const monthlyPrice = await stripe.prices.create(monthlyPriceParams);
            updatedOption.monthlyStripePriceId = monthlyPrice.id;
            console.log(`Created monthly Stripe Price ${monthlyPrice.id} for option "${option.name}"`);
          } catch (error: any) {
            console.error(`Failed to create monthly Stripe Price for option "${option.name}":`, error.message);
          }
        }

        return updatedOption;
      })
    );

    return { stripeProductId, updatedPricingOptions };
  } catch (error: any) {
    console.error('Error syncing program with Stripe:', error.message);
    return { stripeProductId: program.stripeProductId || null, updatedPricingOptions: pricingOptions };
  }
}

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
    
    // Award population disabled - awards are now managed manually through admin panel
    // await populateAwards(storage, "default-org");
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
  app.use('/api/privacy', privacyRoutes);
  
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
      
      const { productId, productCategory } = req.body;
      
      // Build line items - either for a direct product purchase or from package selections
      const lineItems: any[] = [];
      let metadata: any = { userId: user.id };
      let mode: 'payment' | 'subscription' = 'payment';
      
      if (productId) {
        // Direct product purchase flow
        const product = await storage.getProgram(productId);
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        if (!product.price || product.price <= 0) {
          return res.status(400).json({ error: "Product has no valid price" });
        }
        
        // Check if this is a subscription product
        if (product.type === 'Subscription' && product.billingCycle) {
          // Create a subscription checkout
          mode = 'subscription';
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
              unit_amount: product.price,
              recurring: {
                interval: product.billingCycle.toLowerCase() as 'day' | 'week' | 'month' | 'year',
              },
            },
            quantity: 1,
          });
        } else {
          // One-time payment
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
              unit_amount: product.price,
            },
            quantity: 1,
          });
        }
        
        metadata.productId = productId;
        metadata.productCategory = productCategory || product.productCategory || 'service';
      } else {
        // Legacy package selections flow
        const packageSelections = await storage.getPackageSelectionsByParent(req.user.id);
        const unpaidSelections = packageSelections.filter(selection => !selection.isPaid);
        
        if (unpaidSelections.length === 0) {
          return res.status(404).json({ error: "No unpaid package selections found" });
        }
        
        for (const selection of unpaidSelections) {
          const program = await storage.getProgram(selection.programId);
          if (program && program.price) {
            lineItems.push({
              price_data: {
                currency: 'usd',
                product_data: {
                  name: program.name,
                },
                unit_amount: program.price,
              },
              quantity: 1,
            });
          }
        }
        
        if (lineItems.length === 0) {
          return res.status(404).json({ error: "No valid programs found for selections" });
        }
        
        metadata.packageSelectionIds = unpaidSelections.map(s => s.id).join(',');
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
        mode,
        success_url: `${origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payments?canceled=true`,
        metadata,
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
      const { packageId, playerId, addOnIds, signedWaiverIds, selectedPricingOptionId } = req.body;
      
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
      
      // Find selected pricing option if provided
      let selectedPricingOption: any = null;
      if (selectedPricingOptionId) {
        const pricingOptions = (program as any).pricingOptions;
        if (pricingOptions && Array.isArray(pricingOptions)) {
          selectedPricingOption = pricingOptions.find((opt: any) => opt.id === selectedPricingOptionId);
        }
        // Validate: if pricing option ID is provided but not found, return error
        if (!selectedPricingOption) {
          return res.status(400).json({ error: "Invalid pricing option ID - option not found for this program" });
        }
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
      
      // Determine if this is a subscription or one-time payment
      // Bundle pricing options are always one-time payments (may convert to subscription later)
      const isSubscription = !selectedPricingOption && program.type === 'Subscription' && program.billingCycle;
      const isBundleWithMonthlyConversion = selectedPricingOption?.convertsToMonthly;
      
      // Build line items - start with main program
      const lineItems: any[] = [];
      
      // Determine the price to use (pricing option price or program base price)
      const priceToCharge = selectedPricingOption ? selectedPricingOption.price : program.price;
      const itemName = selectedPricingOption 
        ? `${program.name} - ${selectedPricingOption.name}`
        : program.name;
      const itemDescription = selectedPricingOption?.durationDays 
        ? `${selectedPricingOption.durationDays} days${selectedPricingOption.convertsToMonthly ? ', then converts to monthly subscription' : ''}`
        : (program.description || undefined);
      
      // Main program line item
      const mainLineItem: any = {
        price_data: {
          currency: 'usd',
          product_data: {
            name: itemName,
            description: itemDescription,
          },
          unit_amount: priceToCharge, // Price is already in cents
        },
        quantity: 1,
      };
      
      // Add recurring for subscriptions (not for bundle purchases)
      if (isSubscription) {
        const interval = (program.billingCycle || 'month').toLowerCase();
        // Map billing cycle to Stripe interval
        const stripeInterval = interval === 'monthly' ? 'month' : 
                               interval === 'yearly' ? 'year' : 
                               interval === 'weekly' ? 'week' :
                               interval === 'daily' ? 'day' : interval;
        mainLineItem.price_data.recurring = {
          interval: stripeInterval as 'day' | 'week' | 'month' | 'year',
        };
      }
      
      lineItems.push(mainLineItem);
      
      // Calculate subtotal for platform fee
      let subtotal = priceToCharge;
      
      // Add add-on line items (one-time purchases only, not subscriptions)
      const addOnProductIds: string[] = [];
      if (addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0 && !isSubscription) {
        for (const addOnId of addOnIds) {
          const addOn = await storage.getProgram(addOnId);
          if (addOn && addOn.price) {
            addOnProductIds.push(addOnId);
            subtotal += addOn.price;
            lineItems.push({
              price_data: {
                currency: 'usd',
                product_data: {
                  name: addOn.name,
                  description: addOn.description || undefined,
                },
                unit_amount: addOn.price,
              },
              quantity: 1,
            });
          }
        }
      }
      
      // Add 1% BoxStat platform fee as a separate line item
      const platformFee = Math.round(subtotal * 0.01); // 1% of subtotal
      if (platformFee > 0) {
        const platformFeeItem: any = {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'BoxStat Platform Fee',
              description: '1% service fee',
            },
            unit_amount: platformFee,
          },
          quantity: 1,
        };
        
        // For subscriptions, the fee must also be recurring
        if (isSubscription) {
          const interval = (program.billingCycle || 'month').toLowerCase();
          const stripeInterval = interval === 'monthly' ? 'month' : 
                                 interval === 'yearly' ? 'year' : 
                                 interval === 'weekly' ? 'week' :
                                 interval === 'daily' ? 'day' : interval;
          platformFeeItem.price_data.recurring = {
            interval: stripeInterval as 'day' | 'week' | 'month' | 'year',
          };
        }
        
        lineItems.push(platformFeeItem);
      }
      
      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: lineItems,
        mode: isSubscription ? 'subscription' : 'payment',
        success_url: `${origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/unified-account?payment=canceled`,
        metadata: {
          userId: user.id,
          packageId: packageId,
          playerId: playerId || '',
          type: 'package_purchase',
          addOnIds: addOnProductIds.length > 0 ? JSON.stringify(addOnProductIds) : '',
          signedWaiverIds: signedWaiverIds && signedWaiverIds.length > 0 ? JSON.stringify(signedWaiverIds) : '',
          pricingOptionId: selectedPricingOptionId || '',
          pricingOptionName: selectedPricingOption?.name || '',
          convertsToMonthly: isBundleWithMonthlyConversion ? 'true' : '',
          monthlyPrice: selectedPricingOption?.monthlyPrice ? String(selectedPricingOption.monthlyPrice) : '',
          durationDays: selectedPricingOption?.durationDays ? String(selectedPricingOption.durationDays) : '',
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
                  programId: packageId,
                });
                console.log(`✅ Created payment record for player ${playerId}`);
              } catch (paymentError: any) {
                console.error("Error creating payment record:", paymentError);
                // Don't fail the webhook if payment record creation fails
              }
            }
            
            // Create program enrollment for the player
            if (packageId) {
              try {
                const program = await storage.getProgram(packageId);
                if (program) {
                  // Check for existing enrollment
                  const existingEnrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
                  const hasEnrollment = existingEnrollments.some(e => e.programId === packageId);
                  
                  if (!hasEnrollment) {
                    await storage.createEnrollment({
                      organizationId: updatedPlayer.organizationId,
                      accountHolderId: accountHolderId,
                      profileId: playerId,
                      programId: packageId,
                      status: 'active',
                      source: 'payment',
                      remainingCredits: program.sessionCount ?? undefined,
                      totalCredits: program.sessionCount ?? undefined,
                    });
                    console.log(`✅ Created enrollment for player ${playerId} in program ${packageId}`);
                  } else {
                    console.log(`ℹ️ Player ${playerId} already has enrollment for program ${packageId}`);
                  }
                } else {
                  console.warn(`⚠️ Program ${packageId} not found, cannot create enrollment`);
                }
              } catch (enrollError: any) {
                console.error("Error creating enrollment:", enrollError);
                // Don't fail the webhook if enrollment creation fails
              }
            }
          } else {
            console.error(`⚠️ Could not find player ${playerId} to update`);
          }
          
          return res.json({ received: true });
        }
        
        // Handle quote checkout payments
        if (session.metadata?.quoteId) {
          const quoteId = session.metadata.quoteId;
          const userId = session.metadata.userId;
          const playerId = session.metadata.playerId;
          const enrollmentIdsStr = session.metadata.enrollmentIds;
          
          console.log(`✅ Quote checkout payment completed for quote ${quoteId}`);
          
          // Activate all enrollments from the quote
          if (enrollmentIdsStr) {
            try {
              const enrollmentIds = JSON.parse(enrollmentIdsStr) as number[];
              for (const enrollmentId of enrollmentIds) {
                await storage.updateEnrollment(enrollmentId, { status: 'active' });
                console.log(`✅ Activated enrollment ${enrollmentId} for quote ${quoteId}`);
              }
            } catch (enrollError: any) {
              console.error("Error activating enrollments:", enrollError);
            }
          }
          
          // Create payment record
          if (session.amount_total && userId) {
            try {
              await storage.createPayment({
                organizationId: "default-org",
                userId: userId,
                playerId: playerId || undefined,
                amount: session.amount_total,
                currency: 'usd',
                paymentType: 'quote_checkout',
                status: 'completed',
                description: `Quote Checkout Payment`,
                stripePaymentId: session.payment_intent as string,
              });
              console.log(`✅ Created payment record for quote ${quoteId}`);
            } catch (paymentError: any) {
              console.error("Error creating payment record:", paymentError);
            }
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
          
          const program = await storage.getProgram(packageId);
          
          // Create payment record with playerId
          if (session.amount_total) {
            try {
              await storage.createPayment({
                organizationId: "default-org",
                userId: userId,
                playerId: playerId || undefined,
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
          
          // Update player's paymentStatus to "paid" and create enrollment
          if (playerId && typeof playerId === 'string' && playerId.length > 0) {
            try {
              // Verify player exists before updating
              const player = await storage.getUser(playerId);
              if (player) {
                // Update player's payment status
                await storage.updateUser(playerId, {
                  paymentStatus: "paid",
                });
                console.log(`✅ Updated player ${playerId} paymentStatus to paid`);
                
                // Check for existing enrollment for this player and program
                const existingEnrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
                const hasEnrollment = existingEnrollments.some(e => e.programId === packageId);
                
                if (!hasEnrollment && program) {
                  await storage.createEnrollment({
                    organizationId: "default-org",
                    accountHolderId: userId,
                    profileId: playerId,
                    programId: packageId,
                    status: 'active',
                    source: 'payment',
                    remainingCredits: program.sessionCount ?? undefined,
                    totalCredits: program.sessionCount ?? undefined,
                  });
                  console.log(`✅ Created enrollment for player ${playerId} in program ${packageId}`);
                } else if (hasEnrollment) {
                  console.log(`ℹ️ Player ${playerId} already has enrollment for program ${packageId}`);
                }
              } else {
                console.warn(`⚠️ Player ${playerId} not found, cannot update status`);
              }
            } catch (playerUpdateError: any) {
              console.error("Error updating player status or enrollment:", playerUpdateError);
            }
          } else {
            console.log(`ℹ️ No valid playerId provided in session metadata, skipping player status update`);
          }
          
          // For subscription mode checkouts, create a subscription record
          if (session.mode === 'subscription' && session.subscription) {
            try {
              const stripeSubscriptionId = typeof session.subscription === 'string' 
                ? session.subscription 
                : session.subscription.id;
              
              const user = await storage.getUser(userId);
              
              await storage.createSubscription({
                ownerUserId: userId,
                assignedPlayerId: playerId || undefined,
                stripeCustomerId: user?.stripeCustomerId || session.customer as string,
                stripeSubscriptionId: stripeSubscriptionId,
                productName: program?.name || 'Subscription',
                status: 'active',
                isMigrated: false,
              });
              console.log(`✅ Created subscription record for ${stripeSubscriptionId}`);
              
              // Update user's stripeSubscriptionId field with the latest subscription
              if (user?.stripeSubscriptionId !== stripeSubscriptionId) {
                await storage.updateUser(userId, { stripeSubscriptionId: stripeSubscriptionId });
                console.log(`✅ Updated user ${userId} with stripeSubscriptionId: ${stripeSubscriptionId}`);
              } else {
                console.log(`ℹ️ User ${userId} already has this stripeSubscriptionId: ${stripeSubscriptionId}`);
              }
            } catch (subError: any) {
              console.error("Error creating subscription record:", subError);
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
            const packageId = session.metadata.packageId;
            await storage.createPayment({
              organizationId: updatedPlayer.organizationId,
              userId: playerId,
              amount: session.amount_total,
              currency: 'usd',
              paymentType: 'add_player',
              status: 'completed',
              description: `Player Registration: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
              stripePaymentId: session.payment_intent as string,
              programId: packageId,
            });
            console.log(`✅ Created add_player payment record via callback for player ${playerId}`);
            
            // Create program enrollment for the player
            if (packageId) {
              try {
                const program = await storage.getProgram(packageId);
                if (program) {
                  // Check for existing enrollment
                  const existingEnrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
                  const hasEnrollment = existingEnrollments.some(e => e.programId === packageId);
                  
                  if (!hasEnrollment) {
                    await storage.createEnrollment({
                      organizationId: updatedPlayer.organizationId,
                      accountHolderId: accountHolderId,
                      profileId: playerId,
                      programId: packageId,
                      status: 'active',
                      source: 'payment',
                      remainingCredits: program.sessionCount ?? undefined,
                      totalCredits: program.sessionCount ?? undefined,
                    });
                    console.log(`✅ Created enrollment for player ${playerId} in program ${packageId} via callback`);
                  } else {
                    console.log(`ℹ️ Player ${playerId} already has enrollment for program ${packageId}`);
                  }
                }
              } catch (enrollError: any) {
                console.error("Error creating enrollment via callback:", enrollError);
              }
            }
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
          const payment = await storage.createPayment({
            organizationId: "default-org",
            userId: userId,
            playerId: playerId || undefined,
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
          
          // Create product enrollment for the player (or account holder if no player specified)
          if (program) {
            const enrollmentProfileId = playerId || userId;
            try {
              // Calculate credits - only for Pack type products with sessionCount
              const isSubscription = program.type === 'Subscription';
              const isPack = program.type === 'Pack';
              const credits = isPack && program.sessionCount ? program.sessionCount : null;
              const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
              const now = new Date().toISOString();
              
              const enrollment = await storage.createEnrollment({
                organizationId: "default-org",
                programId: packageId,
                accountHolderId: userId,
                profileId: enrollmentProfileId,
                status: 'active',
                source: 'direct',
                paymentId: String(payment.id),
                stripeSubscriptionId: subscriptionId,
                startDate: now,
                endDate: null,
                totalCredits: credits,
                remainingCredits: credits,
                autoRenew: isSubscription, // Only subscriptions auto-renew, packs/one-time don't
                metadata: {},
              });
              console.log(`✅ Created enrollment for profile ${enrollmentProfileId} in program ${packageId} (type: ${program.type}, credits: ${credits || 'N/A'}, autoRenew: ${isSubscription})`);
              
              // Update player's paymentStatus to 'paid' if enrolled
              if (playerId) {
                await storage.updateUser(playerId, { paymentStatus: 'paid' });
                console.log(`✅ Updated paymentStatus to 'paid' for player ${playerId}`);
              }
              
              // Update user's stripeSubscriptionId field with the latest subscription
              if (subscriptionId) {
                const existingUser = await storage.getUser(userId);
                if (existingUser?.stripeSubscriptionId !== subscriptionId) {
                  await storage.updateUser(userId, { stripeSubscriptionId: subscriptionId });
                  console.log(`✅ Updated user ${userId} with stripeSubscriptionId: ${subscriptionId}`);
                } else {
                  console.log(`ℹ️ User ${userId} already has this stripeSubscriptionId: ${subscriptionId}`);
                }
              }
            } catch (enrollError) {
              console.error('Error creating enrollment:', enrollError);
              // Don't fail the whole request if enrollment creation fails
            }
          }
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
      
      // Check for unclaimed legacy subscriptions
      let hasLegacySubscriptions = false;
      let legacySubsCount = 0;
      
      if (primaryUser) {
        try {
          const migrationLookups = await storage.getMigrationLookupsByEmail(primaryEmail);
          
          if (migrationLookups.length > 0) {
            console.log(`🔄 Found ${migrationLookups.length} unclaimed legacy subscriptions for ${primaryEmail}`);
            legacySubsCount = migrationLookups.length;
            hasLegacySubscriptions = true;
            
            // Set the needsLegacyClaim flag so user is directed to claim page
            await storage.updateUser(primaryUser.id, {
              needsLegacyClaim: true,
              stripeCustomerId: migrationLookups[0].stripeCustomerId,
            });
            
            console.log(`✅ Set needsLegacyClaim flag for user ${primaryUser.id} - ${legacySubsCount} subscriptions to claim`);
          }
        } catch (migrationError: any) {
          console.error("Migration lookup error (non-fatal):", migrationError);
          // Don't fail registration if migration lookup fails
        }
      }
      
      res.json({
        success: true,
        message: hasLegacySubscriptions 
          ? `Welcome back! We found ${legacySubsCount} subscription(s) linked to your email. Please assign them to your players.`
          : "Registration complete! You can now login.",
        requiresVerification: false,
        email: primaryEmail,
        needsLegacyClaim: hasLegacySubscriptions,
        legacySubsCount,
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
  
  // Get detailed subscription info with Stripe data (next payment date, etc.)
  app.get('/api/subscriptions/details', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Get all subscriptions for this account holder
      const subscriptions = await storage.getSubscriptionsByOwner(userId);
      
      // Get all child players
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      const childPlayers = allUsers.filter(u => u.accountHolderId === userId && u.role === "player");
      
      // Collect all unique Stripe subscription IDs
      const stripeSubIds = new Set<string>();
      for (const sub of subscriptions) {
        if (sub.stripeSubscriptionId) {
          stripeSubIds.add(sub.stripeSubscriptionId);
        }
      }
      
      // Also check for Stripe subscriptions in player_subscriptions table
      for (const player of childPlayers) {
        const playerSubs = await storage.getSubscriptionsByPlayerId(player.id);
        for (const sub of playerSubs) {
          if (sub.stripeSubscriptionId) {
            stripeSubIds.add(sub.stripeSubscriptionId);
          }
        }
      }
      
      // Fetch Stripe subscription details
      const stripeDetails: Record<string, any> = {};
      if (stripe) {
        for (const subId of stripeSubIds) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(subId);
            // Get period data from items (Stripe SDK returns period data in items)
            const periodEnd = stripeSub.items?.data?.[0]?.current_period_end || (stripeSub as any).current_period_end;
            const periodStart = stripeSub.items?.data?.[0]?.current_period_start || (stripeSub as any).current_period_start;
            stripeDetails[subId] = {
              id: stripeSub.id,
              status: stripeSub.status,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: (stripeSub as any).cancel_at_period_end,
              interval: stripeSub.items.data[0]?.price?.recurring?.interval || 'month',
              amount: stripeSub.items.data[0]?.price?.unit_amount || 0,
              currency: stripeSub.items.data[0]?.price?.currency || 'usd',
            };
          } catch (stripeError: any) {
            console.warn(`Could not fetch Stripe subscription ${subId}:`, stripeError.message);
          }
        }
      }
      
      // Enrich subscriptions with Stripe data and player info
      const enrichedSubscriptions = subscriptions.map(sub => {
        const stripeInfo = sub.stripeSubscriptionId ? stripeDetails[sub.stripeSubscriptionId] : null;
        const player = sub.assignedPlayerId ? childPlayers.find(p => p.id === sub.assignedPlayerId) : null;
        
        return {
          ...sub,
          playerName: player ? `${player.firstName} ${player.lastName}` : null,
          stripe: stripeInfo,
          nextPaymentDate: stripeInfo?.currentPeriodEnd ? new Date(stripeInfo.currentPeriodEnd * 1000).toISOString() : null,
        };
      });
      
      // Get upcoming payments summary
      const upcomingPayments = enrichedSubscriptions
        .filter(s => s.status === 'active' && s.stripe?.currentPeriodEnd)
        .map(s => ({
          subscriptionId: s.id,
          stripeSubscriptionId: s.stripeSubscriptionId,
          productName: s.productName,
          playerName: s.playerName,
          amount: s.stripe?.amount || 0,
          currency: s.stripe?.currency || 'usd',
          nextPaymentDate: s.nextPaymentDate,
          interval: s.stripe?.interval || 'month',
        }))
        .sort((a, b) => new Date(a.nextPaymentDate || 0).getTime() - new Date(b.nextPaymentDate || 0).getTime());
      
      res.json({
        success: true,
        subscriptions: enrichedSubscriptions,
        upcomingPayments,
        stripeCustomerId: user.stripeCustomerId,
      });
    } catch (error: any) {
      console.error("Error fetching subscription details:", error);
      res.status(500).json({ success: false, message: "Failed to fetch subscription details" });
    }
  });
  
  // Get users by account holder (for unified account page)
  app.get('/api/account/players', requireAuth, async (req: any, res) => {
    const { id } = req.user;
    const user = await storage.getUser(id);
    
    let players: any[] = [];
    
    if (user?.role === "parent" || user?.role === "admin") {
      // Get all players linked to this parent/admin (check both accountHolderId and parentId)
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      players = allUsers.filter(u => (u.accountHolderId === id || u.parentId === id) && u.role === "player");
    } else if (user?.role === "player") {
      // Return self
      players = [user];
    }
    
    // Fetch active subscriptions, status tags, and team info for each player
    const allTeams = await storage.getTeamsByOrganization(user.organizationId);
    
    const playersWithSubscriptions = await Promise.all(
      players.map(async (player: any) => {
        try {
          const subscriptions = await storage.getSubscriptionsByPlayerId(player.id);
          const statusTag = await storage.getPlayerStatusTag(player.id);
          
          // Get team memberships for this player
          const playerTeamMemberships = await storage.getTeamMembershipsByProfile(player.id);
          const activeTeamMembership = playerTeamMemberships.find((tm: any) => tm.status === 'active' && tm.role === 'player');
          let teamInfo = null;
          if (activeTeamMembership) {
            const team = allTeams.find((t: any) => t.id === activeTeamMembership.teamId);
            if (team) {
              teamInfo = {
                teamId: team.id,
                teamName: team.name,
                coachId: team.coachId,
              };
              // Get coach name if available
              if (team.coachId) {
                const coach = await storage.getUser(team.coachId);
                if (coach) {
                  (teamInfo as any).coachName = `${coach.firstName} ${coach.lastName}`;
                }
              }
            }
          }
          
          return {
            ...player,
            ...teamInfo,
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
  
  // Get parent's team chatrooms (based on children's team memberships)
  app.get('/api/account/team-chatrooms', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.user;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(403).json({ message: "User not found" });
      }
      
      // Get all players linked to this user (mirrors /api/account/players logic)
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      let linkedPlayers: any[] = [];
      
      // Find linked players (for parents/admins)
      linkedPlayers = allUsers.filter(u => 
        (u.accountHolderId === id || u.parentId === id) && u.role === "player"
      );
      
      // If no linked players and user is a player themselves, include self
      if (linkedPlayers.length === 0 && user.role === "player") {
        linkedPlayers = [user];
      }
      
      if (linkedPlayers.length === 0) {
        return res.json([]);
      }
      
      // Get all team memberships for linked players
      const teamChatroomsMap = new Map<number, any>();
      const allTeams = await storage.getTeamsByOrganization(user.organizationId);
      const allPrograms = await storage.getProgramsByOrganization(user.organizationId);
      
      for (const player of linkedPlayers) {
        const memberships = await storage.getTeamMembershipsByProfile(player.id);
        const activeMemberships = memberships.filter((m: any) => m.status === 'active');
        
        for (const membership of activeMemberships) {
          const team = allTeams.find((t: any) => String(t.id) === String(membership.teamId));
          if (!team || !team.active) continue;
          
          // Check if the team's program has chat enabled
          const program = allPrograms.find((p: any) => String(p.id) === String(team.programId));
          const chatMode = program?.chatMode || 'two_way'; // Default to enabled if not specified
          
          if (chatMode === 'disabled') continue;
          
          // Add to map if not already present
          if (!teamChatroomsMap.has(team.id)) {
            let coachName = 'Coach';
            if (team.coachId) {
              const coach = await storage.getUser(team.coachId);
              if (coach) {
                coachName = `${coach.firstName} ${coach.lastName}`;
              }
            }
            
            teamChatroomsMap.set(team.id, {
              teamId: team.id,
              teamName: team.name,
              coachId: team.coachId,
              coachName,
              chatMode,
              playerNames: [],
            });
          }
          
          // Add player name to list
          const chatroom = teamChatroomsMap.get(team.id);
          const playerName = `${player.firstName} ${player.lastName}`;
          if (!chatroom.playerNames.includes(playerName)) {
            chatroom.playerNames.push(playerName);
          }
        }
      }
      
      res.json(Array.from(teamChatroomsMap.values()));
    } catch (error: any) {
      console.error('Error fetching team chatrooms:', error);
      res.status(500).json({ error: 'Failed to fetch team chatrooms' });
    }
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
      
      const { firstName, lastName, dateOfBirth, gender, aauMembershipId, postalCode, concussionWaiverAcknowledged, clubAgreementAcknowledged, packageId, addOnIds, selectedPricingOptionId } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          success: false, 
          message: "First name and last name are required" 
        });
      }
      
      // Package selection is now optional - players can be added without enrolling in a program
      // Program enrollment happens separately in the Payments section
      
      // Child players don't need their own email - they're managed through parent's account
      // The unique email constraint only applies to parent accounts (account_holder_id IS NULL)
      
      // Create child player user
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
        packageSelected: packageId || null, // Optional now
        teamAssignmentStatus: "pending",
        hasRegistered: !packageId, // If no package, mark as registered immediately
        verified: true, // Child profiles are auto-verified through parent
        isActive: true,
        awards: [],
        totalPractices: 0,
        totalGames: 0,
        consecutiveCheckins: 0,
        videosCompleted: 0,
        yearsActive: 0,
      });
      
      // If no package selected, just return success with the new player
      if (!packageId) {
        return res.json({
          success: true,
          player: playerUser,
          message: "Player added successfully. You can enroll them in programs from the Payments section."
        });
      }
      
      // Get the selected program to check price (only if packageId provided)
      const program = await storage.getProgram(packageId);
      if (!program) {
        return res.status(404).json({ 
          success: false, 
          message: "Selected program not found" 
        });
      }
      
      // Determine the price to charge based on selected pricing option
      let priceToCharge = program.price || 0;
      let selectedPricingOption: any = null;
      let pricingOptionName = '';
      
      // Check if user selected a specific pricing option (bundle tier)
      if (selectedPricingOptionId && (program as any).pricingOptions && Array.isArray((program as any).pricingOptions)) {
        selectedPricingOption = (program as any).pricingOptions.find((opt: any) => opt.id === selectedPricingOptionId);
        if (selectedPricingOption && selectedPricingOption.price > 0) {
          priceToCharge = selectedPricingOption.price;
          pricingOptionName = selectedPricingOption.name || '';
        }
      }
      
      if (!priceToCharge || priceToCharge <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Selected program has no valid price" 
        });
      }
      
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
      
      // Check if request is from iOS native app (needs auth token in redirect URL)
      const isIOSApp = req.headers['x-client-platform'] === 'ios';
      
      // Generate short-lived auth token for iOS Stripe redirects
      let iosAuthToken = '';
      if (isIOSApp) {
        iosAuthToken = jwt.sign(
          { 
            userId: user.id, 
            organizationId: user.organizationId, 
            role: user.role,
            purpose: 'stripe_success'
          },
          process.env.JWT_SECRET!,
          { expiresIn: '10m' } // Short-lived token
        );
      }
      
      // Determine if this is a bundle that converts to monthly
      const isConvertsToMonthly = selectedPricingOption?.convertsToMonthly && 
                                   selectedPricingOption?.monthlyPrice > 0 &&
                                   selectedPricingOption?.durationDays > 0;
      
      // Build success URL - include auth token for iOS to restore session after redirect
      const successUrl = isIOSApp 
        ? `${origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}&auth_token=${iosAuthToken}`
        : `${origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      
      let session: Stripe.Checkout.Session;
      
      if (isConvertsToMonthly) {
        // BUNDLE-TO-MONTHLY FLOW
        // Use subscription mode with the monthly price
        // Bundle payment added via add_invoice_items (only charged if checkout completes)
        // Trial period covers the bundle duration, then monthly billing begins
        
        const monthlyPriceId = selectedPricingOption.monthlyStripePriceId;
        const bundleDurationDays = selectedPricingOption.durationDays;
        
        // Calculate trial end date (bundle period)
        const trialEnd = Math.floor(Date.now() / 1000) + (bundleDurationDays * 24 * 60 * 60);
        
        // Build add_invoice_items array (items added to first invoice only if checkout completes)
        // This prevents orphaned charges if user abandons checkout
        const addInvoiceItems: Stripe.Checkout.SessionCreateParams.SubscriptionData.InvoiceItem[] = [];
        
        // Track subtotal for platform fee
        let bundleSubtotal = priceToCharge;
        
        // Add bundle payment as invoice item
        // Use product if available, otherwise use product_data
        if ((program as any).stripeProductId) {
          addInvoiceItems.push({
            price_data: {
              currency: 'usd',
              product: (program as any).stripeProductId,
              unit_amount: priceToCharge,
            },
            quantity: 1,
            description: `${program.name} - ${pricingOptionName} (Bundle Payment)`,
          });
        } else {
          addInvoiceItems.push({
            price_data: {
              currency: 'usd',
              product_data: { name: `${program.name} - ${pricingOptionName}` },
              unit_amount: priceToCharge,
            },
            quantity: 1,
            description: `${program.name} - ${pricingOptionName} (Bundle Payment)`,
          });
        }
        
        // Add any add-ons as invoice items
        if (addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0) {
          for (const addOnId of addOnIds) {
            const addOn = await storage.getProgram(addOnId);
            if (addOn && addOn.productCategory === 'goods' && addOn.price && addOn.price > 0) {
              bundleSubtotal += addOn.price;
              if ((addOn as any).stripeProductId) {
                addInvoiceItems.push({
                  price_data: {
                    currency: 'usd',
                    product: (addOn as any).stripeProductId,
                    unit_amount: addOn.price,
                  },
                  quantity: 1,
                  description: addOn.name,
                });
              } else {
                addInvoiceItems.push({
                  price_data: {
                    currency: 'usd',
                    product_data: { name: addOn.name },
                    unit_amount: addOn.price,
                  },
                  quantity: 1,
                  description: addOn.name,
                });
              }
            }
          }
        }
        
        // Add platform fee (1% of bundle + add-ons)
        const platformFee = Math.round(bundleSubtotal * 0.01);
        if (platformFee > 0) {
          addInvoiceItems.push({
            price_data: {
              currency: 'usd',
              product_data: { name: 'BoxStat Platform Fee' },
              unit_amount: platformFee,
            },
            quantity: 1,
            description: 'BoxStat Platform Fee (1%)',
          });
        }
        
        // Build subscription line items (monthly price only)
        const subscriptionLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = monthlyPriceId
          ? [{ price: monthlyPriceId, quantity: 1 }]
          : [{
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `${program.name} - Monthly`,
                  description: `Monthly subscription for ${firstName} ${lastName}`,
                },
                unit_amount: selectedPricingOption.monthlyPrice,
                recurring: { interval: 'month' },
              },
              quantity: 1,
            }];
        
        session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          line_items: subscriptionLineItems,
          mode: 'subscription',
          subscription_data: {
            trial_end: trialEnd,
            add_invoice_items: addInvoiceItems,
            metadata: {
              type: 'add_player_subscription',
              playerId: playerUser.id,
              accountHolderId: id,
              packageId: packageId,
              bundlePricingOptionId: selectedPricingOptionId || '',
              bundleName: pricingOptionName || '',
            },
          },
          success_url: successUrl,
          cancel_url: `${origin}/add-player?step=5&payment=cancelled`,
          metadata: {
            type: 'add_player',
            playerId: playerUser.id,
            accountHolderId: id,
            packageId: packageId,
            selectedPricingOptionId: selectedPricingOptionId || '',
            pricingOptionName: pricingOptionName || '',
            convertsToMonthly: 'true',
            bundleDurationDays: String(bundleDurationDays),
            addOnIds: addOnIds ? JSON.stringify(addOnIds) : '',
          },
        });
        
        console.log(`Created subscription checkout for bundle-to-monthly: ${pricingOptionName} -> Monthly after ${bundleDurationDays} days`);
      } else {
        // STANDARD ONE-TIME PAYMENT FLOW
        // Build line items starting with the program
        const programLineItem: any = selectedPricingOption?.stripePriceId
          ? {
              price: selectedPricingOption.stripePriceId,
              quantity: 1,
            }
          : {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: pricingOptionName ? `${program.name} - ${pricingOptionName}` : program.name,
                  description: `Registration for ${firstName} ${lastName}`,
                },
                unit_amount: priceToCharge,
              },
              quantity: 1,
            };
        
        const lineItems: any[] = [programLineItem];
        let subtotal = priceToCharge;

        // Add any selected add-ons (validate they are goods products)
        if (addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0) {
          for (const addOnId of addOnIds) {
            const addOn = await storage.getProgram(addOnId);
            if (addOn && addOn.productCategory === 'goods' && addOn.price && addOn.price > 0) {
              subtotal += addOn.price;
              lineItems.push({
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: addOn.name,
                    description: addOn.description || `Add-on for ${firstName} ${lastName}`,
                  },
                  unit_amount: addOn.price,
                },
                quantity: 1,
              });
            }
          }
        }
        
        // Add 1% BoxStat platform fee
        const platformFee = Math.round(subtotal * 0.01);
        if (platformFee > 0) {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'BoxStat Platform Fee',
                description: '1% service fee',
              },
              unit_amount: platformFee,
            },
            quantity: 1,
          });
        }

        session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          line_items: lineItems,
          mode: 'payment',
          success_url: successUrl,
          cancel_url: `${origin}/add-player?step=5&payment=cancelled`,
          metadata: {
            type: 'add_player',
            playerId: playerUser.id,
            accountHolderId: id,
            packageId: packageId,
            selectedPricingOptionId: selectedPricingOptionId || '',
            pricingOptionName: pricingOptionName || '',
            addOnIds: addOnIds ? JSON.stringify(addOnIds) : '',
          },
        });
      }
      
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
  
  // Get child players for a user (for legacy migration claim flow)
  app.get('/api/users/:userId/children', requireAuth, async (req: any, res) => {
    try {
      const { id: requesterId, organizationId, role } = req.user;
      const { userId } = req.params;
      
      // Only allow parent role to access their own children - no admin bypass for security
      if (role !== 'parent' || userId !== requesterId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const allUsers = await storage.getUsersByOrganization(organizationId);
      const children = allUsers.filter(u => 
        u.accountHolderId === requesterId || 
        u.linkedParentId === requesterId ||
        u.parentId === requesterId
      );
      
      // Return only minimal fields needed for selection
      res.json(children.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
      })));
    } catch (error: any) {
      console.error('Error fetching children:', error);
      res.status(500).json({ error: 'Failed to fetch children', message: error.message });
    }
  });
  
  // Simple create child player (for legacy migration claim flow)
  app.post('/api/users/create-child', requireAuth, async (req: any, res) => {
    try {
      const { id, organizationId, role } = req.user;
      
      if (role !== "parent" && role !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "Only parent and admin accounts can add players" 
        });
      }
      
      const { firstName, lastName, dateOfBirth, gender } = req.body;
      
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          success: false, 
          message: "First name and last name are required" 
        });
      }
      
      // Create child player without package selection
      const playerUser = await storage.createUser({
        organizationId,
        email: null as any,
        role: "player",
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        accountHolderId: id,
        hasRegistered: false,
        verified: true,
        isActive: true,
        awards: [],
        totalPractices: 0,
        totalGames: 0,
        consecutiveCheckins: 0,
        videosCompleted: 0,
        yearsActive: 0,
      });
      
      console.log(`✅ Created child player ${playerUser.id} for parent ${id}`);
      
      res.json({
        success: true,
        player: playerUser,
        message: "Player created successfully"
      });
    } catch (error: any) {
      console.error("Create child error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to create player" 
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

  // Upload product image
  app.post('/api/upload/product-image', requireAuth, upload.single('image'), async (req: any, res) => {
    const uploadedFilePath = req.file ? path.join(uploadDir, req.file.filename) : null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Only admins can upload product images
      if (req.user.role !== 'admin') {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(403).json({ error: 'Only admins can upload product images' });
      }
      
      const filename = req.file.filename;
      const imageUrl = `/uploads/${filename}`;
      
      res.json({ 
        success: true, 
        imageUrl,
        message: 'Product image uploaded successfully' 
      });
    } catch (error: any) {
      console.error('Product image upload error:', error);
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try {
          fs.unlinkSync(uploadedFilePath);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      res.status(500).json({ error: 'Failed to upload product image', message: error.message });
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
    const allUsers = await storage.getUsersByOrganization(organizationId);
    const allTeams = await storage.getTeamsByOrganization(organizationId);
    const allPrograms = await storage.getProgramsByOrganization(organizationId);
    
    // Create maps for quick lookup
    const teamMap = new Map(allTeams.map(t => [t.id, t]));
    const programMap = new Map(allPrograms.map(p => [p.id, p]));
    
    // Fetch active team memberships for all players
    const activeMemberships = await db.select({
      profileId: teamMemberships.profileId,
      teamId: teamMemberships.teamId,
    })
      .from(teamMemberships)
      .where(eq(teamMemberships.status, 'active'));
    
    // Group memberships by profileId
    const membershipsByUser = new Map<string, number[]>();
    for (const m of activeMemberships) {
      const existing = membershipsByUser.get(m.profileId) || [];
      existing.push(m.teamId);
      membershipsByUser.set(m.profileId, existing);
    }
    
    // Separate players from non-players
    const players = allUsers.filter((u: any) => u.role === 'player');
    const nonPlayers = allUsers.filter((u: any) => u.role !== 'player');
    
    // Fetch status tags for all players in a single bulk query
    const playerIds = players.map((p: any) => p.id);
    let statusTagsMap = new Map<string, {tag: string; remainingCredits?: number; lowBalance?: boolean}>();
    
    try {
      statusTagsMap = await storage.getPlayerStatusTagsBulk(playerIds);
    } catch (error) {
      console.error('Error fetching bulk status tags:', error);
    }
    
    // Enrich players with status tags and active team memberships
    const enrichedPlayers = players.map((player: any) => {
      const statusTag = statusTagsMap.get(player.id) || { tag: player.paymentStatus === 'pending' ? 'payment_due' : 'none' };
      const activeTeamIds = membershipsByUser.get(player.id) || [];
      const activeTeams = activeTeamIds.map(teamId => {
        const team = teamMap.get(teamId);
        if (!team) return null;
        const program = team.programId ? programMap.get(team.programId) : null;
        return {
          teamId: team.id,
          teamName: team.name,
          programId: team.programId,
          programName: program?.name || null,
        };
      }).filter(Boolean);
      
      return {
        ...player,
        statusTag: statusTag.tag || 'none',
        remainingCredits: statusTag.remainingCredits,
        lowBalance: statusTag.lowBalance,
        teamIds: activeTeamIds,
        activeTeams,
      };
    });
    
    // Add explicit null statusTag to non-players for consistent sorting
    const enrichedNonPlayers = nonPlayers.map((user: any) => ({
      ...user,
      statusTag: null,
      teamIds: [],
      activeTeams: [],
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
    const userId = req.params.id;
    const updateData = req.body;
    
    // Allow coaches to only update flag-related fields
    const flagOnlyUpdate = Object.keys(updateData).every(key => 
      ['flaggedForRosterChange', 'flagReason'].includes(key)
    );
    
    if (role !== 'admin' && !(role === 'coach' && flagOnlyUpdate)) {
      return res.status(403).json({ message: 'Only admins can update users (coaches can only flag players)' });
    }
    
    console.log(`[PATCH /api/users/${userId}] Update data:`, JSON.stringify(updateData, null, 2));
    
    // If updating a player's team(s), also update team_memberships and auto-enroll in programs
    // Handle both teamId (singular) and teamIds (array) for players
    if (updateData.teamId !== undefined || updateData.teamIds !== undefined) {
      const user = await storage.getUser(userId);
      if (user && (user.role === 'player' || user.role === 'parent')) {
        // Get the list of team IDs to process - prefer teamIds array, fall back to teamId
        let newTeamIds: number[] = [];
        if (updateData.teamIds && Array.isArray(updateData.teamIds)) {
          newTeamIds = updateData.teamIds.map((id: any) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));
        } else if (updateData.teamId) {
          const parsed = parseInt(String(updateData.teamId), 10);
          if (!isNaN(parsed)) newTeamIds = [parsed];
        }
        
        // Get current team memberships for this player
        const currentMemberships = await db.select({ teamId: teamMemberships.teamId })
          .from(teamMemberships)
          .where(
            and(
              eq(teamMemberships.profileId, userId),
              eq(teamMemberships.status, 'active')
            )
          );
        const currentTeamIds = currentMemberships.map(m => m.teamId);
        
        console.log(`[PATCH] Player ${userId}: current teams=${JSON.stringify(currentTeamIds)}, new teams=${JSON.stringify(newTeamIds)}`);
        
        // Mark removed teams as inactive and cancel associated enrollments
        for (const oldTeamId of currentTeamIds) {
          if (!newTeamIds.includes(oldTeamId)) {
            console.log(`[PATCH] Marking player ${userId} as inactive on team ${oldTeamId}`);
            await db.update(teamMemberships)
              .set({ status: 'inactive' })
              .where(
                and(
                  eq(teamMemberships.teamId, oldTeamId),
                  eq(teamMemberships.profileId, userId)
                )
              );
            
            // Cancel enrollment for this team's program if exists
            const removedTeam = await storage.getTeam(String(oldTeamId));
            if (removedTeam?.programId) {
              console.log(`[PATCH] Cancelling enrollment for player ${userId} in program ${removedTeam.programId}`);
              await db.update(productEnrollments)
                .set({ status: 'cancelled' })
                .where(
                  and(
                    eq(productEnrollments.profileId, userId),
                    eq(productEnrollments.programId, removedTeam.programId),
                    eq(productEnrollments.status, 'active')
                  )
                );
            }
          }
        }
        
        // Add to new teams and auto-enroll in programs
        for (const newTeamId of newTeamIds) {
          const team = await storage.getTeam(String(newTeamId));
          if (team) {
            console.log(`[PATCH] Adding player ${userId} to team ${newTeamId} (${team.name})`);
            try {
              await db.insert(teamMemberships)
                .values({
                  teamId: newTeamId,
                  profileId: userId,
                  role: 'player',
                  status: 'active',
                })
                .onConflictDoUpdate({
                  target: [teamMemberships.teamId, teamMemberships.profileId],
                  set: { status: 'active', role: 'player' },
                });
              
              // Auto-create product enrollment if team has a programId
              if (team.programId) {
                const accountHolderId = user.accountHolderId || userId;
                
                // Check if enrollment already exists to avoid duplicates
                const existingEnrollment = await db.select({ id: productEnrollments.id })
                  .from(productEnrollments)
                  .where(
                    and(
                      eq(productEnrollments.profileId, userId),
                      eq(productEnrollments.programId, team.programId),
                      eq(productEnrollments.status, 'active')
                    )
                  )
                  .limit(1);
                
                if (existingEnrollment.length === 0) {
                  console.log(`[PATCH] Team ${team.name} has programId ${team.programId}, auto-creating enrollment for player ${userId}`);
                  try {
                    await db.insert(productEnrollments)
                      .values({
                        organizationId: organizationId,
                        programId: team.programId,
                        accountHolderId: accountHolderId,
                        profileId: userId,
                        status: 'active',
                        source: 'admin',
                      });
                    console.log(`[PATCH] Created product enrollment for player ${userId} in program ${team.programId}`);
                  } catch (enrollErr) {
                    console.error(`[PATCH] Failed to create product enrollment:`, enrollErr);
                  }
                } else {
                  console.log(`[PATCH] Player ${userId} already enrolled in program ${team.programId}, skipping`);
                }
              }
            } catch (err) {
              console.error(`[PATCH] Failed to add player to team_memberships:`, err);
            }
          } else {
            console.warn(`[PATCH] Team ${newTeamId} does not exist, skipping`);
          }
        }
        
        // Update users.teamId to the first valid team (for backward compatibility)
        if (newTeamIds.length > 0) {
          updateData.teamId = newTeamIds[0];
        } else {
          updateData.teamId = null;
        }
        // Remove teamIds from updateData to avoid updating a non-existent column
        delete updateData.teamIds;
      }
    }
    
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
    
    // Handle program enrollment changes (enrollmentsToAdd and enrollmentsToRemove)
    if (updateData.enrollmentsToRemove && Array.isArray(updateData.enrollmentsToRemove)) {
      const user = await storage.getUser(userId);
      for (const enrollmentId of updateData.enrollmentsToRemove) {
        console.log(`[PATCH] Removing enrollment ${enrollmentId} for user ${userId}`);
        // Handle both numeric and string IDs
        const numericId = parseInt(String(enrollmentId).replace('new-', ''), 10);
        if (!isNaN(numericId) && !String(enrollmentId).startsWith('new-')) {
          await db.update(productEnrollments)
            .set({ status: 'cancelled' })
            .where(eq(productEnrollments.id, numericId));
        }
      }
    }
    
    if (updateData.enrollmentsToAdd && Array.isArray(updateData.enrollmentsToAdd)) {
      const user = await storage.getUser(userId);
      const accountHolderId = user?.accountHolderId || userId;
      
      for (const programId of updateData.enrollmentsToAdd) {
        console.log(`[PATCH] Adding enrollment for user ${userId} in program ${programId}`);
        
        // Check if enrollment already exists
        const existingEnrollment = await db.select({ id: productEnrollments.id })
          .from(productEnrollments)
          .where(
            and(
              eq(productEnrollments.profileId, userId),
              eq(productEnrollments.programId, programId),
              eq(productEnrollments.status, 'active')
            )
          )
          .limit(1);
        
        if (existingEnrollment.length === 0) {
          await db.insert(productEnrollments)
            .values({
              organizationId: organizationId,
              programId: programId,
              accountHolderId: accountHolderId,
              profileId: userId,
              status: 'active',
              source: 'admin',
            });
          console.log(`[PATCH] Created enrollment for user ${userId} in program ${programId}`);
        }
      }
    }
    
    // Clean up enrollment-related fields from updateData before saving to users table
    delete updateData.enrollmentsToRemove;
    delete updateData.enrollmentsToAdd;
    delete updateData.pendingEnrollments;
    delete updateData.activeTeams;
    
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
  
  // Update emergency contact and medical info for a player (parent can update their children)
  app.patch('/api/users/:id/emergency-medical', requireAuth, async (req: any, res) => {
    try {
      const { id: requesterId, role } = req.user;
      const targetUserId = req.params.id;
      const { emergencyContact, emergencyPhone, medicalInfo, allergies } = req.body;
      
      // Get the target user
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Authorization: parent can update their children, user can update themselves, admin can update anyone
      const isOwnProfile = requesterId === targetUserId;
      const isParentOfChild = targetUser.accountHolderId === requesterId;
      const isAdmin = role === 'admin';
      
      if (!isOwnProfile && !isParentOfChild && !isAdmin) {
        return res.status(403).json({ message: 'Not authorized to update this user' });
      }
      
      // Update only the emergency/medical fields
      const updated = await storage.updateUser(targetUserId, {
        emergencyContact,
        emergencyPhone,
        medicalInfo,
        allergies,
      });
      
      res.json({ success: true, user: updated });
    } catch (error: any) {
      console.error('Error updating emergency/medical info:', error);
      res.status(500).json({ message: 'Failed to update emergency/medical info', error: error.message });
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
      
      // Helper function to cascade delete related records for a user
      const cascadeDeleteRelatedRecords = async (userIdToDelete: string) => {
        console.log(`🗑️ Cascade deleting related records for user: ${userIdToDelete}`);
        
        // 1. Delete product_enrollments where user is profile or account holder
        await db.delete(productEnrollments).where(
          sql`${productEnrollments.profileId} = ${userIdToDelete} OR ${productEnrollments.accountHolderId} = ${userIdToDelete}`
        );
        
        // 2. Delete waiver_signatures where user is profile or signer
        await db.delete(waiverSignatures).where(
          sql`${waiverSignatures.profileId} = ${userIdToDelete} OR ${waiverSignatures.signedBy} = ${userIdToDelete}`
        );
        
        // 3. teams.coach_id has SET NULL rule in DB, so no action needed here
        
        // 4. Update user_awards to set awardedBy to null where this user awarded someone
        // (the userId FK has cascade, but awardedBy doesn't)
        await db.update(userAwards)
          .set({ awardedBy: null })
          .where(eq(userAwards.awardedBy, userIdToDelete));
        
        // 5. Delete team_memberships (should be handled by cascade, but explicit for safety)
        await db.delete(teamMemberships).where(eq(teamMemberships.profileId, userIdToDelete));
        
        console.log(`✅ Cascade delete completed for user: ${userIdToDelete}`);
      };
      
      // Delete all profiles with the same email and their children
      for (const emailUser of sameEmailUsers) {
        if (deletedIds.has(emailUser.id)) continue;
        
        // Get all children of this user
        const childUsers = allUsers.filter((u: any) => u.accountHolderId === emailUser.id);
        
        // Delete all child profiles first
        for (const child of childUsers) {
          if (deletedIds.has(child.id)) continue;
          
          // Cascade delete related records for child
          await cascadeDeleteRelatedRecords(child.id);
          
          if (child.email) {
            await storage.deletePendingRegistration(child.email, child.organizationId);
          }
          await storage.deleteUser(child.id);
          deletedIds.add(child.id);
        }
        
        // Cascade delete related records for this user
        await cascadeDeleteRelatedRecords(emailUser.id);
        
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
      
      let teamId = user.teamId;
      
      // If user.teamId is not set, check team_memberships table as fallback
      if (!teamId) {
        const activeMembership = await db.select({ teamId: teamMemberships.teamId })
          .from(teamMemberships)
          .where(
            and(
              eq(teamMemberships.profileId, userId),
              eq(teamMemberships.status, 'active')
            )
          )
          .limit(1);
        
        if (activeMembership.length > 0) {
          teamId = activeMembership[0].teamId;
        }
      }
      
      if (!teamId) {
        return res.json(null);
      }
      
      // Get the team details - ensure teamId is converted to string
      const teamIdString = String(teamId);
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
      
      // Query team_memberships table for this user's ACTIVE teams only
      const memberships = await db
        .select({
          teamId: teamMemberships.teamId,
          role: teamMemberships.role,
          status: teamMemberships.status,
        })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.profileId, userId),
            eq(teamMemberships.status, 'active')
          )
        );
      
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
      const programs = await storage.getProgramsByOrganization(organizationId);
      
      // Create a map of program IDs to program names for quick lookup
      const programNameMap = new Map(programs.map(p => [p.id, p.name]));
      
      // Add roster count and program name to each team
      const teamsWithExtras = await Promise.all(
        teams.map(async (team) => {
          const roster = await storage.getUsersByTeam(String(team.id));
          return {
            ...team,
            rosterCount: roster.length,
            program: team.programId ? programNameMap.get(team.programId) || null : null,
          };
        })
      );
      
      res.json(teamsWithExtras);
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
  
  // Coordinator endpoint: Create team with player assignments and auto-enrollment
  app.post('/api/teams/with-assignments', requireAuth, async (req: any, res) => {
    const { role, organizationId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can use this endpoint' });
    }
    
    const { teamData, playerIds = [] } = req.body;
    
    try {
      // 1. Create the team
      const parsedTeamData = insertTeamSchema.parse(teamData);
      const team = await storage.createTeam(parsedTeamData);
      
      if (!team?.id) {
        return res.status(500).json({ message: 'Failed to create team' });
      }
      
      const results = {
        team,
        assignments: { success: [] as string[], failed: [] as string[] },
        enrollments: { success: [] as string[], failed: [] as string[] },
      };
      
      // 2. Assign players and create enrollments
      for (const playerId of playerIds) {
        try {
          // Get the player to find their parent account
          const player = await storage.getUser(playerId);
          if (!player) {
            results.assignments.failed.push(playerId);
            continue;
          }
          
          // Create team membership
          await db.insert(teamMemberships)
            .values({
              teamId: team.id,
              profileId: playerId,
              role: 'player',
              status: 'active',
              jerseyNumber: player.jerseyNumber,
              position: player.position,
            })
            .onConflictDoUpdate({
              target: [teamMemberships.teamId, teamMemberships.profileId],
              set: { status: 'active', role: 'player' },
            });
          
          // Update legacy teamId field
          await storage.updateUser(playerId, { teamId: team.id } as any);
          results.assignments.success.push(playerId);
          
          // 3. Create product enrollment if team has a programId
          if (team.programId) {
            try {
              const accountHolderId = player.parentId || playerId;
              
              // Check if enrollment already exists
              const [existingEnrollment] = await db.select()
                .from(productEnrollments)
                .where(
                  and(
                    eq(productEnrollments.programId, team.programId),
                    eq(productEnrollments.profileId, playerId)
                  )
                );
              
              if (!existingEnrollment) {
                await db.insert(productEnrollments)
                  .values({
                    organizationId: organizationId || team.organizationId || 'default-org',
                    programId: team.programId,
                    accountHolderId: accountHolderId,
                    profileId: playerId,
                    status: 'active',
                    source: 'admin',
                    autoRenew: false,
                  });
                results.enrollments.success.push(playerId);
              } else {
                // Already enrolled, count as success
                results.enrollments.success.push(playerId);
              }
            } catch (enrollErr) {
              console.error(`Failed to enroll player ${playerId}:`, enrollErr);
              results.enrollments.failed.push(playerId);
            }
          }
        } catch (assignErr) {
          console.error(`Failed to assign player ${playerId}:`, assignErr);
          results.assignments.failed.push(playerId);
        }
      }
      
      res.json(results);
    } catch (error: any) {
      console.error('Error in team creation with assignments:', error);
      res.status(500).json({ message: error.message || 'Failed to create team with assignments' });
    }
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

  // Get team roster (simple version for edit dialogs)
  app.get('/api/teams/:teamId/roster', requireAuth, async (req: any, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }

      // Get active team memberships for players
      const memberships = await db.select({
        playerId: teamMemberships.profileId,
        role: teamMemberships.role,
      })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.status, 'active'),
            eq(teamMemberships.role, 'player')
          )
        );

      res.json(memberships);
    } catch (error: any) {
      console.error('Error fetching team roster:', error);
      res.status(500).json({ message: 'Failed to fetch team roster' });
    }
  });

  // Update team roster (bulk update)
  app.put('/api/teams/:teamId/roster', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Only admins and coaches can update rosters' });
      }

      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }

      const { playerIds } = req.body;
      if (!Array.isArray(playerIds)) {
        return res.status(400).json({ message: 'playerIds must be an array' });
      }

      // Get the team to verify it exists
      const team = await storage.getTeam(String(teamId));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Get current player memberships
      const currentMemberships = await db.select({ playerId: teamMemberships.profileId })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.status, 'active'),
            eq(teamMemberships.role, 'player')
          )
        );
      const currentPlayerIds = currentMemberships.map(m => m.playerId);

      // Players to remove
      for (const oldPlayerId of currentPlayerIds) {
        if (!playerIds.includes(oldPlayerId)) {
          await db.update(teamMemberships)
            .set({ status: 'inactive' })
            .where(
              and(
                eq(teamMemberships.teamId, teamId),
                eq(teamMemberships.profileId, oldPlayerId),
                eq(teamMemberships.role, 'player')
              )
            );

          // Cancel enrollment if team has a program
          if (team.programId) {
            await db.update(productEnrollments)
              .set({ status: 'cancelled' })
              .where(
                and(
                  eq(productEnrollments.programId, team.programId),
                  eq(productEnrollments.profileId, oldPlayerId)
                )
              );
          }
        }
      }

      // Players to add
      for (const newPlayerId of playerIds) {
        if (!currentPlayerIds.includes(newPlayerId)) {
          const player = await storage.getUser(newPlayerId);
          if (!player) continue;

          // Add to team_memberships
          await db.insert(teamMemberships)
            .values({
              teamId,
              profileId: newPlayerId,
              role: 'player',
              status: 'active',
              jerseyNumber: player.jerseyNumber,
              position: player.position,
            })
            .onConflictDoUpdate({
              target: [teamMemberships.teamId, teamMemberships.profileId],
              set: { status: 'active', role: 'player' },
            });

          // Auto-enroll in program if team has one
          if (team.programId) {
            const accountHolderId = player.accountHolderId || player.id;
            const existingEnrollments = await storage.getEnrollmentsByAccountHolder(accountHolderId);
            const alreadyEnrolled = existingEnrollments.some(
              (e: any) => e.programId === team.programId && e.profileId === newPlayerId && e.status === 'active'
            );

            if (!alreadyEnrolled) {
              await storage.createEnrollment({
                organizationId: team.organizationId || organizationId,
                programId: team.programId,
                accountHolderId,
                profileId: newPlayerId,
                status: 'active',
              });
            }
          }
        }
      }

      // Invalidate caches by returning success
      res.json({ success: true, playerIds });
    } catch (error: any) {
      console.error('Error updating team roster:', error);
      res.status(500).json({ message: 'Failed to update team roster' });
    }
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
      
      // Get users assigned to this team and filter to only players
      const allTeamUsers = await storage.getUsersByTeam(teamId);
      const appUsers = allTeamUsers.filter(u => u.role === 'player');
      
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
          flaggedForRosterChange: user.flaggedForRosterChange || false,
          flagReason: user.flagReason || null,
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
      
      // Auto-enroll player if team has a programId
      if (team.programId) {
        // Get the account holder ID
        const accountHolderId = player.accountHolderId || player.id;
        
        // Check if already enrolled in this program
        const existingEnrollments = await storage.getEnrollmentsByAccountHolder(accountHolderId);
        const alreadyEnrolled = existingEnrollments.some(
          (e: any) => e.programId === team.programId && e.profileId === playerId && e.status === 'active'
        );
        
        if (!alreadyEnrolled) {
          await storage.createEnrollment({
            organizationId: team.organizationId || organizationId,
            programId: team.programId,
            accountHolderId: accountHolderId,
            profileId: playerId,
            status: 'active',
            source: 'team_assignment',
          });
          console.log(`Auto-enrolled player ${playerId} in program ${team.programId}`);
        }
      }
      
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

      // Get the team to check if it has a programId
      const team = await storage.getTeam(teamId);
      
      // Remove from team_memberships table
      await db.delete(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamIdNum),
            eq(teamMemberships.profileId, playerId)
          )
        );
      
      // Cancel enrollment for this player if team has a programId
      if (team && team.programId) {
        await db.update(productEnrollments)
          .set({ status: 'cancelled', autoRenew: false, updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(productEnrollments.programId, team.programId),
              eq(productEnrollments.profileId, playerId)
            )
          );
        console.log(`Cancelled enrollment for player ${playerId} in program ${team.programId}`);
      }
      
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
      
      // Enrich teams with program information
      const enrichedTeams = await Promise.all(teams.map(async (team) => {
        let programName = null;
        if (team.programId) {
          const program = await storage.getProgram(String(team.programId));
          if (program) {
            programName = program.name;
          }
        }
        return {
          ...team,
          programName,
        };
      }));
      
      res.json(enrichedTeams);
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
  
  // Helper function to get team, division, and program IDs for a user based on their role
  async function getUserEventScope(userId: string, role: string, organizationId: string, childProfileId?: string) {
    let teamIds: (string | number)[] = [];
    let divisionIds: (string | number)[] = [];
    let programIds: (string | number)[] = [];
    let targetUserId = userId;
    
    if (childProfileId) {
      // Player Mode: Viewing as a specific child - only show that child's events
      const childProfile = await storage.getUser(childProfileId);
      if (childProfile) {
        // Check legacy teamId field
        if (childProfile.teamId) {
          teamIds.push(childProfile.teamId);
          const team = await storage.getTeam(String(childProfile.teamId));
          if (team?.programId) programIds.push(team.programId);
        }
        
        // Also check team_memberships table for active memberships
        const memberships = await storage.getTeamMembershipsByProfile(childProfileId);
        for (const membership of memberships) {
          if (membership.status === 'active' && membership.teamId) {
            teamIds.push(membership.teamId);
            const team = await storage.getTeam(String(membership.teamId));
            if (team?.programId) programIds.push(team.programId);
          }
        }
        
        if (childProfile.divisionId) divisionIds = [childProfile.divisionId];
        targetUserId = childProfileId;
        
        // Deduplicate
        teamIds = [...new Set(teamIds.map(String))];
        programIds = [...new Set(programIds.map(String))];
      }
    } else if (role === 'parent') {
      // Parent Mode: Show events from ALL children's teams + parent's own events
      const allUsersInOrg = await storage.getUsersByOrganization(organizationId);
      const childProfiles = allUsersInOrg.filter(u => u.parentId === userId || u.guardianId === userId);
      
      // Collect all team IDs, division IDs, and program IDs from children
      for (const child of childProfiles) {
        // Check legacy teamId field
        if (child.teamId) {
          teamIds.push(child.teamId);
          const team = await storage.getTeam(String(child.teamId));
          if (team?.programId) programIds.push(team.programId);
        }
        
        // Also check team_memberships table for active memberships
        const childMemberships = await storage.getTeamMembershipsByProfile(child.id);
        for (const membership of childMemberships) {
          if (membership.status === 'active' && membership.teamId) {
            teamIds.push(membership.teamId);
            const team = await storage.getTeam(String(membership.teamId));
            if (team?.programId) programIds.push(team.programId);
          }
        }
        
        if (child.divisionId) divisionIds.push(child.divisionId);
      }
      
      // Also include parent's own team/division if they have one
      const userProfile = await storage.getUser(userId);
      if (userProfile?.teamId) {
        teamIds.push(userProfile.teamId);
        const team = await storage.getTeam(String(userProfile.teamId));
        if (team?.programId) programIds.push(team.programId);
      }
      if (userProfile?.divisionId) divisionIds.push(userProfile.divisionId);
      
      // Deduplicate team, division, and program IDs
      teamIds = [...new Set(teamIds.map(String))];
      divisionIds = [...new Set(divisionIds.map(String))];
      programIds = [...new Set(programIds.map(String))];
    } else if (role === 'coach') {
      // Coach: Get all teams they're assigned to (as head coach or assistant)
      const coachTeams = await storage.getTeamsByCoach(userId);
      teamIds = coachTeams.map(team => team.id);
      
      // Also collect division IDs and program IDs from those teams
      for (const team of coachTeams) {
        if (team.divisionId) divisionIds.push(team.divisionId);
        if (team.programId) programIds.push(team.programId);
      }
      
      // Deduplicate
      teamIds = [...new Set(teamIds.map(String))];
      divisionIds = [...new Set(divisionIds.map(String))];
      programIds = [...new Set(programIds.map(String))];
    } else {
      // Regular user (player): Use their own team/division
      const userProfile = await storage.getUser(userId);
      if (userProfile) {
        // Check legacy teamId field
        if (userProfile.teamId) {
          teamIds.push(userProfile.teamId);
          const team = await storage.getTeam(String(userProfile.teamId));
          if (team?.programId) programIds.push(team.programId);
        }
        
        // Also check team_memberships table for active memberships
        const memberships = await storage.getTeamMembershipsByProfile(userId);
        for (const membership of memberships) {
          if (membership.status === 'active' && membership.teamId) {
            teamIds.push(membership.teamId);
            const team = await storage.getTeam(String(membership.teamId));
            if (team?.programId) programIds.push(team.programId);
          }
        }
        
        if (userProfile.divisionId) divisionIds = [userProfile.divisionId];
      }
      
      // Deduplicate
      teamIds = [...new Set(teamIds.map(String))];
      programIds = [...new Set(programIds.map(String))];
    }
    
    return { teamIds, divisionIds, programIds, targetUserId };
  }
  
  // Helper function to filter events based on visibility and assignment
  function filterEventsByScope(
    events: any[],
    role: string,
    teamIds: (string | number)[],
    divisionIds: (string | number)[],
    programIds: (string | number)[],
    targetUserId: string,
    debug = false,
    hasLinkedPlayers = false
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
      
      // Parents with linked players should also see events targeted at 'player' role
      // This allows parents to see their children's events
      if (role === 'parent' && hasLinkedPlayers) {
        if (visibility.roles?.includes('player') || assignTo.roles?.includes('player')) {
          if (debug) console.log(`    ✅ MATCH: Parent sees player-targeted event (has linked players)`);
          return true;
        }
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
      
      // Check program-based visibility (check all program IDs)
      for (const programId of programIds) {
        if (visibility.programs?.includes(String(programId)) || assignTo.programs?.includes(String(programId))) {
          if (debug) console.log(`    ✅ MATCH: Program ${programId}`);
          return true;
        }
      }
      
      // Check user-specific assignment (handle both string and number IDs)
      const userIdStr = String(targetUserId);
      const assignToUsers = assignTo.users?.map((id: any) => String(id)) || [];
      const visibilityUsers = visibility.users?.map((id: any) => String(id)) || [];
      
      if (assignToUsers.includes(userIdStr) || visibilityUsers.includes(userIdStr)) {
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
    const { childProfileId, context } = req.query;
    const allEvents = await storage.getEventsByOrganization(organizationId);
    
    console.log('🔍 EVENT FILTERING DEBUG - Start');
    console.log('  userId:', userId);
    console.log('  role:', role);
    console.log('  childProfileId:', childProfileId);
    console.log('  context:', context);
    
    // Admins see all events ONLY when on the admin dashboard, NOT the parent/unified account page
    // If context=parent is passed, aggregate events for linked players instead
    if (role === 'admin' && !childProfileId && context !== 'parent') {
      console.log('  Admin viewing admin dashboard - showing all events');
      return res.json(allEvents);
    }
    
    // For admins in parent context (unified account page), aggregate events for all linked players
    if (role === 'admin' && !childProfileId && context === 'parent') {
      console.log('  Admin in parent context - aggregating events for linked players');
      
      // Get all linked players for this admin
      const linkedPlayers = await storage.getPlayersByParent(userId);
      
      if (linkedPlayers.length === 0) {
        console.log('  No linked players found - returning empty');
        return res.json([]);
      }
      
      // Aggregate events from all linked players
      const aggregatedEventIds = new Set<string>();
      const aggregatedEvents: typeof allEvents = [];
      
      for (const player of linkedPlayers) {
        // Get event scope for each player
        const { teamIds, divisionIds, programIds, targetUserId } = await getUserEventScope(
          userId,
          'parent', // Use parent logic for each child
          organizationId,
          player.id
        );
        
        console.log(`  Child ${player.id} scope - teams: [${teamIds}], programs: [${programIds}]`);
        
        // Filter events for this player
        const playerEvents = filterEventsByScope(allEvents, 'parent', teamIds, divisionIds, programIds, targetUserId, false, true);
        
        // Add to aggregated list (dedupe by ID)
        for (const event of playerEvents) {
          const eventId = String(event.id);
          if (!aggregatedEventIds.has(eventId)) {
            aggregatedEventIds.add(eventId);
            aggregatedEvents.push(event);
          }
        }
      }
      
      console.log(`  Aggregated ${aggregatedEvents.length} unique events for ${linkedPlayers.length} players`);
      console.log('🔍 EVENT FILTERING DEBUG - End\n');
      return res.json(aggregatedEvents);
    }
    
    // Verify user exists to prevent data leaks
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.json([]);
    }
    
    // Get user's event scope (teams, divisions, programs, target user ID)
    const { teamIds, divisionIds, programIds, targetUserId } = await getUserEventScope(
      userId,
      role,
      organizationId,
      childProfileId as string | undefined
    );
    
    console.log('  teamIds collected:', teamIds);
    console.log('  divisionIds collected:', divisionIds);
    console.log('  programIds collected:', programIds);
    console.log('  targetUserId:', targetUserId);
    console.log('  Total events to filter:', allEvents.length);
    
    // For parents, check if they have linked players (to show player-targeted events)
    // Check both team/program membership AND direct player links
    let hasLinkedPlayers = false;
    if (role === 'parent') {
      // First check if there are teams/programs (players with assignments)
      hasLinkedPlayers = teamIds.length > 0 || programIds.length > 0 || divisionIds.length > 0;
      
      // Also check for linked players directly (even if they don't have team assignments yet)
      if (!hasLinkedPlayers) {
        const linkedPlayers = await storage.getPlayersByParent(userId);
        hasLinkedPlayers = linkedPlayers.length > 0;
      }
    }
    console.log('  hasLinkedPlayers:', hasLinkedPlayers);
    
    // Filter events using shared helper
    const filteredEvents = filterEventsByScope(allEvents, role, teamIds, divisionIds, programIds, targetUserId, true, hasLinkedPlayers);
    
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
    
    // Get user's event scope (teams, divisions, programs, target user ID)
    const { teamIds, divisionIds, programIds, targetUserId } = await getUserEventScope(
      userId,
      role,
      organizationId,
      childProfileId as string | undefined
    );
    
    // For parents, check if they have linked players (including those without team assignments)
    let hasLinkedPlayers = false;
    if (role === 'parent') {
      hasLinkedPlayers = teamIds.length > 0 || programIds.length > 0 || divisionIds.length > 0;
      if (!hasLinkedPlayers) {
        const linkedPlayers = await storage.getPlayersByParent(userId);
        hasLinkedPlayers = linkedPlayers.length > 0;
      }
    }
    
    // Filter events using shared helper
    const filteredEvents = filterEventsByScope(allEvents, role, teamIds, divisionIds, programIds, targetUserId, false, hasLinkedPlayers);
    
    res.json(filteredEvents);
  });
  
  // Get coach's primary team
  app.get('/api/coach/team', requireAuth, async (req: any, res) => {
    const { id: userId, role } = req.user;
    
    // Only coaches can access this endpoint
    if (role !== 'coach') {
      return res.status(403).json({ message: 'Only coaches can access this endpoint' });
    }
    
    try {
      // Get all teams the coach is assigned to
      const coachTeams = await storage.getTeamsByCoach(userId);
      
      if (coachTeams.length === 0) {
        return res.json(null);
      }
      
      // Return the first team as the "primary" team
      // Include program info if available
      const primaryTeam = coachTeams[0];
      let programName = null;
      
      if (primaryTeam.programId) {
        const program = await storage.getProgram(String(primaryTeam.programId));
        if (program) {
          programName = program.name;
        }
      }
      
      res.json({
        id: primaryTeam.id,
        name: primaryTeam.name,
        ageGroup: primaryTeam.ageGroup || null,
        programId: primaryTeam.programId,
        programName: programName,
        divisionId: primaryTeam.divisionId,
        coachId: primaryTeam.coachId,
        assistantCoachIds: primaryTeam.assistantCoachIds || [],
      });
    } catch (error: any) {
      console.error('Error fetching coach primary team:', error);
      res.status(500).json({ message: 'Failed to fetch coach team' });
    }
  });
  
  // Coach-specific events endpoint (delegates to shared filtering logic)
  app.get('/api/coach/events', requireAuth, async (req: any, res) => {
    const { organizationId, id: sessionUserId, role: sessionRole } = req.user;
    
    // Support profile switching: use profileId query param if provided, otherwise use session user
    const profileId = req.query.profileId as string | undefined;
    let effectiveUserId = sessionUserId;
    let effectiveRole = sessionRole;
    
    // If profileId is provided, validate it belongs to the current user's account
    if (profileId && profileId !== sessionUserId) {
      const profile = await storage.getUser(profileId);
      if (profile && profile.role === 'coach') {
        // Verify the profile belongs to this user (same email or is linked)
        const sessionUser = await storage.getUser(sessionUserId);
        if (sessionUser && (profile.email === sessionUser.email || 
            profile.accountHolderId === sessionUserId || 
            profile.parentId === sessionUserId)) {
          effectiveUserId = profileId;
          effectiveRole = 'coach';
        }
      }
    }
    
    // Only coaches can access this endpoint
    if (effectiveRole !== 'coach') {
      return res.status(403).json({ message: 'Only coaches can access this endpoint' });
    }
    
    const allEvents = await storage.getEventsByOrganization(organizationId);
    
    // Use shared helper to get coach's event scope
    const { teamIds, divisionIds, programIds, targetUserId } = await getUserEventScope(
      effectiveUserId,
      effectiveRole,
      organizationId
    );
    
    console.log(`🔍 Coach events debug for ${effectiveUserId}:`);
    console.log(`   Teams: [${teamIds.join(', ')}]`);
    console.log(`   Divisions: [${divisionIds.join(', ')}]`);
    console.log(`   Programs: [${programIds.join(', ')}]`);
    console.log(`   Total events in org: ${allEvents.length}`);
    
    // Filter events using shared helper
    const filteredEvents = filterEventsByScope(allEvents, effectiveRole, teamIds, divisionIds, programIds, targetUserId, false);
    
    console.log(`   Filtered events: ${filteredEvents.length}`);
    
    res.json(filteredEvents);
  });
  
  app.get('/api/events/team/:teamId', requireAuth, async (req: any, res) => {
    const events = await storage.getEventsByTeam(req.params.teamId);
    res.json(events);
  });
  
  app.get('/api/events/:eventId/participants', requireAuth, async (req: any, res) => {
    const { role: userRole, organizationId, id: userId } = req.user;
    const { eventId } = req.params;
    
    // SECURITY: Always use the authenticated user's actual role - no client override allowed
    // The viewerRole query param is ignored for security reasons
    
    // Get the event to check its assignTo/visibility configuration
    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get all users in the organization
    const allUsers = await storage.getUsersByOrganization(organizationId);
    
    // Filter users based on event visibility configuration
    const assignTo = event.assignTo || {} as any;
    const visibility = event.visibility || {} as any;
    
    // Build a set of user IDs who are in targeted programs (via team_memberships or product_enrollments)
    let programMemberUserIds = new Set<string>();
    const targetedPrograms = [...(assignTo.programs || []), ...(visibility.programs || [])];
    
    if (targetedPrograms.length > 0) {
      // Get all teams that belong to the targeted programs
      const allTeams = await storage.getTeamsByOrganization(organizationId);
      const programTeamIds = allTeams
        .filter((t: any) => t.programId && targetedPrograms.includes(String(t.programId)))
        .map((t: any) => t.id);
      
      // Get all users who are members of teams in the targeted programs
      // Using getUsersByTeam for each team to get the members
      for (const teamId of programTeamIds) {
        const teamUsers = await storage.getUsersByTeam(String(teamId));
        teamUsers.forEach((user: any) => {
          programMemberUserIds.add(user.id);
        });
      }
      
      // Also check product_enrollments for direct program enrollment
      const enrollments = await storage.getProductEnrollmentsByOrganization(organizationId);
      enrollments.forEach((e: any) => {
        if (e.status === 'active' && targetedPrograms.includes(String(e.programId))) {
          if (e.profileId) {
            programMemberUserIds.add(e.profileId);
          }
        }
      });
    }
    
    // If event has a specific teamId, get that team's members
    let teamMemberIds = new Set<string>();
    if (event.teamId) {
      const teamUsers = await storage.getUsersByTeam(String(event.teamId));
      teamUsers.forEach((user: any) => teamMemberIds.add(user.id));
    }
    
    // Build a set of user IDs who are in targeted teams (via team_memberships)
    let targetedTeamMemberIds = new Set<string>();
    const targetedTeams = [...(assignTo.teams || []), ...(visibility.teams || [])];
    
    if (targetedTeams.length > 0) {
      for (const teamId of targetedTeams) {
        const teamUsers = await storage.getUsersByTeam(String(teamId));
        teamUsers.forEach((user: any) => {
          targetedTeamMemberIds.add(user.id);
        });
      }
    }
    
    // Check if event has any explicit targeting configured (must have non-empty arrays, not strings or other values)
    const hasNonEmptyArray = (val: any): boolean => {
      if (!val) return false;
      if (!Array.isArray(val)) return false;
      return val.length > 0;
    };
    const hasExplicitTargeting = 
        hasNonEmptyArray(assignTo?.users) || hasNonEmptyArray(assignTo?.teams) || 
        hasNonEmptyArray(assignTo?.divisions) || hasNonEmptyArray(assignTo?.roles) || hasNonEmptyArray(assignTo?.programs) ||
        hasNonEmptyArray(visibility?.users) || hasNonEmptyArray(visibility?.teams) || hasNonEmptyArray(visibility?.divisions) || 
        hasNonEmptyArray(visibility?.roles) || hasNonEmptyArray(visibility?.programs);
    
    console.log(`📋 Participants filter for event ${eventId}:`, {
      teamId: event.teamId,
      hasExplicitTargeting,
      assignTo,
      visibility,
      teamMemberCount: teamMemberIds.size,
      targetedTeams,
      targetedTeamMemberCount: targetedTeamMemberIds.size,
      allUsersCount: allUsers.length
    });
    
    // Filter users who are invited to the event
    let invitedUsers = allUsers.filter((user: any) => {
      // If event is linked to a specific team AND has no other targeting, show only team members
      if (event.teamId && !hasExplicitTargeting) {
        return teamMemberIds.has(user.id);
      }
      
      // If event has no targeting and no teamId, include all roles that are in participationRoles (or all players by default)
      if (!hasExplicitTargeting && !event.teamId) {
        // Default: show all players if no targeting specified
        const participationRoles = event.participationRoles || ['player'];
        return participationRoles.includes(user.role);
      }
      
      // When teams are targeted via assignTo.teams/visibility.teams, ONLY include team members
      // This is a strict filter - teams take precedence over roles
      if (targetedTeams.length > 0) {
        // User must be a member of one of the targeted teams (via team_memberships)
        return targetedTeamMemberIds.has(user.id);
      }
      
      // When programs are targeted, ONLY include users who are members of those programs
      // This is a strict filter - programs take precedence over roles
      if (targetedPrograms.length > 0) {
        // User must be a member of one of the targeted programs
        if (!programMemberUserIds.has(user.id)) {
          return false;
        }
        // If they're in the program, include them (don't need to check other criteria)
        return true;
      }
      
      // For non-program/team-based targeting, use OR logic for other filters
      // Check user-specific assignment
      if (assignTo.users?.includes(user.id)) {
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
      
      // Special case: For parent-targeted events, also include admins who have linked children
      // (admin accounts with children are effectively "parents" too)
      const targetedRoles = [...(assignTo.roles || []), ...(visibility.roles || [])];
      if (targetedRoles.includes('parent') && user.role === 'admin') {
        // Check if this admin has any linked children
        const hasChildren = allUsers.some((u: any) => 
          u.parentId === user.id || u.guardianId === user.id
        );
        if (hasChildren) {
          return true;
        }
      }
      
      return false;
    });
    
    // Role-based participant filtering based on authenticated user's ACTUAL role (not client-provided)
    if (userRole === 'player') {
      // Players can only see other players in the participant list
      invitedUsers = invitedUsers.filter((user: any) => user.role === 'player');
    } else if (userRole === 'parent') {
      // Parents see players (their children and others) and other parents
      // Filter out admins and coaches from parent view
      invitedUsers = invitedUsers.filter((user: any) => 
        user.role === 'player' || user.role === 'parent'
      );
    }
    // Admins and coaches see everyone
    
    // Return structured response with role groupings for admin/coach views
    if (userRole === 'admin' || userRole === 'coach') {
      const grouped = {
        players: invitedUsers.filter((u: any) => u.role === 'player'),
        parents: invitedUsers.filter((u: any) => u.role === 'parent'),
        coaches: invitedUsers.filter((u: any) => u.role === 'coach'),
        admins: invitedUsers.filter((u: any) => u.role === 'admin'),
        all: invitedUsers,
      };
      return res.json(grouped);
    }
    
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
      const { method, qr, ...restBody } = req.body;
      const attendanceData = insertAttendanceSchema.parse(restBody);
      
      // Get user role for location bypass check
      const userRole = req.user?.role;
      
      // Handle QR code check-in (bypasses location check)
      if (method === 'qr' && qr) {
        try {
          const qrData = typeof qr === 'string' ? JSON.parse(qr) : qr;
          const { event: qrEventId, nonce, exp } = qrData;
          
          // Validate QR code
          if (!qrEventId || !nonce || !exp) {
            return res.status(400).json({
              error: 'Invalid QR code',
              message: 'The QR code is missing required information.',
            });
          }
          
          // Check expiry (QR codes valid for 5 minutes)
          const expTime = parseInt(exp);
          if (isNaN(expTime) || Date.now() > expTime) {
            return res.status(400).json({
              error: 'QR code expired',
              message: 'This QR code has expired. Please ask your coach to generate a new one.',
            });
          }
          
          // Validate event ID matches
          if (String(qrEventId) !== String(attendanceData.eventId)) {
            return res.status(400).json({
              error: 'Wrong event',
              message: 'This QR code is for a different event.',
            });
          }
          
          // QR code is valid - proceed with check-in (skip location check)
          console.log(`✅ QR check-in validated for event ${attendanceData.eventId}, user ${attendanceData.userId}`);
        } catch (qrError) {
          return res.status(400).json({
            error: 'Invalid QR code',
            message: 'Failed to parse QR code data.',
          });
        }
      } else if (userRole !== 'admin' && userRole !== 'coach') {
        // Location validation (skip for admin/coach and QR check-ins)
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
  
  // Proxy check-in: Parents can check in their linked players
  app.post('/api/attendances/proxy', requireAuth, async (req: any, res) => {
    try {
      const { id: parentId, role, organizationId } = req.user;
      const { playerId, eventId: rawEventId, latitude, longitude } = req.body;
      
      // Normalize eventId to number
      const eventId = typeof rawEventId === 'number' ? rawEventId : parseInt(String(rawEventId));
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId' });
      }
      
      // Validate required fields
      if (!playerId) {
        return res.status(400).json({ error: 'Missing required field: playerId' });
      }
      
      // Validate parent role
      if (role !== 'parent' && role !== 'admin') {
        return res.status(403).json({ 
          error: 'Unauthorized', 
          message: 'Only parents or admins can perform proxy check-ins' 
        });
      }
      
      // Get the event
      const event = await storage.getEvent(String(eventId));
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Check if proxy check-ins are allowed for this event
      const proxyRoles = event.proxyCheckinRoles || ['parent']; // Default: parents can proxy
      if (!proxyRoles.includes(role) && role !== 'admin') {
        return res.status(403).json({
          error: 'Proxy check-in not allowed',
          message: 'This event does not allow proxy check-ins from your role.'
        });
      }
      
      // Validate check-in window
      const eventWindows = await storage.getEventWindowsByEvent(eventId);
      const now = new Date();
      const eventStart = new Date(event.startTime);
      
      // Calculate check-in window times
      const checkinOpenWindow = eventWindows.find((w: any) => w.windowType === 'checkin' && w.openRole === 'open');
      const checkinCloseWindow = eventWindows.find((w: any) => w.windowType === 'checkin' && w.openRole === 'close');
      
      // Helper to calculate offset from event start
      const offsetFromStart = (amount: number, unit: string, direction: string) => {
        let ms = amount;
        if (unit === 'minutes') ms *= 60 * 1000;
        else if (unit === 'hours') ms *= 60 * 60 * 1000;
        else if (unit === 'days') ms *= 24 * 60 * 60 * 1000;
        return direction === 'before' 
          ? new Date(eventStart.getTime() - ms)
          : new Date(eventStart.getTime() + ms);
      };
      
      // Default: check-in opens 30 minutes before, closes far in future
      const checkinOpen = checkinOpenWindow 
        ? offsetFromStart(checkinOpenWindow.amount, checkinOpenWindow.unit, checkinOpenWindow.direction)
        : new Date(eventStart.getTime() - 30 * 60 * 1000);
      const checkinClose = checkinCloseWindow
        ? offsetFromStart(checkinCloseWindow.amount, checkinCloseWindow.unit, checkinCloseWindow.direction)
        : new Date(eventStart.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
      
      // Check if check-in window is open (admins bypass window check)
      if (role !== 'admin' && (now < checkinOpen || now > checkinClose)) {
        const status = now < checkinOpen ? 'not yet open' : 'closed';
        return res.status(400).json({
          error: 'Check-in window ' + status,
          message: status === 'not yet open'
            ? `Check-in opens at ${checkinOpen.toLocaleTimeString()}`
            : `Check-in closed at ${checkinClose.toLocaleTimeString()}`,
          checkinOpen: checkinOpen.toISOString(),
          checkinClose: checkinClose.toISOString(),
        });
      }
      
      // Get the player to verify they exist and are a player
      const player = await storage.getUser(playerId);
      if (!player || player.role !== 'player') {
        return res.status(400).json({
          error: 'Invalid player',
          message: 'The specified player was not found.'
        });
      }
      
      // Verify parent-child relationship (skip for admins)
      if (role === 'parent') {
        // Check if player's accountHolderId matches parent's ID
        if (player.accountHolderId !== parentId) {
          return res.status(403).json({
            error: 'Unauthorized',
            message: 'You can only check in players linked to your account.'
          });
        }
      }
      
      // Check if player is already checked in
      const existingAttendances = await storage.getAttendancesByEvent(eventId);
      const alreadyCheckedIn = existingAttendances.some((a: any) => a.userId === playerId);
      if (alreadyCheckedIn) {
        return res.status(400).json({
          error: 'Already checked in',
          message: 'This player has already been checked in.'
        });
      }
      
      // Location validation for proxy check-ins (required when event has coordinates)
      // Admins can bypass location check
      if (role !== 'admin' && event.latitude != null && event.longitude != null) {
        // Require location coordinates for proxy check-in
        if (latitude == null || longitude == null) {
          return res.status(400).json({
            error: 'Location required',
            message: 'Your location is required to check in a player at this event. Please enable location access or use QR code check-in.',
          });
        }
        
        const { distanceMeters } = await import('./utils/geo.js');
        const distance = distanceMeters(
          { lat: latitude, lng: longitude },
          { lat: event.latitude, lng: event.longitude }
        );
        const radiusMeters = event.checkInRadius ?? 200;
        
        if (distance > radiusMeters) {
          return res.status(403).json({
            error: 'Too far away',
            message: `You must be within ${radiusMeters}m of the event to check in your player. You are ${Math.round(distance)}m away.`,
            distance: Math.round(distance),
            required: radiusMeters,
          });
        }
      }
      
      // Create the attendance record with proxy tracking
      const attendanceData = {
        userId: playerId,
        eventId: eventId,
        qrCodeData: `proxy-${parentId}-${Date.now()}`,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        checkedInByUserId: parentId,
        checkInMethod: 'proxy',
      };
      
      const attendance = await storage.createAttendance(attendanceData);
      
      // Credit deduction and award tracking (same as regular check-in)
      try {
        const enrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
        const enrollmentWithCredits = enrollments.find((e: any) => 
          e.remainingCredits && e.remainingCredits > 0
        );
        
        if (enrollmentWithCredits) {
          await storage.deductEnrollmentCredit(enrollmentWithCredits.id);
          console.log(`💳 Proxy check-in: Deducted 1 credit from enrollment ${enrollmentWithCredits.id} for player ${playerId}`);
        }
      } catch (creditError: any) {
        console.error('⚠️ Credit deduction failed (non-fatal):', creditError.message);
      }
      
      // Award evaluation
      try {
        const eventData = await storage.getEvent(String(eventId));
        const user = await storage.getUser(playerId);
        
        if (eventData && user) {
          const trackingUpdates: any = {
            consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
          };
          
          const eventType = eventData.eventType?.toLowerCase() || '';
          if (eventType.includes('practice') || eventType.includes('skills session')) {
            trackingUpdates.totalPractices = (user.totalPractices || 0) + 1;
          } else if (eventType.includes('game') || eventType.includes('tournament')) {
            trackingUpdates.totalGames = (user.totalGames || 0) + 1;
          }
          
          await storage.updateUserAwardTracking(playerId, trackingUpdates);
          await evaluateAwardsForUser(playerId, storage);
          console.log(`✅ Awards evaluated for player ${playerId} after proxy check-in`);
        }
      } catch (awardError: any) {
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      res.json({ 
        success: true, 
        attendance,
        message: `${player.firstName} ${player.lastName} has been checked in.`
      });
    } catch (error: any) {
      console.error('Proxy check-in error:', error);
      res.status(500).json({ 
        error: 'Failed to check in player',
        message: error.message 
      });
    }
  });
  
  // Get linked players for parent (for proxy check-in UI)
  app.get('/api/parent/linked-players', requireAuth, async (req: any, res) => {
    try {
      const { id: parentId, role } = req.user;
      
      if (role !== 'parent' && role !== 'admin') {
        return res.status(403).json({ message: 'Only parents can access linked players' });
      }
      
      // Get all players linked to this parent
      const linkedPlayers = await storage.getPlayersByParent(parentId);
      res.json(linkedPlayers);
    } catch (error: any) {
      console.error('Error fetching linked players:', error);
      res.status(500).json({ error: 'Failed to fetch linked players' });
    }
  });
  
  // Proxy RSVP: Parents can RSVP on behalf of their linked players
  app.post('/api/rsvp/proxy', requireAuth, async (req: any, res) => {
    try {
      const { id: parentId, role } = req.user;
      const { playerId, eventId: rawEventId, response } = req.body;
      
      // Normalize eventId to number
      const eventId = typeof rawEventId === 'number' ? rawEventId : parseInt(String(rawEventId));
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId' });
      }
      
      // Validate required fields
      if (!playerId || !response) {
        return res.status(400).json({ error: 'Missing required fields: playerId and response' });
      }
      
      // Validate parent role
      if (role !== 'parent' && role !== 'admin') {
        return res.status(403).json({ 
          error: 'Unauthorized', 
          message: 'Only parents or admins can perform proxy RSVPs' 
        });
      }
      
      // Get the event
      const event = await storage.getEvent(String(eventId));
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Validate RSVP window
      const eventWindows = await storage.getEventWindowsByEvent(eventId);
      const now = new Date();
      const eventStart = new Date(event.startTime);
      
      // Calculate RSVP window times
      const rsvpOpenWindow = eventWindows.find((w: any) => w.windowType === 'rsvp' && w.openRole === 'open');
      const rsvpCloseWindow = eventWindows.find((w: any) => w.windowType === 'rsvp' && w.openRole === 'close');
      
      // Helper to calculate offset from event start
      const offsetFromStart = (amount: number, unit: string, direction: string) => {
        let ms = amount;
        if (unit === 'minutes') ms *= 60 * 1000;
        else if (unit === 'hours') ms *= 60 * 60 * 1000;
        else if (unit === 'days') ms *= 24 * 60 * 60 * 1000;
        return direction === 'before' 
          ? new Date(eventStart.getTime() - ms)
          : new Date(eventStart.getTime() + ms);
      };
      
      // Default: RSVP opens 3 days before, closes far in future
      const rsvpOpen = rsvpOpenWindow 
        ? offsetFromStart(rsvpOpenWindow.amount, rsvpOpenWindow.unit, rsvpOpenWindow.direction)
        : new Date(eventStart.getTime() - 3 * 24 * 60 * 60 * 1000);
      const rsvpClose = rsvpCloseWindow
        ? offsetFromStart(rsvpCloseWindow.amount, rsvpCloseWindow.unit, rsvpCloseWindow.direction)
        : new Date(eventStart.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
      
      // Check if RSVP window is open (admins bypass window check)
      if (role !== 'admin' && (now < rsvpOpen || now > rsvpClose)) {
        const status = now < rsvpOpen ? 'not yet open' : 'closed';
        return res.status(400).json({
          error: 'RSVP window ' + status,
          message: status === 'not yet open'
            ? `RSVP opens at ${rsvpOpen.toLocaleString()}`
            : `RSVP closed at ${rsvpClose.toLocaleString()}`,
          rsvpOpen: rsvpOpen.toISOString(),
          rsvpClose: rsvpClose.toISOString(),
        });
      }
      
      // Get the player to verify they exist and are a player
      const player = await storage.getUser(playerId);
      if (!player || player.role !== 'player') {
        return res.status(400).json({
          error: 'Invalid player',
          message: 'The specified player was not found.'
        });
      }
      
      // Verify parent-child relationship (skip for admins)
      if (role === 'parent') {
        if (player.accountHolderId !== parentId) {
          return res.status(403).json({
            error: 'Unauthorized',
            message: 'You can only RSVP for players linked to your account.'
          });
        }
      }
      
      // Check if RSVP already exists
      const existing = await storage.getRsvpResponseByUserAndEvent(playerId, eventId);
      
      let result;
      if (existing) {
        // Update existing response
        result = await storage.updateRsvpResponse(existing.id, { response });
      } else {
        // Create new response
        result = await storage.createRsvpResponse({
          userId: playerId,
          eventId: eventId,
          response,
        });
      }
      
      // Award engine integration - evaluate awards for 'attending' RSVPs (for the player, not parent)
      try {
        if (response === 'attending' && playerId) {
          // Update tracking for the player
          const playerData = await storage.getUser(playerId);
          
          if (playerData) {
            await storage.updateUserAwardTracking(playerId, {
              consecutiveCheckins: (playerData.consecutiveCheckins || 0) + 1,
            });
            
            // Evaluate and grant any newly earned awards for the PLAYER
            await evaluateAwardsForUser(playerId, storage, { category: 'rsvp' });
            
            console.log(`✅ Awards evaluated for player ${playerId} after proxy RSVP`);
          }
        }
      } catch (awardError: any) {
        // Log error but don't fail the RSVP operation
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      res.json({ 
        success: true, 
        rsvp: result,
        message: `${player.firstName} ${player.lastName}'s RSVP has been updated to "${response}".`
      });
    } catch (error: any) {
      console.error('Proxy RSVP error:', error);
      res.status(500).json({ 
        error: 'Failed to update RSVP',
        message: error.message 
      });
    }
  });
  
  // Coach roster check-in: Coaches can check in players from their roster
  app.post('/api/attendances/coach', requireAuth, async (req: any, res) => {
    try {
      const { id: coachId, role } = req.user;
      const { playerIds, eventId: rawEventId, action = 'checkin' } = req.body;
      
      // Normalize eventId to number
      const eventId = typeof rawEventId === 'number' ? rawEventId : parseInt(String(rawEventId));
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId' });
      }
      
      // Validate required fields
      if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
        return res.status(400).json({ error: 'Missing required field: playerIds (must be an array)' });
      }
      
      // Validate coach/admin role
      if (role !== 'coach' && role !== 'admin') {
        return res.status(403).json({ 
          error: 'Unauthorized', 
          message: 'Only coaches or admins can perform roster check-ins' 
        });
      }
      
      // Get the event
      const event = await storage.getEvent(String(eventId));
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Get existing attendances
      const existingAttendances = await storage.getAttendancesByEvent(eventId);
      const checkedInPlayerIds = new Set(existingAttendances.map((a: any) => a.userId));
      
      const results: { playerId: string; success: boolean; action: string; playerName?: string; error?: string }[] = [];
      
      for (const playerId of playerIds) {
        try {
          const player = await storage.getUser(playerId);
          if (!player) {
            results.push({ playerId, success: false, action: 'error', error: 'Player not found' });
            continue;
          }
          
          const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown Player';
          
          if (action === 'checkout') {
            // Remove check-in (undo)
            const attendance = existingAttendances.find((a: any) => a.userId === playerId);
            if (attendance) {
              await storage.deleteAttendance(attendance.id);
              results.push({ playerId, success: true, action: 'checkout', playerName });
            } else {
              results.push({ playerId, success: false, action: 'checkout', playerName, error: 'Not checked in' });
            }
          } else {
            // Check in
            if (checkedInPlayerIds.has(playerId)) {
              results.push({ playerId, success: false, action: 'checkin', playerName, error: 'Already checked in' });
              continue;
            }
            
            const attendanceData = {
              userId: playerId,
              eventId: eventId,
              qrCodeData: `coach-${coachId}-${Date.now()}`,
              checkedInByUserId: coachId,
              checkInMethod: 'coach_roster',
            };
            
            await storage.createAttendance(attendanceData);
            checkedInPlayerIds.add(playerId);
            
            // Credit deduction and award tracking
            try {
              const enrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
              const enrollmentWithCredits = enrollments.find((e: any) => 
                e.remainingCredits && e.remainingCredits > 0
              );
              
              if (enrollmentWithCredits) {
                await storage.deductEnrollmentCredit(enrollmentWithCredits.id);
                console.log(`💳 Coach check-in: Deducted 1 credit from enrollment ${enrollmentWithCredits.id} for player ${playerId}`);
              }
            } catch (creditError: any) {
              console.error('⚠️ Credit deduction failed (non-fatal):', creditError.message);
            }
            
            // Award evaluation
            try {
              const user = await storage.getUser(playerId);
              if (user) {
                const trackingUpdates: any = {
                  consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
                };
                
                const eventType = event.eventType?.toLowerCase() || '';
                if (eventType.includes('practice') || eventType.includes('skills session')) {
                  trackingUpdates.totalPractices = (user.totalPractices || 0) + 1;
                } else if (eventType.includes('game') || eventType.includes('tournament')) {
                  trackingUpdates.totalGames = (user.totalGames || 0) + 1;
                }
                
                await storage.updateUserAwardTracking(playerId, trackingUpdates);
                await evaluateAwardsForUser(playerId, storage);
              }
            } catch (awardError: any) {
              console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
            }
            
            results.push({ playerId, success: true, action: 'checkin', playerName });
          }
        } catch (playerError: any) {
          results.push({ playerId, success: false, action: 'error', error: playerError.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      res.json({ 
        success: true, 
        results,
        summary: {
          total: playerIds.length,
          successful: successCount,
          failed: failCount,
        },
        message: action === 'checkout' 
          ? `Removed ${successCount} player(s) from attendance`
          : `Checked in ${successCount} player(s)`
      });
    } catch (error: any) {
      console.error('Coach roster check-in error:', error);
      res.status(500).json({ 
        error: 'Failed to process roster check-ins',
        message: error.message 
      });
    }
  });
  
  // Get event roster for coach check-in (players who should be at this event)
  app.get('/api/events/:eventId/roster', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      const eventId = parseInt(req.params.eventId);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId' });
      }
      
      // Only coaches and admins can see the full roster
      if (role !== 'coach' && role !== 'admin') {
        return res.status(403).json({ 
          error: 'Unauthorized', 
          message: 'Only coaches or admins can access the event roster' 
        });
      }
      
      const event = await storage.getEvent(String(eventId));
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Get all players who should be at this event based on targets
      const allPlayers: any[] = [];
      const eventTargets = await storage.getEventTargetsByEventId(eventId);
      
      // Get players from targeted teams
      for (const target of eventTargets) {
        if (target.targetType === 'team' && target.targetId) {
          const teamMembers = await storage.getTeamMembersByTeam(parseInt(target.targetId));
          for (const member of teamMembers) {
            if (member.role === 'player') {
              const player = await storage.getUser(member.userId);
              if (player && !allPlayers.find(p => p.id === player.id)) {
                allPlayers.push(player);
              }
            }
          }
        }
      }
      
      // Also get RSVP'd players
      const rsvpResponses = await storage.getRsvpResponsesByEvent(eventId);
      for (const rsvp of rsvpResponses) {
        const player = await storage.getUser(rsvp.userId);
        if (player && player.role === 'player' && !allPlayers.find(p => p.id === player.id)) {
          allPlayers.push(player);
        }
      }
      
      // Get current attendance status
      const attendances = await storage.getAttendancesByEvent(eventId);
      const checkedInIds = new Set(attendances.map((a: any) => a.userId));
      
      // Build roster with status
      const roster = allPlayers.map(player => ({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        profileImageUrl: player.profileImageUrl,
        isCheckedIn: checkedInIds.has(player.id),
        rsvpResponse: rsvpResponses.find((r: any) => r.userId === player.id)?.response || 'no_response',
      }));
      
      res.json({
        eventId,
        roster,
        checkedInCount: attendances.length,
        totalPlayers: roster.length,
      });
    } catch (error: any) {
      console.error('Event roster fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch event roster',
        message: error.message 
      });
    }
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
            
            // Evaluate and grant any newly earned RSVP awards
            await evaluateAwardsForUser(rsvpData.userId, storage, { category: 'rsvp' });
            
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
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Not authorized to view awards from other organizations' });
      }
      
      // Authorization: users can view their own awards, admins/coaches can view any user's awards
      // Parents can also view their linked children's awards
      let isAuthorized = userId === currentUserId || role === 'admin' || role === 'coach';
      
      if (!isAuthorized && role === 'parent') {
        // Check if target user is a linked child of the current parent
        const linkedPlayers = await storage.getPlayersByParent(currentUserId);
        isAuthorized = linkedPlayers.some(p => p.id === userId);
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to view these awards' });
      }
      
      const userAwardRecords = await storage.getUserAwardRecords(userId);
      console.log(`[Awards API] User ${userId}: Found ${userAwardRecords.length} user award records`);
      
      // Fetch award definitions to get tier information
      const allAwardDefinitions = await storage.getAwardDefinitions(organizationId);
      console.log(`[Awards API] Org ${organizationId}: Found ${allAwardDefinitions.length} award definitions`);
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
      
      // Count earned awards by tier
      const legacyCount = enrichedAwards.filter((a: any) => a.tier === 'Legacy').length;
      const hofCount = enrichedAwards.filter((a: any) => a.tier === 'HOF').length;
      const superstarCount = enrichedAwards.filter((a: any) => a.tier === 'Superstar').length;
      const allStarCount = enrichedAwards.filter((a: any) => a.tier === 'All-Star').length;
      const starterCount = enrichedAwards.filter((a: any) => a.tier === 'Starter').length;
      const prospectCount = enrichedAwards.filter((a: any) => a.tier === 'Prospect').length;
      
      // Count total available awards per tier from all award definitions
      const legacyTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Legacy' && a.active).length;
      const hofTotal = allAwardDefinitions.filter((a: any) => a.tier === 'HOF' && a.active).length;
      const superstarTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Superstar' && a.active).length;
      const allStarTotal = allAwardDefinitions.filter((a: any) => a.tier === 'All-Star' && a.active).length;
      const starterTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Starter' && a.active).length;
      const prospectTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Prospect' && a.active).length;
      
      console.log(`[Awards API] Earned - Legacy:${legacyCount}, HOF:${hofCount}, Superstar:${superstarCount}, All-Star:${allStarCount}, Starter:${starterCount}, Prospect:${prospectCount}`);
      console.log(`[Awards API] Totals - Legacy:${legacyTotal}, HOF:${hofTotal}, Superstar:${superstarTotal}, All-Star:${allStarTotal}, Starter:${starterTotal}, Prospect:${prospectTotal}`);
      
      res.json({
        // New tier-based summary with earned and total
        tierSummary: {
          legacy: { earned: legacyCount, total: legacyTotal || 1 },
          hof: { earned: hofCount, total: hofTotal || 1 },
          superstar: { earned: superstarCount, total: superstarTotal || 1 },
          allStar: { earned: allStarCount, total: allStarTotal || 1 },
          starter: { earned: starterCount, total: starterTotal || 1 },
          prospect: { earned: prospectCount, total: prospectTotal || 1 },
        },
        // Legacy fields for backwards compatibility
        trophiesCount: legacyCount,
        hallOfFameBadgesCount: hofCount,
        superstarBadgesCount: superstarCount,
        allStarBadgesCount: allStarCount,
        starterBadgesCount: starterCount,
        prospectBadgesCount: prospectCount,
        rookieBadgesCount: 0,
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
  
  // Legacy route (kept for backwards compatibility) - now supports channel query param
  app.get('/api/messages/team/:teamId', requireAuth, async (req: any, res) => {
    const { channel = 'players' } = req.query;
    const messages = await storage.getMessagesByTeam(req.params.teamId, channel as string);
    res.json(messages);
  });
  
  // Team-scoped message routes (used by TeamChat component)
  app.get('/api/teams/:teamId/messages', requireAuth, async (req: any, res) => {
    const { channel = 'players' } = req.query; // Default to players channel
    const messages = await storage.getMessagesByTeam(req.params.teamId, channel as string);
    res.json(messages);
  });
  
  app.post('/api/teams/:teamId/messages', requireAuth, async (req: any, res) => {
    const { message, messageType = 'text', profileId, channel = 'players' } = req.body;
    
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
      chatChannel: channel, // 'players' or 'parents'
    };
    
    const newMessage = await storage.createMessage(messageData);
    
    // Broadcast to WebSocket clients if available
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: 'new_team_message', 
            teamId: parseInt(req.params.teamId),
            channel: channel, // Include channel in broadcast
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
  
  // Delete a message (admin only)
  app.delete('/api/messages/:messageId', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      
      // Only admins can delete messages
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can delete messages' });
      }
      
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }
      
      await storage.deleteMessage(messageId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
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
  
  // Store products endpoint - returns products with productCategory = 'goods'
  app.get('/api/store-products', async (req: any, res) => {
    try {
      const organizationId = req.user?.organizationId || 'default-org';
      const allProducts = await storage.getProgramsByOrganization(organizationId);
      const storeProducts = allProducts.filter((p: any) => p.productCategory === 'goods');
      res.json(storeProducts);
    } catch (error: any) {
      console.error('Error fetching store products:', error);
      res.status(500).json({ message: 'Failed to fetch store products' });
    }
  });
  
  app.post('/api/programs', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create programs' });
      }
      
      const parsedData = insertProgramSchema.parse(req.body);
      
      // Deep clone the parsed data to avoid mutating frozen Zod output
      // Use type-preserving deepClone instead of JSON.stringify to preserve Date types
      const programData = deepClone(parsedData);
      
      // Assign stable server-side IDs to pricing options BEFORE creating the program
      if (programData.pricingOptions && programData.pricingOptions.length > 0) {
        programData.pricingOptions = assignStablePricingOptionIds(programData.pricingOptions);
      }
      
      // Create the program with stable pricing option IDs
      let program = await storage.createProgram(programData);
      
      // Sync with Stripe if there are pricing options
      if (programData.pricingOptions && programData.pricingOptions.length > 0) {
        const { stripeProductId, updatedPricingOptions } = await syncProgramWithStripe(
          program,
          programData.pricingOptions // Use the already-ID'd options
        );
        
        // Update program with Stripe IDs (stable IDs are already preserved)
        if (stripeProductId || updatedPricingOptions.some((opt: any) => opt.stripePriceId)) {
          program = await storage.updateProgram(program.id, {
            stripeProductId,
            pricingOptions: updatedPricingOptions,
          }) || program;
        }
      }
      
      res.json(program);
    } catch (error: any) {
      console.error('Error creating program/product:', error);
      // Return 400 for Zod validation errors, 500 for server errors
      if (error.name === 'ZodError') {
        res.status(400).json({ message: error.errors?.[0]?.message || 'Validation error' });
      } else {
        res.status(500).json({ message: 'Failed to create product' });
      }
    }
  });
  
  app.patch('/api/programs/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update programs' });
    }
    
    // Get existing program for Stripe sync
    const existingProgram = await storage.getProgram(req.params.id);
    if (!existingProgram) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    let updateData = { ...req.body };
    
    // Handle pricing options with stable IDs and deep-merge
    if (req.body.pricingOptions && req.body.pricingOptions.length > 0) {
      // Map existing options by their stable ID for deep merging
      const existingOptionsById = new Map<string, any>();
      if (existingProgram.pricingOptions) {
        for (const opt of existingProgram.pricingOptions) {
          if (opt.id && opt.id.startsWith('po_')) {
            existingOptionsById.set(opt.id, opt);
          }
        }
      }
      
      // Deep-merge incoming options: use existing option as base, overlay only defined client changes
      const mergedOptions = req.body.pricingOptions.map((incomingOpt: any) => {
        // If incoming option has a stable ID that exists, deep-merge with existing
        if (incomingOpt.id && incomingOpt.id.startsWith('po_') && existingOptionsById.has(incomingOpt.id)) {
          const existingOpt = existingOptionsById.get(incomingOpt.id);
          
          // Build merged option: start with deep copy of existing option
          const merged: any = deepClone(existingOpt);
          
          // Overlay fields from incoming, but skip undefined and null
          // Empty arrays [] are valid and should be overlayed
          // This preserves nested collections unless explicitly cleared
          for (const key of Object.keys(incomingOpt)) {
            const value = incomingOpt[key];
            
            // Skip undefined - means "not provided"
            if (value === undefined) {
              continue;
            }
            
            // Skip null - means "not provided" in JSON/form serialization
            // Exception: if existing value is truthy and incoming is null, preserve existing
            if (value === null) {
              continue;
            }
            
            // Accept all other values including false, 0, empty string, empty arrays
            merged[key] = value;
          }
          
          return merged;
        }
        // New option - needs stable ID
        if (!incomingOpt.id || !incomingOpt.id.startsWith('po_')) {
          return {
            ...incomingOpt,
            id: generateStablePricingOptionId(),
          };
        }
        return incomingOpt;
      });
      
      const programForSync = {
        ...existingProgram,
        ...updateData,
        id: req.params.id,
      };
      
      const { stripeProductId, updatedPricingOptions } = await syncProgramWithStripe(
        programForSync,
        mergedOptions
      );
      
      // Include Stripe IDs in update
      updateData.stripeProductId = stripeProductId;
      updateData.pricingOptions = updatedPricingOptions;
    }
    
    const updated = await storage.updateProgram(req.params.id, updateData);
    res.json(updated);
  });
  
  app.delete('/api/programs/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete programs' });
    }
    
    try {
      // deleteProgram now automatically cancels all enrollments before deletion
      await storage.deleteProgram(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting program:', error);
      res.status(500).json({ message: 'Failed to delete program', error: error.message });
    }
  });

  // Get a single program with its social settings
  app.get('/api/programs/:id', async (req: any, res) => {
    try {
      const program = await storage.getProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: 'Program not found' });
      }
      res.json(program);
    } catch (error: any) {
      console.error('Error fetching program:', error);
      res.status(500).json({ message: 'Failed to fetch program' });
    }
  });

  // Get suggested add-ons for a program
  app.get('/api/programs/:programId/suggested-add-ons', async (req: any, res) => {
    try {
      const { programId } = req.params;
      const addOnsWithProducts = await storage.getSuggestedAddOnsWithProducts(programId);
      res.json(addOnsWithProducts);
    } catch (error: any) {
      console.error('Error fetching suggested add-ons:', error);
      res.status(500).json({ message: 'Failed to fetch suggested add-ons' });
    }
  });
  
  // Set suggested add-ons for a program (admin only)
  app.put('/api/programs/:programId/suggested-add-ons', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can manage suggested add-ons' });
      }
      
      const { programId } = req.params;
      const { productIds } = req.body;
      
      if (!Array.isArray(productIds)) {
        return res.status(400).json({ message: 'productIds must be an array' });
      }
      
      await storage.setProgramSuggestedAddOns(programId, productIds);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error setting suggested add-ons:', error);
      res.status(500).json({ message: 'Failed to set suggested add-ons' });
    }
  });
  
  // Get programs that suggest a specific product as an add-on
  app.get('/api/products/:productId/suggested-for-programs', async (req: any, res) => {
    try {
      const { productId } = req.params;
      const programIds = await storage.getProductsWithSuggestedPrograms(productId);
      res.json({ programIds });
    } catch (error: any) {
      console.error('Error fetching suggested programs:', error);
      res.status(500).json({ message: 'Failed to fetch suggested programs' });
    }
  });
  
  // Update which programs suggest a product as an add-on (admin only)
  app.put('/api/products/:productId/suggested-for-programs', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can manage suggested add-ons' });
      }
      
      const { productId } = req.params;
      const { programIds } = req.body;
      
      if (!Array.isArray(programIds)) {
        return res.status(400).json({ message: 'programIds must be an array' });
      }
      
      // Remove this product from all programs first
      const currentPrograms = await storage.getProductsWithSuggestedPrograms(productId);
      for (const programId of currentPrograms) {
        await storage.removeSuggestedAddOn(programId, productId);
      }
      
      // Add to the new programs
      for (const programId of programIds) {
        await storage.addSuggestedAddOn({
          programId,
          productId,
          displayOrder: 0,
          isRequired: false,
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating suggested programs:', error);
      res.status(500).json({ message: 'Failed to update suggested programs' });
    }
  });

  // Get subgroups (teams/levels/groups) for a specific program
  app.get('/api/programs/:programId/subgroups', async (req: any, res) => {
    try {
      const { programId } = req.params;
      
      // Get the program to check if it has subgroups
      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ message: 'Program not found' });
      }
      
      // If program doesn't have subgroups, return empty array
      if (program.hasSubgroups === false) {
        return res.json({ 
          program,
          subgroups: [],
          subgroupLabel: program.subgroupLabel || 'Team'
        });
      }
      
      // Get teams/groups linked to this program
      const subgroups = await db.select()
        .from(teams)
        .where(eq(teams.programId, programId));
      
      res.json({
        program,
        subgroups,
        subgroupLabel: program.subgroupLabel || 'Team'
      });
    } catch (error: any) {
      console.error('Error fetching program subgroups:', error);
      res.status(500).json({ message: 'Failed to fetch program subgroups' });
    }
  });

  // Get player's program memberships with social settings and team info
  app.get('/api/users/:userId/program-memberships', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { id: requesterId, role: requesterRole } = req.user;
      
      // Authorization: users can view their own or admins/coaches can view any
      const isOwnProfile = requesterId === userId;
      const isAdminOrCoach = requesterRole === 'admin' || requesterRole === 'coach';
      
      // Also allow parents to view their children's memberships
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const isParent = user.parentId === requesterId || user.accountHolderId === requesterId;
      
      if (!isOwnProfile && !isAdminOrCoach && !isParent) {
        return res.status(403).json({ message: 'Not authorized to view these memberships' });
      }
      
      // Get enrollments with product/program info
      const enrollments = await db.select({
        enrollment: productEnrollments,
        product: products,
      })
        .from(productEnrollments)
        .leftJoin(products, eq(productEnrollments.programId, products.id))
        .where(
          and(
            eq(productEnrollments.profileId, userId),
            eq(productEnrollments.status, 'active')
          )
        );
      
      // Get team memberships for this user
      const userTeamMemberships = await db.select({
        membership: teamMemberships,
        team: teams,
      })
        .from(teamMemberships)
        .leftJoin(teams, eq(teamMemberships.teamId, teams.id))
        .where(
          and(
            eq(teamMemberships.profileId, userId),
            eq(teamMemberships.status, 'active')
          )
        );
      
      // Get all team IDs the user is a member of (teams.id is serial/integer)
      const userTeamIds = userTeamMemberships
        .map(({ team }) => team?.id)
        .filter((id): id is number => !!id);
      
      // Fetch all members for all teams the user is in (for roster display)
      let allTeamMembers: Array<{membership: typeof teamMemberships.$inferSelect, user: typeof users.$inferSelect | null}> = [];
      if (userTeamIds.length > 0) {
        allTeamMembers = await db.select({
          membership: teamMemberships,
          user: users,
        })
          .from(teamMemberships)
          .leftJoin(users, eq(teamMemberships.profileId, users.id))
          .where(
            and(
              inArray(teamMemberships.teamId, userTeamIds),
              eq(teamMemberships.status, 'active')
            )
          );
      }
      
      // Build response combining enrollments with team info, social settings, and members
      const memberships = await Promise.all(enrollments.map(async ({ enrollment, product }) => {
        // Find teams linked to this program
        const programTeams = userTeamMemberships.filter(
          ({ team }) => team?.programId === enrollment.programId
        );
        
        return {
          enrollmentId: enrollment.id,
          programId: enrollment.programId,
          programName: product?.name || 'Unknown Program',
          programType: product?.type,
          // Social settings from program
          hasSubgroups: product?.hasSubgroups ?? true,
          subgroupLabel: product?.subgroupLabel || 'Team',
          rosterVisibility: product?.rosterVisibility || 'members',
          chatMode: product?.chatMode || 'two_way',
          // Enrollment details
          status: enrollment.status,
          remainingCredits: enrollment.remainingCredits,
          totalCredits: enrollment.totalCredits,
          // Team/group assignments within this program, with member data
          teams: await Promise.all(programTeams.map(async ({ membership, team }) => {
            // Get members for this team
            const teamMembers = allTeamMembers
              .filter(m => m.membership.teamId === team?.id)
              .map(({ membership: m, user }) => ({
                id: user?.id,
                name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email,
                role: m.role,
                profilePic: user?.profilePic,
              }));
            
            // Get head coach name
            let coachName: string | null = null;
            if (team?.coachId) {
              const coach = await storage.getUser(team.coachId);
              if (coach) {
                coachName = `${coach.firstName || ''} ${coach.lastName || ''}`.trim() || null;
              }
            }
            
            // Get assistant coach names
            const assistantCoaches: Array<{ id: string; name: string }> = [];
            if (team?.assistantCoachIds && team.assistantCoachIds.length > 0) {
              for (const assistantId of team.assistantCoachIds) {
                const assistant = await storage.getUser(assistantId);
                if (assistant) {
                  assistantCoaches.push({
                    id: assistantId,
                    name: `${assistant.firstName || ''} ${assistant.lastName || ''}`.trim(),
                  });
                }
              }
            }
            
            return {
              teamId: team?.id,
              teamName: team?.name,
              memberRole: membership.role,
              coachId: team?.coachId,
              coachName,
              assistantCoachIds: team?.assistantCoachIds || [],
              assistantCoaches,
              members: teamMembers,
            };
          })),
        };
      }));
      
      res.json(memberships);
    } catch (error: any) {
      console.error('Error fetching program memberships:', error);
      res.status(500).json({ message: 'Failed to fetch program memberships' });
    }
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

  // Get current user's enrollments (for parent dashboard)
  app.get('/api/enrollments', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;

      // Get enrollments where user is the account holder (parent) or the profile (player)
      const enrollments = await db.select()
        .from(productEnrollments)
        .where(
          or(
            eq(productEnrollments.accountHolderId, userId),
            eq(productEnrollments.profileId, userId)
          )
        );

      res.json(enrollments);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      res.status(500).json({ message: 'Failed to fetch enrollments' });
    }
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
      
      // Calculate OVR from scores and update player's rating
      if (evaluationData.playerId && evaluationData.scores) {
        try {
          const scores = evaluationData.scores;
          let totalScore = 0;
          let scoreCount = 0;
          
          // Flatten nested scores structure: { CATEGORY: { SKILL: score, ... }, ... }
          for (const category of Object.values(scores)) {
            if (category && typeof category === 'object') {
              for (const score of Object.values(category as Record<string, number>)) {
                if (typeof score === 'number' && score > 0) {
                  totalScore += score;
                  scoreCount++;
                }
              }
            }
          }
          
          // Calculate average OVR (scores are 1-5, multiply by 20 to get 0-100 scale)
          if (scoreCount > 0) {
            const avgScore = totalScore / scoreCount;
            const ovrRating = Math.round(avgScore * 20); // Convert 1-5 to 0-100
            
            // Update player's rating
            await storage.updateUser(evaluationData.playerId, { 
              rating: ovrRating,
              skillsAssessments: scores // Also store latest skills on player record
            });
            console.log(`[Eval] Updated player ${evaluationData.playerId} OVR to ${ovrRating} (avg: ${avgScore.toFixed(2)} from ${scoreCount} skills)`);
          }
        } catch (ovrError: any) {
          console.error('[Eval] Failed to update player OVR (non-fatal):', ovrError.message);
        }
      }
      
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
  
  // Latest evaluation for a player (used by PlayerCard)
  app.get('/api/players/:playerId/latest-evaluation', requireAuth, async (req: any, res) => {
    try {
      const { playerId } = req.params;
      const { id: currentUserId, role, organizationId } = req.user;
      
      // Authorization: users can view their own, admins/coaches can view any
      if (playerId !== currentUserId && role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: 'Not authorized to view this evaluation' });
      }
      
      const evaluations = await storage.getEvaluationsByPlayer(playerId);
      console.log(`[Eval API] Player ${playerId}: Found ${evaluations?.length || 0} evaluations`);
      if (!evaluations || evaluations.length === 0) {
        return res.json(null);
      }
      
      // Sort by year and quarter descending to get latest
      const sorted = evaluations.sort((a: any, b: any) => {
        if (b.year !== a.year) return b.year - a.year;
        const quarterOrder: Record<string, number> = { Q4: 4, Q3: 3, Q2: 2, Q1: 1 };
        return (quarterOrder[b.quarter] || 0) - (quarterOrder[a.quarter] || 0);
      });
      
      const latest = sorted[0];
      console.log(`[Eval API] Latest: Q${latest.quarter} ${latest.year}, scores:`, latest.scores);
      res.json({
        id: latest.id,
        playerId: latest.playerId,
        coachId: latest.coachId,
        quarter: latest.quarter,
        year: latest.year,
        skillsData: latest.scores, // Map scores to skillsData for frontend compatibility
        notes: latest.notes,
        createdAt: latest.createdAt,
      });
    } catch (error: any) {
      console.error('Error fetching latest evaluation:', error);
      res.status(500).json({ error: 'Failed to fetch latest evaluation', message: error.message });
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
  
  // Mark all notifications as read for the current user
  app.post('/api/notifications/mark-all-read', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read', message: error.message });
    }
  });
  
  // =============================================
  // NOTIFICATION CAMPAIGN ROUTES (Scheduled Messaging)
  // =============================================
  
  app.get('/api/notification-campaigns', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const campaigns = await storage.getNotificationCampaignsByOrganization(organizationId);
      res.json(campaigns);
    } catch (error: any) {
      console.error('Error fetching notification campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns', message: error.message });
    }
  });
  
  app.get('/api/notification-campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      const campaign = await storage.getNotificationCampaign(id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.json(campaign);
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: 'Failed to fetch campaign', message: error.message });
    }
  });
  
  app.post('/api/notification-campaigns', requireAuth, async (req: any, res) => {
    try {
      const { id: userId, organizationId, role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const campaignData = {
        ...req.body,
        organizationId,
        createdBy: userId,
        status: req.body.scheduleType === 'immediate' ? 'active' : 'draft',
      };
      
      // Calculate nextRunAt based on schedule type
      if (campaignData.scheduleType === 'immediate') {
        campaignData.nextRunAt = new Date().toISOString();
      } else if (campaignData.scheduleType === 'scheduled' && campaignData.scheduledAt) {
        campaignData.nextRunAt = campaignData.scheduledAt;
        campaignData.status = 'active';
      } else if (campaignData.scheduleType === 'recurring' && campaignData.recurrenceTime) {
        // Calculate first run based on recurrence settings
        const [hours, minutes] = campaignData.recurrenceTime.split(':').map(Number);
        const firstRun = new Date();
        firstRun.setHours(hours, minutes, 0, 0);
        if (firstRun <= new Date()) {
          firstRun.setDate(firstRun.getDate() + 1);
        }
        campaignData.nextRunAt = firstRun.toISOString();
        campaignData.status = 'active';
      }
      
      const campaign = await storage.createNotificationCampaign(campaignData);
      res.json(campaign);
    } catch (error: any) {
      console.error('Error creating notification campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign', message: error.message });
    }
  });
  
  app.patch('/api/notification-campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      const updated = await storage.updateNotificationCampaign(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ error: 'Failed to update campaign', message: error.message });
    }
  });
  
  app.delete('/api/notification-campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      await storage.deleteNotificationCampaign(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: 'Failed to delete campaign', message: error.message });
    }
  });
  
  // Campaign runs history
  app.get('/api/notification-campaigns/:id/runs', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      const runs = await storage.getCampaignRunsByCampaign(id);
      res.json(runs);
    } catch (error: any) {
      console.error('Error fetching campaign runs:', error);
      res.status(500).json({ error: 'Failed to fetch runs', message: error.message });
    }
  });
  
  // =============================================
  // NOTIFICATION TRIGGER RULES ROUTES
  // =============================================
  
  app.get('/api/notification-trigger-rules', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const rules = await storage.getNotificationTriggerRulesByOrganization(organizationId);
      res.json(rules);
    } catch (error: any) {
      console.error('Error fetching trigger rules:', error);
      res.status(500).json({ error: 'Failed to fetch trigger rules', message: error.message });
    }
  });
  
  app.post('/api/notification-trigger-rules', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const ruleData = {
        ...req.body,
        organizationId,
      };
      const rule = await storage.createNotificationTriggerRule(ruleData);
      res.json(rule);
    } catch (error: any) {
      console.error('Error creating trigger rule:', error);
      res.status(500).json({ error: 'Failed to create trigger rule', message: error.message });
    }
  });
  
  app.patch('/api/notification-trigger-rules/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid rule ID' });
      }
      const updated = await storage.updateNotificationTriggerRule(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Trigger rule not found' });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating trigger rule:', error);
      res.status(500).json({ error: 'Failed to update trigger rule', message: error.message });
    }
  });
  
  app.delete('/api/notification-trigger-rules/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid rule ID' });
      }
      await storage.deleteNotificationTriggerRule(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting trigger rule:', error);
      res.status(500).json({ error: 'Failed to delete trigger rule', message: error.message });
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
  // ADMIN MIGRATION ROUTES (Legacy Parent Stripe Data)
  // =============================================
  
  // Get all migration records
  app.get('/api/admin/migrations', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can view migrations' });
      }
      
      const migrations = await storage.getAllMigrationLookups();
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(migrations);
    } catch (error: any) {
      console.error('Error fetching migrations:', error);
      res.status(500).json({ error: 'Failed to fetch migrations', message: error.message });
    }
  });
  
  // Create migration record
  app.post('/api/admin/migrations', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create migrations' });
      }
      
      const { email, stripeCustomerId, stripeSubscriptionId, items } = req.body;
      
      if (!email || !stripeCustomerId || !stripeSubscriptionId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Items are optional for bulk upload - default to empty array
      const itemsArray = Array.isArray(items) ? items : [];
      
      const migration = await storage.createMigrationLookup({
        email,
        stripeCustomerId,
        stripeSubscriptionId,
        items: itemsArray,
        isClaimed: false,
      });
      
      res.status(201).json(migration);
    } catch (error: any) {
      console.error('Error creating migration:', error);
      res.status(500).json({ error: 'Failed to create migration', message: error.message });
    }
  });
  
  // Update migration record
  app.patch('/api/admin/migrations/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can update migrations' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid migration ID' });
      }
      
      const { email, stripeCustomerId, stripeSubscriptionId, items } = req.body;
      
      if (items !== undefined && (!Array.isArray(items) || items.length === 0)) {
        return res.status(400).json({ error: 'At least one item must be added' });
      }
      
      const migration = await storage.updateMigrationLookup(id, {
        email,
        stripeCustomerId,
        stripeSubscriptionId,
        items,
      });
      
      if (!migration) {
        return res.status(404).json({ error: 'Migration not found' });
      }
      
      res.json(migration);
    } catch (error: any) {
      console.error('Error updating migration:', error);
      res.status(500).json({ error: 'Failed to update migration', message: error.message });
    }
  });
  
  // Delete migration record
  app.delete('/api/admin/migrations/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can delete migrations' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid migration ID' });
      }
      
      await storage.deleteMigrationLookup(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting migration:', error);
      res.status(500).json({ error: 'Failed to delete migration', message: error.message });
    }
  });
  
  // =============================================
  // LEGACY CLAIM ROUTES (For migrating users)
  // =============================================
  
  // Get unclaimed migrations for authenticated user (by email)
  app.get('/api/legacy/my-migrations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const email = user?.email;
      
      console.log(`📦 Fetching migrations for email: "${email}" (userId: ${userId})`);
      if (!email) {
        console.log(`📦 No email found, returning empty array`);
        return res.json([]);
      }
      
      const migrations = await storage.getMigrationLookupsByEmail(email);
      console.log(`📦 Found ${migrations.length} migrations for ${email}`);
      
      // Return migrations with items already included
      const enrichedMigrations = migrations.map(m => ({
        ...m,
        items: m.items || [],
      }));
      
      res.json(enrichedMigrations);
    } catch (error: any) {
      console.error('Error fetching user migrations:', error);
      res.status(500).json({ error: 'Failed to fetch migrations', message: error.message });
    }
  });
  
  // Assign migration subscription to a player (user self-service)
  // Includes Stripe subscription upgrade with new pricing and 1% application fee
  app.post('/api/legacy/assign', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const email = user?.email;
      const { migrationId, playerId, itemId } = req.body;
      
      if (!migrationId || !playerId) {
        return res.status(400).json({ error: 'Migration ID and Player ID are required' });
      }
      
      // Get the migration record
      const migration = await storage.getMigrationLookupById(migrationId);
      if (!migration) {
        return res.status(404).json({ error: 'Migration not found' });
      }
      
      // Verify the migration belongs to this user's email
      if (migration.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ error: 'This migration does not belong to you' });
      }
      
      if (migration.isClaimed) {
        return res.status(400).json({ error: 'Migration already claimed' });
      }
      
      // Get the player to verify it belongs to this parent
      const player = await storage.getUser(playerId);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      // Verify player belongs to this parent
      if (player.accountHolderId !== userId && player.linkedParentId !== userId && player.id !== userId) {
        return res.status(403).json({ error: 'This player does not belong to your account' });
      }
      
      // Get item names for the subscription and lookup new price IDs
      let productName = 'Legacy Subscription';
      const priceUpdates: { itemName: string; stripePriceId: string | null; programId: string }[] = [];
      
      if (migration.items && migration.items.length > 0) {
        const itemNames = migration.items.map(item => 
          item.itemName || `${item.itemType} (${item.quantity})`
        );
        if (itemNames.length > 0) {
          productName = itemNames.join(', ');
        }
        
        // Look up new price IDs from programs table
        for (const item of migration.items) {
          if (item.itemId && item.itemType === 'program') {
            const program = await storage.getProgram(item.itemId);
            if (program && program.stripePriceId) {
              priceUpdates.push({
                itemName: item.itemName || program.name,
                stripePriceId: program.stripePriceId,
                programId: item.itemId,
              });
              console.log(`📦 Found new price for "${item.itemName}": ${program.stripePriceId}`);
            }
          }
        }
      }
      
      // Get all subscription IDs from migration (support both single and array)
      const subscriptionIds: string[] = (migration.stripeSubscriptionIds && migration.stripeSubscriptionIds.length > 0)
        ? migration.stripeSubscriptionIds 
        : migration.stripeSubscriptionId 
          ? [migration.stripeSubscriptionId]
          : [];
      
      // Upgrade Stripe subscriptions with new pricing and 1% application fee
      const stripeUpgradeResults: { subscriptionId: string; success: boolean; error?: string }[] = [];
      
      if (stripe && subscriptionIds.length > 0 && priceUpdates.length > 0) {
        // Use rich subscription data if available for matching
        const richSubscriptions = migration.subscriptions || [];
        
        for (let subIdx = 0; subIdx < subscriptionIds.length; subIdx++) {
          const stripeSubId = subscriptionIds[subIdx];
          try {
            // Try to find matching price for this subscription
            let newPriceId: string | null = null;
            let programName = 'Unknown';
            
            // Strategy 1: Match using rich subscription data if available
            const richSubData = richSubscriptions.find(s => s.subscriptionId === stripeSubId);
            if (richSubData && richSubData.plan) {
              // The plan field contains the legacy price - try to match by program name
              // Look for a price update that matches this subscription's program
              const matchByName = priceUpdates.find(p => 
                p.itemName && (
                  richSubData.metadata?.program?.toLowerCase().includes(p.itemName.toLowerCase()) ||
                  p.itemName.toLowerCase().includes(richSubData.metadata?.program?.toLowerCase() || '')
                )
              );
              if (matchByName) {
                newPriceId = matchByName.stripePriceId;
                programName = matchByName.itemName;
              }
            }
            
            // Strategy 2: Simple 1:1 mapping when counts match
            if (!newPriceId && subscriptionIds.length === priceUpdates.length) {
              const directMatch = priceUpdates[subIdx];
              if (directMatch && directMatch.stripePriceId) {
                newPriceId = directMatch.stripePriceId;
                programName = directMatch.itemName;
              }
            }
            
            // Strategy 3: Single program - apply to all subscriptions
            if (!newPriceId && priceUpdates.length === 1) {
              newPriceId = priceUpdates[0].stripePriceId;
              programName = priceUpdates[0].itemName;
            }
            
            if (newPriceId) {
              // Get the current subscription from Stripe
              const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId);
              const existingItems = stripeSubscription.items.data;
              
              if (existingItems.length > 0) {
                // Update the first item with new pricing
                await stripe.subscriptions.update(stripeSubId, {
                  items: [{
                    id: existingItems[0].id,
                    price: newPriceId,
                  }],
                  proration_behavior: 'none', // No immediate charge, applies at next billing
                  application_fee_percent: 1, // 1% BoxStat service fee
                  metadata: {
                    migrated: 'true',
                    migratedAt: new Date().toISOString(),
                    migratedFrom: 'legacy',
                    playerId: playerId,
                    parentUserId: userId,
                    programName: programName,
                  },
                });
                console.log(`✅ Stripe subscription ${stripeSubId} upgraded to ${programName} (${newPriceId})`);
                stripeUpgradeResults.push({ subscriptionId: stripeSubId, success: true });
              } else {
                console.log(`⚠️ Subscription ${stripeSubId} has no items to update`);
                stripeUpgradeResults.push({ subscriptionId: stripeSubId, success: true });
              }
            } else {
              console.log(`⚠️ Could not determine new price for subscription ${stripeSubId} - manual update may be needed`);
              stripeUpgradeResults.push({ subscriptionId: stripeSubId, success: true });
            }
          } catch (stripeError: any) {
            console.error(`❌ Failed to upgrade Stripe subscription ${stripeSubId}:`, stripeError.message);
            stripeUpgradeResults.push({ 
              subscriptionId: stripeSubId, 
              success: false, 
              error: stripeError.message 
            });
            // Continue with other subscriptions even if one fails
          }
        }
      }
      
      // Create subscription records for each subscription ID
      for (const stripeSubId of subscriptionIds) {
        await storage.createSubscription({
          ownerUserId: userId,
          assignedPlayerId: playerId,
          stripeCustomerId: migration.stripeCustomerId,
          stripeSubscriptionId: stripeSubId,
          productName,
          status: 'active',
          isMigrated: true,
        });
      }
      
      // Enroll player in the SPECIFIC item being assigned (not all items)
      if (itemId) {
        // Find the specific item being assigned
        const itemToAssign = (migration.items || []).find((item: any) => item.itemId === itemId);
        if (itemToAssign && itemToAssign.itemType === 'program') {
          try {
            const program = await storage.getProgram(itemToAssign.itemId);
            
            await storage.createEnrollment({
              organizationId: player.organizationId,
              programId: itemToAssign.itemId,
              accountHolderId: userId,
              profileId: playerId,
              status: 'active',
              source: 'migrated',
              remainingCredits: program?.sessionCount ?? undefined,
              totalCredits: program?.sessionCount ?? undefined,
            });
            console.log(`✅ Enrolled player ${playerId} in program ${itemToAssign.itemId} (${itemToAssign.itemName})`);
            
            // Update player's payment status to paid (legacy subscription covers payment)
            await storage.updateUser(playerId, { paymentStatus: 'paid' });
            console.log(`✅ Updated player ${playerId} paymentStatus to paid`);
          } catch (enrollError: any) {
            console.warn(`⚠️ Could not enroll in program ${itemToAssign.itemId}:`, enrollError.message);
          }
        }
      } else {
        // Legacy: if no itemId specified, enroll in all programs (backwards compatibility)
        for (const item of (migration.items || [])) {
          if (item.itemId && item.itemType === 'program') {
            try {
              const program = await storage.getProgram(item.itemId);
              
              await storage.createEnrollment({
                organizationId: player.organizationId,
                programId: item.itemId,
                accountHolderId: userId,
                profileId: playerId,
                status: 'active',
                source: 'migrated',
                remainingCredits: program?.sessionCount ?? undefined,
                totalCredits: program?.sessionCount ?? undefined,
              });
              console.log(`✅ Enrolled player ${playerId} in program ${item.itemId} (${item.itemName})`);
              
              // Update player's payment status to paid
              await storage.updateUser(playerId, { paymentStatus: 'paid' });
            } catch (enrollError: any) {
              console.warn(`⚠️ Could not enroll in program ${item.itemId}:`, enrollError.message);
            }
          }
        }
      }
      
      // Update parent's stripe customer ID if not already set
      const parent = await storage.getUser(userId);
      if (parent && !parent.stripeCustomerId) {
        await storage.updateUser(userId, {
          stripeCustomerId: migration.stripeCustomerId,
        });
      }
      
      // DON'T mark migration as claimed yet - let frontend track individual items
      // Migration will be marked claimed when user clicks "Continue to Dashboard"
      
      // Check if any Stripe upgrades failed
      const failedUpgrades = stripeUpgradeResults.filter(r => !r.success);
      if (failedUpgrades.length > 0) {
        console.warn(`⚠️ Some Stripe upgrades failed:`, failedUpgrades);
      }
      
      res.json({ 
        success: true, 
        message: 'Subscription assigned! Continue assigning remaining subscriptions.',
        stripeUpgrades: stripeUpgradeResults,
        itemAssigned: itemId || 'all',
      });
    } catch (error: any) {
      console.error('Error assigning legacy subscription:', error);
      res.status(500).json({ error: 'Failed to assign subscription', message: error.message });
    }
  });
  
  // Skip legacy claim (user doesn't want to claim now)
  app.post('/api/legacy/skip', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;
      
      // Clear the legacy claim flag
      await storage.updateUser(userId, { needsLegacyClaim: false });
      
      res.json({ success: true, message: 'Legacy claim skipped' });
    } catch (error: any) {
      console.error('Error skipping legacy claim:', error);
      res.status(500).json({ error: 'Failed to skip claim', message: error.message });
    }
  });
  
  // Finalize legacy claims - mark all migrations as claimed
  app.post('/api/legacy/finalize', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;
      
      // Get user's email from database (req.user.email might be undefined)
      const user = await storage.getUser(userId);
      if (!user || !user.email) {
        return res.status(400).json({ error: 'User email not found' });
      }
      
      // Get all unclaimed migrations for this user
      const migrations = await storage.getMigrationLookupsByEmail(user.email);
      
      // Mark all as claimed
      for (const migration of migrations) {
        await storage.markMigrationLookupClaimed(migration.id);
      }
      
      // Clear the legacy claim flag
      await storage.updateUser(userId, { needsLegacyClaim: false });
      
      res.json({ 
        success: true, 
        message: 'All subscriptions finalized!',
        claimedCount: migrations.length,
      });
    } catch (error: any) {
      console.error('Error finalizing legacy claims:', error);
      res.status(500).json({ error: 'Failed to finalize claims', message: error.message });
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
      
      // Enforce XOR: for system trigger, require exactly one of targetTier or referenceId
      if (awardDefinitionData.triggerCategory === 'system') {
        const hasTier = !!awardDefinitionData.targetTier;
        const hasRef = !!awardDefinitionData.referenceId;
        if (!hasTier && !hasRef) {
          return res.status(400).json({ error: 'Collection awards require either a target tier or a specific award' });
        }
        if (hasTier && hasRef) {
          return res.status(400).json({ error: 'Collection awards cannot have both a target tier and a specific award' });
        }
      }
      
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
      
      // Get existing record to merge with update for validation
      const existing = await storage.getAwardDefinition(id);
      if (!existing) {
        return res.status(404).json({ error: 'Award definition not found' });
      }
      
      // Pre-process: normalize null/"none"/empty values - track which fields to clear
      const preprocessed = { ...req.body };
      const clearTargetTier = preprocessed.targetTier === null || preprocessed.targetTier === 'none' || preprocessed.targetTier === '';
      const clearReferenceId = preprocessed.referenceId === null || preprocessed.referenceId === 'none' || preprocessed.referenceId === '';
      
      // Remove clearing fields before Zod parsing (Zod partial doesn't accept undefined values for present keys)
      if (clearTargetTier) delete preprocessed.targetTier;
      if (clearReferenceId) delete preprocessed.referenceId;
      
      // Validate request body after normalization
      const awardDefinitionData = insertAwardDefinitionSchema.partial().parse(preprocessed);
      
      // Re-add cleared fields as null for database update
      if (clearTargetTier) (awardDefinitionData as any).targetTier = null;
      if (clearReferenceId) (awardDefinitionData as any).referenceId = null;
      
      // Merge existing values with update for XOR validation
      // Check if fields were in original req.body or explicitly cleared
      const merged = {
        triggerCategory: awardDefinitionData.triggerCategory ?? existing.triggerCategory,
        targetTier: ('targetTier' in req.body || clearTargetTier) ? (clearTargetTier ? null : awardDefinitionData.targetTier) : existing.targetTier,
        referenceId: ('referenceId' in req.body || clearReferenceId) ? (clearReferenceId ? null : awardDefinitionData.referenceId) : existing.referenceId,
      };
      
      // Enforce XOR: for system trigger, require exactly one of targetTier or referenceId
      if (merged.triggerCategory === 'system') {
        const hasTier = !!merged.targetTier;
        const hasRef = !!merged.referenceId;
        if (!hasTier && !hasRef) {
          return res.status(400).json({ error: 'Collection awards require either a target tier or a specific award' });
        }
        if (hasTier && hasRef) {
          return res.status(400).json({ error: 'Collection awards cannot have both a target tier and a specific award' });
        }
      }
      
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
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Not authorized to view awards from other organizations' });
      }
      
      // Authorization: users can view their own awards, admins/coaches can view any user's awards
      // Parents can also view their linked children's awards
      let isAuthorized = targetUserId === currentUserId || role === 'admin' || role === 'coach';
      
      if (!isAuthorized && role === 'parent') {
        // Check if target user is a linked child of the current parent
        const linkedPlayers = await storage.getPlayersByParent(currentUserId);
        isAuthorized = linkedPlayers.some(p => p.id === targetUserId);
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to view these awards' });
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
      
      let dbAwardId: number;
      
      // Check if awardId is already a number (new database-driven approach)
      if (typeof awardId === 'number') {
        // Verify the award definition exists
        const awardDefinition = await storage.getAwardDefinition(awardId);
        if (!awardDefinition) {
          return res.status(404).json({ error: 'Award definition not found' });
        }
        dbAwardId = awardId;
      } else {
        // awardId is a string from the registry (e.g., "game-mvp") - legacy fallback
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
        
        dbAwardId = awardDefinition.id; // This is the integer ID
      }
      
      // Check if user already has this award for the same year (only for non-manual awards)
      const currentYear = year || new Date().getFullYear();
      const awardDef = await storage.getAwardDefinition(dbAwardId);
      if (awardDef && awardDef.triggerCategory !== 'manual') {
        const hasAward = await storage.checkUserHasAward(userId, dbAwardId, currentYear);
        if (hasAward) {
          return res.status(400).json({ error: 'User already has this award for the specified year' });
        }
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
      
      // Check if user already has this award for the same year (only for non-manual awards)
      if (awardDefinition.triggerCategory !== 'manual') {
        const hasAward = await storage.checkUserHasAward(userId, awardId, year);
        if (hasAward) {
          return res.status(400).json({ error: 'User already has this award for the specified year' });
        }
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
  // ADMIN USER BILLING DETAILS
  // =============================================
  
  // Get detailed billing info for a user (admin only)
  app.get('/api/admin/users/:userId/billing', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (user.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot view billing for users from other organizations' });
      }
      
      // Get child players if this is a parent account
      const allUsers = await storage.getUsersByOrganization(organizationId);
      const childPlayers = allUsers.filter(u => u.accountHolderId === userId && u.role === 'player');
      
      // Get all subscriptions for this user
      const subscriptions = await storage.getSubscriptionsByOwner(userId);
      console.log(`📊 Admin billing for ${userId}: Found ${subscriptions.length} owner subscriptions`);
      console.log(`📊 Admin billing: childPlayers count: ${childPlayers.length}`);
      
      // Get enrollments for each child player
      const playerEnrollments: Record<string, any[]> = {};
      const playerSubscriptions: Record<string, any[]> = {};
      
      for (const player of childPlayers) {
        const enrollments = await storage.getActiveEnrollmentsWithCredits(player.id);
        playerEnrollments[player.id] = enrollments;
        
        const playerSubs = await storage.getSubscriptionsByPlayerId(player.id);
        playerSubscriptions[player.id] = playerSubs;
      }
      
      // Collect unique Stripe subscription IDs
      const stripeSubIds = new Set<string>();
      for (const sub of subscriptions) {
        if (sub.stripeSubscriptionId) stripeSubIds.add(sub.stripeSubscriptionId);
      }
      for (const playerId in playerSubscriptions) {
        for (const sub of playerSubscriptions[playerId]) {
          if (sub.stripeSubscriptionId) stripeSubIds.add(sub.stripeSubscriptionId);
        }
      }
      
      // Fetch Stripe subscription details
      const stripeDetails: Record<string, any> = {};
      console.log(`📊 Admin billing: Found ${stripeSubIds.size} Stripe subscription IDs:`, Array.from(stripeSubIds));
      
      if (stripe) {
        for (const subId of stripeSubIds) {
          try {
            console.log(`📊 Fetching Stripe subscription: ${subId}`);
            const stripeSub = await stripe.subscriptions.retrieve(subId);
            // Log all keys and items.data[0] period info
            console.log(`📊 Stripe sub all keys:`, Object.keys(stripeSub).slice(0, 15));
            const itemPeriodEnd = stripeSub.items?.data?.[0]?.current_period_end;
            console.log(`📊 Stripe items[0] period_end:`, itemPeriodEnd);
            // Use items period data or subscription period data
            const periodEnd = itemPeriodEnd || (stripeSub as any).current_period_end || (stripeSub as any).currentPeriodEnd;
            const periodStart = stripeSub.items?.data?.[0]?.current_period_start || (stripeSub as any).current_period_start || (stripeSub as any).currentPeriodStart;
            const cancelEnd = (stripeSub as any).cancel_at_period_end || (stripeSub as any).cancelAtPeriodEnd;
            console.log(`📊 Stripe subscription ${subId} status: ${stripeSub.status}, period_end: ${periodEnd}`);
            stripeDetails[subId] = {
              id: stripeSub.id,
              status: stripeSub.status,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: cancelEnd,
              interval: stripeSub.items.data[0]?.price?.recurring?.interval || 'month',
              amount: stripeSub.items.data[0]?.price?.unit_amount || 0,
              currency: stripeSub.items.data[0]?.price?.currency || 'usd',
              productName: stripeSub.items.data[0]?.price?.product,
            };
          } catch (stripeError: any) {
            console.warn(`Could not fetch Stripe subscription ${subId}:`, stripeError.message);
          }
        }
      }
      
      console.log(`📊 Admin billing: stripeDetails keys:`, Object.keys(stripeDetails));
      
      // Build player details with their programs and subscriptions
      const playersWithDetails = await Promise.all(childPlayers.map(async (player) => {
        const enrollments = playerEnrollments[player.id] || [];
        const subs = playerSubscriptions[player.id] || [];
        
        // Enrich subscriptions with Stripe data
        const enrichedSubs = subs.map(sub => ({
          ...sub,
          stripe: sub.stripeSubscriptionId ? stripeDetails[sub.stripeSubscriptionId] : null,
          nextPaymentDate: sub.stripeSubscriptionId && stripeDetails[sub.stripeSubscriptionId]?.currentPeriodEnd 
            ? new Date(stripeDetails[sub.stripeSubscriptionId].currentPeriodEnd * 1000).toISOString()
            : null,
        }));
        
        return {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          programs: enrollments.map(e => ({
            programId: e.programId,
            programName: e.programName,
            status: e.status,
            remainingCredits: e.remainingCredits,
            source: e.source,
          })),
          subscriptions: enrichedSubs,
        };
      }));
      
      // Get all unique Stripe subscription IDs for display
      const allStripeSubIds = Array.from(stripeSubIds);
      
      // Calculate next payment date across all subscriptions
      let nextPaymentDate: string | null = null;
      let nextPaymentAmount = 0;
      
      for (const subId in stripeDetails) {
        const sub = stripeDetails[subId];
        if (sub.status === 'active' && sub.currentPeriodEnd) {
          const subNextDate = new Date(sub.currentPeriodEnd * 1000).toISOString();
          if (!nextPaymentDate || subNextDate < nextPaymentDate) {
            nextPaymentDate = subNextDate;
            nextPaymentAmount = sub.amount;
          }
        }
      }
      
      res.json({
        success: true,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionIds: allStripeSubIds,
        players: playersWithDetails,
        nextPaymentDate,
        nextPaymentAmount,
        stripeDetails,
      });
    } catch (error: any) {
      console.error('Error fetching admin user billing:', error);
      res.status(500).json({ error: 'Failed to fetch billing details', message: error.message });
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
      // Get all users from default organization
      const allUsers = await storage.getUsersByOrganization('default-org');
      
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
  // BUG REPORTS
  // =============================================
  
  app.post("/api/bug-reports", requireAuth, async (req: any, res) => {
    try {
      const { title, description } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: "Title and description are required" });
      }
      
      const userId = req.user?.id || 'anonymous';
      const organizationId = req.user?.organizationId || 'default-org';
      
      // Fetch full user details from storage
      const fullUser = userId !== 'anonymous' ? await storage.getUser(userId) : null;
      const userEmail = fullUser?.email || 'unknown';
      const userName = fullUser?.firstName && fullUser?.lastName 
        ? `${fullUser.firstName} ${fullUser.lastName}` 
        : 'Unknown User';
      
      const reportId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      
      // Save to database
      const bugReport = await storage.createBugReport({
        id: reportId,
        organizationId,
        userId,
        userEmail,
        userName,
        title,
        description,
        userAgent: req.headers['user-agent'] || 'unknown',
        platform: req.headers['sec-ch-ua-platform'] || 'unknown',
        status: 'open',
      });
      
      // Save as JSON file for easy download
      const bugReportsDir = './bug-reports';
      if (!fs.existsSync(bugReportsDir)) {
        fs.mkdirSync(bugReportsDir, { recursive: true });
      }
      
      const timestamp = createdAt.replace(/[:.]/g, '-');
      const filename = `bug-report_${timestamp}_${reportId.slice(0, 8)}.json`;
      const filePath = `${bugReportsDir}/${filename}`;
      
      const reportData = {
        id: reportId,
        title,
        description,
        userName,
        userEmail,
        userId,
        organizationId,
        userAgent: req.headers['user-agent'] || 'unknown',
        platform: req.headers['sec-ch-ua-platform'] || 'unknown',
        status: 'open',
        createdAt,
      };
      
      fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
      console.log(`🐛 Bug report saved to database: ${bugReport.id}`);
      console.log(`📁 Bug report saved to file: ${filePath}`);
      
      res.json({ success: true, message: "Bug report submitted successfully", id: bugReport.id });
    } catch (error: any) {
      console.error('Error saving bug report:', error);
      res.status(500).json({ error: "Failed to save bug report" });
    }
  });
  
  // Get all bug reports (admin only)
  app.get("/api/bug-reports", requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      
      if (role !== 'admin') {
        return res.status(403).json({ error: "Only admins can view bug reports" });
      }
      
      const reports = await storage.getBugReportsByOrganization(organizationId);
      res.json(reports);
    } catch (error: any) {
      console.error('Error fetching bug reports:', error);
      res.status(500).json({ error: "Failed to fetch bug reports" });
    }
  });
  
  // Download all bug reports as JSON file (admin only)
  app.get("/api/bug-reports/download", requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      
      if (role !== 'admin') {
        return res.status(403).json({ error: "Only admins can download bug reports" });
      }
      
      const reports = await storage.getBugReportsByOrganization(organizationId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `bug-reports_${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(reports);
    } catch (error: any) {
      console.error('Error downloading bug reports:', error);
      res.status(500).json({ error: "Failed to download bug reports" });
    }
  });
  
  // Update bug report status (admin only)
  app.patch("/api/bug-reports/:id", requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      const { id } = req.params;
      const { status } = req.body;
      
      if (role !== 'admin') {
        return res.status(403).json({ error: "Only admins can update bug reports" });
      }
      
      const updates: any = { status };
      if (status === 'resolved' || status === 'closed') {
        updates.resolvedAt = new Date().toISOString();
      }
      
      const updated = await storage.updateBugReport(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Bug report not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating bug report:', error);
      res.status(500).json({ error: "Failed to update bug report" });
    }
  });

  // =============================================
  // DIRECT MESSAGES (Parent-Coach 1-on-1)
  // =============================================
  
  app.get("/api/direct-messages/:userId", requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      // Users can only access their own DMs
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getDirectMessagesForUser(userId);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching direct messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.get("/api/direct-messages/:senderId/:receiverId", requireAuth, async (req: any, res) => {
    try {
      const { senderId, receiverId } = req.params;
      // Users can only access conversations they're part of
      if (req.user.id !== senderId && req.user.id !== receiverId && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getDirectMessagesBetweenUsers(senderId, receiverId);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching direct messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.post("/api/direct-messages", requireAuth, async (req: any, res) => {
    try {
      const { receiverId, message, teamId } = req.body;
      const dm = await storage.createDirectMessage({
        organizationId: req.user.organizationId,
        senderId: req.user.id,
        receiverId,
        message,
        teamId: teamId || null,
      });
      res.json(dm);
    } catch (error: any) {
      console.error('Error creating direct message:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  app.patch("/api/direct-messages/:id/read", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.markDirectMessageRead(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error marking message read:', error);
      res.status(500).json({ error: "Failed to mark message read" });
    }
  });
  
  // =============================================
  // CONTACT MANAGEMENT MESSAGES
  // =============================================
  
  app.get("/api/contact-management", requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const messages = await storage.getContactManagementMessages(organizationId);
      
      // Enrich with sender info
      const enrichedMessages = await Promise.all(messages.map(async (msg: any) => {
        const sender = await storage.getUser(msg.senderId);
        return {
          ...msg,
          sender: sender ? {
            id: sender.id,
            firstName: sender.firstName,
            lastName: sender.lastName,
            email: sender.email,
          } : null,
        };
      }));
      res.json(enrichedMessages);
    } catch (error: any) {
      console.error('Error fetching contact messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.get("/api/contact-management/my-messages", requireAuth, async (req: any, res) => {
    try {
      const messages = await storage.getContactManagementMessagesBySender(req.user.id);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching my contact messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.post("/api/contact-management", requireAuth, async (req: any, res) => {
    try {
      const { message } = req.body;
      const user = await storage.getUser(req.user.id);
      const msg = await storage.createContactManagementMessage({
        organizationId: req.user.organizationId,
        senderId: req.user.id,
        senderName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        senderEmail: user?.email || null,
        message,
      });
      res.json(msg);
    } catch (error: any) {
      console.error('Error creating contact message:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  app.patch("/api/contact-management/:id", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const updated = await storage.updateContactManagementMessage(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating contact message:', error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });
  
  // =============================================
  // CRM LEADS
  // =============================================
  
  app.get("/api/crm/leads", requireAuth, async (req: any, res) => {
    try {
      // Allow both admins and coaches to view leads (coaches need it for evaluation form)
      if (req.user.role !== 'admin' && req.user.role !== 'coach') {
        return res.status(403).json({ error: "Admin or coach access required" });
      }
      const leads = await storage.getCrmLeadsByOrganization(req.user.organizationId);
      res.json(leads);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });
  
  app.get("/api/crm/leads/:id", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const lead = await storage.getCrmLead(parseInt(req.params.id));
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });
  
  app.post("/api/crm/leads", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const lead = await storage.createCrmLead({
        organizationId: req.user.organizationId,
        ...req.body,
      });
      res.json(lead);
    } catch (error: any) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });
  
  app.patch("/api/crm/leads/:id", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const updated = await storage.updateCrmLead(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });
  
  app.delete("/api/crm/leads/:id", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      await storage.deleteCrmLead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });
  
  // Save lead evaluation (coaches and admins can save)
  app.patch("/api/crm/leads/:id/evaluation", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'coach') {
        return res.status(403).json({ error: "Coach or admin access required" });
      }
      const leadId = parseInt(req.params.id);
      const evaluation = req.body;
      
      // Add metadata
      evaluation.savedBy = req.user.id;
      evaluation.savedAt = new Date().toISOString();
      
      const updated = await storage.updateCrmLead(leadId, { evaluation });
      res.json(updated);
    } catch (error: any) {
      console.error('Error saving lead evaluation:', error);
      res.status(500).json({ error: "Failed to save evaluation" });
    }
  });
  
  // =============================================
  // CRM NOTES
  // =============================================
  
  app.get("/api/crm/notes/lead/:leadId", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const notes = await storage.getCrmNotesByLead(parseInt(req.params.leadId));
      res.json(notes);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });
  
  app.get("/api/crm/notes/user/:userId", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const notes = await storage.getCrmNotesByUser(req.params.userId);
      res.json(notes);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });
  
  app.post("/api/crm/notes", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const note = await storage.createCrmNote({
        organizationId: req.user.organizationId,
        authorId: req.user.id,
        ...req.body,
      });
      res.json(note);
    } catch (error: any) {
      console.error('Error creating note:', error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });
  
  app.delete("/api/crm/notes/:id", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      await storage.deleteCrmNote(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting note:', error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });
  
  // =============================================
  // QUOTE CHECKOUTS
  // =============================================
  
  app.get("/api/quotes", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const quotes = await storage.getQuoteCheckoutsByOrganization(req.user.organizationId);
      res.json(quotes);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });
  
  app.get("/api/quotes/:id", async (req: any, res) => {
    try {
      const quote = await storage.getQuoteCheckout(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      // Check if expired
      if (quote.expiresAt && new Date(quote.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Quote has expired" });
      }
      if (quote.status !== 'pending') {
        return res.status(410).json({ error: "Quote has already been used" });
      }
      res.json(quote);
    } catch (error: any) {
      console.error('Error fetching quote:', error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });
  
  app.post("/api/quotes", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { nanoid } = await import('nanoid');
      const quoteId = nanoid(12);
      const quote = await storage.createQuoteCheckout({
        id: quoteId,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
        ...req.body,
      });
      res.json(quote);
    } catch (error: any) {
      console.error('Error creating quote:', error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });
  
  app.patch("/api/quotes/:id", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const updated = await storage.updateQuoteCheckout(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating quote:', error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Alias for frontend consistency
  app.get("/api/quote-checkouts", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const quotes = await storage.getQuoteCheckoutsByOrganization(req.user.organizationId);
      const leads = await storage.getCrmLeadsByOrganization(req.user.organizationId);
      
      // Attach lead info and add checkoutId alias
      const enrichedQuotes = quotes.map((q: any) => ({
        ...q,
        checkoutId: q.id,
        lead: leads.find((l: any) => l.id === q.leadId) || null,
      }));
      res.json(enrichedQuotes);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.post("/api/quote-checkouts", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { nanoid } = await import('nanoid');
      const quoteId = nanoid(12);
      
      // Build items array with prices from programs AND store products (use customPrice if provided)
      const allProducts = await storage.getProgramsByOrganization(req.user.organizationId);
      const items = (req.body.items || []).map((item: any) => {
        const product = allProducts.find((p: any) => p.id === item.productId);
        // Use customPrice if provided, otherwise use product's default price
        const price = item.customPrice !== undefined ? item.customPrice : (product?.price || 0);
        return {
          type: item.type || 'program',
          productId: item.productId,
          productName: product?.name || 'Unknown',
          price,
          originalPrice: product?.price || 0, // Store original for reference
          quantity: item.quantity || 1,
        };
      });
      
      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      
      const quote = await storage.createQuoteCheckout({
        id: quoteId,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
        leadId: req.body.leadId ? parseInt(req.body.leadId) : null,
        userId: req.body.userId || null, // For quotes to existing members
        items,
        totalAmount,
        programIds: items.map((i: any) => i.productId),
      });
      res.json({ ...quote, checkoutId: quote.id });
    } catch (error: any) {
      console.error('Error creating quote:', error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  // Public quote checkout access (no auth required for lead checkout)
  app.get("/api/quote-checkouts/:checkoutId", async (req: any, res) => {
    try {
      const quote = await storage.getQuoteCheckout(req.params.checkoutId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // Attach lead info if available
      let lead = null;
      if (quote.leadId) {
        lead = await storage.getCrmLead(quote.leadId);
      }
      
      // Attach user info if available (for quotes to existing members)
      let user = null;
      if (quote.userId) {
        user = await storage.getUser(quote.userId);
      }
      
      // Collect required waivers from all programs in the quote
      const requiredWaiverIds = new Set<string>();
      const programs: any[] = [];
      const addOns: any[] = [];
      
      if (quote.items && Array.isArray(quote.items)) {
        for (const item of quote.items) {
          if (item.type === 'program' && item.productId) {
            const program = await storage.getProgram(item.productId);
            if (program) {
              programs.push(program);
              if (program.requiredWaivers && Array.isArray(program.requiredWaivers)) {
                program.requiredWaivers.forEach((wid: string) => requiredWaiverIds.add(wid));
              }
              
              // Fetch add-ons for this program (other products in same organization)
              const allProducts = await storage.getProgramsByOrganization(quote.organizationId);
              const quoteItems = Array.isArray(quote.items) ? quote.items : [];
              const programAddOns = allProducts.filter((p: any) => 
                p.id !== program.id && 
                p.isActive && 
                p.productType !== 'membership' &&
                !quoteItems.some((qi: any) => qi.productId === p.id)
              ).slice(0, 3);
              
              programAddOns.forEach((ao: any) => {
                if (!addOns.some(a => a.id === ao.id)) {
                  addOns.push(ao);
                }
              });
            }
          }
        }
      }
      
      // Fetch waivers
      const allWaivers = await storage.getWaiversByOrganization(quote.organizationId);
      const waivers = allWaivers.filter((w: any) => requiredWaiverIds.has(w.id) && w.isActive);
      
      res.json({ 
        ...quote, 
        checkoutId: quote.id, 
        lead,
        user,
        waivers,
        suggestedAddOns: addOns.slice(0, 3),
        programs,
      });
    } catch (error: any) {
      console.error('Error fetching quote:', error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  // Fetch quotes for a specific user (for their payments tab)
  app.get("/api/account/quotes", requireAuth, async (req: any, res) => {
    try {
      const allQuotes = await storage.getQuoteCheckoutsByOrganization(req.user.organizationId);
      const currentUser = await storage.getUser(req.user.id);
      
      // Get all user IDs that share the same email (handles multi-account scenarios)
      const allUsers = await storage.getUsersByOrganization(req.user.organizationId);
      const matchingUserIds = new Set<string>();
      matchingUserIds.add(req.user.id);
      
      // Also add any user accounts with the same email
      if (currentUser?.email) {
        allUsers.forEach((u: any) => {
          if (u.email === currentUser.email) {
            matchingUserIds.add(u.id);
          }
        });
      }
      
      // Filter quotes for any matching user ID
      const userQuotes = allQuotes.filter((q: any) => 
        matchingUserIds.has(q.userId) && q.status === 'pending'
      );
      res.json(userQuotes);
    } catch (error: any) {
      console.error('Error fetching user quotes:', error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Complete quote checkout (creates account, player, and redirects to payment)
  app.post("/api/quote-checkouts/:checkoutId/complete", async (req: any, res) => {
    try {
      const quote = await storage.getQuoteCheckout(req.params.checkoutId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      if (quote.status === 'completed') {
        return res.status(400).json({ error: "Quote has already been completed" });
      }
      if (quote.status === 'expired' || (quote.expiresAt && new Date(quote.expiresAt) < new Date())) {
        return res.status(400).json({ error: "Quote has expired" });
      }

      const { firstName, lastName, email, password, phone, playerFirstName, playerLastName, playerBirthDate } = req.body;
      const { nanoid } = await import('nanoid');
      
      let accountUser: any;
      let player: any;

      // Determine if this is an existing user checkout based on quote data (server-side, not client)
      const isExistingUserCheckout = !!quote.userId;

      // Validate required fields based on checkout type
      if (!isExistingUserCheckout) {
        // New user checkout requires all account and player fields
        if (!email || !password || !firstName || !lastName) {
          return res.status(400).json({ error: "Account details (email, password, first name, last name) are required" });
        }
        if (!playerFirstName || !playerLastName) {
          return res.status(400).json({ error: "Player details (first name, last name) are required" });
        }
      }

      // Check if this is a quote for an existing user
      if (isExistingUserCheckout) {
        // Use existing user from quote
        accountUser = await storage.getUser(quote.userId);
        if (!accountUser) {
          return res.status(400).json({ error: "User associated with this quote not found" });
        }
        
        // Get the first player linked to this account for enrollment
        const linkedPlayers = await storage.getPlayersByParent(accountUser.id);
        player = linkedPlayers[0]; // Use first player if available
        
        if (!player) {
          // If no player exists, create one using account holder's name
          const pFirstName = playerFirstName || accountUser.firstName || 'Player';
          const pLastName = playerLastName || accountUser.lastName || 'Profile';
          player = await storage.createUser({
            id: nanoid(21),
            firstName: pFirstName,
            lastName: pLastName,
            email: `${pFirstName.toLowerCase().replace(/\s+/g, '')}.${nanoid(6)}@player.local`,
            role: 'player',
            userType: 'player',
            dateOfBirth: playerBirthDate ? new Date(playerBirthDate) : null,
            parentId: accountUser.id,
            organizationId: quote.organizationId,
            isVerified: false,
          });
        }
      } else {
        // New user flow - create account
        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ error: "An account with this email already exists. Please login instead." });
        }

        // Create parent account
        const bcrypt = await import('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        accountUser = await storage.createUser({
          id: nanoid(21),
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'parent',
          userType: 'parent',
          organizationId: quote.organizationId,
          emailVerified: false,
          isVerified: false,
        });

        // Create player profile
        player = await storage.createUser({
          id: nanoid(21),
          firstName: playerFirstName,
          lastName: playerLastName,
          email: `${playerFirstName.toLowerCase()}.${nanoid(6)}@player.local`,
          role: 'player',
          userType: 'player',
          dateOfBirth: playerBirthDate ? new Date(playerBirthDate) : null,
          parentId: accountUser.id,
          organizationId: quote.organizationId,
          isVerified: false,
        });
      }

      // Update quote status
      await storage.updateQuoteCheckout(quote.id, { 
        status: 'completed',
        userId: accountUser.id,
        completedAt: new Date(),
      });

      // Create enrollments for program items (pending player assignment)
      const enrollmentIds: number[] = [];
      if (quote.items && Array.isArray(quote.items)) {
        for (const item of quote.items) {
          if (item.type === 'program' && item.productId) {
            const program = await storage.getProgram(item.productId);
            const enrollment = await storage.createEnrollment({
              organizationId: quote.organizationId,
              programId: item.productId,
              accountHolderId: accountUser.id,
              profileId: player.id, // Assign to the player created during checkout
              status: 'pending', // Will be activated after payment
              source: 'quote',
              totalCredits: program?.sessionCount || null,
              remainingCredits: program?.sessionCount || null,
              metadata: { quoteId: quote.id, quoteItemName: item.productName },
            });
            enrollmentIds.push(enrollment.id);
          }
        }
      }

      // If there are items that require payment, create a Stripe checkout session
      if (quote.totalAmount && quote.totalAmount > 0 && stripe) {
        const lineItems = quote.items?.map((item: any) => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.productName || item.name,
            },
            unit_amount: item.price,
          },
          quantity: item.quantity || 1,
        })) || [];

        const baseUrl = req.headers.origin || 'http://localhost:5000';
        const successUrl = isExistingUserCheckout 
          ? `${baseUrl}/account?tab=payments&checkout=success`
          : `${baseUrl}/login?checkout=success`;
        
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: successUrl,
          cancel_url: `${baseUrl}/checkout/${req.params.checkoutId}?checkout=cancelled`,
          customer_email: email || accountUser.email,
          metadata: {
            userId: accountUser.id,
            playerId: player.id,
            quoteId: quote.id,
            enrollmentIds: JSON.stringify(enrollmentIds),
          },
        });

        return res.json({ paymentUrl: session.url });
      }

      // No payment needed - activate enrollments immediately
      for (const enrollmentId of enrollmentIds) {
        await storage.updateEnrollment(enrollmentId, { status: 'active' });
      }

      res.json({ success: true, userId: accountUser.id });
    } catch (error: any) {
      console.error('Error completing quote checkout:', error);
      res.status(500).json({ error: "Failed to complete checkout" });
    }
  });

  // Reply to contact management message
  app.post("/api/contact-management/:id/reply", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const parentMessageId = parseInt(req.params.id);
      const reply = await storage.createContactManagementMessage({
        senderId: req.user.id,
        organizationId: req.user.organizationId,
        message: req.body.message,
        parentMessageId,
        isAdmin: true,
      });
      res.json(reply);
    } catch (error: any) {
      console.error('Error sending reply:', error);
      res.status(500).json({ error: "Failed to send reply" });
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
