import React from 'react';
import { motion } from 'motion/react';
import { useFinance } from '../context/FinanceContext';

export const SavingsGoals: React.FC = () => {
  const { savingsGoals } = useFinance();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {savingsGoals.slice(0, 3).map((goal, i) => {
        const progress = (goal.current / goal.target) * 100;
        const radius = 34;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progress / 100) * circumference;

        return (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className="glass-card p-6 flex items-center gap-6 group hover:border-accent/30 transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(124,110,250,0.2)]">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-white/5 fill-none"
                  strokeWidth="5"
                />
                <motion.circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-accent fill-none"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                {goal.emoji}
              </div>
            </div>

            <div className="flex-1 min-w-0 relative z-10">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-base tracking-tight truncate group-hover:text-accent transition-colors">{goal.name}</h4>
                <span className="text-[10px] font-bold font-mono text-white/20 uppercase tracking-widest">{Math.round(progress)}%</span>
              </div>
              <p className="text-xs text-white/40 font-mono font-medium mb-3">
                <span className="text-white font-bold">${goal.current.toLocaleString()}</span>
                <span className="mx-1">/</span>
                <span>${goal.target.toLocaleString()}</span>
              </p>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, progress)}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-accent rounded-full violet-glow shadow-[0_0_10px_rgba(124,110,250,0.4)]"
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
