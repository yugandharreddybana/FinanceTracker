import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import { rateLimit } from "express-rate-limit";

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
import { getPgPool } from "./lib/auth.js";

async function startServer() {
  // M4: Validate required environment variables before starting
  const REQUIRED_ENV = ['JWT_SECRET', 'GEMINI_API_KEY'];
  const missing = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.warn('[WARN] DATABASE_URL not set — user data stored in local JSON file (NOT suitable for production)');
  }
  if (!process.env.JAVA_BACKEND_URL && !process.env.BACKEND_URL) {
    console.warn('[WARN] JAVA_BACKEND_URL not set — finance data proxies will target http://localhost:8080');
  }

  const app = express();

  // FIX: Trust Railway's reverse proxy so express-rate-limit can read X-Forwarded-For
  // Railway sits behind a load balancer that sets X-Forwarded-For.
  // Setting trust proxy to 1 tells Express to trust the first hop only.
  app.set('trust proxy', 1);

  // Ensure PORT is a number for Railway's process environment
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";

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

  // 1. CORS middleware — only allows exact origin matches; never uses wildcard with credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const matchedOrigin = ALLOWED_ORIGINS.find(o => o === origin);

    if (matchedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', matchedOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-Request-ID');
      // C3: Required for Private Network Access (Vercel → Railway)
      res.setHeader('Access-Control-Allow-Private-Network', 'true');

      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(200).end();
      }
    } else if (req.method === 'OPTIONS') {
      return res.status(403).end();
    }

    next();
  });

  // M6: Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  // Cookie parser — must come before routes so req.cookies is populated
  app.use(cookieParser());

  // Body size limit — 2 MB
  app.use(express.json({ limit: '2mb' }));

  // M10: X-Request-ID for distributed tracing
  app.use((req, _res, next) => {
    (req as any).requestId = req.headers['x-request-id'] || crypto.randomUUID();
    _res.setHeader('X-Request-ID', (req as any).requestId);
    next();
  });

  // E7: Request logging middleware
  app.use((req, _res, next) => {
    const start = Date.now();
    _res.on('finish', () => {
      const duration = Date.now() - start;
      const level = _res.statusCode >= 500 ? 'ERROR' : _res.statusCode >= 400 ? 'WARN' : 'INFO';
      console.log(`[${level}] ${req.method} ${req.path} ${_res.statusCode} ${duration}ms`);
    });
    next();
  });

  // 2. Routes
  app.use("/api/auth", authRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/investment", investmentRouter);

  // E6: Health check with dependency status — rate limited to prevent probing abuse
  const healthLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
  app.get("/api/health", healthLimiter, async (_req, res) => {
    const checks: Record<string, 'ok' | 'degraded' | 'down'> = {};

    // Check PostgreSQL
    try {
      const pool = await getPgPool();
      if (pool) {
        await pool.query('SELECT 1');
        checks.database = 'ok';
      } else {
        checks.database = 'degraded'; // using file fallback
      }
    } catch {
      checks.database = 'down';
    }

    // Check Java backend
    try {
      const r = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
      checks.javaBackend = r.ok ? 'ok' : 'degraded';
    } catch {
      checks.javaBackend = 'down';
    }

    const overall = Object.values(checks).every(v => v === 'ok') ? 'ok' : 'degraded';
    res.json({ status: overall, checks, port: PORT, uptime: process.uptime(), timestamp: new Date().toISOString() });
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

  // M3: Graceful shutdown
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> SERVER LIVE ON PORT ${PORT} <<<`);
  });

  async function shutdown(signal: string) {
    console.log(`[shutdown] Received ${signal}, closing server gracefully...`);
    server.close(async () => {
      try {
        const pool = await getPgPool();
        if (pool) await pool.end();
      } catch {}
      console.log('[shutdown] Server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[shutdown] Forced exit after timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
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
