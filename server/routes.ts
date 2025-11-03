import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import Stripe from "stripe";
import * as emailService from "./email";
import crypto from "crypto";
import searchRoutes from "./routes/search";
import multer from "multer";
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

let wss: WebSocketServer | null = null;

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-06-30.basil" })
  : null;

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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

// Simple password hashing for development (use bcrypt in production)
function hashPassword(password: string): string {
  // Very basic hashing - in production use bcrypt
  return Buffer.from(password).toString('base64');
}

// Simple auth middleware for development
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.session && req.session.userId) {
    req.user = { 
      id: req.session.userId, 
      organizationId: req.session.organizationId || "default-org", 
      role: req.session.role || "user" 
    };
    next();
  } else {
    // Return 401 for unauthenticated requests
    res.status(401).json({ error: "Not authenticated" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize test users and facilities in development
  if (process.env.NODE_ENV === 'development') {
    // Type assertion to access the method
    await (storage as any).initializeTestUsers?.();
    await (storage as any).initializeFacilities?.();
    await (storage as any).initializeAwardDefinitions?.();
  }
  
  // =============================================
  // STATIC ASSETS ROUTES
  // =============================================
  
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
  // AUTH ROUTES
  // =============================================
  
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
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
      
      // Set session
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.role = user.role;
      
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName 
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
      const { email, organizationId = "default-org" } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      // Check if user already exists
      let user = await storage.getUserByEmail(email, organizationId);
      
      if (user) {
        // User already exists
        if (user.verified) {
          return res.status(400).json({ 
            success: false, 
            message: "This email is already registered and verified. Please login instead." 
          });
        }
        
        // User exists but not verified - resend verification email
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        await storage.updateUser(user.id, {
          verificationToken,
          verificationExpiry,
        });
        
        await emailService.sendVerificationEmail({
          email: user.email,
          firstName: user.firstName || 'User',
          verificationToken,
        });
        
        return res.json({ 
          success: true, 
          message: "Verification email sent. Please check your inbox.",
          exists: true 
        });
      }
      
      // Create minimal user record with just email
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      user = await storage.createUser({
        organizationId,
        email,
        role: 'parent', // Default role, will be updated later
        firstName: '',
        lastName: '',
        verified: false,
        verificationToken,
        verificationExpiry,
        isActive: true,
        awards: [],
        totalPractices: 0,
        totalGames: 0,
        consecutiveCheckins: 0,
        videosCompleted: 0,
        yearsActive: 0,
      });
      
      // Send verification email
      await emailService.sendVerificationEmail({
        email,
        firstName: 'User',
        verificationToken,
      });
      
      res.json({ 
        success: true, 
        message: "Verification email sent! Please check your inbox.",
        userId: user.id,
        exists: false
      });
    } catch (error: any) {
      console.error("Send verification error:", error);
      res.status(500).json({ success: false, message: "Failed to send verification email" });
    }
  });
  
  // Email verification endpoint
  app.get('/api/auth/verify-email', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Verification token is required" });
      }
      
      // Find user by verification token
      const allUsers = await storage.getUsersByOrganization("default-org");
      const user = allUsers.find(u => u.verificationToken === token);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "Invalid verification token" });
      }
      
      // Check if token is expired (24 hours)
      if (user.verificationExpiry && new Date() > user.verificationExpiry) {
        return res.status(400).json({ success: false, message: "Verification token has expired" });
      }
      
      // Check Stripe for existing customer data
      let stripeCustomerData = null;
      if (stripe && user.email) {
        try {
          const customers = await stripe.customers.list({
            email: user.email,
            limit: 1,
          });
          
          if (customers.data.length > 0) {
            const customer = customers.data[0];
            stripeCustomerData = {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              address: customer.address,
              metadata: customer.metadata,
            };
            
            // Prefill user data from Stripe if available
            const updateData: any = {
              verified: true,
              verificationToken: null,
              verificationExpiry: null,
            };
            
            // Extract first and last name from Stripe name if user doesn't have them
            if (customer.name && (!user.firstName || !user.lastName)) {
              const nameParts = customer.name.split(' ');
              if (!user.firstName && nameParts.length > 0) {
                updateData.firstName = nameParts[0];
              }
              if (!user.lastName && nameParts.length > 1) {
                updateData.lastName = nameParts.slice(1).join(' ');
              }
            }
            
            // Add phone if available
            if (customer.phone && !user.phoneNumber) {
              updateData.phoneNumber = customer.phone;
            }
            
            await storage.updateUser(user.id, updateData);
            
            console.log(`Stripe customer found and data prefilled for user ${user.email}`);
          }
        } catch (stripeError: any) {
          console.error("Stripe lookup error (non-fatal):", stripeError.message);
          // Continue even if Stripe lookup fails
        }
      }
      
      // Mark user as verified (if not already done above)
      if (!stripeCustomerData) {
        await storage.updateUser(user.id, {
          verified: true,
          verificationToken: null as any,
          verificationExpiry: null as any,
        });
      }
      
      res.json({ 
        success: true, 
        message: stripeCustomerData 
          ? "Email verified successfully! We found your information from previous payments and have prefilled your profile."
          : "Email verified successfully! Continue with registration.",
        email: user.email,
        stripeDataFound: !!stripeCustomerData,
      });
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.status(500).json({ success: false, message: "Verification failed" });
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
        
        // Find user by email
        const user = await storage.getUserByEmail(email, "default-org");
        
        if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
        }
        
        // Mark user as verified
        await storage.updateUser(user.id, {
          verified: true,
          verificationToken: null as any,
          verificationExpiry: null as any,
        });
        
        console.log(`[TEST] Email ${email} marked as verified for testing`);
        
        res.json({ 
          success: true, 
          message: "Email verified for testing",
          email: user.email,
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
      const { email } = req.body;
      
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
      
      // Update user with magic link token
      await storage.updateUser(user.id, {
        magicLinkToken,
        magicLinkExpiry,
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
  
  // Magic link login endpoint
  app.get('/api/auth/magic-link-login', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Magic link token is required" });
      }
      
      // Find user by magic link token
      const allUsers = await storage.getUsersByOrganization("default-org");
      const user = allUsers.find(u => u.magicLinkToken === token);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "Invalid magic link" });
      }
      
      // Check if token is expired (15 minutes)
      if (user.magicLinkExpiry && new Date() > user.magicLinkExpiry) {
        return res.status(400).json({ success: false, message: "Magic link has expired. Please request a new one." });
      }
      
      // Clear magic link token
      await storage.updateUser(user.id, {
        magicLinkToken: null as any,
        magicLinkExpiry: null as any,
      });
      
      // Set session
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.role = user.role;
      
      res.json({ 
        success: true, 
        message: "Logged in successfully!",
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName 
        } 
      });
    } catch (error: any) {
      console.error("Magic link login error:", error);
      res.status(500).json({ success: false, message: "Login failed" });
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
  
  app.post("/api/payments/checkout-session", isAuthenticated, async (req: any, res) => {
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
        success_url: `${origin}/payments?success=true`,
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
                  amount: session.amount_total / 100, // Convert from cents to dollars
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
        
        // Optionally create a payment record
        if (session.amount_total) {
          try {
            await storage.createPayment({
              organizationId: "default-org",
              userId,
              amount: session.amount_total / 100, // Convert from cents to dollars
              currency: 'usd',
              paymentType: 'stripe_checkout',
              status: 'completed',
              description: `Stripe Checkout Session: ${session.id}`,
            });
            console.log(`✅ Created payment record for user ${userId}`);
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
      const { registrationType, parentInfo, players, packageId, password, email } = req.body;
      
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
      
      // Check if user exists and is verified (should have been created at step 1)
      const existingUser = await storage.getUserByEmail(primaryEmail, organizationId);
      
      if (!existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "No verification found for this email. Please start registration again." 
        });
      }
      
      if (!existingUser.verified) {
        return res.status(403).json({ 
          success: false, 
          message: "Please verify your email before completing registration. Check your inbox for the verification link." 
        });
      }
      
      // Hash the password
      const hashedPassword = password ? hashPassword(password) : undefined;
      
      // Update user with full registration details
      let accountHolderId: string | undefined;
      let primaryUser: any = null;
      
      if (registrationType === "my_child" && parentInfo) {
        // Update the existing parent user with full details
        primaryUser = await storage.updateUser(existingUser.id, {
          role: "parent",
          firstName: parentInfo.firstName,
          lastName: parentInfo.lastName,
          phoneNumber: parentInfo.phoneNumber,
          dateOfBirth: sanitizeDate(parentInfo.dateOfBirth),
          password: hashedPassword,
          packageSelected: packageId,
          hasRegistered: true,
        });
        accountHolderId = existingUser.id;
        
        // Create player profiles for children
        const createdPlayers = [];
        for (const player of players) {
          const playerEmail = `${player.firstName.toLowerCase()}.${player.lastName.toLowerCase()}@temp.com`;
          
          const playerUser = await storage.createUser({
            organizationId,
            email: playerEmail,
            role: "player",
            firstName: player.firstName,
            lastName: player.lastName,
            dateOfBirth: sanitizeDate(player.dateOfBirth),
            gender: player.gender,
            accountHolderId,
            packageSelected: packageId,
            teamAssignmentStatus: "pending",
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
        // "myself" registration - update existing user with full details
        const player = players[0];
        primaryUser = await storage.updateUser(existingUser.id, {
          role: "player",
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: sanitizeDate(player.dateOfBirth),
          gender: player.gender,
          password: hashedPassword,
          packageSelected: packageId,
          teamAssignmentStatus: "pending",
          hasRegistered: true,
          registrationType: "myself",
        });
      }
      
      res.json({
        success: true,
        message: "Registration complete! You can now login.",
        requiresVerification: false,
        email: primaryEmail,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Registration failed" 
      });
    }
  });
  
  // Get users by account holder (for unified account page)
  app.get('/api/account/players', isAuthenticated, async (req: any, res) => {
    const { id } = req.user;
    const user = await storage.getUser(id);
    
    if (user?.role === "parent" || user?.role === "admin") {
      // Get all players linked to this parent/admin
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      const linkedPlayers = allUsers.filter(u => u.accountHolderId === id && u.role === "player");
      res.json(linkedPlayers);
    } else if (user?.role === "player") {
      // Return self
      res.json([user]);
    } else {
      res.json([]);
    }
  });
  
  // Add player to account (for parents and admins adding players)
  app.post('/api/account/players', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.user;
      const user = await storage.getUser(id);
      
      if (!user || (user.role !== "parent" && user.role !== "admin")) {
        return res.status(403).json({ 
          success: false, 
          message: "Only parent and admin accounts can add players" 
        });
      }
      
      const { firstName, lastName, dateOfBirth, gender, packageId } = req.body;
      
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
      
      // Create player email (temporary email pattern)
      const playerEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}@temp.com`;
      
      // Create child player user with PENDING payment status
      const playerUser = await storage.createUser({
        organizationId: user.organizationId,
        email: playerEmail,
        role: "player",
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
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
        success_url: `${origin}/unified-account?payment=success`,
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
  
  // Get profile by ID
  app.get('/api/profile/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/upload-profile-photo', isAuthenticated, upload.single('photo'), async (req: any, res) => {
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

  // Update player profile (for parents updating child profiles or players updating self)
  app.patch('/api/profile/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/organization', isAuthenticated, async (req: any, res) => {
    const org = await storage.getOrganization(req.user.organizationId);
    res.json(org);
  });
  
  app.patch('/api/organization', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const users = await storage.getUsersByOrganization(organizationId);
    res.json(users);
  });
  
  app.get('/api/users/role/:role', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const { role } = req.params;
    const users = await storage.getUsersByRole(organizationId, role);
    res.json(users);
  });
  
  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create users' });
    }
    
    const userData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(userData);
    res.json(user);
  });
  
  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update users' });
    }
    
    const updated = await storage.updateUser(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }
    
    await storage.deleteUser(req.params.id);
    res.json({ success: true });
  });
  
  // Get user's team information
  app.get('/api/users/:userId/team', isAuthenticated, async (req: any, res) => {
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
        ageGroup: team.divisionId ? `Division ${team.divisionId}` : 'N/A',
        program: team.programType || 'N/A',
        color: '#d82428', // Default UYP red
      });
    } catch (error: any) {
      console.error('Error fetching user team:', error);
      res.status(500).json({ message: 'Failed to fetch user team' });
    }
  });
  
  // =============================================
  // TEAM ROUTES
  // =============================================
  
  app.get('/api/teams', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const teams = await storage.getTeamsByOrganization(organizationId);
    res.json(teams);
  });
  
  app.get('/api/teams/coach/:coachId', isAuthenticated, async (req: any, res) => {
    const teams = await storage.getTeamsByCoach(req.params.coachId);
    res.json(teams);
  });
  
  app.post('/api/teams', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can create teams' });
    }
    
    const teamData = insertTeamSchema.parse(req.body);
    const team = await storage.createTeam(teamData);
    res.json(team);
  });
  
  app.patch('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can update teams' });
    }
    
    const updated = await storage.updateTeam(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete teams' });
    }
    
    await storage.deleteTeam(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // EVENT ROUTES
  // =============================================
  
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
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
    
    // Determine whose team/division to filter by
    let teamIds: (string | number)[] = [];
    let divisionIds: (string | number)[] = [];
    let targetUserId = userId;
    
    if (childProfileId) {
      // Player Mode: Viewing as a specific child - only show that child's events
      const childProfile = await storage.getUser(childProfileId as string);
      if (childProfile) {
        if (childProfile.teamId) teamIds = [childProfile.teamId];
        if (childProfile.divisionId) divisionIds = [childProfile.divisionId];
        targetUserId = childProfileId as string;
      }
    } else if (role === 'parent') {
      // Parent Mode: Show events from ALL children's teams + parent's own events
      const allUsersInOrg = await storage.getUsersByOrganization(organizationId);
      const childProfiles = allUsersInOrg.filter(u => u.guardianId === userId);
      
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
    } else {
      // Regular user (player/coach): Use their own team/division
      const userProfile = await storage.getUser(userId);
      if (userProfile) {
        if (userProfile.teamId) teamIds = [userProfile.teamId];
        if (userProfile.divisionId) divisionIds = [userProfile.divisionId];
      }
    }
    
    console.log('  teamIds collected:', teamIds);
    console.log('  divisionIds collected:', divisionIds);
    console.log('  targetUserId:', targetUserId);
    console.log('  Total events to filter:', allEvents.length);
    
    // Filter events based on role, teams, and divisions
    const filteredEvents = allEvents.filter((event: any) => {
      const visibility = event.visibility || {};
      const assignTo = event.assignTo || {};
      
      console.log(`  📅 Event "${event.title}" (ID: ${event.id}) - assignTo: ${JSON.stringify(assignTo)}, visibility: ${JSON.stringify(visibility)}`);
      
      // Check role-based visibility
      if (visibility.roles?.includes(role) || assignTo.roles?.includes(role)) {
        console.log(`    ✅ MATCH: Role "${role}"`);
        return true;
      }
      
      // Check team-based visibility (check all team IDs)
      for (const teamId of teamIds) {
        if (visibility.teams?.includes(String(teamId)) || assignTo.teams?.includes(String(teamId))) {
          console.log(`    ✅ MATCH: Team ${teamId}`);
          return true;
        }
      }
      
      // Check division-based visibility (check all division IDs)
      for (const divisionId of divisionIds) {
        if (visibility.divisions?.includes(String(divisionId)) || assignTo.divisions?.includes(String(divisionId))) {
          console.log(`    ✅ MATCH: Division ${divisionId}`);
          return true;
        }
      }
      
      // Check user-specific assignment
      if (assignTo.users?.includes(targetUserId) || visibility.users?.includes(targetUserId)) {
        console.log(`    ✅ MATCH: User ${targetUserId}`);
        return true;
      }
      
      // Event doesn't match any targeting criteria for this user
      console.log(`    ❌ NO MATCH`);
      return false;
    });
    
    console.log('  Filtered result:', filteredEvents.length, 'events shown');
    console.log('🔍 EVENT FILTERING DEBUG - End\n');
    
    res.json(filteredEvents);
  });
  
  app.get('/api/events/upcoming', isAuthenticated, async (req: any, res) => {
    const { organizationId, id: userId, role } = req.user;
    const { childProfileId } = req.query;
    const allEvents = await storage.getUpcomingEvents(organizationId);
    
    // Admins see all events ONLY when viewing their own dashboard (not a child's)
    if (role === 'admin' && !childProfileId) {
      return res.json(allEvents);
    }
    
    // Determine whose team/division to filter by
    let teamIds: (string | number)[] = [];
    let divisionIds: (string | number)[] = [];
    let targetUserId = userId;
    
    if (childProfileId) {
      // Player Mode: Viewing as a specific child - only show that child's events
      const childProfile = await storage.getUser(childProfileId as string);
      if (childProfile) {
        if (childProfile.teamId) teamIds = [childProfile.teamId];
        if (childProfile.divisionId) divisionIds = [childProfile.divisionId];
        targetUserId = childProfileId as string;
      }
    } else if (role === 'parent') {
      // Parent Mode: Show events from ALL children's teams + parent's own events
      const allUsersInOrg = await storage.getUsersByOrganization(organizationId);
      const childProfiles = allUsersInOrg.filter(u => u.guardianId === userId);
      
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
    } else {
      // Regular user (player/coach): Use their own team/division
      const userProfile = await storage.getUser(userId);
      if (userProfile) {
        if (userProfile.teamId) teamIds = [userProfile.teamId];
        if (userProfile.divisionId) divisionIds = [userProfile.divisionId];
      }
    }
    
    // Filter events based on role, teams, and divisions
    const filteredEvents = allEvents.filter((event: any) => {
      const visibility = event.visibility || {};
      const assignTo = event.assignTo || {};
      
      // Check role-based visibility
      if (visibility.roles?.includes(role) || assignTo.roles?.includes(role)) {
        return true;
      }
      
      // Check team-based visibility (check all team IDs)
      for (const teamId of teamIds) {
        if (visibility.teams?.includes(String(teamId)) || assignTo.teams?.includes(String(teamId))) {
          return true;
        }
      }
      
      // Check division-based visibility (check all division IDs)
      for (const divisionId of divisionIds) {
        if (visibility.divisions?.includes(String(divisionId)) || assignTo.divisions?.includes(String(divisionId))) {
          return true;
        }
      }
      
      // Check user-specific assignment
      if (assignTo.users?.includes(targetUserId) || visibility.users?.includes(targetUserId)) {
        return true;
      }
      
      // Event doesn't match any targeting criteria for this user
      return false;
    });
    
    res.json(filteredEvents);
  });
  
  app.get('/api/events/team/:teamId', isAuthenticated, async (req: any, res) => {
    const events = await storage.getEventsByTeam(req.params.teamId);
    res.json(events);
  });
  
  app.get('/api/events/:eventId/participants', isAuthenticated, async (req: any, res) => {
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
  
  app.post('/api/events', isAuthenticated, async (req: any, res) => {
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
  
  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/attendances/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const attendances = await storage.getAttendancesByEvent(req.params.eventId);
      res.json(attendances);
    } catch (error: any) {
      console.error('Error fetching attendances:', error);
      res.status(500).json({ error: 'Failed to fetch attendances' });
    }
  });
  
  // Create a new attendance/check-in
  app.post('/api/attendances', isAuthenticated, async (req: any, res) => {
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
            if (eventType.includes('practice') || eventType.includes('skills assessment')) {
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
  app.get('/api/attendance/event/:eventId', isAuthenticated, async (req: any, res) => {
    const attendances = await storage.getAttendancesByEvent(req.params.eventId);
    res.json(attendances);
  });
  
  app.get('/api/attendance/user/:userId', isAuthenticated, async (req: any, res) => {
    const attendances = await storage.getAttendancesByUser(req.params.userId);
    res.json(attendances);
  });
  
  app.post('/api/attendance', isAuthenticated, async (req: any, res) => {
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
            if (eventType.includes('practice') || eventType.includes('skills assessment')) {
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
  
  app.get('/api/event-windows/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const windows = await storage.getEventWindowsByEvent(eventId);
      res.json(windows);
    } catch (error: any) {
      console.error('Error fetching event windows:', error);
      res.status(500).json({ error: 'Failed to fetch event windows' });
    }
  });
  
  app.post('/api/event-windows', isAuthenticated, async (req: any, res) => {
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
  
  app.patch('/api/event-windows/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.delete('/api/event-windows/:id', isAuthenticated, async (req: any, res) => {
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
  
  // =============================================
  // RSVP RESPONSE ROUTES
  // =============================================
  
  app.get('/api/rsvp/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const responses = await storage.getRsvpResponsesByEvent(eventId);
      res.json(responses);
    } catch (error: any) {
      console.error('Error fetching RSVP responses:', error);
      res.status(500).json({ error: 'Failed to fetch RSVP responses' });
    }
  });
  
  app.get('/api/rsvp/user/:userId/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, eventId } = req.params;
      const response = await storage.getRsvpResponseByUserAndEvent(userId, parseInt(eventId));
      res.json(response || null);
    } catch (error: any) {
      console.error('Error fetching RSVP response:', error);
      res.status(500).json({ error: 'Failed to fetch RSVP response' });
    }
  });
  
  app.post('/api/rsvp', isAuthenticated, async (req: any, res) => {
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
      
      // Award engine integration - evaluate awards for 'going' RSVPs
      try {
        if (rsvpData.response === 'going' && rsvpData.userId) {
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
  
  app.patch('/api/rsvp/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateRsvpResponse(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating RSVP response:', error);
      res.status(500).json({ error: 'Failed to update RSVP response' });
    }
  });
  
  app.delete('/api/rsvp/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/awards', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const awards = await storage.getAwardsByOrganization(organizationId);
    res.json(awards);
  });
  
  app.post('/api/awards', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create awards' });
    }
    
    const awardData = insertAwardSchema.parse(req.body);
    const award = await storage.createAward(awardData);
    res.json(award);
  });
  
  app.patch('/api/awards/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update awards' });
    }
    
    const updated = await storage.updateAward(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/awards/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete awards' });
    }
    
    await storage.deleteAward(req.params.id);
    res.json({ success: true });
  });
  
  // User Awards (legacy endpoint - kept for backwards compatibility)
  app.get('/api/user-awards/:userId', isAuthenticated, async (req: any, res) => {
    const userAwards = await storage.getUserAwards(req.params.userId);
    res.json(userAwards);
  });
  
  // =============================================
  // ANNOUNCEMENT ROUTES
  // =============================================
  
  app.get('/api/announcements', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const announcements = await storage.getAnnouncementsByOrganization(organizationId);
    res.json(announcements);
  });
  
  app.get('/api/announcements/team/:teamId', isAuthenticated, async (req: any, res) => {
    const announcements = await storage.getAnnouncementsByTeam(req.params.teamId);
    res.json(announcements);
  });
  
  app.post('/api/announcements', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can create announcements' });
    }
    
    const announcementData = insertAnnouncementSchema.parse(req.body);
    const announcement = await storage.createAnnouncement(announcementData);
    res.json(announcement);
  });
  
  app.patch('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can update announcements' });
    }
    
    const updated = await storage.updateAnnouncement(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/messages/team/:teamId', isAuthenticated, async (req: any, res) => {
    const messages = await storage.getMessagesByTeam(req.params.teamId);
    res.json(messages);
  });
  
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/stripe/products', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/payments', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const payments = await storage.getPaymentsByOrganization(organizationId);
    res.json(payments);
  });
  
  app.get('/api/payments/user/:userId', isAuthenticated, async (req: any, res) => {
    const payments = await storage.getPaymentsByUser(req.params.userId);
    res.json(payments);
  });
  
  app.post('/api/payments', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create payments' });
    }
    
    const paymentData = insertPaymentSchema.parse(req.body);
    const payment = await storage.createPayment(paymentData);
    res.json(payment);
  });
  
  app.patch('/api/payments/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update payments' });
    }
    
    const updated = await storage.updatePayment(req.params.id, req.body);
    res.json(updated);
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
  
  app.post('/api/programs', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create programs' });
    }
    
    const programData = insertProgramSchema.parse(req.body);
    const program = await storage.createProgram(programData);
    res.json(program);
  });
  
  app.patch('/api/programs/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update programs' });
    }
    
    const updated = await storage.updateProgram(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/programs/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete programs' });
    }
    
    await storage.deleteProgram(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // DIVISION ROUTES
  // =============================================
  
  app.get('/api/divisions', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const divisions = await storage.getDivisionsByOrganization(organizationId);
      res.json(divisions);
    } catch (error: any) {
      console.error('Error fetching divisions:', error);
      res.status(500).json({ error: 'Failed to fetch divisions', message: error.message });
    }
  });
  
  app.get('/api/divisions/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.post('/api/divisions', isAuthenticated, async (req: any, res) => {
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
  
  app.patch('/api/divisions/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.delete('/api/divisions/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/skills', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/skills/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.post('/api/skills', isAuthenticated, async (req: any, res) => {
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
  
  app.patch('/api/skills/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.delete('/api/skills/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/coach/evaluations', isAuthenticated, async (req: any, res) => {
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
  
  app.post('/api/coach/evaluations', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/evaluations', isAuthenticated, async (req: any, res) => {
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
  
  app.delete('/api/evaluations/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.post('/api/notifications', isAuthenticated, async (req: any, res) => {
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
  
  app.patch('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/family/package-selections', isAuthenticated, async (req: any, res) => {
    try {
      const { id: userId } = req.user;
      const selections = await storage.getPackageSelectionsByParent(userId);
      res.json(selections);
    } catch (error: any) {
      console.error("Error fetching package selections:", error);
      res.status(500).json({ error: "Failed to fetch package selections" });
    }
  });
  
  app.post('/api/family/package-selections', isAuthenticated, async (req: any, res) => {
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
  
  app.get('/api/facilities', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const facilities = await storage.getFacilitiesByOrganization(organizationId);
      res.json(facilities);
    } catch (error: any) {
      console.error('Error fetching facilities:', error);
      res.status(500).json({ error: 'Failed to fetch facilities', message: error.message });
    }
  });
  
  app.get('/api/facilities/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.post('/api/facilities', isAuthenticated, async (req: any, res) => {
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
  
  app.patch('/api/facilities/:id', isAuthenticated, async (req: any, res) => {
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
  
  app.delete('/api/facilities/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/award-definitions', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const awardDefinitions = await storage.getAwardDefinitions(organizationId);
      res.json(awardDefinitions);
    } catch (error: any) {
      console.error('Error fetching award definitions:', error);
      res.status(500).json({ error: 'Failed to fetch award definitions', message: error.message });
    }
  });
  
  // Get single award definition
  app.get('/api/award-definitions/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/award-definitions', isAuthenticated, async (req: any, res) => {
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
  app.put('/api/award-definitions/:id', isAuthenticated, async (req: any, res) => {
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
  app.delete('/api/award-definitions/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/user-awards', isAuthenticated, async (req: any, res) => {
    try {
      const { id: currentUserId, role, organizationId } = req.user;
      const { userId } = req.query;
      
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
      
      const userAwards = await storage.getUserAwardRecords(targetUserId);
      res.json(userAwards);
    } catch (error: any) {
      console.error('Error fetching user awards:', error);
      res.status(500).json({ error: 'Failed to fetch user awards', message: error.message });
    }
  });
  
  // Get all user awards for organization (admin/coach only)
  app.get('/api/user-awards/organization', isAuthenticated, async (req: any, res) => {
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
  
  // Manually award to user (admin/coach only)
  app.post('/api/user-awards', isAuthenticated, async (req: any, res) => {
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
  app.delete('/api/user-awards/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/awards/sync/:userId', isAuthenticated, async (req: any, res) => {
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
