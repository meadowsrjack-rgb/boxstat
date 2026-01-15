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
  grade?: string;
  aauMembershipId?: string;
  divisionId?: number;
  
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
  skillsAssessments?: Record<string, any>;
  
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
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  
  // Email verification & magic links
  verified: boolean;
  verificationToken?: string;
  verificationExpiry?: Date;
  magicLinkToken?: string;
  magicLinkExpiry?: Date;
  magicLinkSourcePlatform?: string;
  
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
  concussionWaiverAcknowledged: boolean("concussion_waiver_acknowledged").default(false),
  concussionWaiverDate: timestamp("concussion_waiver_date", { mode: 'string' }),
  clubAgreementAcknowledged: boolean("club_agreement_acknowledged").default(false),
  clubAgreementDate: timestamp("club_agreement_date", { mode: 'string' }),
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
  needsLegacyClaim: boolean("needs_legacy_claim").default(false), // Legacy migration flag
  flaggedForRosterChange: boolean("flagged_for_roster_change").default(false),
  flagReason: text("flag_reason"), // Reason for flagging player for roster review
});
// NOTE: Email uniqueness is enforced via a partial unique index in the database
// Only parent/account holder accounts (account_holder_id IS NULL) require unique emails
// Child player profiles can share the parent's email

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

// Waivers table (custom waivers/agreements)
export const waivers = pgTable("waivers", {
  id: varchar().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  name: varchar().notNull(), // "AAU Membership", "Concussion Waiver", etc.
  title: varchar().notNull(), // Display title for the waiver
  content: text().notNull(), // Full waiver/agreement text
  requiresScroll: boolean("requires_scroll").default(true), // Must scroll to bottom
  requiresCheckbox: boolean("requires_checkbox").default(true), // Must check acknowledgment box
  checkboxLabel: varchar("checkbox_label").default("I have read and agree to the terms above"),
  isBuiltIn: boolean("is_built_in").default(false), // System waivers (AAU, Concussion, Club)
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertWaiverSchema = createInsertSchema(waivers).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertWaiver = z.infer<typeof insertWaiverSchema>;
export type Waiver = typeof waivers.$inferSelect;

// Waiver Versions table (tracks version history of waivers)
export const waiverVersions = pgTable("waiver_versions", {
  id: serial().primaryKey().notNull(),
  waiverId: varchar("waiver_id").notNull(),
  version: integer().notNull().default(1),
  title: varchar().notNull(),
  content: text().notNull(),
  requiresScroll: boolean("requires_scroll").default(true),
  requiresCheckbox: boolean("requires_checkbox").default(true),
  checkboxLabel: varchar("checkbox_label").default("I have read and agree to the terms above"),
  isActive: boolean("is_active").default(false).notNull(), // Only one version active at a time
  publishedAt: timestamp("published_at", { mode: 'string' }),
  publishedBy: varchar("published_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.waiverId],
    foreignColumns: [waivers.id],
    name: "waiver_versions_waiver_id_fkey"
  }).onDelete("cascade"),
]);

export const insertWaiverVersionSchema = createInsertSchema(waiverVersions).omit({
  id: true,
  createdAt: true,
});
export type InsertWaiverVersion = z.infer<typeof insertWaiverVersionSchema>;
export type WaiverVersion = typeof waiverVersions.$inferSelect;

// Waiver Signatures table (tracks user signatures on waiver versions)
export const waiverSignatures = pgTable("waiver_signatures", {
  id: serial().primaryKey().notNull(),
  waiverVersionId: integer("waiver_version_id").notNull(),
  profileId: varchar("profile_id").notNull(), // The user who signed (player profile)
  signedBy: varchar("signed_by").notNull(), // Who actually signed (could be parent for minor)
  signedAt: timestamp("signed_at", { mode: 'string' }).defaultNow().notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb(), // Additional context (e.g., registration flow, renewal)
  status: varchar().default('valid').notNull(), // 'valid', 'superseded', 'revoked'
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.waiverVersionId],
    foreignColumns: [waiverVersions.id],
    name: "waiver_signatures_waiver_version_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.profileId],
    foreignColumns: [users.id],
    name: "waiver_signatures_profile_id_fkey"
  }),
  foreignKey({
    columns: [table.signedBy],
    foreignColumns: [users.id],
    name: "waiver_signatures_signed_by_fkey"
  }),
]);

export const insertWaiverSignatureSchema = createInsertSchema(waiverSignatures).omit({
  id: true,
  signedAt: true,
  createdAt: true,
});
export type InsertWaiverSignature = z.infer<typeof insertWaiverSignatureSchema>;
export type WaiverSignature = typeof waiverSignatures.$inferSelect;

// Products table (packages/subscriptions)
export const products = pgTable("products", {
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
  requireAAUMembership: boolean("require_aau_membership").default(false),
  requireConcussionWaiver: boolean("require_concussion_waiver").default(false),
  requireClubAgreement: boolean("require_club_agreement").default(false),
  requiredWaivers: text("required_waivers").array().default(sql`ARRAY[]::text[]`), // Custom waiver IDs
  accessTag: varchar("access_tag"), // "club_member" (subscription), "pack_holder" (one-time with credits)
  sessionCount: integer("session_count"), // Number of sessions/credits for one-time packs
  adminNotes: text("admin_notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  // Social toggle fields for program-based team/group management
  hasSubgroups: boolean("has_subgroups").default(true), // Does this program have teams/groups?
  subgroupLabel: varchar("subgroup_label").default('Team'), // Dynamic label: "Team", "Level", "Group"
  rosterVisibility: varchar("roster_visibility").default('members'), // 'public', 'members', 'hidden'
  chatMode: varchar("chat_mode").default('two_way'), // 'disabled', 'announcements', 'two_way'
  // New fields for Programs vs Store separation
  productCategory: varchar("product_category").default('service'), // 'service' (Programs) or 'goods' (Store)
  displayCategory: varchar("display_category").default('general'), // For filter buttons: basketball, training, camps, clinics, etc.
  iconName: varchar("icon_name"), // Icon identifier for display
  coverImageUrl: varchar("cover_image_url"), // Cover photo for program overview
  requiredGearProductIds: text("required_gear_product_ids").array().default(sql`ARRAY[]::text[]`), // Store product IDs required for this program
  seasonStartDate: timestamp("season_start_date", { mode: 'string' }), // Program season start
  seasonEndDate: timestamp("season_end_date", { mode: 'string' }), // Program season end
  // Store-specific fields (for physical goods)
  inventorySizes: text("inventory_sizes").array().default(sql`ARRAY[]::text[]`), // Available sizes: ["S", "M", "L", "XL"]
  inventoryCount: integer("inventory_count"), // Current stock count
  shippingRequired: boolean("shipping_required").default(false), // Does this item need shipping?
  // Multi-tier pricing support
  comparePrice: integer("compare_price"), // For multi-month packages: equivalent monthly price to show value (in cents)
  savingsNote: varchar("savings_note"), // Display text like "Save $114!" for bundle discounts
  packageGroup: varchar("package_group"), // DEPRECATED: Use pricingOptions instead
  // New: Multiple pricing options within a single program (replaces packageGroup pattern)
  // Each option: { id, name, price, billingCycle, durationDays, comparePrice, savingsNote, stripePriceId, isDefault }
  pricingOptions: jsonb("pricing_options").default('[]'), // Array of pricing tiers for this program
  // Subscription disclosure statement shown to customers before checkout
  subscriptionDisclosure: text("subscription_disclosure"),
});

// Program Suggested Add-ons table (many-to-many relationship between programs and store products)
// Links goods (store products) as suggested add-ons for service (programs)
export const programSuggestedAddOns = pgTable("program_suggested_add_ons", {
  id: serial().primaryKey().notNull(),
  programId: varchar("program_id").notNull(), // The program (service product)
  productId: varchar("product_id").notNull(), // The store item (goods product) suggested for this program
  displayOrder: integer("display_order").default(0), // Order to display suggested add-ons
  isRequired: boolean("is_required").default(false), // If true, this add-on is required for the program
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.programId],
    foreignColumns: [products.id],
    name: "program_suggested_add_ons_program_id_fkey"
  }),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: "program_suggested_add_ons_product_id_fkey"
  }),
]);

export const insertProgramSuggestedAddOnSchema = createInsertSchema(programSuggestedAddOns).omit({
  id: true,
  createdAt: true,
});
export type InsertProgramSuggestedAddOn = z.infer<typeof insertProgramSuggestedAddOnSchema>;
export type ProgramSuggestedAddOn = typeof programSuggestedAddOns.$inferSelect;

// Product Enrollments table (tracks who is enrolled in which products/programs)
export const productEnrollments = pgTable("product_enrollments", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  programId: varchar("program_id").notNull(), // References programs table
  accountHolderId: varchar("account_holder_id").notNull(), // The parent/purchaser
  profileId: varchar("profile_id"), // The player enrolled (null for family-wide)
  status: varchar().notNull().default('active'), // 'active', 'expired', 'cancelled', 'pending'
  source: varchar().default('direct'), // 'direct', 'migration', 'gift', 'promo'
  paymentId: varchar("payment_id"), // Reference to the payment that created this enrollment
  stripeSubscriptionId: varchar("stripe_subscription_id"), // For recurring enrollments
  startDate: timestamp("start_date", { mode: 'string' }).defaultNow(),
  endDate: timestamp("end_date", { mode: 'string' }), // For time-limited enrollments
  autoRenew: boolean("auto_renew").default(true),
  totalCredits: integer("total_credits"), // Initial credits from product sessionCount
  remainingCredits: integer("remaining_credits"), // Credits left after check-ins
  metadata: jsonb().default('{}'), // Additional enrollment data
  // Legacy/custom pricing tracking (for migrations and grandfathered rates)
  isLegacyPricing: boolean("is_legacy_pricing").default(false), // True if this enrollment has grandfathered pricing
  originalMigrationDate: timestamp("original_migration_date", { mode: 'string' }), // Date of original migration/grandfather
  customPriceAmount: integer("custom_price_amount"), // Custom/legacy price in cents (if different from standard)
  selectedPricingOptionId: varchar("selected_pricing_option_id"), // Which pricing tier was selected
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.programId],
    foreignColumns: [products.id],
    name: "product_enrollments_program_id_fkey"
  }),
  foreignKey({
    columns: [table.accountHolderId],
    foreignColumns: [users.id],
    name: "product_enrollments_account_holder_id_fkey"
  }),
  foreignKey({
    columns: [table.profileId],
    foreignColumns: [users.id],
    name: "product_enrollments_profile_id_fkey"
  }),
]);

export const insertProductEnrollmentSchema = createInsertSchema(productEnrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductEnrollment = z.infer<typeof insertProductEnrollmentSchema>;
export type ProductEnrollment = typeof productEnrollments.$inferSelect;

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

// Teams table (can represent teams, groups, levels depending on parent program)
export const teams = pgTable("teams", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id"),
  name: varchar().notNull(),
  programId: varchar("program_id"), // Links team/group to parent program
  programType: varchar("program_type"), // DEPRECATED: use programId instead
  divisionId: integer("division_id"),
  division: varchar("division"), // Free-form division text like "U10", "U12"
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
    columns: [table.programId],
    foreignColumns: [products.id],
    name: "teams_program_id_fkey"
  }),
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

// Team Memberships table (replaces teamId/teamIds array columns)
export const teamMemberships = pgTable("team_memberships", {
  id: serial().primaryKey().notNull(),
  teamId: integer("team_id").notNull(),
  profileId: varchar("profile_id").notNull(), // User ID (player or coach)
  role: varchar().notNull().default('player'), // 'player', 'coach', 'assistant_coach', 'manager'
  status: varchar().default('active'), // 'active', 'inactive', 'pending'
  jerseyNumber: integer("jersey_number"),
  position: varchar(),
  joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
  leftAt: timestamp("left_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
    name: "team_memberships_team_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.profileId],
    foreignColumns: [users.id],
    name: "team_memberships_profile_id_fkey"
  }).onDelete("cascade"),
  unique("team_memberships_team_profile").on(table.teamId, table.profileId),
]);

export const insertTeamMembershipSchema = createInsertSchema(teamMemberships).omit({
  id: true,
  createdAt: true,
});
export type InsertTeamMembership = z.infer<typeof insertTeamMembershipSchema>;
export type TeamMembership = typeof teamMemberships.$inferSelect;

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
  // Role-based participation control
  participationRoles: text("participation_roles").array(), // Roles that can RSVP/check-in (player, parent, coach, admin)
  proxyCheckinRoles: text("proxy_checkin_roles").array(), // Roles that can check in others (typically parent for player events)
});

// Event Targets table (normalized targeting for events)
export const eventTargets = pgTable("event_targets", {
  id: serial().primaryKey().notNull(),
  eventId: integer("event_id").notNull(),
  targetType: varchar("target_type").notNull(), // 'team', 'role', 'program', 'division', 'user'
  targetId: varchar("target_id").notNull(), // ID of the target (team ID, role name, program ID, etc.)
  targetScope: varchar("target_scope").notNull().default('visibility'), // 'visibility' or 'assignment'
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.eventId],
    foreignColumns: [events.id],
    name: "event_targets_event_id_fkey"
  }).onDelete("cascade"),
]);

export const insertEventTargetSchema = createInsertSchema(eventTargets).omit({
  id: true,
  createdAt: true,
});
export type InsertEventTarget = z.infer<typeof insertEventTargetSchema>;
export type EventTarget = typeof eventTargets.$inferSelect;

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
  checkedInByUserId: varchar("checked_in_by_user_id"), // For proxy check-ins (parent checking in player)
  checkInMethod: varchar("check_in_method"), // 'location', 'qr', 'manual', 'proxy'
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

// Awards table (renamed from badges)
export const awards = pgTable("awards", {
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
  unique("awards_slug_key").on(table.slug),
]);

// Backwards compatibility alias
export const badges = awards;

// User Badges table
export const userBadges = pgTable("user_badges", {
  id: serial().primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  badgeId: integer("badge_id"),
  earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow(),
  profileId: varchar("profile_id"),
  badgeType: varchar("badge_type", { length: 50 }),
});

// Award Definitions table (new simplified awards system)
// Trigger Categories: checkin, system, time, store, manual
export const awardDefinitions = pgTable("award_definitions", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  tier: text().notNull(), // Gold, Purple, Blue, Green, Grey, Special
  description: text(),
  imageUrl: text("image_url"),
  
  // Trigger configuration
  triggerCategory: text("trigger_category").default('manual'), // checkin, system, time, store, manual
  eventFilter: text("event_filter"), // game, practice, skills, fnh, any (for checkin/rsvp)
  countMode: text("count_mode"), // total, streak (for checkin)
  threshold: integer(), // number required (e.g., 50 checkins, 5 years)
  referenceId: text("reference_id"), // for system (award ID to count) or store (product SKU)
  targetTier: text("target_tier"), // for system: tier name to count (Legacy, HOF, Superstar, etc.) - alternative to referenceId
  timeUnit: text("time_unit"), // years, months, days (for time triggers)
  
  // Program/Team scope filtering (for checkin awards)
  programIds: text("program_ids").array(), // array of program IDs to scope the award
  teamIds: integer("team_ids").array(), // array of team IDs to scope the award
  
  // Legacy fields (kept for backwards compatibility during migration)
  class: text(),
  prestige: text().default('Prospect'),
  triggerField: text("trigger_field"),
  triggerOperator: text("trigger_operator").default('>='),
  triggerValue: numeric("trigger_value"),
  triggerType: text("trigger_type").default('count'),
  
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
  chatChannel: varchar("chat_channel").default('players'), // 'players' for player chat, 'parents' for parent chat
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

// Notification Templates table (reusable notification content)
export const notificationTemplates = pgTable("notification_templates", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  name: varchar().notNull(), // Internal name for template
  slug: varchar().notNull(), // Unique identifier for referencing
  title: varchar().notNull(), // Template title with placeholders
  message: text().notNull(), // Template message with placeholders
  types: text("types").array().default(sql`ARRAY['notification']::text[]`),
  defaultChannels: text("default_channels").array().default(sql`ARRAY['in_app']::text[]`),
  variables: text("variables").array().default(sql`ARRAY[]::text[]`), // Available template variables
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;

// Notification Topics table (categorization and subscription control)
export const notificationTopics = pgTable("notification_topics", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  name: varchar().notNull(),
  slug: varchar().notNull(),
  description: text(),
  category: varchar(), // 'event', 'payment', 'team', 'achievement', 'system'
  isSubscribable: boolean("is_subscribable").default(true), // Can users opt out?
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertNotificationTopicSchema = createInsertSchema(notificationTopics).omit({
  id: true,
  createdAt: true,
});
export type InsertNotificationTopic = z.infer<typeof insertNotificationTopicSchema>;
export type NotificationTopic = typeof notificationTopics.$inferSelect;

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

// Direct Messages (parent-coach 1-on-1 chats)
export const directMessages = pgTable("direct_messages", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  teamId: integer("team_id"), // optional: context of which team the message is about
  message: text().notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Contact Management Messages (parent messages to admin/management)
export const contactManagementMessages = pgTable("contact_management_messages", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderName: varchar("sender_name"),
  senderEmail: varchar("sender_email"),
  message: text().notNull(),
  status: varchar().default('unread'), // unread, read, replied, archived
  assignedTo: varchar("assigned_to"), // admin user assigned to handle
  repliedBy: varchar("replied_by"),
  repliedAt: timestamp("replied_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// CRM Leads table
export const crmLeads = pgTable("crm_leads", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  source: varchar(), // "referral", "website", "event", "social", "other"
  status: varchar().default('new'), // new, contacted, qualified, quoted, converted, lost
  playerCount: integer("player_count").default(1),
  interestedPrograms: text("interested_programs").array(), // program IDs they're interested in
  assignedTo: varchar("assigned_to"), // admin user assigned to this lead
  lastContactedAt: timestamp("last_contacted_at", { mode: 'string' }),
  convertedUserId: varchar("converted_user_id"), // links to user if converted
  evaluation: jsonb("evaluation"), // lead evaluation form data
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// CRM Notes (notes on leads or users)
export const crmNotes = pgTable("crm_notes", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  leadId: integer("lead_id"), // optional: note on a lead
  userId: varchar("user_id"), // optional: note on a user
  authorId: varchar("author_id").notNull(), // admin who wrote the note
  note: text().notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Quote Checkout Links (pre-filled checkout for leads or existing users)
export const quoteCheckouts = pgTable("quote_checkouts", {
  id: varchar().primaryKey().notNull(), // nanoid for unique URL (used as checkoutId in links)
  organizationId: varchar("organization_id").notNull(),
  leadId: integer("lead_id"), // optional: linked to a lead
  userId: varchar("user_id"), // optional: linked to an existing user (for quotes to current members)
  createdBy: varchar("created_by").notNull(), // admin who created the quote
  programIds: text("program_ids").array(), // selected programs (legacy)
  items: jsonb("items"), // array of { type, productId, productName, price, quantity }
  totalAmount: integer("total_amount").default(0), // in cents
  discountPercent: integer("discount_percent").default(0),
  discountCode: varchar("discount_code"),
  notes: text(), // internal notes
  expiresAt: timestamp("expires_at", { mode: 'string' }),
  status: varchar().default('pending'), // pending, completed, expired
  usedBy: varchar("used_by"), // user ID if someone used the quote
  usedAt: timestamp("used_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

// Insert schemas for new tables
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;

export const insertContactManagementMessageSchema = createInsertSchema(contactManagementMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertContactManagementMessage = z.infer<typeof insertContactManagementMessageSchema>;
export type ContactManagementMessage = typeof contactManagementMessages.$inferSelect;

export const insertCrmLeadSchema = createInsertSchema(crmLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type CrmLead = typeof crmLeads.$inferSelect;

export const insertCrmNoteSchema = createInsertSchema(crmNotes).omit({
  id: true,
  createdAt: true,
});
export type InsertCrmNote = z.infer<typeof insertCrmNoteSchema>;
export type CrmNote = typeof crmNotes.$inferSelect;

export const insertQuoteCheckoutSchema = createInsertSchema(quoteCheckouts).omit({
  createdAt: true,
});
export type InsertQuoteCheckout = z.infer<typeof insertQuoteCheckoutSchema>;
export type QuoteCheckout = typeof quoteCheckouts.$inferSelect;

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
  grade: z.string().optional(),
  aauMembershipId: z.string().optional(),
  divisionId: z.number().optional(),
  paymentStatus: z.string().optional(),
  skillsAssessments: z.record(z.any()).optional(),
  magicLinkSourcePlatform: z.string().optional(),
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
  programId?: string;
  programType?: string;
  divisionId?: number;
  division?: string; // Free-form division text like "U10", "U12"
  coachId?: string;
  assistantCoachIds?: string[];
  season?: string;
  organization?: string;
  location?: string;
  scheduleLink?: string;
  rosterSize?: number;
  active?: boolean;
  notes?: string;
  notionSlug?: string;
  ageGroup?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export const insertTeamSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(1),
  programId: z.string().optional(),
  programType: z.string().optional(),
  divisionId: z.number().optional(),
  division: z.string().optional(), // Free-form division text like "U10", "U12"
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
  participationRoles?: string[];
  proxyCheckinRoles?: string[];
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
// Award Definition Schema (Simplified Awards System)
// =============================================

// Trigger categories for simplified awards
export type TriggerCategory = 'checkin' | 'rsvp' | 'system' | 'time' | 'store' | 'manual';
export type EventFilter = 'game' | 'practice' | 'skills' | 'fnh' | 'any';
export type CountMode = 'total' | 'streak';
export type TimeUnit = 'years' | 'months' | 'days';
export type AwardTier = 'Gold' | 'Purple' | 'Blue' | 'Green' | 'Grey' | 'Special';

export interface AwardDefinition {
  id: number;
  name: string;
  tier: string;
  description?: string;
  imageUrl?: string;
  
  // New trigger configuration
  triggerCategory: TriggerCategory;
  eventFilter?: EventFilter;
  countMode?: CountMode;
  threshold?: number;
  referenceId?: string;
  targetTier?: string; // For collection meta badges: tier to count (Legacy, HOF, Superstar, etc.)
  timeUnit?: TimeUnit;
  
  // Legacy fields
  class?: string;
  prestige: string;
  triggerField?: string;
  triggerOperator: string;
  triggerValue?: number;
  triggerType: string;
  
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
  chatChannel?: "players" | "parents"; // 'players' for player chat, 'parents' for parent chat
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
  chatChannel: z.enum(["players", "parents"]).default("players").optional(),
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

export interface Product {
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
  requireAAUMembership?: boolean; // Whether AAU membership is required
  requireConcussionWaiver?: boolean; // Whether concussion waiver is required
  requireClubAgreement?: boolean; // Whether club agreement is required
  requiredWaivers?: string[]; // Custom waiver IDs required for this product
  linkedAwards?: string[]; // Award IDs earned automatically for completing this package
  accessTag?: string; // "club_member" (subscription), "pack_holder" (one-time with credits)
  sessionCount?: number; // Number of sessions/credits for one-time packs
  adminNotes?: string; // Internal notes not shown to users
  isActive: boolean;
  createdAt: Date;
  // Social toggle fields for programs
  hasSubgroups?: boolean; // Does this program have teams/groups?
  subgroupLabel?: string; // Dynamic label: "Team", "Level", "Group"
  rosterVisibility?: string; // 'public', 'members', 'hidden'
  chatMode?: string; // 'disabled', 'announcements', 'two_way'
  // Programs vs Store separation
  productCategory?: string; // 'service' (Programs) or 'goods' (Store)
  displayCategory?: string; // For filter buttons: basketball, training, camps, clinics, etc.
  iconName?: string; // Icon identifier for display
  coverImageUrl?: string; // Cover photo for program overview
  requiredGearProductIds?: string[]; // Store product IDs required for this program
  seasonStartDate?: string; // Program season start
  seasonEndDate?: string; // Program season end
  // Store-specific fields (for physical goods)
  inventorySizes?: string[]; // Available sizes: ["S", "M", "L", "XL"]
  inventoryCount?: number; // Current stock count
  shippingRequired?: boolean; // Does this item need shipping?
  // Multi-tier pricing support
  comparePrice?: number; // For multi-month packages: equivalent monthly price to show value (in cents)
  savingsNote?: string; // Display text like "Save $114!" for bundle discounts
  packageGroup?: string; // DEPRECATED: Groups related packages together
  pricingOptions?: PricingOption[]; // Multiple pricing tiers for this program
}

// Pricing option type for multi-tier pricing within a single program
export interface PricingOption {
  id: string; // Unique ID for this pricing option (e.g., nanoid)
  name: string; // Display name (e.g., "Monthly", "3 Months", "6 Months")
  price: number; // Price in cents
  billingCycle?: string; // "Monthly", "One-Time", etc.
  durationDays?: number; // How long this option lasts
  comparePrice?: number; // Equivalent monthly price for comparison
  savingsNote?: string; // Savings display text (e.g., "Save $30!")
  stripePriceId?: string; // Stripe Price ID for this option (auto-created)
  isDefault?: boolean; // Whether this is the default/primary option
  // Subscription schedule fields (bundle converts to monthly)
  convertsToMonthly?: boolean; // If true, this bundle converts to monthly after initial period
  monthlyPrice?: number; // Monthly price in cents after bundle ends
  monthlyStripePriceId?: string; // Stripe Price ID for the monthly rate (auto-created)
}

export const insertProductSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  billingCycle: z.string().nullish(), // Accept null, undefined, or string
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
  accessTag: z.string().optional(), // "club_member" or "pack_holder"
  sessionCount: z.number().nullish(), // Accept null, undefined, or number
  adminNotes: z.string().optional(),
  isActive: z.boolean().default(true),
  // Social toggle fields for programs
  hasSubgroups: z.boolean().default(true),
  subgroupLabel: z.string().default('Team'),
  rosterVisibility: z.string().default('members'),
  chatMode: z.string().default('two_way'),
  // Programs vs Store separation
  productCategory: z.string().default('service'), // 'service' or 'goods'
  displayCategory: z.string().default('general'), // For filter buttons
  iconName: z.string().optional(), // Icon identifier
  coverImageUrl: z.string().optional(),
  requiredGearProductIds: z.array(z.string()).default([]),
  seasonStartDate: z.string().optional(),
  seasonEndDate: z.string().optional(),
  // Store-specific fields
  inventorySizes: z.array(z.string()).default([]),
  inventoryCount: z.number().optional(),
  shippingRequired: z.boolean().default(false),
  // Multi-tier pricing support
  comparePrice: z.number().optional(), // For multi-month packages: equivalent monthly price (in cents)
  savingsNote: z.string().optional(), // Display text like "Save $114!"
  packageGroup: z.string().optional(), // DEPRECATED: Groups related packages together
  // Multiple pricing options within a single program
  pricingOptions: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    billingCycle: z.string().optional(),
    durationDays: z.number().optional(),
    comparePrice: z.number().optional(),
    savingsNote: z.string().optional(),
    stripePriceId: z.string().optional(),
    isDefault: z.boolean().optional(),
    // Subscription schedule fields
    convertsToMonthly: z.boolean().optional(),
    monthlyPrice: z.number().optional(),
    monthlyStripePriceId: z.string().optional(),
  })).default([]),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;

// Backwards compatibility aliases
export type Program = Product;
export type InsertProgram = InsertProduct;
export const insertProgramSchema = insertProductSchema;
export const programs = products; // Table alias for backwards compatibility

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
  recipientIds?: string[]; // Legacy alias for recipientUserIds
  recipientRoles?: string[];
  recipientTeamIds?: string[];
  recipientDivisionIds?: string[];
  deliveryChannels: ("in_app" | "email" | "push")[];
  sentBy: string;
  sentAt?: Date;
  readBy?: string[]; // Legacy field for tracking who read the notification
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

// Item structure for migration lookup - supports multiple items with quantities
export const migrationItemSchema = z.object({
  itemId: z.string(),
  itemType: z.enum(['program', 'store']),
  itemName: z.string().optional(),
  quantity: z.number().min(1).default(1),
});

export type MigrationItem = z.infer<typeof migrationItemSchema>;

// Stripe subscription data structure - matches Stripe's subscription export CSV format
export const stripeSubscriptionDataSchema = z.object({
  subscriptionId: z.string(), // Stripe subscription ID (sub_...)
  plan: z.string().optional(), // Price ID (price_...)
  quantity: z.number().default(1),
  currency: z.string().default('usd'),
  interval: z.string().optional(), // day, week, month, year
  amount: z.string().optional(), // Amount in cents as string
  status: z.string().default('active'),
  createdUtc: z.string().optional(),
  startDateUtc: z.string().optional(),
  currentPeriodStartUtc: z.string().optional(),
  currentPeriodEndUtc: z.string().optional(),
  metadata: z.record(z.string()).optional(), // Store all metadata fields
});

export type StripeSubscriptionData = z.infer<typeof stripeSubscriptionDataSchema>;

export const migrationLookup = pgTable("migration_lookup", {
  id: serial().primaryKey().notNull(),
  email: varchar().notNull(),
  customerName: varchar("customer_name"), // Customer Name from Stripe
  stripeCustomerId: varchar("stripe_customer_id").notNull(),
  customerDescription: varchar("customer_description"), // Customer Description from Stripe
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Legacy single subscription ID (kept for backward compatibility)
  stripeSubscriptionIds: text("stripe_subscription_ids").array(), // Array of subscription IDs
  subscriptions: jsonb("subscriptions").$type<StripeSubscriptionData[]>().default([]), // Full subscription data
  items: jsonb("items").$type<MigrationItem[]>().default([]), // Array of items with type and quantity
  isClaimed: boolean("is_claimed").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export interface MigrationLookup {
  id: number;
  email: string;
  customerName: string | null;
  stripeCustomerId: string;
  customerDescription: string | null;
  stripeSubscriptionId: string | null; // Legacy field
  stripeSubscriptionIds: string[] | null;
  subscriptions: StripeSubscriptionData[];
  items: MigrationItem[];
  isClaimed: boolean;
  createdAt: Date;
}

export const insertMigrationLookupSchema = z.object({
  email: z.string().email(),
  customerName: z.string().optional(),
  stripeCustomerId: z.string(),
  customerDescription: z.string().optional(),
  stripeSubscriptionId: z.string().optional(), // Legacy field
  stripeSubscriptionIds: z.array(z.string()).optional(),
  subscriptions: z.array(stripeSubscriptionDataSchema).default([]),
  items: z.array(migrationItemSchema).default([]),
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

// =============================================
// Notification Campaigns Schema (Scheduled/Recurring Messages)
// =============================================

export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "completed" | "cancelled";
export type ScheduleType = "immediate" | "scheduled" | "recurring";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export const notificationCampaigns = pgTable("notification_campaigns", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  title: varchar().notNull(),
  message: text().notNull(),
  types: text("types").array().notNull().default(sql`ARRAY['message']::text[]`),
  
  // Targeting (same as notifications table)
  recipientTarget: varchar("recipient_target").notNull(), // "everyone", "users", "roles", "teams", "divisions", "programs"
  recipientUserIds: text("recipient_user_ids").array(),
  recipientRoles: text("recipient_roles").array(),
  recipientTeamIds: text("recipient_team_ids").array(),
  recipientDivisionIds: text("recipient_division_ids").array(),
  recipientProgramIds: text("recipient_program_ids").array(),
  
  // Delivery channels
  deliveryChannels: text("delivery_channels").array().notNull().default(sql`ARRAY['in_app']::text[]`),
  
  // APNs environment for iOS push notifications (sandbox for Xcode, production for TestFlight/App Store)
  apnsEnvironment: varchar("apns_environment"),
  
  // Schedule configuration
  scheduleType: varchar("schedule_type").notNull().default('immediate'), // immediate, scheduled, recurring
  scheduledAt: timestamp("scheduled_at", { mode: 'string' }), // For one-time scheduled
  timezone: varchar().default('America/Los_Angeles'),
  
  // Recurrence configuration (for recurring type)
  recurrenceFrequency: varchar("recurrence_frequency"), // daily, weekly, monthly
  recurrenceInterval: integer("recurrence_interval").default(1), // every N days/weeks/months
  recurrenceDays: text("recurrence_days").array(), // ["monday", "wednesday", "friday"] for weekly
  recurrenceTime: varchar("recurrence_time"), // "09:00" - time of day to send
  recurrenceEndDate: timestamp("recurrence_end_date", { mode: 'string' }), // optional end date
  recurrenceEndAfterOccurrences: integer("recurrence_end_after_occurrences"), // or end after N sends
  
  // Tracking
  nextRunAt: timestamp("next_run_at", { mode: 'string' }),
  lastRunAt: timestamp("last_run_at", { mode: 'string' }),
  totalRuns: integer("total_runs").default(0),
  
  status: varchar().notNull().default('draft'),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertNotificationCampaignSchema = createInsertSchema(notificationCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalRuns: true,
  lastRunAt: true,
});

export type InsertNotificationCampaign = z.infer<typeof insertNotificationCampaignSchema>;
export type NotificationCampaign = typeof notificationCampaigns.$inferSelect;

// Campaign Runs table (history of each send)
export const notificationCampaignRuns = pgTable("notification_campaign_runs", {
  id: serial().primaryKey().notNull(),
  campaignId: integer("campaign_id").notNull(),
  scheduledAt: timestamp("scheduled_at", { mode: 'string' }).notNull(),
  executedAt: timestamp("executed_at", { mode: 'string' }),
  status: varchar().notNull().default('pending'), // pending, executing, completed, failed
  recipientCount: integer("recipient_count").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  errorLog: text("error_log"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.campaignId],
    foreignColumns: [notificationCampaigns.id],
    name: "notification_campaign_runs_campaign_id_fkey"
  }).onDelete("cascade"),
]);

export const insertNotificationCampaignRunSchema = createInsertSchema(notificationCampaignRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertNotificationCampaignRun = z.infer<typeof insertNotificationCampaignRunSchema>;
export type NotificationCampaignRun = typeof notificationCampaignRuns.$inferSelect;

// =============================================
// Notification Trigger Rules Schema (Automated Notifications)
// =============================================

export type TriggerType = 
  | "award_earned"           // When a player earns a badge or trophy
  | "skills_evaluation"      // When coach completes skills evaluation for player
  | "payment_due"            // Payment reminder before due date
  | "payment_overdue"        // Payment is past due
  | "payment_received"       // Payment confirmation
  | "event_created"          // New event created (to assigned users)
  | "event_updated"          // Event details changed
  | "event_cancelled"        // Event was cancelled
  | "event_reminder"         // Reminder before event starts
  | "rsvp_reminder"          // Reminder to RSVP
  | "checkin_available"      // Check-in window is now open
  | "enrollment_confirmed"   // Program enrollment confirmed
  | "team_assignment"        // Player assigned to team
  | "waiver_required"        // New waiver needs signing
  | "waiver_expiring";       // Waiver about to expire

export const notificationTriggerRules = pgTable("notification_trigger_rules", {
  id: serial().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  triggerType: varchar("trigger_type").notNull(),
  name: varchar().notNull(),
  description: text(),
  
  // Template content (can use variables like {{playerName}}, {{eventTitle}}, etc.)
  titleTemplate: varchar("title_template").notNull(),
  messageTemplate: text("message_template").notNull(),
  
  // Delivery configuration
  deliveryChannels: text("delivery_channels").array().notNull().default(sql`ARRAY['in_app', 'push']::text[]`),
  
  // Timing (for reminder-type triggers)
  triggerOffsetMinutes: integer("trigger_offset_minutes"), // e.g., 60 = 1 hour before event
  
  // Conditions (JSON for flexible filtering)
  conditions: jsonb().default({}), // e.g., { "eventTypes": ["practice", "game"] }
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertNotificationTriggerRuleSchema = createInsertSchema(notificationTriggerRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotificationTriggerRule = z.infer<typeof insertNotificationTriggerRuleSchema>;
export type NotificationTriggerRule = typeof notificationTriggerRules.$inferSelect;

// Triggered Notification Log (history of automated notifications sent)
export const triggeredNotificationLog = pgTable("triggered_notification_log", {
  id: serial().primaryKey().notNull(),
  triggerRuleId: integer("trigger_rule_id").notNull(),
  triggerType: varchar("trigger_type").notNull(),
  recipientUserId: varchar("recipient_user_id").notNull(),
  relatedEntityType: varchar("related_entity_type"), // "event", "payment", "award", etc.
  relatedEntityId: varchar("related_entity_id"),
  title: varchar().notNull(),
  message: text().notNull(),
  deliveryChannels: text("delivery_channels").array(),
  deliveryStatus: jsonb("delivery_status").default({}), // { "push": "sent", "in_app": "sent" }
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.triggerRuleId],
    foreignColumns: [notificationTriggerRules.id],
    name: "triggered_notification_log_rule_id_fkey"
  }).onDelete("cascade"),
]);

export const insertTriggeredNotificationLogSchema = createInsertSchema(triggeredNotificationLog).omit({
  id: true,
  createdAt: true,
});

export type InsertTriggeredNotificationLog = z.infer<typeof insertTriggeredNotificationLogSchema>;
export type TriggeredNotificationLog = typeof triggeredNotificationLog.$inferSelect;

// =============================================
// Bug Reports Schema
// =============================================

export const bugReports = pgTable("bug_reports", {
  id: varchar().primaryKey().notNull(),
  organizationId: varchar("organization_id").notNull(),
  userId: varchar("user_id").notNull(),
  userEmail: varchar("user_email"),
  userName: varchar("user_name"),
  title: varchar().notNull(),
  description: text().notNull(),
  userAgent: varchar("user_agent"),
  platform: varchar(),
  status: varchar().default('open').notNull(), // open, in_progress, resolved, closed
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: 'string' }),
});

export const insertBugReportSchema = createInsertSchema(bugReports).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type InsertBugReport = z.infer<typeof insertBugReportSchema>;
export type BugReport = typeof bugReports.$inferSelect;
