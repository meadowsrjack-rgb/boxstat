import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { pgTable, varchar, integer, timestamp, text, boolean, date, serial, foreignKey, unique, real, numeric, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// =============================================
// Organization (Multi-Tenant) Schema
// =============================================

export interface Organization {
  id: string;
  name: string;
  subdomain: string; // e.g., "oceanside-hoops" -> oceanside-hoops.yourapp.com
  sportType: string; // "basketball", "soccer", "baseball", etc.
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  
  // Terminology customization
  terminology: {
    athlete: string; // "Player", "Athlete", "Student", etc.
    coach: string; // "Coach", "Instructor", "Trainer", etc.
    parent: string; // "Parent", "Guardian", "Family", etc.
    team: string; // "Team", "Squad", "Group", etc.
    practice: string; // "Practice", "Training", "Session", etc.
    game: string; // "Game", "Match", "Competition", etc.
  };
  
  // Feature flags
  features: {
    payments: boolean;
    awards: boolean;
    messaging: boolean;
    events: boolean;
    training: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Drizzle pgTable definition for organizations
export const organizations = pgTable("organizations", {
  id: varchar().primaryKey().notNull(),
  name: varchar().notNull().default('My Sports Organization'),
  subdomain: varchar().notNull().default('default'),
  sportType: varchar("sport_type").notNull().default('basketball'),
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color").notNull().default('#1E40AF'),
  secondaryColor: varchar("secondary_color").notNull().default('#DC2626'),
  terminology: jsonb().notNull().default({
    athlete: "Player",
    coach: "Coach",
    parent: "Parent",
    team: "Team",
    practice: "Practice",
    game: "Game",
  }),
  features: jsonb().notNull().default({
    payments: true,
    awards: true,
    messaging: true,
    events: true,
    training: true,
  }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// =============================================
// User Schema (Simplified)
// =============================================

export type UserRole = "admin" | "coach" | "player" | "parent";
export type RegistrationType = "myself" | "my_child";
export type TeamAssignmentStatus = "pending" | "assigned";

export interface User {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  
  // Profile information
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  gender?: string;
  height?: string;
  age?: string;
  
  // Emergency and medical information
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  allergies?: string;
  
  // Registration flow fields
  registrationType?: RegistrationType; // "myself" or "my_child"
  accountHolderId?: string; // For players linked to a parent account
  parentId?: string; // Parent/guardian user ID for child players
  guardianId?: string; // Alternative guardian user ID for child players
  packageSelected?: string; // Selected program/package ID
  teamAssignmentStatus?: TeamAssignmentStatus; // "pending" or "assigned"
  hasRegistered?: boolean; // Whether they have registered in the app
  
  // Specific fields based on role
  teamId?: string;
  jerseyNumber?: number;
  position?: string;
  program?: string; // Configurable, set by organization
  
  // Performance metrics
  rating?: number;
  awardsCount?: number;
  
  // Award tracking fields
  awards?: any[]; // cached array of earned awards for quick display
  totalPractices?: number; // count of practice attendances
  totalGames?: number; // count of game attendances
  consecutiveCheckins?: number; // current streak of consecutive check-ins
  videosCompleted?: number; // count of training videos completed
  yearsActive?: number; // number of years active in the program
  
  // Payment information
  stripeCustomerId?: string; // Stripe Customer ID for payment tracking
  stripeCheckoutSessionId?: string; // Stripe Checkout Session ID for player registration
  paymentStatus?: string; // "pending" or "paid" for player registrations
  lastPaymentDate?: Date; // Date of last payment received
  nextPaymentDate?: Date; // Expected date of next payment (28 days from last)
  
  // Security
  passcode?: string; // 4-digit PIN for quick switching
  password?: string; // Hashed password for account login
  
  // Email verification & magic links
  verified: boolean;
  verificationToken?: string;
  verificationExpiry?: Date;
  magicLinkToken?: string;
  magicLinkExpiry?: Date;
  
  // OAuth providers
  googleId?: string;
  appleId?: string;
  
  // Status
  isActive: boolean;
  
  // User Preferences
  defaultDashboardView?: string; // "parent" or player ID for default landing page
  
  createdAt: Date;
  updatedAt: Date;
}

// Drizzle pgTable definition for users
export const users = pgTable("users", {
  id: varchar().primaryKey().notNull(),
  email: varchar(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar().default('parent').notNull(),
  organizationId: varchar("organization_id"),
  parentId: varchar("parent_id"),
  teamId: integer("team_id"),
  divisionId: integer("division_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id"),
  paymentStatus: varchar("payment_status"),
  products: jsonb().default('[]'),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
  sportsEngineCustomerId: varchar("sports_engine_customer_id"),
  sportsEngineSubscriptionId: varchar("sports_engine_subscription_id"),
  userType: varchar("user_type").default('parent').notNull(),
  dateOfBirth: date("date_of_birth"),
  phoneNumber: varchar("phone_number"),
  emergencyContactJson: jsonb("emergency_contact_json"),
  emergencyContact: varchar("emergency_contact"),
  emergencyPhone: varchar("emergency_phone"),
  address: text(),
  medicalInfo: text("medical_info"),
  allergies: text(),
  jerseyNumber: integer("jersey_number"),
  position: varchar(),
  heightIn: integer("height_in"),
  profileVisibility: boolean("profile_visibility").default(true),
  schoolGrade: varchar("school_grade"),
  parentalConsent: boolean("parental_consent").default(false),
  profileCompleted: boolean("profile_completed").default(false),
  qrCodeData: varchar("qr_code_data"),
  teamName: varchar("team_name"),
  age: varchar(),
  height: varchar(),
  bio: text(),
  notes: text(),
  aauMembershipId: varchar("aau_membership_id"),
  postalCode: varchar("postal_code"),
  passcode: varchar({ length: 4 }),
  password: varchar(),
  city: varchar(),
  youthClubTeam: varchar("youth_club_team"),
  linkedAccountId: varchar("linked_account_id"),
  activeProfileId: varchar("active_profile_id"),
  accountHolderId: varchar("account_holder_id"),
  guardianId: varchar("guardian_id"),
  registrationType: varchar("registration_type"),
  packageSelected: varchar("package_selected"),
  teamAssignmentStatus: varchar("team_assignment_status"),
  hasRegistered: boolean("has_registered").default(false),
  verified: boolean().default(false),
  verificationToken: varchar("verification_token"),
  verificationExpiry: timestamp("verification_expiry", { mode: 'string' }),
  magicLinkToken: varchar("magic_link_token"),
  magicLinkExpiry: timestamp("magic_link_expiry", { mode: 'string' }),
  magicLinkSourcePlatform: varchar("magic_link_source_platform"), // 'web' | 'ios' | 'android'
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry", { mode: 'string' }),
  googleId: varchar("google_id"),
  appleId: varchar("apple_id"),
  isActive: boolean("is_active").default(true).notNull(),
  awards: jsonb().default('[]'),
  skillsAssessments: jsonb("skills_assessments").default('{}'),
  totalPractices: integer("total_practices").default(0),
  totalGames: integer("total_games").default(0),
  consecutiveCheckins: integer("consecutive_checkins").default(0),
  videosCompleted: integer("videos_completed").default(0),
  yearsActive: integer("years_active").default(0),
  lastLogin: timestamp("last_login", { mode: 'string' }),
  defaultDashboardView: varchar("default_dashboard_view"),
}, (table) => [
  unique("users_email_unique").on(table.email),
]);

// Pending Registrations table (email verifications not yet completed)
export const pendingRegistrations = pgTable("pending_registrations", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  email: varchar().notNull().unique(),
  verificationToken: varchar("verification_token").notNull(),
  verificationExpiry: timestamp("verification_expiry", { mode: 'string' }).notNull(),
  verified: boolean().default(false).notNull(),
  sourcePlatform: varchar("source_platform").default('web'), // 'web' | 'ios' | 'android'
  sessionId: varchar("session_id"), // Session ID to notify when verified
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Programs table (packages/subscriptions)
export const programs = pgTable("programs", {
  id: varchar().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  name: varchar().notNull(),
  slug: varchar(),
  description: text(),
  type: varchar(), // "Subscription", "One-Time", "Program", "Add-On"
  billingCycle: varchar("billing_cycle"), // "Monthly", "Quarterly", "6-Month", "Yearly"
  price: integer(), // Price in cents
  billingModel: varchar("billing_model"), // "Per Player", "Per Family", "Organization-Wide"
  pricingModel: varchar("pricing_model"), // DEPRECATED: backwards compat
  duration: varchar(), // DEPRECATED: backwards compat
  durationDays: integer("duration_days"), // Expiration period in days
  allowInstallments: boolean("allow_installments").default(false), // Enable installment payment option
  installments: integer(), // Number of installments
  installmentPrice: integer("installment_price"), // Price per installment in cents
  payInFullDiscount: integer("pay_in_full_discount"), // Discount percentage for paying in full (0-100)
  stripePriceId: varchar("stripe_price_id"),
  stripeProductId: varchar("stripe_product_id"),
  category: varchar(), // DEPRECATED: backwards compat
  tags: text().array().default(sql`ARRAY[]::text[]`), // ["Youth Club", "Skills", "FNH"]
  eventTypes: text("event_types").array().default(sql`ARRAY[]::text[]`), // ["Practice", "Game", "Skills"]
  coverageScope: text("coverage_scope").array().default(sql`ARRAY[]::text[]`), // ["U10", "U12", "U14"] or ["All"]
  ageGroups: text("age_groups").array().default(sql`ARRAY[]::text[]`), // DEPRECATED: backwards compat
  autoAssignPlayers: boolean("auto_assign_players").default(false),
  linkedAwards: text("linked_awards").array().default(sql`ARRAY[]::text[]`), // Award IDs
  adminNotes: text("admin_notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Divisions table (defined before teams for FK reference)
export const divisions = pgTable("divisions", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  name: varchar().notNull(),
  description: text(),
  ageRange: varchar("age_range"), // e.g., "6th-8th", "U12", "14-17"
  teamIds: text("team_ids").array(), // JSON array of linked team IDs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Teams table
export const teams = pgTable("teams", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id"),
  name: varchar().notNull(),
  programType: varchar("program_type"),
  divisionId: integer("division_id"),
  coachId: varchar("coach_id"),
  assistantCoachIds: varchar("assistant_coach_ids").array().default(sql`ARRAY[]::varchar[]`),
  season: text(),
  organization: text(),
  location: text(),
  scheduleLink: varchar("schedule_link"),
  rosterSize: integer("roster_size").default(0),
  active: boolean().default(true),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.divisionId],
    foreignColumns: [divisions.id],
    name: "teams_division_id_fkey"
  }),
  foreignKey({
    columns: [table.coachId],
    foreignColumns: [users.id],
    name: "teams_coach_id_fkey"
  }),
]);

// Events table
export const events = pgTable("events", {
  id: serial().primaryKey().notNull(),
  title: varchar().notNull(),
  description: text(),
  eventType: varchar("event_type").notNull(),
  startTime: timestamp("start_time", { mode: 'string' }).notNull(),
  endTime: timestamp("end_time", { mode: 'string' }).notNull(),
  location: varchar(),
  teamId: integer("team_id"),
  opponentTeam: varchar("opponent_team"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  childProfileId: integer("child_profile_id"),
  isRecurring: boolean("is_recurring").default(false),
  recurringType: varchar("recurring_type"),
  recurringEndDate: timestamp("recurring_end_date", { mode: 'string' }),
  playerId: varchar("player_id"),
  isActive: boolean("is_active").default(true),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  tags: text().array(),
  // Event visibility and assignment scoping
  visibility: jsonb(), // { roles?: string[], teams?: string[], programs?: string[], divisions?: string[], packages?: string[] }
  assignTo: jsonb(), // { roles?: string[], teams?: string[], programs?: string[], divisions?: string[], packages?: string[], users?: string[] }
  rsvpRequired: boolean("rsvp_required").default(false),
  capacity: integer(),
  allowCheckIn: boolean("allow_check_in").default(false),
  checkInRadius: integer("check_in_radius"), // in meters
  sendNotifications: boolean("send_notifications").default(false),
  createdBy: varchar("created_by"),
  status: varchar().default('active'), // active, cancelled, completed, draft
});

// Attendances table
export const attendances = pgTable("attendances", {
  id: serial().primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  eventId: integer("event_id").notNull(),
  checkedInAt: timestamp("checked_in_at", { mode: 'string' }).defaultNow(),
  qrCodeData: varchar("qr_code_data").notNull(),
  type: varchar().default('advance'),
  latitude: numeric(),
  longitude: numeric(),
});

// Facilities table (saved locations for quick event creation)
export const facilities = pgTable("facilities", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  name: varchar().notNull(),
  address: varchar().notNull(),
  latitude: doublePrecision().notNull(),
  longitude: doublePrecision().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  createdBy: varchar("created_by"),
});

// Badges table
export const badges = pgTable("badges", {
  id: serial().primaryKey().notNull(),
  name: varchar().notNull(),
  description: text(),
  icon: varchar().notNull(),
  color: varchar().notNull(),
  criteria: jsonb().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  slug: varchar(),
  tier: varchar(),
  category: varchar(),
  type: varchar(),
}, (table) => [
  unique("badges_slug_key").on(table.slug),
]);

// User Badges table
export const userBadges = pgTable("user_badges", {
  id: serial().primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  badgeId: integer("badge_id"),
  earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow(),
  profileId: varchar("profile_id"),
  badgeType: varchar("badge_type", { length: 50 }),
});

// Award Definitions table (new awards system)
export const awardDefinitions = pgTable("award_definitions", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  tier: text().notNull(),
  class: text(),
  prestige: text().default('Prospect'),
  triggerField: text("trigger_field"),
  triggerOperator: text("trigger_operator").default('>='),
  triggerValue: numeric("trigger_value"),
  triggerType: text("trigger_type").default('count'),
  description: text(),
  imageUrl: text("image_url"),
  active: boolean().default(true),
  organizationId: varchar("organization_id"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  unique("award_definitions_name_key").on(table.name),
]);

// User Awards table (awarded awards tracking)
export const userAwards = pgTable("user_awards", {
  id: serial().primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  awardId: integer("award_id").notNull(),
  awardedAt: timestamp("awarded_at", { mode: 'string' }).defaultNow(),
  awardedBy: varchar("awarded_by"),
  year: integer(),
  notes: text(),
  visible: boolean().default(true),
}, (table) => [
  unique("user_awards_unique").on(table.userId, table.awardId, table.year),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "user_awards_user_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.awardId],
    foreignColumns: [awardDefinitions.id],
    name: "user_awards_award_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.awardedBy],
    foreignColumns: [users.id],
    name: "user_awards_awarded_by_fkey"
  }),
]);

// Announcements table
export const announcements = pgTable("announcements", {
  id: serial().primaryKey().notNull(),
  title: varchar().notNull(),
  content: text().notNull(),
  authorId: varchar("author_id").notNull(),
  teamId: integer("team_id"),
  priority: varchar().default('medium'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial().primaryKey().notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text().notNull(),
  teamId: integer("team_id").notNull(),
  messageType: varchar("message_type").default('text'),
  isModerated: boolean("is_moderated").default(false),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial().primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  playerId: varchar("player_id"), // For per-player billing: which specific player this payment covers
  amount: integer().notNull(), // Amount in cents (e.g., 1000 = $10.00)
  currency: varchar().default('usd'),
  paymentType: varchar("payment_type").notNull(),
  stripePaymentId: varchar("stripe_payment_id"),
  status: varchar().default('pending'),
  description: text(),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  sportsEnginePaymentId: varchar("sports_engine_payment_id"),
  sportsEngineTransactionId: varchar("sports_engine_transaction_id"),
  packageId: varchar("package_id"), // linked package/program
  programId: varchar("program_id"), // linked program
  organizationId: varchar("organization_id"), // organization
});

// Skills table (for coach evaluations)
export const skills = pgTable("skills", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  playerId: varchar("player_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  category: varchar().notNull(), // e.g., "Shooting", "Dribbling", "Defense"
  score: integer().notNull(), // 1-10 rating scale
  notes: text(),
  evaluatedAt: timestamp("evaluated_at", { mode: 'string' }).defaultNow(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Quarterly Evaluations table (detailed skill assessments from coach dashboard)
export const evaluations = pgTable("evaluations", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  playerId: varchar("player_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  quarter: varchar().notNull(), // "Q1", "Q2", "Q3", "Q4"
  year: integer().notNull(),
  scores: jsonb().notNull(), // Stores the EvalScores structure: { SHOOTING: { LAYUP: 3, ... }, ... }
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// Notifications table (renamed to Messages in UI)
export const notifications = pgTable("notifications", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  types: text("types").array().notNull().default(sql`ARRAY['message']::text[]`), // ["announcement", "notification", "message"]
  title: varchar().notNull(),
  message: text().notNull(),
  
  // Targeting configuration
  recipientTarget: varchar("recipient_target").notNull(), // "everyone", "users", "roles", "teams", "divisions"
  recipientUserIds: text("recipient_user_ids").array(), // specific user IDs
  recipientRoles: text("recipient_roles").array(), // specific roles
  recipientTeamIds: text("recipient_team_ids").array(), // specific team IDs
  recipientDivisionIds: text("recipient_division_ids").array(), // specific division IDs
  
  // Delivery channels (SMS removed)
  deliveryChannels: text("delivery_channels").array().notNull(), // ["in_app", "email", "push"]
  
  // Metadata
  sentBy: varchar("sent_by").notNull(),
  sentAt: timestamp("sent_at", { mode: 'string' }),
  relatedEventId: integer("related_event_id"), // optional link to event
  status: varchar().default('pending'), // pending, sent, failed
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// Join table for notification recipients (resolved at creation time)
export const notificationRecipients = pgTable("notification_recipients", {
  id: serial().primaryKey().notNull(),
  notificationId: integer("notification_id").notNull(),
  userId: varchar("user_id").notNull(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at", { mode: 'string' }),
  deliveryStatus: jsonb("delivery_status"), // { in_app: "sent", email: "failed", push: "sent", sms: "skipped" }
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Notification Preferences table
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial().primaryKey().notNull(),
  userId: varchar("user_id").notNull().unique(),
  // Event notifications
  eventRsvp: boolean("event_rsvp").default(true),
  eventCheckin: boolean("event_checkin").default(true),
  eventReminders: boolean("event_reminders").default(true),
  // Achievement notifications
  trophyProgress: boolean("trophy_progress").default(true),
  badgeEarned: boolean("badge_earned").default(true),
  // Training notifications
  trainingReminders: boolean("training_reminders").default(true),
  skillsEvaluation: boolean("skills_evaluation").default(true),
  improvementRecommendation: boolean("improvement_recommendation").default(true),
  // Payment notifications
  paymentDue: boolean("payment_due").default(true),
  // Team notifications
  teamMessages: boolean("team_messages").default(true),
  // Coach-specific notifications
  teamUpdates: boolean("team_updates").default(true),
  eventChanges: boolean("event_changes").default(true),
  playerCheckIn: boolean("player_check_in").default(true),
  playerRsvp: boolean("player_rsvp").default(true),
  playerAwards: boolean("player_awards").default(true),
  playerProgress: boolean("player_progress").default(true),
  // Delivery preferences (SMS removed)
  pushNotifications: boolean("push_notifications").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  quietHoursStart: varchar("quiet_hours_start").default("22:00"),
  quietHoursEnd: varchar("quiet_hours_end").default("07:00"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Push Subscriptions table
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial().primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  endpoint: text(),
  p256dhKey: text("p256dh_key"),
  authKey: text("auth_key"),
  fcmToken: text("fcm_token"),
  platform: text("platform").notNull(),
  userAgent: text("user_agent"),
  deviceType: varchar("device_type"), // "desktop", "mobile", "tablet"
  apnsEnvironment: varchar("apns_environment"), // "sandbox" or "production" - for iOS tokens
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used", { mode: 'string' }).defaultNow(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  unique("push_subscriptions_user_endpoint").on(table.userId, table.endpoint),
  unique("push_subscriptions_user_fcm").on(table.userId, table.fcmToken),
]);

// Chat Rooms table (team chats and parent chats)
export const chatRooms = pgTable("chat_rooms", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  type: varchar().notNull(), // "team" or "parent"
  teamId: integer("team_id"), // linked team for team/parent chats
  name: varchar().notNull(),
  description: text(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// Chat Members table (users in each chat room)
export const chatMembers = pgTable("chat_members", {
  id: serial().primaryKey().notNull(),
  chatRoomId: integer("chat_room_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: varchar().default('member'), // "admin", "moderator", "member"
  lastReadAt: timestamp("last_read_at", { mode: 'string' }),
  joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
});

// Chat Messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial().primaryKey().notNull(),
  chatRoomId: integer("chat_room_id").notNull(),
  userId: varchar("user_id").notNull(),
  message: text().notNull(),
  attachments: jsonb(), // optional file attachments
  isEdited: boolean("is_edited").default(false),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertUserSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "coach", "player", "parent"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  profileImageUrl: z.string().optional(),
  dateOfBirth: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
  registrationType: z.enum(["myself", "my_child"]).optional(),
  accountHolderId: z.string().optional(),
  packageSelected: z.string().optional(),
  teamAssignmentStatus: z.enum(["pending", "assigned"]).optional(),
  hasRegistered: z.boolean().optional(),
  teamId: z.string().optional(),
  jerseyNumber: z.number().optional(),
  position: z.string().optional(),
  rating: z.number().optional(),
  awardsCount: z.number().optional(),
  stripeCustomerId: z.string().optional(),
  lastPaymentDate: z.date().optional(),
  nextPaymentDate: z.date().optional(),
  passcode: z.string().length(4).optional(),
  password: z.string().optional(),
  verified: z.boolean().default(false),
  verificationToken: z.string().optional(),
  verificationExpiry: z.date().optional(),
  magicLinkToken: z.string().optional(),
  magicLinkExpiry: z.date().optional(),
  passwordResetToken: z.string().optional(),
  passwordResetExpiry: z.date().optional(),
  googleId: z.string().optional(),
  appleId: z.string().optional(),
  isActive: z.boolean().default(true),
  awards: z.array(z.any()).default([]),
  totalPractices: z.number().default(0),
  totalGames: z.number().default(0),
  consecutiveCheckins: z.number().default(0),
  videosCompleted: z.number().default(0),
  yearsActive: z.number().default(0),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;

// =============================================
// Team Schema
// =============================================

export interface Team {
  id: number;
  organizationId?: string;
  name: string;
  programType?: string;
  divisionId?: number;
  coachId?: string;
  assistantCoachIds?: string[];
  season?: string;
  organization?: string;
  location?: string;
  scheduleLink?: string;
  rosterSize?: number;
  active?: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export const insertTeamSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(1),
  programType: z.string().optional(),
  divisionId: z.number().optional(),
  coachId: z.string().optional(),
  assistantCoachIds: z.array(z.string()).default([]),
  season: z.string().optional(),
  organization: z.string().optional(),
  location: z.string().optional(),
  scheduleLink: z.string().optional(),
  rosterSize: z.number().optional(),
  active: z.boolean().default(true),
  notes: z.string().optional(),
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;

// =============================================
// Event Schema
// =============================================

export interface EventVisibility {
  roles?: string[];
  teams?: string[];
  programs?: string[];
  divisions?: string[];
  packages?: string[];
  organizationId?: string;
}

export interface EventAssignment {
  roles?: string[];
  teams?: string[];
  programs?: string[];
  divisions?: string[];
  packages?: string[];
  users?: string[];
}

export interface Event {
  id: number;
  organizationId: string;
  title: string;
  description?: string;
  eventType: string; // Configurable: "practice", "game", etc.
  startTime: Date;
  endTime: Date;
  location: string;
  latitude?: number;
  longitude?: number;
  teamId?: number;
  opponentTeam?: string;
  visibility?: EventVisibility;
  assignTo?: EventAssignment;
  rsvpRequired?: boolean;
  capacity?: number;
  allowCheckIn?: boolean;
  checkInRadius?: number;
  sendNotifications?: boolean;
  createdBy?: string;
  status?: string; // active, cancelled, completed, draft
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
}

export const insertEventSchema = z.object({
  organizationId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  eventType: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"), // ISO date string
  endTime: z.string().min(1, "End time is required"), // ISO date string
  location: z.string().default(""),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  teamId: z.string().optional(),
  opponentTeam: z.string().optional(),
  visibility: z.object({
    roles: z.array(z.string()).optional(),
    teams: z.array(z.string()).optional(),
    programs: z.array(z.string()).optional(),
    divisions: z.array(z.string()).optional(),
    packages: z.array(z.string()).optional(),
    organizationId: z.string().optional(),
  }).optional(),
  assignTo: z.object({
    roles: z.array(z.string()).optional(),
    teams: z.array(z.string()).optional(),
    programs: z.array(z.string()).optional(),
    divisions: z.array(z.string()).optional(),
    packages: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
  }).optional(),
  rsvpRequired: z.boolean().default(false),
  capacity: z.number().optional(),
  allowCheckIn: z.boolean().default(false),
  checkInRadius: z.number().optional(),
  sendNotifications: z.boolean().default(false),
  createdBy: z.string().optional(),
  status: z.string().default('active'),
  isActive: z.boolean().default(true),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;

// =============================================
// Attendance/Check-in Schema
// =============================================

export interface Attendance {
  id: string;
  userId: string;
  eventId: number;
  checkedInAt: Date;
  type: "advance" | "onsite";
}

export const insertAttendanceSchema = z.object({
  userId: z.string(),
  eventId: z.coerce.number(),
  type: z.enum(["advance", "onsite"]).default("advance"),
  qrCodeData: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

// =============================================
// Facility Schema (Saved Locations)
// =============================================

export interface Facility {
  id: number;
  organizationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: Date;
  createdBy?: string;
}

export const insertFacilitySchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1, "Facility name is required"),
  address: z.string().min(1, "Address is required"),
  latitude: z.number(),
  longitude: z.number(),
  isActive: z.boolean().default(true),
  createdBy: z.string().optional(),
});

export type InsertFacility = z.infer<typeof insertFacilitySchema>;

// =============================================
// Award Schema (Badges & Trophies)
// =============================================

export interface Award {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: "badge" | "trophy";
  category?: string;
  isActive: boolean;
  createdAt: Date;
}

export const insertAwardSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().min(1),
  color: z.string().default("#1E40AF"),
  type: z.enum(["badge", "trophy"]),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type InsertAward = z.infer<typeof insertAwardSchema>;

// =============================================
// User Award (Earned Awards)
// =============================================

export interface UserAward {
  id: string;
  userId: string;
  awardId: string;
  earnedAt: Date;
}

export const insertUserAwardSchema = z.object({
  userId: z.string(),
  awardId: z.string(),
});

export type InsertUserAward = z.infer<typeof insertUserAwardSchema>;

// =============================================
// Award Definition Schema (New Awards System)
// =============================================

export interface AwardDefinition {
  id: number;
  name: string;
  tier: string;
  class?: string;
  prestige: string;
  triggerField?: string;
  triggerOperator: string;
  triggerValue?: number;
  triggerType: string;
  description?: string;
  imageUrl?: string;
  active: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const insertAwardDefinitionSchema = createInsertSchema(awardDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAwardDefinition = z.infer<typeof insertAwardDefinitionSchema>;
export type SelectAwardDefinition = typeof awardDefinitions.$inferSelect;

// =============================================
// User Award Record Schema (New Awards System)
// =============================================

export interface UserAwardRecord {
  id: number;
  userId: string;
  awardId: number;
  awardedAt: Date;
  awardedBy?: string;
  year?: number;
  notes?: string;
  visible: boolean;
}

export const insertUserAwardRecordSchema = createInsertSchema(userAwards).omit({
  id: true,
  awardedAt: true,
});

export type InsertUserAwardRecord = z.infer<typeof insertUserAwardRecordSchema>;
export type SelectUserAwardRecord = typeof userAwards.$inferSelect;

// =============================================
// Announcement Schema
// =============================================

export interface Announcement {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  authorId: string;
  teamId?: string; // null = organization-wide
  priority: "low" | "medium" | "high";
  isActive: boolean;
  createdAt: Date;
}

export const insertAnnouncementSchema = z.object({
  organizationId: z.string(),
  title: z.string().min(1),
  content: z.string().min(1),
  authorId: z.string(),
  teamId: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  isActive: z.boolean().default(true),
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

// =============================================
// Message Schema (Team Chat)
// =============================================

export interface Message {
  id: string;
  teamId: string;
  senderId: string;
  content: string;
  messageType: "text" | "system";
  createdAt: Date;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string;
    userType: string;
  };
}

export const insertMessageSchema = z.object({
  teamId: z.string(),
  senderId: z.string(),
  content: z.string().min(1),
  messageType: z.enum(["text", "system"]).default("text"),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;

// =============================================
// Payment Schema
// =============================================

export interface Payment {
  id: string;
  organizationId: string;
  userId: string;
  playerId?: string; // For per-player billing: which specific player this payment covers
  amount: number;
  currency: string;
  paymentType: string; // Configurable by organization
  status: "pending" | "completed" | "failed" | "refunded";
  stripePaymentId?: string;
  packageId?: string;
  programId?: string;
  description?: string;
  dueDate?: string;
  paidAt?: Date;
  createdAt: Date;
}

export const insertPaymentSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  playerId: z.string().optional(), // For per-player billing: which specific player this payment covers
  amount: z.number().min(0),
  currency: z.string().default("usd"),
  paymentType: z.string().min(1),
  status: z.enum(["pending", "completed", "failed", "refunded"]).default("pending"),
  stripePaymentId: z.string().optional(),
  packageId: z.string().optional(),
  programId: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// =============================================
// Program Schema (Configurable Programs)
// =============================================

export interface Program {
  id: string;
  organizationId: string;
  name: string;
  slug?: string; // Unique key for internal mapping/API (e.g., "youth_club_fnh_package")
  description?: string;
  type?: string; // "Subscription", "One-Time", "Program", "Add-On"
  billingCycle?: string; // "Monthly", "Quarterly", "6-Month", "Yearly" (only for subscriptions)
  price?: number; // Price in cents (e.g., 14900 for $149.00)
  billingModel?: string; // "Per Player", "Per Family", "Organization-Wide"
  pricingModel?: string; // DEPRECATED: Use "type" instead. Kept for backwards compatibility
  duration?: string; // DEPRECATED: Use "durationDays" instead. Kept for backwards compatibility
  durationDays?: number; // Expiration period for one-time passes (e.g., 90 days)
  installments?: number; // Number of installments if pricing model is "installments"
  installmentPrice?: number; // Price per installment in cents
  stripePriceId?: string; // Stripe Price ID for payment integration
  stripeProductId?: string; // Stripe Product ID for payment integration
  category?: string; // DEPRECATED: Use "tags" instead. Kept for backwards compatibility
  tags?: string[]; // Categories: ["Youth Club", "Skills", "FNH", "Camp", "Uniform"]
  eventTypes?: string[]; // Event types this package grants access to: ["Practice", "Game", "Skills", "FNH", "Camp"]
  coverageScope?: string[]; // Age divisions or "All": ["U10", "U12", "U14"] or ["All"]
  ageGroups?: string[]; // DEPRECATED: Use "coverageScope" instead. Kept for backwards compatibility
  autoAssignPlayers?: boolean; // Auto-mark players active when purchased
  linkedAwards?: string[]; // Award IDs earned automatically for completing this package
  adminNotes?: string; // Internal notes not shown to users
  isActive: boolean;
  createdAt: Date;
}

export const insertProgramSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  billingCycle: z.string().optional(),
  price: z.number().optional(),
  billingModel: z.string().optional(),
  pricingModel: z.string().optional(), // DEPRECATED
  duration: z.string().optional(), // DEPRECATED
  durationDays: z.number().optional(),
  installments: z.number().optional(),
  installmentPrice: z.number().optional(),
  stripePriceId: z.string().optional(),
  stripeProductId: z.string().optional(),
  category: z.string().optional(), // DEPRECATED
  tags: z.array(z.string()).default([]),
  eventTypes: z.array(z.string()).default([]),
  coverageScope: z.array(z.string()).default([]),
  ageGroups: z.array(z.string()).default([]), // DEPRECATED
  autoAssignPlayers: z.boolean().default(false),
  linkedAwards: z.array(z.string()).default([]),
  adminNotes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type InsertProgram = z.infer<typeof insertProgramSchema>;

// =============================================
// Package Selection Schema (Family Registration)
// =============================================

export interface PackageSelection {
  id: string;
  organizationId: string;
  parentUserId: string; // The parent/guardian making the selection
  childUserId: string; // The child/player for whom the package is selected
  programId: string; // The selected program/package
  isPaid: boolean; // Whether payment has been completed
  paymentId?: string; // Reference to the payment record
  createdAt: Date;
}

export const insertPackageSelectionSchema = z.object({
  organizationId: z.string(),
  parentUserId: z.string(),
  childUserId: z.string(),
  programId: z.string(),
  isPaid: z.boolean().default(false),
  paymentId: z.string().optional(),
});

export type InsertPackageSelection = z.infer<typeof insertPackageSelectionSchema>;

// =============================================
// Division Schema
// =============================================

export interface Division {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  ageRange?: string;
  teamIds?: string[];
  isActive: boolean;
  createdAt: Date;
}

export const insertDivisionSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  ageRange: z.string().optional(),
  teamIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export type InsertDivision = z.infer<typeof insertDivisionSchema>;

// =============================================
// Skill Evaluation Schema
// =============================================

export interface Skill {
  id: string;
  organizationId: string;
  playerId: string;
  coachId: string;
  category: string;
  score: number;
  notes?: string;
  evaluatedAt: Date;
  createdAt: Date;
}

export const insertSkillSchema = z.object({
  organizationId: z.string(),
  playerId: z.string(),
  coachId: z.string(),
  category: z.string().min(1),
  score: z.number().min(1).max(10),
  notes: z.string().optional(),
});

export type InsertSkill = z.infer<typeof insertSkillSchema>;

// =============================================
// Evaluation Schema
// =============================================

export interface Evaluation {
  id: number;
  organizationId: string;
  playerId: string;
  coachId: string;
  quarter: string; // "Q1", "Q2", "Q3", "Q4"
  year: number;
  scores: any; // EvalScores structure from CoachAwardDialogs
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const insertEvaluationSchema = z.object({
  organizationId: z.string(),
  playerId: z.string(),
  coachId: z.string(),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  year: z.number(),
  scores: z.any(), // JSON object with skill categories and scores
  notes: z.string().optional(),
});

export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;

// =============================================
// Notification Schema
// =============================================

export interface Notification {
  id: number;
  organizationId: string;
  types: ("announcement" | "notification" | "message")[];
  title: string;
  message: string;
  recipientTarget: "everyone" | "users" | "roles" | "teams" | "divisions";
  recipientUserIds?: string[];
  recipientRoles?: string[];
  recipientTeamIds?: string[];
  recipientDivisionIds?: string[];
  deliveryChannels: ("in_app" | "email" | "push")[];
  sentBy: string;
  sentAt?: Date;
  relatedEventId?: number;
  status: "pending" | "sent" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export const insertNotificationSchema = z.object({
  organizationId: z.string(),
  types: z.array(z.enum(["announcement", "notification", "message"])).min(1, "At least one notification type must be selected").default(['message']),
  title: z.string().min(1),
  message: z.string().min(1),
  recipientTarget: z.enum(["everyone", "users", "roles", "teams", "divisions"]),
  recipientUserIds: z.array(z.string()).optional(),
  recipientRoles: z.array(z.string()).optional(),
  recipientTeamIds: z.array(z.string()).optional(),
  recipientDivisionIds: z.array(z.string()).optional(),
  deliveryChannels: z.array(z.enum(["in_app", "email", "push"])).min(1),
  sentBy: z.string(),
  relatedEventId: z.number().optional(),
  status: z.enum(["pending", "sent", "failed"]).default('pending'),
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SelectNotification = typeof notifications.$inferSelect;

export interface NotificationRecipient {
  id: number;
  notificationId: number;
  userId: string;
  isRead: boolean;
  readAt?: Date;
  deliveryStatus?: Record<string, string>;
  createdAt: Date;
}

export const insertNotificationRecipientSchema = z.object({
  notificationId: z.number(),
  userId: z.string(),
  isRead: z.boolean().default(false),
  deliveryStatus: z.record(z.string()).optional(),
});

export type InsertNotificationRecipient = z.infer<typeof insertNotificationRecipientSchema>;
export type SelectNotificationRecipient = typeof notificationRecipients.$inferSelect;

export interface NotificationPreferences {
  id: number;
  userId: string;
  eventRsvp?: boolean;
  eventCheckin?: boolean;
  eventReminders?: boolean;
  trophyProgress?: boolean;
  badgeEarned?: boolean;
  trainingReminders?: boolean;
  skillsEvaluation?: boolean;
  improvementRecommendation?: boolean;
  paymentDue?: boolean;
  teamMessages?: boolean;
  teamUpdates?: boolean;
  eventChanges?: boolean;
  playerCheckIn?: boolean;
  playerRsvp?: boolean;
  playerAwards?: boolean;
  playerProgress?: boolean;
  pushNotifications?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const insertNotificationPreferencesSchema = z.object({
  userId: z.string(),
  eventRsvp: z.boolean().optional(),
  eventCheckin: z.boolean().optional(),
  eventReminders: z.boolean().optional(),
  trophyProgress: z.boolean().optional(),
  badgeEarned: z.boolean().optional(),
  trainingReminders: z.boolean().optional(),
  skillsEvaluation: z.boolean().optional(),
  improvementRecommendation: z.boolean().optional(),
  paymentDue: z.boolean().optional(),
  teamMessages: z.boolean().optional(),
  teamUpdates: z.boolean().optional(),
  eventChanges: z.boolean().optional(),
  playerCheckIn: z.boolean().optional(),
  playerRsvp: z.boolean().optional(),
  playerAwards: z.boolean().optional(),
  playerProgress: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type SelectNotificationPreferences = typeof notificationPreferences.$inferSelect;

export interface PushSubscription {
  id: number;
  userId: string;
  endpoint?: string;
  p256dhKey?: string;
  authKey?: string;
  fcmToken?: string;
  platform?: string;
  userAgent?: string;
  deviceType?: string;
  apnsEnvironment?: string; // 'sandbox' or 'production' for iOS tokens
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
}

export const insertPushSubscriptionSchema = z.object({
  userId: z.string(),
  endpoint: z.string().optional(),
  p256dhKey: z.string().optional(),
  authKey: z.string().optional(),
  fcmToken: z.string().optional(),
  platform: z.enum(["web", "ios", "android"]),
  userAgent: z.string().optional(),
  deviceType: z.string().optional(),
  apnsEnvironment: z.enum(["sandbox", "production"]).optional(), // For iOS APNs environment
}).refine(
  (data) => {
    if (data.platform === "web") {
      return !!data.endpoint && !!data.p256dhKey && !!data.authKey;
    }
    if (data.platform === "ios" || data.platform === "android") {
      return !!data.fcmToken;
    }
    return false;
  },
  {
    message: "Web subscriptions require endpoint, p256dhKey, and authKey. Native subscriptions require fcmToken and platform (ios/android).",
  }
);

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type SelectPushSubscription = typeof pushSubscriptions.$inferSelect;

// =============================================
// Event Windows Schema (RSVP & Check-In Timing)
// =============================================

export const eventWindows = pgTable("event_windows", {
  id: serial().primaryKey().notNull(),
  eventId: integer("event_id").notNull(),
  windowType: varchar("window_type").notNull(), // "rsvp" or "checkin"
  openRole: varchar("open_role").notNull(), // "open" or "close"
  amount: integer().notNull(), // numeric value
  unit: varchar().notNull(), // "minutes", "hours", "days"
  direction: varchar().notNull(), // "before" or "after"
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export interface EventWindow {
  id: number;
  eventId: number;
  windowType: "rsvp" | "checkin";
  openRole: "open" | "close";
  amount: number;
  unit: "minutes" | "hours" | "days";
  direction: "before" | "after";
  isDefault: boolean;
  createdAt: Date;
}

export const insertEventWindowSchema = z.object({
  eventId: z.number(),
  windowType: z.enum(["rsvp", "checkin"]),
  openRole: z.enum(["open", "close"]),
  amount: z.number().min(0),
  unit: z.enum(["minutes", "hours", "days"]),
  direction: z.enum(["before", "after"]),
  isDefault: z.boolean().default(false),
});

export type InsertEventWindow = z.infer<typeof insertEventWindowSchema>;

// =============================================
// RSVP Response Schema
// =============================================

export const rsvpResponses = pgTable("rsvp_responses", {
  id: serial().primaryKey().notNull(),
  eventId: integer("event_id").notNull(),
  userId: varchar("user_id").notNull(),
  response: varchar().notNull(), // "attending", "not_attending", "no_response"
  respondedAt: timestamp("responded_at", { mode: 'string' }).defaultNow(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export interface RsvpResponse {
  id: number;
  eventId: number;
  userId: string;
  response: "attending" | "not_attending" | "no_response";
  respondedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const insertRsvpResponseSchema = z.object({
  eventId: z.number(),
  userId: z.string(),
  response: z.enum(["attending", "not_attending", "no_response"]),
});

export type InsertRsvpResponse = z.infer<typeof insertRsvpResponseSchema>;

// =============================================
// Migration Lookup Schema (Legacy UYP Migration)
// =============================================

export const migrationLookup = pgTable("migration_lookup", {
  id: serial().primaryKey().notNull(),
  email: varchar().notNull(),
  stripeCustomerId: varchar("stripe_customer_id").notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id").notNull(),
  productName: varchar("product_name").notNull(),
  isClaimed: boolean("is_claimed").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export interface MigrationLookup {
  id: number;
  email: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  productName: string;
  isClaimed: boolean;
  createdAt: Date;
}

export const insertMigrationLookupSchema = z.object({
  email: z.string().email(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string(),
  productName: z.string(),
  isClaimed: z.boolean().default(false),
});

export type InsertMigrationLookup = z.infer<typeof insertMigrationLookupSchema>;
export type SelectMigrationLookup = typeof migrationLookup.$inferSelect;

// =============================================
// Subscriptions Schema (User Wallet System)
// =============================================

export const subscriptions = pgTable("subscriptions", {
  id: serial().primaryKey().notNull(),
  ownerUserId: varchar("owner_user_id").notNull(),
  assignedPlayerId: varchar("assigned_player_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id").notNull(),
  productName: varchar("product_name").notNull(),
  status: varchar().default('active').notNull(),
  isMigrated: boolean("is_migrated").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.ownerUserId],
    foreignColumns: [users.id],
    name: "subscriptions_owner_user_id_fkey"
  }),
  foreignKey({
    columns: [table.assignedPlayerId],
    foreignColumns: [users.id],
    name: "subscriptions_assigned_player_id_fkey"
  }),
]);

export interface Subscription {
  id: number;
  ownerUserId: string;
  assignedPlayerId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  productName: string;
  status: string;
  isMigrated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const insertSubscriptionSchema = z.object({
  ownerUserId: z.string(),
  assignedPlayerId: z.string().nullable().optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string(),
  productName: z.string(),
  status: z.string().default('active'),
  isMigrated: z.boolean().default(false),
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type SelectSubscription = typeof subscriptions.$inferSelect;
