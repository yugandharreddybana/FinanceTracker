import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { authMiddleware } from "../middleware/auth.js";
import {
  resolveCurrencyFromPriceId,
  resolvePlanFromPriceId,
  syncSubscriptionToJava,
  type BillingCurrency,
  type PlanTierName,
} from "../lib/subscriptionSync.js";
import { resolveFrontendBaseUrl } from "../lib/frontendUrl.js";

const router = Router();
const IS_PROD = process.env.NODE_ENV === "production";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function priceIdFor(tier: "PRO" | "ENTERPRISE", currency: BillingCurrency): string | null {
  const map: Record<string, string | undefined> = {
    "PRO:EUR": process.env.STRIPE_PRICE_PRO_EUR || process.env.STRIPE_PRICE_PRO,
    "PRO:INR": process.env.STRIPE_PRICE_PRO_INR,
    "ENTERPRISE:EUR": process.env.STRIPE_PRICE_ENTERPRISE_EUR || process.env.STRIPE_PRICE_ENTERPRISE,
    "ENTERPRISE:INR": process.env.STRIPE_PRICE_ENTERPRISE_INR,
  };
  return map[`${tier}:${currency}`] || null;
}

router.get("/plans", (_req, res) => {
  res.json({
    tiers: [
      {
        id: "FREE",
        name: "Free",
        prices: { EUR: 0, INR: 0 },
        features: {
          bankAccounts: 3,
          budgets: 3,
          savingsGoals: 3,
          aiHelpsPerMonth: 5,
        },
      },
      {
        id: "PRO",
        name: "Pro",
        prices: { EUR: 49, INR: 4499 },
        features: {
          bankAccounts: 10,
          budgets: 10,
          savingsGoals: 10,
          loans: 10,
          recurring: 10,
          investments: 10,
          incomeSources: 10,
          familyMembers: 3,
          aiHelpsPerMonth: 100,
          analytics: true,
        },
      },
      {
        id: "ENTERPRISE",
        name: "Enterprise",
        prices: { EUR: 79, INR: 7499 },
        features: {
          unlimited: true,
          aiHelpsPerMonth: null,
          analytics: true,
        },
      },
    ],
    currencies: ["EUR", "INR"],
  });
});

router.post("/checkout", authMiddleware, async (req: Request, res: Response) => {
  const stripe = getStripe();
  const user = (req as any).user;
  const tier = String(req.body?.tier || "").toUpperCase() as "PRO" | "ENTERPRISE";
  const currency = String(req.body?.currency || "EUR").toUpperCase() as BillingCurrency;
  if (tier !== "PRO" && tier !== "ENTERPRISE") {
    return res.status(400).json({ error: "tier must be PRO or ENTERPRISE" });
  }
  if (currency !== "EUR" && currency !== "INR") {
    return res.status(400).json({ error: "currency must be EUR or INR" });
  }

  const frontend = resolveFrontendBaseUrl();

  if (!stripe) {
    if (IS_PROD) {
      return res.status(503).json({ error: "Billing is not configured" });
    }
    try {
      await syncSubscriptionToJava({
        userId: user.uid,
        planTier: tier,
        subscriptionStatus: "dev_mock",
        billingCurrency: currency,
      });
      return res.json({
        url: `${frontend}/app/settings?billing=success&dev=1`,
        devMock: true,
      });
    } catch (err) {
      console.error("[billing] dev mock checkout failed:", err);
      return res.status(500).json({ error: "Dev billing mock failed" });
    }
  }

  const priceId = priceIdFor(tier, currency);
  if (!priceId) {
    return res.status(503).json({ error: `No Stripe price configured for ${tier} ${currency}` });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.uid,
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontend}/app/settings?billing=success`,
      cancel_url: `${frontend}/app/settings?billing=cancel`,
      metadata: { userId: user.uid, tier, currency },
      subscription_data: {
        metadata: { userId: user.uid, tier, currency },
      },
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error("[billing] checkout error:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/portal", authMiddleware, async (req: Request, res: Response) => {
  const stripe = getStripe();
  const user = (req as any).user;
  const frontend = resolveFrontendBaseUrl();

  if (!stripe) {
    if (IS_PROD) {
      return res.status(503).json({ error: "Billing is not configured" });
    }
    return res.json({ url: `${frontend}/app/settings?billing=portal&dev=1`, devMock: true });
  }
  const JAVA_BASE = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8081";
  const authToken =
    req.headers.authorization ||
    ((req as any).cookies?.auth_token ? `Bearer ${(req as any).cookies.auth_token}` : undefined);

  try {
    const subRes = await fetch(`${JAVA_BASE}/api/subscription/me`, {
      headers: {
        ...(authToken ? { Authorization: authToken as string } : {}),
        "X-User-Id": user.uid,
      },
    });
    if (!subRes.ok) {
      return res.status(400).json({ error: "Could not load subscription" });
    }
    const summary = await subRes.json();
    let customerId = summary.stripeCustomerId as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.uid },
      });
      customerId = customer.id;
      await syncSubscriptionToJava({
        userId: user.uid,
        planTier: (summary.tier as PlanTierName) || "FREE",
        stripeCustomerId: customerId,
        subscriptionStatus: summary.subscriptionStatus,
        currentPeriodEnd: summary.currentPeriodEnd,
        billingCurrency: summary.billingCurrency,
      });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontend}/app/settings`,
    });
    return res.json({ url: portal.url });
  } catch (err) {
    console.error("[billing] portal error:", err);
    return res.status(500).json({ error: "Failed to open billing portal" });
  }
});

export async function handleStripeWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return res.status(503).json({ error: "Webhook not configured" });
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).json({ error: "Missing stripe-signature" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("[billing] webhook signature failed:", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        if (!userId) break;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const tier = (session.metadata?.tier?.toUpperCase() || "PRO") as PlanTierName;
        const currency = (session.metadata?.currency?.toUpperCase() || "EUR") as BillingCurrency;
        await syncSubscriptionToJava({
          userId,
          planTier: tier,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripeSubscriptionId: subId,
          subscriptionStatus: "active",
          billingCurrency: currency,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;
        const priceId = sub.items.data[0]?.price?.id || "";
        const active = sub.status === "active" || sub.status === "trialing";
        const tier: PlanTierName = active ? resolvePlanFromPriceId(priceId) : "FREE";
        await syncSubscriptionToJava({
          userId,
          planTier: tier,
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          billingCurrency: resolveCurrencyFromPriceId(priceId),
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.userId;
        if (!userId) break;
        await syncSubscriptionToJava({
          userId,
          planTier: resolvePlanFromPriceId(sub.items.data[0]?.price?.id || ""),
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
          stripeSubscriptionId: sub.id,
          subscriptionStatus: "past_due",
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          billingCurrency: resolveCurrencyFromPriceId(sub.items.data[0]?.price?.id || ""),
        });
        break;
      }
      default:
        break;
    }
    return res.json({ received: true });
  } catch (err) {
    console.error("[billing] webhook handler error:", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}

export { router as billingRouter };
