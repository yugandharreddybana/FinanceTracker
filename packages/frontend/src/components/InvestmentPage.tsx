import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Briefcase, BarChart3, Coins, Landmark, Plus, Trash } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AddInvestmentModal } from './AddInvestmentModal';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
const TYPE_ICONS: Record<string, React.ElementType> = { Stock: BarChart3, ETF: Landmark, Crypto: Coins, mutual_fund: TrendingUp };
const TYPE_LABELS: Record<string, string> = { Stock: 'Stocks', ETF: 'ETFs', Crypto: 'Crypto', mutual_fund: 'Mutual Funds' };

export function InvestmentPage() {
  const { investments, addInvestment, deleteInvestment, updateInvestment, userProfile } = useFinance();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<(typeof investments)[0] | null>(null);

  const currency = userProfile.preferences?.currency || 'INR';

  const totalInvested = investments.reduce((s, i) => s + i.quantity * i.averagePrice, 0);
  const currentValue = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalGain = currentValue - totalInvested;
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const byType = investments.reduce((acc, i) => {
    const v = i.quantity * i.currentPrice;
    acc[i.type] = (acc[i.type] || 0) + v;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(byType).map(([type, value]) => ({ name: TYPE_LABELS[type] || type, value }));

  return (
    <div data-testid="page-investments" className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Investments</h1>
          <p className="text-slate-400 font-medium">Your portfolio at a glance</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setEditTarget(null); setIsAddOpen(true); }}
          className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Investment
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Invested', value: formatCurrency(totalInvested, currency), icon: Briefcase, gradient: 'from-blue-500 to-indigo-600' },
          { label: 'Current Value', value: formatCurrency(currentValue, currency), icon: BarChart3, gradient: 'from-violet-500 to-purple-600' },
          { label: 'Returns', value: `${totalGain >= 0 ? '+' : ''}${formatCurrency(totalGain, currency)}`, icon: totalGain >= 0 ? TrendingUp : TrendingDown, gradient: totalGain >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-pink-600' },
          { label: 'Return %', value: `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%`, icon: totalGain >= 0 ? TrendingUp : TrendingDown, gradient: totalGain >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-pink-600' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Allocation</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip formatter={(v) => formatCurrency(Number(v), currency)} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} /></PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-slate-500 font-medium">{d.name}</span></div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-center">
          <h3 className="font-bold text-slate-900 mb-2">Portfolio value over time</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Historical performance charts need dated position snapshots from your broker or imports. Right now we only store your latest holdings and cost basis — so we show allocation and live totals instead of a fabricated curve.
          </p>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current portfolio value</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(currentValue, currency)}</p>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50"><h3 className="font-bold text-slate-900">Holdings</h3></div>
        {investments.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">No investments yet. Add your first position to track allocation and returns.</div>
        ) : (
          investments.map((inv, i) => {
            const total = inv.quantity * inv.currentPrice;
            const cost = inv.quantity * inv.averagePrice;
            const gain = total - cost;
            const pct = cost > 0 ? (gain / cost) * 100 : 0;
            const Icon = TYPE_ICONS[inv.type] || BarChart3;
            const invCurrency = inv.currency || currency;
            return (
              <motion.div key={inv.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                className="group flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100"><Icon className="h-5 w-5 text-slate-600" /></div>
                  <div>
                    <p className="font-semibold text-slate-800">{inv.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">{inv.symbol}</span>
                      <span>{inv.quantity} units</span>
                      <span>{formatDate(inv.lastUpdated)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(total, invCurrency)}</p>
                    <p className={cn('text-sm font-semibold', gain >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                      {gain >= 0 ? '+' : ''}{formatCurrency(gain, invCurrency)} ({pct.toFixed(1)}%)
                    </p>
                  </div>
                  <button type="button"
                    onClick={() => { setEditTarget(inv); setIsAddOpen(true); }}
                    className="text-xs font-bold text-blue-600 hover:underline px-2 py-1 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Remove ${inv.name} from your portfolio?`)) deleteInvestment(inv.id);
                    }}
                    className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all sm:opacity-90"
                    aria-label={`Delete ${inv.name}`}
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      <AddInvestmentModal
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); setEditTarget(null); }}
        investmentToEdit={editTarget}
        onAdd={(inv) => { addInvestment({ ...inv, id: inv.id || crypto.randomUUID(), lastUpdated: new Date().toISOString() }); setIsAddOpen(false); setEditTarget(null); }}
        onEdit={(id, updates) => { updateInvestment(id, { ...updates, lastUpdated: new Date().toISOString() }); setIsAddOpen(false); setEditTarget(null); }}
      />
    </div>
  );
}
