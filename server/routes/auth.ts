import { Router, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { registerUser, loginUser, findUserByEmail } from "../lib/auth.ts";

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
      res.status(409).json({ error: err.message });
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

export const authRouter = router;
