import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';

interface RecentTransactionsProps {
  setActiveTab: (tab: string) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ setActiveTab }) => {
  const { transactions } = useFinance();
  
  return (
    <div className="glass-card p-8 flex flex-col h-full group">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Recent Transactions</h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Latest activity</p>
        </div>
        <button 
          onClick={() => setActiveTab('transactions')}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-accent hover:bg-accent/10 transition-all"
        >
          View All
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {transactions.slice(0, 10).map((tx, i) => (
            <motion.div
              key={tx.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                delay: i * 0.03 
              }}
              className="group/item flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all cursor-pointer relative overflow-hidden"
            >
            <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/[0.02] to-accent/0 translate-x-[-100%] group-hover/item:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0 border border-white/5 group-hover/item:border-accent/30 transition-all group-hover/item:scale-105">
              <span className="font-display font-bold text-white/60 group-hover/item:text-accent transition-colors">
                {tx.merchant.charAt(0)}
              </span>
            </div>
            
            <div className="flex-1 min-w-0 relative z-10">
              <p className="font-bold text-sm truncate group-hover/item:text-accent transition-colors">{tx.merchant}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-white/20 font-mono uppercase">{tx.date}</span>
                {tx.aiTag && (
                  <span className="px-1.5 py-0.5 rounded-md bg-accent/5 border border-accent/10 text-accent text-[8px] font-bold uppercase tracking-widest">
                    {tx.aiTag}
                  </span>
                )}
              </div>
            </div>

            <div className={cn(
              "font-mono font-bold text-sm text-right relative z-10",
              tx.amount > 0 ? "text-positive" : "text-white"
            )}>
              <div className="flex flex-col items-end">
                <span>{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { style: 'currency', currency: tx.currency || 'INR' })}</span>
                <span className="text-[8px] text-white/20 uppercase font-bold tracking-tighter">Confirmed</span>
              </div>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
