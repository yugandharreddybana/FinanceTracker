import { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, cn, transactionCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { SmartAddModal } from './SmartAddModal';
import { useToast } from './Toast';
import {
  Plus, Search, ArrowUpRight, ArrowDownRight, Trash2,
  SlidersHorizontal, Sparkles, Mic, Upload, Keyboard,
  ChevronDown, Calendar, Tag, Download, Printer,
} from 'lucide-react';
import { downloadTransactionsCsv, printTransactionsStatement } from '../lib/exportCsv';

export function TransactionsPage() {
  const { transactions, deleteTransaction } = useFinance();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showSmartAdd, setShowSmartAdd] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const allCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = transactions.filter(t => {
      const matchSearch =
        t.merchant.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || t.type === filterType;
      const matchCat = filterCategory === 'all' || t.category === filterCategory;
      return matchSearch && matchType && matchCat;
    });
    result.sort((a, b) => {
      const mul = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'date') return mul * (new Date(a.date).getTime() - new Date(b.date).getTime());
      return mul * (a.amount - b.amount);
    });
    return result;
  }, [transactions, search, filterType, filterCategory, sortBy, sortDir]);

  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of filtered) {
      const key = transactionCurrency(t);
      if (!map.has(key)) map.set(key, { income: 0, expense: 0 });
      const b = map.get(key)!;
      if (t.type === 'income') b.income += t.amount;
      else b.expense += t.amount;
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const PRIMARY_STAT_CCY = ['INR', 'EUR'] as const;

  const ledgerIncomeExpense = useMemo(() => {
    const inc: Record<string, number> = {};
    const exp: Record<string, number> = {};
    for (const [c, v] of totalsByCurrency) {
      inc[c] = v.income;
      exp[c] = v.expense;
    }
    return { inc, exp };
  }, [totalsByCurrency]);

  const buildStatLines = (bucket: 'income' | 'expense') => {
    const src = bucket === 'income' ? ledgerIncomeExpense.inc : ledgerIncomeExpense.exp;
    const lines: { code: string; amount: number }[] = [];
    for (const code of PRIMARY_STAT_CCY) {
      lines.push({ code, amount: src[code] ?? 0 });
    }
    const rest = Object.keys(src)
      .filter((c) => !(PRIMARY_STAT_CCY as readonly string[]).includes(c) && (bucket === 'income' ? src[c]! > 0 : src[c]! > 0))
      .sort((a, b) => a.localeCompare(b));
    for (const code of rest) {
      lines.push({ code, amount: src[code]! });
    }
    return lines;
  };

  const incomeStatLines = buildStatLines('income');
  const expenseStatLines = buildStatLines('expense');

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = t.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div data-testid="page-transactions" className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Transactions</h1>
          <p className="text-slate-400 font-medium">Track income and expenses in every currency</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => downloadTransactionsCsv(filtered, 'transactions-filtered.csv')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
            <Download className="h-4 w-4" aria-hidden /> CSV
          </motion.button>
          <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => printTransactionsStatement(filtered, 'Transactions')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
            <Printer className="h-4 w-4" aria-hidden /> PDF / Print
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowSmartAdd(true)}
            className="inline-flex items-center gap-2 rounded-2xl animated-gradient px-5 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-200/50">
            <Plus className="h-4 w-4" aria-hidden /> Add Smart
          </motion.button>
        </div>
      </motion.div>

      {/* Smart Input Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold">Smart Transaction Entry</span>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Type naturally, use voice, or upload receipts. Add multiple transactions at once — the AI understands context.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { icon: Keyboard, label: 'Type', color: 'bg-blue-500/20 text-blue-400' },
              { icon: Mic, label: 'Voice', color: 'bg-emerald-500/20 text-emerald-400' },
              { icon: Upload, label: 'Receipt', color: 'bg-violet-500/20 text-violet-400' },
            ].map(m => (
              <button key={m.label} onClick={() => setShowSmartAdd(true)}
                className={cn('flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:scale-105', m.color)}>
                <m.icon className="h-3.5 w-3.5" /> {m.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Transactions</p>
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', 'text-blue-600 bg-blue-50')}><Tag className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-black text-slate-900">{filtered.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">of {transactions.length} total</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Income</p>
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', 'text-emerald-600 bg-emerald-50')}><ArrowUpRight className="h-4 w-4" /></div>
          </div>
          <div className="space-y-1">
            {incomeStatLines.map(({ code, amount }, ii) => (
              <motion.div
                key={`inc-${code}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * ii, duration: 0.25 }}
                className="flex items-baseline justify-between gap-2"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">{code}</span>
                <p className="text-xl sm:text-2xl font-black tabular-nums text-slate-900">{formatCurrency(amount, code)}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{filtered.filter(t => t.type === 'income').length} entries</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Expenses</p>
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', 'text-rose-500 bg-rose-50')}><ArrowDownRight className="h-4 w-4" /></div>
          </div>
          <div className="space-y-1">
            {expenseStatLines.map(({ code, amount }, ei) => (
              <motion.div
                key={`exp-${code}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * ei, duration: 0.25 }}
                className="flex items-baseline justify-between gap-2"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">{code}</span>
                <p className="text-xl sm:text-2xl font-black tabular-nums text-slate-900">{formatCurrency(amount, code)}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{filtered.filter(t => t.type === 'expense').length} entries</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..."
            className="w-full rounded-2xl border-2 border-slate-100 bg-white py-3 pl-11 pr-4 text-sm font-medium focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-4 w-4 text-slate-300" />
          {(['all', 'income', 'expense'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={cn('rounded-xl px-3.5 py-2 text-xs font-bold transition-all',
                filterType === t ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50')}>
              {t === 'all' ? 'All' : t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
          <div className="relative">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500 appearance-none pr-7 focus:outline-none">
              <option value="all">All Categories</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300 pointer-events-none" />
          </div>
          <button onClick={() => { setSortBy(sortBy === 'date' ? 'amount' : 'date'); }}
            className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
            Sort: {sortBy === 'date' ? 'Date' : 'Amount'}
          </button>
          <button onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
            className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
            {sortDir === 'desc' ? '↓ New' : '↑ Old'}
          </button>
        </div>
      </div>

      {/* Transactions List — Grouped by Date */}
      <div className="space-y-4">
        <AnimatePresence>
          {grouped.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              data-testid="empty-transactions"
              className="rounded-3xl bg-white p-16 text-center shadow-sm border border-slate-100">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-slate-400 font-medium">No transactions found</p>
              <p className="text-xs text-slate-300 mt-1">Try changing your filters or add a new transaction</p>
            </motion.div>
          ) : (
            grouped.map(([date, txs], gi) => (
              <motion.div key={date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.03 }}>
                <div className="flex items-center gap-3 mb-2 px-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{formatDate(date)}</span>
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-xs font-bold text-slate-300">{txs.length} txn{txs.length > 1 ? 's' : ''}</span>
                </div>
                <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                  {txs.map((t, ti) => (
                    <motion.div key={t.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: ti * 0.02 }}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 group">
                      <div className="flex items-center gap-4">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl',
                          t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500')}>
                          {t.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{t.merchant}</p>
                          <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-medium inline-block mt-0.5">{t.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn('text-base font-black tabular-nums', t.type === 'income' ? 'text-emerald-600' : 'text-rose-500')}>
                          {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount, transactionCurrency(t))}
                        </span>
                        <button type="button" aria-label={`Delete ${t.merchant}`} onClick={() => { deleteTransaction(t.id); toast('info', 'Transaction deleted', t.merchant); }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all sm:opacity-0 sm:group-hover:opacity-100 opacity-100">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Smart Add Modal */}
      <SmartAddModal open={showSmartAdd} onClose={() => setShowSmartAdd(false)} />
    </div>
  );
}
