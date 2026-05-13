import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarClock, ArrowUpRight, ArrowDownRight, Play, Pause, Zap, Plus, X, Trash } from 'lucide-react';

export function RecurringPage() {
  const { recurringTransactions, addRecurringPayment, updateRecurringPayment, deleteRecurringPayment, userProfile } = useFinance();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const activeIncome = 0;
  const activeExpenses = recurringTransactions.filter(t => t.status === 'Active').reduce((s, t) => s + t.amount, 0);

  const currency = userProfile.preferences?.currency || 'INR';

  const toggleActive = (id: string, currentStatus: string) => {
    updateRecurringPayment(id, { status: currentStatus === 'Active' ? 'Paused' : 'Active' });
  };

  return (
    <div data-testid="page-recurring" className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Recurring</h1>
          <p className="text-slate-400 font-medium">Automated bills & expenses</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setIsAddOpen(true)}
          className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-500/25 hover:bg-rose-700 transition-colors flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Recurring
        </motion.button>
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
            className={cn('group flex items-center justify-between px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors', t.status !== 'Active' && 'opacity-60 bg-slate-50/30')}>
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
              <button 
                onClick={() => toggleActive(t.id, t.status)}
                role="switch"
                aria-checked={t.status === 'Active'}
                title={t.status === 'Active' ? 'Pause Payment' : 'Resume Payment'}
                className={cn('toggle flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm hover:scale-105 transition-all active:scale-95', 
                  t.status === 'Active' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400')}
              >
                {t.status === 'Active' ? <Play className="h-3.5 w-3.5 fill-emerald-600" /> : <Pause className="h-3.5 w-3.5 fill-slate-400" />}
              </button>
              <button 
                onClick={() => deleteRecurringPayment(t.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                title="Delete"
              >
                <Trash className="h-4 w-4" data-lucide="trash" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Add Recurring Payment Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div role="dialog" className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsAddOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900">Add Recurring</h2>
                </div>
                <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addRecurringPayment({
                  id: crypto.randomUUID(),
                  name: formData.get('name') as string,
                  amount: Number(formData.get('amount')) || 0,
                  frequency: formData.get('frequency') as any || 'Monthly',
                  category: formData.get('category') as string || 'Subscription',
                  date: Number(formData.get('date')) || 1,
                  status: 'Active' as const,
                  currency: currency,
                });
                setIsAddOpen(false);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Payment Name</label>
                  <input type="text" name="name" required placeholder="e.g., Spotify Family" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Amount</label>
                  <input type="number" name="amount" required placeholder="0" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Frequency</label>
                    <select name="frequency" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50 transition-all">
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Day of Month</label>
                    <input type="number" name="date" placeholder="1" min="1" max="31" defaultValue="1" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
                  <select name="category" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50 transition-all">
                    <option value="Subscription">Subscription</option>
                    <option value="Rent">Rent</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Bills">Utilities / Bills</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-2xl border-2 border-slate-100 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
