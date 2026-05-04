import { Router, Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";
import { registerUser, loginUser, changeUserPassword, deleteUserByEmail, verifyToken, resetUserPassword } from "../lib/auth.js";
import { createClient } from "ioredis";

const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";

// FLAW #8 FIX: OTP store moved to Redis for durability + multi-instance safety
// Falls back to in-memory Map only in dev when REDIS_URL is not set.
let redis: ReturnType<typeof createClient> | null = null;
try {
  if (process.env.REDIS_URL) {
    redis = new createClient(process.env.REDIS_URL);
    redis.on("error", (err: Error) => console.error("[Redis] auth error:", err.message));
  }
} catch (e) {
  console.warn("[Redis] not available — OTP falls back to in-memory (dev only)");
}

// Fallback in-memory OTP store (development only — NOT suitable for production)
const memOtpStore = new Map<string, { otp: string; expires: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of memOtpStore.entries()) {
    if (now > record.expires) memOtpStore.delete(email);
  }
}, 5 * 60 * 1000);

async function storeOtp(email: string, otp: string): Promise<void> {
  if (redis) {
    // Hash OTP before storing — prevents plaintext exposure in Redis dumps/logs
    const hashed = crypto.createHash('sha256').update(otp).digest('hex');
    await redis.setex(`otp:${email}`, 900, hashed); // 15-minute TTL
  } else {
    memOtpStore.set(email, { otp, expires: Date.now() + 15 * 60 * 1000 });
  }
}

async function validateOtp(email: string, otp: string): Promise<boolean> {
  if (redis) {
    const stored = await redis.get(`otp:${email}`);
    if (!stored) return false;
    const incoming = crypto.createHash('sha256').update(otp).digest('hex');
    // Constant-time compare on hex strings (same byte length, safe)
    return crypto.timingSafeEqual(Buffer.from(stored, 'utf8'), Buffer.from(incoming, 'utf8'));
  } else {
    const record = memOtpStore.get(email);
    if (!record || Date.now() > record.expires) return false;
    return Buffer.byteLength(record.otp) === Buffer.byteLength(otp) &&
      crypto.timingSafeEqual(Buffer.from(record.otp), Buffer.from(otp));
  }
}

async function deleteOtp(email: string): Promise<void> {
  if (redis) {
    await redis.del(`otp:${email}`);
  } else {
    memOtpStore.delete(email);
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 86400000,
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if ((req as any).cookies?.auth_token) {
    token = (req as any).cookies.auth_token;
  }
  if (!token) {
    res.status(401).json({ error: "Unauthorized: missing token" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized: invalid or expired token" });
    return;
  }
  (req as any).user = payload;
  next();
};

const router = Router();

router.post("/register", authLimiter, async (req: Request, res: Response) => {
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
    const result = await registerUser(email, password, name);
    res.cookie("auth_token", result.token, cookieOptions);
    res.json({ user: result.user });
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
    res.cookie("auth_token", result.token, cookieOptions);
    res.json({ user: result.user });
  } catch (err: any) {
    if (err.message === "Invalid email or password") {
      res.status(401).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Login failed" });
    }
  }
});

router.post("/logout", sensitiveLimiter, (_req: Request, res: Response) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
  res.json({ ok: true });
});

router.get("/me", sensitiveLimiter, (req: Request, res: Response) => {
  const token = (req as any).cookies?.auth_token || req.headers.authorization?.slice(7);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  res.json({ user: { uid: payload.uid, email: payload.email, name: payload.name } });
});

// FLAW #8 FIX: OTP generated, hashed, and stored in Redis — NOT logged to console
router.post("/forgot-password", forgotPasswordLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  const otp = String(crypto.randomInt(100000, 1000000));
  await storeOtp(email, otp);
  // TODO: Replace with email provider (SendGrid / Mailgun / AWS SES)
  // DO NOT log the OTP in production — removed console.log from prior version
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV ONLY — REMOVE IN PROD] OTP for ${email}: ${otp}`);
  }
  res.json({ success: true, message: "If that email exists, a reset code has been sent." });
});

router.post("/reset-password", forgotPasswordLimiter, async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400).json({ error: "email, otp, and newPassword are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  const valid = await validateOtp(email, otp);
  if (!valid) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }
  try {
    await resetUserPassword(email, newPassword);
    await deleteOtp(email);
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message === "User not found") {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(500).json({ error: "Password reset failed" });
    }
  }
});

router.post("/change-password", sensitiveLimiter, async (req: Request, res: Response) => {
  try {
    const token = (req as any).cookies?.auth_token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const payload = token ? verifyToken(token) : null;
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    const { currentPassword, newPassword } = req.body || {};
    const email = payload.email;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }
    await changeUserPassword(email, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message === "Current password is incorrect") return res.status(401).json({ error: err.message });
    if (err.message === "User not found") return res.status(404).json({ error: err.message });
    res.status(500).json({ error: "Password change failed" });
  }
});

router.delete("/account", sensitiveLimiter, async (req: Request, res: Response) => {
  const token = (req as any).cookies?.auth_token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const payload = token ? verifyToken(token) : null;
  const email = payload?.email || (req.body && req.body.email);
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  const uid = payload?.uid;
  const ok = await deleteUserByEmail(email);
  if (!ok) return res.status(404).json({ error: "User not found" });
  try {
    if (uid) {
      await fetch(`${BACKEND_URL}/api/finance/user-profiles/purge/${encodeURIComponent(uid)}`, { method: "DELETE" });
    }
  } catch (err) {
    console.error("Backend purge failed during account deletion:", err);
  }
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// FLAW #9 FIX: Family routes proxy to Spring Boot backend (DB-persisted)
// The in-memory familyStore has been removed entirely.
// FamilyAccount entity + FamilyAccountRepository already exist in the backend.
// ---------------------------------------------------------------------------

async function proxyFamilyToBackend(req: Request, res: Response, path: string, method?: string) {
  const userId = (req as any).user?.uid;
  const authToken =
    req.headers.authorization ||
    ((req as any).cookies?.auth_token ? `Bearer ${(req as any).cookies.auth_token}` : undefined);
  try {
    const url = `${BACKEND_URL}/api/family${path}`;
    const options: RequestInit = {
      method: method || req.method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: authToken } : {}),
        ...(userId ? { "X-User-Id": userId } : {}),
      },
    };
    if (["POST", "PUT", "PATCH"].includes(options.method!)) {
      options.body = JSON.stringify({ ...req.body, userId });
    }
    const response = await fetch(url, options);
    if (response.status === 204) return res.status(204).send();
    const data = await response.json().catch(() => null);
    res.status(response.status).json(data);
  } catch {
    res.status(502).json({ error: "Backend unavailable" });
  }
}

router.post('/family', authMiddleware, sensitiveLimiter, (req, res) => proxyFamilyToBackend(req, res, ''));
router.get('/family/:id', authMiddleware, sensitiveLimiter, (req, res) => proxyFamilyToBackend(req, res, `/${encodeURIComponent(req.params.id)}`));
router.post('/family/:id/members', authMiddleware, sensitiveLimiter, (req, res) => proxyFamilyToBackend(req, res, `/${encodeURIComponent(req.params.id)}/members`));
router.delete('/family/:id/members/:uid', authMiddleware, sensitiveLimiter, (req, res) => proxyFamilyToBackend(req, res, `/${encodeURIComponent(req.params.id)}/members/${encodeURIComponent(req.params.uid)}`, 'DELETE'));
router.delete('/family/:id', authMiddleware, sensitiveLimiter, (req, res) => proxyFamilyToBackend(req, res, `/${encodeURIComponent(req.params.id)}`, 'DELETE'));

// ---------------------------------------------------------------------------
// WebAuthn passthrough proxy
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
    res.status(503).json({ error: 'Passkey authentication is not available', available: false });
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

// ---------------------------------------------------------------------------
// FLAW #10 FIX: Audit log endpoints now proxy to Spring Boot DB-backed service.
// Flat-file writes on ephemeral filesystem have been removed entirely.
// ---------------------------------------------------------------------------

async function proxyAuditToBackend(req: Request, res: Response, method: string) {
  const userId = (req as any).user?.uid;
  const authToken =
    req.headers.authorization ||
    ((req as any).cookies?.auth_token ? `Bearer ${(req as any).cookies.auth_token}` : undefined);
  try {
    const url = `${BACKEND_URL}/api/finance/audit/logs`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: authToken } : {}),
        ...(userId ? { "X-User-Id": userId } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify(req.body) } : {}),
    };
    const response = await fetch(url, options);
    if (response.status === 204) return res.status(204).send();
    const data = await response.json().catch(() => null);
    res.status(response.status).json(data);
  } catch {
    res.status(502).json({ error: "Audit service unavailable" });
  }
}

router.post('/audit/logs', authMiddleware, sensitiveLimiter, (req, res) => proxyAuditToBackend(req, res, 'POST'));
router.get('/audit/logs', authMiddleware, sensitiveLimiter, (req, res) => proxyAuditToBackend(req, res, 'GET'));

export const authRouter = router;
