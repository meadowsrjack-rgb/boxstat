import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import Stripe from "stripe";
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
} from "@shared/schema";

let wss: WebSocketServer | null = null;

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
        
        // Extract metadata
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
      
      const organizationId = "default-org"; // In production, this would be determined by subdomain
      
      // Hash the password
      const hashedPassword = password ? hashPassword(password) : undefined;
      
      // Create parent account if registering for child
      let accountHolderId: string | undefined;
      let primaryUser: any = null;
      
      if (registrationType === "my_child" && parentInfo) {
        const parent = await storage.createUser({
          organizationId,
          email: parentInfo.email,
          role: "parent",
          firstName: parentInfo.firstName,
          lastName: parentInfo.lastName,
          phoneNumber: parentInfo.phoneNumber,
          dateOfBirth: parentInfo.dateOfBirth,
          password: hashedPassword,
          registrationType,
          packageSelected: packageId,
          hasRegistered: true,
          isActive: true,
          verified: false,
        });
        accountHolderId = parent.id;
        primaryUser = parent;
      }
      
      // Create player profiles
      const createdPlayers = [];
      for (const player of players) {
        const playerEmail = registrationType === "myself" 
          ? (email || parentInfo?.email || players[0]?.email || "") 
          : `${player.firstName.toLowerCase()}.${player.lastName.toLowerCase()}@temp.com`;
          
        const playerUser = await storage.createUser({
          organizationId,
          email: playerEmail,
          role: registrationType === "myself" ? "parent" : "player",
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
          gender: player.gender,
          registrationType,
          accountHolderId,
          packageSelected: packageId,
          teamAssignmentStatus: "pending",
          hasRegistered: true,
          password: registrationType === "myself" ? hashedPassword : undefined,
          isActive: true,
          verified: false,
        });
        createdPlayers.push(playerUser);
        
        // For "myself" registration, the player is the primary user
        if (registrationType === "myself" && !primaryUser) {
          primaryUser = playerUser;
        }
      }
      
      // Automatically log in the user by setting up session
      if (primaryUser) {
        req.session.userId = primaryUser.id;
        req.session.save((err: any) => {
          if (err) {
            console.error("Session save error:", err);
          }
        });
      }
      
      res.json({
        success: true,
        message: "Registration successful",
        accountHolderId: accountHolderId || createdPlayers[0]?.id,
        user: primaryUser,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });
  
  // Get users by account holder (for unified account page)
  app.get('/api/account/players', isAuthenticated, async (req: any, res) => {
    const { id } = req.user;
    const user = await storage.getUser(id);
    
    if (user?.role === "parent") {
      // Get all players linked to this parent
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
    const { organizationId } = req.user;
    const events = await storage.getEventsByOrganization(organizationId);
    res.json(events);
  });
  
  app.get('/api/events/upcoming', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const events = await storage.getUpcomingEvents(organizationId);
    res.json(events);
  });
  
  app.get('/api/events/team/:teamId', isAuthenticated, async (req: any, res) => {
    const events = await storage.getEventsByTeam(req.params.teamId);
    res.json(events);
  });
  
  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can create events' });
    }
    
    const eventData = insertEventSchema.parse(req.body);
    const event = await storage.createEvent(eventData);
    res.json(event);
  });
  
  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can update events' });
    }
    
    const updated = await storage.updateEvent(req.params.id, req.body);
    res.json(updated);
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
  
  app.get('/api/attendance/event/:eventId', isAuthenticated, async (req: any, res) => {
    const attendances = await storage.getAttendancesByEvent(req.params.eventId);
    res.json(attendances);
  });
  
  app.get('/api/attendance/user/:userId', isAuthenticated, async (req: any, res) => {
    const attendances = await storage.getAttendancesByUser(req.params.userId);
    res.json(attendances);
  });
  
  app.post('/api/attendance', isAuthenticated, async (req: any, res) => {
    const attendanceData = insertAttendanceSchema.parse(req.body);
    const attendance = await storage.createAttendance(attendanceData);
    res.json(attendance);
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
  
  // User Awards
  app.get('/api/user-awards/:userId', isAuthenticated, async (req: any, res) => {
    const userAwards = await storage.getUserAwards(req.params.userId);
    res.json(userAwards);
  });
  
  app.post('/api/user-awards', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can award users' });
    }
    
    const userAwardData = insertUserAwardSchema.parse(req.body);
    const userAward = await storage.awardUser(userAwardData);
    res.json(userAward);
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
