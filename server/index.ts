import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import fs from "fs";
import path from "path";

// Ensure environment variables are loaded even if started from server subdirectory
if (!process.env.JWT_SECRET || !process.env.VITE_API_URL) {
  const rootEnv = path.join(process.cwd(), "..", ".env");
  const localEnv = path.join(process.cwd(), ".env");
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  } else if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
  }
}

import { financeRouter } from "./routes/finance.js";
import { aiRouter } from "./routes/ai.js";
import { investmentRouter } from "./routes/investment.js";
import { authRouter } from "./routes/auth.js";

async function startServer() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined in server/.env");
    process.exit(1);
  }

  const app = express();

  // Ensure PORT is a number for Railway's process environment
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

  console.log("-------------------------------------------------------------------");
  console.log("DEPLOYMENT DIAGNOSTICS");
  console.log("- Listening on PORT:", PORT);
  console.log("- Node Version:", process.version);
  console.log("-------------------------------------------------------------------");

  const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  if (ALLOWED_ORIGINS.length === 0) {
    console.warn('[CORS] ALLOWED_ORIGINS is empty — all cross-origin requests will be blocked');
  }

  if (!process.env.JAVA_BACKEND_URL && !process.env.BACKEND_URL) {
    console.warn('[WARN] JAVA_BACKEND_URL is not set — auth and finance proxies will default to http://localhost:8080');
  }

  // 1. CORS middleware — only allows exact origin matches; never uses wildcard with credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Only allow origins explicitly listed in the allowlist (no loose patterns)
    const matchedOrigin = ALLOWED_ORIGINS.find(o => o === origin);

    if (matchedOrigin) {
      // Use the allowlist value (not the raw request header) to prevent CORS header injection
      res.setHeader('Access-Control-Allow-Origin', matchedOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

      if (req.method === 'OPTIONS') {
        // S4: preflight caching
        res.setHeader('Access-Control-Max-Age', '86400');
        console.log(`[CORS] Handled preflight for: ${req.path}`);
        return res.status(200).end();
      }
    } else if (req.method === 'OPTIONS') {
      // Reject preflights from unknown origins
      return res.status(403).end();
    }

    next();
  });

  // S3: Cookie parser — must come before routes so req.cookies is populated
  app.use(cookieParser());

  // S8: Body size limit — 2 MB
  app.use(express.json({ limit: '2mb' }));

  // 2. Routes
  app.use("/api/auth", authRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/investment", investmentRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", port: PORT });
  });

  // 3. Last-Resort Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('SERVER CRASH PREVENTED:', err.message);
    if (!res.headersSent) {
      const errOrigin = req.headers.origin;
      // Only reflect an origin that is explicitly in the allowlist
      const matchedErrOrigin = errOrigin ? ALLOWED_ORIGINS.find(o => o === errOrigin) : undefined;
      if (matchedErrOrigin) {
        res.setHeader('Access-Control-Allow-Origin', matchedErrOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }
    res.status(500).json({ error: 'Server Error', message: err.message });
  });

  // Bind to 0.0.0.0 to ensure Railway can see the service
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> SERVER LIVE ON PORT ${PORT} <<<`);
  });
}

// Global Process Shield - Catch errors that normally kill the server silently
process.on('uncaughtException', (err) => {
  console.error('[STABILITY SHIELD] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[STABILITY SHIELD] Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch(err => {
  console.error("[STABILITY SHIELD] startServer failed:", err);
});
