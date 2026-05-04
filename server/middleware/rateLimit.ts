import { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(options: { windowMs: number; max: number; key?: (req: Request) => string }) {
  const keyFn = options.key || ((req) => (req as any).user?.uid || req.ip || "anon");
  return (req: Request, res: Response, next: NextFunction) => {
    const k = `${req.path}|${keyFn(req)}`;
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || b.resetAt < now) {
      b = { count: 0, resetAt: now + options.windowMs };
      buckets.set(k, b);
    }
    b.count += 1;
    if (b.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
    }
    next();
  };
}

export function capPayload(options: { maxInputLength?: number; maxArrayLength?: number; arrayFields?: string[] }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body || {};
    if (options.maxInputLength != null && typeof body.input === "string" && body.input.length > options.maxInputLength) {
      return res.status(413).json({ error: `Input too long (max ${options.maxInputLength} chars)` });
    }
    if (options.maxArrayLength != null && options.arrayFields) {
      for (const f of options.arrayFields) {
        const v = body[f];
        if (Array.isArray(v) && v.length > options.maxArrayLength) {
          return res.status(413).json({ error: `${f} too large (max ${options.maxArrayLength} items)` });
        }
      }
    }
    next();
  };
}
