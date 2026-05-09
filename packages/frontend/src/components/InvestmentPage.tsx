import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Briefcase, BarChart3, Coins, Landmark } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
const TYPE_ICONS: Record<string, React.ElementType> = { Stock: BarChart3, ETF: Landmark, Crypto: Coins };
const TYPE_LABELS: Record<string, string> = { Stock: 'Stocks', ETF: 'ETFs', Crypto: 'Crypto' };

export function InvestmentPage() {
  const { investments } = useFinance();
  const totalInvested = investments.reduce((s, i) => s + i.quantity * i.averagePrice, 0);
  const currentValue = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalGain = currentValue - totalInvested;
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const byType = investments.reduce((acc, i) => { const v = i.quantity * i.currentPrice; acc[i.type] = (acc[i.type] || 0) + v; return acc; }, {} as Record<string, number>);
  const pieData = Object.entries(byType).map(([type, value]) => ({ name: TYPE_LABELS[type] || type, value }));

  const perfData = [
    { month: 'Sep', value: currentValue * 0.85 }, { month: 'Oct', value: currentValue * 0.9 },
    { month: 'Nov', value: currentValue * 0.88 }, { month: 'Dec', value: currentValue * 0.95 },
    { month: 'Jan', value: currentValue },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Investments</h1>
        <p className="text-slate-400 font-medium">Your portfolio at a glance</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Invested', value: formatCurrency(totalInvested), icon: Briefcase, gradient: 'from-blue-500 to-indigo-600' },
          { label: 'Current Value', value: formatCurrency(currentValue), icon: BarChart3, gradient: 'from-violet-500 to-purple-600' },
          { label: 'Returns', value: `${totalGain >= 0 ? '+' : ''}${formatCurrency(totalGain)}`, icon: totalGain >= 0 ? TrendingUp : TrendingDown, gradient: totalGain >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-pink-600' },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Allocation</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip formatter={v => formatCurrency(Number(v))} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} /></PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-slate-500 font-medium">{d.name}</span></div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={perfData}>
              <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.25} /><stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v/1000}k`} />
              <Tooltip formatter={v => formatCurrency(Number(v))} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: 12 }} itemStyle={{ color: '#fff' }} />
              <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#pg)" dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Holdings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50"><h3 className="font-bold text-slate-900">Holdings</h3></div>
        {investments.map((inv, i) => {
          const total = inv.quantity * inv.currentPrice;
          const cost = inv.quantity * inv.averagePrice;
          const gain = total - cost;
          const pct = cost > 0 ? (gain / cost) * 100 : 0;
          const Icon = TYPE_ICONS[inv.type] || BarChart3;
          return (
            <motion.div key={inv.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
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
              <div className="text-right">
                <p className="font-bold text-slate-900">{formatCurrency(total)}</p>
                <p className={cn('text-sm font-semibold', gain >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                  {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({pct.toFixed(1)}%)
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
