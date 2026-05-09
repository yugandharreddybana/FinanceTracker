import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444', '#F97316'];

export function BudgetsPage() {
  const { budgets } = useFinance();
  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const pieData = budgets.map(b => ({ name: b.category, value: b.spent }));

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Budgets</h1>
        <p className="text-slate-400 font-medium">Track your spending against limits</p>
      </motion.div>

      {/* Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10" />
          <p className="text-sm text-slate-400 font-medium">Monthly Spending</p>
          <p className="text-4xl font-black mt-2">{formatCurrency(totalSpent)}</p>
          <p className="text-sm text-slate-400 mt-1">of {formatCurrency(totalBudget)}</p>
          <div className="mt-5 h-3 rounded-full bg-white/10 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(overallPct, 100)}%` }} transition={{ duration: 1.2 }}
              className={cn('h-full rounded-full', overallPct > 90 ? 'bg-rose-500' : overallPct > 70 ? 'bg-amber-500' : 'bg-emerald-400')} />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-slate-400">{overallPct.toFixed(0)}% used</span>
            <span className={remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(Math.abs(remaining))} {remaining >= 0 ? 'left' : 'over'}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Spending Distribution</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="45%" height={220}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip formatter={v => formatCurrency(Number(v))} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} /></PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5">
              {budgets.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-slate-500 font-medium">{b.category}</span></div>
                  <span className="font-bold text-slate-900">{formatCurrency(b.spent)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {budgets.map((b, i) => {
          const pct = (b.spent / b.limit) * 100;
          const isOver = pct > 100;
          const isNear = pct > 80 && !isOver;
          return (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              whileHover={{ y: -2 }}
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${COLORS[i % COLORS.length]}15` }}>
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{b.category}</h3>
                    <span className="text-xs text-slate-400 capitalize">{b.period}</span>
                  </div>
                </div>
                {isOver ? <AlertTriangle className="h-5 w-5 text-rose-500" />
                 : isNear ? <TrendingUp className="h-5 w-5 text-amber-500" />
                 : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              </div>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(b.spent)}</p>
              <p className="text-sm text-slate-400">of {formatCurrency(b.limit)}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                  className={cn('h-full rounded-full', isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500')} />
              </div>
              <p className={cn('text-xs font-semibold mt-2', isOver ? 'text-rose-500' : isNear ? 'text-amber-500' : 'text-emerald-600')}>
                {isOver ? `Over by ${formatCurrency(b.spent - b.limit)}` : `${formatCurrency(b.limit - b.spent)} left`}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
