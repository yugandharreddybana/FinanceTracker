import { useFinance } from '../context/FinanceContext';
import {
  formatCurrency,
  formatShortDate,
  cn,
  transactionCurrency,
} from '../lib/utils';
import { motion } from 'motion/react';
import {
  TrendingUp, Wallet, CreditCard, Target, ArrowUpRight, ArrowDownRight, Sparkles, BarChart3, Eye, EyeOff,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function investmentPortfolioCurrency(inv: { currency?: string }): string {
  const raw = (inv.currency || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  return raw.length >= 3 ? raw.slice(0, 3) : 'INR';
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444', '#F97316'];
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export function Dashboard() {
  const nav = useNavigate();
  const [hidden, setHidden] = useState(false);
  const {
    transactions,
    budgets,
    investments,
    userProfile,
    netWorthByCurrency,
    dashboardDisplayLens,
    setDashboardDisplayLens,
  } = useFinance();

  const lensCurrency = dashboardDisplayLens;

  const chartSym = formatCurrency(0, lensCurrency).replace(/[0-9.,\s\-]/g, '');

  const baseNode = netWorthByCurrency[lensCurrency] || { income: 0, expenses: 0, total: 0, assets: 0, liabilities: 0, change: 0 };
  const sr = baseNode.income > 0 ? ((baseNode.income - baseNode.expenses) / baseNode.income) * 100 : 0;

  const inLensCc = (t: (typeof transactions)[number]) =>
    transactionCurrency(t, lensCurrency) === lensCurrency;

  const catSpend = transactions
    .filter((t) => t.type === 'expense' && inLensCc(t))
    .reduce((a, t) => {
      a[t.category] = (a[t.category] || 0) + t.amount;
      return a;
    }, {} as Record<string, number>);
  const pie = Object.entries(catSpend).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const trend = (() => {
    const months: { m: string; inc: number; exp: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short' });
      const mo = d.getMonth();
      const yr = d.getFullYear();
      const inc = transactions
        .filter((t) => {
          const td = new Date(t.date);
          return (
            t.type === 'income' &&
            td.getMonth() === mo &&
            td.getFullYear() === yr &&
            inLensCc(t)
          );
        })
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const exp = transactions
        .filter((t) => {
          const td = new Date(t.date);
          return (
            t.type === 'expense' &&
            td.getMonth() === mo &&
            td.getFullYear() === yr &&
            inLensCc(t)
          );
        })
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      months.push({ m: label, inc, exp });
    }
    return months;
  })();

  const investmentsInLens = investments.filter(
    (i) => investmentPortfolioCurrency(i) === lensCurrency
  );

  const invVal = investmentsInLens.reduce((s, i) => {
    const val = (typeof i.quantity === 'number' && typeof i.currentPrice === 'number') 
      ? (i.quantity * i.currentPrice) 
      : (((i as unknown) as Record<string, unknown>).currentValue as number) || 0;
    return s + (Number(val) || 0);
  }, 0);
  
  const invCost = investmentsInLens.reduce((s, i) => {
    const cost = (typeof i.quantity === 'number' && typeof i.averagePrice === 'number')
      ? (i.quantity * i.averagePrice)
      : (((i as unknown) as Record<string, unknown>).amount as number) || 0;
    return s + (Number(cost) || 0);
  }, 0);

  const invGain = invVal - invCost;
  const invPct = invCost > 0 ? (invGain / invCost) * 100 : 0;
  const budgetsInLens = budgets.filter(
    (b) => (b.currency || 'INR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) === lensCurrency
  );
  const recentInLens = transactions
    .filter((t) => inLensCc(t))
    .slice(0, 5);

  const firstName = userProfile.name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Reusable Stack Generator enabling premium rendering across multi-fiat states
  const renderStackedValues = (
    metrics: string[], 
    baseStyles: string, 
    multiStyles: string,
    maskable: boolean = false
  ) => (
    <div className="flex flex-col gap-0.5 mt-0.5 sm:mt-1">
      {metrics.map((m, i) => (
        <p key={i} className={cn(
          'font-black tabular-nums leading-tight tracking-tight', 
          metrics.length > 1 ? multiStyles : baseStyles
        )}>
          {maskable && hidden ? '•••••••' : m}
        </p>
      ))}
    </div>
  );

  return (
    <div data-testid="page-dashboard" className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1440px] mx-auto">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            {greeting}, {firstName}{' '}
            <span aria-hidden>👋</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-0.5">
            Snapshot in <span className="font-semibold text-slate-600">{lensCurrency}</span> — totals, charts, and activity match this currency
          </p>
        </div>
        <div
          className="flex shrink-0 rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1 shadow-inner"
          role="group"
          aria-label="Dashboard display currency"
        >
          {(['INR', 'EUR'] as const).map((ccy) => (
            <button
              key={ccy}
              type="button"
              data-testid={`dashboard-lens-${ccy}`}
              aria-pressed={lensCurrency === ccy}
              onClick={() => setDashboardDisplayLens(ccy)}
              className={cn(
                'min-w-[4.25rem] rounded-xl px-4 py-2 text-xs font-black tracking-wide transition-all',
                lensCurrency === ccy
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {ccy}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Balance */}
        <motion.div variants={fadeUp} className="col-span-2 sm:col-span-1 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-6 text-white shadow-xl shadow-emerald-200/30">
          <div className="absolute -right-4 -top-4 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/10" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20"><Wallet className="h-4 w-4 sm:h-5 sm:w-5" /></div>
            <button type="button" aria-label={hidden ? 'Show balance amounts' : 'Hide balance amounts'} onClick={() => setHidden(!hidden)} className="relative z-10 text-white/50 hover:text-white active:scale-90 transition-all">{hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium">Total Balance</p>
          {renderStackedValues(
            [formatCurrency(netWorthByCurrency[lensCurrency]?.assets ?? 0, lensCurrency)],
            'text-2xl sm:text-3xl', 'text-xl', true
          )}
          {(netWorthByCurrency[lensCurrency]?.change ?? 0) !== 0 && (
            <div className="mt-2 sm:mt-3 flex items-center gap-1"><TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-200" /><span className="text-[11px] sm:text-xs font-semibold text-emerald-100">{(netWorthByCurrency[lensCurrency]?.change ?? 0) > 0 ? '+' : ''}{(netWorthByCurrency[lensCurrency]?.change ?? 0).toFixed(1)}%</span></div>
          )}
        </motion.div>

        {/* Income */}
        <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="absolute -right-3 -top-3 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-blue-50/80" />
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 text-blue-500 mb-3"><TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" /></div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">Income</p>
          {renderStackedValues(
            [formatCurrency(netWorthByCurrency[lensCurrency]?.income ?? 0, lensCurrency)],
            'text-lg sm:text-2xl text-slate-900', 'text-base text-slate-900'
          )}
        </motion.div>

        {/* Expenses */}
        <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="absolute -right-3 -top-3 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-rose-50/80" />
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-50 text-rose-500 mb-3"><CreditCard className="h-4 w-4 sm:h-5 sm:w-5" /></div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">Expenses</p>
          {renderStackedValues(
            [formatCurrency(netWorthByCurrency[lensCurrency]?.expenses ?? 0, lensCurrency)],
            'text-lg sm:text-2xl text-slate-900', 'text-base text-slate-900'
          )}
        </motion.div>

        {/* Net Worth */}
        <motion.div variants={fadeUp} className="col-span-2 sm:col-span-1 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 sm:p-6 text-white shadow-xl shadow-violet-200/30">
          <div className="absolute -right-4 -top-4 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/10" />
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 mb-3"><Target className="h-4 w-4 sm:h-5 sm:w-5" /></div>
          <p className="text-xs sm:text-sm text-violet-100 font-medium">Net Worth</p>
          {renderStackedValues(
            [formatCurrency(netWorthByCurrency[lensCurrency]?.total ?? 0, lensCurrency)],
            'text-2xl sm:text-3xl', 'text-xl', true
          )}
        </motion.div>
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Cash Flow — takes 3/5 on desktop */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="lg:col-span-3 rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Cash Flow</h3>
              <p className="text-xs sm:text-sm text-slate-400">Income vs expenses • {lensCurrency}</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500" />Income</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-500" />Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.2} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F43F5E" stopOpacity={0.15} /><stop offset="100%" stopColor="#F43F5E" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="m" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${chartSym}${v/1000}k`} width={48} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.92)', border: 'none', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.2)', fontSize: 12 }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#94a3b8' }} formatter={(v) => formatCurrency(Number(v), lensCurrency)} />
              <Area type="monotone" dataKey="inc" name="Income" stroke="#10B981" strokeWidth={2} fill="url(#ig)" dot={{ r: 3, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} />
              <Area type="monotone" dataKey="exp" name="Expenses" stroke="#F43F5E" strokeWidth={2} fill="url(#eg)" dot={{ r: 3, fill: '#F43F5E', strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Spending Pie — 2/5 on desktop */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-2 rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Spending</h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">By category • {lensCurrency}</p>
          <div className="flex items-center gap-4">
            <div className="w-[120px] sm:w-[140px] flex-shrink-0">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pie} cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(Number(v), lensCurrency)} contentStyle={{ background: 'rgba(15,23,42,0.92)', border: 'none', borderRadius: 10, fontSize: 12 }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
              {pie.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-6">No spending in {lensCurrency} yet.</p>
              ) : (
              pie.slice(0, 5).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs sm:text-sm gap-2">
                  <div className="flex items-center gap-1.5 min-w-0"><div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-slate-500 font-medium truncate">{d.name}</span></div>
                  <span className="font-bold text-slate-900 tabular-nums flex-shrink-0">{formatCurrency(d.value, lensCurrency)}</span>
                </div>
              ))
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Recent</h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{lensCurrency} only</p>
            </div>
            <button onClick={() => nav('/app/transactions')} className="text-[11px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors">View all</button>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            {recentInLens.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 font-medium">No activity in {lensCurrency}</p>
            ) : (
            recentInLens.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.04 }}
                className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-slate-50/80 p-2.5 sm:p-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className={cn('flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl flex-shrink-0', t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500')}>
                    {t.type === 'income' ? <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{t.merchant}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400">{formatShortDate(t.date)}</p>
                  </div>
                </div>
                <span className={cn('text-xs sm:text-sm font-bold tabular-nums flex-shrink-0 ml-2', t.type === 'income' ? 'text-emerald-600' : 'text-rose-500')}>
                  {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount, transactionCurrency(t, lensCurrency))}
                </span>
              </motion.div>
            ))
            )}
          </div>
        </motion.div>

        {/* Budget Health */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Budgets</h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{lensCurrency} only</p>
            </div>
            <button onClick={() => nav('/app/budgets')} className="text-[11px] sm:text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full transition-colors">Manage</button>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {budgetsInLens.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6 font-medium">No budgets in {lensCurrency}</p>
            ) : (
            budgetsInLens.slice(0, 5).map(b => {
              const pct = Math.min((b.spent / b.limit) * 100, 100);
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">{b.category}</span>
                    <span className="text-[11px] font-bold text-slate-400 tabular-nums">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 sm:h-2 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.5 }}
                      className={cn('h-full rounded-full', pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500')} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-slate-400 tabular-nums">{formatCurrency(b.spent, b.currency || lensCurrency)}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums">{formatCurrency(b.limit, b.currency || lensCurrency)}</span>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </motion.div>

        {/* Quick Insights */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="space-y-3 sm:space-y-4 md:col-span-2 lg:col-span-1">
          {/* On tablet (md) this spans 2 cols so show cards side-by-side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-5 text-white shadow-lg shadow-emerald-100/40 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/10" />
              <div className="flex items-center justify-between">
                <div><p className="text-[11px] sm:text-sm text-emerald-100">Savings Rate</p><p className="text-2xl sm:text-3xl font-black mt-0.5 tabular-nums">{sr.toFixed(1)}%</p></div>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20"><Target className="h-5 w-5 sm:h-6 sm:w-6" /></div>
              </div>
              <p className="text-[10px] sm:text-xs text-emerald-200 mt-2">{sr >= 20 ? '🎯 Above the recommended 20%' : sr > 0 ? `🎯 Target: 20%` : '🎯 Add income to track savings'}</p>
            </div>

            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 sm:p-5 text-white shadow-lg shadow-violet-100/40 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/10" />
              <div className="flex items-center justify-between">
                <div><p className="text-[11px] sm:text-sm text-violet-100">Returns</p><p className="text-2xl sm:text-3xl font-black mt-0.5 tabular-nums">{invPct >= 0 ? '+' : ''}{invPct.toFixed(1)}%</p></div>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20"><BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" /></div>
              </div>
              <p className="text-[10px] sm:text-xs text-violet-200 mt-2">📈 {formatCurrency(invGain, lensCurrency)} unrealized</p>
            </div>

            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 sm:p-5 text-white shadow-lg shadow-amber-100/40 relative overflow-hidden sm:col-span-2 md:col-span-2 lg:col-span-1">
              <div className="absolute -right-4 -bottom-4 h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 flex-shrink-0"><Sparkles className="h-4 w-4 sm:h-5 sm:w-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold">AI Tip</p>
                  <p className="text-[10px] sm:text-xs text-amber-100 mt-0.5 leading-relaxed truncate sm:whitespace-normal">
                    {sr >= 20 ? 'Great savings rate! Keep it above 20% for financial freedom' : sr > 0 ? `Try to bump your savings rate from ${sr.toFixed(0)}% to 20%` : 'Start tracking to unlock personalized insights'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
