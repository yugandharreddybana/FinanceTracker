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
  // CORS Configuration
  // ---------------------------------------------------------------------------
  app.use(cors({
    origin: true, // Reflect the request origin (Allow All)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
  }));

  // Manual Preflight handler to ensure OPTIONS requests never fail CORS
  app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.header('Origin') || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).send();
  });

  app.use(express.json());

  // Global error handler to ensure Errors have CORS headers (prevents CORS-blocked 500s)
  app.use((err: any, req: any, res: any, next: any) => {
    res.header('Access-Control-Allow-Origin', req.header('Origin') || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  // ---------------------------------------------------------------------------
  // Routes
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Middleware service running on port ${PORT}`);
    console.log(`Configured backend: ${process.env.VITE_API_URL || "localhost:8080"}`);
  });
}

startServer();
