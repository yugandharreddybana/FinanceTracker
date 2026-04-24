import { Router, Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { registerUser, loginUser, findUserByEmail, changeUserPassword, deleteUserByEmail, verifyToken } from "../lib/auth.js";

const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: missing token" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Unauthorized: invalid or expired token" });
    return;
  }

  (req as any).user = payload;
  next();
};

const router = Router();

router.post("/register", authLimiter, (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const result = registerUser(email, password, name);
    res.json({ user: result.user, token: result.token });
  } catch (err: any) {
    if (err.message === "An account with this email already exists") {
      res.status(409).json({ error: "An account with this email already exists. Please login instead." });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

router.post("/login", authLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = loginUser(email, password);
    res.json({ user: result.user, token: result.token });
  } catch (err: any) {
    if (err.message === "Invalid email or password") {
      res.status(401).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Login failed" });
    }
  }
});

router.post("/forgot-password", authLimiter, (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  res.status(501).json({ notImplemented: true, error: "Password reset is not available — contact support." });
});

router.post("/change-password", (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const payload = authHeader ? verifyToken(authHeader) : null;
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    const { currentPassword, newPassword } = req.body || {};
    const email = payload.email;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }
    changeUserPassword(email, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message === "Current password is incorrect") return res.status(401).json({ error: err.message });
    if (err.message === "User not found") return res.status(404).json({ error: err.message });
    res.status(500).json({ error: "Password change failed" });
  }
});

router.delete("/account", async (req: Request, res: Response) => {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const payload = auth ? verifyToken(auth) : null;
  const email = payload?.email || (req.body && req.body.email);
  if (!email) return res.status(401).json({ error: "Unauthorized" });

  const uid = payload?.uid;
  const ok = deleteUserByEmail(email);
  if (!ok) return res.status(404).json({ error: "User not found" });

  // Trigger backend purge
  try {
    if (uid) {
      await fetch(`${BACKEND_URL}/api/finance/user-profiles/purge/${uid}`, { method: "DELETE" });
    } else {
      await fetch(`${BACKEND_URL}/api/finance/user-profiles/by-email/${encodeURIComponent(email)}`, { method: "DELETE" });
    }
  } catch (err) {
    console.error("Backend purge failed during account deletion:", err);
  }

  res.json({ ok: true });
});

router.get('/api/family/:id', authMiddleware, async (req, res) => {
  // For now return a stub — replace with real DB lookup
  res.json({
    id: req.params.id,
    name: 'Shared Family',
    members: [],
    sharedBudgets: [],
    sharedAccounts: []
  });
});

// ---------------------------------------------------------------------------
// WebAuthn passthrough proxy — forwards body and cookies for session affinity
// ---------------------------------------------------------------------------

async function proxyWebAuthn(req: Request, res: Response, subPath: string) {
  try {
    const url = `${BACKEND_URL}/api/auth/webauthn${subPath}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (req.headers.cookie) headers.cookie = req.headers.cookie as string;
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.setHeader("Set-Cookie", setCookie);
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (err: any) {
    res.status(502).json({ error: "Backend unavailable", details: err.message });
  }
}

router.post("/webauthn/register/options", (req, res) => proxyWebAuthn(req, res, "/register/options"));
router.post("/webauthn/register/verify", (req, res) => proxyWebAuthn(req, res, "/register/verify"));
router.post("/webauthn/login/options", (req, res) => proxyWebAuthn(req, res, "/login/options"));
router.post("/webauthn/login/verify", (req, res) => proxyWebAuthn(req, res, "/login/verify"));
router.delete("/webauthn/credentials", async (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string) || req.body?.email;
    if (!email) return res.status(400).json({ error: "email required" });
    const upstream = await fetch(`${BACKEND_URL}/api/auth/webauthn/credentials?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    res.status(upstream.status).send();
  } catch (err: any) {
    res.status(502).json({ error: "Backend unavailable", details: err.message });
  }
});

export const authRouter = router;
