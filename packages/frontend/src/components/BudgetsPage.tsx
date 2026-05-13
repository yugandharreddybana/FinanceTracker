import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn, sanitizeFinanceText } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, TrendingUp, Plus, X, PieChart, Pencil, Trash2 } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Budget } from '../types';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444', '#F97316'];

export function BudgetsPage() {
  const { budgets, addBudget, updateBudget, deleteBudget, categories, userProfile } = useFinance();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const pieData = budgets.map(b => ({ name: b.category, value: b.spent }));

  const budgetCurrency = userProfile.preferences?.currency || 'INR';

  const modalOpen = isAddOpen || editing !== null;
  const closeModal = () => { setIsAddOpen(false); setEditing(null); };

  const submitBudget = (formData: FormData) => {
    const category = sanitizeFinanceText(formData.get('category'));
    const limit = Number(formData.get('limit')) || 0;
    const period = (String(formData.get('period') || 'Monthly') === 'Yearly' ? 'Annual' : String(formData.get('period'))) as Budget['period'];

    if (editing) {
      updateBudget(editing.id, {
        category,
        limit,
        period,
        currency: budgetCurrency,
      });
    } else {
      addBudget({
        id: crypto.randomUUID(),
        category,
        limit,
        spent: 0,
        period,
        color: '#8b5cf6',
        currency: budgetCurrency,
        emoji: '📊',
      });
    }
    closeModal();
  };

  const confirmDelete = (b: Budget) => {
    if (!window.confirm(`Delete budget for "${b.category}"?`)) return;
    deleteBudget(b.id);
  };

  return (
    <div data-testid="page-budgets" className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Budgets</h1>
          <p className="text-slate-400 font-medium">Track your spending against limits</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 transition-colors flex items-center gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Add Budget
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10" />
          <p className="text-sm text-slate-400 font-medium">Monthly Spending</p>
          <p className="text-4xl font-black mt-2">{formatCurrency(totalSpent, budgetCurrency)}</p>
          <p className="text-sm text-slate-400 mt-1">of {formatCurrency(totalBudget, budgetCurrency)}</p>
          <div className="mt-5 h-3 rounded-full bg-white/10 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(overallPct, 100)}%` }} transition={{ duration: 1.2 }}
              className={cn('h-full rounded-full', overallPct > 90 ? 'bg-rose-500' : overallPct > 70 ? 'bg-amber-500' : 'bg-emerald-400')} />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-slate-400">{overallPct.toFixed(0)}% used</span>
            <span className={remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(Math.abs(remaining), budgetCurrency)} {remaining >= 0 ? 'left' : 'over'}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Spending Distribution</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={220} className="sm:!w-[45%] sm:!max-w-[240px]">
              <RechartsPieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip formatter={v => formatCurrency(Number(v), budgetCurrency)} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} /></RechartsPieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5 w-full">
              {budgets.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-slate-500 font-medium truncate">{b.category}</span></div>
                  <span className="font-bold text-slate-900 shrink-0">{formatCurrency(b.spent, b.currency || budgetCurrency)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {budgets.map((b, i) => {
          const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
          const isOver = pct > 100;
          const isNear = pct > 80 && !isOver;
          const bc = b.currency || budgetCurrency;
          return (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              whileHover={{ y: -2 }}
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLORS[i % COLORS.length]}15` }}>
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{b.category}</h3>
                    <span className="text-xs text-slate-400 capitalize">{b.period || 'Monthly'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isOver ? <AlertTriangle className="h-5 w-5 text-rose-500" aria-hidden />
                   : isNear ? <TrendingUp className="h-5 w-5 text-amber-500" aria-hidden />
                   : <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />}
                  <button type="button" aria-label={`Edit ${b.category}`} onClick={() => setEditing(b)} className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50">
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" aria-label={`Delete ${b.category}`} onClick={() => confirmDelete(b)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(b.spent, bc)}</p>
              <p className="text-sm text-slate-400">of {formatCurrency(b.limit, bc)}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                  className={cn('h-full rounded-full', isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500')} />
              </div>
              <p className={cn('text-xs font-semibold mt-2', isOver ? 'text-rose-500' : isNear ? 'text-amber-500' : 'text-emerald-600')}>
                {isOver ? `Over by ${formatCurrency(b.spent - b.limit, bc)}` : `${formatCurrency(b.limit - b.spent, bc)} left`}
              </p>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div role="dialog" aria-modal="true" aria-labelledby="budget-modal-title" className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                    <PieChart className="h-5 w-5" aria-hidden />
                  </div>
                  <h2 id="budget-modal-title" className="text-xl font-black text-slate-900">{editing ? 'Edit Budget' : 'New Budget'}</h2>
                </div>
                <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <form key={editing?.id ?? 'new'} onSubmit={(e) => { e.preventDefault(); submitBudget(new FormData(e.currentTarget)); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
                  <select name="category" required defaultValue={editing?.category} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all">
                    {categories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Limit amount</label>
                  <input type="number" name="limit" required defaultValue={editing?.limit} placeholder="0" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Period</label>
                  <select name="period" defaultValue={editing?.period === 'Annual' ? 'Yearly' : (editing?.period || 'Monthly')} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all">
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 rounded-2xl border-2 border-slate-100 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 rounded-2xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all">{editing ? 'Save' : 'Create'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
