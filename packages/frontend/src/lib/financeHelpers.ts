import type { Transaction, IncomeSource } from '../types';

export function signedTransactionImpact(t: Transaction): number {
  if (t.type === 'income') return Math.abs(Number(t.amount) || 0);
  if (t.type === 'expense') return -Math.abs(Number(t.amount) || 0);
  return 0;
}

/** Approximates month-end net worth for one currency from cash flows after each month (no persisted snapshots). */
export function estimateNetWorthHistory(params: {
  transactions: Transaction[];
  currentNetWorth: number;
  currency: string;
  months?: number;
}): { month: string; value: number }[] {
  const { transactions, currentNetWorth, currency, months = 6 } = params;
  const filtered = transactions.filter((t) => (t.currency || 'INR') === currency);
  const now = new Date();
  const points: { month: string; value: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const flowAfter = filtered.reduce((sum, t) => {
      const td = new Date(t.date);
      if (td <= end) return sum;
      return sum + signedTransactionImpact(t);
    }, 0);
    points.push({
      month: end.toLocaleDateString('en', { month: 'short' }),
      value: currentNetWorth - flowAfter,
    });
  }

  return points;
}

export function monthlyEquivalentIncome(amount: number, frequency: string): number {
  const f = (frequency || 'Monthly').toLowerCase();
  if (f.includes('bi') && f.includes('week')) return (amount * 26) / 12;
  if (f.includes('week')) return (amount * 52) / 12;
  if (f.includes('quarter')) return amount / 3;
  if (f.includes('annual') || f.includes('year')) return amount / 12;
  return amount;
}

function advancePayDate(from: Date, freq: string): Date {
  const d = new Date(from);
  const f = freq.toLowerCase();
  if (f.includes('bi') && f.includes('week')) {
    d.setDate(d.getDate() + 14);
    return d;
  }
  if (f.includes('week')) {
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (f.includes('quarter')) {
    d.setMonth(d.getMonth() + 3);
    return d;
  }
  if (f.includes('annual') || f.includes('year')) {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  d.setMonth(d.getMonth() + 1);
  return d;
}

function computeNextPayDate(s: IncomeSource): Date | null {
  const base = s.lastReceivedDate ? new Date(s.lastReceivedDate) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const freq = (s.frequency || 'Monthly').toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(base);
  next.setHours(0, 0, 0, 0);
  let guard = 0;
  while (next < today && guard++ < 200) {
    next = advancePayDate(next, freq);
  }
  return next;
}

export function nextPaydayLabel(sources: IncomeSource[], currency: string): string {
  const filtered = sources.filter((s) => (s.currency || 'INR') === currency);
  if (filtered.length === 0) return '—';
  const upcoming = filtered.map((s) => computeNextPayDate(s)).filter((d): d is Date => d !== null);
  if (upcoming.length === 0) return '—';
  upcoming.sort((a, b) => a.getTime() - b.getTime());
  return upcoming[0].toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function compoundNetWorth(pv: number, annualRateDecimal: number, years: number): number {
  if (!Number.isFinite(pv) || !Number.isFinite(annualRateDecimal) || !Number.isFinite(years)) return pv;
  return pv * Math.pow(1 + annualRateDecimal, years);
}
