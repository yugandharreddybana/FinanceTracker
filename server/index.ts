import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { financeRouter } from "./routes/finance.js";
import { aiRouter } from "./routes/ai.js";
import { investmentRouter } from "./routes/investment.js";
import { authRouter } from "./routes/auth.js";

async function startServer() {
  const app = express();
  // IMPORTANT: Priority on the PORT environment variable from Railway
  const PORT = process.env.PORT || 4000;

  console.log("-------------------------------------------------------------------");
  console.log("DEPLOYMENT DIAGNOSTICS");
  console.log("- Listening on PORT:", PORT);
  console.log("- Node Version:", process.version);
  console.log("-------------------------------------------------------------------");

  // 1. MEGA LOGGER & CORS (Must be first line of code)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${origin}`);
    
    // Nuclear CORS headers - set on EVERY request no matter what
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
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
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.status(500).json({ error: 'Server Error', message: err.message });
  });

  // Bind to 0.0.0.0 to ensure Railway can see the service
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> SERVER LIVE ON PORT ${PORT} <<<`);
  });
}

startServer();
