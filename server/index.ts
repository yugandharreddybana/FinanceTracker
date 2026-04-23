import express from "express";
import dotenv from "dotenv";

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

  if (!process.env.JAVA_BACKEND_URL && !process.env.BACKEND_URL) {
    console.warn('[WARN] JAVA_BACKEND_URL is not set — auth and finance proxies will default to http://localhost:8080');
  }

  // 1. MEGA LOGGER & CORS (Must be first line of code)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed = origin && (
      ALLOWED_ORIGINS.includes(origin) || 
      origin.endsWith('.vercel.app') || 
      origin.includes('localhost')
    );
    
    const allowedOrigin = isAllowed ? origin : (ALLOWED_ORIGINS[0] || '*');
    // Nuclear CORS headers - set on EVERY request no matter what
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin!);

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      console.log(`[CORS] Handled preflight for: ${req.path}`);
      return res.status(200).end();
    }
    next();
  });

  app.use(express.json());

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
      const allowedErrOrigin = errOrigin && ALLOWED_ORIGINS.includes(errOrigin) ? errOrigin : ALLOWED_ORIGINS[0];
      res.setHeader('Access-Control-Allow-Origin', allowedErrOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
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
