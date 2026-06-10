import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeFinanceText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').trim().slice(0, 500);
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const activeCurrency = currency || 'INR';
  const locale = activeCurrency === 'INR' ? 'en-IN' : undefined;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: activeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${activeCurrency}`;
  }
}

export function formatAxisMoney(amount: number, currency: string): string {
  const c = currency || 'INR';
  const abs = Math.abs(amount);
  if (c === 'EUR') {
    if (abs >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
    if (abs >= 1000) return `€${(amount / 1000).toFixed(1)}k`;
    return `€${Math.round(amount)}`;
  }
  if (abs >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${Math.round(amount)}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.map((n) => n[0] ?? '').join('');
  return letters.toUpperCase().slice(0, 2);
}

/** Matches `Dashboard` monthly headline currency: prefer INR when that bucket is active, else first active currency. */
export function resolveDashboardChartCurrency(
  netWorthByCurrency: Record<string, { assets: number; liabilities: number; income: number; expenses: number }>
): string {
  const currencies = Object.keys(netWorthByCurrency || {});
  const displayCurrencies = currencies.filter(
    (c) =>
      (netWorthByCurrency[c]?.assets ?? 0) > 0 ||
      (netWorthByCurrency[c]?.liabilities ?? 0) > 0 ||
      (netWorthByCurrency[c]?.income ?? 0) > 0 ||
      (netWorthByCurrency[c]?.expenses ?? 0) > 0
  );
  const finalList = displayCurrencies.length > 0 ? displayCurrencies : ['INR'];
  return finalList.includes('INR') ? 'INR' : finalList[0] || 'INR';
}

const ISO_CCY = /^[A-Z]{3}$/;
export function transactionCurrency(tx: { currency?: string }, fallback = 'INR'): string {
  const raw = typeof tx.currency === 'string' ? tx.currency.trim().toUpperCase().replace(/[^A-Z]/g, '') : '';
  const c = raw.length >= 3 ? raw.slice(0, 3) : '';
  return ISO_CCY.test(c) ? c : fallback;
}

export const safeStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch {}
  },
  remove: (key: string): void => {
    try { localStorage.removeItem(key); } catch {}
  }
};

export const DASHBOARD_LENS_STORAGE_KEY = 'ft_dashboard_lens';
export type DashboardDisplayLens = 'INR' | 'EUR';

export function readStoredDashboardLens(): DashboardDisplayLens | null {
  const v = safeStorage.getItem(DASHBOARD_LENS_STORAGE_KEY);
  return v === 'INR' || v === 'EUR' ? v : null;
}

export function defaultDashboardDisplayLens(
  prefCurrency: string,
  netWorthByCurrency: Record<string, { assets: number; liabilities: number; income: number; expenses: number }>
): DashboardDisplayLens {
  const p = (prefCurrency || '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  if (p === 'INR' || p === 'EUR') return p;
  const auto = resolveDashboardChartCurrency(netWorthByCurrency);
  return auto === 'EUR' ? 'EUR' : 'INR';
}
