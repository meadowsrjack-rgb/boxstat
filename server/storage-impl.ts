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
  type Notification,
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
  type InsertNotification,
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
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
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
  
  // Program operations
  getProgram(id: string): Promise<Program | undefined>;
  getProgramsByOrganization(organizationId: string): Promise<Program[]>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: string, updates: Partial<Program>): Promise<Program | undefined>;
  deleteProgram(id: string): Promise<void>;
  
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
  
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByOrganization(organizationId: string): Promise<Notification[]>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined>;
  deleteNotification(id: number): Promise<void>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
}

// =============================================
// In-Memory Storage Implementation
// =============================================

class MemStorage implements IStorage {
  private organizations: Map<string, Organization> = new Map();
  private users: Map<string, User> = new Map();
  private teams: Map<string, Team> = new Map();
  private events: Map<string, Event> = new Map();
  private attendances: Map<string, Attendance> = new Map();
  private awards: Map<string, Award> = new Map();
  private userAwards: Map<string, UserAward> = new Map();
  private announcements: Map<string, Announcement> = new Map();
  private messages: Map<string, Message> = new Map();
  private payments: Map<string, Payment> = new Map();
  private programs: Map<string, Program> = new Map();
  private packageSelections: Map<string, PackageSelection> = new Map();
  private divisions: Map<number, Division> = new Map();
  private skills: Map<number, Skill> = new Map();
  private notifications: Map<number, Notification> = new Map();
  private nextDivisionId = 1;
  private nextSkillId = 1;
  private nextNotificationId = 1;
  
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
        name: "Private Training - UYP Member",
        description: "One-on-one private training for UYP members",
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
        name: "Private Training - Non-UYP",
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
  
  // Team operations
  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }
  
  async getTeamsByOrganization(organizationId: string): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(team => team.organizationId === organizationId);
  }
  
  async getTeamsByCoach(coachId: string): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(team => team.coachIds.includes(coachId));
  }
  
  async createTeam(team: InsertTeam): Promise<Team> {
    const newTeam: Team = {
      ...team,
      id: this.generateId(),
      coachIds: team.coachIds ?? [],
      createdAt: new Date(),
    };
    this.teams.set(newTeam.id, newTeam);
    return newTeam;
  }
  
  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    const updated = { ...team, ...updates };
    this.teams.set(id, updated);
    return updated;
  }
  
  async deleteTeam(id: string): Promise<void> {
    this.teams.delete(id);
  }
  
  // Event operations
  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }
  
  async getEventsByOrganization(organizationId: string): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(event => event.organizationId === organizationId)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
  
  async getEventsByTeam(teamId: string): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(event => event.teamId === teamId)
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
      id: this.generateId(),
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      isActive: event.isActive ?? true,
      createdAt: new Date(),
    };
    this.events.set(newEvent.id, newEvent);
    return newEvent;
  }
  
  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updated = { ...event, ...updates };
    this.events.set(id, updated);
    return updated;
  }
  
  async deleteEvent(id: string): Promise<void> {
    this.events.delete(id);
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
      isActive: program.isActive ?? true,
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
      programIds: division.programIds ?? [],
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
}

// =============================================
// Database Storage Implementation
// =============================================

import { db } from "./db";
import { eq, and, gte } from "drizzle-orm";
import * as schema from "../shared/schema";

class DatabaseStorage implements IStorage {
  private defaultOrgId = "default-org";

  // Initialize test users for development
  async initializeTestUsers(): Promise<void> {
    try {
      // Check if test user already exists
      const existingUser = await this.getUserByEmail("test@example.com", this.defaultOrgId);
      
      if (!existingUser) {
        // Create test user with pre-verified status
        await this.createUser({
          organizationId: this.defaultOrgId,
          email: "test@example.com",
          password: Buffer.from("test123").toString('base64'),
          role: "parent",
          firstName: "Test",
          lastName: "User",
          verified: true, // Pre-verified for easy testing
          isActive: true,
          hasRegistered: true,
        });
        console.log('✅ Created pre-verified test user: test@example.com');
      }
    } catch (error) {
      console.error('Error initializing test users:', error);
    }
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    if (id !== this.defaultOrgId) return undefined;
    
    return {
      id: this.defaultOrgId,
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
  }

  async getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined> {
    if (subdomain !== "default") return undefined;
    return this.getOrganization(this.defaultOrgId);
  }

  async createOrganization(org: Omit<Organization, "id" | "createdAt" | "updatedAt">): Promise<Organization> {
    throw new Error("Organization creation not supported in database mode yet");
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | undefined> {
    return undefined;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const results = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (results.length === 0) return undefined;
    
    const user = results[0];
    return this.mapDbUserToUser(user);
  }

  async getUserByEmail(email: string, organizationId: string): Promise<User | undefined> {
    const results = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (results.length === 0) return undefined;
    
    const user = results[0];
    return this.mapDbUserToUser(user);
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    const results = await db.select().from(schema.users);
    return results.map(user => this.mapDbUserToUser(user));
  }

  async getUsersByTeam(teamId: string): Promise<User[]> {
    const teamIdNum = parseInt(teamId);
    const results = await db.select().from(schema.users).where(eq(schema.users.teamId, teamIdNum));
    return results.map(user => this.mapDbUserToUser(user));
  }

  async getUsersByRole(organizationId: string, role: string): Promise<User[]> {
    const results = await db.select().from(schema.users).where(eq(schema.users.role, role));
    return results.map(user => this.mapDbUserToUser(user));
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('DEBUG createUser - password received:', user.password ? '***SET***' : 'EMPTY');
    
    const dbUser = {
      id,
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
      verificationExpiry: updates.verificationExpiry?.toISOString(),
      magicLinkToken: updates.magicLinkToken,
      magicLinkExpiry: updates.magicLinkExpiry?.toISOString(),
      googleId: updates.googleId,
      appleId: updates.appleId,
      emergencyContact: updates.emergencyContact,
      emergencyPhone: updates.emergencyPhone,
      medicalInfo: updates.medicalInfo,
      allergies: updates.allergies,
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
    const results = await db.select().from(schema.teams).where(eq(schema.teams.coachId, coachId));
    return results.map(team => this.mapDbTeamToTeam(team));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const dbTeam = {
      name: team.name,
      ageGroup: team.ageGroup || '',
      color: team.color || '#1E40AF',
      coachId: team.coachIds?.[0],
      division: team.division,
      program: team.program,
      createdAt: new Date().toISOString(),
    };

    const results = await db.insert(schema.teams).values(dbTeam).returning();
    return this.mapDbTeamToTeam(results[0]);
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const teamId = parseInt(id);
    const dbUpdates: any = {
      name: updates.name,
      ageGroup: updates.ageGroup,
      color: updates.color,
      coachId: updates.coachIds?.[0],
      division: updates.division,
      program: updates.program,
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
      teamId: updates.teamId ? parseInt(updates.teamId) : undefined,
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
    const results = await db.select().from(schema.messages)
      .where(eq(schema.messages.teamId, teamIdNum));
    return results.map(msg => this.mapDbMessageToMessage(msg));
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

    const results = await db.insert(schema.messages).values(dbMessage).returning();
    return this.mapDbMessageToMessage(results[0]);
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
    const results = await db.select().from(schema.payments);
    return results.map(payment => this.mapDbPaymentToPayment(payment));
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    const results = await db.select().from(schema.payments)
      .where(eq(schema.payments.userId, userId));
    return results.map(payment => this.mapDbPaymentToPayment(payment));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const dbPayment = {
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency || 'usd',
      paymentType: payment.paymentType,
      status: payment.status || 'pending',
      description: payment.description,
      dueDate: payment.dueDate,
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

  // Program operations (placeholders - no database table yet)
  async getProgram(id: string): Promise<Program | undefined> {
    // Get all programs and find the one with matching ID
    const programs = await this.getProgramsByOrganization(this.defaultOrgId);
    return programs.find(program => program.id === id);
  }

  async getProgramsByOrganization(organizationId: string): Promise<Program[]> {
    // Return hardcoded programs until we migrate to proper database tables
    const programs: Program[] = [
      {
        id: 'youth-club-full',
        organizationId,
        name: 'Youth Club - Full Season',
        description: 'Complete youth basketball program with weekly training',
        price: 299,
        duration: '3 months',
        isActive: true,
        category: 'youth',
        ageGroups: [],
        createdAt: new Date(),
      },
      {
        id: 'skills-academy',
        organizationId,
        name: 'Skills Academy',
        description: 'Focused skill development program',
        price: 199,
        duration: '2 months',
        isActive: true,
        category: 'training',
        ageGroups: [],
        createdAt: new Date(),
      },
      {
        id: 'elite-training',
        organizationId,
        name: 'Elite Player Development',
        description: 'Advanced training for competitive players',
        price: 399,
        duration: '3 months',
        isActive: true,
        category: 'elite',
        ageGroups: [],
        createdAt: new Date(),
      },
    ];
    return programs;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    throw new Error("Program creation not supported in database mode yet");
  }

  async updateProgram(id: string, updates: Partial<Program>): Promise<Program | undefined> {
    return undefined;
  }

  async deleteProgram(id: string): Promise<void> {
    return;
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
      programIds: division.programIds || [],
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
      programIds: updates.programIds,
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
      type: notification.type,
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
      type: updates.type,
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
      packageSelected: undefined,
      teamAssignmentStatus: undefined,
      hasRegistered: dbUser.profileCompleted,
      teamId: dbUser.teamId?.toString(),
      jerseyNumber: dbUser.jerseyNumber,
      position: dbUser.position,
      program: undefined,
      rating: undefined,
      awardsCount: undefined,
      stripeCustomerId: dbUser.stripeCustomerId,
      passcode: dbUser.passcode,
      password: dbUser.password,
      verified: Boolean(dbUser.verified),
      verificationToken: dbUser.verificationToken,
      verificationExpiry: dbUser.verificationExpiry ? new Date(dbUser.verificationExpiry) : undefined,
      magicLinkToken: dbUser.magicLinkToken,
      magicLinkExpiry: dbUser.magicLinkExpiry ? new Date(dbUser.magicLinkExpiry) : undefined,
      googleId: dbUser.googleId,
      appleId: dbUser.appleId,
      isActive: Boolean(dbUser.isActive),
      createdAt: new Date(dbUser.createdAt),
      updatedAt: new Date(dbUser.updatedAt),
    };
  }

  private mapDbTeamToTeam(dbTeam: any): Team {
    return {
      id: dbTeam.id.toString(),
      organizationId: this.defaultOrgId,
      name: dbTeam.name,
      ageGroup: dbTeam.ageGroup,
      program: dbTeam.program,
      color: dbTeam.color || '#1E40AF',
      coachIds: dbTeam.coachId ? [dbTeam.coachId] : [],
      division: dbTeam.division,
      createdAt: new Date(dbTeam.createdAt),
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

  private mapDbPaymentToPayment(dbPayment: any): Payment {
    return {
      id: dbPayment.id.toString(),
      organizationId: this.defaultOrgId,
      userId: dbPayment.userId,
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
      programIds: dbDivision.programIds || [],
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

  private mapDbNotificationToNotification(dbNotification: any): Notification {
    return {
      id: dbNotification.id.toString(),
      organizationId: dbNotification.organizationId,
      type: dbNotification.type,
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
}

// Export both storage implementations
// Switched to DatabaseStorage for data persistence
export const storage = new DatabaseStorage();

// Export DatabaseStorage class for reference
export { DatabaseStorage };
