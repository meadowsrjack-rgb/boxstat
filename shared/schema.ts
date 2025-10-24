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
  gender?: string;
  
  // Registration flow fields
  registrationType?: RegistrationType; // "myself" or "my_child"
  accountHolderId?: string; // For players linked to a parent account
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
  
  // Payment information
  stripeCustomerId?: string; // Stripe Customer ID for payment tracking
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
  parentId: varchar("parent_id"),
  teamId: integer("team_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
  sportsEngineCustomerId: varchar("sports_engine_customer_id"),
  sportsEngineSubscriptionId: varchar("sports_engine_subscription_id"),
  userType: varchar("user_type").default('parent').notNull(),
  dateOfBirth: date("date_of_birth"),
  phoneNumber: varchar("phone_number"),
  emergencyContact: varchar("emergency_contact"),
  emergencyPhone: varchar("emergency_phone"),
  address: text(),
  medicalInfo: text("medical_info"),
  allergies: text(),
  jerseyNumber: integer("jersey_number"),
  position: varchar(),
  schoolGrade: varchar("school_grade"),
  parentalConsent: boolean("parental_consent").default(false),
  profileCompleted: boolean("profile_completed").default(false),
  qrCodeData: varchar("qr_code_data"),
  teamName: varchar("team_name"),
  age: varchar(),
  height: varchar(),
  passcode: varchar({ length: 4 }),
  password: varchar(),
  city: varchar(),
  youthClubTeam: varchar("youth_club_team"),
  linkedAccountId: varchar("linked_account_id"),
  activeProfileId: varchar("active_profile_id"),
  accountHolderId: varchar("account_holder_id"),
  registrationType: varchar("registration_type"),
  packageSelected: varchar("package_selected"),
  teamAssignmentStatus: varchar("team_assignment_status"),
  hasRegistered: boolean("has_registered").default(false),
  verified: boolean().default(false),
  verificationToken: varchar("verification_token"),
  verificationExpiry: timestamp("verification_expiry", { mode: 'string' }),
  magicLinkToken: varchar("magic_link_token"),
  magicLinkExpiry: timestamp("magic_link_expiry", { mode: 'string' }),
  googleId: varchar("google_id"),
  appleId: varchar("apple_id"),
}, (table) => [
  unique("users_email_unique").on(table.email),
]);

// Teams table
export const teams = pgTable("teams", {
  id: serial().primaryKey().notNull(),
  name: varchar().notNull(),
  ageGroup: varchar("age_group").notNull(),
  color: varchar().default('#1E40AF').notNull(),
  coachId: varchar("coach_id"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  division: varchar({ length: 100 }),
  coachNames: varchar("coach_names", { length: 255 }),
  notionId: varchar("notion_id", { length: 255 }),
  program: varchar(),
}, (table) => [
  unique("teams_notion_id_key").on(table.notionId),
]);

// Events table
export const events = pgTable("events", {
  id: serial().primaryKey().notNull(),
  title: varchar().notNull(),
  description: text(),
  eventType: varchar("event_type").notNull(),
  startTime: timestamp("start_time", { mode: 'string' }).notNull(),
  endTime: timestamp("end_time", { mode: 'string' }).notNull(),
  location: varchar().notNull(),
  teamId: integer("team_id"),
  opponentTeam: varchar("opponent_team"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  childProfileId: integer("child_profile_id"),
  isRecurring: boolean("is_recurring").default(false),
  recurringType: varchar("recurring_type"),
  recurringEndDate: timestamp("recurring_end_date", { mode: 'string' }),
  playerId: varchar("player_id"),
  googleEventId: text("google_event_id"),
  lastSyncedAt: timestamp("last_synced_at", { mode: 'string' }),
  isActive: boolean("is_active").default(true),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  tags: text().array(),
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
  amount: real().notNull(),
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
  program: z.string().optional(),
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
  googleId: z.string().optional(),
  appleId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// =============================================
// Team Schema
// =============================================

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  ageGroup?: string;
  program?: string; // Configurable by organization
  color: string;
  coachIds: string[]; // Multiple coaches can manage a team
  division?: string;
  createdAt: Date;
}

export const insertTeamSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  ageGroup: z.string().optional(),
  program: z.string().optional(),
  color: z.string().default("#1E40AF"),
  coachIds: z.array(z.string()).default([]),
  division: z.string().optional(),
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;

// =============================================
// Event Schema
// =============================================

export interface Event {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  eventType?: string; // Configurable: "practice", "game", etc.
  startTime: Date;
  endTime: Date;
  location: string;
  teamId?: string;
  opponentTeam?: string;
  isActive: boolean;
  createdAt: Date;
}

export const insertEventSchema = z.object({
  organizationId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  eventType: z.string().optional(),
  startTime: z.string(), // ISO date string
  endTime: z.string(), // ISO date string
  location: z.string().min(1),
  teamId: z.string().optional(),
  opponentTeam: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;

// =============================================
// Attendance/Check-in Schema
// =============================================

export interface Attendance {
  id: string;
  userId: string;
  eventId: string;
  checkedInAt: Date;
  type: "advance" | "onsite";
}

export const insertAttendanceSchema = z.object({
  userId: z.string(),
  eventId: z.string(),
  type: z.enum(["advance", "onsite"]).default("advance"),
});

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

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
  amount: number;
  currency: string;
  paymentType: string; // Configurable by organization
  status: "pending" | "completed" | "failed" | "refunded";
  description?: string;
  dueDate?: string;
  paidAt?: Date;
  createdAt: Date;
}

export const insertPaymentSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  amount: z.number().min(0),
  currency: z.string().default("usd"),
  paymentType: z.string().min(1),
  status: z.enum(["pending", "completed", "failed", "refunded"]).default("pending"),
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
  description?: string;
  price?: number; // Price in cents (e.g., 14900 for $149.00)
  pricingModel?: string; // "one-time", "monthly", "installments", etc.
  duration?: string; // "1 month", "3 months", "6 months", "12 weeks", "per hour", etc.
  installments?: number; // Number of installments if pricing model is "installments"
  installmentPrice?: number; // Price per installment in cents
  category?: string; // "HS Club", "Skills Academy", "Youth Club", "FNH", "Training", etc.
  ageGroups: string[]; // e.g., ["8-10", "11-13", "14-17"]
  isActive: boolean;
  createdAt: Date;
}

export const insertProgramSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().optional(),
  pricingModel: z.string().optional(),
  duration: z.string().optional(),
  installments: z.number().optional(),
  installmentPrice: z.number().optional(),
  category: z.string().optional(),
  ageGroups: z.array(z.string()).default([]),
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
