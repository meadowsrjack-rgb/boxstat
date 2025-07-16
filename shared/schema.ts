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
  real
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

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userType: varchar("user_type", { enum: ["parent", "player", "admin"] }).notNull().default("parent"),
  parentId: varchar("parent_id"), // For linking player to parent - self-reference
  teamId: integer("team_id"),
  sportsEngineCustomerId: varchar("sports_engine_customer_id"),
  sportsEngineSubscriptionId: varchar("sports_engine_subscription_id"),
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
  eventType: varchar("event_type", { enum: ["practice", "game", "tournament"] }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: varchar("location").notNull(),
  teamId: integer("team_id").references(() => teams.id),
  opponentTeam: varchar("opponent_team"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendances = pgTable("attendances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  checkedInAt: timestamp("checked_in_at").defaultNow(),
  qrCodeData: varchar("qr_code_data").notNull(),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon").notNull(),
  color: varchar("color").notNull(),
  criteria: jsonb("criteria").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
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
  sportsEnginePaymentId: varchar("sports_engine_payment_id"),
  sportsEngineTransactionId: varchar("sports_engine_transaction_id"),
  status: varchar("status", { enum: ["pending", "completed", "failed", "refunded"] }).default("pending"),
  description: text("description"),
  metadata: jsonb("metadata"), // Store additional data like programId, subscriptionType
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

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  parent: one(users, { fields: [users.parentId], references: [users.id] }),
  children: many(users),
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  attendances: many(attendances),
  badges: many(userBadges),
  announcements: many(announcements),
  messages: many(messages),
  payments: many(payments),
  stats: many(playerStats),
  trainingSubscriptions: many(trainingSubscriptions),
  trainingProgress: many(trainingProgress),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  coach: one(users, { fields: [teams.coachId], references: [users.id] }),
  players: many(users),
  events: many(events),
  announcements: many(announcements),
  messages: many(messages),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertAttendanceSchema = createInsertSchema(attendances).omit({ id: true, checkedInAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, createdAt: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, paidAt: true });
export const insertDrillSchema = createInsertSchema(drills).omit({ id: true, createdAt: true });
export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({ id: true, createdAt: true });
export const insertTrainingSubscriptionSchema = createInsertSchema(trainingSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainingProgressSchema = createInsertSchema(trainingProgress).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Drill = typeof drills.$inferSelect;
export type PlayerStats = typeof playerStats.$inferSelect;
export type TrainingSubscription = typeof trainingSubscriptions.$inferSelect;
export type TrainingProgress = typeof trainingProgress.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertDrill = z.infer<typeof insertDrillSchema>;
export type InsertPlayerStats = z.infer<typeof insertPlayerStatsSchema>;
export type InsertTrainingSubscription = z.infer<typeof insertTrainingSubscriptionSchema>;
export type InsertTrainingProgress = z.infer<typeof insertTrainingProgressSchema>;
