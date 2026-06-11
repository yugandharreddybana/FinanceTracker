import { MIDDLEWARE_BASE } from './api';
import type { PlanTier } from '../types';

export type BillingCurrency = 'EUR' | 'INR';

export interface BillingPlanInfo {
  id: PlanTier;
  name: string;
  prices: { EUR: number; INR: number };
  features: Record<string, unknown>;
}

async function billingFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${MIDDLEWARE_BASE}/api/billing${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Billing request failed (${res.status})`);
  }
  return data;
}

export async function fetchBillingPlans(): Promise<{ tiers: BillingPlanInfo[]; currencies: BillingCurrency[] }> {
  return billingFetch('/plans');
}

export async function startCheckout(tier: 'PRO' | 'ENTERPRISE', currency: BillingCurrency): Promise<string> {
  const data = await billingFetch('/checkout', {
    method: 'POST',
    body: JSON.stringify({ tier, currency }),
  });
  if (!data.url) throw new Error('No checkout URL returned');
  return data.url as string;
}

export async function openBillingPortal(): Promise<string> {
  const data = await billingFetch('/portal', { method: 'POST', body: '{}' });
  if (!data.url) throw new Error('No portal URL returned');
  return data.url as string;
}
