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

  // FIX: Trust Railway's reverse proxy so express-rate-limit can read X-Forwarded-For
  // Railway sits behind a load balancer that sets X-Forwarded-For.
  // Setting trust proxy to 1 tells Express to trust the first hop only.
  app.set('trust proxy', 1);

  // Ensure PORT is a number for Railway's process environment
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

  console.log("-------------------------------------------------------------------");
  console.log("DEPLOYMENT DIAGNOSTICS");
  console.log("- Listening on PORT:", PORT);
  console.log("- Node Version:", process.version);
  console.log("- Trust Proxy: enabled (1 hop)");
  console.log("-------------------------------------------------------------------");

  // Build allowed origins list — supports multiple comma-separated values in FRONTEND_URL
  const rawFrontendUrl = process.env.FRONTEND_URL || '';
  const extraOrigins = rawFrontendUrl
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const ALLOWED_ORIGINS = [
    ...extraOrigins,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
  ].filter((v, i, arr) => v && arr.indexOf(v) === i) as string[];

  console.log('[CORS] Allowed origins:', ALLOWED_ORIGINS);

  if (!process.env.FRONTEND_URL) {
    console.warn('[CORS] FRONTEND_URL is not set — only localhost origins are allowed. Set FRONTEND_URL on Railway.');
  }

  if (!process.env.JAVA_BACKEND_URL && !process.env.BACKEND_URL) {
    console.warn('[WARN] JAVA_BACKEND_URL is not set — auth and finance proxies will default to http://localhost:8080');
  }

  // 1. CORS middleware — only allows exact origin matches; never uses wildcard with credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const matchedOrigin = ALLOWED_ORIGINS.find(o => o === origin);

    if (matchedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', matchedOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(200).end();
      }
    } else if (req.method === 'OPTIONS') {
      return res.status(403).end();
    }

    next();
  });

  // Cookie parser — must come before routes so req.cookies is populated
  app.use(cookieParser());

  // Body size limit — 2 MB
  app.use(express.json({ limit: '2mb' }));

  // 2. Routes
  app.use("/api/auth", authRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/investment", investmentRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", port: PORT, trustProxy: true });
  });

  // 3. Last-Resort Error Handler
  app.use((err: any, req: any, res: any, _next: any) => {
    console.error('SERVER CRASH PREVENTED:', err.message);
    if (!res.headersSent) {
      const errOrigin = req.headers.origin;
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

// Global Process Shield
process.on('uncaughtException', (err) => {
  console.error('[STABILITY SHIELD] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[STABILITY SHIELD] Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch(err => {
  console.error("[STABILITY SHIELD] startServer failed:", err);
});
