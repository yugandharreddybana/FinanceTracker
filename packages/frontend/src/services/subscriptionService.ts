import { MIDDLEWARE_BASE } from './api';
import type { SubscriptionSummary } from '../types';

export async function fetchSubscription(): Promise<SubscriptionSummary> {
  const res = await fetch(`${MIDDLEWARE_BASE}/api/subscription/me`, {
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to load subscription (${res.status})`);
  }
  return data as SubscriptionSummary;
}
