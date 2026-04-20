import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../lib/utils';

export const NetWorthHero: React.FC = () => {
  const { netWorthByCurrency, savingsGoals, userProfile } = useFinance();
  const currencies = Object.keys(netWorthByCurrency);
  const defaultCurrency = currencies.length > 0 ? currencies[0] : (userProfile.preferences.currency || 'INR');
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);

  // Auto-update when accounts finish loading and currencies change
  useEffect(() => {
    if (currencies.length > 0 && !currencies.includes(selectedCurrency)) {
      setSelectedCurrency(currencies[0]);
    }
  }, [currencies.join(',')]);
  
  const netWorth = netWorthByCurrency[selectedCurrency] || { total: 0, assets: 0, liabilities: 0, change: 0 };
  
  // Use the largest savings goal as the net worth target, or fallback to a reasonable multiple
  const topGoal = savingsGoals.length > 0 
    ? savingsGoals.reduce((max, g) => g.target > max.target ? g : max, savingsGoals[0])
    : null;
  const goalAmount = topGoal ? topGoal.target : (netWorth.total > 0 ? Math.ceil(netWorth.total * 2 / 100000) * 100000 : 1000000);
  const goalLabel = topGoal ? topGoal.name : `${(goalAmount).toLocaleString(undefined, { style: 'currency', currency: selectedCurrency, maximumFractionDigits: 0 })} Goal`;
  const goalProgress = goalAmount > 0 ? Math.min(100, (netWorth.total / goalAmount) * 100) : 0;
  
  const formattedTotal = Math.floor(netWorth.total).toLocaleString(undefined, { style: 'currency', currency: selectedCurrency }).split('.')[0];
  const decimal = (netWorth.total % 1).toFixed(2).substring(1);

  return (
    <div className="glass-card p-10 relative overflow-hidden group border-accent/20">
      {/* Premium Mesh Gradient Background */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] bg-accent/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[70%] bg-positive/10 blur-[100px] rounded-full" />
      </div>

      {/* Particle Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              y: [-20, -120],
              x: Math.random() * 1200
            }}
            transition={{ 
              duration: 4 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
            className="absolute bottom-0 w-[1px] h-[1px] bg-white rounded-full"
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
        <div className="space-y-4 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <p className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase">Total Net Worth</p>
            {currencies.length > 1 && (
              <div className="relative">
                <select
                  title="Currency"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-bold text-white pr-8 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {currencies.map(c => (
                    <option key={c} value={c} className="bg-[#050508] text-white">{c}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
              </div>
            )}
          </div>
          <div className="flex flex-col lg:flex-row lg:items-baseline gap-4">
            <h2 className="text-6xl md:text-8xl font-bold font-display tracking-tighter">
              {formattedTotal}<span className="text-white/20 text-4xl ml-1">{decimal}</span>
            </h2>
            <div className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold w-fit mx-auto lg:mx-0 border",
              netWorth.change >= 0 ? "text-positive bg-positive/10 border-positive/20" : "text-negative bg-negative/10 border-negative/20"
            )}>
              {netWorth.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{netWorth.change >= 0 ? '+' : ''}{netWorth.change}%</span>
            </div>
          </div>
          <p className="text-white/30 text-sm font-medium">
            Assets: <span className="text-white">{netWorth.assets.toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</span> • 
            Liabilities: <span className="text-negative">{netWorth.liabilities.toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</span>
          </p>
        </div>

        <div className="w-full lg:w-1/3 space-y-6">
          <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
            <span>Progress to {goalLabel}</span>
            <span className="text-white">{Math.round(goalProgress)}%</span>
          </div>
          <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/10 p-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goalProgress}%` }}
              transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-gradient-to-r from-accent via-accent/80 to-accent rounded-full relative violet-glow"
            >
              {/* Liquid Wave Effect */}
              <motion.div
                animate={{ x: [-100, 100] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[30deg]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:20px_20px]" />
            </motion.div>
          </div>
          <div className="flex justify-between items-center px-1">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-card bg-white/10" />
              ))}
              <div className="w-6 h-6 rounded-full border-2 border-card bg-accent/20 flex items-center justify-center text-[8px] font-bold">+12</div>
            </div>
            <span className="text-[10px] text-white/40 font-medium italic">You're outpacing your peers</span>
          </div>
        </div>
      </div>
    </div>
  );
};
