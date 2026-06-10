import { Redis } from "ioredis";

let redisClient: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    redisClient.on("error", (err: Error) => console.error("[Redis] Shared Connection error:", err.message));
  } else {
    console.warn("[Redis] Shared Client — REDIS_URL is missing. Falling back to local memory adapters.");
  }
} catch (e) {
  console.warn("[Redis] Shared Client — Connection failed, using local memory adapters:", e);
}

export const redis = redisClient;
