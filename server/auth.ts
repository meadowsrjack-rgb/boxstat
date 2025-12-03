import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

// Hybrid authentication middleware - accepts EITHER session OR JWT token
export const requireAuth: RequestHandler = (req: any, res, next) => {
  // First, try JWT authentication (for mobile apps)
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Validate required claims
      if (decoded.userId && decoded.organizationId && decoded.role) {
        req.user = {
          id: decoded.userId,
          organizationId: decoded.organizationId,
          role: decoded.role,
          claims: {
            sub: decoded.userId
          }
        };
        return next();
      }
    } catch (err: any) {
      // JWT invalid, fall through to session check
    }
  }
  
  // Fall back to session authentication (for web app)
  if (req.session && req.session.userId) {
    req.user = { 
      id: req.session.userId, 
      organizationId: req.session.organizationId || "default-org", 
      role: req.session.role || "user",
      claims: {
        sub: req.session.userId
      }
    };
    return next();
  }
  
  // Neither JWT nor session found
  return res.status(401).json({ error: "Not authenticated" });
};

// Legacy JWT-only middleware (deprecated - use requireAuth instead)
export const requireJwt: RequestHandler = requireAuth;

// Legacy session-only middleware (deprecated - use requireAuth instead)
export const isAuthenticated: RequestHandler = requireAuth;

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
