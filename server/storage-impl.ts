import {
  // New tables
  accounts,
  profiles,
  profileRelationships,
  // Device management tables
  trustedDevices,
  deviceSettings,
  // Legacy tables
  users,
  teams,
  coachTeams,
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
  // Device management types
  type TrustedDevice,
  type DeviceSettings,
  type InsertTrustedDevice,
  type InsertDeviceSettings,
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
  // Device management insert schemas
  insertTrustedDeviceSchema,
  insertDeviceSettingsSchema,
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
  
  // Account linking operations
  linkUserAccount(userId: string, accountId: string): Promise<User>;
  unlinkUserAccount(userId: string): Promise<User>;
  getUserByLinkedAccount(accountId: string): Promise<User | undefined>;
  isAccountLinked(accountId: string): Promise<boolean>;

  
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
  
  // Coach team assignment operations
  assignCoachTeams(coachId: string, teamIds: number[]): Promise<void>;
  removeCoachTeams(coachId: string): Promise<void>;
  getCoachTeams(coachId: string): Promise<Team[]>;
  
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
  getUserBadges(userId: string, profileId?: string): Promise<UserBadge[]>;
  awardBadge(userId: string, badgeTypeOrId: string | number, profileId?: string): Promise<UserBadge>;
  
  // Trophy operations
  getAllTrophies(): Promise<Trophy[]>;
  getUserTrophies(userId: string, profileId?: string): Promise<UserTrophy[]>;
  awardTrophy(userId: string, trophyName: string, trophyDescription?: string, profileId?: string): Promise<UserTrophy>;
  
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
  getPlayerEvaluation(params: { playerId: number; coachId: string; quarter: string; year: number; profileId?: string }): Promise<PlayerEvaluation | undefined>;
  savePlayerEvaluation(params: { playerId: number; coachId: string; scores: any; quarter: string; year: number; notes?: string; profileId?: string }): Promise<PlayerEvaluation>;
  getLatestPlayerEvaluation(playerId: string, profileId?: string): Promise<PlayerEvaluation | undefined>;
  
  // Player relationship operations (for backward compatibility)
  getPlayersByGuardianEmail(email: string): Promise<Player[]>;

  // New methods for account claiming system
  upsertAccountFromNotion(email: string, data: { 
    primaryAccountType: 'parent' | 'player' | 'coach';
    registrationStatus?: 'pending' | 'active' | 'payment_required';
    magicLinkToken?: string;
    magicLinkExpires?: Date;
  }): Promise<Account>;
  
  upsertProfileFromNotion(accountId: string, notionData: {
    notionId: string;
    fullName: string;
    personType: 'parent' | 'player' | 'coach';
    dob?: string;
    age?: number;
    jerseyNumber?: string;
    photoUrl?: string;
    teamId?: number;
    phoneNumber?: string;
  }): Promise<Profile>;
  
  getAccountByEmail(email: string): Promise<Account | undefined>;
  
  linkParentPlayer(accountId: string, parentProfileId: string, playerProfileId: string): Promise<ProfileRelationship>;
  
  // Helper methods for accounts and profiles
  getAccounts(): Promise<Account[]>;
  getProfiles(): Promise<Profile[]>;
  
  // Device management operations
  getTrustedDevices(userId: string): Promise<TrustedDevice[]>;
  getDeviceSettings(userId: string): Promise<DeviceSettings | undefined>;
  createOrUpdateDeviceSettings(userId: string, settings: InsertDeviceSettings): Promise<DeviceSettings>;
  revokeTrustedDevice(userId: string, deviceId: string): Promise<void>;
  verifyDevicePin(userId: string, pin: string): Promise<boolean>;
  unlockDevice(userId: string, deviceFingerprint: string): Promise<void>;
  getDeviceModeConfig(userId: string): Promise<any>;
  createOrUpdateDeviceModeConfig(userId: string, config: any): Promise<any>;
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

  async clearMagicLinkToken(accountId: string): Promise<void> {
    await db.update(accounts)
      .set({ 
        magicLinkToken: null, 
        magicLinkExpires: null,
        updatedAt: new Date() 
      })
      .where(eq(accounts.id, accountId));
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

  // New methods for account claiming system
  async upsertAccountFromNotion(email: string, data: { 
    primaryAccountType: 'parent' | 'player' | 'coach';
    registrationStatus?: 'pending' | 'active' | 'payment_required';
    magicLinkToken?: string;
    magicLinkExpires?: Date;
  }): Promise<Account> {
    const accountId = `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const [account] = await db
      .insert(accounts)
      .values({
        id: accountId,
        email,
        primaryAccountType: data.primaryAccountType,
        registrationStatus: data.registrationStatus || 'pending',
        magicLinkToken: data.magicLinkToken,
        magicLinkExpires: data.magicLinkExpires,
      })
      .onConflictDoUpdate({
        target: accounts.email,
        set: {
          primaryAccountType: data.primaryAccountType,
          registrationStatus: data.registrationStatus || 'pending',
          magicLinkToken: data.magicLinkToken,
          magicLinkExpires: data.magicLinkExpires,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return account;
  }

  async upsertProfileFromNotion(accountId: string, notionData: {
    notionId: string;
    fullName: string;
    personType: 'parent' | 'player' | 'coach';
    dob?: string;
    age?: number;
    jerseyNumber?: string;
    photoUrl?: string;
    teamId?: number;
    phoneNumber?: string;
  }): Promise<Profile> {
    const profileId = `${notionData.personType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const nameParts = notionData.fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    const [profile] = await db
      .insert(profiles)
      .values({
        id: profileId,
        accountId,
        profileType: notionData.personType,
        firstName,
        lastName,
        profileImageUrl: notionData.photoUrl,
        dateOfBirth: notionData.dob ? new Date(notionData.dob) : undefined,
        phoneNumber: notionData.phoneNumber,
        teamId: notionData.teamId,
        jerseyNumber: notionData.jerseyNumber,
        profileCompleted: true, // Auto-populated from Notion
      })
      .onConflictDoNothing() // Don't overwrite existing profiles
      .returning();
    
    return profile;
  }

  async linkParentPlayer(accountId: string, parentProfileId: string, playerProfileId: string): Promise<ProfileRelationship> {
    const [relationship] = await db
      .insert(profileRelationships)
      .values({
        accountId,
        parentProfileId,
        playerProfileId,
        relationship: 'parent',
        canMakePayments: true,
        canViewReports: true,
        emergencyContact: false,
      })
      .onConflictDoNothing() // Don't create duplicate relationships
      .returning();
    
    return relationship;
  }

  // Helper methods for sync statistics
  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts);
  }

  async getProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles);
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

  // Account linking operations
  async linkUserAccount(userId: string, accountId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ linkedAccountId: accountId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async unlinkUserAccount(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ linkedAccountId: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserByLinkedAccount(accountId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.linkedAccountId, accountId));
    return user;
  }

  async isAccountLinked(accountId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.linkedAccountId, accountId));
    return !!result;
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

  // Coach team assignment operations
  async assignCoachTeams(coachId: string, teamIds: number[]): Promise<void> {
    // First, remove existing team assignments
    await this.removeCoachTeams(coachId);
    
    // Then add new team assignments
    if (teamIds.length > 0) {
      const assignments = teamIds.map(teamId => ({
        coachId,
        teamId
      }));
      await db.insert(coachTeams).values(assignments);
    }
  }

  async removeCoachTeams(coachId: string): Promise<void> {
    await db.delete(coachTeams).where(eq(coachTeams.coachId, coachId));
  }

  async getCoachTeams(coachId: string): Promise<Team[]> {
    const assignments = await db
      .select()
      .from(coachTeams)
      .where(eq(coachTeams.coachId, coachId));
    
    if (assignments.length === 0) return [];
    
    const teamIds = assignments.map(a => a.teamId);
    const coachTeamsList = await db
      .select()
      .from(teams)
      .where(sql`${teams.id} IN ${sql.raw(`(${teamIds.join(',')})`)}`)
      .orderBy(asc(teams.ageGroup), asc(teams.name));
    
    return coachTeamsList;
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

  async getUserBadges(userId: string, profileId?: string): Promise<UserBadge[]> {
    // If profileId is provided, filter by profileId; otherwise fall back to userId
    const condition = profileId 
      ? eq(userBadges.profileId, profileId)
      : eq(userBadges.userId, userId);
    return await db.select().from(userBadges).where(condition);
  }

  async awardBadge(userId: string, badgeTypeOrId: string | number, profileId?: string): Promise<UserBadge> {
    // Support both badgeType (string) for coach awards and badgeId (number) for auto-awards
    const values = typeof badgeTypeOrId === 'string'
      ? { userId, badgeType: badgeTypeOrId, profileId }
      : { userId, badgeId: badgeTypeOrId, profileId };
    
    const [userBadge] = await db.insert(userBadges).values(values).returning();
    return userBadge;
  }

  // Trophy operations
  async getAllTrophies(): Promise<Trophy[]> {
    return await db.select().from(trophies).where(eq(trophies.isActive, true));
  }

  async getUserTrophies(userId: string, profileId?: string): Promise<UserTrophy[]> {
    // If profileId is provided, filter by profileId; otherwise fall back to userId
    const condition = profileId 
      ? eq(userTrophies.profileId, profileId)
      : eq(userTrophies.userId, userId);
    return await db.select().from(userTrophies).where(condition);
  }

  async awardTrophy(userId: string, trophyName: string, trophyDescription?: string, profileId?: string): Promise<UserTrophy> {
    const [userTrophy] = await db.insert(userTrophies).values([{ userId, trophyName, trophyDescription, profileId }]).returning();
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
    if (!coach.length) return [];

    const teamId = coach[0].teamId;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get team events AND league-wide events (like Google Calendar events) - same as getUserEvents
    return await db
      .select()
      .from(events)
      .where(and(
        or(
          eq(events.teamId, teamId || 0),   // Team-specific events
          isNull(events.teamId)             // League-wide events (Google Calendar)
        ),
        gte(events.startTime, startOfToday),
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
  async getPlayerEvaluation(params: { playerId: number; coachId: string; quarter: string; year: number; profileId?: string }): Promise<PlayerEvaluation | undefined> {
    const { playerId, quarter, year, profileId } = params;
    
    const conditions = [
      eq(playerEvaluations.playerId, playerId.toString()),
      eq(playerEvaluations.quarter, quarter as "Q1" | "Q2" | "Q3" | "Q4"),
      eq(playerEvaluations.year, year)
    ];
    
    if (profileId) {
      conditions.push(eq(playerEvaluations.profileId, profileId));
    }
    
    const [evaluation] = await db
      .select()
      .from(playerEvaluations)
      .where(and(...conditions))
      .limit(1);
    
    return evaluation;
  }

  async savePlayerEvaluation(params: { playerId: number; coachId: string; scores: any; quarter: string; year: number; notes?: string; profileId?: string }): Promise<PlayerEvaluation> {
    const { playerId, coachId, scores, quarter, year, notes, profileId } = params;
    
    // Use ON CONFLICT DO UPDATE to handle updates to existing evaluations
    const [result] = await db
      .insert(playerEvaluations)
      .values({
        playerId: playerId.toString(),
        coachId,
        scores,
        quarter: quarter as "Q1" | "Q2" | "Q3" | "Q4",
        year,
        notes,
        profileId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [playerEvaluations.playerId, playerEvaluations.quarter, playerEvaluations.year],
        set: {
          scores,
          coachId,
          notes,
          profileId,
          updatedAt: new Date(),
        }
      })
      .returning();
    
    return result;
  }

  async getLatestPlayerEvaluation(playerId: string, profileId?: string): Promise<PlayerEvaluation | undefined> {
    const condition = profileId 
      ? and(eq(playerEvaluations.playerId, playerId), eq(playerEvaluations.profileId, profileId))
      : eq(playerEvaluations.playerId, playerId);
      
    const [evaluation] = await db
      .select()
      .from(playerEvaluations)
      .where(condition)
      .orderBy(desc(playerEvaluations.year), desc(playerEvaluations.quarter))
      .limit(1);
    
    return evaluation;
  }

  // Player relationship operations (for backward compatibility)
  async getPlayersByGuardianEmail(email: string): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.guardianEmail, email));
  }

  // Device management operations
  async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    return await db
      .select()
      .from(trustedDevices)
      .where(and(eq(trustedDevices.userId, userId), eq(trustedDevices.isActive, true)))
      .orderBy(desc(trustedDevices.lastUsed));
  }

  async getDeviceSettings(userId: string): Promise<DeviceSettings | undefined> {
    const [settings] = await db
      .select()
      .from(deviceSettings)
      .where(eq(deviceSettings.userId, userId));
    return settings;
  }

  async createOrUpdateDeviceSettings(userId: string, settings: InsertDeviceSettings): Promise<DeviceSettings> {
    const [result] = await db
      .insert(deviceSettings)
      .values({ ...settings, userId })
      .onConflictDoUpdate({
        target: deviceSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        }
      })
      .returning();
    return result;
  }

  async revokeTrustedDevice(userId: string, deviceId: string): Promise<void> {
    await db
      .update(trustedDevices)
      .set({ isActive: false })
      .where(and(eq(trustedDevices.userId, userId), eq(trustedDevices.id, deviceId)));
  }

  async verifyDevicePin(userId: string, pin: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.passcode === pin || false;
  }

  async unlockDevice(userId: string, deviceFingerprint: string): Promise<void> {
    // Update device last used time
    await db
      .update(trustedDevices)
      .set({ lastUsed: new Date() })
      .where(and(eq(trustedDevices.userId, userId), eq(trustedDevices.deviceFingerprint, deviceFingerprint)));
  }

  // Legacy device mode config methods (for backward compatibility)
  async getDeviceModeConfig(userId: string): Promise<any> {
    const settings = await this.getDeviceSettings(userId);
    return settings || {};
  }

  async createOrUpdateDeviceModeConfig(userId: string, config: any): Promise<any> {
    return await this.createOrUpdateDeviceSettings(userId, config);
  }
}

export const storage = new DatabaseStorage();