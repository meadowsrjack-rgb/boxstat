import {
  users,
  teams,
  events,
  attendances,
  badges,
  userBadges,
  announcements,
  messages,
  payments,
  drills,
  playerStats,
  familyMembers,
  type User,
  type UpsertUser,
  type Team,
  type Event,
  type Attendance,
  type Badge,
  type UserBadge,
  type Announcement,
  type Message,
  type Payment,
  type Drill,
  type PlayerStats,
  type FamilyMember,
  type InsertUser,
  type InsertTeam,
  type InsertEvent,
  type InsertAttendance,
  type InsertBadge,
  type InsertAnnouncement,
  type InsertMessage,
  type InsertPayment,
  type InsertDrill,
  type InsertPlayerStats,
  type InsertFamilyMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql, or, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: Partial<User>): Promise<User>;
  updateUserSportsEngineInfo(userId: string, sportsEngineCustomerId: string, sportsEngineSubscriptionId: string): Promise<User>;
  
  // Family operations
  getFamilyMembers(parentId: string): Promise<FamilyMember[]>;
  addFamilyMember(data: InsertFamilyMember): Promise<FamilyMember>;
  removeFamilyMember(id: number): Promise<void>;
  updateFamilyMemberPermissions(id: number, permissions: Partial<FamilyMember>): Promise<FamilyMember>;
  
  // Team operations
  getAllTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamsByCoach(coachId: string): Promise<Team[]>;
  getUserTeam(userId: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  getTeamPlayers(teamId: number): Promise<User[]>;
  
  // Event operations
  getEvent(id: number): Promise<Event | undefined>;
  getTeamEvents(teamId: number): Promise<Event[]>;
  getUserEvents(userId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  
  // Attendance operations
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getUserAttendances(userId: string): Promise<Attendance[]>;
  getEventAttendances(eventId: number): Promise<Attendance[]>;
  
  // Badge operations
  getAllBadges(): Promise<Badge[]>;
  getUserBadges(userId: string): Promise<UserBadge[]>;
  awardBadge(userId: string, badgeId: number): Promise<UserBadge>;
  
  // Announcement operations
  getAllAnnouncements(): Promise<Announcement[]>;
  getTeamAnnouncements(teamId: number): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Message operations
  getTeamMessages(teamId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Payment operations
  getUserPayments(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(paymentId: number, status: string, paidAt?: Date): Promise<Payment>;
  
  // Stats operations
  getPlayerStats(userId: string): Promise<PlayerStats[]>;
  createPlayerStats(stats: InsertPlayerStats): Promise<PlayerStats>;
  
  // Drill operations
  getAllDrills(): Promise<Drill[]>;
  getDrillsByCategory(category: string): Promise<Drill[]>;
  createDrill(drill: InsertDrill): Promise<Drill>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserSportsEngineInfo(userId: string, sportsEngineCustomerId: string, sportsEngineSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        sportsEngineCustomerId, 
        sportsEngineSubscriptionId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Family operations
  async getFamilyMembers(parentId: string): Promise<FamilyMember[]> {
    return await db
      .select({
        id: familyMembers.id,
        parentId: familyMembers.parentId,
        playerId: familyMembers.playerId,
        relationship: familyMembers.relationship,
        canMakePayments: familyMembers.canMakePayments,
        canViewReports: familyMembers.canViewReports,
        emergencyContact: familyMembers.emergencyContact,
        createdAt: familyMembers.createdAt,
        player: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          userType: users.userType,
          teamId: users.teamId,
          jerseyNumber: users.jerseyNumber,
          position: users.position,
        }
      })
      .from(familyMembers)
      .leftJoin(users, eq(familyMembers.playerId, users.id))
      .where(eq(familyMembers.parentId, parentId))
      .orderBy(asc(users.firstName));
  }

  async addFamilyMember(data: InsertFamilyMember): Promise<FamilyMember> {
    const [member] = await db.insert(familyMembers).values(data).returning();
    return member;
  }

  async removeFamilyMember(id: number): Promise<void> {
    await db.delete(familyMembers).where(eq(familyMembers.id, id));
  }

  async updateFamilyMemberPermissions(id: number, permissions: Partial<FamilyMember>): Promise<FamilyMember> {
    const [member] = await db
      .update(familyMembers)
      .set(permissions)
      .where(eq(familyMembers.id, id))
      .returning();
    return member;
  }

  // Team operations
  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(asc(teams.ageGroup), asc(teams.name));
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamsByCoach(coachId: string): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.coachId, coachId));
  }

  async getUserTeam(userId: string): Promise<Team | undefined> {
    const user = await this.getUser(userId);
    if (!user?.teamId) return undefined;
    return await this.getTeam(user.teamId);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async getTeamPlayers(teamId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.teamId, teamId));
  }

  // Event operations
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getTeamEvents(teamId: number): Promise<Event[]> {
    const now = new Date();
    return await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.teamId, teamId),
          gte(events.startTime, now)
        )
      )
      .orderBy(asc(events.startTime));
  }

  async getUserEvents(userId: string): Promise<Event[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    const now = new Date();
    
    // Get team events and user-specific events
    const userEvents = await db
      .select()
      .from(events)
      .where(
        and(
          or(
            eq(events.teamId, user.teamId || 0),
            eq(events.playerId, userId)
          ),
          gte(events.startTime, now)
        )
      )
      .orderBy(asc(events.startTime));

    return userEvents;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set(event)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  // Attendance operations
  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db.insert(attendances).values(attendance).returning();
    return newAttendance;
  }

  async getUserAttendances(userId: string): Promise<Attendance[]> {
    return await db.select().from(attendances).where(eq(attendances.userId, userId));
  }

  async getEventAttendances(eventId: number): Promise<Attendance[]> {
    return await db.select().from(attendances).where(eq(attendances.eventId, eventId));
  }

  // Badge operations
  async getAllBadges(): Promise<Badge[]> {
    return await db.select().from(badges).where(eq(badges.isActive, true));
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return await db.select().from(userBadges).where(eq(userBadges.userId, userId));
  }

  async awardBadge(userId: string, badgeId: number): Promise<UserBadge> {
    const [userBadge] = await db.insert(userBadges).values({ userId, badgeId }).returning();
    return userBadge;
  }

  // Announcement operations
  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt));
  }

  async getTeamAnnouncements(teamId: number): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          or(
            eq(announcements.teamId, teamId),
            isNull(announcements.teamId)
          )
        )
      )
      .orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  // Message operations
  async getTeamMessages(teamId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.teamId, teamId))
      .orderBy(desc(messages.createdAt))
      .limit(100);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  // Payment operations
  async getUserPayments(userId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePaymentStatus(paymentId: number, status: string, paidAt?: Date): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({ status, paidAt })
      .where(eq(payments.id, paymentId))
      .returning();
    return payment;
  }

  // Stats operations
  async getPlayerStats(userId: string): Promise<PlayerStats[]> {
    return await db.select().from(playerStats).where(eq(playerStats.userId, userId));
  }

  async createPlayerStats(stats: InsertPlayerStats): Promise<PlayerStats> {
    const [newStats] = await db.insert(playerStats).values(stats).returning();
    return newStats;
  }

  // Drill operations
  async getAllDrills(): Promise<Drill[]> {
    return await db.select().from(drills).where(eq(drills.isActive, true));
  }

  async getDrillsByCategory(category: string): Promise<Drill[]> {
    return await db
      .select()
      .from(drills)
      .where(and(eq(drills.category, category), eq(drills.isActive, true)));
  }

  async createDrill(drill: InsertDrill): Promise<Drill> {
    const [newDrill] = await db.insert(drills).values(drill).returning();
    return newDrill;
  }
}

export const storage = new DatabaseStorage();