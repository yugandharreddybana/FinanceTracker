import { Router, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { registerUser, loginUser, findUserByEmail, changeUserPassword, deleteUserByEmail, verifyToken } from "../lib/auth.js";

const BACKEND_URL = process.env.VITE_API_URL || "http://localhost:8080";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

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

  // Always return success to prevent user enumeration
  // In production, this would send an actual email
  const user = findUserByEmail(email);
  if (user) {
    console.log(`Password reset requested for ${email} (not implemented - no email service)`);
  }

  res.json({ message: "If an account exists with that email, a reset link has been sent." });
});

router.post("/change-password", (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body || {};
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "email, currentPassword, newPassword are required" });
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

router.delete("/account", (req: Request, res: Response) => {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const payload = auth ? verifyToken(auth) : null;
  const email = payload?.email || (req.body && req.body.email);
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  const ok = deleteUserByEmail(email);
  if (!ok) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true });
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
