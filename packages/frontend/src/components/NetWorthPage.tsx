import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Plus, ChevronDown } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface NetWorthPageProps {
  onNavigate?: (tab: string) => void;
}

export const NetWorthPage: React.FC<NetWorthPageProps> = ({ onNavigate }) => {
  const { netWorthByCurrency, accounts, loans, investments, userProfile } = useFinance();
  const currencies = Object.keys(netWorthByCurrency);
  const [selectedCurrency, setSelectedCurrency] = useState(userProfile.preferences.currency || 'INR');

  useEffect(() => {
    if (currencies.length > 0 && !currencies.includes(selectedCurrency)) {
      setSelectedCurrency(currencies[0]);
    }
  }, [currencies, selectedCurrency]);
  const [trendPeriod, setTrendPeriod] = useState('1M');
  
  const netWorth = netWorthByCurrency[selectedCurrency] || { total: 0, assets: 0, liabilities: 0, change: 0 };
  
  const forecastData = React.useMemo(() => {
    const periodDays: Record<string, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'All': 730 };
    const days = periodDays[trendPeriod] || 30;
    const data = [];
    const dailyChange = (netWorth.total * (netWorth.change / 100)) / 30;
    for (let i = 0; i < days; i++) {
      data.push({ day: i, balance: netWorth.total + (dailyChange * i) });
    }
    return data;
  }, [netWorth, trendPeriod]);

  const assetBreakdown = accounts
    .filter(a => a.type !== 'Credit' && (a.currency || 'INR') === selectedCurrency)
    .map(a => ({ name: a.name, value: a.balance, color: a.color }));

  const liabilityBreakdown = [
    ...accounts.filter(a => a.type === 'Credit' && (a.currency || 'INR') === selectedCurrency).map(a => ({ name: a.name, value: Math.abs(a.balance), color: a.color })),
    ...loans.filter(l => (l.currency || 'INR') === selectedCurrency).map(l => ({ name: l.name, value: l.remainingAmount, color: l.color }))
  ];

  const formattedTotal = Math.floor(netWorth.total).toLocaleString(undefined, { style: 'currency', currency: selectedCurrency }).split('.')[0];
  const decimal = (netWorth.total % 1).toFixed(2).substring(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Net Worth</h1>
          <p className="text-white/40">Comprehensive visualization of your total wealth</p>
        </div>
        {currencies.length > 1 && (
          <div className="relative">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              aria-label="Select currency"
              className="appearance-none bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm font-bold text-white pr-10 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {currencies.map(c => (
                <option key={c} value={c} className="bg-[#050508] text-white">{c}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
          </div>
        )}
      </div>

      <div className="glass-card p-10 mb-12 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 relative z-10">
          <div className="space-y-4">
            <p className="text-white/50 text-sm font-medium tracking-wider uppercase">Total Net Worth</p>
            <motion.h2 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-7xl font-bold font-mono tracking-tighter"
            >
              {formattedTotal}<span className="text-white/20 text-4xl">{decimal}</span>
            </motion.h2>
            <div className="flex items-center gap-2 text-positive bg-positive/10 px-3 py-1 rounded-full w-fit text-sm font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>+{netWorth.change}% this month</span>
            </div>
          </div>

          <div className="flex-1 w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C6EFA" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7C6EFA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#7C6EFA" 
                  strokeWidth={4} 
                  fill="url(#netWorthGradient)" 
                  animationDuration={1500}
                  animationBegin={200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="flex gap-2 mt-8">
          {['1M', '3M', '6M', '1Y', 'All'].map(t => (
            <button
              key={t}
              onClick={() => setTrendPeriod(t)}
              className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${
                trendPeriod === t
                  ? 'bg-accent/20 border-accent/50 text-accent'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="glass-card p-8">
          <h3 className="text-lg font-bold mb-8">Assets Breakdown</h3>
          <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden mb-8">
            <svg className="w-full h-full" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
              {assetBreakdown.map((a, i) => {
                const x = assetBreakdown.slice(0, i).reduce((sum, b) => sum + (b.value / (netWorth.assets || 1)) * 100, 0);
                const w = (a.value / (netWorth.assets || 1)) * 100;
                return <rect key={a.name} x={x} y="0" width={w} height="4" fill={a.color} />;
              })}
            </svg>
          </div>
          <div className="space-y-4">
            {assetBreakdown.map(a => (
              <div key={a.name} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0"><circle cx="6" cy="6" r="6" fill={a.color} /></svg>
                  <span className="text-sm font-medium">{a.name}</span>
                </div>
                <span className="font-mono font-bold">{a.value.toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8">
          <h3 className="text-lg font-bold mb-8">Liabilities Breakdown</h3>
          <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden mb-8">
            <svg className="w-full h-full" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
              {liabilityBreakdown.map((l, i) => {
                const x = liabilityBreakdown.slice(0, i).reduce((sum, b) => sum + (b.value / (netWorth.liabilities || 1)) * 100, 0);
                const w = (l.value / (netWorth.liabilities || 1)) * 100;
                return <rect key={l.name} x={x} y="0" width={w} height="4" fill={l.color} />;
              })}
            </svg>
          </div>
          <div className="space-y-4">
            {liabilityBreakdown.map(l => (
              <div key={l.name} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0"><circle cx="6" cy="6" r="6" fill={l.color} /></svg>
                  <span className="text-sm font-medium">{l.name}</span>
                </div>
                <span className="font-mono font-bold">{l.value.toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">Total Assets</p>
          <h4 className="text-xl font-bold font-mono mb-4">{netWorth.assets.toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</h4>
          <div className="flex items-center gap-1 text-positive text-[10px] font-bold">
            <ArrowUpRight className="w-3 h-3" />
            <span>{accounts.filter(a => a.type !== 'Credit' && (a.currency || 'INR') === selectedCurrency).length} accounts</span>
          </div>
        </div>
        <div className="glass-card p-6">
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">Investments</p>
          <h4 className="text-xl font-bold font-mono mb-4">{investments
            .filter(inv => (inv.currency || 'INR') === selectedCurrency)
            .reduce((sum, inv) => sum + (inv.currentPrice * inv.quantity), 0)
            .toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</h4>
          <div className="flex items-center gap-1 text-positive text-[10px] font-bold">
            <ArrowUpRight className="w-3 h-3" />
            <span>{investments.filter(inv => (inv.currency || 'INR') === selectedCurrency).length} holdings</span>
          </div>
        </div>
        <div onClick={() => onNavigate?.('accounts')} className="glass-card p-6 border-dashed border-white/10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent/50 transition-all group">
          <Plus className="w-6 h-6 text-white/20 group-hover:text-accent mb-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Add Asset</span>
        </div>
        <div onClick={() => onNavigate?.('loans')} className="glass-card p-6 border-dashed border-white/10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent/50 transition-all group">
          <Plus className="w-6 h-6 text-white/20 group-hover:text-accent mb-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Add Liability</span>
        </div>
      </div>
    </motion.div>
  );
};
