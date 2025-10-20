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
      role: "admin",
      firstName: "Admin",
      lastName: "User",
      isActive: true,
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
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
    
    const updated = { ...user, ...updates, updatedAt: new Date() };
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
    return Array.from(this.attendances.values()).find(
      att => att.eventId === eventId && att.userId === userId
    );
  }
  
  async getAttendancesByEvent(eventId: string): Promise<Attendance[]> {
    return Array.from(this.attendances.values()).filter(att => att.eventId === eventId);
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
}

export const storage = new MemStorage();
