import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

// JWT-based authentication middleware (for mobile app)
export const requireJwt: RequestHandler = (req: any, res, next) => {
  const auth = req.headers.authorization;
  
  if (!auth) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  // Enforce Bearer token format
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Invalid authorization format. Use: Bearer <token>" });
  }

  const token = auth.substring(7); // Remove "Bearer " prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Validate required claims
    if (!decoded.userId || !decoded.organizationId || !decoded.role) {
      return res.status(401).json({ error: "Invalid token: missing required claims" });
    }
    
    // Set user with complete structure expected by routes
    req.user = {
      id: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
      claims: {
        sub: decoded.userId // For routes expecting req.user.claims.sub
      }
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Session-based authentication middleware (for web app - deprecated)
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
