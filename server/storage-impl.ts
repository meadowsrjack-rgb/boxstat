import {
  type Organization,
  type User,
  type Team,
  type Event,
  type Attendance,
  type Award,
  type UserAward,
  type Announcement,
  type Message,
  type Payment,
  type Program,
  type PackageSelection,
  type Division,
  type Skill,
  type Evaluation,
  type Notification,
  type EventWindow,
  type RsvpResponse,
  type Facility,
  type MigrationLookup,
  type Subscription,
  type Waiver,
  type ProductEnrollment,
  type ProgramSuggestedAddOn,
  type NotificationCampaign,
  type NotificationCampaignRun,
  type NotificationTriggerRule,
  type TriggeredNotificationLog,
  type InsertUser,
  type InsertTeam,
  type InsertEvent,
  type InsertAttendance,
  type InsertAward,
  type InsertUserAward,
  type InsertAnnouncement,
  type InsertMessage,
  type InsertPayment,
  type InsertProgram,
  type InsertPackageSelection,
  type InsertDivision,
  type InsertSkill,
  type InsertEvaluation,
  type InsertNotification,
  type InsertEventWindow,
  type InsertRsvpResponse,
  type InsertFacility,
  type InsertMigrationLookup,
  type InsertSubscription,
  type InsertWaiver,
  type InsertProductEnrollment,
  type InsertProgramSuggestedAddOn,
  type InsertNotificationCampaign,
  type InsertNotificationCampaignRun,
  type InsertNotificationTriggerRule,
  type InsertTriggeredNotificationLog,
  type SelectAwardDefinition,
  type InsertAwardDefinition,
  type SelectUserAwardRecord,
  type InsertUserAwardRecord,
  type SelectMigrationLookup,
  type SelectSubscription,
} from "@shared/schema";

// =============================================
// Storage Interface
// =============================================

export interface IStorage {
  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined>;
  createOrganization(org: Omit<Organization, "id" | "createdAt" | "updatedAt">): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | undefined>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string, organizationId: string): Promise<User | undefined>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;
  getUsersByTeam(teamId: string): Promise<User[]>;
  getUsersByRole(organizationId: string, role: string): Promise<User[]>;
  getAccountProfiles(accountId: string): Promise<User[]>;
  getPlayersByParent(parentId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
  // Pending Registration operations
  getPendingRegistration(email: string, organizationId: string): Promise<{id: number; email: string; organizationId: string; verificationToken: string; verificationExpiry: string; verified: boolean; sourcePlatform?: string | null; sessionId?: string | null; createdAt: string | null} | undefined>;
  getPendingRegistrationByToken(token: string, organizationId: string): Promise<{id: number; email: string; organizationId: string; verificationToken: string; verificationExpiry: string; verified: boolean; sourcePlatform?: string | null; sessionId?: string | null; createdAt: string | null} | undefined>;
  createPendingRegistration(email: string, organizationId: string, verificationToken: string, verificationExpiry: Date, sourcePlatform?: string, sessionId?: string): Promise<{id: number; email: string; organizationId: string; verificationToken: string; verificationExpiry: string; verified: boolean; sourcePlatform?: string | null; sessionId?: string | null; createdAt: string | null}>;
  updatePendingRegistration(email: string, organizationId: string, verified: boolean): Promise<void>;
  deletePendingRegistration(email: string, organizationId: string): Promise<void>;
  
  // Team operations
  getTeam(id: string): Promise<Team | undefined>;
  getTeamsByOrganization(organizationId: string): Promise<Team[]>;
  getTeamsByCoach(coachId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<void>;
  
  // Event operations
  getEvent(id: string): Promise<Event | undefined>;
  getEventsByOrganization(organizationId: string): Promise<Event[]>;
  getEventsByTeam(teamId: string): Promise<Event[]>;
  getUpcomingEvents(organizationId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;
  
  // Attendance operations
  getAttendance(eventId: string, userId: string): Promise<Attendance | undefined>;
  getAttendancesByEvent(eventId: string): Promise<Attendance[]>;
  getAttendancesByUser(userId: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  
  // Award operations
  getAward(id: string): Promise<Award | undefined>;
  getAwardsByOrganization(organizationId: string): Promise<Award[]>;
  createAward(award: InsertAward): Promise<Award>;
  updateAward(id: string, updates: Partial<Award>): Promise<Award | undefined>;
  deleteAward(id: string): Promise<void>;
  
  // User Award operations
  getUserAwards(userId: string): Promise<UserAward[]>;
  awardUser(userAward: InsertUserAward): Promise<UserAward>;
  
  // Award Definition operations (new awards system)
  getAwardDefinitions(organizationId: string): Promise<SelectAwardDefinition[]>;
  getAwardDefinition(id: number): Promise<SelectAwardDefinition | undefined>;
  createAwardDefinition(data: InsertAwardDefinition): Promise<SelectAwardDefinition>;
  updateAwardDefinition(id: number, data: Partial<InsertAwardDefinition>): Promise<SelectAwardDefinition | undefined>;
  deleteAwardDefinition(id: number): Promise<void>;
  getActiveAwardDefinitions(organizationId: string): Promise<SelectAwardDefinition[]>;
  
  // User Award Record operations (new awards system)
  getUserAwardRecords(userId: string): Promise<SelectUserAwardRecord[]>;
  getUserAwardsByOrganization(organizationId: string): Promise<SelectUserAwardRecord[]>;
  createUserAward(data: InsertUserAwardRecord): Promise<SelectUserAwardRecord>;
  deleteUserAward(id: number): Promise<void>;
  checkUserHasAward(userId: string, awardId: number, year?: number): Promise<boolean>;
  
  // User Award Tracking Fields
  updateUserAwardTracking(userId: string, updates: Partial<{totalPractices: number; totalGames: number; consecutiveCheckins: number; videosCompleted: number; yearsActive: number; awards: any[]}>): Promise<void>;
  
  // Announcement operations
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  getAnnouncementsByOrganization(organizationId: string): Promise<Announcement[]>;
  getAnnouncementsByTeam(teamId: string): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<void>;
  
  // Message operations
  getMessagesByTeam(teamId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Payment operations
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByOrganization(organizationId: string): Promise<Payment[]>;
  getPaymentsByUser(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined>;
  
  // Waiver operations
  getWaiver(id: string): Promise<Waiver | undefined>;
  getWaiversByOrganization(organizationId: string): Promise<Waiver[]>;
  createWaiver(waiver: InsertWaiver): Promise<Waiver>;
  updateWaiver(id: string, updates: Partial<Waiver>): Promise<Waiver | undefined>;
  deleteWaiver(id: string): Promise<void>;
  
  // Program operations
  getProgram(id: string): Promise<Program | undefined>;
  getProgramsByOrganization(organizationId: string): Promise<Program[]>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: string, updates: Partial<Program>): Promise<Program | undefined>;
  deleteProgram(id: string): Promise<void>;
  
  // Program Suggested Add-ons operations
  getSuggestedAddOns(programId: string): Promise<ProgramSuggestedAddOn[]>;
  getSuggestedAddOnsWithProducts(programId: string): Promise<{ addOn: ProgramSuggestedAddOn; product: Program }[]>;
  addSuggestedAddOn(data: InsertProgramSuggestedAddOn): Promise<ProgramSuggestedAddOn>;
  removeSuggestedAddOn(programId: string, productId: string): Promise<void>;
  setProgramSuggestedAddOns(programId: string, productIds: string[]): Promise<void>;
  getProductsWithSuggestedPrograms(productId: string): Promise<string[]>;
  
  // Package Selection operations
  getPackageSelection(id: string): Promise<PackageSelection | undefined>;
  getPackageSelectionsByParent(parentUserId: string): Promise<PackageSelection[]>;
  getPackageSelectionsByChild(childUserId: string): Promise<PackageSelection[]>;
  createPackageSelection(selection: InsertPackageSelection): Promise<PackageSelection>;
  updatePackageSelection(id: string, updates: Partial<PackageSelection>): Promise<PackageSelection | undefined>;
  deletePackageSelection(id: string): Promise<void>;
  markPackageSelectionPaid(id: string): Promise<PackageSelection | undefined>;
  
  // Division operations
  getDivision(id: number): Promise<Division | undefined>;
  getDivisionsByOrganization(organizationId: string): Promise<Division[]>;
  createDivision(division: InsertDivision): Promise<Division>;
  updateDivision(id: number, updates: Partial<Division>): Promise<Division | undefined>;
  deleteDivision(id: number): Promise<void>;
  
  // Skill operations
  getSkill(id: number): Promise<Skill | undefined>;
  getSkillsByOrganization(organizationId: string): Promise<Skill[]>;
  getSkillsByPlayer(playerId: string): Promise<Skill[]>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  updateSkill(id: number, updates: Partial<Skill>): Promise<Skill | undefined>;
  deleteSkill(id: number): Promise<void>;
  
  // Evaluation operations
  getEvaluation(id: number): Promise<Evaluation | undefined>;
  getEvaluationsByOrganization(organizationId: string): Promise<Evaluation[]>;
  getEvaluationsByPlayer(playerId: string): Promise<Evaluation[]>;
  getEvaluationByPlayerQuarter(playerId: string, quarter: string, year: number): Promise<Evaluation | undefined>;
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  updateEvaluation(id: number, updates: Partial<Evaluation>): Promise<Evaluation | undefined>;
  deleteEvaluation(id: number): Promise<void>;
  
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByOrganization(organizationId: string): Promise<Notification[]>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined>;
  deleteNotification(id: number): Promise<void>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  
  // Event Window operations
  getEventWindow(id: number): Promise<EventWindow | undefined>;
  getEventWindowsByEvent(eventId: number): Promise<EventWindow[]>;
  createEventWindow(window: InsertEventWindow): Promise<EventWindow>;
  updateEventWindow(id: number, updates: Partial<EventWindow>): Promise<EventWindow | undefined>;
  deleteEventWindow(id: number): Promise<void>;
  deleteEventWindowsByEvent(eventId: number): Promise<void>;
  
  // RSVP Response operations
  getRsvpResponse(id: number): Promise<RsvpResponse | undefined>;
  getRsvpResponsesByEvent(eventId: number): Promise<RsvpResponse[]>;
  getRsvpResponseByUserAndEvent(userId: string, eventId: number): Promise<RsvpResponse | undefined>;
  createRsvpResponse(response: InsertRsvpResponse): Promise<RsvpResponse>;
  updateRsvpResponse(id: number, updates: Partial<RsvpResponse>): Promise<RsvpResponse | undefined>;
  deleteRsvpResponse(id: number): Promise<void>;
  
  // Facility operations
  getFacility(id: number): Promise<Facility | undefined>;
  getFacilitiesByOrganization(organizationId: string): Promise<Facility[]>;
  createFacility(facility: InsertFacility): Promise<Facility>;
  updateFacility(id: number, updates: Partial<Facility>): Promise<Facility | undefined>;
  deleteFacility(id: number): Promise<void>;
  
  // Migration Lookup operations (Legacy UYP Migration)
  getMigrationLookupsByEmail(email: string): Promise<SelectMigrationLookup[]>;
  createMigrationLookup(data: InsertMigrationLookup): Promise<SelectMigrationLookup>;
  markMigrationLookupClaimed(id: number): Promise<void>;
  
  // Subscription operations (User Wallet System)
  getSubscription(id: number): Promise<SelectSubscription | undefined>;
  getSubscriptionsByOwner(ownerUserId: string): Promise<SelectSubscription[]>;
  getUnassignedSubscriptionsByOwner(ownerUserId: string): Promise<SelectSubscription[]>;
  getSubscriptionsByPlayerId(playerId: string): Promise<SelectSubscription[]>;
  createSubscription(data: InsertSubscription): Promise<SelectSubscription>;
  assignSubscriptionToPlayer(subscriptionId: number, playerId: string): Promise<SelectSubscription | undefined>;
  updateSubscription(id: number, updates: Partial<Subscription>): Promise<SelectSubscription | undefined>;
  
  // Credit/Enrollment operations
  getActiveEnrollmentsWithCredits(playerId: string): Promise<ProductEnrollment[]>;
  createEnrollment(data: InsertProductEnrollment): Promise<ProductEnrollment>;
  deductEnrollmentCredit(enrollmentId: number): Promise<ProductEnrollment | undefined>;
  getPlayerStatusTag(playerId: string): Promise<{tag: string; remainingCredits?: number; lowBalance?: boolean}>;
  getPlayerStatusTagsBulk(playerIds: string[]): Promise<Map<string, {tag: string; remainingCredits?: number; lowBalance?: boolean}>>;
  getProductEnrollmentsByOrganization(organizationId: string): Promise<ProductEnrollment[]>;
  
  // Notification Campaign operations
  getNotificationCampaign(id: number): Promise<NotificationCampaign | undefined>;
  getNotificationCampaignsByOrganization(organizationId: string): Promise<NotificationCampaign[]>;
  getPendingCampaigns(beforeTime: string): Promise<NotificationCampaign[]>;
  createNotificationCampaign(data: InsertNotificationCampaign): Promise<NotificationCampaign>;
  updateNotificationCampaign(id: number, updates: Partial<NotificationCampaign>): Promise<NotificationCampaign | undefined>;
  deleteNotificationCampaign(id: number): Promise<void>;
  createCampaignRun(data: InsertNotificationCampaignRun): Promise<NotificationCampaignRun>;
  updateCampaignRun(id: number, updates: Partial<NotificationCampaignRun>): Promise<NotificationCampaignRun | undefined>;
  getCampaignRunsByCampaign(campaignId: number): Promise<NotificationCampaignRun[]>;
  
  // Notification Trigger Rule operations
  getNotificationTriggerRule(id: number): Promise<NotificationTriggerRule | undefined>;
  getNotificationTriggerRulesByOrganization(organizationId: string): Promise<NotificationTriggerRule[]>;
  getActiveNotificationTriggerRulesByType(organizationId: string, triggerType: string): Promise<NotificationTriggerRule[]>;
  createNotificationTriggerRule(data: InsertNotificationTriggerRule): Promise<NotificationTriggerRule>;
  updateNotificationTriggerRule(id: number, updates: Partial<NotificationTriggerRule>): Promise<NotificationTriggerRule | undefined>;
  deleteNotificationTriggerRule(id: number): Promise<void>;
  createTriggeredNotificationLog(data: InsertTriggeredNotificationLog): Promise<TriggeredNotificationLog>;
  getTriggeredNotificationLogsByUser(userId: string): Promise<TriggeredNotificationLog[]>;
}

// =============================================
// In-Memory Storage Implementation
// =============================================

class MemStorage implements IStorage {
  private organizations: Map<string, Organization> = new Map();
  private users: Map<string, User> = new Map();
  private pendingRegistrations: Map<string, {id: number; email: string; organizationId: string; verificationToken: string; verificationExpiry: string; verified: boolean; createdAt: string | null}> = new Map();
  private nextPendingRegId: number = 1;
  private teams: Map<number, Team> = new Map();
  private events: Map<number, Event> = new Map();
  private attendances: Map<string, Attendance> = new Map();
  private awards: Map<string, Award> = new Map();
  private userAwards: Map<string, UserAward> = new Map();
  private announcements: Map<string, Announcement> = new Map();
  private messages: Map<string, Message> = new Map();
  private payments: Map<string, Payment> = new Map();
  private programs: Map<string, Program> = new Map();
  private waivers: Map<string, Waiver> = new Map();
  private packageSelections: Map<string, PackageSelection> = new Map();
  private divisions: Map<number, Division> = new Map();
  private skills: Map<number, Skill> = new Map();
  private evaluations: Map<number, Evaluation> = new Map();
  private notifications: Map<number, Notification> = new Map();
  private eventWindows: Map<number, EventWindow> = new Map();
  private rsvpResponses: Map<number, RsvpResponse> = new Map();
  private awardDefinitions: Map<number, SelectAwardDefinition> = new Map();
  private userAwardRecords: Map<number, SelectUserAwardRecord> = new Map();
  private migrationLookups: Map<number, SelectMigrationLookup> = new Map();
  private subscriptionsStore: Map<number, SelectSubscription> = new Map();
  private enrollmentsStore: Map<number, ProductEnrollment> = new Map();
  private nextTeamId = 1;
  private nextEventId = 1;
  private nextDivisionId = 1;
  private nextSkillId = 1;
  private nextEvaluationId = 1;
  private nextNotificationId = 1;
  private nextEventWindowId = 1;
  private nextRsvpResponseId = 1;
  private nextAwardDefinitionId = 1;
  private nextUserAwardRecordId = 1;
  private nextMigrationLookupId = 1;
  private nextSubscriptionId = 1;
  private nextEnrollmentId = 1;
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  constructor() {
    // Create a default organization
    const defaultOrg: Organization = {
      id: "default-org",
      name: "My Sports Organization",
      subdomain: "default",
      sportType: "basketball",
      primaryColor: "#1E40AF",
      secondaryColor: "#DC2626",
      logoUrl: undefined,
      terminology: {
        athlete: "Player",
        coach: "Coach",
        parent: "Parent",
        team: "Team",
        practice: "Practice",
        game: "Game",
      },
      features: {
        payments: true,
        awards: true,
        messaging: true,
        events: true,
        training: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.set(defaultOrg.id, defaultOrg);
    
    // Create a default admin user
    const adminUser: User = {
      id: "admin-1",
      organizationId: "default-org",
      email: "admin@example.com",
      password: Buffer.from("admin123").toString('base64'), // Password: admin123
      role: "admin",
      firstName: "Admin",
      lastName: "User",
      isActive: true,
      verified: true,
      hasRegistered: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
    
    // Create a test user account
    const testUser: User = {
      id: "test-1",
      organizationId: "default-org",
      email: "test@example.com",
      password: Buffer.from("test123").toString('base64'), // Password: test123
      role: "parent",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "555-0123",
      isActive: true,
      verified: true,
      hasRegistered: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(testUser.id, testUser);
    
    // Create a test coach account
    const testCoachUser: User = {
      id: "coach-1",
      organizationId: "default-org",
      email: "coach@example.com",
      password: Buffer.from("coach123").toString('base64'), // Password: coach123
      role: "coach",
      firstName: "Coach",
      lastName: "Smith",
      phoneNumber: "555-0456",
      isActive: true,
      verified: true,
      hasRegistered: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(testCoachUser.id, testCoachUser);
    
    // Create test users for preview demonstration
    const parentUser: User = {
      id: "parent-1",
      organizationId: "default-org",
      email: "sarah.johnson@example.com",
      role: "parent",
      firstName: "Sarah",
      lastName: "Johnson",
      phoneNumber: "(555) 123-4567",
      isActive: true,
      verified: true,
      registrationType: "my_child",
      packageSelected: "youth-club-full-season",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(parentUser.id, parentUser);
    
    const playerUser1: User = {
      id: "player-1",
      organizationId: "default-org",
      email: "michael.johnson@temp.com",
      role: "player",
      firstName: "Michael",
      lastName: "Johnson",
      dateOfBirth: "2010-03-15",
      gender: "male",
      accountHolderId: "parent-1",
      registrationType: "my_child",
      packageSelected: "youth-club-full-season",
      teamAssignmentStatus: "pending",
      isActive: true,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(playerUser1.id, playerUser1);
    
    const playerUser2: User = {
      id: "player-2",
      organizationId: "default-org",
      email: "emma.johnson@temp.com",
      role: "player",
      firstName: "Emma",
      lastName: "Johnson",
      dateOfBirth: "2012-07-22",
      gender: "female",
      accountHolderId: "parent-1",
      registrationType: "my_child",
      packageSelected: "youth-club-full-season",
      teamAssignmentStatus: "pending",
      isActive: true,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(playerUser2.id, playerUser2);
    
    const coachUser: User = {
      id: "coach-1",
      organizationId: "default-org",
      email: "john.smith@example.com",
      role: "coach",
      firstName: "John",
      lastName: "Smith",
      phoneNumber: "(555) 987-6543",
      isActive: true,
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(coachUser.id, coachUser);
    
    const independentPlayer: User = {
      id: "player-3",
      organizationId: "default-org",
      email: "alex.rodriguez@example.com",
      role: "player",
      firstName: "Alex",
      lastName: "Rodriguez",
      dateOfBirth: "2009-11-08",
      gender: "male",
      registrationType: "myself",
      packageSelected: "hs-club-full",
      teamAssignmentStatus: "assigned",
      isActive: true,
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(independentPlayer.id, independentPlayer);
    
    // Create default packages
    const packages: Program[] = [
      // HS Club
      {
        id: "hs-club-full",
        organizationId: "default-org",
        name: "HS Club - Pay in Full",
        description: "High School Club full season payment",
        price: 207000, // $2,070
        pricingModel: "one-time",
        category: "High School Club",
        ageGroups: ["14-18"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "hs-club-installments",
        organizationId: "default-org",
        name: "HS Club - Installment Plan",
        description: "High School Club payment plan (4 installments)",
        price: 237000, // $2,370 total
        pricingModel: "installments",
        installments: 4,
        installmentPrice: 59250, // $592.50
        category: "High School Club",
        ageGroups: ["14-18"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Skills Academy - K-7th
      {
        id: "sa-k7-monthly",
        organizationId: "default-org",
        name: "Skills Academy K-7th - Monthly",
        description: "Monthly enrollment for K-7th grade division",
        price: 20500, // $205
        pricingModel: "monthly",
        duration: "1 month",
        category: "Skills Academy",
        ageGroups: ["5-13"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "sa-k7-3month",
        organizationId: "default-org",
        name: "Skills Academy K-7th - 3 Month",
        description: "Pay in full for 3 months (K-7th grade)",
        price: 58500, // $585
        pricingModel: "one-time",
        duration: "3 months",
        category: "Skills Academy",
        ageGroups: ["5-13"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Skills Academy - Elite
      {
        id: "sa-elite-monthly",
        organizationId: "default-org",
        name: "SA Elite - Monthly",
        description: "Skills Academy Elite program monthly",
        price: 23500, // $235
        pricingModel: "monthly",
        duration: "1 month",
        category: "Skills Academy",
        ageGroups: ["8-17"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Skills Academy - Advanced
      {
        id: "sa-advanced-monthly",
        organizationId: "default-org",
        name: "SA Advanced - Monthly",
        description: "Skills Academy Advanced program monthly",
        price: 23500, // $235
        pricingModel: "monthly",
        duration: "1 month",
        category: "Skills Academy",
        ageGroups: ["8-17"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Skills Academy - Intermediate
      {
        id: "sa-intermediate-monthly",
        organizationId: "default-org",
        name: "SA Intermediate - Monthly",
        description: "Skills Academy Intermediate program monthly",
        price: 23500, // $235
        pricingModel: "monthly",
        duration: "1 month",
        category: "Skills Academy",
        ageGroups: ["8-17"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Skills Academy - Beginner
      {
        id: "sa-beginner-monthly",
        organizationId: "default-org",
        name: "SA Beginner - Monthly",
        description: "Skills Academy Beginner program monthly",
        price: 23500, // $235
        pricingModel: "monthly",
        duration: "1 month",
        category: "Skills Academy",
        ageGroups: ["8-17"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Skills Academy - Special Needs
      {
        id: "sa-special-needs-monthly",
        organizationId: "default-org",
        name: "SA Special Needs - Monthly",
        description: "Skills Academy Special Needs program monthly",
        price: 22500, // $225
        pricingModel: "monthly",
        duration: "1 month",
        category: "Skills Academy",
        ageGroups: ["5-17"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Youth Club
      {
        id: "youth-club-3month",
        organizationId: "default-org",
        name: "Youth Club - 3 Month",
        description: "Youth Club 3-month pay in full",
        price: 90000, // $900
        pricingModel: "one-time",
        duration: "3 months",
        category: "Youth Club",
        ageGroups: ["8-14"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "youth-club-6month",
        organizationId: "default-org",
        name: "Youth Club - 6 Month",
        description: "Youth Club 6-month pay in full",
        price: 165000, // $1,650
        pricingModel: "one-time",
        duration: "6 months",
        category: "Youth Club",
        ageGroups: ["8-14"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "youth-club-monthly",
        organizationId: "default-org",
        name: "Youth Club - Monthly",
        description: "Youth Club monthly enrollment",
        price: 32500, // $325
        pricingModel: "monthly",
        duration: "1 month",
        category: "Youth Club",
        ageGroups: ["8-14"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // FNH - The League
      {
        id: "fnh-monthly",
        organizationId: "default-org",
        name: "FNH - The League Monthly",
        description: "Friday Night Hoops league monthly",
        price: 16500, // $165
        pricingModel: "monthly",
        duration: "1 month",
        category: "Youth Club",
        ageGroups: ["8-14"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // FNH + SA Combo
      {
        id: "fnh-sa-combo-monthly",
        organizationId: "default-org",
        name: "FNH + SA Combo - Monthly",
        description: "Friday Night Hoops + Skills Academy combo monthly",
        price: 26500, // $265
        pricingModel: "monthly",
        duration: "1 month",
        category: "Youth Club",
        ageGroups: ["8-14"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "fnh-sa-combo-3month",
        organizationId: "default-org",
        name: "FNH + SA Combo - 3 Month",
        description: "Friday Night Hoops + Skills Academy combo 3-month pay in full",
        price: 76500, // $765
        pricingModel: "one-time",
        duration: "3 months",
        category: "Youth Club",
        ageGroups: ["8-14"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Private Training
      {
        id: "private-training-member",
        organizationId: "default-org",
        name: "Private Training - BoxStat Member",
        description: "One-on-one private training for BoxStat members",
        price: 8500, // $85
        pricingModel: "per-session",
        duration: "per hour",
        category: "Private Training",
        ageGroups: [],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "private-training-nonmember",
        organizationId: "default-org",
        name: "Private Training - Non-BoxStat",
        description: "One-on-one private training for non-members",
        price: 12000, // $120
        pricingModel: "per-session",
        duration: "per hour",
        category: "Private Training",
        ageGroups: [],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Camp
      {
        id: "camp-early-bird",
        organizationId: "default-org",
        name: "Camp - Early Bird",
        description: "Summer camp early bird pricing (until May 1, 2025)",
        price: 24500, // $245
        pricingModel: "one-time",
        category: "Camps",
        ageGroups: ["8-17"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "camp-regular",
        organizationId: "default-org",
        name: "Camp - Regular Price",
        description: "Summer camp regular pricing",
        price: 29500, // $295
        pricingModel: "one-time",
        category: "Camps",
        ageGroups: ["8-17"],
        isActive: true,
        createdAt: new Date(),
      },
      
      // Foundation Program
      {
        id: "foundation-flat",
        organizationId: "default-org",
        name: "Foundation Program - Flat Rate",
        description: "Foundation program single session",
        price: 9500, // $95
        pricingModel: "per-session",
        category: "Foundation",
        ageGroups: ["5-10"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "foundation-12week",
        organizationId: "default-org",
        name: "Foundation Program - 12 Week",
        description: "Foundation program 12-week pay in full (discounted)",
        price: 25000, // $250
        pricingModel: "one-time",
        duration: "12 weeks",
        category: "Foundation",
        ageGroups: ["5-10"],
        isActive: true,
        createdAt: new Date(),
      },
    ];
    
    packages.forEach(pkg => this.programs.set(pkg.id, pkg));
  }
  
  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }
  
  async getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined> {
    return Array.from(this.organizations.values()).find(org => org.subdomain === subdomain);
  }
  
  async createOrganization(org: Omit<Organization, "id" | "createdAt" | "updatedAt">): Promise<Organization> {
    const newOrg: Organization = {
      ...org,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.set(newOrg.id, newOrg);
    return newOrg;
  }
  
  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | undefined> {
    const org = this.organizations.get(id);
    if (!org) return undefined;
    
    const updated = { ...org, ...updates, updatedAt: new Date() };
    this.organizations.set(id, updated);
    return updated;
  }
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string, organizationId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.email === email && user.organizationId === organizationId
    );
  }
  
  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.organizationId === organizationId);
  }
  
  async getUsersByTeam(teamId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.teamId === teamId);
  }
  
  async getUsersByRole(organizationId: string, role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.organizationId === organizationId && user.role === role
    );
  }
  
  async getAccountProfiles(accountId: string): Promise<User[]> {
    const parent = this.users.get(accountId);
    const children = Array.from(this.users.values()).filter(
      user => user.accountHolderId === accountId
    );
    return parent ? [parent, ...children] : children;
  }
  
  async getPlayersByParent(parentId: string): Promise<User[]> {
    // Get all player profiles where accountHolderId matches the parent
    return Array.from(this.users.values()).filter(
      user => user.accountHolderId === parentId && user.role === 'player'
    );
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.generateId(),
      isActive: user.isActive ?? true,
      verified: user.verified ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { 
      ...user, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.users.set(id, updated);
    return updated;
  }
  
  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }
  
  // Pending Registration operations
  async getPendingRegistration(email: string, organizationId: string) {
    const key = `${email}-${organizationId}`;
    return this.pendingRegistrations.get(key);
  }
  
  async getPendingRegistrationByToken(token: string, organizationId: string) {
    for (const pending of this.pendingRegistrations.values()) {
      if (pending.verificationToken === token && pending.organizationId === organizationId) {
        return pending;
      }
    }
    return undefined;
  }
  
  async createPendingRegistration(email: string, organizationId: string, verificationToken: string, verificationExpiry: Date, sourcePlatform?: string, sessionId?: string) {
    const key = `${email}-${organizationId}`;
    const pending = {
      id: this.nextPendingRegId++,
      email,
      organizationId,
      verificationToken,
      verificationExpiry: verificationExpiry.toISOString(),
      verified: false,
      sourcePlatform: sourcePlatform || 'web',
      sessionId: sessionId || null,
      createdAt: new Date().toISOString()
    };
    this.pendingRegistrations.set(key, pending);
    return pending;
  }
  
  async updatePendingRegistration(email: string, organizationId: string, verified: boolean) {
    const key = `${email}-${organizationId}`;
    const pending = this.pendingRegistrations.get(key);
    if (pending) {
      pending.verified = verified;
      this.pendingRegistrations.set(key, pending);
    }
  }
  
  async deletePendingRegistration(email: string, organizationId: string) {
    const key = `${email}-${organizationId}`;
    this.pendingRegistrations.delete(key);
  }
  
  // Team operations
  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(parseInt(id));
  }
  
  async getTeamsByOrganization(organizationId: string): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(team => team.organizationId === organizationId);
  }
  
  async getTeamsByCoach(coachId: string): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(team => 
      team.coachId === coachId || team.assistantCoachIds?.includes(coachId)
    );
  }
  
  async createTeam(team: InsertTeam): Promise<Team> {
    const now = new Date();
    const id = this.nextTeamId++;
    const newTeam: Team = {
      id,
      organizationId: team.organizationId,
      name: team.name,
      programId: team.programId,
      programType: team.programType,
      divisionId: team.divisionId,
      coachId: team.coachId,
      assistantCoachIds: team.assistantCoachIds ?? [],
      season: team.season,
      organization: team.organization,
      location: team.location,
      scheduleLink: team.scheduleLink,
      rosterSize: team.rosterSize ?? 0,
      active: team.active ?? true,
      notes: team.notes,
      createdAt: now,
      updatedAt: now,
    };
    this.teams.set(id, newTeam);
    return newTeam;
  }
  
  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const teamId = parseInt(id);
    const team = this.teams.get(teamId);
    if (!team) return undefined;
    
    const updated = { 
      ...team, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.teams.set(teamId, updated);
    return updated;
  }
  
  async deleteTeam(id: string): Promise<void> {
    this.teams.delete(parseInt(id));
  }
  
  // Event operations
  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(parseInt(id));
  }
  
  async getEventsByOrganization(organizationId: string): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(event => event.organizationId === organizationId)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
  
  async getEventsByTeam(teamId: string): Promise<Event[]> {
    const teamIdNum = parseInt(teamId);
    return Array.from(this.events.values())
      .filter(event => event.teamId === teamIdNum)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
  
  async getUpcomingEvents(organizationId: string): Promise<Event[]> {
    const now = new Date();
    return Array.from(this.events.values())
      .filter(event => event.organizationId === organizationId && event.startTime > now && event.isActive)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
  
  async createEvent(event: InsertEvent): Promise<Event> {
    const newEvent: Event = {
      ...event,
      id: this.nextEventId++,
      eventType: event.eventType ?? 'event',
      teamId: event.teamId ? parseInt(event.teamId) : undefined,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      isActive: event.isActive ?? true,
      createdAt: new Date(),
    };
    this.events.set(newEvent.id, newEvent);
    return newEvent;
  }
  
  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const eventId = parseInt(id);
    const event = this.events.get(eventId);
    if (!event) return undefined;
    
    const updated = { ...event, ...updates };
    this.events.set(eventId, updated);
    return updated;
  }
  
  async deleteEvent(id: string): Promise<void> {
    this.events.delete(parseInt(id));
  }
  
  // Attendance operations
  async getAttendance(eventId: string, userId: string): Promise<Attendance | undefined> {
    const eventIdNum = parseInt(eventId);
    return Array.from(this.attendances.values()).find(
      att => att.eventId === eventIdNum && att.userId === userId
    );
  }
  
  async getAttendancesByEvent(eventId: string): Promise<Attendance[]> {
    const eventIdNum = parseInt(eventId);
    return Array.from(this.attendances.values()).filter(att => att.eventId === eventIdNum);
  }
  
  async getAttendancesByUser(userId: string): Promise<Attendance[]> {
    return Array.from(this.attendances.values()).filter(att => att.userId === userId);
  }
  
  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const newAttendance: Attendance = {
      ...attendance,
      id: this.generateId(),
      type: attendance.type ?? "advance",
      checkedInAt: new Date(),
    };
    this.attendances.set(newAttendance.id, newAttendance);
    return newAttendance;
  }
  
  // Award operations
  async getAward(id: string): Promise<Award | undefined> {
    return this.awards.get(id);
  }
  
  async getAwardsByOrganization(organizationId: string): Promise<Award[]> {
    return Array.from(this.awards.values()).filter(award => award.organizationId === organizationId);
  }
  
  async createAward(award: InsertAward): Promise<Award> {
    const newAward: Award = {
      ...award,
      id: this.generateId(),
      isActive: award.isActive ?? true,
      createdAt: new Date(),
    };
    this.awards.set(newAward.id, newAward);
    return newAward;
  }
  
  async updateAward(id: string, updates: Partial<Award>): Promise<Award | undefined> {
    const award = this.awards.get(id);
    if (!award) return undefined;
    
    const updated = { ...award, ...updates };
    this.awards.set(id, updated);
    return updated;
  }
  
  async deleteAward(id: string): Promise<void> {
    this.awards.delete(id);
  }
  
  // User Award operations
  async getUserAwards(userId: string): Promise<UserAward[]> {
    return Array.from(this.userAwards.values()).filter(ua => ua.userId === userId);
  }
  
  async awardUser(userAward: InsertUserAward): Promise<UserAward> {
    const newUserAward: UserAward = {
      ...userAward,
      id: this.generateId(),
      earnedAt: new Date(),
    };
    this.userAwards.set(newUserAward.id, newUserAward);
    return newUserAward;
  }
  
  // Award Definition operations (new awards system)
  async getAwardDefinitions(organizationId: string): Promise<SelectAwardDefinition[]> {
    return Array.from(this.awardDefinitions.values())
      .filter(def => !def.organizationId || def.organizationId === organizationId);
  }
  
  async getAwardDefinition(id: number): Promise<SelectAwardDefinition | undefined> {
    return this.awardDefinitions.get(id);
  }
  
  async createAwardDefinition(data: InsertAwardDefinition): Promise<SelectAwardDefinition> {
    const now = new Date();
    const newAwardDef: SelectAwardDefinition = {
      id: this.nextAwardDefinitionId++,
      name: data.name,
      tier: data.tier,
      class: data.class ?? null,
      prestige: data.prestige ?? 'Prospect',
      triggerField: data.triggerField ?? null,
      triggerOperator: data.triggerOperator ?? '>=',
      triggerValue: data.triggerValue ?? null,
      triggerType: data.triggerType ?? 'count',
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      active: data.active ?? true,
      organizationId: data.organizationId ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.awardDefinitions.set(newAwardDef.id, newAwardDef);
    return newAwardDef;
  }
  
  async updateAwardDefinition(id: number, data: Partial<InsertAwardDefinition>): Promise<SelectAwardDefinition | undefined> {
    const existing = this.awardDefinitions.get(id);
    if (!existing) return undefined;
    
    const updated: SelectAwardDefinition = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.awardDefinitions.set(id, updated);
    return updated;
  }
  
  async deleteAwardDefinition(id: number): Promise<void> {
    this.awardDefinitions.delete(id);
  }
  
  async getActiveAwardDefinitions(organizationId: string): Promise<SelectAwardDefinition[]> {
    return Array.from(this.awardDefinitions.values())
      .filter(def => def.active && (!def.organizationId || def.organizationId === organizationId));
  }
  
  // User Award Record operations (new awards system)
  async getUserAwardRecords(userId: string): Promise<SelectUserAwardRecord[]> {
    return Array.from(this.userAwardRecords.values())
      .filter(record => record.userId === userId);
  }
  
  async getUserAwardsByOrganization(organizationId: string): Promise<SelectUserAwardRecord[]> {
    const orgUsers = Array.from(this.users.values())
      .filter(u => u.organizationId === organizationId)
      .map(u => u.id);
    
    return Array.from(this.userAwardRecords.values())
      .filter(record => orgUsers.includes(record.userId));
  }
  
  async createUserAward(data: InsertUserAwardRecord): Promise<SelectUserAwardRecord> {
    const newRecord: SelectUserAwardRecord = {
      id: this.nextUserAwardRecordId++,
      userId: data.userId,
      awardId: data.awardId,
      awardedAt: new Date().toISOString(),
      awardedBy: data.awardedBy ?? null,
      year: data.year ?? null,
      notes: data.notes ?? null,
      visible: data.visible ?? true,
    };
    this.userAwardRecords.set(newRecord.id, newRecord);
    return newRecord;
  }
  
  async deleteUserAward(id: number): Promise<void> {
    this.userAwardRecords.delete(id);
  }
  
  async checkUserHasAward(userId: string, awardId: number, year?: number): Promise<boolean> {
    const userAwards = Array.from(this.userAwardRecords.values())
      .filter(record => record.userId === userId && record.awardId === awardId);
    
    if (year !== undefined) {
      return userAwards.some(record => record.year === year);
    }
    
    return userAwards.length > 0;
  }
  
  // User Award Tracking Fields
  async updateUserAwardTracking(userId: string, updates: Partial<{totalPractices: number; totalGames: number; consecutiveCheckins: number; videosCompleted: number; yearsActive: number; awards: any[]}>): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    
    const updatedUser: User = {
      ...user,
      totalPractices: updates.totalPractices ?? user.totalPractices,
      totalGames: updates.totalGames ?? user.totalGames,
      consecutiveCheckins: updates.consecutiveCheckins ?? user.consecutiveCheckins,
      videosCompleted: updates.videosCompleted ?? user.videosCompleted,
      yearsActive: updates.yearsActive ?? user.yearsActive,
      awards: updates.awards ?? user.awards,
    };
    this.users.set(userId, updatedUser);
  }
  
  // Announcement operations
  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    return this.announcements.get(id);
  }
  
  async getAnnouncementsByOrganization(organizationId: string): Promise<Announcement[]> {
    return Array.from(this.announcements.values())
      .filter(ann => ann.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getAnnouncementsByTeam(teamId: string): Promise<Announcement[]> {
    return Array.from(this.announcements.values())
      .filter(ann => ann.teamId === teamId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const newAnnouncement: Announcement = {
      ...announcement,
      id: this.generateId(),
      priority: announcement.priority ?? "medium",
      isActive: announcement.isActive ?? true,
      createdAt: new Date(),
    };
    this.announcements.set(newAnnouncement.id, newAnnouncement);
    return newAnnouncement;
  }
  
  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined> {
    const announcement = this.announcements.get(id);
    if (!announcement) return undefined;
    
    const updated = { ...announcement, ...updates };
    this.announcements.set(id, updated);
    return updated;
  }
  
  async deleteAnnouncement(id: string): Promise<void> {
    this.announcements.delete(id);
  }
  
  // Message operations
  async getMessagesByTeam(teamId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.teamId === teamId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: this.generateId(),
      messageType: message.messageType ?? "text",
      createdAt: new Date(),
    };
    this.messages.set(newMessage.id, newMessage);
    return newMessage;
  }
  
  // Payment operations
  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async getPaymentsByOrganization(organizationId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.organizationId === organizationId);
  }
  
  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.userId === userId);
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const newPayment: Payment = {
      ...payment,
      id: this.generateId(),
      status: payment.status ?? "pending",
      currency: payment.currency ?? "usd",
      createdAt: new Date(),
    };
    this.payments.set(newPayment.id, newPayment);
    return newPayment;
  }
  
  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updated = { ...payment, ...updates };
    this.payments.set(id, updated);
    return updated;
  }
  
  // Waiver operations
  async getWaiver(id: string): Promise<Waiver | undefined> {
    return this.waivers.get(id);
  }

  async getWaiversByOrganization(organizationId: string): Promise<Waiver[]> {
    return Array.from(this.waivers.values()).filter(w => w.organizationId === organizationId);
  }

  async createWaiver(waiver: InsertWaiver): Promise<Waiver> {
    const newWaiver: Waiver = {
      ...waiver,
      id: `waiver-${this.generateId()}`,
      requiresScroll: waiver.requiresScroll ?? true,
      requiresCheckbox: waiver.requiresCheckbox ?? true,
      checkboxLabel: waiver.checkboxLabel ?? "I have read and agree to the terms above",
      isBuiltIn: waiver.isBuiltIn ?? false,
      isActive: waiver.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.waivers.set(newWaiver.id, newWaiver);
    return newWaiver;
  }

  async updateWaiver(id: string, updates: Partial<Waiver>): Promise<Waiver | undefined> {
    const waiver = this.waivers.get(id);
    if (!waiver) return undefined;
    
    const updated = { ...waiver, ...updates, updatedAt: new Date().toISOString() };
    this.waivers.set(id, updated);
    return updated;
  }

  async deleteWaiver(id: string): Promise<void> {
    this.waivers.delete(id);
  }
  
  // Program operations
  async getProgram(id: string): Promise<Program | undefined> {
    return this.programs.get(id);
  }
  
  async getProgramsByOrganization(organizationId: string): Promise<Program[]> {
    return Array.from(this.programs.values()).filter(program => program.organizationId === organizationId);
  }
  
  async createProgram(program: InsertProgram): Promise<Program> {
    const newProgram: Program = {
      ...program,
      id: this.generateId(),
      ageGroups: program.ageGroups ?? [],
      tags: program.tags ?? [],
      eventTypes: program.eventTypes ?? [],
      coverageScope: program.coverageScope ?? [],
      linkedAwards: program.linkedAwards ?? [],
      autoAssignPlayers: program.autoAssignPlayers ?? false,
      isActive: program.isActive ?? true,
      // Social toggle fields
      hasSubgroups: program.hasSubgroups ?? true,
      subgroupLabel: program.subgroupLabel ?? 'Team',
      rosterVisibility: program.rosterVisibility ?? 'members',
      chatMode: program.chatMode ?? 'two_way',
      createdAt: new Date(),
    };
    this.programs.set(newProgram.id, newProgram);
    return newProgram;
  }
  
  async updateProgram(id: string, updates: Partial<Program>): Promise<Program | undefined> {
    const program = this.programs.get(id);
    if (!program) return undefined;
    
    const updated = { ...program, ...updates };
    this.programs.set(id, updated);
    return updated;
  }
  
  async deleteProgram(id: string): Promise<void> {
    this.programs.delete(id);
  }
  
  // Program Suggested Add-ons operations (in-memory)
  private suggestedAddOns: Map<string, ProgramSuggestedAddOn> = new Map();
  private suggestedAddOnId = 1;
  
  async getSuggestedAddOns(programId: string): Promise<ProgramSuggestedAddOn[]> {
    return Array.from(this.suggestedAddOns.values()).filter(a => a.programId === programId);
  }
  
  async getSuggestedAddOnsWithProducts(programId: string): Promise<{ addOn: ProgramSuggestedAddOn; product: Program }[]> {
    const addOns = await this.getSuggestedAddOns(programId);
    const result: { addOn: ProgramSuggestedAddOn; product: Program }[] = [];
    for (const addOn of addOns) {
      const product = await this.getProgram(addOn.productId);
      if (product) {
        result.push({ addOn, product });
      }
    }
    return result.sort((a, b) => (a.addOn.displayOrder ?? 0) - (b.addOn.displayOrder ?? 0));
  }
  
  async addSuggestedAddOn(data: InsertProgramSuggestedAddOn): Promise<ProgramSuggestedAddOn> {
    const addOn: ProgramSuggestedAddOn = {
      id: this.suggestedAddOnId++,
      programId: data.programId,
      productId: data.productId,
      displayOrder: data.displayOrder ?? 0,
      isRequired: data.isRequired ?? false,
      createdAt: new Date().toISOString(),
    };
    this.suggestedAddOns.set(`${data.programId}-${data.productId}`, addOn);
    return addOn;
  }
  
  async removeSuggestedAddOn(programId: string, productId: string): Promise<void> {
    this.suggestedAddOns.delete(`${programId}-${productId}`);
  }
  
  async setProgramSuggestedAddOns(programId: string, productIds: string[]): Promise<void> {
    // Remove existing add-ons for this program
    for (const key of Array.from(this.suggestedAddOns.keys())) {
      if (key.startsWith(`${programId}-`)) {
        this.suggestedAddOns.delete(key);
      }
    }
    // Add new add-ons
    for (let i = 0; i < productIds.length; i++) {
      await this.addSuggestedAddOn({
        programId,
        productId: productIds[i],
        displayOrder: i,
        isRequired: false,
      });
    }
  }
  
  async getProductsWithSuggestedPrograms(productId: string): Promise<string[]> {
    const programIds: string[] = [];
    for (const addOn of Array.from(this.suggestedAddOns.values())) {
      if (addOn.productId === productId) {
        programIds.push(addOn.programId);
      }
    }
    return programIds;
  }
  
  // Package Selection operations
  async getPackageSelection(id: string): Promise<PackageSelection | undefined> {
    return this.packageSelections.get(id);
  }
  
  async getPackageSelectionsByParent(parentUserId: string): Promise<PackageSelection[]> {
    return Array.from(this.packageSelections.values()).filter(
      selection => selection.parentUserId === parentUserId
    );
  }
  
  async getPackageSelectionsByChild(childUserId: string): Promise<PackageSelection[]> {
    return Array.from(this.packageSelections.values()).filter(
      selection => selection.childUserId === childUserId
    );
  }
  
  async createPackageSelection(selection: InsertPackageSelection): Promise<PackageSelection> {
    const newSelection: PackageSelection = {
      ...selection,
      id: this.generateId(),
      isPaid: selection.isPaid ?? false,
      createdAt: new Date(),
    };
    this.packageSelections.set(newSelection.id, newSelection);
    return newSelection;
  }
  
  async updatePackageSelection(id: string, updates: Partial<PackageSelection>): Promise<PackageSelection | undefined> {
    const selection = this.packageSelections.get(id);
    if (!selection) return undefined;
    
    const updated = { ...selection, ...updates };
    this.packageSelections.set(id, updated);
    return updated;
  }
  
  async deletePackageSelection(id: string): Promise<void> {
    this.packageSelections.delete(id);
  }
  
  async markPackageSelectionPaid(id: string): Promise<PackageSelection | undefined> {
    const selection = this.packageSelections.get(id);
    if (!selection) return undefined;
    
    const updated = { ...selection, isPaid: true };
    this.packageSelections.set(id, updated);
    return updated;
  }
  
  // Division operations
  async getDivision(id: number): Promise<Division | undefined> {
    const division = this.divisions.get(id);
    if (!division) return undefined;
    return { ...division, id: id.toString() };
  }
  
  async getDivisionsByOrganization(organizationId: string): Promise<Division[]> {
    return Array.from(this.divisions.values())
      .filter(division => division.organizationId === organizationId)
      .map(division => ({ ...division, id: division.id.toString() }));
  }
  
  async createDivision(division: InsertDivision): Promise<Division> {
    const id = this.nextDivisionId++;
    const newDivision: Division = {
      ...division,
      id: id.toString(),
      teamIds: division.teamIds ?? [],
      isActive: division.isActive ?? true,
      createdAt: new Date(),
    };
    this.divisions.set(id, newDivision as any);
    return newDivision;
  }
  
  async updateDivision(id: number, updates: Partial<Division>): Promise<Division | undefined> {
    const division = this.divisions.get(id);
    if (!division) return undefined;
    
    const updated = { ...division, ...updates, id: id.toString() };
    this.divisions.set(id, updated as any);
    return updated;
  }
  
  async deleteDivision(id: number): Promise<void> {
    this.divisions.delete(id);
  }
  
  // Skill operations
  async getSkill(id: number): Promise<Skill | undefined> {
    const skill = this.skills.get(id);
    if (!skill) return undefined;
    return { ...skill, id: id.toString() };
  }
  
  async getSkillsByOrganization(organizationId: string): Promise<Skill[]> {
    return Array.from(this.skills.values())
      .filter(skill => skill.organizationId === organizationId)
      .map(skill => ({ ...skill, id: skill.id.toString() }));
  }
  
  async getSkillsByPlayer(playerId: string): Promise<Skill[]> {
    return Array.from(this.skills.values())
      .filter(skill => skill.playerId === playerId)
      .map(skill => ({ ...skill, id: skill.id.toString() }));
  }
  
  async createSkill(skill: InsertSkill): Promise<Skill> {
    const id = this.nextSkillId++;
    const newSkill: Skill = {
      ...skill,
      id: id.toString(),
      evaluatedAt: new Date(),
      createdAt: new Date(),
    };
    this.skills.set(id, newSkill as any);
    return newSkill;
  }
  
  async updateSkill(id: number, updates: Partial<Skill>): Promise<Skill | undefined> {
    const skill = this.skills.get(id);
    if (!skill) return undefined;
    
    const updated = { ...skill, ...updates, id: id.toString() };
    this.skills.set(id, updated as any);
    return updated;
  }
  
  async deleteSkill(id: number): Promise<void> {
    this.skills.delete(id);
  }
  
  // Evaluation operations
  async getEvaluation(id: number): Promise<Evaluation | undefined> {
    const evaluation = this.evaluations.get(id);
    if (!evaluation) return undefined;
    return { ...evaluation, id };
  }
  
  async getEvaluationsByOrganization(organizationId: string): Promise<Evaluation[]> {
    return Array.from(this.evaluations.values())
      .filter(evaluation => evaluation.organizationId === organizationId)
      .map(evaluation => ({ ...evaluation, id: evaluation.id }));
  }
  
  async getEvaluationsByPlayer(playerId: string): Promise<Evaluation[]> {
    return Array.from(this.evaluations.values())
      .filter(evaluation => evaluation.playerId === playerId)
      .map(evaluation => ({ ...evaluation, id: evaluation.id }));
  }
  
  async getEvaluationByPlayerQuarter(playerId: string, quarter: string, year: number): Promise<Evaluation | undefined> {
    return Array.from(this.evaluations.values()).find(
      evaluation => evaluation.playerId === playerId && evaluation.quarter === quarter && evaluation.year === year
    );
  }
  
  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    // Check if evaluation already exists for this player/quarter/year (upsert logic)
    const existing = await this.getEvaluationByPlayerQuarter(evaluation.playerId, evaluation.quarter, evaluation.year);
    
    if (existing) {
      // Update existing evaluation
      const updated: Evaluation = {
        ...existing,
        coachId: evaluation.coachId,
        scores: evaluation.scores,
        notes: evaluation.notes,
        updatedAt: new Date(),
      };
      this.evaluations.set(existing.id, updated);
      return updated;
    }
    
    // Create new evaluation
    const id = this.nextEvaluationId++;
    const now = new Date();
    const newEvaluation: Evaluation = {
      ...evaluation,
      id,
      scores: evaluation.scores || {},
      createdAt: now,
      updatedAt: now,
    };
    this.evaluations.set(id, newEvaluation);
    return newEvaluation;
  }
  
  async updateEvaluation(id: number, updates: Partial<Evaluation>): Promise<Evaluation | undefined> {
    const evaluation = this.evaluations.get(id);
    if (!evaluation) return undefined;
    
    const updated = { ...evaluation, ...updates, id, updatedAt: new Date() };
    this.evaluations.set(id, updated);
    return updated;
  }
  
  async deleteEvaluation(id: number): Promise<void> {
    this.evaluations.delete(id);
  }
  
  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    return { ...notification, id: id.toString() };
  }
  
  async getNotificationsByOrganization(organizationId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.organizationId === organizationId)
      .map(notification => ({ ...notification, id: notification.id.toString() }));
  }
  
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.recipientIds.includes(userId))
      .map(notification => ({ ...notification, id: notification.id.toString() }));
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.nextNotificationId++;
    const newNotification: Notification = {
      ...notification,
      id: id.toString(),
      readBy: notification.readBy ?? [],
      sentAt: new Date(),
      status: notification.status ?? 'pending',
      createdAt: new Date(),
    };
    this.notifications.set(id, newNotification as any);
    return newNotification;
  }
  
  async updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updated = { ...notification, ...updates, id: id.toString() };
    this.notifications.set(id, updated as any);
    return updated;
  }
  
  async deleteNotification(id: number): Promise<void> {
    this.notifications.delete(id);
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    // Mark as read by updating status to 'sent' (since there's no isRead field)
    const updated = { ...notification, id: id.toString(), status: 'sent' };
    this.notifications.set(id, updated as any);
    return updated;
  }
  
  // Event Window operations
  async getEventWindow(id: number): Promise<EventWindow | undefined> {
    return this.eventWindows.get(id);
  }
  
  async getEventWindowsByEvent(eventId: number): Promise<EventWindow[]> {
    return Array.from(this.eventWindows.values()).filter(w => w.eventId === eventId);
  }
  
  async createEventWindow(window: InsertEventWindow): Promise<EventWindow> {
    const id = this.nextEventWindowId++;
    const newWindow: EventWindow = {
      ...window,
      id,
      isDefault: window.isDefault ?? false,
      createdAt: new Date(),
    };
    this.eventWindows.set(id, newWindow);
    return newWindow;
  }
  
  async updateEventWindow(id: number, updates: Partial<EventWindow>): Promise<EventWindow | undefined> {
    const window = this.eventWindows.get(id);
    if (!window) return undefined;
    
    const updated = { ...window, ...updates, id };
    this.eventWindows.set(id, updated);
    return updated;
  }
  
  async deleteEventWindow(id: number): Promise<void> {
    this.eventWindows.delete(id);
  }
  
  async deleteEventWindowsByEvent(eventId: number): Promise<void> {
    const windowsToDelete = Array.from(this.eventWindows.entries())
      .filter(([, w]) => w.eventId === eventId)
      .map(([id]) => id);
    
    windowsToDelete.forEach(id => this.eventWindows.delete(id));
  }
  
  // RSVP Response operations
  async getRsvpResponse(id: number): Promise<RsvpResponse | undefined> {
    return this.rsvpResponses.get(id);
  }
  
  async getRsvpResponsesByEvent(eventId: number): Promise<RsvpResponse[]> {
    return Array.from(this.rsvpResponses.values()).filter(r => r.eventId === eventId);
  }
  
  async getRsvpResponseByUserAndEvent(userId: string, eventId: number): Promise<RsvpResponse | undefined> {
    return Array.from(this.rsvpResponses.values()).find(r => r.userId === userId && r.eventId === eventId);
  }
  
  async createRsvpResponse(response: InsertRsvpResponse): Promise<RsvpResponse> {
    const id = this.nextRsvpResponseId++;
    const now = new Date();
    const newResponse: RsvpResponse = {
      ...response,
      id,
      respondedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.rsvpResponses.set(id, newResponse);
    return newResponse;
  }
  
  async updateRsvpResponse(id: number, updates: Partial<RsvpResponse>): Promise<RsvpResponse | undefined> {
    const response = this.rsvpResponses.get(id);
    if (!response) return undefined;
    
    const updated = { ...response, ...updates, id, updatedAt: new Date() };
    this.rsvpResponses.set(id, updated);
    return updated;
  }
  
  async deleteRsvpResponse(id: number): Promise<void> {
    this.rsvpResponses.delete(id);
  }
  
  // Facility operations (MemStorage stub - not used in production)
  async getFacility(id: number): Promise<Facility | undefined> {
    return undefined;
  }
  
  async getFacilitiesByOrganization(organizationId: string): Promise<Facility[]> {
    return [];
  }
  
  async createFacility(facility: InsertFacility): Promise<Facility> {
    const now = new Date();
    return {
      id: 1,
      organizationId: facility.organizationId,
      name: facility.name,
      address: facility.address,
      latitude: facility.latitude,
      longitude: facility.longitude,
      isActive: facility.isActive ?? true,
      createdAt: now,
      createdBy: facility.createdBy,
    };
  }
  
  async updateFacility(id: number, updates: Partial<Facility>): Promise<Facility | undefined> {
    return undefined;
  }
  
  async deleteFacility(id: number): Promise<void> {
    return;
  }
  
  // Migration Lookup operations
  async getMigrationLookupsByEmail(email: string): Promise<SelectMigrationLookup[]> {
    const results: SelectMigrationLookup[] = [];
    this.migrationLookups.forEach(lookup => {
      if (lookup.email.toLowerCase() === email.toLowerCase() && !lookup.isClaimed) {
        results.push(lookup);
      }
    });
    return results;
  }
  
  async createMigrationLookup(data: InsertMigrationLookup): Promise<SelectMigrationLookup> {
    const now = new Date();
    const lookup: SelectMigrationLookup = {
      id: this.nextMigrationLookupId++,
      email: data.email,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      productName: data.productName,
      isClaimed: data.isClaimed ?? false,
      createdAt: now.toISOString(),
    };
    this.migrationLookups.set(lookup.id, lookup);
    return lookup;
  }
  
  async markMigrationLookupClaimed(id: number): Promise<void> {
    const lookup = this.migrationLookups.get(id);
    if (lookup) {
      lookup.isClaimed = true;
      this.migrationLookups.set(id, lookup);
    }
  }
  
  // Subscription operations
  async getSubscription(id: number): Promise<SelectSubscription | undefined> {
    return this.subscriptionsStore.get(id);
  }
  
  async getSubscriptionsByOwner(ownerUserId: string): Promise<SelectSubscription[]> {
    const results: SelectSubscription[] = [];
    this.subscriptionsStore.forEach(sub => {
      if (sub.ownerUserId === ownerUserId) {
        results.push(sub);
      }
    });
    return results;
  }
  
  async getUnassignedSubscriptionsByOwner(ownerUserId: string): Promise<SelectSubscription[]> {
    const results: SelectSubscription[] = [];
    this.subscriptionsStore.forEach(sub => {
      if (sub.ownerUserId === ownerUserId && !sub.assignedPlayerId) {
        results.push(sub);
      }
    });
    return results;
  }
  
  async getSubscriptionsByPlayerId(playerId: string): Promise<SelectSubscription[]> {
    const results: SelectSubscription[] = [];
    this.subscriptionsStore.forEach(sub => {
      if (sub.assignedPlayerId === playerId && sub.status === 'active') {
        results.push(sub);
      }
    });
    return results;
  }
  
  async createSubscription(data: InsertSubscription): Promise<SelectSubscription> {
    const now = new Date();
    const subscription: SelectSubscription = {
      id: this.nextSubscriptionId++,
      ownerUserId: data.ownerUserId,
      assignedPlayerId: data.assignedPlayerId ?? null,
      stripeCustomerId: data.stripeCustomerId ?? null,
      stripeSubscriptionId: data.stripeSubscriptionId,
      productName: data.productName,
      status: data.status ?? 'active',
      isMigrated: data.isMigrated ?? false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.subscriptionsStore.set(subscription.id, subscription);
    return subscription;
  }
  
  async assignSubscriptionToPlayer(subscriptionId: number, playerId: string): Promise<SelectSubscription | undefined> {
    const subscription = this.subscriptionsStore.get(subscriptionId);
    if (subscription) {
      subscription.assignedPlayerId = playerId;
      subscription.updatedAt = new Date().toISOString();
      this.subscriptionsStore.set(subscriptionId, subscription);
      return subscription;
    }
    return undefined;
  }
  
  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<SelectSubscription | undefined> {
    const subscription = this.subscriptionsStore.get(id);
    if (subscription) {
      const updated = { ...subscription, ...updates, updatedAt: new Date().toISOString() };
      this.subscriptionsStore.set(id, updated as SelectSubscription);
      return updated as SelectSubscription;
    }
    return undefined;
  }
  
  // Credit/Enrollment operations (MemStorage tracks product enrollments in memory)
  async getActiveEnrollmentsWithCredits(playerId: string): Promise<ProductEnrollment[]> {
    const enrollments: ProductEnrollment[] = [];
    for (const enrollment of this.enrollmentsStore.values()) {
      if (enrollment.profileId === playerId && enrollment.status === 'active') {
        enrollments.push(enrollment);
      }
    }
    return enrollments;
  }
  
  async createEnrollment(data: InsertProductEnrollment): Promise<ProductEnrollment> {
    const id = this.nextEnrollmentId++;
    const now = new Date().toISOString();
    const enrollment: ProductEnrollment = {
      id,
      organizationId: data.organizationId,
      programId: data.programId,
      accountHolderId: data.accountHolderId,
      profileId: data.profileId ?? null,
      status: data.status ?? 'active',
      source: data.source ?? 'direct',
      paymentId: data.paymentId ?? null,
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      startDate: data.startDate ?? now,
      endDate: data.endDate ?? null,
      autoRenew: data.autoRenew ?? false, // Default to false, subscriptions will explicitly pass true
      totalCredits: data.totalCredits ?? null,
      remainingCredits: data.remainingCredits ?? null,
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.enrollmentsStore.set(id, enrollment);
    return enrollment;
  }
  
  async deductEnrollmentCredit(enrollmentId: number): Promise<ProductEnrollment | undefined> {
    const enrollment = this.enrollmentsStore.get(enrollmentId);
    if (enrollment && enrollment.remainingCredits && enrollment.remainingCredits > 0) {
      enrollment.remainingCredits--;
      enrollment.updatedAt = new Date().toISOString();
      this.enrollmentsStore.set(enrollmentId, enrollment);
      return enrollment;
    }
    return undefined;
  }
  
  async getPlayerStatusTag(playerId: string): Promise<{tag: string; remainingCredits?: number; lowBalance?: boolean}> {
    const player = await this.getUser(playerId);
    
    if (!player) {
      return { tag: 'none' };
    }
    
    // Priority 1: Payment Due
    if (player.paymentStatus === 'pending' || player.paymentStatus === 'overdue') {
      return { tag: 'payment_due' };
    }
    
    // Get enrollments for this player
    const enrollments = await this.getActiveEnrollmentsWithCredits(playerId);
    
    let hasSubscription = false;
    let totalCredits = 0;
    let hasLowBalance = false;
    
    for (const enrollment of enrollments) {
      const program = this.programs.get(enrollment.programId);
      const accessTag = program?.accessTag;
      
      if (accessTag === 'club_member') {
        hasSubscription = true;
      } else if (accessTag === 'pack_holder' && enrollment.remainingCredits) {
        totalCredits += enrollment.remainingCredits;
        if (enrollment.remainingCredits > 0 && enrollment.remainingCredits < 3) {
          hasLowBalance = true;
        }
      }
    }
    
    // Priority 2: Low Balance
    if (hasLowBalance) {
      return { tag: 'low_balance', remainingCredits: totalCredits, lowBalance: true };
    }
    
    // Priority 3: Club Member
    if (hasSubscription) {
      return { tag: 'club_member' };
    }
    
    // Priority 4: Pack Holder
    if (totalCredits > 0) {
      return { tag: 'pack_holder', remainingCredits: totalCredits };
    }
    
    return { tag: 'none' };
  }
  
  async getPlayerStatusTagsBulk(playerIds: string[]): Promise<Map<string, {tag: string; remainingCredits?: number; lowBalance?: boolean}>> {
    const result = new Map<string, {tag: string; remainingCredits?: number; lowBalance?: boolean}>();
    
    for (const playerId of playerIds) {
      const tag = await this.getPlayerStatusTag(playerId);
      result.set(playerId, tag);
    }
    
    return result;
  }
  
  async getProductEnrollmentsByOrganization(organizationId: string): Promise<ProductEnrollment[]> {
    const enrollments: ProductEnrollment[] = [];
    for (const enrollment of this.enrollmentsStore.values()) {
      if (enrollment.organizationId === organizationId) {
        enrollments.push(enrollment);
      }
    }
    return enrollments;
  }
  
  // Notification Campaign operations (stub implementations for MemStorage)
  private campaignsStore: Map<number, NotificationCampaign> = new Map();
  private campaignRunsStore: Map<number, NotificationCampaignRun> = new Map();
  private triggerRulesStore: Map<number, NotificationTriggerRule> = new Map();
  private triggeredLogsStore: Map<number, TriggeredNotificationLog> = new Map();
  private nextCampaignId = 1;
  private nextCampaignRunId = 1;
  private nextTriggerRuleId = 1;
  private nextTriggeredLogId = 1;
  
  async getNotificationCampaign(id: number): Promise<NotificationCampaign | undefined> {
    return this.campaignsStore.get(id);
  }
  
  async getNotificationCampaignsByOrganization(organizationId: string): Promise<NotificationCampaign[]> {
    return Array.from(this.campaignsStore.values()).filter(c => c.organizationId === organizationId);
  }
  
  async getPendingCampaigns(beforeTime: string): Promise<NotificationCampaign[]> {
    return Array.from(this.campaignsStore.values()).filter(c => 
      c.status === 'active' && c.nextRunAt && c.nextRunAt <= beforeTime
    );
  }
  
  async createNotificationCampaign(data: InsertNotificationCampaign): Promise<NotificationCampaign> {
    const now = new Date().toISOString();
    const campaign: NotificationCampaign = {
      id: this.nextCampaignId++,
      ...data,
      totalRuns: 0,
      lastRunAt: null,
      createdAt: now,
      updatedAt: now,
    } as NotificationCampaign;
    this.campaignsStore.set(campaign.id, campaign);
    return campaign;
  }
  
  async updateNotificationCampaign(id: number, updates: Partial<NotificationCampaign>): Promise<NotificationCampaign | undefined> {
    const campaign = this.campaignsStore.get(id);
    if (!campaign) return undefined;
    const updated = { ...campaign, ...updates, updatedAt: new Date().toISOString() };
    this.campaignsStore.set(id, updated);
    return updated;
  }
  
  async deleteNotificationCampaign(id: number): Promise<void> {
    this.campaignsStore.delete(id);
  }
  
  async createCampaignRun(data: InsertNotificationCampaignRun): Promise<NotificationCampaignRun> {
    const run: NotificationCampaignRun = {
      id: this.nextCampaignRunId++,
      ...data,
      createdAt: new Date().toISOString(),
    } as NotificationCampaignRun;
    this.campaignRunsStore.set(run.id, run);
    return run;
  }
  
  async updateCampaignRun(id: number, updates: Partial<NotificationCampaignRun>): Promise<NotificationCampaignRun | undefined> {
    const run = this.campaignRunsStore.get(id);
    if (!run) return undefined;
    const updated = { ...run, ...updates };
    this.campaignRunsStore.set(id, updated);
    return updated;
  }
  
  async getCampaignRunsByCampaign(campaignId: number): Promise<NotificationCampaignRun[]> {
    return Array.from(this.campaignRunsStore.values()).filter(r => r.campaignId === campaignId);
  }
  
  async getNotificationTriggerRule(id: number): Promise<NotificationTriggerRule | undefined> {
    return this.triggerRulesStore.get(id);
  }
  
  async getNotificationTriggerRulesByOrganization(organizationId: string): Promise<NotificationTriggerRule[]> {
    return Array.from(this.triggerRulesStore.values()).filter(r => r.organizationId === organizationId);
  }
  
  async getActiveNotificationTriggerRulesByType(organizationId: string, triggerType: string): Promise<NotificationTriggerRule[]> {
    return Array.from(this.triggerRulesStore.values()).filter(r => 
      r.organizationId === organizationId && r.triggerType === triggerType && r.isActive
    );
  }
  
  async createNotificationTriggerRule(data: InsertNotificationTriggerRule): Promise<NotificationTriggerRule> {
    const now = new Date().toISOString();
    const rule: NotificationTriggerRule = {
      id: this.nextTriggerRuleId++,
      ...data,
      createdAt: now,
      updatedAt: now,
    } as NotificationTriggerRule;
    this.triggerRulesStore.set(rule.id, rule);
    return rule;
  }
  
  async updateNotificationTriggerRule(id: number, updates: Partial<NotificationTriggerRule>): Promise<NotificationTriggerRule | undefined> {
    const rule = this.triggerRulesStore.get(id);
    if (!rule) return undefined;
    const updated = { ...rule, ...updates, updatedAt: new Date().toISOString() };
    this.triggerRulesStore.set(id, updated);
    return updated;
  }
  
  async deleteNotificationTriggerRule(id: number): Promise<void> {
    this.triggerRulesStore.delete(id);
  }
  
  async createTriggeredNotificationLog(data: InsertTriggeredNotificationLog): Promise<TriggeredNotificationLog> {
    const log: TriggeredNotificationLog = {
      id: this.nextTriggeredLogId++,
      ...data,
      createdAt: new Date().toISOString(),
    } as TriggeredNotificationLog;
    this.triggeredLogsStore.set(log.id, log);
    return log;
  }
  
  async getTriggeredNotificationLogsByUser(userId: string): Promise<TriggeredNotificationLog[]> {
    return Array.from(this.triggeredLogsStore.values()).filter(l => l.recipientUserId === userId);
  }
}

// =============================================
// Database Storage Implementation
// =============================================

import { db } from "./db";
import { eq, and, gte, lte, or, sql, isNull, inArray, desc } from "drizzle-orm";
import * as schema from "../shared/schema";

class DatabaseStorage implements IStorage {
  private defaultOrgId = "default-org";

  // Initialize test users for development
  async initializeTestUsers(): Promise<void> {
    // Check if admin user already exists (direct query to avoid any filter issues)
    const adminResults = await db.select().from(schema.users).where(
      eq(schema.users.email, "admin@example.com")
    );
    
    if (adminResults.length === 0) {
      try {
        await this.createUser({
          organizationId: this.defaultOrgId,
          email: "admin@example.com",
          password: Buffer.from("admin123").toString('base64'),
          role: "admin",
          firstName: "Admin",
          lastName: "User",
          verified: true,
          isActive: true,
          hasRegistered: true,
          awards: [],
          totalPractices: 0,
          totalGames: 0,
          consecutiveCheckins: 0,
          videosCompleted: 0,
          yearsActive: 0,
        });
        console.log('✅ Created pre-verified admin user: admin@example.com');
      } catch (error: any) {
        // Ignore duplicate key errors - user already exists
        if (error?.code !== '23505') {
          console.error('Error creating admin user:', error);
        }
      }
    }

    // Check if test user already exists (direct query)
    const testResults = await db.select().from(schema.users).where(
      eq(schema.users.email, "test@example.com")
    );
    
    if (testResults.length === 0) {
      try {
        await this.createUser({
          organizationId: this.defaultOrgId,
          email: "test@example.com",
          password: Buffer.from("test123").toString('base64'),
          role: "parent",
          firstName: "Test",
          lastName: "User",
          verified: true,
          isActive: true,
          hasRegistered: true,
          awards: [],
          totalPractices: 0,
          totalGames: 0,
          consecutiveCheckins: 0,
          videosCompleted: 0,
          yearsActive: 0,
        });
        console.log('✅ Created pre-verified test user: test@example.com');
      } catch (error: any) {
        // Ignore duplicate key errors - user already exists
        if (error?.code !== '23505') {
          console.error('Error creating test user:', error);
        }
      }
    }
  }
  
  async initializeFacilities(): Promise<void> {
    try {
      // Check if facilities already exist
      const existingFacilities = await this.getFacilitiesByOrganization(this.defaultOrgId);
      
      if (existingFacilities.length === 0) {
        // Get admin user to use as creator
        const adminUser = await this.getUserByEmail("test@example.com", this.defaultOrgId);
        const createdBy = adminUser?.id || "system";
        
        // Predefined facilities with addresses and coordinates
        const facilities = [
          {
            name: "Momentous Sports Center",
            address: "20950 Currier Rd, Walnut, CA 91789",
            latitude: 34.0205,
            longitude: -117.8647,
          },
          {
            name: "Ladera Sports Center",
            address: "5000 Clark Ave, Lakewood, CA 90712",
            latitude: 33.8536,
            longitude: -118.1337,
          },
          {
            name: "AIM Sports Group",
            address: "17871 Gothard St, Huntington Beach, CA 92647",
            latitude: 33.7175,
            longitude: -117.9897,
          },
          {
            name: "MAP Sports Facility",
            address: "1324 S Grand Ave, Santa Ana, CA 92705",
            latitude: 33.7295,
            longitude: -117.8661,
          },
          {
            name: "Clava Sports Facility",
            address: "8432 Stanton Ave, Buena Park, CA 90620",
            latitude: 33.8578,
            longitude: -118.0048,
          },
        ];
        
        // Create each facility
        for (const facility of facilities) {
          await this.createFacility({
            organizationId: this.defaultOrgId,
            name: facility.name,
            address: facility.address,
            latitude: facility.latitude,
            longitude: facility.longitude,
            isActive: true,
            createdBy,
          });
          console.log(`✅ Created facility: ${facility.name}`);
        }
      }
    } catch (error) {
      console.error('Error initializing facilities:', error);
    }
  }

  async initializeAwardDefinitions(): Promise<void> {
    try {
      // Check if award definitions already exist for the default organization
      const existingAwards = await this.getAwardDefinitions(this.defaultOrgId);
      
      if (existingAwards.length === 0) {
        // Define initial award definitions for all prestige levels
        const awardDefinitions = [
          // Prospect Level (Entry)
          {
            name: "First Steps",
            tier: "Badge",
            class: "Attendance",
            prestige: "Prospect",
            triggerField: "totalPractices",
            triggerOperator: ">=",
            triggerValue: "1",
            triggerType: "count",
            description: "Attend your first practice",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          {
            name: "Early Bird",
            tier: "Badge",
            class: "Time",
            prestige: "Prospect",
            triggerField: "consecutiveCheckins",
            triggerOperator: ">=",
            triggerValue: "5",
            triggerType: "count",
            description: "Check in 5 times consecutively",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          
          // Starter Level
          {
            name: "Practice Regular",
            tier: "Trophy",
            class: "Attendance",
            prestige: "Starter",
            triggerField: "totalPractices",
            triggerOperator: ">=",
            triggerValue: "10",
            triggerType: "count",
            description: "Attend 10 practices",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          {
            name: "Game Day Ready",
            tier: "Trophy",
            class: "Attendance",
            prestige: "Starter",
            triggerField: "totalGames",
            triggerOperator: ">=",
            triggerValue: "5",
            triggerType: "count",
            description: "Attend 5 games",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          
          // AllStar Level
          {
            name: "Practice Champion",
            tier: "Trophy",
            class: "Attendance",
            prestige: "AllStar",
            triggerField: "totalPractices",
            triggerOperator: ">=",
            triggerValue: "25",
            triggerType: "count",
            description: "Attend 25 practices",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          {
            name: "Game Veteran",
            tier: "Trophy",
            class: "Attendance",
            prestige: "AllStar",
            triggerField: "totalGames",
            triggerOperator: ">=",
            triggerValue: "15",
            triggerType: "count",
            description: "Attend 15 games",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          {
            name: "Dedicated Learner",
            tier: "Badge",
            class: "Training",
            prestige: "AllStar",
            triggerField: "videosCompleted",
            triggerOperator: ">=",
            triggerValue: "10",
            triggerType: "count",
            description: "Complete 10 training videos",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          
          // Superstar Level
          {
            name: "Practice Elite",
            tier: "Trophy",
            class: "Attendance",
            prestige: "Superstar",
            triggerField: "totalPractices",
            triggerOperator: ">=",
            triggerValue: "50",
            triggerType: "count",
            description: "Attend 50 practices",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          {
            name: "Game Legend",
            tier: "Trophy",
            class: "Attendance",
            prestige: "Superstar",
            triggerField: "totalGames",
            triggerOperator: ">=",
            triggerValue: "30",
            triggerType: "count",
            description: "Attend 30 games",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          {
            name: "Training Master",
            tier: "Badge",
            class: "Training",
            prestige: "Superstar",
            triggerField: "videosCompleted",
            triggerOperator: ">=",
            triggerValue: "25",
            triggerType: "count",
            description: "Complete 25 training videos",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          
          // HallOfFame Level
          {
            name: "Century Club",
            tier: "Trophy",
            class: "Attendance",
            prestige: "HallOfFame",
            triggerField: "totalPractices",
            triggerOperator: ">=",
            triggerValue: "100",
            triggerType: "count",
            description: "Attend 100 practices",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          {
            name: "Game Icon",
            tier: "Trophy",
            class: "Attendance",
            prestige: "HallOfFame",
            triggerField: "totalGames",
            triggerOperator: ">=",
            triggerValue: "50",
            triggerType: "count",
            description: "Attend 50 games",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
          {
            name: "Loyalty Award",
            tier: "Trophy",
            class: "Commitment",
            prestige: "HallOfFame",
            triggerField: "yearsActive",
            triggerOperator: ">=",
            triggerValue: "3",
            triggerType: "count",
            description: "Be active for 3 years",
            imageUrl: null,
            active: true,
            organizationId: this.defaultOrgId,
          },
        ];
        
        // Create each award definition
        for (const award of awardDefinitions) {
          await this.createAwardDefinition(award);
          console.log(`✅ Created award definition: ${award.name} (${award.prestige})`);
        }
        
        console.log(`✅ Initialized ${awardDefinitions.length} award definitions`);
      }
    } catch (error) {
      console.error('Error initializing award definitions:', error);
    }
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    try {
      const results = await db.select().from(schema.organizations).where(eq(schema.organizations.id, id));
      if (results.length === 0) return undefined;
      
      const org = results[0];
      return {
        id: org.id,
        name: org.name,
        subdomain: org.subdomain,
        sportType: org.sportType,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        logoUrl: org.logoUrl || undefined,
        terminology: org.terminology as Organization['terminology'],
        features: org.features as Organization['features'],
        createdAt: org.createdAt ? new Date(org.createdAt) : new Date(),
        updatedAt: org.updatedAt ? new Date(org.updatedAt) : new Date(),
      };
    } catch (error) {
      console.error('Error fetching organization:', error);
      return undefined;
    }
  }

  async getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined> {
    try {
      const results = await db.select().from(schema.organizations).where(eq(schema.organizations.subdomain, subdomain));
      if (results.length === 0) return undefined;
      return this.getOrganization(results[0].id);
    } catch (error) {
      console.error('Error fetching organization by subdomain:', error);
      return undefined;
    }
  }

  async createOrganization(org: Omit<Organization, "id" | "createdAt" | "updatedAt">): Promise<Organization> {
    const id = `org-${Date.now()}`;
    const now = new Date().toISOString();
    
    await db.insert(schema.organizations).values({
      id,
      name: org.name,
      subdomain: org.subdomain,
      sportType: org.sportType,
      primaryColor: org.primaryColor,
      secondaryColor: org.secondaryColor,
      logoUrl: org.logoUrl || null,
      terminology: org.terminology,
      features: org.features,
      createdAt: now,
      updatedAt: now,
    });
    
    return (await this.getOrganization(id))!;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | undefined> {
    try {
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.subdomain !== undefined) updateData.subdomain = updates.subdomain;
      if (updates.sportType !== undefined) updateData.sportType = updates.sportType;
      if (updates.primaryColor !== undefined) updateData.primaryColor = updates.primaryColor;
      if (updates.secondaryColor !== undefined) updateData.secondaryColor = updates.secondaryColor;
      if (updates.logoUrl !== undefined) updateData.logoUrl = updates.logoUrl;
      if (updates.terminology !== undefined) updateData.terminology = updates.terminology;
      if (updates.features !== undefined) updateData.features = updates.features;
      
      await db.update(schema.organizations)
        .set(updateData)
        .where(eq(schema.organizations.id, id));
      
      return this.getOrganization(id);
    } catch (error) {
      console.error('Error updating organization:', error);
      return undefined;
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // Return user regardless of isActive status - caller decides if they need to check
    const results = await db.select().from(schema.users).where(
      eq(schema.users.id, id)
    );
    if (results.length === 0) return undefined;
    
    const user = results[0];
    return this.mapDbUserToUser(user);
  }

  async getUserByEmail(email: string, organizationId: string): Promise<User | undefined> {
    // Only return parent/account holder accounts (account_holder_id IS NULL or empty)
    // Child player profiles share the parent's email but shouldn't be returned for auth
    // Strict organizationId filter for tenant isolation - coalesce to default-org
    const effectiveOrgId = organizationId || 'default-org';
    const results = await db.select().from(schema.users).where(
      and(
        eq(schema.users.email, email),
        eq(schema.users.isActive, true),
        eq(schema.users.organizationId, effectiveOrgId),
        or(
          isNull(schema.users.accountHolderId),
          eq(schema.users.accountHolderId, '')
        )
      )
    );
    if (results.length === 0) return undefined;
    
    const user = results[0];
    return this.mapDbUserToUser(user);
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    // Return ALL users (active and inactive) so admin dashboard shows complete user list
    const results = await db.select().from(schema.users).where(eq(schema.users.organizationId, organizationId));
    return results.map(user => this.mapDbUserToUser(user));
  }

  async getUsersByTeam(teamId: string): Promise<User[]> {
    const teamIdNum = parseInt(teamId);
    
    // First get users from team_memberships table (new system, active only)
    const membershipUserIds = await db.select({ profileId: schema.teamMemberships.profileId })
      .from(schema.teamMemberships)
      .where(
        and(
          eq(schema.teamMemberships.teamId, teamIdNum),
          eq(schema.teamMemberships.status, 'active')
        )
      );
    
    // Also get users from legacy teamId field
    const legacyResults = await db.select().from(schema.users).where(
      and(
        eq(schema.users.teamId, teamIdNum),
        eq(schema.users.isActive, true)
      )
    );
    
    // Combine user IDs from both sources
    const allUserIds = new Set<string>();
    membershipUserIds.forEach(m => allUserIds.add(m.profileId));
    legacyResults.forEach(u => allUserIds.add(u.id));
    
    if (allUserIds.size === 0) return [];
    
    // Fetch all unique users
    const users = await db.select().from(schema.users).where(
      and(
        sql`${schema.users.id} IN (${sql.join([...allUserIds].map(id => sql`${id}`), sql`, `)})`,
        eq(schema.users.isActive, true)
      )
    );
    
    return users.map(user => this.mapDbUserToUser(user));
  }

  async getUsersByRole(organizationId: string, role: string): Promise<User[]> {
    const results = await db.select().from(schema.users).where(
      and(
        eq(schema.users.role, role),
        eq(schema.users.isActive, true)
      )
    );
    return results.map(user => this.mapDbUserToUser(user));
  }

  async getAccountProfiles(accountId: string): Promise<User[]> {
    // Get the parent account
    const parentResults = await db.select().from(schema.users).where(
      and(
        eq(schema.users.id, accountId),
        eq(schema.users.isActive, true)
      )
    );
    
    // Get all child profiles where parentId (accountHolderId) matches
    const childResults = await db.select().from(schema.users).where(
      and(
        eq(schema.users.parentId, accountId),
        eq(schema.users.isActive, true)
      )
    );
    
    const parent = parentResults.length > 0 ? this.mapDbUserToUser(parentResults[0]) : null;
    const children = childResults.map(user => this.mapDbUserToUser(user));
    
    return parent ? [parent, ...children] : children;
  }

  async getPlayersByParent(parentId: string): Promise<User[]> {
    // Get all player profiles where parentId (accountHolderId) matches the parent
    const playerResults = await db.select().from(schema.users).where(
      and(
        eq(schema.users.parentId, parentId),
        eq(schema.users.role, 'player'),
        eq(schema.users.isActive, true)
      )
    );
    
    return playerResults.map(user => this.mapDbUserToUser(user));
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('DEBUG createUser - password received:', user.password ? '***SET***' : 'EMPTY');
    
    const dbUser = {
      id,
      organizationId: user.organizationId || 'default-org',
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      parentId: user.accountHolderId,
      teamId: user.teamId ? parseInt(user.teamId) : null,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: user.phoneNumber,
      address: user.address,
      jerseyNumber: user.jerseyNumber,
      position: user.position,
      passcode: user.passcode,
      password: user.password,
      stripeCustomerId: user.stripeCustomerId,
      userType: user.role,
      verified: user.verified || false,
      verificationToken: user.verificationToken,
      verificationExpiry: user.verificationExpiry?.toISOString(),
      magicLinkToken: user.magicLinkToken,
      magicLinkExpiry: user.magicLinkExpiry?.toISOString(),
      googleId: user.googleId,
      appleId: user.appleId,
      isActive: user.isActive ?? true,
      hasRegistered: user.hasRegistered ?? false,
      paymentStatus: user.paymentStatus,
      awards: user.awards || [],
      totalPractices: user.totalPractices || 0,
      totalGames: user.totalGames || 0,
      consecutiveCheckins: user.consecutiveCheckins || 0,
      videosCompleted: user.videosCompleted || 0,
      yearsActive: user.yearsActive || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.users).values(dbUser).returning();
    return this.mapDbUserToUser(results[0]);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const dbUpdates: any = {
      firstName: updates.firstName,
      lastName: updates.lastName,
      email: updates.email,
      profileImageUrl: updates.profileImageUrl,
      role: updates.role,
      dateOfBirth: updates.dateOfBirth,
      phoneNumber: updates.phoneNumber,
      address: updates.address,
      city: updates.city,
      height: updates.height,
      age: updates.age,
      jerseyNumber: updates.jerseyNumber,
      position: updates.position,
      passcode: updates.passcode,
      password: updates.password,
      teamId: updates.teamId ? parseInt(updates.teamId) : undefined,
      parentId: updates.accountHolderId,
      isActive: updates.isActive,
      verified: updates.verified,
      verificationToken: updates.verificationToken,
      verificationExpiry: updates.verificationExpiry instanceof Date ? updates.verificationExpiry.toISOString() : updates.verificationExpiry,
      magicLinkToken: updates.magicLinkToken,
      magicLinkExpiry: updates.magicLinkExpiry instanceof Date ? updates.magicLinkExpiry.toISOString() : updates.magicLinkExpiry,
      googleId: updates.googleId,
      appleId: updates.appleId,
      emergencyContact: updates.emergencyContact,
      emergencyPhone: updates.emergencyPhone,
      medicalInfo: updates.medicalInfo,
      allergies: updates.allergies,
      passwordResetToken: updates.passwordResetToken,
      passwordResetExpiry: updates.passwordResetExpiry instanceof Date ? updates.passwordResetExpiry.toISOString() : updates.passwordResetExpiry,
      updatedAt: new Date().toISOString(),
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.users)
      .set(dbUpdates)
      .where(eq(schema.users.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbUserToUser(results[0]);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }
  
  // Pending Registration operations
  async getPendingRegistration(email: string, organizationId: string) {
    const results = await db.select().from(schema.pendingRegistrations)
      .where(
        and(
          eq(schema.pendingRegistrations.email, email),
          eq(schema.pendingRegistrations.organizationId, organizationId)
        )
      );
    if (results.length === 0) return undefined;
    return results[0];
  }
  
  async getPendingRegistrationByToken(token: string, organizationId: string) {
    const results = await db.select().from(schema.pendingRegistrations)
      .where(
        and(
          eq(schema.pendingRegistrations.verificationToken, token),
          eq(schema.pendingRegistrations.organizationId, organizationId)
        )
      );
    if (results.length === 0) return undefined;
    return results[0];
  }
  
  async createPendingRegistration(email: string, organizationId: string, verificationToken: string, verificationExpiry: Date, sourcePlatform?: string, sessionId?: string) {
    const results = await db.insert(schema.pendingRegistrations)
      .values({
        email,
        organizationId,
        verificationToken,
        verificationExpiry: verificationExpiry.toISOString(),
        verified: false,
        sourcePlatform: sourcePlatform || 'web',
        sessionId: sessionId || null,
      })
      .returning();
    return results[0];
  }
  
  async updatePendingRegistration(email: string, organizationId: string, verified: boolean) {
    await db.update(schema.pendingRegistrations)
      .set({ verified })
      .where(
        and(
          eq(schema.pendingRegistrations.email, email),
          eq(schema.pendingRegistrations.organizationId, organizationId)
        )
      );
  }
  
  async deletePendingRegistration(email: string, organizationId: string) {
    await db.delete(schema.pendingRegistrations)
      .where(
        and(
          eq(schema.pendingRegistrations.email, email),
          eq(schema.pendingRegistrations.organizationId, organizationId)
        )
      );
  }

  // Team operations
  async getTeam(id: string): Promise<Team | undefined> {
    const teamId = parseInt(id);
    const results = await db.select().from(schema.teams).where(eq(schema.teams.id, teamId));
    if (results.length === 0) return undefined;
    return this.mapDbTeamToTeam(results[0]);
  }

  async getTeamsByOrganization(organizationId: string): Promise<Team[]> {
    const results = await db.select().from(schema.teams);
    return results.map(team => this.mapDbTeamToTeam(team));
  }

  async getTeamsByCoach(coachId: string): Promise<Team[]> {
    // First get teams from the new team_memberships table (active only)
    const membershipTeamIds = await db.select({ teamId: schema.teamMemberships.teamId })
      .from(schema.teamMemberships)
      .where(
        and(
          eq(schema.teamMemberships.profileId, coachId),
          eq(schema.teamMemberships.status, 'active'),
          sql`${schema.teamMemberships.role} IN ('coach', 'assistant_coach')`
        )
      );
    
    // Also check legacy fields for backwards compatibility
    const legacyResults = await db.select().from(schema.teams).where(
      or(
        eq(schema.teams.coachId, coachId),
        sql`${coachId} = ANY(${schema.teams.assistantCoachIds})`
      )
    );
    
    // Combine team IDs from both sources
    const allTeamIds = new Set<number>();
    membershipTeamIds.forEach(m => allTeamIds.add(m.teamId));
    legacyResults.forEach(t => allTeamIds.add(t.id));
    
    if (allTeamIds.size === 0) return [];
    
    // Fetch all unique teams
    const teams = await db.select().from(schema.teams).where(
      sql`${schema.teams.id} IN (${sql.join([...allTeamIds].map(id => sql`${id}`), sql`, `)})`
    );
    
    return teams.map(team => this.mapDbTeamToTeam(team));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const now = new Date().toISOString();
    const dbTeam = {
      organizationId: team.organizationId,
      name: team.name,
      programId: team.programId,
      programType: team.programType,
      divisionId: team.divisionId,
      coachId: team.coachId && team.coachId.trim() !== '' ? team.coachId : null,
      assistantCoachIds: team.assistantCoachIds ?? [],
      season: team.season,
      organization: team.organization,
      location: team.location,
      scheduleLink: team.scheduleLink,
      rosterSize: team.rosterSize ?? 0,
      active: team.active ?? true,
      notes: team.notes,
      createdAt: now,
      updatedAt: now,
    };

    const results = await db.insert(schema.teams).values(dbTeam).returning();
    return this.mapDbTeamToTeam(results[0]);
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const teamId = parseInt(id);
    const dbUpdates: any = {
      organizationId: updates.organizationId,
      name: updates.name,
      programId: updates.programId,
      programType: updates.programType,
      divisionId: updates.divisionId,
      coachId: updates.coachId !== undefined ? (updates.coachId && updates.coachId.trim() !== '' ? updates.coachId : null) : undefined,
      assistantCoachIds: updates.assistantCoachIds,
      season: updates.season,
      organization: updates.organization,
      location: updates.location,
      scheduleLink: updates.scheduleLink,
      rosterSize: updates.rosterSize,
      active: updates.active,
      notes: updates.notes,
      updatedAt: new Date().toISOString(),
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.teams)
      .set(dbUpdates)
      .where(eq(schema.teams.id, teamId))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbTeamToTeam(results[0]);
  }

  async deleteTeam(id: string): Promise<void> {
    const teamId = parseInt(id);
    
    // Get the team to find its programId
    const team = await this.getTeam(id);
    
    if (team && team.programId) {
      // Get all team members before deleting
      const memberships = await db.select().from(schema.teamMemberships)
        .where(eq(schema.teamMemberships.teamId, teamId));
      
      // Cancel enrollments for all players on this team for this program
      for (const membership of memberships) {
        if (membership.profileId) {
          await db.update(schema.productEnrollments)
            .set({ status: 'cancelled', autoRenew: false, updatedAt: new Date().toISOString() })
            .where(and(
              eq(schema.productEnrollments.programId, team.programId),
              eq(schema.productEnrollments.profileId, membership.profileId)
            ));
        }
      }
    }
    
    // Delete team memberships first (in case CASCADE doesn't work)
    await db.delete(schema.teamMemberships).where(eq(schema.teamMemberships.teamId, teamId));
    
    // Now delete the team
    await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
  }

  // Event operations
  async getEvent(id: string): Promise<Event | undefined> {
    const eventId = parseInt(id);
    const results = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
    if (results.length === 0) return undefined;
    return this.mapDbEventToEvent(results[0]);
  }

  async getEventsByOrganization(organizationId: string): Promise<Event[]> {
    const results = await db.select().from(schema.events);
    return results.map(event => this.mapDbEventToEvent(event));
  }

  async getEventsByTeam(teamId: string): Promise<Event[]> {
    const teamIdNum = parseInt(teamId);
    const results = await db.select().from(schema.events).where(eq(schema.events.teamId, teamIdNum));
    return results.map(event => this.mapDbEventToEvent(event));
  }

  async getUpcomingEvents(organizationId: string): Promise<Event[]> {
    const now = new Date().toISOString();
    const results = await db.select().from(schema.events)
      .where(and(
        gte(schema.events.startTime, now),
        eq(schema.events.isActive, true)
      ));
    return results.map(event => this.mapDbEventToEvent(event));
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const dbEvent = {
      title: event.title,
      description: event.description,
      eventType: event.eventType || 'practice',
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      latitude: event.latitude ?? undefined,
      longitude: event.longitude ?? undefined,
      teamId: event.teamId ? parseInt(event.teamId) : null,
      opponentTeam: event.opponentTeam,
      visibility: event.visibility as any,
      assignTo: event.assignTo as any,
      rsvpRequired: event.rsvpRequired ?? false,
      capacity: event.capacity ?? undefined,
      allowCheckIn: event.allowCheckIn ?? false,
      checkInRadius: event.checkInRadius ?? undefined,
      sendNotifications: event.sendNotifications ?? false,
      createdBy: event.createdBy ?? undefined,
      status: event.status || 'active',
      isActive: event.isActive ?? true,
      createdAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.events).values(dbEvent).returning();
    return this.mapDbEventToEvent(results[0]);
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const eventId = parseInt(id);
    const dbUpdates: any = {
      title: updates.title,
      description: updates.description,
      eventType: updates.eventType,
      startTime: updates.startTime ? new Date(updates.startTime).toISOString() : undefined,
      endTime: updates.endTime ? new Date(updates.endTime).toISOString() : undefined,
      location: updates.location,
      latitude: updates.latitude,
      longitude: updates.longitude,
      teamId: updates.teamId,
      opponentTeam: updates.opponentTeam,
      isActive: updates.isActive,
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.events)
      .set(dbUpdates)
      .where(eq(schema.events.id, eventId))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbEventToEvent(results[0]);
  }

  async deleteEvent(id: string): Promise<void> {
    const eventId = parseInt(id);
    await db.delete(schema.events).where(eq(schema.events.id, eventId));
  }

  // Attendance operations
  async getAttendance(eventId: string, userId: string): Promise<Attendance | undefined> {
    const eventIdNum = parseInt(eventId);
    const results = await db.select().from(schema.attendances)
      .where(and(
        eq(schema.attendances.eventId, eventIdNum),
        eq(schema.attendances.userId, userId)
      ));
    if (results.length === 0) return undefined;
    return this.mapDbAttendanceToAttendance(results[0]);
  }

  async getAttendancesByEvent(eventId: string): Promise<Attendance[]> {
    const eventIdNum = parseInt(eventId);
    const results = await db.select().from(schema.attendances)
      .where(eq(schema.attendances.eventId, eventIdNum));
    return results.map(att => this.mapDbAttendanceToAttendance(att));
  }

  async getAttendancesByUser(userId: string): Promise<Attendance[]> {
    const results = await db.select().from(schema.attendances)
      .where(eq(schema.attendances.userId, userId));
    return results.map(att => this.mapDbAttendanceToAttendance(att));
  }

  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const dbAttendance = {
      userId: attendance.userId,
      eventId: attendance.eventId,
      type: attendance.type || 'advance',
      qrCodeData: attendance.qrCodeData || `qr-${Date.now()}`,
      latitude: attendance.latitude !== undefined ? attendance.latitude.toString() : undefined,
      longitude: attendance.longitude !== undefined ? attendance.longitude.toString() : undefined,
      checkedInAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.attendances).values(dbAttendance).returning();
    return this.mapDbAttendanceToAttendance(results[0]);
  }

  // Award operations
  async getAward(id: string): Promise<Award | undefined> {
    const awardId = parseInt(id);
    const results = await db.select().from(schema.badges).where(eq(schema.badges.id, awardId));
    if (results.length === 0) return undefined;
    return this.mapDbBadgeToAward(results[0]);
  }

  async getAwardsByOrganization(organizationId: string): Promise<Award[]> {
    const results = await db.select().from(schema.badges);
    return results.map(badge => this.mapDbBadgeToAward(badge));
  }

  async createAward(award: InsertAward): Promise<Award> {
    const dbAward = {
      name: award.name,
      description: award.description,
      icon: award.icon,
      color: award.color || '#1E40AF',
      criteria: {},
      type: award.type,
      category: award.category,
      isActive: award.isActive ?? true,
      createdAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.badges).values(dbAward).returning();
    return this.mapDbBadgeToAward(results[0]);
  }

  async updateAward(id: string, updates: Partial<Award>): Promise<Award | undefined> {
    const awardId = parseInt(id);
    const dbUpdates: any = {
      name: updates.name,
      description: updates.description,
      icon: updates.icon,
      color: updates.color,
      category: updates.category,
      isActive: updates.isActive,
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.badges)
      .set(dbUpdates)
      .where(eq(schema.badges.id, awardId))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbBadgeToAward(results[0]);
  }

  async deleteAward(id: string): Promise<void> {
    const awardId = parseInt(id);
    await db.delete(schema.badges).where(eq(schema.badges.id, awardId));
  }

  // User Award operations
  async getUserAwards(userId: string): Promise<UserAward[]> {
    const results = await db.select().from(schema.userBadges)
      .where(eq(schema.userBadges.userId, userId));
    return results.map(userBadge => this.mapDbUserBadgeToUserAward(userBadge));
  }

  async awardUser(userAward: InsertUserAward): Promise<UserAward> {
    const dbUserAward = {
      userId: userAward.userId,
      badgeId: parseInt(userAward.awardId),
      earnedAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.userBadges).values(dbUserAward).returning();
    return this.mapDbUserBadgeToUserAward(results[0]);
  }

  // Award Definition operations (new awards system)
  async getAwardDefinitions(organizationId: string): Promise<SelectAwardDefinition[]> {
    const results = await db.select().from(schema.awardDefinitions);
    return results.filter(def => !def.organizationId || def.organizationId === organizationId);
  }
  
  async getAwardDefinition(id: number): Promise<SelectAwardDefinition | undefined> {
    const results = await db.select().from(schema.awardDefinitions)
      .where(eq(schema.awardDefinitions.id, id));
    if (results.length === 0) return undefined;
    return results[0];
  }
  
  async createAwardDefinition(data: InsertAwardDefinition): Promise<SelectAwardDefinition> {
    const now = new Date().toISOString();
    const dbData = {
      name: data.name,
      tier: data.tier,
      class: data.class ?? null,
      prestige: data.prestige ?? 'Prospect',
      triggerField: data.triggerField ?? null,
      triggerOperator: data.triggerOperator ?? '>=',
      triggerValue: data.triggerValue ?? null,
      triggerType: data.triggerType ?? 'count',
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      active: data.active ?? true,
      organizationId: data.organizationId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    
    const results = await db.insert(schema.awardDefinitions).values(dbData).returning();
    return results[0];
  }
  
  async updateAwardDefinition(id: number, data: Partial<InsertAwardDefinition>): Promise<SelectAwardDefinition | undefined> {
    const dbUpdates: any = {
      name: data.name,
      tier: data.tier,
      class: data.class,
      prestige: data.prestige,
      triggerField: data.triggerField,
      triggerOperator: data.triggerOperator,
      triggerValue: data.triggerValue,
      triggerType: data.triggerType,
      description: data.description,
      imageUrl: data.imageUrl,
      active: data.active,
      organizationId: data.organizationId,
      updatedAt: new Date().toISOString(),
    };
    
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });
    
    const results = await db.update(schema.awardDefinitions)
      .set(dbUpdates)
      .where(eq(schema.awardDefinitions.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return results[0];
  }
  
  async deleteAwardDefinition(id: number): Promise<void> {
    await db.delete(schema.awardDefinitions).where(eq(schema.awardDefinitions.id, id));
  }
  
  async getActiveAwardDefinitions(organizationId: string): Promise<SelectAwardDefinition[]> {
    const results = await db.select().from(schema.awardDefinitions)
      .where(eq(schema.awardDefinitions.active, true));
    return results.filter(def => !def.organizationId || def.organizationId === organizationId);
  }
  
  // User Award Record operations (new awards system)
  async getUserAwardRecords(userId: string): Promise<SelectUserAwardRecord[]> {
    const results = await db.select().from(schema.userAwards)
      .where(eq(schema.userAwards.userId, userId));
    return results;
  }
  
  async getUserAwardsByOrganization(organizationId: string): Promise<SelectUserAwardRecord[]> {
    const orgUsers = await db.select().from(schema.users);
    const userIds = orgUsers.map(u => u.id);
    
    const results = await db.select().from(schema.userAwards);
    return results.filter(record => userIds.includes(record.userId));
  }
  
  async createUserAward(data: InsertUserAwardRecord): Promise<SelectUserAwardRecord> {
    const dbData = {
      userId: data.userId,
      awardId: data.awardId,
      awardedAt: new Date().toISOString(),
      awardedBy: data.awardedBy ?? null,
      year: data.year ?? null,
      notes: data.notes ?? null,
      visible: data.visible ?? true,
    };
    
    const results = await db.insert(schema.userAwards).values(dbData).returning();
    return results[0];
  }
  
  async deleteUserAward(id: number): Promise<void> {
    await db.delete(schema.userAwards).where(eq(schema.userAwards.id, id));
  }
  
  async checkUserHasAward(userId: string, awardId: number, year?: number): Promise<boolean> {
    let query = db.select().from(schema.userAwards)
      .where(and(
        eq(schema.userAwards.userId, userId),
        eq(schema.userAwards.awardId, awardId)
      ));
    
    const results = await query;
    
    if (year !== undefined) {
      return results.some(record => record.year === year);
    }
    
    return results.length > 0;
  }
  
  // User Award Tracking Fields
  async updateUserAwardTracking(userId: string, updates: Partial<{totalPractices: number; totalGames: number; consecutiveCheckins: number; videosCompleted: number; yearsActive: number; awards: any[]}>): Promise<void> {
    const dbUpdates: any = {
      totalPractices: updates.totalPractices,
      totalGames: updates.totalGames,
      consecutiveCheckins: updates.consecutiveCheckins,
      videosCompleted: updates.videosCompleted,
      yearsActive: updates.yearsActive,
      awards: updates.awards,
    };
    
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });
    
    await db.update(schema.users)
      .set(dbUpdates)
      .where(eq(schema.users.id, userId));
  }

  // Announcement operations
  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const announcementId = parseInt(id);
    const results = await db.select().from(schema.announcements)
      .where(eq(schema.announcements.id, announcementId));
    if (results.length === 0) return undefined;
    return this.mapDbAnnouncementToAnnouncement(results[0]);
  }

  async getAnnouncementsByOrganization(organizationId: string): Promise<Announcement[]> {
    const results = await db.select().from(schema.announcements);
    return results.map(ann => this.mapDbAnnouncementToAnnouncement(ann));
  }

  async getAnnouncementsByTeam(teamId: string): Promise<Announcement[]> {
    const teamIdNum = parseInt(teamId);
    const results = await db.select().from(schema.announcements)
      .where(eq(schema.announcements.teamId, teamIdNum));
    return results.map(ann => this.mapDbAnnouncementToAnnouncement(ann));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const dbAnnouncement = {
      title: announcement.title,
      content: announcement.content,
      authorId: announcement.authorId,
      teamId: announcement.teamId ? parseInt(announcement.teamId) : null,
      priority: announcement.priority || 'medium',
      isActive: announcement.isActive ?? true,
      createdAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.announcements).values(dbAnnouncement).returning();
    return this.mapDbAnnouncementToAnnouncement(results[0]);
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined> {
    const announcementId = parseInt(id);
    const dbUpdates: any = {
      title: updates.title,
      content: updates.content,
      teamId: updates.teamId ? parseInt(updates.teamId) : undefined,
      priority: updates.priority,
      isActive: updates.isActive,
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.announcements)
      .set(dbUpdates)
      .where(eq(schema.announcements.id, announcementId))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbAnnouncementToAnnouncement(results[0]);
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const announcementId = parseInt(id);
    await db.delete(schema.announcements).where(eq(schema.announcements.id, announcementId));
  }

  // Message operations
  async getMessagesByTeam(teamId: string): Promise<Message[]> {
    const teamIdNum = parseInt(teamId);
    const results = await db
      .select({
        message: schema.messages,
        user: schema.users,
      })
      .from(schema.messages)
      .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
      .where(eq(schema.messages.teamId, teamIdNum))
      .orderBy(schema.messages.createdAt);
    
    return results.map(row => this.mapDbMessageWithSenderToMessage(row));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const dbMessage = {
      senderId: message.senderId,
      teamId: parseInt(message.teamId),
      content: message.content,
      messageType: message.messageType || 'text',
      isModerated: false,
      createdAt: new Date().toISOString(),
    };

    const insertResults = await db.insert(schema.messages).values(dbMessage).returning();
    const newMessage = insertResults[0];
    
    const enrichedResults = await db
      .select({
        message: schema.messages,
        user: schema.users,
      })
      .from(schema.messages)
      .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
      .where(eq(schema.messages.id, newMessage.id));
    
    if (enrichedResults.length === 0) {
      return this.mapDbMessageToMessage(newMessage);
    }
    
    return this.mapDbMessageWithSenderToMessage(enrichedResults[0]);
  }

  // Payment operations
  async getPayment(id: string): Promise<Payment | undefined> {
    const paymentId = parseInt(id);
    const results = await db.select().from(schema.payments)
      .where(eq(schema.payments.id, paymentId));
    if (results.length === 0) return undefined;
    return this.mapDbPaymentToPayment(results[0]);
  }

  async getPaymentsByOrganization(organizationId: string): Promise<Payment[]> {
    const results = await db.select().from(schema.payments)
      .where(eq(schema.payments.organizationId, organizationId));
    return results.map(payment => this.mapDbPaymentToPayment(payment));
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    const results = await db.select().from(schema.payments)
      .where(eq(schema.payments.userId, userId));
    return results.map(payment => this.mapDbPaymentToPayment(payment));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const dbPayment = {
      organizationId: payment.organizationId,
      userId: payment.userId,
      playerId: payment.playerId, // For per-player billing: which specific player this payment covers
      amount: payment.amount,
      currency: payment.currency || 'usd',
      paymentType: payment.paymentType,
      status: payment.status || 'pending',
      description: payment.description,
      dueDate: payment.dueDate,
      stripePaymentId: payment.stripePaymentId,
      packageId: payment.packageId,
      programId: payment.programId,
      createdAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.payments).values(dbPayment).returning();
    return this.mapDbPaymentToPayment(results[0]);
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const paymentId = parseInt(id);
    const dbUpdates: any = {
      amount: updates.amount,
      status: updates.status,
      description: updates.description,
      paidAt: updates.paidAt ? new Date(updates.paidAt).toISOString() : undefined,
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.payments)
      .set(dbUpdates)
      .where(eq(schema.payments.id, paymentId))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbPaymentToPayment(results[0]);
  }

  // Waiver operations
  async getWaiver(id: string): Promise<Waiver | undefined> {
    const results = await db.select().from(schema.waivers).where(eq(schema.waivers.id, id));
    if (results.length === 0) return undefined;
    return results[0] as Waiver;
  }

  async getWaiversByOrganization(organizationId: string): Promise<Waiver[]> {
    const results = await db.select().from(schema.waivers)
      .where(eq(schema.waivers.organizationId, organizationId));
    return results as Waiver[];
  }

  async createWaiver(waiver: InsertWaiver): Promise<Waiver> {
    const id = `waiver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const dbWaiver = {
      id,
      organizationId: waiver.organizationId,
      name: waiver.name,
      title: waiver.title,
      content: waiver.content,
      requiresScroll: waiver.requiresScroll ?? true,
      requiresCheckbox: waiver.requiresCheckbox ?? true,
      checkboxLabel: waiver.checkboxLabel ?? "I have read and agree to the terms above",
      isBuiltIn: waiver.isBuiltIn ?? false,
      isActive: waiver.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const results = await db.insert(schema.waivers).values(dbWaiver).returning();
    return results[0] as Waiver;
  }

  async updateWaiver(id: string, updates: Partial<Waiver>): Promise<Waiver | undefined> {
    const dbUpdates: any = {
      name: updates.name,
      title: updates.title,
      content: updates.content,
      requiresScroll: updates.requiresScroll,
      requiresCheckbox: updates.requiresCheckbox,
      checkboxLabel: updates.checkboxLabel,
      isActive: updates.isActive,
      updatedAt: new Date().toISOString(),
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.waivers)
      .set(dbUpdates)
      .where(eq(schema.waivers.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return results[0] as Waiver;
  }

  async deleteWaiver(id: string): Promise<void> {
    await db.delete(schema.waivers).where(eq(schema.waivers.id, id));
  }

  // Program operations (placeholders - no database table yet)
  async getProgram(id: string): Promise<Program | undefined> {
    const results = await db.select().from(schema.programs).where(eq(schema.programs.id, id));
    if (results.length === 0) return undefined;
    return this.mapDbProgramToProgram(results[0]);
  }

  async getProgramsByOrganization(organizationId: string): Promise<Program[]> {
    const results = await db.select().from(schema.programs)
      .where(eq(schema.programs.organizationId, organizationId));
    return results.map(prog => this.mapDbProgramToProgram(prog));
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const dbProgram = {
      id,
      organizationId: program.organizationId,
      name: program.name,
      slug: program.slug,
      description: program.description,
      type: program.type,
      billingCycle: program.billingCycle,
      price: program.price,
      billingModel: program.billingModel,
      pricingModel: program.pricingModel,
      duration: program.duration,
      durationDays: program.durationDays,
      installments: program.installments,
      installmentPrice: program.installmentPrice,
      stripePriceId: program.stripePriceId,
      stripeProductId: program.stripeProductId,
      category: program.category,
      tags: program.tags ?? [],
      eventTypes: program.eventTypes ?? [],
      coverageScope: program.coverageScope ?? [],
      ageGroups: program.ageGroups ?? [],
      autoAssignPlayers: program.autoAssignPlayers ?? false,
      linkedAwards: program.linkedAwards ?? [],
      adminNotes: program.adminNotes,
      isActive: program.isActive ?? true,
      // Social toggle fields
      hasSubgroups: program.hasSubgroups ?? true,
      subgroupLabel: program.subgroupLabel ?? 'Team',
      rosterVisibility: program.rosterVisibility ?? 'members',
      chatMode: program.chatMode ?? 'two_way',
      // Programs vs Store separation
      productCategory: program.productCategory ?? 'service',
      coverImageUrl: program.coverImageUrl,
      requiredGearProductIds: program.requiredGearProductIds ?? [],
      seasonStartDate: program.seasonStartDate,
      seasonEndDate: program.seasonEndDate,
      // Store-specific fields
      inventorySizes: program.inventorySizes ?? [],
      inventoryCount: program.inventoryCount,
      shippingRequired: program.shippingRequired ?? false,
      createdAt: now,
    };

    const results = await db.insert(schema.programs).values(dbProgram).returning();
    return this.mapDbProgramToProgram(results[0]);
  }

  async updateProgram(id: string, updates: Partial<Program>): Promise<Program | undefined> {
    const dbUpdates: any = {
      name: updates.name,
      slug: updates.slug,
      description: updates.description,
      type: updates.type,
      billingCycle: updates.billingCycle,
      price: updates.price,
      billingModel: updates.billingModel,
      pricingModel: updates.pricingModel,
      duration: updates.duration,
      durationDays: updates.durationDays,
      installments: updates.installments,
      installmentPrice: updates.installmentPrice,
      stripePriceId: updates.stripePriceId,
      stripeProductId: updates.stripeProductId,
      category: updates.category,
      tags: updates.tags,
      eventTypes: updates.eventTypes,
      coverageScope: updates.coverageScope,
      ageGroups: updates.ageGroups,
      autoAssignPlayers: updates.autoAssignPlayers,
      linkedAwards: updates.linkedAwards,
      adminNotes: updates.adminNotes,
      isActive: updates.isActive,
      // Social toggle fields
      hasSubgroups: updates.hasSubgroups,
      subgroupLabel: updates.subgroupLabel,
      rosterVisibility: updates.rosterVisibility,
      chatMode: updates.chatMode,
      // Programs vs Store separation
      productCategory: updates.productCategory,
      coverImageUrl: updates.coverImageUrl,
      requiredGearProductIds: updates.requiredGearProductIds,
      seasonStartDate: updates.seasonStartDate,
      seasonEndDate: updates.seasonEndDate,
      // Store-specific fields
      inventorySizes: updates.inventorySizes,
      inventoryCount: updates.inventoryCount,
      shippingRequired: updates.shippingRequired,
    };

    // Remove undefined values
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.programs)
      .set(dbUpdates)
      .where(eq(schema.programs.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbProgramToProgram(results[0]);
  }

  async deleteProgram(id: string): Promise<void> {
    // First, delete any suggested add-ons that reference this program (as the main program or as the add-on product)
    await db.delete(schema.programSuggestedAddOns).where(eq(schema.programSuggestedAddOns.programId, id));
    await db.delete(schema.programSuggestedAddOns).where(eq(schema.programSuggestedAddOns.productId, id));
    
    // Cancel all enrollments for this program
    await db.update(schema.productEnrollments)
      .set({ status: 'cancelled', autoRenew: false, updatedAt: new Date().toISOString() })
      .where(eq(schema.productEnrollments.programId, id));
    
    // Now delete the program itself
    await db.delete(schema.programs).where(eq(schema.programs.id, id));
  }

  // Program Suggested Add-ons operations (database)
  async getSuggestedAddOns(programId: string): Promise<ProgramSuggestedAddOn[]> {
    const results = await db.select().from(schema.programSuggestedAddOns)
      .where(eq(schema.programSuggestedAddOns.programId, programId))
      .orderBy(schema.programSuggestedAddOns.displayOrder);
    return results;
  }
  
  async getSuggestedAddOnsWithProducts(programId: string): Promise<{ addOn: ProgramSuggestedAddOn; product: Program }[]> {
    const addOns = await this.getSuggestedAddOns(programId);
    const result: { addOn: ProgramSuggestedAddOn; product: Program }[] = [];
    for (const addOn of addOns) {
      const product = await this.getProgram(addOn.productId);
      if (product) {
        result.push({ addOn, product });
      }
    }
    return result;
  }
  
  async addSuggestedAddOn(data: InsertProgramSuggestedAddOn): Promise<ProgramSuggestedAddOn> {
    const results = await db.insert(schema.programSuggestedAddOns)
      .values({
        programId: data.programId,
        productId: data.productId,
        displayOrder: data.displayOrder ?? 0,
        isRequired: data.isRequired ?? false,
      })
      .returning();
    return results[0];
  }
  
  async removeSuggestedAddOn(programId: string, productId: string): Promise<void> {
    await db.delete(schema.programSuggestedAddOns)
      .where(
        and(
          eq(schema.programSuggestedAddOns.programId, programId),
          eq(schema.programSuggestedAddOns.productId, productId)
        )
      );
  }
  
  async setProgramSuggestedAddOns(programId: string, productIds: string[]): Promise<void> {
    // Remove existing add-ons for this program
    await db.delete(schema.programSuggestedAddOns)
      .where(eq(schema.programSuggestedAddOns.programId, programId));
    
    // Add new add-ons
    for (let i = 0; i < productIds.length; i++) {
      await this.addSuggestedAddOn({
        programId,
        productId: productIds[i],
        displayOrder: i,
        isRequired: false,
      });
    }
  }
  
  async getProductsWithSuggestedPrograms(productId: string): Promise<string[]> {
    const results = await db.select({ programId: schema.programSuggestedAddOns.programId })
      .from(schema.programSuggestedAddOns)
      .where(eq(schema.programSuggestedAddOns.productId, productId));
    return results.map(r => r.programId);
  }

  // Package Selection operations (placeholders - no database table yet)
  async getPackageSelection(id: string): Promise<PackageSelection | undefined> {
    return undefined;
  }

  async getPackageSelectionsByParent(parentUserId: string): Promise<PackageSelection[]> {
    return [];
  }

  async getPackageSelectionsByChild(childUserId: string): Promise<PackageSelection[]> {
    return [];
  }

  async createPackageSelection(selection: InsertPackageSelection): Promise<PackageSelection> {
    throw new Error("Package selection creation not supported in database mode yet");
  }

  async updatePackageSelection(id: string, updates: Partial<PackageSelection>): Promise<PackageSelection | undefined> {
    return undefined;
  }

  async deletePackageSelection(id: string): Promise<void> {
    return;
  }

  async markPackageSelectionPaid(id: string): Promise<PackageSelection | undefined> {
    return undefined;
  }

  // Division operations
  async getDivision(id: number): Promise<Division | undefined> {
    const results = await db.select().from(schema.divisions).where(eq(schema.divisions.id, id));
    if (results.length === 0) return undefined;
    return this.mapDbDivisionToDivision(results[0]);
  }

  async getDivisionsByOrganization(organizationId: string): Promise<Division[]> {
    const results = await db.select().from(schema.divisions)
      .where(eq(schema.divisions.organizationId, organizationId));
    return results.map(div => this.mapDbDivisionToDivision(div));
  }

  async createDivision(division: InsertDivision): Promise<Division> {
    const dbDivision = {
      organizationId: division.organizationId,
      name: division.name,
      description: division.description,
      ageRange: division.ageRange,
      teamIds: division.teamIds || [],
      isActive: division.isActive ?? true,
      createdAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.divisions).values(dbDivision).returning();
    return this.mapDbDivisionToDivision(results[0]);
  }

  async updateDivision(id: number, updates: Partial<Division>): Promise<Division | undefined> {
    const dbUpdates: any = {
      name: updates.name,
      description: updates.description,
      ageRange: updates.ageRange,
      teamIds: updates.teamIds,
      isActive: updates.isActive,
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.divisions)
      .set(dbUpdates)
      .where(eq(schema.divisions.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbDivisionToDivision(results[0]);
  }

  async deleteDivision(id: number): Promise<void> {
    await db.delete(schema.divisions).where(eq(schema.divisions.id, id));
  }

  // Skill operations
  async getSkill(id: number): Promise<Skill | undefined> {
    const results = await db.select().from(schema.skills).where(eq(schema.skills.id, id));
    if (results.length === 0) return undefined;
    return this.mapDbSkillToSkill(results[0]);
  }

  async getSkillsByOrganization(organizationId: string): Promise<Skill[]> {
    const results = await db.select().from(schema.skills)
      .where(eq(schema.skills.organizationId, organizationId));
    return results.map(skill => this.mapDbSkillToSkill(skill));
  }

  async getSkillsByPlayer(playerId: string): Promise<Skill[]> {
    const results = await db.select().from(schema.skills)
      .where(eq(schema.skills.playerId, playerId));
    return results.map(skill => this.mapDbSkillToSkill(skill));
  }

  async createSkill(skill: InsertSkill): Promise<Skill> {
    const dbSkill = {
      organizationId: skill.organizationId,
      playerId: skill.playerId,
      coachId: skill.coachId,
      category: skill.category,
      score: skill.score,
      notes: skill.notes,
      evaluatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.skills).values(dbSkill).returning();
    return this.mapDbSkillToSkill(results[0]);
  }

  async updateSkill(id: number, updates: Partial<Skill>): Promise<Skill | undefined> {
    const dbUpdates: any = {
      category: updates.category,
      score: updates.score,
      notes: updates.notes,
      evaluatedAt: updates.evaluatedAt ? new Date(updates.evaluatedAt).toISOString() : undefined,
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.skills)
      .set(dbUpdates)
      .where(eq(schema.skills.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbSkillToSkill(results[0]);
  }

  async deleteSkill(id: number): Promise<void> {
    await db.delete(schema.skills).where(eq(schema.skills.id, id));
  }

  // Evaluation operations
  async getEvaluation(id: number): Promise<Evaluation | undefined> {
    const results = await db.select().from(schema.evaluations).where(eq(schema.evaluations.id, id));
    if (results.length === 0) return undefined;
    return this.mapDbEvaluationToEvaluation(results[0]);
  }

  async getEvaluationsByOrganization(organizationId: string): Promise<Evaluation[]> {
    const results = await db.select().from(schema.evaluations)
      .where(eq(schema.evaluations.organizationId, organizationId));
    return results.map(evaluation => this.mapDbEvaluationToEvaluation(evaluation));
  }

  async getEvaluationsByPlayer(playerId: string): Promise<Evaluation[]> {
    const results = await db.select().from(schema.evaluations)
      .where(eq(schema.evaluations.playerId, playerId));
    return results.map(evaluation => this.mapDbEvaluationToEvaluation(evaluation));
  }

  async getEvaluationByPlayerQuarter(playerId: string, quarter: string, year: number): Promise<Evaluation | undefined> {
    const results = await db.select().from(schema.evaluations)
      .where(
        and(
          eq(schema.evaluations.playerId, playerId),
          eq(schema.evaluations.quarter, quarter),
          eq(schema.evaluations.year, year)
        )
      );
    if (results.length === 0) return undefined;
    return this.mapDbEvaluationToEvaluation(results[0]);
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    // Check if evaluation already exists for this player/quarter/year (upsert logic)
    const existing = await this.getEvaluationByPlayerQuarter(evaluation.playerId, evaluation.quarter, evaluation.year);
    
    if (existing) {
      // Update existing evaluation
      const dbUpdates = {
        coachId: evaluation.coachId,
        scores: evaluation.scores,
        notes: evaluation.notes,
        updatedAt: new Date().toISOString(),
      };

      const results = await db.update(schema.evaluations)
        .set(dbUpdates)
        .where(eq(schema.evaluations.id, existing.id))
        .returning();
      
      return this.mapDbEvaluationToEvaluation(results[0]);
    }

    // Create new evaluation
    const now = new Date().toISOString();
    const dbEvaluation = {
      organizationId: evaluation.organizationId,
      playerId: evaluation.playerId,
      coachId: evaluation.coachId,
      quarter: evaluation.quarter,
      year: evaluation.year,
      scores: evaluation.scores,
      notes: evaluation.notes,
      createdAt: now,
      updatedAt: now,
    };

    const results = await db.insert(schema.evaluations).values(dbEvaluation).returning();
    return this.mapDbEvaluationToEvaluation(results[0]);
  }

  async updateEvaluation(id: number, updates: Partial<Evaluation>): Promise<Evaluation | undefined> {
    const dbUpdates: any = {
      coachId: updates.coachId,
      quarter: updates.quarter,
      year: updates.year,
      scores: updates.scores,
      notes: updates.notes,
      updatedAt: new Date().toISOString(),
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.evaluations)
      .set(dbUpdates)
      .where(eq(schema.evaluations.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbEvaluationToEvaluation(results[0]);
  }

  async deleteEvaluation(id: number): Promise<void> {
    await db.delete(schema.evaluations).where(eq(schema.evaluations.id, id));
  }

  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    const results = await db.select().from(schema.notifications).where(eq(schema.notifications.id, id));
    if (results.length === 0) return undefined;
    return this.mapDbNotificationToNotification(results[0]);
  }

  async getNotificationsByOrganization(organizationId: string): Promise<Notification[]> {
    const results = await db.select().from(schema.notifications)
      .where(eq(schema.notifications.organizationId, organizationId));
    return results.map(notif => this.mapDbNotificationToNotification(notif));
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    // Filter notifications where recipientIds array contains the userId
    const results = await db.select().from(schema.notifications);
    return results
      .filter(notif => notif.recipientIds?.includes(userId))
      .map(notif => this.mapDbNotificationToNotification(notif));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const dbNotification = {
      organizationId: notification.organizationId,
      types: notification.types,
      title: notification.title,
      message: notification.message,
      recipientIds: notification.recipientIds,
      sentBy: notification.sentBy,
      sentAt: new Date().toISOString(),
      readBy: notification.readBy || [],
      relatedEventId: notification.relatedEventId,
      status: notification.status || 'pending',
      createdAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.notifications).values(dbNotification).returning();
    return this.mapDbNotificationToNotification(results[0]);
  }

  async updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined> {
    const dbUpdates: any = {
      types: updates.types,
      title: updates.title,
      message: updates.message,
      recipientIds: updates.recipientIds,
      readBy: updates.readBy,
      status: updates.status,
    };

    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const results = await db.update(schema.notifications)
      .set(dbUpdates)
      .where(eq(schema.notifications.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbNotificationToNotification(results[0]);
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(schema.notifications).where(eq(schema.notifications.id, id));
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    // Mark as read by updating status
    const results = await db.update(schema.notifications)
      .set({ status: 'sent' })
      .where(eq(schema.notifications.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbNotificationToNotification(results[0]);
  }
  
  // Event Window operations
  async getEventWindow(id: number): Promise<EventWindow | undefined> {
    const results = await db.select().from(schema.eventWindows).where(eq(schema.eventWindows.id, id));
    if (results.length === 0) return undefined;
    return this.mapDbEventWindowToEventWindow(results[0]);
  }
  
  async getEventWindowsByEvent(eventId: number): Promise<EventWindow[]> {
    const results = await db.select().from(schema.eventWindows).where(eq(schema.eventWindows.eventId, eventId));
    return results.map(w => this.mapDbEventWindowToEventWindow(w));
  }
  
  async createEventWindow(window: InsertEventWindow): Promise<EventWindow> {
    const dbWindow = {
      eventId: window.eventId,
      windowType: window.windowType,
      openRole: window.openRole,
      amount: window.amount,
      unit: window.unit,
      direction: window.direction,
      isDefault: window.isDefault ?? false,
    };
    
    const results = await db.insert(schema.eventWindows).values(dbWindow).returning();
    return this.mapDbEventWindowToEventWindow(results[0]);
  }
  
  async updateEventWindow(id: number, updates: Partial<EventWindow>): Promise<EventWindow | undefined> {
    const dbUpdates: any = {
      windowType: updates.windowType,
      openRole: updates.openRole,
      amount: updates.amount,
      unit: updates.unit,
      direction: updates.direction,
      isDefault: updates.isDefault,
    };
    
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });
    
    const results = await db.update(schema.eventWindows)
      .set(dbUpdates)
      .where(eq(schema.eventWindows.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbEventWindowToEventWindow(results[0]);
  }
  
  async deleteEventWindow(id: number): Promise<void> {
    await db.delete(schema.eventWindows).where(eq(schema.eventWindows.id, id));
  }
  
  async deleteEventWindowsByEvent(eventId: number): Promise<void> {
    await db.delete(schema.eventWindows).where(eq(schema.eventWindows.eventId, eventId));
  }
  
  // RSVP Response operations
  async getRsvpResponse(id: number): Promise<RsvpResponse | undefined> {
    const results = await db.select().from(schema.rsvpResponses).where(eq(schema.rsvpResponses.id, id));
    if (results.length === 0) return undefined;
    return this.mapDbRsvpResponseToRsvpResponse(results[0]);
  }
  
  async getRsvpResponsesByEvent(eventId: number): Promise<RsvpResponse[]> {
    const results = await db.select().from(schema.rsvpResponses).where(eq(schema.rsvpResponses.eventId, eventId));
    return results.map(r => this.mapDbRsvpResponseToRsvpResponse(r));
  }
  
  async getRsvpResponseByUserAndEvent(userId: string, eventId: number): Promise<RsvpResponse | undefined> {
    const results = await db.select().from(schema.rsvpResponses).where(
      and(
        eq(schema.rsvpResponses.userId, userId),
        eq(schema.rsvpResponses.eventId, eventId)
      )
    );
    if (results.length === 0) return undefined;
    return this.mapDbRsvpResponseToRsvpResponse(results[0]);
  }
  
  async createRsvpResponse(response: InsertRsvpResponse): Promise<RsvpResponse> {
    const dbResponse = {
      eventId: response.eventId,
      userId: response.userId,
      response: response.response,
    };
    
    const results = await db.insert(schema.rsvpResponses).values(dbResponse).returning();
    return this.mapDbRsvpResponseToRsvpResponse(results[0]);
  }
  
  async updateRsvpResponse(id: number, updates: Partial<RsvpResponse>): Promise<RsvpResponse | undefined> {
    const dbUpdates: any = {
      response: updates.response,
      respondedAt: updates.respondedAt,
      updatedAt: new Date().toISOString(),
    };
    
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });
    
    const results = await db.update(schema.rsvpResponses)
      .set(dbUpdates)
      .where(eq(schema.rsvpResponses.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbRsvpResponseToRsvpResponse(results[0]);
  }
  
  async deleteRsvpResponse(id: number): Promise<void> {
    await db.delete(schema.rsvpResponses).where(eq(schema.rsvpResponses.id, id));
  }

  // Facility operations
  async getFacility(id: number): Promise<Facility | undefined> {
    const results = await db.select().from(schema.facilities).where(eq(schema.facilities.id, id));
    if (results.length === 0) return undefined;
    return this.mapDbFacilityToFacility(results[0]);
  }
  
  async getFacilitiesByOrganization(organizationId: string): Promise<Facility[]> {
    const results = await db.select()
      .from(schema.facilities)
      .where(
        and(
          eq(schema.facilities.organizationId, organizationId),
          eq(schema.facilities.isActive, true)
        )
      );
    return results.map(this.mapDbFacilityToFacility.bind(this));
  }
  
  async createFacility(facility: InsertFacility): Promise<Facility> {
    const dbFacility = {
      organizationId: facility.organizationId,
      name: facility.name,
      address: facility.address,
      latitude: facility.latitude,
      longitude: facility.longitude,
      isActive: facility.isActive ?? true,
      createdBy: facility.createdBy,
    };
    
    const results = await db.insert(schema.facilities).values(dbFacility).returning();
    return this.mapDbFacilityToFacility(results[0]);
  }
  
  async updateFacility(id: number, updates: Partial<Facility>): Promise<Facility | undefined> {
    const dbUpdates: any = {
      name: updates.name,
      address: updates.address,
      latitude: updates.latitude,
      longitude: updates.longitude,
      isActive: updates.isActive,
    };
    
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });
    
    const results = await db.update(schema.facilities)
      .set(dbUpdates)
      .where(eq(schema.facilities.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbFacilityToFacility(results[0]);
  }
  
  async deleteFacility(id: number): Promise<void> {
    await db.delete(schema.facilities).where(eq(schema.facilities.id, id));
  }
  
  // Migration Lookup operations
  async getMigrationLookupsByEmail(email: string): Promise<SelectMigrationLookup[]> {
    const results = await db.select().from(schema.migrationLookup)
      .where(and(
        sql`LOWER(${schema.migrationLookup.email}) = LOWER(${email})`,
        eq(schema.migrationLookup.isClaimed, false)
      ));
    return results;
  }
  
  async createMigrationLookup(data: InsertMigrationLookup): Promise<SelectMigrationLookup> {
    const results = await db.insert(schema.migrationLookup).values({
      email: data.email,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      productName: data.productName,
      isClaimed: data.isClaimed ?? false,
    }).returning();
    return results[0];
  }
  
  async markMigrationLookupClaimed(id: number): Promise<void> {
    await db.update(schema.migrationLookup)
      .set({ isClaimed: true })
      .where(eq(schema.migrationLookup.id, id));
  }
  
  // Subscription operations
  async getSubscription(id: number): Promise<SelectSubscription | undefined> {
    const results = await db.select().from(schema.subscriptions)
      .where(eq(schema.subscriptions.id, id));
    return results[0] || undefined;
  }
  
  async getSubscriptionsByOwner(ownerUserId: string): Promise<SelectSubscription[]> {
    const results = await db.select().from(schema.subscriptions)
      .where(eq(schema.subscriptions.ownerUserId, ownerUserId));
    return results;
  }
  
  async getUnassignedSubscriptionsByOwner(ownerUserId: string): Promise<SelectSubscription[]> {
    const results = await db.select().from(schema.subscriptions)
      .where(and(
        eq(schema.subscriptions.ownerUserId, ownerUserId),
        sql`${schema.subscriptions.assignedPlayerId} IS NULL`
      ));
    return results;
  }
  
  async getSubscriptionsByPlayerId(playerId: string): Promise<SelectSubscription[]> {
    const results = await db.select().from(schema.subscriptions)
      .where(and(
        eq(schema.subscriptions.assignedPlayerId, playerId),
        eq(schema.subscriptions.status, 'active')
      ));
    return results;
  }
  
  async createSubscription(data: InsertSubscription): Promise<SelectSubscription> {
    const results = await db.insert(schema.subscriptions).values({
      ownerUserId: data.ownerUserId,
      assignedPlayerId: data.assignedPlayerId ?? null,
      stripeCustomerId: data.stripeCustomerId ?? null,
      stripeSubscriptionId: data.stripeSubscriptionId,
      productName: data.productName,
      status: data.status ?? 'active',
      isMigrated: data.isMigrated ?? false,
    }).returning();
    return results[0];
  }
  
  async assignSubscriptionToPlayer(subscriptionId: number, playerId: string): Promise<SelectSubscription | undefined> {
    const results = await db.update(schema.subscriptions)
      .set({ 
        assignedPlayerId: playerId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.subscriptions.id, subscriptionId))
      .returning();
    return results[0] || undefined;
  }
  
  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<SelectSubscription | undefined> {
    const dbUpdates: any = {
      assignedPlayerId: updates.assignedPlayerId,
      status: updates.status,
      isMigrated: updates.isMigrated,
      updatedAt: new Date().toISOString(),
    };
    
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });
    
    const results = await db.update(schema.subscriptions)
      .set(dbUpdates)
      .where(eq(schema.subscriptions.id, id))
      .returning();
    return results[0] || undefined;
  }
  
  // Credit/Enrollment operations
  async getActiveEnrollmentsWithCredits(playerId: string): Promise<ProductEnrollment[]> {
    const results = await db.select().from(schema.productEnrollments)
      .where(
        and(
          eq(schema.productEnrollments.profileId, playerId),
          eq(schema.productEnrollments.status, 'active')
        )
      );
    return results as ProductEnrollment[];
  }
  
  async createEnrollment(data: InsertProductEnrollment): Promise<ProductEnrollment> {
    const now = new Date().toISOString();
    const results = await db.insert(schema.productEnrollments)
      .values({
        organizationId: data.organizationId,
        programId: data.programId,
        accountHolderId: data.accountHolderId,
        profileId: data.profileId ?? null,
        status: data.status ?? 'active',
        source: data.source ?? 'direct',
        paymentId: data.paymentId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        startDate: data.startDate ?? now,
        endDate: data.endDate ?? null,
        autoRenew: data.autoRenew ?? false, // Default to false, subscriptions will explicitly pass true
        totalCredits: data.totalCredits ?? null,
        remainingCredits: data.remainingCredits ?? null,
        metadata: data.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return results[0] as ProductEnrollment;
  }
  
  async deductEnrollmentCredit(enrollmentId: number): Promise<ProductEnrollment | undefined> {
    // First get current credits
    const enrollment = await db.select().from(schema.productEnrollments)
      .where(eq(schema.productEnrollments.id, enrollmentId));
    
    if (!enrollment[0] || !enrollment[0].remainingCredits || enrollment[0].remainingCredits <= 0) {
      return undefined;
    }
    
    // Deduct one credit
    const results = await db.update(schema.productEnrollments)
      .set({
        remainingCredits: enrollment[0].remainingCredits - 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.productEnrollments.id, enrollmentId))
      .returning();
    
    return results[0] as ProductEnrollment || undefined;
  }
  
  async getPlayerStatusTag(playerId: string): Promise<{tag: string; remainingCredits?: number; lowBalance?: boolean}> {
    // Get player to check payment status
    const player = await this.getUser(playerId);
    
    if (!player) {
      return { tag: 'none' };
    }
    
    // Priority 1: Payment Due
    if (player.paymentStatus === 'pending' || player.paymentStatus === 'overdue') {
      return { tag: 'payment_due' };
    }
    
    // Get active enrollments with their products
    // Include: 1) enrollments directly for this player (profileId = playerId)
    //          2) family-wide enrollments (profileId is null) from player's parent/account holder
    // Build the query conditions
    const directEnrollmentCondition = eq(schema.productEnrollments.profileId, playerId);
    
    // For family-wide enrollments, check if player has a parent/account holder AND enrollment is family-wide
    // Check both accountHolderId (new) and parentId (legacy) for maximum compatibility
    const parentReference = player.accountHolderId || player.parentId;
    const familyEnrollmentCondition = parentReference 
      ? and(
          isNull(schema.productEnrollments.profileId),
          eq(schema.productEnrollments.accountHolderId, parentReference)
        )
      : undefined;
    
    const enrollments = await db.select({
      enrollment: schema.productEnrollments,
      product: schema.products,
    })
    .from(schema.productEnrollments)
    .leftJoin(schema.products, eq(schema.productEnrollments.programId, schema.products.id))
    .where(
      and(
        eq(schema.productEnrollments.status, 'active'),
        familyEnrollmentCondition
          ? or(directEnrollmentCondition, familyEnrollmentCondition)
          : directEnrollmentCondition
      )
    );
    
    let hasSubscription = false;
    let totalCredits = 0;
    let hasLowBalance = false;
    
    for (const { enrollment, product } of enrollments) {
      const accessTag = product?.accessTag;
      
      if (accessTag === 'club_member') {
        hasSubscription = true;
      } else if (accessTag === 'pack_holder' && enrollment.remainingCredits) {
        totalCredits += enrollment.remainingCredits;
        if (enrollment.remainingCredits > 0 && enrollment.remainingCredits < 3) {
          hasLowBalance = true;
        }
      }
    }
    
    // Priority 2: Low Balance (any pack with < 3 credits remaining takes priority)
    if (hasLowBalance) {
      return { tag: 'low_balance', remainingCredits: totalCredits, lowBalance: true };
    }
    
    // Priority 3: Club Member (active subscription)
    if (hasSubscription) {
      return { tag: 'club_member' };
    }
    
    // Priority 4: Pack Holder (has credits but no subscription)
    if (totalCredits > 0) {
      return { tag: 'pack_holder', remainingCredits: totalCredits };
    }
    
    return { tag: 'none' };
  }
  
  async getPlayerStatusTagsBulk(playerIds: string[]): Promise<Map<string, {tag: string; remainingCredits?: number; lowBalance?: boolean}>> {
    const result = new Map<string, {tag: string; remainingCredits?: number; lowBalance?: boolean}>();
    
    if (playerIds.length === 0) {
      return result;
    }
    
    // Get all players with their payment status AND parent references (accountHolderId + parentId for legacy support)
    const players = await db.select({
      id: schema.users.id,
      paymentStatus: schema.users.paymentStatus,
      accountHolderId: schema.users.accountHolderId,
      parentId: schema.users.parentId,
    })
    .from(schema.users)
    .where(inArray(schema.users.id, playerIds));
    
    // Use accountHolderId preferentially, fallback to parentId for legacy data
    const playersMap = new Map(players.map(p => [p.id, { 
      paymentStatus: p.paymentStatus, 
      parentReference: p.accountHolderId || p.parentId || null
    }]));
    
    // Get unique parent references for family-wide enrollment lookup
    // Filter out both null and undefined values
    const parentReferences = [...new Set(
      players
        .map(p => p.accountHolderId || p.parentId)
        .filter((id): id is string => id !== null && id !== undefined && typeof id === 'string')
    )];
    
    // Get all direct enrollments for players
    const directEnrollments = await db.select({
      enrollment: schema.productEnrollments,
      product: schema.products,
    })
    .from(schema.productEnrollments)
    .leftJoin(schema.products, eq(schema.productEnrollments.programId, schema.products.id))
    .where(
      and(
        inArray(schema.productEnrollments.profileId, playerIds),
        eq(schema.productEnrollments.status, 'active')
      )
    );
    
    // Get family-wide enrollments (profileId is null) from parents
    let familyEnrollments: typeof directEnrollments = [];
    if (parentReferences.length > 0) {
      familyEnrollments = await db.select({
        enrollment: schema.productEnrollments,
        product: schema.products,
      })
      .from(schema.productEnrollments)
      .leftJoin(schema.products, eq(schema.productEnrollments.programId, schema.products.id))
      .where(
        and(
          isNull(schema.productEnrollments.profileId),
          inArray(schema.productEnrollments.accountHolderId, parentReferences),
          eq(schema.productEnrollments.status, 'active')
        )
      );
    }
    
    // Group direct enrollments by player profileId
    const enrollmentsByPlayer = new Map<string, Array<{enrollment: typeof schema.productEnrollments.$inferSelect, product: typeof schema.products.$inferSelect | null}>>();
    for (const row of directEnrollments) {
      const profileId = row.enrollment.profileId;
      if (profileId) {
        if (!enrollmentsByPlayer.has(profileId)) {
          enrollmentsByPlayer.set(profileId, []);
        }
        enrollmentsByPlayer.get(profileId)!.push(row);
      }
    }
    
    // Group family enrollments by accountHolderId (parent)
    const familyEnrollmentsByParent = new Map<string, typeof familyEnrollments>();
    for (const row of familyEnrollments) {
      const accountHolderId = row.enrollment.accountHolderId;
      if (!familyEnrollmentsByParent.has(accountHolderId)) {
        familyEnrollmentsByParent.set(accountHolderId, []);
      }
      familyEnrollmentsByParent.get(accountHolderId)!.push(row);
    }
    
    // Calculate status tag for each player
    for (const playerId of playerIds) {
      const playerInfo = playersMap.get(playerId);
      
      // Priority 1: Payment Due
      if (playerInfo?.paymentStatus === 'pending' || playerInfo?.paymentStatus === 'overdue') {
        result.set(playerId, { tag: 'payment_due' });
        continue;
      }
      
      // Combine direct enrollments and family-wide enrollments
      const directPlayerEnrollments = enrollmentsByPlayer.get(playerId) || [];
      const familyPlayerEnrollments = playerInfo?.parentReference 
        ? (familyEnrollmentsByParent.get(playerInfo.parentReference) || []) 
        : [];
      const allPlayerEnrollments = [...directPlayerEnrollments, ...familyPlayerEnrollments];
      
      let hasSubscription = false;
      let totalCredits = 0;
      let hasLowBalance = false;
      
      for (const { enrollment, product } of allPlayerEnrollments) {
        const accessTag = product?.accessTag;
        if (accessTag === 'club_member') {
          hasSubscription = true;
        } else if (accessTag === 'pack_holder' && enrollment.remainingCredits) {
          totalCredits += enrollment.remainingCredits;
          if (enrollment.remainingCredits > 0 && enrollment.remainingCredits < 3) {
            hasLowBalance = true;
          }
        }
      }
      
      // Priority 2: Low Balance
      if (hasLowBalance) {
        result.set(playerId, { tag: 'low_balance', remainingCredits: totalCredits, lowBalance: true });
        continue;
      }
      
      // Priority 3: Club Member
      if (hasSubscription) {
        result.set(playerId, { tag: 'club_member' });
        continue;
      }
      
      // Priority 4: Pack Holder
      if (totalCredits > 0) {
        result.set(playerId, { tag: 'pack_holder', remainingCredits: totalCredits });
        continue;
      }
      
      result.set(playerId, { tag: 'none' });
    }
    
    return result;
  }
  
  async getProductEnrollmentsByOrganization(organizationId: string): Promise<ProductEnrollment[]> {
    const results = await db.select().from(schema.productEnrollments)
      .where(eq(schema.productEnrollments.organizationId, organizationId));
    return results as ProductEnrollment[];
  }

  // Helper mapping functions
  private mapDbUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      organizationId: this.defaultOrgId,
      email: dbUser.email || '',
      role: (dbUser.role || 'parent') as any,
      firstName: dbUser.firstName || '',
      lastName: dbUser.lastName || '',
      profileImageUrl: dbUser.profileImageUrl,
      dateOfBirth: dbUser.dateOfBirth,
      phoneNumber: dbUser.phoneNumber,
      address: dbUser.address,
      city: dbUser.city,
      height: dbUser.height,
      age: dbUser.age,
      emergencyContact: dbUser.emergencyContact,
      emergencyPhone: dbUser.emergencyPhone,
      medicalInfo: dbUser.medicalInfo,
      allergies: dbUser.allergies,
      gender: undefined,
      accountHolderId: dbUser.parentId,
      parentId: dbUser.parentId,
      guardianId: dbUser.guardianId,
      packageSelected: undefined,
      teamAssignmentStatus: undefined,
      paymentStatus: dbUser.paymentStatus,
      hasRegistered: Boolean(dbUser.hasRegistered),
      teamId: dbUser.teamId?.toString(),
      jerseyNumber: dbUser.jerseyNumber,
      position: dbUser.position,
      program: undefined,
      rating: undefined,
      awardsCount: undefined,
      awards: dbUser.awards || [],
      totalPractices: dbUser.totalPractices || 0,
      totalGames: dbUser.totalGames || 0,
      consecutiveCheckins: dbUser.consecutiveCheckins || 0,
      videosCompleted: dbUser.videosCompleted || 0,
      yearsActive: dbUser.yearsActive || 0,
      stripeCustomerId: dbUser.stripeCustomerId,
      passcode: dbUser.passcode,
      password: dbUser.password,
      verified: Boolean(dbUser.verified),
      verificationToken: dbUser.verificationToken,
      verificationExpiry: dbUser.verificationExpiry ? new Date(dbUser.verificationExpiry) : undefined,
      magicLinkToken: dbUser.magicLinkToken,
      magicLinkExpiry: dbUser.magicLinkExpiry ? new Date(dbUser.magicLinkExpiry) : undefined,
      passwordResetToken: dbUser.passwordResetToken,
      passwordResetExpiry: dbUser.passwordResetExpiry ? new Date(dbUser.passwordResetExpiry) : undefined,
      googleId: dbUser.googleId,
      appleId: dbUser.appleId,
      isActive: Boolean(dbUser.isActive),
      createdAt: new Date(dbUser.createdAt),
      updatedAt: new Date(dbUser.updatedAt),
    };
  }

  private mapDbTeamToTeam(dbTeam: any): Team {
    return {
      id: dbTeam.id,
      organizationId: dbTeam.organizationId || this.defaultOrgId,
      name: dbTeam.name,
      programId: dbTeam.programId,
      programType: dbTeam.programType,
      divisionId: dbTeam.divisionId,
      coachId: dbTeam.coachId,
      assistantCoachIds: dbTeam.assistantCoachIds || [],
      season: dbTeam.season,
      organization: dbTeam.organization,
      location: dbTeam.location,
      scheduleLink: dbTeam.scheduleLink,
      rosterSize: dbTeam.rosterSize ?? 0,
      active: dbTeam.active ?? true,
      notes: dbTeam.notes,
      createdAt: new Date(dbTeam.createdAt),
      updatedAt: dbTeam.updatedAt ? new Date(dbTeam.updatedAt) : undefined,
    };
  }

  private mapDbEventToEvent(dbEvent: any): Event {
    return {
      id: dbEvent.id.toString(),
      organizationId: this.defaultOrgId,
      title: dbEvent.title,
      description: dbEvent.description,
      eventType: dbEvent.eventType,
      startTime: new Date(dbEvent.startTime),
      endTime: new Date(dbEvent.endTime),
      location: dbEvent.location,
      latitude: dbEvent.latitude ?? undefined,
      longitude: dbEvent.longitude ?? undefined,
      teamId: dbEvent.teamId?.toString(),
      opponentTeam: dbEvent.opponentTeam,
      visibility: dbEvent.visibility ?? undefined,
      assignTo: dbEvent.assignTo ?? undefined,
      rsvpRequired: dbEvent.rsvpRequired ?? false,
      capacity: dbEvent.capacity ?? undefined,
      allowCheckIn: dbEvent.allowCheckIn ?? false,
      checkInRadius: dbEvent.checkInRadius ?? undefined,
      sendNotifications: dbEvent.sendNotifications ?? false,
      createdBy: dbEvent.createdBy ?? undefined,
      status: dbEvent.status || 'active',
      isActive: dbEvent.isActive ?? true,
      createdAt: new Date(dbEvent.createdAt),
    };
  }

  private mapDbAttendanceToAttendance(dbAttendance: any): Attendance {
    return {
      id: dbAttendance.id.toString(),
      userId: dbAttendance.userId,
      eventId: dbAttendance.eventId.toString(),
      checkedInAt: new Date(dbAttendance.checkedInAt),
      type: (dbAttendance.type || 'advance') as "advance" | "onsite",
    };
  }

  private mapDbBadgeToAward(dbBadge: any): Award {
    return {
      id: dbBadge.id.toString(),
      organizationId: this.defaultOrgId,
      name: dbBadge.name,
      description: dbBadge.description,
      icon: dbBadge.icon,
      color: dbBadge.color,
      type: (dbBadge.type || 'badge') as "badge" | "trophy",
      category: dbBadge.category,
      isActive: dbBadge.isActive ?? true,
      createdAt: new Date(dbBadge.createdAt),
    };
  }

  private mapDbUserBadgeToUserAward(dbUserBadge: any): UserAward {
    return {
      id: dbUserBadge.id.toString(),
      userId: dbUserBadge.userId,
      awardId: dbUserBadge.badgeId.toString(),
      earnedAt: new Date(dbUserBadge.earnedAt),
    };
  }

  private mapDbAnnouncementToAnnouncement(dbAnnouncement: any): Announcement {
    return {
      id: dbAnnouncement.id.toString(),
      organizationId: this.defaultOrgId,
      title: dbAnnouncement.title,
      content: dbAnnouncement.content,
      authorId: dbAnnouncement.authorId,
      teamId: dbAnnouncement.teamId?.toString(),
      priority: (dbAnnouncement.priority || 'medium') as "low" | "medium" | "high",
      isActive: dbAnnouncement.isActive ?? true,
      createdAt: new Date(dbAnnouncement.createdAt),
    };
  }

  private mapDbMessageToMessage(dbMessage: any): Message {
    return {
      id: dbMessage.id.toString(),
      teamId: dbMessage.teamId.toString(),
      senderId: dbMessage.senderId,
      content: dbMessage.content,
      messageType: (dbMessage.messageType || 'text') as "text" | "system",
      createdAt: new Date(dbMessage.createdAt),
    };
  }

  private mapDbMessageWithSenderToMessage(row: any): Message {
    const message = row.message;
    const user = row.user;
    
    const baseMessage: any = {
      id: message.id.toString(),
      teamId: message.teamId.toString(),
      senderId: message.senderId,
      content: message.content,
      messageType: (message.messageType || 'text') as "text" | "system",
      createdAt: new Date(message.createdAt),
    };
    
    if (user) {
      baseMessage.sender = {
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        profileImageUrl: user.profileImageUrl || '',
        userType: user.role || user.userType || 'player',
      };
    }
    
    return baseMessage as Message;
  }

  private mapDbPaymentToPayment(dbPayment: any): Payment {
    return {
      id: dbPayment.id.toString(),
      organizationId: this.defaultOrgId,
      userId: dbPayment.userId,
      playerId: dbPayment.playerId, // For per-player billing: which specific player this payment covers
      amount: dbPayment.amount,
      currency: dbPayment.currency || 'usd',
      paymentType: dbPayment.paymentType,
      status: (dbPayment.status || 'pending') as "pending" | "completed" | "failed" | "refunded",
      description: dbPayment.description,
      dueDate: dbPayment.dueDate,
      paidAt: dbPayment.paidAt ? new Date(dbPayment.paidAt) : undefined,
      createdAt: new Date(dbPayment.createdAt),
    };
  }

  private mapDbDivisionToDivision(dbDivision: any): Division {
    return {
      id: dbDivision.id.toString(),
      organizationId: dbDivision.organizationId,
      name: dbDivision.name,
      description: dbDivision.description,
      ageRange: dbDivision.ageRange,
      teamIds: dbDivision.teamIds || [],
      isActive: dbDivision.isActive ?? true,
      createdAt: new Date(dbDivision.createdAt),
    };
  }

  private mapDbSkillToSkill(dbSkill: any): Skill {
    return {
      id: dbSkill.id.toString(),
      organizationId: dbSkill.organizationId,
      playerId: dbSkill.playerId,
      coachId: dbSkill.coachId,
      category: dbSkill.category,
      score: dbSkill.score,
      notes: dbSkill.notes,
      evaluatedAt: new Date(dbSkill.evaluatedAt),
      createdAt: new Date(dbSkill.createdAt),
    };
  }

  private mapDbEvaluationToEvaluation(dbEvaluation: any): Evaluation {
    return {
      id: dbEvaluation.id,
      organizationId: dbEvaluation.organizationId,
      playerId: dbEvaluation.playerId,
      coachId: dbEvaluation.coachId,
      quarter: dbEvaluation.quarter,
      year: dbEvaluation.year,
      scores: dbEvaluation.scores,
      notes: dbEvaluation.notes,
      createdAt: new Date(dbEvaluation.createdAt),
      updatedAt: new Date(dbEvaluation.updatedAt),
    };
  }

  private mapDbNotificationToNotification(dbNotification: any): Notification {
    return {
      id: dbNotification.id.toString(),
      organizationId: dbNotification.organizationId,
      types: dbNotification.types,
      title: dbNotification.title,
      message: dbNotification.message,
      recipientIds: dbNotification.recipientIds || [],
      sentBy: dbNotification.sentBy,
      sentAt: new Date(dbNotification.sentAt),
      readBy: dbNotification.readBy || [],
      relatedEventId: dbNotification.relatedEventId,
      status: dbNotification.status || 'pending',
      createdAt: new Date(dbNotification.createdAt),
    };
  }
  
  private mapDbEventWindowToEventWindow(dbWindow: any): EventWindow {
    return {
      id: dbWindow.id,
      eventId: dbWindow.eventId,
      windowType: dbWindow.windowType as "rsvp" | "checkin",
      openRole: dbWindow.openRole as "open" | "close",
      amount: dbWindow.amount,
      unit: dbWindow.unit as "minutes" | "hours" | "days",
      direction: dbWindow.direction as "before" | "after",
      isDefault: dbWindow.isDefault ?? false,
      createdAt: new Date(dbWindow.createdAt),
    };
  }
  
  private mapDbRsvpResponseToRsvpResponse(dbResponse: any): RsvpResponse {
    return {
      id: dbResponse.id,
      eventId: dbResponse.eventId,
      userId: dbResponse.userId,
      response: dbResponse.response as "attending" | "not_attending" | "no_response",
      respondedAt: new Date(dbResponse.respondedAt),
      createdAt: new Date(dbResponse.createdAt),
      updatedAt: new Date(dbResponse.updatedAt),
    };
  }
  
  private mapDbFacilityToFacility(dbFacility: any): Facility {
    return {
      id: dbFacility.id,
      organizationId: dbFacility.organizationId,
      name: dbFacility.name,
      address: dbFacility.address,
      latitude: dbFacility.latitude,
      longitude: dbFacility.longitude,
      isActive: dbFacility.isActive ?? true,
      createdAt: new Date(dbFacility.createdAt),
      createdBy: dbFacility.createdBy,
    };
  }

  private mapDbProgramToProgram(dbProgram: any): Program {
    return {
      id: dbProgram.id,
      organizationId: dbProgram.organizationId,
      name: dbProgram.name,
      slug: dbProgram.slug,
      description: dbProgram.description,
      type: dbProgram.type,
      billingCycle: dbProgram.billingCycle,
      price: dbProgram.price,
      billingModel: dbProgram.billingModel,
      pricingModel: dbProgram.pricingModel,
      duration: dbProgram.duration,
      durationDays: dbProgram.durationDays,
      installments: dbProgram.installments,
      installmentPrice: dbProgram.installmentPrice,
      stripePriceId: dbProgram.stripePriceId,
      stripeProductId: dbProgram.stripeProductId,
      category: dbProgram.category,
      tags: dbProgram.tags || [],
      eventTypes: dbProgram.eventTypes || [],
      coverageScope: dbProgram.coverageScope || [],
      ageGroups: dbProgram.ageGroups || [],
      autoAssignPlayers: dbProgram.autoAssignPlayers ?? false,
      linkedAwards: dbProgram.linkedAwards || [],
      adminNotes: dbProgram.adminNotes,
      isActive: dbProgram.isActive ?? true,
      createdAt: new Date(dbProgram.createdAt),
      // Social toggle fields
      hasSubgroups: dbProgram.hasSubgroups ?? true,
      subgroupLabel: dbProgram.subgroupLabel ?? 'Team',
      rosterVisibility: dbProgram.rosterVisibility ?? 'members',
      chatMode: dbProgram.chatMode ?? 'two_way',
      // Programs vs Store separation
      productCategory: dbProgram.productCategory ?? 'service',
      coverImageUrl: dbProgram.coverImageUrl,
      requiredGearProductIds: dbProgram.requiredGearProductIds || [],
      seasonStartDate: dbProgram.seasonStartDate,
      seasonEndDate: dbProgram.seasonEndDate,
      // Store-specific fields
      inventorySizes: dbProgram.inventorySizes || [],
      inventoryCount: dbProgram.inventoryCount,
      shippingRequired: dbProgram.shippingRequired ?? false,
    };
  }
  
  // Notification Campaign operations
  async getNotificationCampaign(id: number): Promise<NotificationCampaign | undefined> {
    const results = await db.select().from(schema.notificationCampaigns)
      .where(eq(schema.notificationCampaigns.id, id));
    return results[0] as NotificationCampaign | undefined;
  }
  
  async getNotificationCampaignsByOrganization(organizationId: string): Promise<NotificationCampaign[]> {
    const results = await db.select().from(schema.notificationCampaigns)
      .where(eq(schema.notificationCampaigns.organizationId, organizationId))
      .orderBy(desc(schema.notificationCampaigns.createdAt));
    return results as NotificationCampaign[];
  }
  
  async getPendingCampaigns(beforeTime: string): Promise<NotificationCampaign[]> {
    const results = await db.select().from(schema.notificationCampaigns)
      .where(
        and(
          eq(schema.notificationCampaigns.status, 'active'),
          lte(schema.notificationCampaigns.nextRunAt, beforeTime)
        )
      );
    return results as NotificationCampaign[];
  }
  
  async createNotificationCampaign(data: InsertNotificationCampaign): Promise<NotificationCampaign> {
    const results = await db.insert(schema.notificationCampaigns)
      .values(data)
      .returning();
    return results[0] as NotificationCampaign;
  }
  
  async updateNotificationCampaign(id: number, updates: Partial<NotificationCampaign>): Promise<NotificationCampaign | undefined> {
    const results = await db.update(schema.notificationCampaigns)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(schema.notificationCampaigns.id, id))
      .returning();
    return results[0] as NotificationCampaign | undefined;
  }
  
  async deleteNotificationCampaign(id: number): Promise<void> {
    await db.delete(schema.notificationCampaigns)
      .where(eq(schema.notificationCampaigns.id, id));
  }
  
  async createCampaignRun(data: InsertNotificationCampaignRun): Promise<NotificationCampaignRun> {
    const results = await db.insert(schema.notificationCampaignRuns)
      .values(data)
      .returning();
    return results[0] as NotificationCampaignRun;
  }
  
  async updateCampaignRun(id: number, updates: Partial<NotificationCampaignRun>): Promise<NotificationCampaignRun | undefined> {
    const results = await db.update(schema.notificationCampaignRuns)
      .set(updates)
      .where(eq(schema.notificationCampaignRuns.id, id))
      .returning();
    return results[0] as NotificationCampaignRun | undefined;
  }
  
  async getCampaignRunsByCampaign(campaignId: number): Promise<NotificationCampaignRun[]> {
    const results = await db.select().from(schema.notificationCampaignRuns)
      .where(eq(schema.notificationCampaignRuns.campaignId, campaignId))
      .orderBy(desc(schema.notificationCampaignRuns.scheduledAt));
    return results as NotificationCampaignRun[];
  }
  
  // Notification Trigger Rule operations
  async getNotificationTriggerRule(id: number): Promise<NotificationTriggerRule | undefined> {
    const results = await db.select().from(schema.notificationTriggerRules)
      .where(eq(schema.notificationTriggerRules.id, id));
    return results[0] as NotificationTriggerRule | undefined;
  }
  
  async getNotificationTriggerRulesByOrganization(organizationId: string): Promise<NotificationTriggerRule[]> {
    const results = await db.select().from(schema.notificationTriggerRules)
      .where(eq(schema.notificationTriggerRules.organizationId, organizationId));
    return results as NotificationTriggerRule[];
  }
  
  async getActiveNotificationTriggerRulesByType(organizationId: string, triggerType: string): Promise<NotificationTriggerRule[]> {
    const results = await db.select().from(schema.notificationTriggerRules)
      .where(
        and(
          eq(schema.notificationTriggerRules.organizationId, organizationId),
          eq(schema.notificationTriggerRules.triggerType, triggerType),
          eq(schema.notificationTriggerRules.isActive, true)
        )
      );
    return results as NotificationTriggerRule[];
  }
  
  async createNotificationTriggerRule(data: InsertNotificationTriggerRule): Promise<NotificationTriggerRule> {
    const results = await db.insert(schema.notificationTriggerRules)
      .values(data)
      .returning();
    return results[0] as NotificationTriggerRule;
  }
  
  async updateNotificationTriggerRule(id: number, updates: Partial<NotificationTriggerRule>): Promise<NotificationTriggerRule | undefined> {
    const results = await db.update(schema.notificationTriggerRules)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(schema.notificationTriggerRules.id, id))
      .returning();
    return results[0] as NotificationTriggerRule | undefined;
  }
  
  async deleteNotificationTriggerRule(id: number): Promise<void> {
    await db.delete(schema.notificationTriggerRules)
      .where(eq(schema.notificationTriggerRules.id, id));
  }
  
  async createTriggeredNotificationLog(data: InsertTriggeredNotificationLog): Promise<TriggeredNotificationLog> {
    const results = await db.insert(schema.triggeredNotificationLog)
      .values(data)
      .returning();
    return results[0] as TriggeredNotificationLog;
  }
  
  async getTriggeredNotificationLogsByUser(userId: string): Promise<TriggeredNotificationLog[]> {
    const results = await db.select().from(schema.triggeredNotificationLog)
      .where(eq(schema.triggeredNotificationLog.recipientUserId, userId))
      .orderBy(desc(schema.triggeredNotificationLog.createdAt));
    return results as TriggeredNotificationLog[];
  }
}

// Export both storage implementations
// Use DatabaseStorage for data persistence
export const storage = new DatabaseStorage();

// Export both storage classes for reference
export { DatabaseStorage, MemStorage };
