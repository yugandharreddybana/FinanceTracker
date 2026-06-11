import { Check } from 'lucide-react';
import type { BillingCurrency } from '../services/billingService';
import type { PlanTier } from '../types';
import { cn } from '../lib/utils';

interface TierCard {
  id: PlanTier;
  name: string;
  price: number;
  period?: string;
  desc: string;
  popular?: boolean;
  features: string[];
}

const TIER_DATA: Record<PlanTier, Omit<TierCard, 'id' | 'price'> & { prices: Record<BillingCurrency, number> }> = {
  FREE: {
    name: 'Free',
    prices: { EUR: 0, INR: 0 },
    desc: 'Get started',
    features: [
      'Unlimited transactions',
      '3 bank accounts',
      '3 budgets & savings goals',
      '5 AI helps / month',
    ],
  },
  PRO: {
    name: 'Pro',
    prices: { EUR: 49, INR: 4499 },
    desc: 'Power users',
    popular: true,
    features: [
      '10 accounts, budgets & goals',
      'Loans, recurring, investments',
      'Full analytics suite',
      '100 AI helps / month',
      '3 family members',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    prices: { EUR: 79, INR: 7499 },
    desc: 'Unlimited everything',
    features: [
      'Unlimited resources',
      'Unlimited AI helps',
      'Unlimited family members',
      'Priority support',
    ],
  },
};

interface Props {
  currency: BillingCurrency;
  currentTier?: PlanTier;
  onSelect?: (tier: 'PRO' | 'ENTERPRISE') => void;
  compact?: boolean;
}

export function PricingCards({ currency, currentTier = 'FREE', onSelect, compact }: Props) {
  const symbol = currency === 'EUR' ? '€' : '₹';

  return (
    <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3')}>
      {(['FREE', 'PRO', 'ENTERPRISE'] as PlanTier[]).map((id) => {
        const t = TIER_DATA[id];
        const price = t.prices[currency];
        const isCurrent = currentTier === id;
        const isPaid = id !== 'FREE';
        return (
          <div
            key={id}
            className={cn(
              'relative rounded-3xl p-6 border transition-all',
              t.popular
                ? 'bg-slate-900 text-white border-emerald-400/30 shadow-xl'
                : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800',
              isCurrent && 'ring-2 ring-emerald-400'
            )}
          >
            {t.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-3 py-0.5 text-xs font-bold text-slate-900">
                MOST POPULAR
              </span>
            )}
            <h3 className={cn('text-lg font-bold', t.popular ? 'text-white' : 'text-slate-900 dark:text-white')}>
              {t.name}
              {isCurrent && <span className="ml-2 text-xs font-semibold text-emerald-400">(current)</span>}
            </h3>
            <div className="mt-3 flex items-end gap-1">
              <span className={cn('text-3xl font-black', t.popular ? 'text-white' : 'text-slate-900 dark:text-white')}>
                {symbol}{price.toLocaleString()}
              </span>
              {price > 0 && <span className={t.popular ? 'text-slate-400' : 'text-slate-500'}>/mo</span>}
            </div>
            <p className={cn('mt-1 text-sm', t.popular ? 'text-slate-400' : 'text-slate-500')}>{t.desc}</p>
            <ul className="mt-5 space-y-2">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className={cn('h-4 w-4 mt-0.5 shrink-0', t.popular ? 'text-emerald-400' : 'text-emerald-500')} />
                  <span className={t.popular ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'}>{f}</span>
                </li>
              ))}
            </ul>
            {isPaid && onSelect && (
              <button
                type="button"
                onClick={() => onSelect(id as 'PRO' | 'ENTERPRISE')}
                disabled={isCurrent}
                className={cn(
                  'mt-6 w-full rounded-xl py-3 text-sm font-bold transition-all',
                  t.popular
                    ? 'bg-emerald-400 text-slate-900 hover:bg-emerald-300 disabled:opacity-50'
                    : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 disabled:opacity-50'
                )}
              >
                {isCurrent ? 'Current plan' : `Upgrade to ${t.name}`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
