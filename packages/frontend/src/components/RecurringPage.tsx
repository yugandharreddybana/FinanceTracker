import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { CalendarClock, ArrowUpRight, ArrowDownRight, Play, Pause, Zap } from 'lucide-react';

export function RecurringPage() {
  const { recurringTransactions } = useFinance();
  const activeIncome = 0;
  const activeExpenses = recurringTransactions.filter(t => t.status === 'Active').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Recurring</h1>
        <p className="text-slate-400 font-medium">Automated bills & expenses</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Monthly Income', value: formatCurrency(activeIncome), icon: ArrowUpRight, gradient: 'from-emerald-500 to-teal-600' },
          { label: 'Monthly Expenses', value: formatCurrency(activeExpenses), icon: ArrowDownRight, gradient: 'from-rose-500 to-pink-600' },
          { label: 'Net Monthly', value: formatCurrency(activeIncome - activeExpenses), icon: CalendarClock, gradient: 'from-violet-500 to-purple-600' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-6 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20"><s.icon className="h-5 w-5" /></div>
              <div><p className="text-sm text-white/70 font-medium">{s.label}</p><p className="text-2xl font-black">{s.value}</p></div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /><h3 className="font-bold text-slate-900">All Recurring</h3></div>
        {recurringTransactions.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
            className={cn('flex items-center justify-between px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors', t.status !== 'Active' && 'opacity-40')}>
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
                <ArrowDownRight className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{t.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">{t.category}</span>
                  <span className="capitalize">{t.frequency}</span>
                  <span>Day {t.date} of month</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-black text-rose-500">
                -{formatCurrency(t.amount)}
              </span>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', t.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                {t.status === 'Active' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
