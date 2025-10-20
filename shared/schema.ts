import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

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
  
  // Specific fields based on role
  teamId?: string;
  jerseyNumber?: number;
  position?: string;
  program?: string; // Configurable, set by organization
  
  // Performance metrics
  rating?: number;
  awardsCount?: number;
  
  // Security
  passcode?: string; // 4-digit PIN for quick switching
  
  // Status
  isActive: boolean;
  verified: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

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
  teamId: z.string().optional(),
  jerseyNumber: z.number().optional(),
  position: z.string().optional(),
  program: z.string().optional(),
  rating: z.number().optional(),
  awardsCount: z.number().optional(),
  passcode: z.string().length(4).optional(),
  isActive: z.boolean().default(true),
  verified: z.boolean().default(false),
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
  ageGroups: string[]; // e.g., ["8-10", "11-13", "14-17"]
  isActive: boolean;
  createdAt: Date;
}

export const insertProgramSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  ageGroups: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export type InsertProgram = z.infer<typeof insertProgramSchema>;
