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
