import express from "express";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";

// Ensure environment variables are loaded even if started from server subdirectory
if (!process.env.JWT_SECRET) {
  const rootEnv = path.join(process.cwd(), "..", ".env");
  const localEnv = path.join(process.cwd(), ".env");
  if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
  else if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv });
}

import { financeRouter } from "./routes/finance.js";
import { aiRouter } from "./routes/ai.js";
import { investmentRouter } from "./routes/investment.js";
import { authRouter } from "./routes/auth.js";

async function startServer() {
  // ── Startup environment validation ────────────────────────────────────────
  const IS_PROD = process.env.NODE_ENV === "production";
  const REQUIRED_ENV = ["JWT_SECRET"];
  if (IS_PROD) REQUIRED_ENV.push("DATABASE_URL");
  const missing = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Non-fatal warnings for optional-but-important vars
  if (!process.env.NVIDIA_API_KEY) {
    console.warn("[WARN] NVIDIA_API_KEY is not set — all AI endpoints (/api/ai/*) will return 503.");
  }
  if (!process.env.DATABASE_URL) {
    console.warn("[WARN] DATABASE_URL is not set — user accounts stored in local JSON file (dev only).");
  }
  if (!process.env.JAVA_BACKEND_URL && !process.env.BACKEND_URL) {
    console.warn("[WARN] JAVA_BACKEND_URL not set — finance data proxies will target http://localhost:8080.");
  }
  if (!process.env.FRONTEND_URL) {
    console.warn("[WARN] FRONTEND_URL not set — only localhost origins will be allowed by CORS.");
  }

  const app = express();
  app.disable("x-powered-by");

  // Trust Railway's reverse proxy so rate-limit reads X-Forwarded-For correctly
  app.set("trust proxy", 1);

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

  console.log("-------------------------------------------------------------------");
  console.log("DEPLOYMENT DIAGNOSTICS");
  console.log("- Listening on PORT:", PORT);
  console.log("- Node Version:", process.version);
  console.log("- AI Provider: NVIDIA NIM (meta/llama-3.3-70b-instruct)");
  console.log("- AI Ready:", !!process.env.NVIDIA_API_KEY);
  console.log("- DB Mode:", process.env.DATABASE_URL ? "PostgreSQL" : "JSON file fallback");
  console.log("-------------------------------------------------------------------");

  // ── CORS ──────────────────────────────────────────────────────────────────
  const rawFrontendUrl = process.env.FRONTEND_URL || "";
  const extraOrigins = rawFrontendUrl.split(",").map(s => s.trim()).filter(Boolean);

  const ALLOWED_ORIGINS = [
    ...extraOrigins,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);

  console.log("[CORS] Allowed origins:", ALLOWED_ORIGINS);

  // Phase3.0001: always emit Vary: Origin so shared CDNs cache CORS responses
  // per-origin, and never 403 a preflight just because the Origin header is absent
  // (same-origin tools and curl will hit /api/health legitimately without one).
  app.use((req, res, next) => {
    res.setHeader("Vary", "Origin");
    const origin = req.headers.origin;
    const matched = origin ? ALLOWED_ORIGINS.find(o => o === origin) : undefined;
    if (matched) {
      res.setHeader("Access-Control-Allow-Origin", matched);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, X-Request-ID, X-Idempotency-Key");
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    if (req.method === "OPTIONS") {
      return res.status(matched ? 204 : 403).end();
    }
    next();
  });

  // ── Security headers ──────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    // HSTS — only send in production to avoid breaking local dev
    if (IS_PROD) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
    // Content-Security-Policy — restrictive default for a JSON+SSE API.
    // Phase3.0011: connect-src 'self' is required so the SSE endpoint
    // (/api/finance/mcp/sse) is not blocked when the server is hit via fetch from
    // its own origin (e.g. health probes, curl, server-to-server).
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; connect-src 'self'; frame-ancestors 'none'"
    );
    next();
  });

  // ── Request logger ────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
      console.log(`[${level}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    });
    next();
  });

  // ── Middleware ────────────────────────────────────────────────────────────
  app.use(cookieParser());

  // Phase3.0013: tight default body cap; specific routes that legitimately accept
  // large payloads (file analysis) opt-in to a larger limit at their own mount point.
  app.use(express.json({ limit: "256kb" }));
  app.use("/api/ai/analyze-file", express.json({ limit: "2mb" }));

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use("/api/auth", authRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/investment", investmentRouter);

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/api/health", async (_req, res) => {
    const checks: Record<string, string> = {};

    // Check Java backend
    try {
      const r = await fetch(
        `${process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080"}/api/health`,
        { signal: AbortSignal.timeout(3000) }
      );
      checks.javaBackend = r.ok ? "ok" : "degraded";
    } catch {
      checks.javaBackend = "down";
    }

    checks.ai = process.env.NVIDIA_API_KEY ? "ok" : "not_configured";
    checks.database = process.env.DATABASE_URL ? "postgresql" : "json_file_fallback";

    const overall = Object.values(checks).every(v => v === "ok" || v === "postgresql") ? "ok" : "degraded";
    res.json({
      status: overall,
      checks,
      port: PORT,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // ── Global error handler ──────────────────────────────────────────────────
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const correlationId = randomUUID();
    console.error(`[SERVER ERROR][${correlationId}]`, err);
    if (!res.headersSent) {
      const errOrigin = req.headers.origin;
      const matched = errOrigin ? ALLOWED_ORIGINS.find(o => o === errOrigin) : undefined;
      if (matched) {
        res.setHeader("Access-Control-Allow-Origin", matched);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    }

    const payload: Record<string, string> = {
      error: "Server Error",
      correlationId,
    };

    if (!IS_PROD) {
      payload.message = err instanceof Error ? err.message : 'Server Error';
    }

    res.status(500).json(payload);
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> SERVER LIVE ON PORT ${PORT} <<<`);
  });

  // Graceful shutdown
  async function shutdown(signal: string) {
    console.log(`[shutdown] ${signal} received — closing gracefully...`);
    server.close(() => {
      console.log("[shutdown] HTTP server closed.");
      process.exit(0);
    });
    setTimeout(() => { console.error("[shutdown] Forced exit"); process.exit(1); }, 10000);
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Global stability shield
process.on("uncaughtException", err => console.error("[STABILITY SHIELD] Uncaught Exception:", err));
process.on("unhandledRejection", (reason, promise) => console.error("[STABILITY SHIELD] Unhandled Rejection at:", promise, "reason:", reason));

startServer().catch(err => console.error("[STABILITY SHIELD] startServer failed:", err));
