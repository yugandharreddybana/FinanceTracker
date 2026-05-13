import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

export function FinancePageLoadingShell() {
  return (
    <div
      data-testid="finance-page-loading"
      role="status"
      aria-busy="true"
      aria-label="Loading finance data"
      className="flex flex-col gap-4 p-6 max-w-[1400px] mx-auto animate-pulse"
    >
      <div className="h-10 w-56 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-3xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

interface FinanceDataErrorBannerProps {
  message: string;
  onRetry: () => void | Promise<void>;
  onDismiss: () => void;
}

export function FinanceDataErrorBanner({ message, onRetry, onDismiss }: FinanceDataErrorBannerProps) {
  return (
    <div
      data-testid="finance-data-error-banner"
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-bold">Could not refresh all data</p>
        <p className="text-xs mt-0.5 opacity-90">{message}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          data-testid="finance-error-retry"
          onClick={() => void onRetry()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Retry
        </button>
        <button
          type="button"
          data-testid="finance-error-dismiss"
          onClick={onDismiss}
          className="p-2 rounded-lg text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  testId?: string;
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ testId, icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40"
    >
      {icon && <div className="flex justify-center mb-3 text-slate-400">{icon}</div>}
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-6 flex justify-center gap-3 flex-wrap">{action}</div>}
    </div>
  );
}
