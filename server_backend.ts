import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { financeRouter } from "./server/routes/finance.ts";
import { aiRouter } from "./server/routes/ai.ts";
import { investmentRouter } from "./server/routes/investment.ts";
import { authRouter } from "./server/routes/auth.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 4000;

  app.use(cors());
  app.use(express.json());

  // API routes
  app.use("/api/auth", authRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/investment", investmentRouter);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Node.js Backend running on http://localhost:${PORT}`);
  });
}

startServer();
