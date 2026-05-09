import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';
import { Wallet, TrendingUp, CreditCard, Building2, Briefcase, Calculator } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ASSET_COLORS = ['#10B981', '#3B82F6'];
const LIAB_COLORS = ['#F59E0B', '#EF4444'];

export function NetWorthPage() {
  const { bankAccounts, investments, loans, getNetWorth } = useFinance();
  const netWorth = getNetWorth();
  const cash = bankAccounts.filter(a => a.type === 'Savings' || a.type === 'Current').reduce((s, a) => s + a.balance, 0);
  const invTotal = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const creditDebt = bankAccounts.filter(a => a.type === 'Credit').reduce((s, a) => s + Math.abs(a.balance), 0);
  const loanDebt = loans.reduce((s, l) => s + l.remainingAmount, 0);
  const totalAssets = cash + invTotal;
  const totalLiab = creditDebt + loanDebt;

  const history = [
    { month: 'Aug', value: netWorth * 0.78 }, { month: 'Sep', value: netWorth * 0.83 },
    { month: 'Oct', value: netWorth * 0.88 }, { month: 'Nov', value: netWorth * 0.92 },
    { month: 'Dec', value: netWorth * 0.96 }, { month: 'Jan', value: netWorth },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Net Worth</h1>
        <p className="text-slate-400 font-medium">Your complete financial picture</p>
      </motion.div>

      {/* Main Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-2xl" />
        <div className="relative flex items-center gap-5 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10">
            <Calculator className="h-8 w-8 text-emerald-400" />
          </div>
          <div><p className="text-lg text-slate-400 font-medium">Total Net Worth</p><p className="text-4xl md:text-5xl font-black mt-1">{formatCurrency(netWorth)}</p></div>
        </div>
        <div className="relative grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <p className="text-sm text-slate-400 font-medium">Total Assets</p>
            <p className="text-2xl font-black mt-1 text-emerald-400">{formatCurrency(totalAssets)}</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <p className="text-sm text-slate-400 font-medium">Total Liabilities</p>
            <p className="text-2xl font-black mt-1 text-rose-400">{formatCurrency(totalLiab)}</p>
          </div>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-4">Net Worth Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={history}>
            <defs><linearGradient id="nwg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.25} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v/100000}L`} />
            <Tooltip formatter={v => formatCurrency(Number(v))} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} />
            <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5} fill="url(#nwg)" dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Assets</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="45%" height={180}>
              <PieChart><Pie data={[{ name: 'Cash', value: cash }, { name: 'Investments', value: invTotal }]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {ASSET_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie><Tooltip formatter={v => formatCurrency(Number(v))} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} /></PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100"><Wallet className="h-5 w-5 text-emerald-600" /></div><span className="text-sm font-medium text-slate-600">Cash & Bank</span></div>
                <span className="font-bold text-slate-900">{formatCurrency(cash)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100"><TrendingUp className="h-5 w-5 text-blue-600" /></div><span className="text-sm font-medium text-slate-600">Investments</span></div>
                <span className="font-bold text-slate-900">{formatCurrency(invTotal)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Liabilities</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="45%" height={180}>
              <PieChart><Pie data={[{ name: 'Credit', value: creditDebt }, { name: 'Loans', value: loanDebt }]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {LIAB_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie><Tooltip formatter={v => formatCurrency(Number(v))} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} /></PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100"><CreditCard className="h-5 w-5 text-amber-600" /></div><span className="text-sm font-medium text-slate-600">Credit Cards</span></div>
                <span className="font-bold text-rose-500">{formatCurrency(creditDebt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100"><Building2 className="h-5 w-5 text-rose-600" /></div><span className="text-sm font-medium text-slate-600">Loans</span></div>
                <span className="font-bold text-rose-500">{formatCurrency(loanDebt)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Projections */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-2">Future Projections</h3>
        <p className="text-sm text-slate-400 mb-6">Based on 12% annual growth</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{ y: 5, v: netWorth * 1.8 }, { y: 10, v: netWorth * 3.2 }, { y: 20, v: netWorth * 7.5 }].map((p, i) => (
            <motion.div key={i} whileHover={{ y: -4 }}
              className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 p-6 text-center border border-violet-100 hover:shadow-lg transition-all">
              <Briefcase className="mx-auto h-5 w-5 text-violet-500 mb-2" />
              <p className="text-sm font-semibold text-violet-600">In {p.y} Years</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{formatCurrency(p.v)}</p>
              <p className="text-xs text-slate-400 mt-1">+{(((p.v - netWorth) / netWorth) * 100).toFixed(0)}% growth</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
