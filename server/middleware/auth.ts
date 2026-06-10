/**
 * auth middleware
 *
 * Every request goes through JWT verification to confirm authentication state.
 * Verifies the token against shared backend secrets and validates the session.
 */

import { Request, Response, NextFunction } from "express";
import { 
  verifyToken, 
  findUserByEmail, 
  createToken, 
  cookieOptions, 
  refreshTokenCookieOptions,
  verifyAndRotateRefreshToken 
} from "../lib/auth.js";

/**
 * authMiddleware
 * Verifies the HS256 JWT, enforces short-lived access token transparent rotation 
 * via Redis-backed refresh tokens, enforces idle timeout, email verification, 
 * session revocation, and attaches `req.user`.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && /^bearer /i.test(authHeader)) {
    token = authHeader.slice(7);
  } else if ((req as any).cookies?.auth_token) {
    token = (req as any).cookies.auth_token;
  }

  let payload: any = null;
  if (token) {
    payload = verifyToken(token);
  }

  // Phase2.0008: Transparent token refresh if access token is missing, invalid, or expired
  if (!payload) {
    const refreshToken = (req as any).cookies?.refresh_token;
    if (refreshToken) {
      try {
        const refreshResult = await verifyAndRotateRefreshToken(refreshToken);
        if (refreshResult) {
          const { payload: userPayload, newToken: newRefreshToken } = refreshResult;
          const now = Math.floor(Date.now() / 1000);
          const newAccessToken = createToken(userPayload, now);
          
          // Set cookies on the response
          res.cookie("auth_token", newAccessToken, cookieOptions);
          res.cookie("refresh_token", newRefreshToken, refreshTokenCookieOptions);
          
          // Update local payload and inject new token for downstream proxy logic
          payload = { ...userPayload, lastActivityAt: now };
          if (!(req as any).cookies) (req as any).cookies = {};
          (req as any).cookies.auth_token = newAccessToken;
        }
      } catch (e) {
        console.error("[authMiddleware] Transparent refresh error:", e);
      }
    }
  }

  // If still no valid payload after checking refresh token, reject request
  if (!payload) {
    res.status(401).json({ error: "Unauthorized: session expired or invalid" });
    return;
  }

  const now = Math.floor(Date.now() / 1000);

  // Phase2.012: Server-side Inactivity sliding renewal on the ACCESS token.
  // If the access token is still valid but more than 60 seconds have elapsed
  // since last activity, update the cookie.
  // NOTE: the core inactivity enforcement (> 1 hour) is now backed by the Redis session state
  // inside `verifyAndRotateRefreshToken`, but we still update the lastActivityAt claim 
  // in the access token here for downstream consistency.
  if (typeof payload.lastActivityAt === "number") {
    const idleSeconds = now - payload.lastActivityAt;
    if (idleSeconds > 60) {
      const newToken = createToken({ uid: payload.uid, email: payload.email, name: payload.name }, now);
      res.cookie("auth_token", newToken, cookieOptions);
      payload.lastActivityAt = now;
      if (!(req as any).cookies) (req as any).cookies = {};
      (req as any).cookies.auth_token = newToken;
    }
  }

  // Demo Account Isolation Bypass
  const isDev = process.env.NODE_ENV === "development";
  const allowDemoBypass =
    payload.email === "demo@yugifinance.com" &&
    isDev && process.env.ALLOW_DEMO_EMAIL_VERIFICATION_BYPASS === "true";

  if (!allowDemoBypass) {
    const stored = await findUserByEmail(payload.email);
    if (!stored) {
      res.status(401).json({ error: "Unauthorized: user not found" });
      return;
    }
    
    if (stored.emailVerified === false) {
      res.status(403).json({ error: "Email verification required" });
      return;
    }

    // Phase2.0009: check password rotation / reset to invalidate tokens
    if (payload.iat && stored.passwordChangedAt) {
      const changedTime = new Date(stored.passwordChangedAt).getTime();
      const iatTime = payload.iat * 1000;
      // Reject token if issued before the password update, with 5 second grace period
      if (iatTime < changedTime - 5000) {
        res.status(401).json({ error: "Unauthorized: session revoked due to password change" });
        return;
      }
    }
  }

  (req as any).user = payload;
  next();
};
