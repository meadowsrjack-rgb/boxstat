import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  date,
  uuid,
  real,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Primary account table - one account can have multiple profiles
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  primaryAccountType: varchar("primary_account_type", { enum: ["parent", "player", "coach"] }).notNull(),
  accountCompleted: boolean("account_completed").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Profiles table - multiple profiles per account
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().notNull(),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  profileType: varchar("profile_type", { enum: ["parent", "player", "coach"] }).notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  dateOfBirth: date("date_of_birth"),
  phoneNumber: varchar("phone_number"),
  emergencyContact: varchar("emergency_contact"),
  emergencyPhone: varchar("emergency_phone"),
  address: text("address"),
  medicalInfo: text("medical_info"),
  allergies: text("allergies"),
  teamId: integer("team_id"),
  jerseyNumber: integer("jersey_number"),
  position: varchar("position"),
  schoolGrade: varchar("school_grade"),
  parentalConsent: boolean("parental_consent").default(false),
  profileCompleted: boolean("profile_completed").default(false),
  qrCodeData: varchar("qr_code_data"), // Unique QR code for check-in
  passcode: varchar("passcode", { length: 4 }), // 4-digit PIN for profile switching
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legacy users table (for backward compatibility with Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userType: varchar("user_type", { enum: ["parent", "player", "admin", "coach"] }).notNull(),
  dateOfBirth: date("date_of_birth"),
  phoneNumber: varchar("phone_number"),
  emergencyContact: varchar("emergency_contact"),
  emergencyPhone: varchar("emergency_phone"),
  address: text("address"),
  medicalInfo: text("medical_info"),
  allergies: text("allergies"),
  teamId: integer("team_id"),
  teamName: varchar("team_name"),
  age: varchar("age"),
  height: varchar("height"),
  jerseyNumber: integer("jersey_number"),
  position: varchar("position"),
  city: varchar("city"),
  schoolGrade: varchar("school_grade"),
  parentalConsent: boolean("parental_consent").default(false),
  profileCompleted: boolean("profile_completed").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  qrCodeData: varchar("qr_code_data"), // Unique QR code for check-in
  passcode: varchar("passcode", { length: 4 }), // 4-digit PIN for profile switching
  youthClubTeam: varchar("youth_club_team"), // Club team from Notion data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Profile relationships table - links profiles within an account
export const profileRelationships = pgTable("profile_relationships", {
  id: serial("id").primaryKey(),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  parentProfileId: varchar("parent_profile_id").references(() => profiles.id),
  playerProfileId: varchar("player_profile_id").references(() => profiles.id),
  relationship: varchar("relationship", { enum: ["parent", "guardian", "sibling", "grandparent"] }).notNull().default("parent"),
  canMakePayments: boolean("can_make_payments").notNull().default(true),
  canViewReports: boolean("can_view_reports").notNull().default(true),
  emergencyContact: boolean("emergency_contact").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueRelationship: unique().on(table.parentProfileId, table.playerProfileId),
}));

// Legacy family relationships table (for backward compatibility)
export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  parentId: varchar("parent_id").notNull().references(() => users.id),
  playerId: varchar("player_id").notNull().references(() => users.id),
  relationship: varchar("relationship", { enum: ["parent", "guardian", "sibling", "grandparent"] }).notNull().default("parent"),
  canMakePayments: boolean("can_make_payments").notNull().default(true),
  canViewReports: boolean("can_view_reports").notNull().default(true),
  emergencyContact: boolean("emergency_contact").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueRelationship: unique().on(table.parentId, table.playerId),
}));

// Team messages table
export const teamMessages = pgTable("team_messages", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  messageType: varchar("message_type", { enum: ["text", "announcement", "system"] }).notNull().default("text"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  ageGroup: varchar("age_group").notNull(),
  color: varchar("color").notNull().default("#1E40AF"),
  coachId: varchar("coach_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  eventType: varchar("event_type", { enum: ["practice", "game", "tournament", "camp", "skills"] }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: varchar("location").notNull(),
  teamId: integer("team_id").references(() => teams.id),
  playerId: varchar("player_id").references(() => users.id), // Link to specific player
  opponentTeam: varchar("opponent_team"),
  isRecurring: boolean("is_recurring").default(false),
  recurringType: varchar("recurring_type", { enum: ["weekly", "daily", "monthly"] }),
  recurringEndDate: timestamp("recurring_end_date"),
  googleEventId: varchar("google_event_id").unique(), // Link to Google Calendar event
  lastSyncedAt: timestamp("last_synced_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendances = pgTable("attendances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  checkedInAt: timestamp("checked_in_at").defaultNow(),
  qrCodeData: varchar("qr_code_data"),
  type: varchar("type", { enum: ["advance", "onsite"] }).default("advance"),
  latitude: real("latitude"),
  longitude: real("longitude"),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon").notNull(),
  color: varchar("color").notNull(),
  tier: varchar("tier", { enum: ["grey", "green", "blue", "purple", "yellow"] }).notNull(),
  type: varchar("type").notNull(), // MVP, Hustle, Teammate, etc.
  criteria: jsonb("criteria").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trophies = pgTable("trophies", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon").notNull(),
  type: varchar("type", { enum: ["legacy", "team"] }).notNull(),
  criteria: jsonb("criteria").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userTrophies = pgTable("user_trophies", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trophyName: varchar("trophy_name").notNull(),
  trophyDescription: text("trophy_description"),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  badgeId: integer("badge_id").references(() => badges.id).notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  teamId: integer("team_id").references(() => teams.id), // null for league-wide announcements
  priority: varchar("priority", { enum: ["low", "medium", "high"] }).default("medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Message reactions table
export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => announcements.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  emoji: varchar("emoji").notNull(), // The emoji reaction (👍, ❤️, 😄, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserMessageReaction: unique().on(table.messageId, table.userId, table.emoji),
}));

// Task completions table
export const taskCompletions = pgTable("task_completions", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").references(() => announcements.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"), // Optional completion notes from player
}, (table) => ({
  uniqueUserTask: unique().on(table.announcementId, table.userId),
}));

// Announcement acknowledgments table
export const announcementAcknowledgments = pgTable("announcement_acknowledgments", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").references(() => announcements.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
}, (table) => ({
  uniqueUserAcknowledgment: unique().on(table.announcementId, table.userId),
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  messageType: varchar("message_type", { enum: ["text", "emoji", "system"] }).default("text"),
  isModerated: boolean("is_moderated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: real("amount").notNull(),
  currency: varchar("currency").default("usd"),
  paymentType: varchar("payment_type", { enum: ["registration", "uniform", "tournament", "training_subscription", "other"] }).notNull(),
  stripePaymentId: varchar("stripe_payment_id"),
  sportsEnginePaymentId: varchar("sports_engine_payment_id"),
  sportsEngineTransactionId: varchar("sports_engine_transaction_id"),
  status: varchar("status", { enum: ["pending", "completed", "failed", "refunded"] }).default("pending"),
  description: text("description"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Training subscriptions table
export const trainingSubscriptions = pgTable("training_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  programId: integer("program_id").notNull(),
  programTitle: varchar("program_title").notNull(),
  subscriptionType: varchar("subscription_type", { enum: ["monthly", "annual"] }).notNull(),
  status: varchar("status", { enum: ["active", "cancelled", "expired"] }).default("active"),
  sportsEngineSubscriptionId: varchar("sports_engine_subscription_id"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training progress table
export const trainingProgress = pgTable("training_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subscriptionId: integer("subscription_id").references(() => trainingSubscriptions.id).notNull(),
  moduleId: integer("module_id").notNull(),
  moduleTitle: varchar("module_title").notNull(),
  completedAt: timestamp("completed_at"),
  progress: integer("progress").default(0), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
});

export const drills = pgTable("drills", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  difficulty: varchar("difficulty", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  category: varchar("category", { enum: ["dribbling", "shooting", "defense", "passing", "conditioning"] }).notNull(),
  videoUrl: varchar("video_url"),
  instructions: text("instructions"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Player tasks table - daily completable tasks
export const playerTasks = pgTable("player_tasks", {
  id: serial("id").primaryKey(),
  playerId: varchar("player_id").references(() => users.id).notNull(),
  taskType: varchar("task_type", { 
    enum: ["practice", "game", "skills", "video", "homework", "bio_complete"] 
  }).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  assignedBy: varchar("assigned_by").references(() => users.id), // Coach who assigned
  eventId: integer("event_id").references(() => events.id), // For practice/game tasks
  videoId: varchar("video_id"), // For video completion tasks
  homeworkContent: text("homework_content"), // For homework tasks
  pointsValue: integer("points_value").default(10),
  dueDate: date("due_date"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  completionMethod: varchar("completion_method", { 
    enum: ["qr_scan", "manual", "video_watch", "auto"] 
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Player points table - tracking earned points
export const playerPoints = pgTable("player_points", {
  id: serial("id").primaryKey(),
  playerId: varchar("player_id").references(() => users.id).notNull(),
  taskId: integer("task_id").references(() => playerTasks.id),
  points: integer("points").notNull(),
  reason: varchar("reason").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  points: integer("points").default(0),
  assists: integer("assists").default(0),
  rebounds: integer("rebounds").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Player evaluations table - quarterly skill assessments
export const playerEvaluations = pgTable("player_evaluations", {
  id: serial("id").primaryKey(),
  playerId: varchar("player_id").references(() => users.id).notNull(),
  coachId: varchar("coach_id").references(() => users.id).notNull(),
  quarter: varchar("quarter", { enum: ["Q1", "Q2", "Q3", "Q4"] }).notNull(),
  year: integer("year").notNull(),
  scores: jsonb("scores").notNull(), // Stores comprehensive skill scores
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate evaluations for same player/quarter/year
  uniqueEvaluation: unique().on(table.playerId, table.quarter, table.year)
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  attendances: many(attendances),
  badges: many(userBadges),
  trophies: many(userTrophies),
  announcements: many(announcements),
  messages: many(messages),
  teamMessages: many(teamMessages),
  payments: many(payments),
  stats: many(playerStats),
  evaluationsAsPlayer: many(playerEvaluations, {
    relationName: "playerEvaluations",
  }),
  evaluationsAsCoach: many(playerEvaluations, {
    relationName: "coachEvaluations",
  }),
  trainingSubscriptions: many(trainingSubscriptions),
  trainingProgress: many(trainingProgress),
  playerTasks: many(playerTasks),
  playerPoints: many(playerPoints),
  childrenAsParent: many(familyMembers, {
    relationName: "parentRelation",
  }),
  parentsAsPlayer: many(familyMembers, {
    relationName: "playerRelation",
  }),
}));

// New relations for accounts and profiles
export const accountsRelations = relations(accounts, ({ many }) => ({
  profiles: many(profiles),
  profileRelationships: many(profileRelationships),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  account: one(accounts, { fields: [profiles.accountId], references: [accounts.id] }),
  team: one(teams, { fields: [profiles.teamId], references: [teams.id] }),
  attendances: many(attendances),
  badges: many(userBadges),
  trophies: many(userTrophies),
  announcements: many(announcements),
  messages: many(messages),
  teamMessages: many(teamMessages),
  payments: many(payments),
  stats: many(playerStats),
  trainingSubscriptions: many(trainingSubscriptions),
  trainingProgress: many(trainingProgress),
  playerTasks: many(playerTasks),
  playerPoints: many(playerPoints),
  parentRelationships: many(profileRelationships, {
    relationName: "parentProfileRelation",
  }),
  playerRelationships: many(profileRelationships, {
    relationName: "playerProfileRelation",
  }),
}));

export const profileRelationshipsRelations = relations(profileRelationships, ({ one }) => ({
  account: one(accounts, { fields: [profileRelationships.accountId], references: [accounts.id] }),
  parentProfile: one(profiles, {
    fields: [profileRelationships.parentProfileId],
    references: [profiles.id],
    relationName: "parentProfileRelation",
  }),
  playerProfile: one(profiles, {
    fields: [profileRelationships.playerProfileId],
    references: [profiles.id],
    relationName: "playerProfileRelation",
  }),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  parent: one(users, {
    fields: [familyMembers.parentId],
    references: [users.id],
    relationName: "parentRelation",
  }),
  player: one(users, {
    fields: [familyMembers.playerId],
    references: [users.id],
    relationName: "playerRelation",
  }),
}));

export const teamMessagesRelations = relations(teamMessages, ({ one }) => ({
  sender: one(users, { fields: [teamMessages.senderId], references: [users.id] }),
  team: one(teams, { fields: [teamMessages.teamId], references: [teams.id] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  coach: one(users, { fields: [teams.coachId], references: [users.id] }),
  players: many(users),
  events: many(events),
  announcements: many(announcements),
  messages: many(messages),
  teamMessages: many(teamMessages),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  team: one(teams, { fields: [events.teamId], references: [teams.id] }),
  attendances: many(attendances),
  stats: many(playerStats),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
  user: one(users, { fields: [attendances.userId], references: [users.id] }),
  event: one(events, { fields: [attendances.eventId], references: [events.id] }),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  users: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, { fields: [userBadges.userId], references: [users.id] }),
  badge: one(badges, { fields: [userBadges.badgeId], references: [badges.id] }),
}));

export const trophiesRelations = relations(trophies, ({ many }) => ({
  users: many(userTrophies),
}));

export const userTrophiesRelations = relations(userTrophies, ({ one }) => ({
  user: one(users, { fields: [userTrophies.userId], references: [users.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, { fields: [announcements.authorId], references: [users.id] }),
  team: one(teams, { fields: [announcements.teamId], references: [teams.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  team: one(teams, { fields: [messages.teamId], references: [teams.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export const playerStatsRelations = relations(playerStats, ({ one }) => ({
  user: one(users, { fields: [playerStats.userId], references: [users.id] }),
  event: one(events, { fields: [playerStats.eventId], references: [events.id] }),
}));

export const trainingSubscriptionsRelations = relations(trainingSubscriptions, ({ one, many }) => ({
  user: one(users, { fields: [trainingSubscriptions.userId], references: [users.id] }),
  progress: many(trainingProgress),
}));

export const trainingProgressRelations = relations(trainingProgress, ({ one }) => ({
  user: one(users, { fields: [trainingProgress.userId], references: [users.id] }),
  subscription: one(trainingSubscriptions, { fields: [trainingProgress.subscriptionId], references: [trainingSubscriptions.id] }),
}));

export const playerTasksRelations = relations(playerTasks, ({ one }) => ({
  player: one(users, { fields: [playerTasks.playerId], references: [users.id] }),
  assignedByUser: one(users, { fields: [playerTasks.assignedBy], references: [users.id] }),
  event: one(events, { fields: [playerTasks.eventId], references: [events.id] }),
}));

export const playerPointsRelations = relations(playerPoints, ({ one }) => ({
  player: one(users, { fields: [playerPoints.playerId], references: [users.id] }),
  task: one(playerTasks, { fields: [playerPoints.taskId], references: [playerTasks.id] }),
}));

export const playerEvaluationsRelations = relations(playerEvaluations, ({ one }) => ({
  player: one(users, {
    fields: [playerEvaluations.playerId],
    references: [users.id],
    relationName: "playerEvaluations",
  }),
  coach: one(users, {
    fields: [playerEvaluations.coachId],
    references: [users.id],
    relationName: "coachEvaluations",
  }),
}));

// Insert schemas for new tables
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProfileRelationshipSchema = createInsertSchema(profileRelationships).omit({ id: true, createdAt: true });

// Legacy insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertAttendanceSchema = createInsertSchema(attendances).omit({ id: true, checkedInAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, createdAt: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export const insertMessageReactionSchema = createInsertSchema(messageReactions).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, paidAt: true });
export const insertDrillSchema = createInsertSchema(drills).omit({ id: true, createdAt: true });
export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({ id: true, createdAt: true });
export const insertTrainingSubscriptionSchema = createInsertSchema(trainingSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainingProgressSchema = createInsertSchema(trainingProgress).omit({ id: true, createdAt: true });
export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({ id: true, createdAt: true });
export const insertTaskCompletionSchema = createInsertSchema(taskCompletions).omit({ id: true, completedAt: true });
export const insertAnnouncementAcknowledgmentSchema = createInsertSchema(announcementAcknowledgments).omit({ id: true, acknowledgedAt: true });
export const insertTeamMessageSchema = createInsertSchema(teamMessages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlayerTaskSchema = createInsertSchema(playerTasks).omit({ id: true, createdAt: true, completedAt: true });
export const insertPlayerPointsSchema = createInsertSchema(playerPoints).omit({ id: true, earnedAt: true });
export const insertPlayerEvaluationSchema = createInsertSchema(playerEvaluations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrophySchema = createInsertSchema(trophies).omit({ id: true, createdAt: true });
export const insertUserTrophySchema = createInsertSchema(userTrophies).omit({ id: true, earnedAt: true });

// New types
export type Account = typeof accounts.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type ProfileRelationship = typeof profileRelationships.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertProfileRelationship = z.infer<typeof insertProfileRelationshipSchema>;

// Legacy types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type Trophy = typeof trophies.$inferSelect;
export type UserTrophy = typeof userTrophies.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Drill = typeof drills.$inferSelect;
export type PlayerStats = typeof playerStats.$inferSelect;
export type TrainingSubscription = typeof trainingSubscriptions.$inferSelect;
export type TrainingProgress = typeof trainingProgress.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type AnnouncementAcknowledgment = typeof announcementAcknowledgments.$inferSelect;
export type TeamMessage = typeof teamMessages.$inferSelect;
export type PlayerTask = typeof playerTasks.$inferSelect;
export type PlayerPoints = typeof playerPoints.$inferSelect;
export type PlayerEvaluation = typeof playerEvaluations.$inferSelect;

// CheckIn is an alias for Attendance for checkin functionality
export type CheckIn = typeof attendances.$inferSelect;
export type InsertCheckIn = z.infer<typeof insertAttendanceSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertDrill = z.infer<typeof insertDrillSchema>;
export type InsertPlayerStats = z.infer<typeof insertPlayerStatsSchema>;
export type InsertTrainingSubscription = z.infer<typeof insertTrainingSubscriptionSchema>;
export type InsertTrainingProgress = z.infer<typeof insertTrainingProgressSchema>;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type InsertTaskCompletion = z.infer<typeof insertTaskCompletionSchema>;
export type InsertAnnouncementAcknowledgment = z.infer<typeof insertAnnouncementAcknowledgmentSchema>;
export type InsertTeamMessage = z.infer<typeof insertTeamMessageSchema>;
export type InsertPlayerTask = z.infer<typeof insertPlayerTaskSchema>;
export type InsertPlayerPoints = z.infer<typeof insertPlayerPointsSchema>;
export type InsertPlayerEvaluation = z.infer<typeof insertPlayerEvaluationSchema>;
export type InsertTrophy = z.infer<typeof insertTrophySchema>;
export type InsertUserTrophy = z.infer<typeof insertUserTrophySchema>;

// Notion-based types
export type NotionPlayer = {
  id: string;                // notion page id
  name: string;              // Name
  status: "Active" | "Inactive" | string; // Status
  currentProgram?: string;   // Current Program
  team?: string;             // Youth Club Team (display name)
  teamSlug?: string;         // slugify(team)
  hsTeam?: string;           // HS Team
  grade?: string | number;   // Grade
  sessionTags: string[];     // Session[]
  social?: string;           // Social Media (first URL/text found)
  profileUrl: string;        // /players/:id
};

export type NotionCoach = {
  name: string;
  email?: string;
  phone?: string;
  profileUrl: string;        // /coaches/:slug
};

export type NotionTeam = {
  name: string;              // Youth Club Team display (e.g., "11u Black")
  slug: string;              // slugify(name)
  program: "Youth Club";     // fixed for now
  coach?: NotionCoach;       // from local mapping
  roster: NotionPlayer[];    // all players with teamSlug == this.slug
  profileUrl: string;        // /teams/:slug
};
