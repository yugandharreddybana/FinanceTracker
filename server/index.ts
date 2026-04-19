import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { financeRouter } from "./routes/finance.ts";
import { aiRouter } from "./routes/ai.ts";
import { investmentRouter } from "./routes/investment.ts";
import { authRouter } from "./routes/auth.ts";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

  // ---------------------------------------------------------------------------
  // 1. MANUAL CORS HEADERS (Must be first)
  // ---------------------------------------------------------------------------
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Allow all origins for the deployment phase to guarantee connectivity
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle Preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  app.use(express.json());

  // ---------------------------------------------------------------------------
  // 2. Routes
  // ---------------------------------------------------------------------------
  app.use("/api/auth", authRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/investment", investmentRouter);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "middleware",
      backend_url: process.env.VITE_API_URL || "not configured",
    });
  });

  // ---------------------------------------------------------------------------
  // 3. GLOBAL ERROR HANDLER (Must be last)
  // ---------------------------------------------------------------------------
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('CRITICAL SERVER ERROR:', err);
    // Ensure headers aren't already sent before adding CORS
    if (!res.headersSent) {
      const origin = req.headers.origin;
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.status(err.status || 500).json({ 
      error: 'Internal Server Error',
      message: err.message,
      path: req.path
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Middleware service running on port ${PORT}`);
    console.log(`Configured backend: ${process.env.VITE_API_URL || "localhost:8080"}`);
  });
}

startServer();
