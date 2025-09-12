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
  purchases,
  drills,
  playerStats,
  familyMembers,
  taskCompletions,
  announcementAcknowledgments,
  playerTasks,
  playerPoints,
  playerEvaluations,
  players,
  // New types
  type Account,
  type Profile,
  type ProfileRelationship,
  type InsertAccount,
  type InsertProfile,
  type InsertProfileRelationship,
  // Legacy types
  type User,
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
  type Purchase,
  type Drill,
  type PlayerStats,
  type FamilyMember,
  type TaskCompletion,
  type AnnouncementAcknowledgment,
  type PlayerTask,
  type PlayerPoints,
  type PlayerEvaluation,
  type Player,
  // Legacy insert types
  type InsertUser,
  type InsertTeam,
  type InsertEvent,
  type InsertAttendance,
  type InsertBadge,
  type InsertTrophy,
  type InsertUserTrophy,
  type InsertAnnouncement,
  type InsertMessageReaction,
  type InsertMessage,
  type InsertTeamMessage,
  type InsertPayment,
  type InsertPurchase,
  type InsertDrill,
  type InsertPlayerStats,
  type InsertFamilyMember,
  type InsertTaskCompletion,
  type InsertAnnouncementAcknowledgment,
  type InsertPlayerTask,
  type InsertPlayerPoints,
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
  getAccountByEmail(email: string): Promise<Account | undefined>;
  getAccountByMagicToken(token: string): Promise<Account | undefined>;
  upsertAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, data: Partial<Account>): Promise<Account>;
  clearMagicLinkToken(accountId: string): Promise<void>;
  
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
  getUserByName(firstName: string, lastName: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  updateUserProfile(id: string, data: Partial<User>): Promise<User>;

  
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
  getAllEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getTeamEvents(teamId: number): Promise<Event[]>;
  getUserEvents(userId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  
  // Attendance operations
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getUserAttendances(userId: string): Promise<Attendance[]>;
  getEventAttendances(eventId: number): Promise<Attendance[]>;
  removeAttendance(userId: string, eventId: number, type: string): Promise<boolean>;

  // Announcement operations
  getAnnouncements(teamId?: number): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<Announcement[]>;
  getTeamAnnouncements(teamId: number): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Badge operations
  getAllBadges(): Promise<Badge[]>;
  getUserBadges(userId: string): Promise<UserBadge[]>;
  awardBadge(userId: string, badgeId: number): Promise<UserBadge>;
  
  // Trophy operations
  getAllTrophies(): Promise<Trophy[]>;
  getUserTrophies(userId: string): Promise<UserTrophy[]>;
  awardTrophy(userId: string, trophyName: string, trophyDescription?: string): Promise<UserTrophy>;
  
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
  
  // Purchase operations (LeadConnector)
  getUserPurchases(userId: string): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchaseStatus(purchaseId: number, status: string): Promise<Purchase>;
  
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
  
  // Player evaluation operations
  getPlayerEvaluation(params: { playerId: number; coachId: string; quarter: string; year: number }): Promise<PlayerEvaluation | undefined>;
  savePlayerEvaluation(params: { playerId: number; coachId: string; scores: any; quarter: string; year: number }): Promise<PlayerEvaluation>;
  
  // Player relationship operations (for backward compatibility)
  getPlayersByGuardianEmail(email: string): Promise<Player[]>;
}

export class DatabaseStorage implements IStorage {
  // Account operations (new unified system)
  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async getAccountByEmail(email: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
    return account;
  }

  async upsertAccount(account: InsertAccount & { id: string }): Promise<Account> {
    const [result] = await db.insert(accounts).values([account]).onConflictDoUpdate({
      target: accounts.id,
      set: {
        email: account.email,
        primaryAccountType: account.primaryAccountType,
        accountCompleted: account.accountCompleted,
        stripeCustomerId: account.stripeCustomerId,
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

  async getAccountByMagicToken(token: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.magicLinkToken, token));
    return account;
  }

  async clearMagicLinkToken(accountId: string): Promise<void> {
    await db.update(accounts)
      .set({ 
        magicLinkToken: null, 
        magicLinkExpires: null,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, accountId));
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

  async createProfile(profile: InsertProfile & { id: string }): Promise<Profile> {
    console.log("DatabaseStorage.createProfile called with:", profile);
    const [result] = await db.insert(profiles).values([profile]).returning();
    console.log("DatabaseStorage.createProfile result:", result);
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

  async upsertUser(userData: InsertUser & { id: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values([userData])
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

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
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
    return members.map(member => {
      const player = (member as any).player;
      return {
        id: member.playerId,
        firstName: player?.firstName,
        lastName: player?.lastName,
        relationship: member.relationship,
        teamId: player?.teamId,
        jerseyNumber: player?.jerseyNumber,
        position: player?.position,
        qrCodeData: `UYP-${member.playerId}-${Date.now()}`
      };
    });
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
          color: '#1E40AF',
          coachId: 'test-admin-001',
          division: null,
          coachNames: null,
          notionId: null,
          createdAt: new Date()
        },
        {
          id: 2,
          name: 'U12 Lightning',
          ageGroup: 'Under 12',
          color: '#7C3AED',
          coachId: 'test-admin-001',
          division: null,
          coachNames: null,
          notionId: null,
          createdAt: new Date()
        },
        {
          id: 3,
          name: 'U14 Thunder',
          ageGroup: 'Under 14',
          color: '#059669',
          coachId: 'test-admin-001',
          division: null,
          coachNames: null,
          notionId: null,
          createdAt: new Date()
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
          userType: 'player' as const,
          teamId: 1,
          jerseyNumber: 7,
          position: 'Guard',
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeCustomerId: null,
          dateOfBirth: null,
          phoneNumber: null,
          emergencyContact: null,
          emergencyPhone: null,
          address: null,
          medicalInfo: null,
          allergies: null,
          teamName: null,
          age: null,
          height: null,
          city: null,
          schoolGrade: null,
          parentalConsent: false,
          profileCompleted: false,
          stripeSubscriptionId: null,
          qrCodeData: null,
          passcode: null,
          youthClubTeam: null
        },
        {
          id: 'player2',
          email: 'bob@example.com',
          firstName: 'Bob',
          lastName: 'Smith',
          userType: 'player' as const,
          teamId: 1,
          jerseyNumber: 12,
          position: 'Forward',
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeCustomerId: null,
          dateOfBirth: null,
          phoneNumber: null,
          emergencyContact: null,
          emergencyPhone: null,
          address: null,
          medicalInfo: null,
          allergies: null,
          teamName: null,
          age: null,
          height: null,
          city: null,
          schoolGrade: null,
          parentalConsent: false,
          profileCompleted: false,
          stripeSubscriptionId: null,
          qrCodeData: null,
          passcode: null,
          youthClubTeam: null
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
          userType: 'player' as const,
          teamId: 2,
          jerseyNumber: 23,
          position: 'Center',
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeCustomerId: null,
          dateOfBirth: null,
          phoneNumber: null,
          emergencyContact: null,
          emergencyPhone: null,
          address: null,
          medicalInfo: null,
          allergies: null,
          teamName: null,
          age: null,
          height: null,
          city: null,
          schoolGrade: null,
          parentalConsent: false,
          profileCompleted: false,
          stripeSubscriptionId: null,
          qrCodeData: null,
          passcode: null,
          youthClubTeam: null

        }
      ];
    }
    return await db.select().from(users).where(eq(users.teamId, teamId));
  }

  // Event operations
  async getAllEvents(): Promise<Event[]> {
    try {
      const now = new Date();
      console.log('Getting all events from database...');
      
      const eventsList = await db
        .select()
        .from(events)
        .where(
          and(
            gte(events.startTime, now), // Today or later
            eq(events.isActive, true)
          )
        )
        .orderBy(asc(events.startTime));
      
      console.log(`Query successful: found ${eventsList.length} events`);
      return eventsList;
    } catch (error) {
      console.error('Database error in getAllEvents:', error);
      throw error;
    }
  }

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
          eventType: 'practice' as const,
          startTime: new Date('2025-07-24T17:00:00'),
          endTime: new Date('2025-07-24T18:30:00'),
          location: 'UYP Main Court',
          teamId: 1,
          playerId: null,
          opponentTeam: null,
          isRecurring: false,
          recurringType: null,
          recurringEndDate: null,
          googleEventId: null,
          lastSyncedAt: null,
          isActive: true,
          latitude: null,
          longitude: null,
          createdAt: new Date()
        },
        {
          id: 2,
          title: 'Scrimmage Game',
          description: 'Practice game against U10 Eagles',
          eventType: 'game' as const,
          startTime: new Date('2025-07-26T10:00:00'),
          endTime: new Date('2025-07-26T11:30:00'),
          location: 'UYP Court 2',
          teamId: 1,
          playerId: null,
          opponentTeam: 'U10 Eagles',
          isRecurring: false,
          recurringType: null,
          recurringEndDate: null,
          googleEventId: null,
          lastSyncedAt: null,
          isActive: true,
          latitude: null,
          longitude: null,
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
          eventType: 'practice' as const,
          startTime: new Date('2025-07-25T18:00:00'),
          endTime: new Date('2025-07-25T19:30:00'),
          location: 'UYP Main Court',
          teamId: 2,
          playerId: null,
          opponentTeam: null,
          isRecurring: false,
          recurringType: null,
          recurringEndDate: null,
          googleEventId: null,
          lastSyncedAt: null,
          isActive: true,
          latitude: null,
          longitude: null,
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
          eventType: 'practice' as const,
          startTime: new Date('2025-07-27T16:00:00'),
          endTime: new Date('2025-07-27T18:00:00'),
          location: 'UYP Main Court',
          teamId: 3,
          playerId: null,
          opponentTeam: null,
          isRecurring: false,
          recurringType: null,
          recurringEndDate: null,
          googleEventId: null,
          lastSyncedAt: null,
          isActive: true,
          latitude: null,
          longitude: null,
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
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get team events, user-specific events, and league-wide events (include events from today onwards)
    const userEvents = await db
      .select()
      .from(events)
      .where(
        and(
          or(
            eq(events.teamId, user.teamId || 0),    // Team-specific events
            eq(events.playerId, userId),            // User-specific events  
            isNull(events.teamId)                   // League-wide events (like Skills sessions)
          ),
          gte(events.startTime, startOfToday)
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

  async removeAttendance(userId: string, eventId: number, type: string): Promise<boolean> {
    const result = await db
      .delete(attendances)
      .where(
        and(
          eq(attendances.userId, userId),
          eq(attendances.eventId, eventId),
          eq(attendances.type, type as "advance" | "onsite")
        )
      );
    return (result.rowCount || 0) > 0;
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

  async awardTrophy(userId: string, trophyName: string, trophyDescription?: string): Promise<UserTrophy> {
    const [userTrophy] = await db.insert(userTrophies).values([{ userId, trophyName, trophyDescription }]).returning();
    return userTrophy;
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

  // Purchase operations (LeadConnector)
  async getUserPurchases(userId: string): Promise<Purchase[]> {
    return await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.createdAt));
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    return newPurchase;
  }

  async updatePurchaseStatus(purchaseId: number, status: string): Promise<Purchase> {
    const [purchase] = await db
      .update(purchases)
      .set({ 
        status: status as "active" | "pending" | "expired" | "cancelled",
        updatedAt: new Date()
      })
      .where(eq(purchases.id, purchaseId))
      .returning();
    return purchase;
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
    return (result.rowCount ?? 0) > 0;
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
      id: messageWithSender.id,
      teamId: messageWithSender.teamId,
      senderId: messageWithSender.senderId,
      message: messageWithSender.message,
      messageType: messageWithSender.messageType,
      createdAt: messageWithSender.createdAt,
      updatedAt: messageWithSender.updatedAt
    } as TeamMessage;
  }

  // Player task operations
  async getPlayerTasks(playerId: string, date?: string): Promise<PlayerTask[]> {
    const conditions = [eq(playerTasks.playerId, playerId)];
    
    if (date) {
      conditions.push(eq(playerTasks.dueDate, date));
    }
    
    return await db
      .select()
      .from(playerTasks)
      .where(and(...conditions))
      .orderBy(desc(playerTasks.createdAt));
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

  async getLeagueEvents(): Promise<Event[]> {
    const now = new Date();
    return await db.select().from(events)
      .where(and(
        gte(events.startTime, now),
        isNull(events.teamId)
      ))
      .orderBy(asc(events.startTime));
  }

  // Coach-specific methods
  async getCoachTeam(coachId: string): Promise<any> {
    // First get the coach's user record to find their assigned team
    const coach = await db.select().from(users).where(eq(users.id, coachId)).limit(1);
    if (!coach.length) return null;

    const teamId = coach[0].teamId;
    if (!teamId) return null;

    // Get team details with roster
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team.length) return null;

    const roster = await db.select().from(users).where(eq(users.teamId, teamId));

    return {
      id: team[0].id,
      name: team[0].name,
      ageGroup: team[0].ageGroup,
      roster: roster
    };
  }

  async getCoachEvents(coachId: string): Promise<Event[]> {
    // Get the coach's team first
    const coach = await db.select().from(users).where(eq(users.id, coachId)).limit(1);
    if (!coach.length || !coach[0].teamId) return [];

    const teamId = coach[0].teamId;
    const now = new Date();
    
    return await db
      .select()
      .from(events)
      .where(and(
        eq(events.teamId, teamId),
        gte(events.startTime, now),
        eq(events.isActive, true)
      ))
      .orderBy(asc(events.startTime));
  }

  async searchPlayers(query: string): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.userType, 'player'),
          or(
            sql`lower(${users.firstName}) LIKE ${searchTerm}`,
            sql`lower(${users.lastName}) LIKE ${searchTerm}`,
            sql`lower(${users.email}) LIKE ${searchTerm}`
          )
        )
      )
      .limit(10);
  }

  async getUserByName(firstName: string, lastName: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(
        and(
          sql`LOWER(${users.firstName}) = ${firstName.toLowerCase()}`,
          sql`LOWER(${users.lastName}) = ${lastName.toLowerCase()}`
        )
      )
      .limit(1);
    
    return results[0];
  }



  // Player evaluation operations
  async getPlayerEvaluation(params: { playerId: number; coachId: string; quarter: string; year: number }): Promise<PlayerEvaluation | undefined> {
    const { playerId, quarter, year } = params;
    
    const [evaluation] = await db
      .select()
      .from(playerEvaluations)
      .where(
        and(
          eq(playerEvaluations.playerId, playerId.toString()),
          eq(playerEvaluations.quarter, quarter as "Q1" | "Q2" | "Q3" | "Q4"),
          eq(playerEvaluations.year, year)
        )
      )
      .limit(1);
    
    return evaluation;
  }

  async savePlayerEvaluation(params: { playerId: number; coachId: string; scores: any; quarter: string; year: number }): Promise<PlayerEvaluation> {
    const { playerId, coachId, scores, quarter, year } = params;
    
    // Use ON CONFLICT DO UPDATE to handle updates to existing evaluations
    const [result] = await db
      .insert(playerEvaluations)
      .values({
        playerId: playerId.toString(),
        coachId,
        scores,
        quarter: quarter as "Q1" | "Q2" | "Q3" | "Q4",
        year,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [playerEvaluations.playerId, playerEvaluations.quarter, playerEvaluations.year],
        set: {
          scores,
          coachId,
          updatedAt: new Date(),
        }
      })
      .returning();
    
    return result;
  }

  // Player relationship operations (for backward compatibility)
  async getPlayersByGuardianEmail(email: string): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.guardianEmail, email));
  }
}

export const storage = new DatabaseStorage();