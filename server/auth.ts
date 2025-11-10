import type { RequestHandler } from "express";

// Session-based authentication middleware
export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session && req.session.userId) {
    req.user = { 
      id: req.session.userId, 
      organizationId: req.session.organizationId || "default-org", 
      role: req.session.role || "user" 
    };
    next();
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
};

// Middleware to check if user is admin
export const isAdmin: RequestHandler = (req: any, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Middleware to check if user is coach or admin
export const isCoachOrAdmin: RequestHandler = (req: any, res, next) => {
  if (!req.user || (req.user.role !== 'coach' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied. Coach or admin privileges required.' });
  }
  next();
};
