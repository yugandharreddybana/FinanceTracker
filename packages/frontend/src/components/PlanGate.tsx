import type { ReactNode } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { ROUTE_MIN_TIER } from '../lib/planConfig';
import type { AppRoute } from '../lib/planConfig';

interface Props {
  route: string;
  children: ReactNode;
}

export function PlanGate({ route, children }: Props) {
  const { canAccessRoute, openUpgrade, tier, subscription } = useSubscription();
  const allowed = canAccessRoute(route);

  if (allowed) return <>{children}</>;

  const required = ROUTE_MIN_TIER[route as AppRoute] ?? 'PRO';
  const isAiQuota = route === 'insights' && tier === 'FREE';

  return (
    <div
      data-testid="plan-gate"
      className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        {isAiQuota ? (
          <Sparkles className="h-8 w-8 text-amber-500" />
        ) : (
          <Lock className="h-8 w-8 text-slate-400" />
        )}
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {isAiQuota ? 'AI quota used up' : 'Upgrade required'}
        </h2>
        <p className="mt-2 text-slate-500 max-w-md">
          {isAiQuota
            ? `You've used all ${subscription?.ai?.limit ?? 5} AI helps this month. Resets ${subscription?.ai?.resetsAt ? new Date(subscription.ai.resetsAt).toLocaleDateString() : 'next month'}.`
            : `This feature requires ${required} or higher. You're on ${tier}.`}
        </p>
      </div>
      <button
        type="button"
        onClick={openUpgrade}
        className="rounded-2xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-all"
      >
        View plans
      </button>
    </div>
  );
}
