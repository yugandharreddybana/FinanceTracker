import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatAxisMoney, sanitizeFinanceText } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Car, Calculator, Calendar, Percent, CreditCard, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Loan } from '../types';

const ICONS: Record<string, React.ElementType> = { home: Home, car: Car, personal: Calculator, education: Calculator, credit_card: CreditCard };
const COLORS: Record<string, string> = { home: 'from-blue-500 to-indigo-600', car: 'from-emerald-500 to-teal-600', personal: 'from-amber-500 to-orange-600', education: 'from-violet-500 to-purple-600', credit_card: 'from-rose-500 to-pink-600' };

const DEFAULT_LOAN: Partial<Loan> = {
  category: 'personal',
  interestRate: 8,
  tenureYears: 5,
  color: '#6366f1',
};

export function LoansPage() {
  const { loans, addLoan, updateLoan, deleteLoan, userProfile } = useFinance();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const prefCurrency = userProfile.preferences?.currency || 'INR';

  const primaryCurrency = loans[0]?.currency || prefCurrency;

  const totalDebt = loans.reduce((s, l) => s + l.remainingAmount, 0);
  const totalEMI = loans.reduce((s, l) => s + l.monthlyEMI, 0);
  const paid = loans.reduce((s, l) => s + (l.totalAmount - l.remainingAmount), 0);

  const chartData = loans.map(l => ({
    name: l.name.replace(/^.+? /, ''),
    remaining: l.remainingAmount,
    paid: l.totalAmount - l.remainingAmount,
    currency: l.currency || prefCurrency,
  }));

  const modalOpen = isAddOpen || editing !== null;
  const closeModal = () => { setIsAddOpen(false); setEditing(null); };

  const submitLoan = (formData: FormData) => {
    const name = sanitizeFinanceText(formData.get('name'));
    const category = String(formData.get('category') || 'personal');
    const totalAmount = Number(formData.get('totalAmount')) || 0;
    const remStr = formData.get('remainingAmount');
    const remainingAmount =
      remStr !== null && String(remStr).trim() !== ''
        ? Number(remStr)
        : totalAmount;
    const monthlyEMI = Number(formData.get('monthlyEMI')) || 0;
    const interestRate = Number(formData.get('interestRate')) || 0;
    const tenureYears = Number(formData.get('tenureYears')) || 1;
    const startDate = String(formData.get('startDate') || new Date().toISOString().slice(0, 10));
    const endDate = String(formData.get('endDate') || new Date().toISOString().slice(0, 10));
    const currency = sanitizeFinanceText(formData.get('currency')) || prefCurrency;

    const payload: Loan = {
      id: editing?.id ?? crypto.randomUUID(),
      name,
      category,
      totalAmount,
      remainingAmount,
      monthlyEMI,
      interestRate,
      tenureYears,
      startDate,
      endDate,
      color: editing?.color || DEFAULT_LOAN.color!,
      currency,
      payments: editing?.payments,
    };

    if (editing) updateLoan(editing.id, payload);
    else addLoan(payload);
    closeModal();
  };

  const confirmDelete = (loan: Loan) => {
    if (!window.confirm(`Delete loan "${loan.name}"?`)) return;
    deleteLoan(loan.id);
  };

  return (
    <div data-testid="page-loans" className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Loans & EMIs</h1>
          <p className="text-slate-400 font-medium">Manage your debts smartly</p>
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAddOpen(true)}
          className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-500/25 hover:bg-rose-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Loan
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Outstanding', value: formatCurrency(totalDebt, primaryCurrency), icon: Calculator, gradient: 'from-rose-500 to-pink-600' },
          { label: 'Monthly EMI', value: formatCurrency(totalEMI, primaryCurrency), icon: Calendar, gradient: 'from-amber-500 to-orange-600' },
          { label: 'Paid Off', value: formatCurrency(paid, primaryCurrency), icon: Percent, gradient: 'from-emerald-500 to-teal-600' },
          { label: 'Active Loans', value: loans.length.toString(), icon: CreditCard, gradient: 'from-blue-500 to-indigo-600' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-6 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <s.icon className="h-5 w-5 text-white/60 mb-3" aria-hidden />
            <p className="text-sm text-white/70 font-medium">{s.label}</p>
            <p className="text-2xl font-black mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-4">Loan Progress</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatAxisMoney(Number(v), primaryCurrency)} />
            <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} width={90} />
            <Tooltip formatter={(v) => formatCurrency(Number(v), primaryCurrency)} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} />
            <Bar dataKey="paid" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} name="Paid" />
            <Bar dataKey="remaining" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} name="Remaining" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loans.map((loan, i) => {
          const Icon = ICONS[loan.category] || Calculator;
          const gradient = COLORS[loan.category] || 'from-slate-500 to-slate-600';
          const progress = loan.totalAmount > 0 ? ((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100 : 0;
          const monthsLeft = loan.monthlyEMI > 0 ? Math.ceil(loan.remainingAmount / loan.monthlyEMI) : 0;
          const lc = loan.currency || prefCurrency;

          return (
            <motion.div key={loan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -2 }}
              className="rounded-3xl bg-white shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
              <div className="p-6">
                <div className="flex items-center justify-between mb-5 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shrink-0`}>
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{loan.name}</h3>
                      <p className="text-xs text-slate-400 capitalize">{loan.category.replace('_', ' ')} loan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" aria-label={`Edit ${loan.name}`} onClick={() => setEditing(loan)} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" aria-label={`Delete ${loan.name}`} onClick={() => confirmDelete(loan)} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end text-right mb-3">
                  <div>
                    <p className="text-xs text-slate-400">EMI</p>
                    <p className="font-bold text-slate-900">{formatCurrency(loan.monthlyEMI, lc)}<span className="text-xs text-slate-400">/mo</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 mb-5">
                  <div><p className="text-[10px] text-slate-400 uppercase font-semibold">Principal</p><p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(loan.totalAmount, lc)}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-semibold">Rate</p><p className="text-sm font-bold text-slate-900 mt-0.5">{loan.interestRate}%</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-semibold">Remaining</p><p className="text-sm font-bold text-rose-500 mt-0.5">{formatCurrency(loan.remainingAmount, lc)}</p></div>
                </div>

                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">Progress</span>
                  <span className="font-bold text-slate-700">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full rounded-full bg-gradient-to-r ${gradient}`} />
                </div>
                <p className="text-xs text-slate-400 mt-2">{monthsLeft > 0 ? `~${monthsLeft} months remaining` : 'No EMI set'}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div role="dialog" aria-modal="true" aria-labelledby="loan-modal-title" className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 id="loan-modal-title" className="text-xl font-black text-slate-900">{editing ? 'Edit Loan' : 'New Loan'}</h2>
                <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden /></button>
              </div>
              <form className="space-y-3" key={editing?.id ?? 'new'} onSubmit={(e) => { e.preventDefault(); submitLoan(new FormData(e.currentTarget)); }}>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Name</label>
                  <input name="name" required defaultValue={editing?.name} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                    <select name="category" defaultValue={editing?.category || 'personal'} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="home">Home</option>
                      <option value="car">Car</option>
                      <option value="personal">Personal</option>
                      <option value="education">Education</option>
                      <option value="credit_card">Credit card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Currency</label>
                    <select name="currency" defaultValue={editing?.currency || prefCurrency} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Principal</label>
                    <input type="number" name="totalAmount" required defaultValue={editing?.totalAmount} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Remaining</label>
                    <input type="number" name="remainingAmount" required defaultValue={editing?.remainingAmount} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">EMI / mo</label>
                    <input type="number" name="monthlyEMI" required defaultValue={editing?.monthlyEMI} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Rate %</label>
                    <input type="number" step="0.01" name="interestRate" required defaultValue={editing?.interestRate ?? DEFAULT_LOAN.interestRate} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Years</label>
                    <input type="number" name="tenureYears" required defaultValue={editing?.tenureYears ?? DEFAULT_LOAN.tenureYears} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Start</label>
                    <input type="date" name="startDate" required defaultValue={(editing?.startDate || '').slice(0, 10)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">End</label>
                    <input type="date" name="endDate" required defaultValue={(editing?.endDate || '').slice(0, 10)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600">Cancel</button>
                  <button type="submit" className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">{editing ? 'Save' : 'Create'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
