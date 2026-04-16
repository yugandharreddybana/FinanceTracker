import React from 'react';
import { motion } from 'motion/react';
import { useFinance } from '../context/FinanceContext';
import { Activity, Shield, Wallet, PieChart, ArrowUp, Zap, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export const HealthScorePage: React.FC = () => {
  const { healthMetricsByCurrency } = useFinance();
  const metrics = healthMetricsByCurrency['USD'] || Object.values(healthMetricsByCurrency)[0] || {
    savingsRate: 0,
    debtRatio: 0,
    emergencyFund: 0,
    budgetAdherence: 0,
    overallScore: 0
  };

  const VITALS = [
    { label: 'Savings Rate', value: metrics.savingsRate, icon: Activity, color: '#7C6EFA', text: `${Math.round(metrics.savingsRate * 100)}% of income saved` },
    { label: 'Debt-to-Income', value: metrics.debtRatio, icon: Shield, color: '#22D3A5', text: `${Math.round(metrics.debtRatio * 100)}% ratio`, inverse: true },
    { label: 'Emergency Fund', value: metrics.emergencyFund, icon: Wallet, color: '#F59E0B', text: `${Math.round(metrics.emergencyFund * 6)} months covered` },
    { label: 'Budget Adherence', value: metrics.budgetAdherence, icon: PieChart, color: '#F43F5E', text: `${Math.round(metrics.budgetAdherence * 100)}% on budget` },
  ];

  const getScoreText = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Attention";
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Health Score</h1>
          <p className="text-white/40">Real-time analysis of your financial well-being</p>
        </div>
      </div>

      <div className="glass-card p-12 mb-12 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        
        <div className="relative w-64 h-64 mb-8">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              className="stroke-white/5 fill-none"
              strokeWidth="12"
            />
            <motion.circle
              cx="128"
              cy="128"
              r="120"
              className="fill-none"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              strokeDasharray={2 * Math.PI * 120}
              initial={{ strokeDashoffset: 2 * Math.PI * 120 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - metrics.overallScore / 100) }}
              transition={{ duration: 2, ease: "easeOut" }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#7C6EFA" />
                <stop offset="100%" stopColor="#22D3A5" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-8xl font-bold font-mono tracking-tighter"
            >
              {metrics.overallScore}
            </motion.span>
            <span className="text-xl font-bold text-accent uppercase tracking-widest">{getScoreText(metrics.overallScore)}</span>
          </div>
        </div>
        
        <p className="max-w-md text-white/60 leading-relaxed">
          {metrics.overallScore >= 75 
            ? "Your financial health is strong. Keep maintaining your savings rate to reach your long-term goals."
            : "There are opportunities to improve your financial health. Focus on reducing debt and building an emergency fund."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {VITALS.map((v) => {
          const Icon = v.icon;
          return (
            <div key={v.label} className="glass-card p-6 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">{v.label}</h4>
              
              <div className="relative w-24 h-24 mb-4">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="48" cy="48" r="40" className="stroke-white/5 fill-none" strokeWidth="6" />
                  <circle 
                    cx="48" cy="48" r="40" className="fill-none" 
                    stroke={v.color} strokeWidth="6" 
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - v.value)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-bold">
                  {Math.round(v.value * 100)}%
                </div>
              </div>
              
              <p className="text-xs font-medium text-white/60 mb-2">{v.text}</p>
              <div className="flex items-center gap-1 text-positive text-[10px] font-bold">
                <ArrowUp className="w-3 h-3" />
                <span>+2% vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Improvement Feed</h3>
        {[
          { icon: Target, title: "Pay $50 extra on credit card", impact: "+4 points", effort: "Easy", color: "accent" },
          { icon: Zap, title: "Consolidate high-interest loans", impact: "+12 points", effort: "Medium", color: "positive" },
        ].map((rec, i) => (
          <div key={i} className="glass-card p-4 flex items-center justify-between group hover:border-accent/30 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", `bg-${rec.color}/10 text-${rec.color}`)}>
                <rec.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">{rec.title}</h4>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{rec.impact}</span>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{rec.effort} Effort</span>
                </div>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg bg-white/5 text-xs font-bold hover:bg-accent transition-all">Action</button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
