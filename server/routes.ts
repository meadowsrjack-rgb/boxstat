import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertTeamSchema,
  insertEventSchema,
  insertAttendanceSchema,
  insertAwardSchema,
  insertUserAwardSchema,
  insertAnnouncementSchema,
  insertMessageSchema,
  insertPaymentSchema,
  insertProgramSchema,
} from "@shared/schema";

let wss: WebSocketServer | null = null;

// Simple auth middleware for development (replace with proper auth in production)
const isAuthenticated = (req: any, res: any, next: any) => {
  // For now, assume we have a default admin user
  req.user = { id: "admin-1", organizationId: "default-org", role: "admin" };
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // =============================================
  // AUTH ROUTES
  // =============================================
  
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    res.json(user);
  });
  
  // =============================================
  // ORGANIZATION ROUTES
  // =============================================
  
  app.get('/api/organization', isAuthenticated, async (req: any, res) => {
    const org = await storage.getOrganization(req.user.organizationId);
    res.json(org);
  });
  
  app.patch('/api/organization', isAuthenticated, async (req: any, res) => {
    const { role, organizationId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update organization settings' });
    }
    
    const updated = await storage.updateOrganization(organizationId, req.body);
    res.json(updated);
  });
  
  // =============================================
  // USER MANAGEMENT ROUTES (Admin only)
  // =============================================
  
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const users = await storage.getUsersByOrganization(organizationId);
    res.json(users);
  });
  
  app.get('/api/users/role/:role', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const { role } = req.params;
    const users = await storage.getUsersByRole(organizationId, role);
    res.json(users);
  });
  
  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create users' });
    }
    
    const userData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(userData);
    res.json(user);
  });
  
  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update users' });
    }
    
    const updated = await storage.updateUser(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }
    
    await storage.deleteUser(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // TEAM ROUTES
  // =============================================
  
  app.get('/api/teams', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const teams = await storage.getTeamsByOrganization(organizationId);
    res.json(teams);
  });
  
  app.get('/api/teams/coach/:coachId', isAuthenticated, async (req: any, res) => {
    const teams = await storage.getTeamsByCoach(req.params.coachId);
    res.json(teams);
  });
  
  app.post('/api/teams', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can create teams' });
    }
    
    const teamData = insertTeamSchema.parse(req.body);
    const team = await storage.createTeam(teamData);
    res.json(team);
  });
  
  app.patch('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can update teams' });
    }
    
    const updated = await storage.updateTeam(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete teams' });
    }
    
    await storage.deleteTeam(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // EVENT ROUTES
  // =============================================
  
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const events = await storage.getEventsByOrganization(organizationId);
    res.json(events);
  });
  
  app.get('/api/events/upcoming', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const events = await storage.getUpcomingEvents(organizationId);
    res.json(events);
  });
  
  app.get('/api/events/team/:teamId', isAuthenticated, async (req: any, res) => {
    const events = await storage.getEventsByTeam(req.params.teamId);
    res.json(events);
  });
  
  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can create events' });
    }
    
    const eventData = insertEventSchema.parse(req.body);
    const event = await storage.createEvent(eventData);
    res.json(event);
  });
  
  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can update events' });
    }
    
    const updated = await storage.updateEvent(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can delete events' });
    }
    
    await storage.deleteEvent(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // ATTENDANCE ROUTES
  // =============================================
  
  app.get('/api/attendance/event/:eventId', isAuthenticated, async (req: any, res) => {
    const attendances = await storage.getAttendancesByEvent(req.params.eventId);
    res.json(attendances);
  });
  
  app.get('/api/attendance/user/:userId', isAuthenticated, async (req: any, res) => {
    const attendances = await storage.getAttendancesByUser(req.params.userId);
    res.json(attendances);
  });
  
  app.post('/api/attendance', isAuthenticated, async (req: any, res) => {
    const attendanceData = insertAttendanceSchema.parse(req.body);
    const attendance = await storage.createAttendance(attendanceData);
    res.json(attendance);
  });
  
  // =============================================
  // AWARD ROUTES
  // =============================================
  
  app.get('/api/awards', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const awards = await storage.getAwardsByOrganization(organizationId);
    res.json(awards);
  });
  
  app.post('/api/awards', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create awards' });
    }
    
    const awardData = insertAwardSchema.parse(req.body);
    const award = await storage.createAward(awardData);
    res.json(award);
  });
  
  app.patch('/api/awards/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update awards' });
    }
    
    const updated = await storage.updateAward(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/awards/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete awards' });
    }
    
    await storage.deleteAward(req.params.id);
    res.json({ success: true });
  });
  
  // User Awards
  app.get('/api/user-awards/:userId', isAuthenticated, async (req: any, res) => {
    const userAwards = await storage.getUserAwards(req.params.userId);
    res.json(userAwards);
  });
  
  app.post('/api/user-awards', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can award users' });
    }
    
    const userAwardData = insertUserAwardSchema.parse(req.body);
    const userAward = await storage.awardUser(userAwardData);
    res.json(userAward);
  });
  
  // =============================================
  // ANNOUNCEMENT ROUTES
  // =============================================
  
  app.get('/api/announcements', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const announcements = await storage.getAnnouncementsByOrganization(organizationId);
    res.json(announcements);
  });
  
  app.get('/api/announcements/team/:teamId', isAuthenticated, async (req: any, res) => {
    const announcements = await storage.getAnnouncementsByTeam(req.params.teamId);
    res.json(announcements);
  });
  
  app.post('/api/announcements', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can create announcements' });
    }
    
    const announcementData = insertAnnouncementSchema.parse(req.body);
    const announcement = await storage.createAnnouncement(announcementData);
    res.json(announcement);
  });
  
  app.patch('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can update announcements' });
    }
    
    const updated = await storage.updateAnnouncement(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach') {
      return res.status(403).json({ message: 'Only admins and coaches can delete announcements' });
    }
    
    await storage.deleteAnnouncement(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // MESSAGE ROUTES (Team Chat)
  // =============================================
  
  app.get('/api/messages/team/:teamId', isAuthenticated, async (req: any, res) => {
    const messages = await storage.getMessagesByTeam(req.params.teamId);
    res.json(messages);
  });
  
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    const messageData = insertMessageSchema.parse(req.body);
    const message = await storage.createMessage(messageData);
    
    // Broadcast to WebSocket clients if available
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'new_message', data: message }));
        }
      });
    }
    
    res.json(message);
  });
  
  // =============================================
  // PAYMENT ROUTES
  // =============================================
  
  app.get('/api/payments', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const payments = await storage.getPaymentsByOrganization(organizationId);
    res.json(payments);
  });
  
  app.get('/api/payments/user/:userId', isAuthenticated, async (req: any, res) => {
    const payments = await storage.getPaymentsByUser(req.params.userId);
    res.json(payments);
  });
  
  app.post('/api/payments', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create payments' });
    }
    
    const paymentData = insertPaymentSchema.parse(req.body);
    const payment = await storage.createPayment(paymentData);
    res.json(payment);
  });
  
  app.patch('/api/payments/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update payments' });
    }
    
    const updated = await storage.updatePayment(req.params.id, req.body);
    res.json(updated);
  });
  
  // =============================================
  // PROGRAM ROUTES
  // =============================================
  
  app.get('/api/programs', isAuthenticated, async (req: any, res) => {
    const { organizationId } = req.user;
    const programs = await storage.getProgramsByOrganization(organizationId);
    res.json(programs);
  });
  
  app.post('/api/programs', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create programs' });
    }
    
    const programData = insertProgramSchema.parse(req.body);
    const program = await storage.createProgram(programData);
    res.json(program);
  });
  
  app.patch('/api/programs/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update programs' });
    }
    
    const updated = await storage.updateProgram(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/programs/:id', isAuthenticated, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete programs' });
    }
    
    await storage.deleteProgram(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // HTTP SERVER SETUP
  // =============================================
  
  const server = createServer(app);
  
  // Note: WebSocket server disabled to avoid conflicts with Vite HMR
  // Uncomment if you need WebSocket functionality for real-time updates
  // wss = new WebSocketServer({ server });
  // wss.on('connection', (ws) => {
  //   console.log('WebSocket client connected');
  //   ws.on('message', (message) => {
  //     console.log('Received:', message.toString());
  //   });
  //   ws.on('close', () => {
  //     console.log('WebSocket client disconnected');
  //   });
  // });
  
  return server;
}
