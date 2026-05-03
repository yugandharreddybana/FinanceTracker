import { Router, Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";
import { registerUser, loginUser, changeUserPassword, deleteUserByEmail, verifyToken, resetUserPassword } from "../lib/auth.js";

const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";

// S9: Tightened to 10 requests per 15 minutes (was 100)
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

// General limiter for sensitive authenticated endpoints
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Cookie options — shared across set/clear calls
const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 86400000, // 24 hours
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

// S1/S2: authMiddleware now accepts both Bearer token AND httpOnly cookie
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

// B10: OTP store for password reset — module-level Map with expiry
const passwordResetOTPs = new Map<string, { otp: string; expires: number }>();

// Periodically remove expired OTPs to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of passwordResetOTPs.entries()) {
    if (now > record.expires) passwordResetOTPs.delete(email);
  }
}, 5 * 60 * 1000); // sweep every 5 minutes

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
    // S1: Set JWT as httpOnly cookie — do not expose token in response body
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
    // S1: Set JWT as httpOnly cookie — do not expose token in response body
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

// S1/S2: Logout — clear auth cookie
router.post("/logout", sensitiveLimiter, (_req: Request, res: Response) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
  res.json({ ok: true });
});

// S1/S2: /me — returns current user from cookie
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

// B10: Forgot password — generate OTP, store with expiry, log to console
router.post("/forgot-password", forgotPasswordLimiter, (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
  passwordResetOTPs.set(email, { otp, expires });

  // Log OTP — replace with email provider when available
  console.log(`[PASSWORD RESET OTP for ${email}]: ${otp}`);

  // Always return success to avoid leaking which emails exist
  res.json({ success: true, message: "If that email exists, a reset code has been sent." });
});

// B10: Reset password — validate OTP and set new password
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

  const record = passwordResetOTPs.get(email);
  // Use timing-safe comparison to prevent side-channel attacks on OTP value
  const otpValid = record &&
    Date.now() <= record.expires &&
    Buffer.byteLength(record.otp) === Buffer.byteLength(otp) &&
    crypto.timingSafeEqual(Buffer.from(record.otp), Buffer.from(otp));

  if (!otpValid) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  try {
    await resetUserPassword(email, newPassword);
    passwordResetOTPs.delete(email);
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

  // Trigger backend purge — only use uid (from JWT, not user input) to avoid SSRF via email param
  try {
    if (uid) {
      await fetch(`${BACKEND_URL}/api/finance/user-profiles/purge/${encodeURIComponent(uid)}`, { method: "DELETE" });
    }
    // If no uid in token, skip backend purge (safer than using raw email in URL)
  } catch (err) {
    console.error("Backend purge failed during account deletion:", err);
  }

  // Clear auth cookie on account deletion
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
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
