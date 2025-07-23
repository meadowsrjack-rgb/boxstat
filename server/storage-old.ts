export { storage } from "./storage-impl";
export type { IStorage } from "./storage-impl";
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
  getAnnouncements(teamId?: number): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Message operations
  getTeamMessages(teamId: number, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Payment operations
  getUserPayments(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: "pending" | "completed" | "failed" | "refunded", paidAt?: Date): Promise<Payment>;
  
  // Drill operations
  getAllDrills(): Promise<Drill[]>;
  getDrillsByCategory(category: "dribbling" | "shooting" | "defense" | "passing" | "conditioning"): Promise<Drill[]>;
  
  // Stats operations
  getPlayerStats(userId: string): Promise<PlayerStats[]>;
  createPlayerStats(stats: InsertPlayerStats): Promise<PlayerStats>;
  
  // Child profile operations
  getChildProfiles(parentId: string): Promise<ChildProfile[]>;
  getChildProfile(id: number): Promise<ChildProfile | undefined>;
  createChildProfile(profile: InsertChildProfile): Promise<ChildProfile>;
  updateChildProfile(id: number, profile: Partial<InsertChildProfile>): Promise<ChildProfile>;
  deleteChildProfile(id: number): Promise<void>;
  
  // Device mode configuration operations
  getDeviceModeConfig(deviceId: string, parentId: string): Promise<DeviceModeConfig | undefined>;
  createOrUpdateDeviceModeConfig(config: InsertDeviceModeConfig): Promise<DeviceModeConfig>;
  verifyDevicePin(deviceId: string, parentId: string, pin: string): Promise<boolean>;
  unlockDevice(deviceId: string, parentId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
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

  async updateUserSportsEngineInfo(userId: string, sportsEngineCustomerId: string, sportsEngineSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        sportsEngineCustomerId,
        sportsEngineSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamsByCoach(coachId: string): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.coachId, coachId));
  }

  async getUserTeam(userId: string): Promise<Team | undefined> {
    const user = await this.getUser(userId);
    if (!user || !user.teamId) return undefined;
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
    return await db
      .select()
      .from(events)
      .where(eq(events.teamId, teamId))
      .orderBy(asc(events.startTime));
  }

  async getUserEvents(userId: string): Promise<Event[]> {
    const user = await this.getUser(userId);
    const childProfiles = await this.getChildProfiles(userId);
    
    // Get events for user's team and all child profiles
    const teamEvents = user?.teamId ? await this.getTeamEvents(user.teamId) : [];

    const childEvents = childProfiles.length > 0 ? await db
      .select()
      .from(events)
      .where(
        or(
          ...childProfiles.map(child => eq(events.childProfileId, child.id)),
          ...childProfiles.filter(child => child.teamId).map(child => eq(events.teamId, child.teamId!))
        )
      )
      .orderBy(asc(events.startTime)) : [];

    // Combine and deduplicate events
    const allEvents = [...teamEvents, ...childEvents];
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );

    return uniqueEvents;
  }

  async getChildEvents(childProfileId: number): Promise<Event[]> {
    const child = await this.getChildProfile(childProfileId);
    if (!child) return [];

    const childSpecificEvents = await db
      .select()
      .from(events)
      .where(eq(events.childProfileId, childProfileId))
      .orderBy(asc(events.startTime));

    const teamEvents = child.teamId ? await db
      .select()
      .from(events)
      .where(and(eq(events.teamId, child.teamId), isNull(events.childProfileId)))
      .orderBy(asc(events.startTime)) : [];

    return [...childSpecificEvents, ...teamEvents];
  }

  async createRecurringEvent(eventData: InsertEvent, occurrences: Date[]): Promise<Event[]> {
    const createdEvents: Event[] = [];
    
    for (const occurrence of occurrences) {
      const eventWithDate = {
        ...eventData,
        startTime: new Date(occurrence.getTime() + (eventData.startTime.getTime() - new Date(eventData.startTime).setHours(0,0,0,0))),
        endTime: new Date(occurrence.getTime() + (eventData.endTime.getTime() - new Date(eventData.endTime).setHours(0,0,0,0)))
      };
      
      const [newEvent] = await db.insert(events).values(eventWithDate).returning();
      createdEvents.push(newEvent);
    }
    
    return createdEvents;
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
    return await db
      .select()
      .from(attendances)
      .where(eq(attendances.userId, userId))
      .orderBy(desc(attendances.checkedInAt));
  }

  async getEventAttendances(eventId: number): Promise<Attendance[]> {
    return await db
      .select()
      .from(attendances)
      .where(eq(attendances.eventId, eventId))
      .orderBy(desc(attendances.checkedInAt));
  }

  // Badge operations
  async getAllBadges(): Promise<Badge[]> {
    return await db.select().from(badges).where(eq(badges.isActive, true));
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));
  }

  async awardBadge(userId: string, badgeId: number): Promise<UserBadge> {
    const [newBadge] = await db
      .insert(userBadges)
      .values({ userId, badgeId })
      .returning();
    return newBadge;
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

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  // Message operations
  async getTeamMessages(teamId: number, limit = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.teamId, teamId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
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

  async updatePaymentStatus(id: number, status: "pending" | "completed" | "failed" | "refunded", paidAt?: Date): Promise<Payment> {
    const [updatedPayment] = await db
      .update(payments)
      .set({ status, paidAt })
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

  // Drill operations
  async getAllDrills(): Promise<Drill[]> {
    return await db.select().from(drills).where(eq(drills.isActive, true));
  }

  async getDrillsByCategory(category: "dribbling" | "shooting" | "defense" | "passing" | "conditioning"): Promise<Drill[]> {
    return await db
      .select()
      .from(drills)
      .where(and(eq(drills.category, category), eq(drills.isActive, true)));
  }

  // Stats operations
  async getPlayerStats(userId: string): Promise<PlayerStats[]> {
    return await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, userId))
      .orderBy(desc(playerStats.createdAt));
  }

  async createPlayerStats(stats: InsertPlayerStats): Promise<PlayerStats> {
    const [newStats] = await db.insert(playerStats).values(stats).returning();
    return newStats;
  }

  // Child profile operations
  async getChildProfiles(parentId: string): Promise<ChildProfile[]> {
    return await db
      .select({
        id: childProfiles.id,
        parentId: childProfiles.parentId,
        firstName: childProfiles.firstName,
        lastName: childProfiles.lastName,
        dateOfBirth: childProfiles.dateOfBirth,
        jerseyNumber: childProfiles.jerseyNumber,
        profileImageUrl: childProfiles.profileImageUrl,
        teamId: childProfiles.teamId,
        qrCodeData: childProfiles.qrCodeData,
        createdAt: childProfiles.createdAt,
        updatedAt: childProfiles.updatedAt,
        teamName: teams.name,
        teamAgeGroup: teams.ageGroup,
        teamColor: teams.color,
      })
      .from(childProfiles)
      .leftJoin(teams, eq(childProfiles.teamId, teams.id))
      .where(eq(childProfiles.parentId, parentId))
      .orderBy(asc(childProfiles.firstName));
  }

  async getChildProfile(id: number): Promise<ChildProfile | undefined> {
    const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.id, id));
    return profile;
  }

  async createChildProfile(profile: InsertChildProfile): Promise<ChildProfile> {
    const [newProfile] = await db.insert(childProfiles).values(profile).returning();
    return newProfile;
  }

  async updateChildProfile(id: number, profile: Partial<InsertChildProfile>): Promise<ChildProfile> {
    const [updatedProfile] = await db
      .update(childProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(childProfiles.id, id))
      .returning();
    return updatedProfile;
  }

  async deleteChildProfile(id: number): Promise<void> {
    await db.delete(childProfiles).where(eq(childProfiles.id, id));
  }

  // Team operations
  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  // Device mode configuration operations
  async getDeviceModeConfig(deviceId: string, parentId: string): Promise<DeviceModeConfig | undefined> {
    const [config] = await db.select().from(deviceModeConfig).where(
      and(
        eq(deviceModeConfig.deviceId, deviceId),
        eq(deviceModeConfig.parentId, parentId)
      )
    );
    return config;
  }

  async createOrUpdateDeviceModeConfig(config: InsertDeviceModeConfig): Promise<DeviceModeConfig> {
    // Create a hash of the PIN for storage
    const pinHash = config.pinHash;
    
    // Check if config already exists
    const existing = await this.getDeviceModeConfig(config.deviceId, config.parentId);
    
    if (existing) {
      // Update existing config
      const [result] = await db
        .update(deviceModeConfig)
        .set({
          mode: config.mode,
          childProfileId: config.childProfileId,
          pinHash,
          isLocked: config.mode === 'player',
          updatedAt: new Date(),
        })
        .where(and(
          eq(deviceModeConfig.deviceId, config.deviceId),
          eq(deviceModeConfig.parentId, config.parentId)
        ))
        .returning();
      return result;
    } else {
      // Create new config
      const [result] = await db
        .insert(deviceModeConfig)
        .values({
          deviceId: config.deviceId,
          parentId: config.parentId,
          mode: config.mode,
          childProfileId: config.childProfileId,
          pinHash,
          isLocked: config.mode === 'player',
        })
        .returning();
      return result;
    }
  }

  async verifyDevicePin(deviceId: string, parentId: string, pin: string): Promise<boolean> {
    const config = await this.getDeviceModeConfig(deviceId, parentId);
    if (!config || !config.pinHash) return false;
    
    // Simple hash comparison (in production, use bcrypt or similar)
    const hashedPin = Buffer.from(pin).toString('base64');
    return hashedPin === config.pinHash;
  }

  async unlockDevice(deviceId: string, parentId: string): Promise<void> {
    await db
      .update(deviceModeConfig)
      .set({ 
        mode: 'parent',
        isLocked: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(deviceModeConfig.deviceId, deviceId),
          eq(deviceModeConfig.parentId, parentId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
