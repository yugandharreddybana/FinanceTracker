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
    .map((o) => o.trim().replace(/\/$/, "")); // Remove trailing slashes

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        const normalizedOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
        } else {
          console.error(`CORS Blocked: Origin "${origin}" not in [${allowedOrigins.join(", ")}]`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
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
