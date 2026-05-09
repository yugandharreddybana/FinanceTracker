import React, { useState } from 'react';
import { Activity, Shield, Wallet, PieChart, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useFinance } from '../context/FinanceContext';

export const HealthScoreVitals: React.FC = () => {
  const { healthMetricsByCurrency } = useFinance();
  const currencies = Object.keys(healthMetricsByCurrency);
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] || 'INR');
  
  const healthMetrics = healthMetricsByCurrency[selectedCurrency] || {
    savingsRate: 0,
    debtRatio: 0,
    emergencyFund: 0,
    budgetAdherence: 0,
    overallScore: 0
  };

  const metrics = [
    { label: 'Savings Rate', value: healthMetrics.savingsRate, icon: Activity, color: '#7C6EFA' },
    { label: 'Debt Ratio', value: healthMetrics.debtRatio, icon: Shield, color: '#22D3A5', inverse: true },
    { label: 'Emergency Fund', value: healthMetrics.emergencyFund, icon: Wallet, color: '#FFB800' },
    { label: 'Budget Adherence', value: healthMetrics.budgetAdherence, icon: PieChart, color: '#FF4E00' },
  ];

  const getStatus = (score: number) => {
    if (score >= 80) return { label: 'EXCELLENT', color: 'text-positive bg-positive/10 border-positive/20' };
    if (score >= 60) return { label: 'GOOD', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { label: 'CONCERNING', color: 'text-negative bg-negative/10 border-negative/20' };
  };

  const status = getStatus(healthMetrics.overallScore);

  return (
    <div className="glass-card p-8 flex flex-col h-full group">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight">Health Vitals</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Real-time analysis</p>
          </div>
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
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest border ${status.color}`}>
          <Activity className="w-3 h-3" />
          {status.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-10 flex-1">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          const displayValue = Math.round(metric.value * 100);
          
          return (
            <motion.div 
              key={metric.label} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="space-y-4 group/metric"
            >
              <div className="flex items-center gap-2 text-white/40 group-hover/metric:text-white/60 transition-colors">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold">{metric.label}</span>
              </div>
              
              <div className="relative w-20 h-20 mx-auto">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="stroke-white/5 fill-none"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="fill-none"
                    stroke={metric.color}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 34}
                    initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - (metric.inverse ? 1 - metric.value : metric.value)) }}
                    transition={{ duration: 2, ease: "easeOut", delay: 0.5 + i * 0.1 }}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 8px ${metric.color}40)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono font-bold text-lg tracking-tighter">{displayValue}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
