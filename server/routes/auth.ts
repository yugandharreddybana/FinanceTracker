import { Router, Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";
import {
  registerUser,
  loginUser,
  changeUserPassword,
  deleteUserByEmail,
  verifyToken,
  resetUserPassword,
  createToken,
  markEmailVerified,
  findUserByEmail,
} from "../lib/auth.js";
import { Redis } from "ioredis";

const IS_PROD = process.env.NODE_ENV === "production";

/** SMTP/nodemailer path is not implemented yet — only SendGrid REST counts as configured. */
function emailDeliveryConfigured(): boolean {
  return !!(process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM);
}

const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8081";

// FLAW #8 FIX: OTP store moved to Redis for durability + multi-instance safety
// Falls back to in-memory Map only in dev when REDIS_URL is not set.
let redis: Redis | null = null;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL!);
    redis.on("error", (err: Error) => console.error("[Redis] auth error:", err.message));
  }
} catch (e) {
  console.warn("[Redis] not available — OTP falls back to in-memory (dev only)");
}

// Fallback in-memory OTP store holds SHA-256 hex digest (matches Redis path).
const memOtpStore = new Map<string, { otpHash: string; expires: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of memOtpStore.entries()) {
    if (now > record.expires) memOtpStore.delete(email);
  }
}, 5 * 60 * 1000);

async function storeOtp(email: string, otp: string): Promise<void> {
  const hashed = crypto.createHash("sha256").update(otp).digest("hex");
  if (redis) {
    await redis.setex(`otp:${email}`, 900, hashed); // 15-minute TTL
  } else {
    memOtpStore.set(email, { otpHash: hashed, expires: Date.now() + 15 * 60 * 1000 });
  }
}

async function validateOtp(email: string, otp: string): Promise<boolean> {
  const incoming = crypto.createHash("sha256").update(otp).digest("hex");
  if (redis) {
    const stored = await redis.get(`otp:${email}`);
    if (!stored) return false;
    return crypto.timingSafeEqual(Buffer.from(stored, "utf8"), Buffer.from(incoming, "utf8"));
  }
  const record = memOtpStore.get(email);
  if (!record || Date.now() > record.expires) return false;
  return crypto.timingSafeEqual(Buffer.from(record.otpHash, "utf8"), Buffer.from(incoming, "utf8"));
}

async function deleteOtp(email: string): Promise<void> {
  if (redis) {
    await redis.del(`otp:${email}`);
  } else {
    memOtpStore.delete(email);
  }
}

// ---------------------------------------------------------------------------
// Per-email login lockout — Phase2.0007
// IP-based rate limit alone is bypassable via rotating IPs, so we additionally
// lock an account after N failed login attempts in the rolling window.
// ---------------------------------------------------------------------------
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_SECONDS = 900; // 15 minutes
const memLockoutStore = new Map<string, { count: number; expires: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of memLockoutStore.entries()) {
    if (now > record.expires) memLockoutStore.delete(email);
  }
}, 5 * 60 * 1000);

function lockoutKey(email: string): string {
  return `login_fail:${email.toLowerCase()}`;
}

async function getFailureCount(email: string): Promise<number> {
  const key = lockoutKey(email);
  if (redis) {
    const v = await redis.get(key);
    return v ? parseInt(v, 10) : 0;
  }
  const rec = memLockoutStore.get(key);
  if (!rec || rec.expires < Date.now()) return 0;
  return rec.count;
}

async function incrementFailureCount(email: string): Promise<number> {
  const key = lockoutKey(email);
  if (redis) {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, LOCKOUT_WINDOW_SECONDS);
    return n;
  }
  const rec = memLockoutStore.get(key);
  const now = Date.now();
  if (rec && rec.expires > now) {
    rec.count += 1;
    return rec.count;
  }
  memLockoutStore.set(key, { count: 1, expires: now + LOCKOUT_WINDOW_SECONDS * 1000 });
  return 1;
}

async function clearFailureCount(email: string): Promise<void> {
  const key = lockoutKey(email);
  if (redis) {
    await redis.del(key);
  } else {
    memLockoutStore.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Email verification token store — Phase2.0013
// Token TTL: 24 hours; bound to email; consumed on first successful verify.
// ---------------------------------------------------------------------------
const memVerifyTokenStore = new Map<string, { email: string; expires: number }>();
const memResetTokenStore = new Map<string, { email: string; expires: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [token, record] of memVerifyTokenStore.entries()) {
    if (now > record.expires) memVerifyTokenStore.delete(token);
  }
  for (const [token, record] of memResetTokenStore.entries()) {
    if (now > record.expires) memResetTokenStore.delete(token);
  }
}, 10 * 60 * 1000);

async function storeVerificationToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  if (redis) {
    await redis.setex(`verify:${token}`, 86400, email.toLowerCase());
  } else {
    memVerifyTokenStore.set(token, {
      email: email.toLowerCase(),
      expires: Date.now() + 86400 * 1000,
    });
  }
  return token;
}

async function consumeVerificationToken(token: string): Promise<string | null> {
  if (redis) {
    const email = await redis.get(`verify:${token}`);
    if (!email) return null;
    await redis.del(`verify:${token}`);
    return email;
  }
  const rec = memVerifyTokenStore.get(token);
  if (!rec || rec.expires < Date.now()) return null;
  memVerifyTokenStore.delete(token);
  return rec.email;
}

async function storeResetToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  if (redis) {
    await redis.setex(`reset_tok:${token}`, 3600, email.toLowerCase()); // 1 hour
  } else {
    memResetTokenStore.set(token, {
      email: email.toLowerCase(),
      expires: Date.now() + 3600 * 1000,
    });
  }
  return token;
}

async function consumeResetToken(token: string): Promise<string | null> {
  if (redis) {
    const email = await redis.get(`reset_tok:${token}`);
    if (!email) return null;
    await redis.del(`reset_tok:${token}`);
    return email;
  }
  const rec = memResetTokenStore.get(token);
  if (!rec || rec.expires < Date.now()) return null;
  memResetTokenStore.delete(token);
  return rec.email;
}

async function sendViaSendGrid(to: string, subject: string, plain: string, html?: string): Promise<void> {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("SENDGRID_API_KEY and EMAIL_FROM are required");
  const content: Array<{ type: string; value: string }> = [{ type: "text/plain", value: plain }];
  if (html) content.push({ type: "text/html", value: html });
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`SendGrid ${res.status}: ${t.slice(0, 240)}`);
  }
}

function escapeHtmlAttr(url: string): string {
  return url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

async function sendPasswordResetEmail(email: string, otp: string, resetLink: string): Promise<void> {
  await sendViaSendGrid(
    email,
    "Reset your FinanceTracker password",
    `Your one-time code is: ${otp}\n\nOr open this link to reset (valid 1 hour):\n${resetLink}\n\nIf you did not request this, ignore this email.`,
    `<p>Your one-time code is: <strong>${otp}</strong></p><p><a href="${escapeHtmlAttr(resetLink)}">Reset password</a></p><p>If you did not request this, ignore this email.</p>`
  );
}

async function sendVerificationEmailDispatch(email: string, link: string): Promise<void> {
  await sendViaSendGrid(
    email,
    "Verify your FinanceTracker email",
    `Confirm your email: ${link}`,
    `<p><a href="${escapeHtmlAttr(link)}">Verify email</a></p>`
  );
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 5 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 20 : 1000, // Sensitive operations: change-password, logout, /me
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "none" as const,
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

export const verifiedEmailMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const payload = (req as any).user as { email?: string } | undefined;
  if (!payload?.email) {
    res.status(401).json({ error: "Unauthorized: missing user context" });
    return;
  }

  const allowDemoBypass =
    payload.email === "demo@yugifinance.com" &&
    (!IS_PROD || process.env.ALLOW_DEMO_EMAIL_VERIFICATION_BYPASS === "true");
  if (allowDemoBypass) {
    next();
    return;
  }

  const stored = findUserByEmail(payload.email);
  if (stored?.emailVerified === false) {
    res.status(403).json({ error: "Email verification required" });
    return;
  }

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

    // Phase2.0013: issue email verification token and dispatch verification email.
    // The flag is recorded on the user; gating finance routes on verification is
    // tracked separately under Phase8.0008 once SMTP delivery is fully wired.
    if (emailDeliveryConfigured()) {
      try {
        const vtoken = await storeVerificationToken(email);
        const frontend = (process.env.FRONTEND_URL || "").split(",")[0].trim() || "";
        const link = frontend
          ? `${frontend.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(vtoken)}`
          : `/verify-email?token=${vtoken}`;
        await sendVerificationEmailDispatch(email, link);
      } catch (e) {
        console.error("[auth] verification email failed:", e);
      }
    }

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

router.post("/login", authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Phase2.0007: per-email lockout — defends against IP-rotating brute force.
    const failures = await getFailureCount(email);
    if (failures >= LOCKOUT_THRESHOLD) {
      res.status(429).json({ error: "Account temporarily locked. Try again in 15 minutes." });
      return;
    }

    try {
      const result = await loginUser(email, password);
      await clearFailureCount(email);
      res.cookie("auth_token", result.token, cookieOptions);
      res.json({ user: result.user });
    } catch (err: any) {
      if (err.message === "Invalid email or password") {
        const next = await incrementFailureCount(email);
        const remaining = Math.max(LOCKOUT_THRESHOLD - next, 0);
        res.status(401).json({
          error: "Invalid email or password",
          attemptsRemaining: remaining,
        });
        return;
      }
      throw err;
    }
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", sensitiveLimiter, (_req: Request, res: Response) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "none" as const,
    secure: process.env.NODE_ENV === "production",
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
  res.json({ ok: true });
});

router.get("/me", sensitiveLimiter, (req: Request, res: Response) => {   res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if ((req as any).cookies?.auth_token) {
    token = (req as any).cookies.auth_token;
  }

  if (!token) {
    res.json({ user: null });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.json({ user: null });
    return;
  }

  const stored = findUserByEmail(payload.email);
  res.json({
    user: {
      uid: payload.uid,
      email: payload.email,
      name: payload.name,
      emailVerified: stored?.emailVerified ?? true,
    },
  });
});

// Phase2.0013: explicit email verification endpoint. Token issued at /register.
router.post("/verify-email", authLimiter, async (req: Request, res: Response) => {
  const { token } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "token is required" });
  }
  const email = await consumeVerificationToken(token);
  if (!email) {
    return res.status(400).json({ error: "Invalid or expired verification token" });
  }
  const ok = await markEmailVerified(email);
  if (!ok) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ ok: true });
});

// Phase2.0004: OTP delivery requires an email provider in production.
// In dev with no provider, the OTP is stored (Redis or memory) but never logged
// to stdout — that would leak to log aggregators if NODE_ENV is misconfigured.
// Operators in dev can read the OTP via Redis CLI: `GET otp:<email>`.
router.post("/forgot-password", forgotPasswordLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  if (IS_PROD && !emailDeliveryConfigured()) {
    return res.status(503).json({ error: "Password reset is temporarily unavailable" });
  }
  const otp = String(crypto.randomInt(100000, 1000000));
  await storeOtp(email, otp);
  const resetToken = await storeResetToken(email);
  const frontendBase = (process.env.FRONTEND_URL || "").split(",")[0].trim();
  const resetPath = `/reset-password?token=${encodeURIComponent(resetToken)}`;
  const resetLink = frontendBase ? `${frontendBase.replace(/\/$/, "")}${resetPath}` : resetPath;

  if (emailDeliveryConfigured()) {
    try {
      await sendPasswordResetEmail(email, otp, resetLink);
    } catch (e) {
      console.error("[auth] password reset email failed:", e);
      return res.status(502).json({ error: "Could not send reset email. Please try again shortly." });
    }
  }

  res.json({ 
    success: true, 
    message: "If that email exists, a reset code has been sent.",
  });
});

router.post("/reset-password", forgotPasswordLimiter, async (req: Request, res: Response) => {
  const { email, otp, token, newPassword } = req.body;

  // Validate common requirement: new password
  if (!newPassword) {
    res.status(400).json({ error: "newPassword is required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  let targetEmail = email;

  // 1. Attempt Token Resolution Branch
  if (token) {
    const resolved = await consumeResetToken(token);
    if (!resolved) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
    targetEmail = resolved; // Safe override from validated vector
  } 
  // 2. Fallback to standard OTP Branch
  else {
    if (!email || !otp) {
      res.status(400).json({ error: "Either email+otp OR token must be supplied" });
      return;
    }
    const valid = await validateOtp(email, otp);
    if (!valid) {
      res.status(400).json({ error: "Invalid or expired reset code" });
      return;
    }
  }

  // 3. Execute Payload Commitment
  try {
    await resetUserPassword(targetEmail, newPassword);
    if (!token) {
      await deleteOtp(targetEmail);
    }
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
  const email = payload?.email;
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
    sameSite: "none" as const,
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

// Phase2.0010: WebAuthn login/verify must mint the JWT here — Spring backend does
// not share JWT_SECRET. Without this, the frontend believes login succeeded but
// every subsequent finance call returns 401.
router.post("/webauthn/login/verify", async (req: Request, res: Response) => {
  try {
    const url = `${BACKEND_URL}/api/auth/webauthn/login/verify`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (req.headers.cookie) headers.cookie = req.headers.cookie as string;
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });

    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.setHeader("Set-Cookie", setCookie);

    if (!upstream.ok) {
      const text = await upstream.text();
      if (IS_PROD) {
        console.error("[webauthn] login verify upstream failed:", upstream.status, text.slice(0, 400));
        return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({
          error: "Passkey verification failed",
          code: "WEBAUTHN_VERIFY_FAILED",
        });
      }
      return res.status(upstream.status).json({
        error: "Passkey verification failed",
        details: text,
      });
    }

    const user: any = await upstream.json().catch(() => null);
    if (!user || typeof user.id !== "string" || typeof user.email !== "string") {
      return res.status(502).json({ error: "Invalid user payload from backend" });
    }

    const displayName: string =
      typeof user.displayName === "string" && user.displayName
        ? user.displayName
        : typeof user.username === "string" && user.username
        ? user.username
        : user.email;

    const token = createToken({ uid: user.id, email: user.email, name: displayName });
    res.cookie("auth_token", token, cookieOptions);
    res.json({ user: { uid: user.id, email: user.email, name: displayName } });
  } catch {
    res.status(503).json({ error: "Passkey authentication is not available", available: false });
  }
});

// Phase2.0009: deleting a user's passkeys requires authentication, and the caller
// must own the email. Backend additionally enforces ownership via X-User-Id.
router.delete("/webauthn/credentials", authMiddleware, async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user as { uid: string; email: string };
    const requested = ((req.query.email as string) || req.body?.email || "").trim();
    if (!requested) return res.status(400).json({ error: "email required" });
    if (requested.toLowerCase() !== caller.email.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const upstream = await fetch(
      `${BACKEND_URL}/api/auth/webauthn/credentials?email=${encodeURIComponent(requested)}`,
      {
        method: "DELETE",
        headers: { "X-User-Id": caller.uid },
      }
    );
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
    const url = `${BACKEND_URL}/api/finance/audit-logs`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: authToken } : {}),
        ...(userId ? { "X-User-Id": userId } : {}),
      },
    };
    
    if (method === 'POST') {
      const logs = req.body.logs;
      if (Array.isArray(logs)) {
        for (const logItem of logs) {
          const itemOptions = {
            ...options,
            body: JSON.stringify(logItem)
          };
          const response = await fetch(url, itemOptions);
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to sync log item:", errorText);
          }
        }
        return res.status(204).send();
      } else {
        options.body = JSON.stringify(req.body);
      }
    }

    const response = await fetch(url, options);
    if (response.status === 204) return res.status(204).send();
    const data = await response.json().catch(() => null);
    res.status(response.status).json(data);
  } catch (err: any) {
    console.error("Audit service proxy failed:", err);
    res.status(502).json({ error: "Audit service unavailable" });
  }
}

router.post('/audit/logs', authMiddleware, sensitiveLimiter, (req, res) => proxyAuditToBackend(req, res, 'POST'));
router.get('/audit/logs', authMiddleware, sensitiveLimiter, (req, res) => proxyAuditToBackend(req, res, 'GET'));

export const authRouter = router;
