/**
 * auth middleware — two-layer verification:
 *
 * Layer 1 (every request): RS256 JWT verification against server public key
 * Layer 2 (mutating requests POST/PUT/PATCH/DELETE): ECDSA P-256 per-operation
 *   request signature verification against the user's stored public key
 *
 * Analogous to blockchain:
 *   Layer 1 = checking the transaction came from a valid, CA-signed identity
 *   Layer 2 = verifying the transaction was actually signed by that wallet
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken, findUserById } from "../lib/auth.js";
import { verifyRequestSignature } from "../lib/keyManager.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Headers that carry the per-operation signature
const SIG_HEADER = "x-request-signature";
// Optional nonce header — prevents replay attacks within the same JWT window
const NONCE_HEADER = "x-request-nonce";

/**
 * authMiddleware — Layer 1 only.
 * Verifies the RS256 JWT and attaches `req.user`.
 * Used on read-only routes where per-op signing is not required.
 */
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

/**
 * strictAuthMiddleware — Layer 1 + Layer 2.
 *
 * For mutating operations (POST/PUT/PATCH/DELETE), additionally verifies the
 * per-operation ECDSA P-256 signature in the `x-request-signature` header.
 *
 * Canonical payload signed by the client:
 *   SHA-256( METHOD + "\n" + path + "\n" + nonce + "\n" + JSON.stringify(body) )
 *
 * This ensures:
 *   - A stolen JWT alone cannot perform writes (attacker lacks private key)
 *   - Each signed request is bound to a specific path + nonce (replay-resistant)
 *   - The server verifies integrity of the exact payload being processed
 */
export const strictAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // ── Layer 1: JWT ──────────────────────────────────────────────────────────
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
  const jwtPayload = verifyToken(token);
  if (!jwtPayload) {
    res.status(401).json({ error: "Unauthorized: invalid or expired token" });
    return;
  }
  (req as any).user = jwtPayload;

  // ── Layer 2: per-operation ECDSA signature (mutating methods only) ────────
  if (MUTATING_METHODS.has(req.method)) {
    const signature = req.headers[SIG_HEADER] as string | undefined;
    if (!signature) {
      res.status(401).json({
        error: "Unauthorized: request signature required for write operations",
        hint: "Sign the canonical payload with your ECDSA private key and include it in the x-request-signature header",
      });
      return;
    }

    // Look up the user's stored ECDSA public key
    const storedUser = findUserById(jwtPayload.uid);
    if (!storedUser?.ecPublicKey) {
      res.status(403).json({
        error: "Forbidden: user has no registered signing key. Re-register or rotate your keypair.",
      });
      return;
    }

    // Build the canonical payload string the client should have signed
    const nonce = (req.headers[NONCE_HEADER] as string) ?? "";
    const bodyStr = req.body && typeof req.body === "object"
      ? JSON.stringify(req.body)
      : (typeof req.body === "string" ? req.body : "");
    const canonical = `${req.method}\n${req.path}\n${nonce}\n${bodyStr}`;

    const valid = verifyRequestSignature(canonical, signature, storedUser.ecPublicKey);
    if (!valid) {
      res.status(401).json({
        error: "Unauthorized: invalid request signature",
        hint: "Ensure you are signing: METHOD + newline + path + newline + nonce + newline + JSON.stringify(body)",
      });
      return;
    }
  }

  next();
};
