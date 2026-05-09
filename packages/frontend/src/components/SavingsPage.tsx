import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { motion } from 'motion/react';
import { Target, TrendingUp, Calendar, Plus, Zap } from 'lucide-react';

export function SavingsPage() {
  const { savingsGoals, updateSavingsGoal } = useFinance();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');

  const totalTarget = savingsGoals.reduce((s, g) => s + g.target, 0);
  const totalSaved = savingsGoals.reduce((s, g) => s + g.current, 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const handleAdd = (id: string) => {
    if (!addAmount) return;
    const goal = savingsGoals.find(g => g.id === id);
    if (goal) {
      updateSavingsGoal(id, { current: goal.current + parseFloat(addAmount) });
    }
    setAddAmount('');
    setSelectedGoal(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Savings Goals</h1>
        <p className="text-slate-400 font-medium">Watch your dreams come closer</p>
      </motion.div>

      {/* Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-3xl animated-gradient p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          <div><div className="flex items-center gap-2 text-white/60 mb-2"><Target className="h-5 w-5" /><span className="text-sm font-semibold">Total Target</span></div><p className="text-3xl font-black">{formatCurrency(totalTarget)}</p></div>
          <div><div className="flex items-center gap-2 text-white/60 mb-2"><TrendingUp className="h-5 w-5" /><span className="text-sm font-semibold">Total Saved</span></div><p className="text-3xl font-black">{formatCurrency(totalSaved)}</p></div>
          <div><div className="flex items-center gap-2 text-white/60 mb-2"><Calendar className="h-5 w-5" /><span className="text-sm font-semibold">Progress</span></div><p className="text-3xl font-black">{overallPct.toFixed(1)}%</p></div>
        </div>
        <div className="mt-6 h-3 rounded-full bg-white/20 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(overallPct, 100)}%` }} transition={{ duration: 1.5 }}
            className="h-full rounded-full bg-white" />
        </div>
      </motion.div>

      {/* Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savingsGoals.map((g, i) => {
          const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
          const remaining = g.target - g.current;
          const daysLeft = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-3xl bg-white shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="h-1.5 bg-emerald-500" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">{g.emoji}</span>
                  <div>
                    <h3 className="font-bold text-slate-900">{g.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {g.deadline ? (daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed') : 'No deadline'}
                    </p>
                  </div>
                </div>

                {/* Progress ring */}
                <div className="flex items-center gap-6 mb-5">
                  <div className="relative h-20 w-20 flex-shrink-0">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
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
                  <div className="flex-1">
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(g.current)}</p>
                    <p className="text-sm text-slate-400">of {formatCurrency(g.target)}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatCurrency(remaining)} to go</p>
                  </div>
                </div>

                {/* Quick add */}
                <div className="flex gap-2">
                  <input type="number" placeholder="Add amount"
                    value={selectedGoal === g.id ? addAmount : ''} onChange={e => { setSelectedGoal(g.id); setAddAmount(e.target.value); }}
                    onFocus={() => setSelectedGoal(g.id)}
                    className="flex-1 rounded-xl border-2 border-slate-100 px-3 py-2 text-sm font-medium focus:border-emerald-400 focus:outline-none transition-all" min="0" />
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleAdd(g.id)} disabled={selectedGoal !== g.id || !addAmount}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400">
                    <Plus className="h-4 w-4" />
                  </motion.button>
                </div>

                <p className="text-[11px] text-slate-400 mt-3">Deadline: {g.deadline ? formatDate(g.deadline) : 'N/A'}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
