import type { PlanTier } from '../types';

const TIER_RANK: Record<PlanTier, number> = {
  FREE: 0,
  PRO: 1,
  ENTERPRISE: 2,
};

export type AppRoute =
  | 'dashboard' | 'transactions' | 'accounts' | 'budgets' | 'savings'
  | 'investments' | 'recurring' | 'loans' | 'networth' | 'health' | 'carbon'
  | 'categories' | 'insights' | 'income' | 'review' | 'forecasting' | 'tax'
  | 'reports' | 'audit' | 'family' | 'settings';

export const ROUTE_MIN_TIER: Record<AppRoute, PlanTier> = {
  dashboard: 'FREE',
  transactions: 'FREE',
  accounts: 'FREE',
  budgets: 'FREE',
  savings: 'FREE',
  categories: 'FREE',
  settings: 'FREE',
  insights: 'FREE',
  investments: 'PRO',
  recurring: 'PRO',
  loans: 'PRO',
  income: 'PRO',
  networth: 'PRO',
  health: 'PRO',
  carbon: 'PRO',
  review: 'PRO',
  forecasting: 'PRO',
  tax: 'PRO',
  reports: 'PRO',
  audit: 'PRO',
  family: 'PRO',
};

export const LOCKED_ON_FREE: AppRoute[] = [
  'investments', 'recurring', 'loans', 'income', 'networth', 'health', 'carbon',
  'review', 'forecasting', 'tax', 'reports', 'audit', 'family',
];

export function tierMeetsRequirement(userTier: PlanTier, required: PlanTier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[required];
}

export function routeRequiresUpgrade(route: string, userTier: PlanTier): boolean {
  const key = route as AppRoute;
  const min = ROUTE_MIN_TIER[key];
  if (!min) return false;
  return !tierMeetsRequirement(userTier, min);
}
