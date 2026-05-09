import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';
import { Home, Car, Calculator, Calendar, Percent, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ICONS: Record<string, React.ElementType> = { home: Home, car: Car, personal: Calculator, education: Calculator, credit_card: CreditCard };
const COLORS: Record<string, string> = { home: 'from-blue-500 to-indigo-600', car: 'from-emerald-500 to-teal-600', personal: 'from-amber-500 to-orange-600', education: 'from-violet-500 to-purple-600', credit_card: 'from-rose-500 to-pink-600' };

export function LoansPage() {
  const { loans } = useFinance();
  const totalDebt = loans.reduce((s, l) => s + l.remainingAmount, 0);
  const totalEMI = loans.reduce((s, l) => s + l.monthlyEMI, 0);
  const paid = loans.reduce((s, l) => s + (l.totalAmount - l.remainingAmount), 0);

  const chartData = loans.map(l => ({ name: l.name.replace(/^.+? /, ''), remaining: l.remainingAmount, paid: l.totalAmount - l.remainingAmount }));

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Loans & EMIs</h1>
        <p className="text-slate-400 font-medium">Manage your debts smartly</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Outstanding', value: formatCurrency(totalDebt), icon: Calculator, gradient: 'from-rose-500 to-pink-600' },
          { label: 'Monthly EMI', value: formatCurrency(totalEMI), icon: Calendar, gradient: 'from-amber-500 to-orange-600' },
          { label: 'Paid Off', value: formatCurrency(paid), icon: Percent, gradient: 'from-emerald-500 to-teal-600' },
          { label: 'Active Loans', value: loans.length.toString(), icon: CreditCard, gradient: 'from-blue-500 to-indigo-600' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-6 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <s.icon className="h-5 w-5 text-white/60 mb-3" />
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
            <XAxis type="number" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v/100000}L`} />
            <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} width={90} />
            <Tooltip formatter={v => formatCurrency(Number(v))} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} />
            <Bar dataKey="paid" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} name="Paid" />
            <Bar dataKey="remaining" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} name="Remaining" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loans.map((loan, i) => {
          const Icon = ICONS[loan.category] || Calculator;
          const gradient = COLORS[loan.category] || 'from-slate-500 to-slate-600';
          const progress = ((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100;
          const monthsLeft = Math.ceil(loan.remainingAmount / loan.monthlyEMI);

          return (
            <motion.div key={loan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -2 }}
              className="rounded-3xl bg-white shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{loan.name}</h3>
                      <p className="text-xs text-slate-400 capitalize">{loan.category.replace('_', ' ')} loan</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">EMI</p>
                    <p className="font-bold text-slate-900">{formatCurrency(loan.monthlyEMI)}<span className="text-xs text-slate-400">/mo</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 mb-5">
                  <div><p className="text-[10px] text-slate-400 uppercase font-semibold">Principal</p><p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(loan.totalAmount)}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-semibold">Rate</p><p className="text-sm font-bold text-slate-900 mt-0.5">{loan.interestRate}%</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-semibold">Remaining</p><p className="text-sm font-bold text-rose-500 mt-0.5">{formatCurrency(loan.remainingAmount)}</p></div>
                </div>

                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">Progress</span>
                  <span className="font-bold text-slate-700">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full rounded-full bg-gradient-to-r ${gradient}`} />
                </div>
                <p className="text-xs text-slate-400 mt-2">~{monthsLeft} months remaining</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
