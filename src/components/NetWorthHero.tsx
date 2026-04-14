import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../lib/utils';

export const NetWorthHero: React.FC = () => {
  const { netWorthByCurrency } = useFinance();
  const currencies = Object.keys(netWorthByCurrency);
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] || 'USD');
  
  const netWorth = netWorthByCurrency[selectedCurrency] || { total: 0, assets: 0, liabilities: 0, change: 0 };
  
  const formattedTotal = Math.floor(netWorth.total).toLocaleString('en-US', { style: 'currency', currency: selectedCurrency }).split('.')[0];
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
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-bold text-white pr-8 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {currencies.map(c => (
                    <option key={c} value={c} className="bg-background text-white">{c}</option>
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
            Assets: <span className="text-white">{netWorth.assets.toLocaleString('en-US', { style: 'currency', currency: selectedCurrency })}</span> • 
            Liabilities: <span className="text-negative">{netWorth.liabilities.toLocaleString('en-US', { style: 'currency', currency: selectedCurrency })}</span>
          </p>
        </div>

        <div className="w-full lg:w-1/3 space-y-6">
          <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
            <span>Progress to $250k Goal</span>
            <span className="text-white">{Math.round((netWorth.total / 250000) * 100)}%</span>
          </div>
          <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/10 p-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (netWorth.total / 250000) * 100)}%` }}
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
