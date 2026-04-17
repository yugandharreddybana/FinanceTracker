import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinance } from '../context/FinanceContext';

interface AIInsightCardProps {
  setActiveTab: (tab: string) => void;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ setActiveTab }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { budgets, healthMetricsByCurrency } = useFinance();
  const healthMetrics = healthMetricsByCurrency['INR'] || Object.values(healthMetricsByCurrency)[0] || { savingsRate: 0, budgetAdherence: 0 };

  if (isDismissed) return null;

  const getInsight = () => {
    const highBudget = budgets.find(b => (b.spent / b.limit) > 0.8);
    if (highBudget) {
      return {
        text: `You'll exceed your ${highBudget.category} budget soon at your current pace. Consider reducing spending in this category for the next few days.`,
        category: highBudget.category
      };
    }
    if (healthMetrics.savingsRate < 0.1) {
      return {
        text: "Your savings rate is lower than usual this month. Try to identify non-essential subscriptions you can pause.",
        category: "Savings"
      };
    }
    return {
      text: "You're doing great! You've stayed within all your budget limits so far this week. Keep it up!",
      category: "Overall"
    };
  };

  const insight = getInsight();

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card p-8 bg-gradient-to-br from-card to-accent/[0.03] flex flex-col h-full group relative overflow-hidden border-white/5 hover:border-accent/30 transition-all"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(124,110,250,0.15)] border border-accent/20 group-hover:scale-110 transition-transform duration-500">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight">Intelligence</h3>
            <p className="text-[10px] text-accent font-bold uppercase tracking-widest">Neural Analysis</p>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-white/60 leading-relaxed mb-8 font-medium">
            {insight.text.split(insight.category).map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="text-white font-bold underline decoration-accent/40 underline-offset-4">
                    {insight.category}
                  </span>
                )}
              </React.Fragment>
            ))}
          </p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => setActiveTab('budgets')}
            className="w-full py-4 px-6 rounded-2xl bg-accent text-white flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest hover:bg-accent/80 transition-all shadow-lg violet-glow group/btn"
          >
            <span>Optimize Budget</span>
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => setIsDismissed(true)}
            className="w-full py-4 px-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/10 transition-all"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};


