import { createSystemToken } from "./auth.js";

const JAVA_BASE = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8081";

export type BillingCurrency = "EUR" | "INR";
export type PlanTierName = "FREE" | "PRO" | "ENTERPRISE";

export interface SyncSubscriptionPayload {
  userId: string;
  planTier: PlanTierName;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  billingCurrency?: BillingCurrency | null;
}

export async function syncSubscriptionToJava(payload: SyncSubscriptionPayload): Promise<void> {
  const token = createSystemToken();
  const secret = process.env.SUBSCRIPTION_SYNC_SECRET || "";
  const response = await fetch(`${JAVA_BASE}/api/subscription/sync`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(secret ? { "X-Subscription-Sync-Secret": secret } : {}),
    },
    body: JSON.stringify({
      userId: payload.userId,
      planTier: payload.planTier,
      stripeCustomerId: payload.stripeCustomerId ?? undefined,
      stripeSubscriptionId: payload.stripeSubscriptionId ?? undefined,
      subscriptionStatus: payload.subscriptionStatus ?? undefined,
      currentPeriodEnd: payload.currentPeriodEnd ?? undefined,
      billingCurrency: payload.billingCurrency ?? undefined,
    }),
  });
  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Subscription sync failed (${response.status}): ${err}`);
  }
}

export function resolvePlanFromPriceId(priceId: string): PlanTierName {
  const proPrices = [
    process.env.STRIPE_PRICE_PRO_EUR,
    process.env.STRIPE_PRICE_PRO_INR,
    process.env.STRIPE_PRICE_PRO,
  ].filter(Boolean);
  const enterprisePrices = [
    process.env.STRIPE_PRICE_ENTERPRISE_EUR,
    process.env.STRIPE_PRICE_ENTERPRISE_INR,
    process.env.STRIPE_PRICE_ENTERPRISE,
  ].filter(Boolean);
  if (proPrices.includes(priceId)) return "PRO";
  if (enterprisePrices.includes(priceId)) return "ENTERPRISE";
  return "FREE";
}

export function resolveCurrencyFromPriceId(priceId: string): BillingCurrency | null {
  if (priceId === process.env.STRIPE_PRICE_PRO_INR || priceId === process.env.STRIPE_PRICE_ENTERPRISE_INR) {
    return "INR";
  }
  if (priceId === process.env.STRIPE_PRICE_PRO_EUR || priceId === process.env.STRIPE_PRICE_ENTERPRISE_EUR
    || priceId === process.env.STRIPE_PRICE_PRO || priceId === process.env.STRIPE_PRICE_ENTERPRISE) {
    return "EUR";
  }
  return null;
}
