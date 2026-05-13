import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, sanitizeFinanceText } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Target, TrendingUp, Calendar, Plus, Zap, X, Flag, Pencil, Trash2 } from 'lucide-react';
import type { SavingsGoal } from '../types';

export function SavingsPage() {
  const { savingsGoals, updateSavingsGoal, addSavingsGoal, deleteSavingsGoal, userProfile } = useFinance();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);

  const totalTarget = savingsGoals.reduce((s, g) => s + g.target, 0);
  const totalSaved = savingsGoals.reduce((s, g) => s + g.current, 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const goalCurrency = userProfile.preferences?.currency || 'INR';

  const handleAdd = (id: string) => {
    if (!addAmount) return;
    const goal = savingsGoals.find(g => g.id === id);
    if (goal) {
      updateSavingsGoal(id, { current: goal.current + parseFloat(addAmount) });
    }
    setAddAmount('');
    setSelectedGoal(null);
  };

  const closeEdit = () => setEditing(null);

  const submitEdit = (formData: FormData) => {
    if (!editing) return;
    const name = sanitizeFinanceText(formData.get('name'));
    const target = Number(formData.get('target')) || 0;
    const emoji = sanitizeFinanceText(formData.get('emoji')) || '🎯';
    const deadlineRaw = formData.get('deadline') as string;
    const deadline = deadlineRaw ? deadlineRaw : undefined;
    const currency = sanitizeFinanceText(formData.get('currency')) || goalCurrency;

    updateSavingsGoal(editing.id, {
      name,
      target,
      emoji,
      deadline,
      currency,
    });
    closeEdit();
  };

  const confirmDelete = (g: SavingsGoal) => {
    if (!window.confirm(`Delete goal "${g.name}"?`)) return;
    deleteSavingsGoal(g.id);
  };

  const modalOpen = isAddOpen || editing !== null;
  const closeAnyModal = () => { setIsAddOpen(false); closeEdit(); };

  return (
    <div data-testid="page-savings" className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Savings Goals</h1>
          <p className="text-slate-400 font-medium">Watch your dreams come closer</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-colors flex items-center gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Add Goal
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-3xl animated-gradient p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          <div><div className="flex items-center gap-2 text-white/60 mb-2"><Target className="h-5 w-5" aria-hidden /><span className="text-sm font-semibold">Total Target</span></div><p className="text-3xl font-black">{formatCurrency(totalTarget, goalCurrency)}</p></div>
          <div><div className="flex items-center gap-2 text-white/60 mb-2"><TrendingUp className="h-5 w-5" aria-hidden /><span className="text-sm font-semibold">Total Saved</span></div><p className="text-3xl font-black">{formatCurrency(totalSaved, goalCurrency)}</p></div>
          <div><div className="flex items-center gap-2 text-white/60 mb-2"><Calendar className="h-5 w-5" aria-hidden /><span className="text-sm font-semibold">Progress</span></div><p className="text-3xl font-black">{overallPct.toFixed(1)}%</p></div>
        </div>
        <div className="mt-6 h-3 rounded-full bg-white/20 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(overallPct, 100)}%` }} transition={{ duration: 1.5 }}
            className="h-full rounded-full bg-white" />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savingsGoals.map((g, i) => {
          const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
          const remaining = g.target - g.current;
          const daysLeft = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
          const gc = g.currency || goalCurrency;

          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-3xl bg-white shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="h-1.5 bg-emerald-500" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-2 mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl shrink-0" aria-hidden>{g.emoji || '🎯'}</span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{g.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Zap className="h-3 w-3 shrink-0" aria-hidden />
                        {g.deadline ? (daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed') : 'No deadline'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" aria-label={`Edit ${g.name}`} onClick={() => setEditing(g)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" aria-label={`Delete ${g.name}`} onClick={() => confirmDelete(g)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-5">
                  <div className="relative h-20 w-20 flex-shrink-0">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80" aria-hidden>
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                      <motion.circle cx="40" cy="40" r="34" fill="none" stroke="#10B981" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - Math.min(pct, 100) / 100) }}
                        transition={{ duration: 1.5, delay: 0.3 + i * 0.1 }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-black text-slate-900">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(g.current, gc)}</p>
                    <p className="text-sm text-slate-400">of {formatCurrency(g.target, gc)}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatCurrency(remaining, gc)} to go</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input type="number" placeholder="Add amount"
                    value={selectedGoal === g.id ? addAmount : ''} onChange={e => { setSelectedGoal(g.id); setAddAmount(e.target.value); }}
                    onFocus={() => setSelectedGoal(g.id)}
                    className="flex-1 rounded-xl border-2 border-slate-100 px-3 py-2 text-sm font-medium focus:border-emerald-400 focus:outline-none transition-all min-w-0" min="0" />
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => handleAdd(g.id)} disabled={selectedGoal !== g.id || !addAmount}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400 shrink-0">
                    <Plus className="h-4 w-4" aria-hidden />
                  </motion.button>
                </div>

                <p className="text-[11px] text-slate-400 mt-3">Deadline: {g.deadline ? formatDate(g.deadline) : 'N/A'}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div role="dialog" aria-modal="true" aria-labelledby="savings-modal-title" className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeAnyModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl overflow-hidden flex flex-col">
              {editing ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                        <Pencil className="h-5 w-5" aria-hidden />
                      </div>
                      <h2 id="savings-modal-title" className="text-xl font-black text-slate-900">Edit Goal</h2>
                    </div>
                    <button type="button" onClick={closeAnyModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all">
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                  <form key={editing.id} onSubmit={(e) => { e.preventDefault(); submitEdit(new FormData(e.currentTarget)); }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Goal Name</label>
                      <input type="text" name="name" required defaultValue={editing.name} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Target</label>
                        <input type="number" name="target" required defaultValue={editing.target} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Emoji</label>
                        <input type="text" name="emoji" defaultValue={editing.emoji} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium text-center focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Currency</label>
                      <select name="currency" defaultValue={editing.currency || goalCurrency} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all">
                        <option value="INR">INR</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Target Date</label>
                      <input type="date" name="deadline" defaultValue={editing.deadline?.slice(0, 10)} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={closeAnyModal} className="flex-1 rounded-2xl border-2 border-slate-100 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                      <button type="submit" className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all">Save</button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                        <Flag className="h-5 w-5" aria-hidden />
                      </div>
                      <h2 id="savings-modal-title" className="text-xl font-black text-slate-900">New Savings Goal</h2>
                    </div>
                    <button type="button" onClick={closeAnyModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all">
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    addSavingsGoal({
                      id: crypto.randomUUID(),
                      name: sanitizeFinanceText(formData.get('name')),
                      target: Number(formData.get('target')) || 0,
                      current: 0,
                      deadline: (formData.get('deadline') as string) || undefined,
                      emoji: sanitizeFinanceText(formData.get('emoji')) || '🎯',
                      currency: goalCurrency,
                    });
                    closeAnyModal();
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Goal Name</label>
                      <input type="text" name="name" required placeholder="e.g., Dream Vacation" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Target Amount</label>
                        <input type="number" name="target" required placeholder="0" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Icon / Emoji</label>
                        <input type="text" name="emoji" placeholder="🎯" defaultValue="🎯" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium text-center focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Target Date</label>
                      <input type="date" name="deadline" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={closeAnyModal} className="flex-1 rounded-2xl border-2 border-slate-100 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                      <button type="submit" className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all">Create</button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
