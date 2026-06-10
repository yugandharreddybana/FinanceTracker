/**
 * auth.ts — Core authentication library proxying to Java Spring backend.
 *
 * Tokens: HS256 JWT signed locally with shared {@code JWT_SECRET}, interoperable with
 * {@code JwtAuthenticationFilter} on the Java backend (same algorithm + secret).
 */

import crypto from "crypto";
import { redis } from "./redis.js";

const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8081";

export interface Authenticator {
  credentialID: string;
  credentialPublicKey: string; // base64url encoded
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports?: string[];
}

export interface StoredUser {
  uid: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  authenticators?: Authenticator[];
  hashIterations?: number;
  emailVerified?: boolean;
  passwordChangedAt?: string;
}

// ---------------------------------------------------------------------------
// HS256 JWT — signed with shared secret for backend interoperability
// ---------------------------------------------------------------------------

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 900000, // Phase2.0008: 15 minutes (short-lived access tokens)
  path: "/",
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

export const refreshTokenCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 604800000, // Phase2.0008: 7 days (rotating refresh tokens)
  path: "/",
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

/**
 * Issues an HS256 JWT signed with the shared process.env.JWT_SECRET.
 * Matches the Java backend configuration in JwtAuthenticationFilter.java.
 * The token carries: uid, email, name, iat, exp, and rolling lastActivityAt.
 */
export function createToken(payload: { uid: string; email: string; name: string }, lastActivityAt?: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured in environment.");
  
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      nbf: now, // Phase2.0007: Not Before claim
      exp: now + 900, // Phase2.0008: shortened to 15 minutes for access token
      lastActivityAt: lastActivityAt || now, // CRITICAL FIX for 2.012: Server-side Inactivity Claim
      iss: "finance-tracker-auth",
      aud: "finance-tracker-api",
    })
  ).toString("base64url");
  
  const signingInput = `${header}.${body}`;
  const signature = crypto.createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");
    
  return `${header}.${body}.${signature}`;
}

/**
 * Phase3.0004: Issues a short-lived (60s) system-to-system JWT token to authenticate
 * internal Node-to-Java API calls using the shared JWT_SECRET.
 */
export function createSystemToken(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured in environment.");
  
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      uid: "system-internal",
      email: "system-internal@financetracker.local",
      name: "System Internal Service",
      iat: now,
      nbf: now,
      exp: now + 60, // 60 seconds
      iss: "finance-tracker-auth",
      aud: "finance-tracker-api",
    })
  ).toString("base64url");
  
  const signingInput = `${header}.${body}`;
  const signature = crypto.createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");
    
  return `${header}.${body}.${signature}`;
}

/**
 * Verifies an HS256 JWT using the shared secret.
 * Performs timing-safe signature comparison and validation of timestamps and schema.
 */
export function verifyToken(token: string): { uid: string; email: string; name: string; iat?: number; lastActivityAt?: number } | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[verifyToken] ERROR: JWT_SECRET environment variable is missing!");
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    // Verify algorithm claim matches expected HS256 and typ matches JWT if present
    const headerObj = JSON.parse(Buffer.from(header, "base64url").toString());
    if (headerObj.alg !== "HS256") return null;
    if (!headerObj.typ || headerObj.typ.toUpperCase() !== "JWT") return null;

    const signingInput = `${header}.${body}`;
    const sigDecoded = Buffer.from(signature, "base64url");
    const computedBuf = crypto.createHmac("sha256", secret).update(signingInput).digest();
    if (sigDecoded.length !== computedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigDecoded, computedBuf)) return null;

    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    
    // Token must not be expired
    if (typeof p.exp !== "number" || p.exp < now) return null;
    
    // Guard against slight clock drift on iat (max 60 sec into the future)
    if (typeof p.iat !== "number" || p.iat > now + 60) return null;
    
    // Phase2.0007: Token must not be used before its nbf (Not Before) claim
    if (typeof p.nbf === "number" && p.nbf > now + 60) return null;
    
    // CRITICAL FIX for 2.012: Server-side Inactivity Check (1 hour max idle)
    if (typeof p.lastActivityAt === "number") {
      const idleSeconds = now - p.lastActivityAt;
      if (idleSeconds > 3600) {
        console.warn(`[verifyToken] Token for ${p.email} rejected due to inactivity (${idleSeconds}s idle)`);
        return null;
      }
    }

    // Validate iss and aud claims
    if (p.iss !== "finance-tracker-auth") return null;
    if (p.aud !== "finance-tracker-api") return null;
    
    if (typeof p.uid !== "string" || p.uid.length === 0) return null;
    if (typeof p.email !== "string" || p.email.length === 0) return null;
    if (typeof p.name !== "string") return null;

    return { uid: p.uid, email: p.email, name: p.name, iat: p.iat, lastActivityAt: p.lastActivityAt };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// User registration / login proxied to Spring Backend
// ---------------------------------------------------------------------------

export interface RegisterResult {
  user: { uid: string; email: string; name: string };
  token: string;
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<RegisterResult> {
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Registration failed");
  }
  const user: any = await res.json();
  const mappedUser = { uid: user.id, email: user.email, name: user.displayName || "" };
  const token = createToken(mappedUser);
  return { user: mappedUser, token };
}

export interface LoginResult {
  user: { uid: string; email: string; name: string };
  token: string;
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error("Invalid email or password");
  }
  const user: any = await res.json();
  const mappedUser = { uid: user.id, email: user.email, name: user.displayName || "" };
  const token = createToken(mappedUser);
  return { user: mappedUser, token };
}

async function extractErrorText(res: any, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      return parsed.error || parsed.message || text || fallback;
    } catch {
      return text || fallback;
    }
  } catch {
    return fallback;
  }
}

export async function changeUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${createSystemToken()}`
    },
    body: JSON.stringify({ userId, oldPassword, newPassword }),
  });
  if (!res.ok) {
    const errMessage = await extractErrorText(res, "Password update failed");
    throw new Error(errMessage);
  }
}

export async function resetUserPassword(email: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${createSystemToken()}`
    },
    body: JSON.stringify({ email, newPassword }),
  });
  if (!res.ok) {
    const errMessage = await extractErrorText(res, "Password reset failed");
    throw new Error(errMessage);
  }
}


export async function deleteUserByEmail(email: string): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/api/auth/by-email?email=${encodeURIComponent(email)}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${createSystemToken()}`
    }
  });
  return res.ok;
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const res = await fetch(`${BACKEND_URL}/api/auth/find-user?email=${encodeURIComponent(email)}`, {
    headers: {
      "Authorization": `Bearer ${createSystemToken()}`
    }
  });
  if (res.status === 404) return undefined;
  if (!res.ok) return undefined;
  const user: any = await res.json();
  return {
    uid: user.id,
    email: user.email,
    name: user.displayName || "",
    passwordHash: user.passwordHash || "",
    salt: user.salt || "",
    createdAt: user.createdAt || "",
    hashIterations: user.hashIterations,
    emailVerified: user.emailVerified,
    passwordChangedAt: user.passwordChangedAt,
  };
}

export async function findUserById(uid: string): Promise<StoredUser | undefined> {
  const res = await fetch(`${BACKEND_URL}/api/auth/find-user-by-id?id=${encodeURIComponent(uid)}`, {
    headers: {
      "Authorization": `Bearer ${createSystemToken()}`
    }
  });
  if (res.status === 404) return undefined;
  if (!res.ok) return undefined;
  const user: any = await res.json();
  return {
    uid: user.id,
    email: user.email,
    name: user.displayName || "",
    passwordHash: user.passwordHash || "",
    salt: user.salt || "",
    createdAt: user.createdAt || "",
    hashIterations: user.hashIterations,
    emailVerified: user.emailVerified,
    passwordChangedAt: user.passwordChangedAt,
  };
}

export async function markEmailVerified(email: string): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${createSystemToken()}`
    },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}

// ---------------------------------------------------------------------------
// Rotating Refresh Tokens — State stored in Redis with local memory fallback
// ---------------------------------------------------------------------------

interface RefreshTokenData {
  uid: string;
  email: string;
  name: string;
  createdAt: number;
  lastActivityAt: number;
}

const devRefreshTokens = new Map<string, RefreshTokenData>();

// Map user ID -> list of active refresh tokens for revocation
const devUserTokens = new Map<string, Set<string>>();

export async function createRefreshToken(payload: { uid: string; email: string; name: string }): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Math.floor(Date.now() / 1000);
  const data: RefreshTokenData = {
    ...payload,
    createdAt: now,
    lastActivityAt: now
  };

  if (redis) {
    const pipeline = redis.pipeline();
    pipeline.setex(`rt:${token}`, 7 * 86400, JSON.stringify(data));
    pipeline.sadd(`user_tokens:${payload.uid}`, token);
    pipeline.expire(`user_tokens:${payload.uid}`, 7 * 86400);
    await pipeline.exec();
  } else {
    devRefreshTokens.set(token, data);
    if (!devUserTokens.has(payload.uid)) {
      devUserTokens.set(payload.uid, new Set());
    }
    devUserTokens.get(payload.uid)!.add(token);
    
    // Local TTL emulation (cleanup expired tokens periodically or inline)
    setTimeout(() => {
      devRefreshTokens.delete(token);
      devUserTokens.get(payload.uid)?.delete(token);
    }, 7 * 86400 * 1000);
  }

  return token;
}

export async function verifyAndRotateRefreshToken(oldToken: string): Promise<{ payload: { uid: string; email: string; name: string }; newToken: string } | null> {
  let data: RefreshTokenData | null = null;
  
  if (redis) {
    const raw = await redis.get(`rt:${oldToken}`);
    if (raw) {
      try { data = JSON.parse(raw); } catch {}
    }
  } else {
    const d = devRefreshTokens.get(oldToken);
    if (d) data = d;
  }

  if (!data) return null;

  const now = Math.floor(Date.now() / 1000);
  
  // Enforce Phase2.012: 1-hour server-side inactivity limit
  if (now - data.lastActivityAt > 3600) {
    console.warn(`[refresh] Revoking session for ${data.email} due to 1-hour inactivity`);
    await revokeRefreshToken(oldToken, data.uid);
    return null;
  }

  // Delete old token (Rotation!)
  await revokeRefreshToken(oldToken, data.uid);

  // Check if user exists and hasn't rotated password (Phase2.0009)
  const user = await findUserByEmail(data.email);
  if (!user) return null;
  
  // Phase2.0009: check password rotation / reset
  if (user.passwordChangedAt) {
    const changedTime = new Date(user.passwordChangedAt).getTime() / 1000;
    if (data.createdAt < changedTime - 5) {
      console.warn(`[refresh] Revoking session for ${data.email} due to password change`);
      await revokeAllUserSessions(data.uid);
      return null;
    }
  }

  // Generate new refresh token with updated lastActivityAt
  const newToken = await createRefreshToken({ uid: data.uid, email: data.email, name: data.name });
  
  // Update the lastActivityAt state explicitly for the newly created token
  if (redis) {
    const updatedData = { ...data, lastActivityAt: now };
    await redis.setex(`rt:${newToken}`, 7 * 86400, JSON.stringify(updatedData));
  } else {
    const entry = devRefreshTokens.get(newToken);
    if (entry) entry.lastActivityAt = now;
  }

  return {
    payload: { uid: data.uid, email: data.email, name: data.name },
    newToken
  };
}

export async function revokeRefreshToken(token: string, uid?: string) {
  if (redis) {
    const pipeline = redis.pipeline();
    pipeline.del(`rt:${token}`);
    if (uid) {
      pipeline.srem(`user_tokens:${uid}`, token);
    }
    await pipeline.exec();
  } else {
    devRefreshTokens.delete(token);
    if (uid) {
      devUserTokens.get(uid)?.delete(token);
    }
  }
}

export async function revokeAllUserSessions(uid: string) {
  if (redis) {
    const tokens = await redis.smembers(`user_tokens:${uid}`);
    if (tokens.length > 0) {
      const pipeline = redis.pipeline();
      for (const t of tokens) {
        pipeline.del(`rt:${t}`);
      }
      pipeline.del(`user_tokens:${uid}`);
      await pipeline.exec();
    }
  } else {
    const tokens = devUserTokens.get(uid);
    if (tokens) {
      for (const t of tokens) {
        devRefreshTokens.delete(t);
      }
      devUserTokens.delete(uid);
    }
  }
}

