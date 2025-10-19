import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { isCoachEmail, isAdminEmail } from "./coaches";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  console.log("Upserting user with claims:", claims);
  
  const email = claims["email"];
  // Check for admin BEFORE coach to ensure admin email doesn't get classified as coach
  const isAdmin = isAdminEmail(email);
  const isCoach = !isAdmin && isCoachEmail(email);
  
  const userData = {
    id: claims["sub"],
    email: email,
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    userType: isAdmin ? "admin" as const : (isCoach ? "coach" as const : "parent" as const),
    profileCompleted: false, // Will be set to true after checking if profiles exist
  };
  
  console.log("User data to upsert:", userData);
  console.log(`Email ${email} identified as ${isAdmin ? 'ADMIN' : (isCoach ? 'COACH' : 'PARENT/PLAYER')}`);
  
  await storage.upsertUser(userData);
  console.log("User upserted successfully");
  
  // For coaches (not admin), auto-create their profile if they don't have one
  if (isCoach && !isAdmin) {
    try {
      const existingProfiles = await storage.getAccountProfiles(userData.id);
      if (existingProfiles.length === 0) {
        console.log("Auto-creating coach profile for", email);
        const profileId = `coach-profile-${userData.id}-${Date.now()}`;
        await storage.createProfile({
          id: profileId,
          accountId: userData.id,
          profileType: "coach",
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          profileImageUrl: userData.profileImageUrl,
          profileCompleted: true,
          isActive: true
        });
        // Update user as profile completed
        await storage.updateUser(userData.id, { profileCompleted: true });
        console.log("Coach profile auto-created successfully");
      }
    } catch (error) {
      console.error("Error auto-creating coach profile:", error);
    }
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }
      
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        try {
          const userId = user.claims?.sub;
          const email = user.claims?.email;
          
          if (!userId || !email) {
            return res.redirect("/");
          }
          
          // Check if this is an admin account (highest priority)
          if (isAdminEmail(email)) {
            // Create admin profile if it doesn't exist
            const existingProfiles = await storage.getAccountProfiles(userId);
            const adminProfile = existingProfiles.find(p => p.profileType === "admin");
            
            if (!adminProfile) {
              // Create admin profile
              const adminProfileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              await storage.createProfile({
                id: adminProfileId,
                accountId: userId,
                profileType: "admin",
                firstName: "Admin",
                lastName: "UYP",
                profileCompleted: true,
                verified: true,
              });
            }
            
            // Admin goes to profile selection to see their admin profile
            return res.redirect("/");
          }
          
          // Check if this is a coach account
          if (isCoachEmail(email)) {
            // Coaches go directly to coach dashboard
            return res.redirect("/coach-dashboard");
          }
          
          // For non-coaches/non-admins, check if they have existing profiles
          const existingProfiles = await storage.getAccountProfiles(userId);
          
          if (existingProfiles && existingProfiles.length > 0) {
            // User has profiles, send them to profile selection
            return res.redirect("/");
          }
          
          // No profiles, send to profile type selection
          return res.redirect("/select-profile-type");
        } catch (error) {
          console.error("Error in callback redirect logic:", error);
          return res.redirect("/");
        }
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        res.clearCookie('connect.sid');
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
