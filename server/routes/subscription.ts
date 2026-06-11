import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
const JAVA_BASE = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8081";

async function proxySubscription(req: Request, res: Response, path: string, method: string) {
  const user = (req as any).user;
  const userId = user?.uid;
  const authToken =
    req.headers.authorization ||
    ((req as any).cookies?.auth_token ? `Bearer ${(req as any).cookies.auth_token}` : undefined);

  try {
    const response = await fetch(`${JAVA_BASE}/api/subscription${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: authToken as string } : {}),
        ...(userId ? { "X-User-Id": userId } : {}),
      },
      body: method !== "GET" ? JSON.stringify(req.body ?? {}) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("[subscription] proxy error:", err);
    return res.status(503).json({ error: "Subscription service unavailable" });
  }
}

router.get("/me", authMiddleware, (req, res) => proxySubscription(req, res, "/me", "GET"));

export { router as subscriptionRouter };
