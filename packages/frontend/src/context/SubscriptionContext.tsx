import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { PlanTier, SubscriptionSummary } from '../types';
import { fetchSubscription } from '../services/subscriptionService';
import { routeRequiresUpgrade, tierMeetsRequirement, type AppRoute, ROUTE_MIN_TIER } from '../lib/planConfig';
import { useFinance } from './FinanceContext';

interface SubscriptionContextValue {
  subscription: SubscriptionSummary | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  tier: PlanTier;
  canAccessRoute: (route: string) => boolean;
  canCreate: (resource: string) => boolean;
  aiRemaining: number | null;
  showUpgrade: boolean;
  openUpgrade: () => void;
  closeUpgrade: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

const DEFAULT_SUMMARY: SubscriptionSummary = {
  tier: 'FREE',
  limits: {},
  usage: {},
  ai: { used: 0, limit: 5, remaining: 5, resetsAt: '' },
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useFinance();
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const refreshSubscription = useCallback(async () => {
    if (!isLoggedIn) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSubscription();
      setSubscription(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plan');
      setSubscription(DEFAULT_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const tier: PlanTier = subscription?.tier ?? 'FREE';

  const canAccessRoute = useCallback((route: string) => {
    if (routeRequiresUpgrade(route, tier)) return false;
    if (route === 'insights' && tier === 'FREE') {
      const remaining = subscription?.ai?.remaining;
      const limit = subscription?.ai?.limit;
      if (limit === null) return true;
      return (remaining ?? 0) > 0;
    }
    return true;
  }, [tier, subscription]);

  const canCreate = useCallback((resource: string) => {
    const key = resource.toLowerCase();
    const limit = subscription?.limits?.[key];
    const usage = subscription?.usage?.[key] ?? 0;
    if (limit === null) return true;
    if (limit === undefined) return true;
    return usage < limit;
  }, [subscription]);

  const aiRemaining = subscription?.ai?.limit === null
    ? null
    : (subscription?.ai?.remaining ?? null);

  const value = useMemo<SubscriptionContextValue>(() => ({
    subscription,
    loading,
    error,
    refreshSubscription,
    tier,
    canAccessRoute,
    canCreate,
    aiRemaining,
    showUpgrade,
    openUpgrade: () => setShowUpgrade(true),
    closeUpgrade: () => setShowUpgrade(false),
  }), [subscription, loading, error, refreshSubscription, tier, canAccessRoute, canCreate, aiRemaining, showUpgrade]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}

export function useRoutePlan(route: string) {
  const { tier } = useSubscription();
  const min = ROUTE_MIN_TIER[route as AppRoute];
  return {
    locked: min ? !tierMeetsRequirement(tier, min) : false,
    requiredTier: min ?? 'FREE',
  };
}
