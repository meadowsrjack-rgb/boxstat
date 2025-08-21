import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { ensureAuxTables } from "./boot";
import { setupVite, serveStatic, log } from "./vite";
import { initializeScheduler } from "./scheduler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Ensure auxiliary DB tables exist
ensureAuxTables().catch(err => console.error('ensureAuxTables failed', err));

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

  // Add a basic test route before Vite middleware
  app.get('/debug', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Debug Test</title></head>
      <body>
        <h1>Direct Server Test</h1>
        <p>Server is working properly at ${new Date().toISOString()}</p>
        <script>console.log('Direct test loaded');</script>
      </body>
      </html>
    `);
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
  
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Retrying in 2 seconds...`);
      setTimeout(() => {
        server.close();
        server.listen({
          port,
          host: "0.0.0.0",
          reusePort: true,
        });
      }, 2000);
    } else {
      console.error('Server error:', err);
    }
  });
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    // Initialize calendar sync scheduler after server starts
    initializeScheduler();
  });
})();
