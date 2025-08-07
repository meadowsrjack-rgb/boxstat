import {
  // New tables
  accounts,
  profiles,
  profileRelationships,
  // Legacy tables
  users,
  teams,
  events,
  attendances,
  badges,
  userBadges,
  trophies,
  userTrophies,
  announcements,
  messageReactions,
  messages,
  teamMessages,
  payments,
  drills,
  playerStats,
  familyMembers,
  taskCompletions,
  announcementAcknowledgments,
  playerTasks,
  playerPoints,
  // New types
  type Account,
  type Profile,
  type ProfileRelationship,
  type InsertAccount,
  type InsertProfile,
  type InsertProfileRelationship,
  // Legacy types
  type User,
  type UpsertUser,
  type Team,
  type Event,
  type Attendance,
  type Badge,
  type UserBadge,
  type Trophy,
  type UserTrophy,
  type Announcement,
  type MessageReaction,
  type Message,
  type TeamMessage,
  type Payment,
  type Drill,
  type PlayerStats,
  type FamilyMember,
  type TaskCompletion,
  type AnnouncementAcknowledgment,
  type PlayerTask,
  type PlayerPoints,
  // New insert schemas
  insertAccountSchema,
  insertProfileSchema,
  insertProfileRelationshipSchema,
  // Legacy insert schemas
  insertUserSchema,
  insertTeamSchema,
  insertEventSchema,
  insertAttendanceSchema,
  insertBadgeSchema,
  insertTrophySchema,
  insertUserTrophySchema,
  insertAnnouncementSchema,
  insertMessageReactionSchema,
  insertMessageSchema,
  insertTeamMessageSchema,
  insertPaymentSchema,
  insertDrillSchema,
  insertPlayerStatsSchema,
  insertFamilyMemberSchema,
  insertTaskCompletionSchema,
  insertAnnouncementAcknowledgmentSchema,
  insertPlayerTaskSchema,
  insertPlayerPointsSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql, or, isNull } from "drizzle-orm";
import { z } from "zod";

export interface IStorage {
  // Account operations (new unified system)
  getAccount(id: string): Promise<Account | undefined>;
  upsertAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, data: Partial<Account>): Promise<Account>;
  
  // Profile operations (new unified system)
  getProfile(id: string): Promise<Profile | undefined>;
  getAccountProfiles(accountId: string): Promise<Profile[]>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, data: Partial<Profile>): Promise<Profile>;
  deleteProfile(id: string): Promise<void>;
  selectProfile(accountId: string, profileId: string): Promise<Profile>;
  
  // Profile relationship operations
  getProfileRelationships(accountId: string): Promise<ProfileRelationship[]>;
  createProfileRelationship(relationship: InsertProfileRelationship): Promise<ProfileRelationship>;
  
  // User operations (legacy - required for Replit Auth compatibility)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: Partial<User>): Promise<User>;
  updateUserSportsEngineInfo(userId: string, sportsEngineCustomerId: string, sportsEngineSubscriptionId: string): Promise<User>;
  
  // Family operations (legacy)
  getFamilyMembers(parentId: string): Promise<FamilyMember[]>;
  getChildProfiles(parentId: string): Promise<any[]>;
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

  // Announcement operations
  getAnnouncements(teamId?: number): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Badge operations
  getAllBadges(): Promise<Badge[]>;
  getUserBadges(userId: string): Promise<UserBadge[]>;
  awardBadge(userId: string, badgeId: number): Promise<UserBadge>;
  
  // Trophy operations
  getAllTrophies(): Promise<Trophy[]>;
  getUserTrophies(userId: string): Promise<UserTrophy[]>;
  awardTrophy(userId: string, trophyId: number): Promise<UserTrophy>;
  
  // Announcement operations
  getAllAnnouncements(): Promise<Announcement[]>;
  getTeamAnnouncements(teamId: number): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Message operations
  getTeamMessages(teamId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Team messaging operations
  getTeamMessagesNew(teamId: number): Promise<TeamMessage[]>;
  createTeamMessage(message: InsertTeamMessage): Promise<TeamMessage>;
  
  // Task completion operations
  getTaskCompletion(announcementId: number, userId: string): Promise<TaskCompletion | undefined>;
  completeTask(data: InsertTaskCompletion): Promise<TaskCompletion>;
  
  // Announcement acknowledgment operations
  getAnnouncementAcknowledgment(announcementId: number, userId: string): Promise<AnnouncementAcknowledgment | undefined>;
  acknowledgeAnnouncement(data: InsertAnnouncementAcknowledgment): Promise<AnnouncementAcknowledgment>;
  
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
  createDrill(drill: z.infer<typeof insertDrillSchema>): Promise<Drill>;
  
  // Player task operations
  getPlayerTasks(playerId: string, date?: string): Promise<PlayerTask[]>;
  createPlayerTask(task: z.infer<typeof insertPlayerTaskSchema>): Promise<PlayerTask>;
  completePlayerTask(taskId: number, completionMethod: string): Promise<PlayerTask>;
  
  // Player points operations
  getPlayerPoints(playerId: string): Promise<PlayerPoints[]>;
  addPlayerPoints(points: z.infer<typeof insertPlayerPointsSchema>): Promise<PlayerPoints>;
  getPlayerTotalPoints(playerId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Account operations (new unified system)
  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async upsertAccount(account: InsertAccount): Promise<Account> {
    const [result] = await db.insert(accounts).values(account).onConflictDoUpdate({
      target: accounts.id,
      set: {
        email: account.email,
        primaryAccountType: account.primaryAccountType,
        accountCompleted: account.accountCompleted,
        stripeCustomerId: account.stripeCustomerId,
        sportsEngineCustomerId: account.sportsEngineCustomerId,
        updatedAt: new Date(),
      }
    }).returning();
    return result;
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<Account> {
    const [result] = await db.update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return result;
  }

  // Profile operations (new unified system)
  async getProfile(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async getAccountProfiles(accountId: string): Promise<Profile[]> {
    return await db.select().from(profiles)
      .where(and(eq(profiles.accountId, accountId), eq(profiles.isActive, true)))
      .orderBy(asc(profiles.createdAt));
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [result] = await db.insert(profiles).values({
      ...profile,
      qrCodeData: `UYP-${profile.id}-${Date.now()}` // Generate QR code data
    }).returning();
    return result;
  }

  async updateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
    const [result] = await db.update(profiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    return result;
  }

  async deleteProfile(id: string): Promise<void> {
    await db.update(profiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(profiles.id, id));
  }

  async selectProfile(accountId: string, profileId: string): Promise<Profile> {
    const profile = await this.getProfile(profileId);
    if (!profile || profile.accountId !== accountId) {
      throw new Error("Profile not found or access denied");
    }
    return profile;
  }

  // Profile relationship operations
  async getProfileRelationships(accountId: string): Promise<ProfileRelationship[]> {
    return await db.select().from(profileRelationships)
      .where(eq(profileRelationships.accountId, accountId));
  }

  async createProfileRelationship(relationship: InsertProfileRelationship): Promise<ProfileRelationship> {
    const [result] = await db.insert(profileRelationships).values(relationship).returning();
    return result;
  }
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

  async getChildProfiles(parentId: string): Promise<any[]> {
    const members = await this.getFamilyMembers(parentId);
    return members.map(member => ({
      id: member.playerId,
      firstName: member.player?.firstName,
      lastName: member.player?.lastName,
      relationship: member.relationship,
      teamId: member.player?.teamId,
      jerseyNumber: member.player?.jerseyNumber,
      position: member.player?.position,
      qrCodeData: `UYP-${member.playerId}-${Date.now()}`
    }));
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
    // For testing, return mock teams for our test admin
    if (coachId === 'test-admin-001') {
      return [
        {
          id: 1,
          name: 'U10 Warriors',
          ageGroup: 'Under 10',
          coachId: 'test-admin-001',
          season: '2025 Spring',
          maxPlayers: 12,
          isActive: true,
          createdAt: new Date(),
          description: 'Competitive team for ages 8-10'
        },
        {
          id: 2,
          name: 'U12 Lightning',
          ageGroup: 'Under 12',
          coachId: 'test-admin-001',
          season: '2025 Spring',
          maxPlayers: 12,
          isActive: true,
          createdAt: new Date(),
          description: 'Advanced team for ages 10-12'
        },
        {
          id: 3,
          name: 'U14 Thunder',
          ageGroup: 'Under 14',
          coachId: 'test-admin-001',
          season: '2025 Spring',
          maxPlayers: 12,
          isActive: true,
          createdAt: new Date(),
          description: 'Elite team for ages 12-14'
        }
      ];
    }
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
    // Mock data for test teams
    if (teamId === 1) { // U10 Warriors
      return [
        {
          id: 'player1',
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Johnson',
          userType: 'player',
          teamId: 1,
          jerseyNumber: 7,
          position: 'Guard',
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          sportsEngineCustomerId: null,
          sportsEngineSubscriptionId: null
        },
        {
          id: 'player2',
          email: 'bob@example.com',
          firstName: 'Bob',
          lastName: 'Smith',
          userType: 'player',
          teamId: 1,
          jerseyNumber: 12,
          position: 'Forward',
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          sportsEngineCustomerId: null,
          sportsEngineSubscriptionId: null
        }
      ];
    }
    if (teamId === 2) { // U12 Lightning
      return [
        {
          id: 'player3',
          email: 'charlie@example.com',
          firstName: 'Charlie',
          lastName: 'Brown',
          userType: 'player',
          teamId: 2,
          jerseyNumber: 23,
          position: 'Center',
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          sportsEngineCustomerId: null,
          sportsEngineSubscriptionId: null
        }
      ];
    }
    return await db.select().from(users).where(eq(users.teamId, teamId));
  }

  // Event operations
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getTeamEvents(teamId: number): Promise<Event[]> {
    // Mock events for test teams
    if (teamId === 1) { // U10 Warriors
      return [
        {
          id: 1,
          title: 'Practice Session',
          description: 'Weekly team practice focusing on fundamentals',
          eventType: 'practice',
          startTime: new Date('2025-07-24T17:00:00'),
          endTime: new Date('2025-07-24T18:30:00'),
          location: 'UYP Main Court',
          teamId: 1,
          playerId: null,
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 2,
          title: 'Scrimmage Game',
          description: 'Practice game against U10 Eagles',
          eventType: 'game',
          startTime: new Date('2025-07-26T10:00:00'),
          endTime: new Date('2025-07-26T11:30:00'),
          location: 'UYP Court 2',
          teamId: 1,
          playerId: null,
          isActive: true,
          createdAt: new Date()
        }
      ];
    }
    if (teamId === 2) { // U12 Lightning
      return [
        {
          id: 3,
          title: 'Team Practice',
          description: 'Advanced skills training',
          eventType: 'practice',
          startTime: new Date('2025-07-25T18:00:00'),
          endTime: new Date('2025-07-25T19:30:00'),
          location: 'UYP Main Court',
          teamId: 2,
          playerId: null,
          isActive: true,
          createdAt: new Date()
        }
      ];
    }
    if (teamId === 3) { // U14 Thunder
      return [
        {
          id: 4,
          title: 'Championship Practice',
          description: 'Intensive training for upcoming tournament',
          eventType: 'practice',
          startTime: new Date('2025-07-27T16:00:00'),
          endTime: new Date('2025-07-27T18:00:00'),
          location: 'UYP Main Court',
          teamId: 3,
          playerId: null,
          isActive: true,
          createdAt: new Date()
        }
      ];
    }
    
    const now = new Date();
    return await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.teamId, teamId),
          gte(events.startTime, now),
          eq(events.isActive, true)
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

  async getEventByGoogleId(googleEventId: string): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.googleEventId, googleEventId));
    return event;
  }

  async getEventsInDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(
        and(
          gte(events.startTime, startDate),
          lte(events.startTime, endDate),
          eq(events.isActive, true)
        )
      )
      .orderBy(asc(events.startTime));
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

  // Trophy operations
  async getAllTrophies(): Promise<Trophy[]> {
    return await db.select().from(trophies).where(eq(trophies.isActive, true));
  }

  async getUserTrophies(userId: string): Promise<UserTrophy[]> {
    return await db.select().from(userTrophies).where(eq(userTrophies.userId, userId));
  }

  async awardTrophy(userId: string, trophyId: number): Promise<UserTrophy> {
    const [userTrophy] = await db.insert(userTrophies).values({ userId, trophyId }).returning();
    return userTrophy;
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
      .set({ 
        status: status as "pending" | "completed" | "failed" | "refunded", 
        paidAt 
      })
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
      .where(and(sql`${drills.category} = ${category}`, eq(drills.isActive, true)));
  }

  async createDrill(drill: InsertDrill): Promise<Drill> {
    const [newDrill] = await db.insert(drills).values(drill).returning();
    return newDrill;
  }

  // Announcement operations
  async getAnnouncements(teamId?: number): Promise<Announcement[]> {
    if (teamId) {
      return await db
        .select()
        .from(announcements)
        .where(and(eq(announcements.isActive, true), eq(announcements.teamId, teamId)))
        .orderBy(desc(announcements.createdAt));
    }
    
    return await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt));
  }

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
      .where(and(eq(announcements.isActive, true), eq(announcements.teamId, teamId)))
      .orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  // Message reaction operations
  async getMessageReactions(messageId: number): Promise<MessageReaction[]> {
    return await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId))
      .orderBy(desc(messageReactions.createdAt));
  }

  async addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction> {
    const [newReaction] = await db.insert(messageReactions).values(reaction).returning();
    return newReaction;
  }

  async removeMessageReaction(messageId: number, userId: string, emoji: string): Promise<boolean> {
    const result = await db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      );
    return result.rowCount > 0;
  }

  // Task completion operations
  async getTaskCompletion(announcementId: number, userId: string): Promise<TaskCompletion | undefined> {
    const [completion] = await db
      .select()
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.announcementId, announcementId),
          eq(taskCompletions.userId, userId)
        )
      );
    return completion;
  }

  async completeTask(data: InsertTaskCompletion): Promise<TaskCompletion> {
    const [completion] = await db
      .insert(taskCompletions)
      .values(data)
      .onConflictDoUpdate({
        target: [taskCompletions.announcementId, taskCompletions.userId],
        set: {
          notes: data.notes,
          completedAt: new Date(),
        },
      })
      .returning();
    return completion;
  }

  // Announcement acknowledgment operations
  async getAnnouncementAcknowledgment(announcementId: number, userId: string): Promise<AnnouncementAcknowledgment | undefined> {
    const [acknowledgment] = await db
      .select()
      .from(announcementAcknowledgments)
      .where(
        and(
          eq(announcementAcknowledgments.announcementId, announcementId),
          eq(announcementAcknowledgments.userId, userId)
        )
      );
    return acknowledgment;
  }

  async acknowledgeAnnouncement(data: InsertAnnouncementAcknowledgment): Promise<AnnouncementAcknowledgment> {
    const [acknowledgment] = await db
      .insert(announcementAcknowledgments)
      .values(data)
      .onConflictDoUpdate({
        target: [announcementAcknowledgments.announcementId, announcementAcknowledgments.userId],
        set: {
          acknowledgedAt: new Date(),
        },
      })
      .returning();
    return acknowledgment;
  }

  // Team messaging operations
  async getTeamMessagesNew(teamId: number): Promise<TeamMessage[]> {
    const result = await db
      .select({
        id: teamMessages.id,
        teamId: teamMessages.teamId,
        senderId: teamMessages.senderId,
        message: teamMessages.message,
        messageType: teamMessages.messageType,
        createdAt: teamMessages.createdAt,
        updatedAt: teamMessages.updatedAt,
        sender: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          userType: users.userType,
        },
      })
      .from(teamMessages)
      .leftJoin(users, eq(teamMessages.senderId, users.id))
      .where(eq(teamMessages.teamId, teamId))
      .orderBy(asc(teamMessages.createdAt));
    
    return result.map(row => ({
      ...row,
      sender: row.sender || { id: '', firstName: 'Unknown', lastName: 'User', profileImageUrl: null, userType: 'player' }
    }));
  }

  async createTeamMessage(message: InsertTeamMessage): Promise<TeamMessage> {
    const [newMessage] = await db.insert(teamMessages).values(message).returning();
    
    // Get message with sender info
    const [messageWithSender] = await db
      .select({
        id: teamMessages.id,
        teamId: teamMessages.teamId,
        senderId: teamMessages.senderId,
        message: teamMessages.message,
        messageType: teamMessages.messageType,
        createdAt: teamMessages.createdAt,
        updatedAt: teamMessages.updatedAt,
        sender: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          userType: users.userType,
        },
      })
      .from(teamMessages)
      .leftJoin(users, eq(teamMessages.senderId, users.id))
      .where(eq(teamMessages.id, newMessage.id));
    
    return {
      ...messageWithSender,
      sender: messageWithSender.sender || { id: '', firstName: 'Unknown', lastName: 'User', profileImageUrl: null, userType: 'player' }
    };
  }

  // Player task operations
  async getPlayerTasks(playerId: string, date?: string): Promise<PlayerTask[]> {
    let query = db.select().from(playerTasks).where(eq(playerTasks.playerId, playerId));
    
    if (date) {
      query = query.where(eq(playerTasks.dueDate, date));
    }
    
    return await query.orderBy(desc(playerTasks.createdAt));
  }

  async createPlayerTask(task: z.infer<typeof insertPlayerTaskSchema>): Promise<PlayerTask> {
    const [newTask] = await db.insert(playerTasks).values(task).returning();
    return newTask;
  }

  async completePlayerTask(taskId: number, completionMethod: string): Promise<PlayerTask> {
    const [updatedTask] = await db
      .update(playerTasks)
      .set({ 
        isCompleted: true, 
        completedAt: new Date(),
        completionMethod: completionMethod as any
      })
      .where(eq(playerTasks.id, taskId))
      .returning();
    return updatedTask;
  }

  // Player points operations
  async getPlayerPoints(playerId: string): Promise<PlayerPoints[]> {
    return await db
      .select()
      .from(playerPoints)
      .where(eq(playerPoints.playerId, playerId))
      .orderBy(desc(playerPoints.earnedAt));
  }

  async addPlayerPoints(points: z.infer<typeof insertPlayerPointsSchema>): Promise<PlayerPoints> {
    const [newPoints] = await db.insert(playerPoints).values(points).returning();
    return newPoints;
  }

  async getPlayerTotalPoints(playerId: string): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${playerPoints.points})` })
      .from(playerPoints)
      .where(eq(playerPoints.playerId, playerId));
    
    return result[0]?.total || 0;
  }
}

export const storage = new DatabaseStorage();