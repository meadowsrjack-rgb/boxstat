import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

let storageRef: any = null;

export function setAuthStorage(storage: any) {
  storageRef = storage;
}

export const requireAuth: RequestHandler = async (req: any, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      if (decoded.userId && decoded.organizationId && decoded.role) {
        let orgId = decoded.organizationId;
        let role = decoded.role;

        if (storageRef) {
          try {
            const dbUser = await storageRef.getUser(decoded.userId);
            if (dbUser) {
              if (dbUser.organizationId) {
                orgId = dbUser.organizationId;
              }
              if (dbUser.role) {
                role = dbUser.role;
              }
            }
          } catch (e) {
          }
        }

        req.user = {
          id: decoded.userId,
          organizationId: orgId,
          role: role,
          claims: {
            sub: decoded.userId
          }
        };
        return next();
      }
    } catch (err: any) {
    }
  }
  
  if (req.session && req.session.userId) {
    let orgId = req.session.organizationId || "default-org";
    let role = req.session.role || "user";

    if (storageRef) {
      try {
        const dbUser = await storageRef.getUser(req.session.userId);
        if (dbUser) {
          if (dbUser.organizationId && dbUser.organizationId !== orgId) {
            orgId = dbUser.organizationId;
            req.session.organizationId = orgId;
          }
          if (dbUser.role && dbUser.role !== role) {
            role = dbUser.role;
            req.session.role = role;
          }
        }
      } catch (e) {
      }
    }

    req.user = { 
      id: req.session.userId, 
      organizationId: orgId, 
      role: role,
      claims: {
        sub: req.session.userId
      }
    };
    return next();
  }
  
  return res.status(401).json({ error: "Not authenticated" });
};

export const optionalAuth: RequestHandler = async (req: any, _res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (decoded.userId && decoded.organizationId && decoded.role) {
        let orgId = decoded.organizationId;
        let role = decoded.role;
        if (storageRef) {
          try {
            const dbUser = await storageRef.getUser(decoded.userId);
            if (dbUser) {
              if (dbUser.organizationId) orgId = dbUser.organizationId;
              if (dbUser.role) role = dbUser.role;
            }
          } catch (e) {}
        }
        req.user = {
          id: decoded.userId,
          organizationId: orgId,
          role: role,
          claims: { sub: decoded.userId }
        };
      }
    } catch (err: any) {}
  } else if (req.session && req.session.userId) {
    let orgId = req.session.organizationId || "default-org";
    let role = req.session.role || "user";
    if (storageRef) {
      try {
        const dbUser = await storageRef.getUser(req.session.userId);
        if (dbUser) {
          if (dbUser.organizationId && dbUser.organizationId !== orgId) {
            orgId = dbUser.organizationId;
            req.session.organizationId = orgId;
          }
          if (dbUser.role && dbUser.role !== role) {
            role = dbUser.role;
            req.session.role = role;
          }
        }
      } catch (e) {}
    }
    req.user = {
      id: req.session.userId,
      organizationId: orgId,
      role: role,
      claims: { sub: req.session.userId }
    };
  }
  next();
};

export const requireJwt: RequestHandler = requireAuth;

export const isAuthenticated: RequestHandler = requireAuth;

export const isAdmin: RequestHandler = (req: any, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

export const isCoachOrAdmin: RequestHandler = (req: any, res, next) => {
  if (!req.user || (req.user.role !== 'coach' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied. Coach or admin privileges required.' });
  }
  next();
};
