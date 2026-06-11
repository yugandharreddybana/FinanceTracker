import {
  findUserByEmail,
  registerUser,
  markEmailVerified,
} from "./auth.js";
import { syncSubscriptionToJava, type PlanTierName } from "./subscriptionSync.js";

const JAVA_BASE = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8081";
const MAX_SEED_STARTUP_ATTEMPTS = 12;
let seedStartupAttempts = 0;

export const DEMO_EMAIL = "demo@yugifinance.com";

export interface SeedAccount {
  email: string;
  name: string;
  password: string;
  planTier: PlanTierName;
}

const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "Test@1234";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo123456";

export const SEED_ACCOUNTS: SeedAccount[] = [
  { email: DEMO_EMAIL, name: "Demo User", password: DEMO_PASSWORD, planTier: "FREE" },
  { email: "yugi@example.com", name: "Yugi Admin", password: ADMIN_PASSWORD, planTier: "ENTERPRISE" },
  { email: "free@yugifinance.com", name: "Free Tier Admin", password: ADMIN_PASSWORD, planTier: "FREE" },
  { email: "pro@yugifinance.com", name: "Pro Tier Admin", password: ADMIN_PASSWORD, planTier: "PRO" },
  { email: "enterprise@yugifinance.com", name: "Enterprise Admin", password: ADMIN_PASSWORD, planTier: "ENTERPRISE" },
];

const SEED_EMAILS = new Set(SEED_ACCOUNTS.map((a) => a.email.toLowerCase()));

export function isSeedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return SEED_EMAILS.has(email.toLowerCase());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncTierWithRetry(userId: string, planTier: PlanTierName, email: string): Promise<void> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await syncSubscriptionToJava({
        userId,
        planTier,
        subscriptionStatus: "admin",
        billingCurrency: null,
      });
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(`[seed] Tier sync failed for ${email} after ${maxAttempts} attempts:`, err);
        return;
      }
      console.warn(`[seed] Tier sync retry ${attempt}/${maxAttempts} for ${email}`);
      await sleep(2000);
    }
  }
}

async function ensureOneAccount(account: SeedAccount): Promise<void> {
  let user = await findUserByEmail(account.email);
  if (!user) {
    await registerUser(account.email, account.password, account.name);
    await markEmailVerified(account.email);
    user = await findUserByEmail(account.email);
    console.log(`[seed] Created ${account.email} (${account.planTier})`);
  } else {
    await markEmailVerified(account.email);
    console.log(`[seed] ${account.email} exists — verified + tier sync`);
  }

  if (!user?.uid) {
    console.error(`[seed] Could not resolve user id for ${account.email}`);
    return;
  }

  await syncTierWithRetry(user.uid, account.planTier, account.email);
}

async function waitForJavaBackend(maxWaitMs: number): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${JAVA_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch {
      // Backend still booting — retry
    }
    await sleep(2000);
  }
  return false;
}

export async function ensureSeedAccounts(): Promise<void> {
  seedStartupAttempts += 1;
  const waitMs = seedStartupAttempts === 1 ? 90_000 : 30_000;
  const ready = await waitForJavaBackend(waitMs);
  if (!ready) {
    if (seedStartupAttempts < MAX_SEED_STARTUP_ATTEMPTS) {
      console.warn(`[seed] Java backend not ready (attempt ${seedStartupAttempts}/${MAX_SEED_STARTUP_ATTEMPTS}) — retrying in 15s`);
      setTimeout(() => { void ensureSeedAccounts(); }, 15_000);
    } else {
      console.error("[seed] Java backend never became reachable — demo/admin accounts may be missing");
    }
    return;
  }

  for (const account of SEED_ACCOUNTS) {
    try {
      await ensureOneAccount(account);
    } catch (err) {
      console.error(`[seed] Failed for ${account.email}:`, err);
    }
  }
}
