import { Request, Response, NextFunction } from "express";

const JAVA_BASE = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8081";

export async function aiQuotaMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const userId = user?.uid;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const authToken =
    req.headers.authorization ||
    ((req as any).cookies?.auth_token ? `Bearer ${(req as any).cookies.auth_token}` : undefined);

  try {
    const response = await fetch(`${JAVA_BASE}/api/subscription/consume-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: authToken as string } : {}),
        "X-User-Id": userId,
      },
    });

    if (response.status === 429) {
      const body = await response.json().catch(() => ({}));
      return res.status(429).json(body);
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return res.status(response.status).json(body.error ? body : { error: "AI quota check failed" });
    }
    next();
  } catch (err) {
    console.error("[aiQuota] failed:", err);
    return res.status(503).json({ error: "Subscription service unavailable" });
  }
}
