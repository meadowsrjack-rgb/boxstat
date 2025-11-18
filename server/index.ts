import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";

const app = express();

// Trust proxy - required for secure cookies behind Replit's infrastructure
app.set('trust proxy', 1);

// CORS configuration for mobile apps
app.use(cors({
  origin: [
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'http://localhost:5000',
    'https://boxstat.replit.app',
  ],
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Setup PostgreSQL session store for persistent sessions
const PgSession = connectPg(session);
const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days

// Create session store with PostgreSQL
const sessionStore = new PgSession({
  pool: db.$client,
  ttl: sessionTtl,
  tableName: "sessions",
  createTableIfMissing: true,
});

// Setup session middleware with persistent PostgreSQL storage
// Replit always serves over HTTPS, so we always need secure cookies
app.use(session({
  secret: process.env.SESSION_SECRET || 'sports-management-dev-secret-change-in-production',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // Replit always uses HTTPS
    sameSite: 'none', // Allow cross-origin for Capacitor
    maxAge: sessionTtl, // 30 days - persistent login
  },
  rolling: true, // Reset the cookie maxAge on every request to keep session alive
}));

// Serve static files from public directory (for trophies, assets, etc.)
const publicPath = path.resolve(import.meta.dirname, "..", "public");
app.use(express.static(publicPath));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    console.log('✅ Sports Management Platform ready!');
    console.log('📝 Database storage initialized');
    console.log('👤 Default admin user: admin@example.com');
    console.log('🏢 Default organization: My Sports Organization');
    console.log('\n🧪 Test Account Credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: test123');
    console.log('   Role: parent\n');
  });
})();
