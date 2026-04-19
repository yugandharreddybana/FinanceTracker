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
  // CORS — strict origin whitelist
  // ---------------------------------------------------------------------------
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, health checks)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json());

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
