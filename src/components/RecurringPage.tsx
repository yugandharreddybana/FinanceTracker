import React from 'react';
import { motion } from 'motion/react';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../lib/utils';
import { Calendar, AlertTriangle, Pause, Play, Trash2 } from 'lucide-react';

export const RecurringPage: React.FC = () => {
  const { recurringPayments } = useFinance();

  const totalMonthly = recurringPayments
    .filter(p => p.status === 'Active')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Recurring</h1>
          <p className="text-white/40">Monitor your subscriptions and automated payments</p>
        </div>
      </div>

      <div className="glass-card p-6 mb-12">
        <div className="flex gap-6 mb-8 overflow-x-auto pb-2">
          <div className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-xs font-bold text-accent uppercase tracking-widest">
            ${totalMonthly.toLocaleString()}/month in subscriptions
          </div>
          <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-500 uppercase tracking-widest">
            Next 7 days: 3 payments due ($94)
          </div>
        </div>

        <div className="relative h-24 w-full bg-white/2 rounded-2xl border border-white/5 flex items-center px-4 overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-31 gap-0 pointer-events-none">
            {Array.from({ length: 31 }).map((_, i) => (
              <div key={i} className="border-r border-white/5 h-full" />
            ))}
          </div>
          
          {recurringPayments.map((item) => (
            <div 
              key={item.id}
              style={{ left: `${(item.date / 31) * 100}%` }}
              className="absolute group cursor-pointer"
            >
              <div className="w-3 h-3 rounded-full bg-accent violet-glow group-hover:scale-150 transition-transform" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap glass-card p-2 text-[10px] font-bold z-10">
                {item.name} - ${item.amount}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 px-1 text-[10px] font-mono text-white/20 uppercase">
          <span>Day 1</span>
          <span>Day 15</span>
          <span>Day 31</span>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Active Subscriptions</h3>
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-white/5">
              {recurringPayments.map((item) => (
                <div key={item.id} className="group flex items-center gap-6 p-4 hover:bg-white/2 transition-all">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg border border-white/5">
                    {item.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold">{item.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30">{item.frequency}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-xs text-white/30">Next: March {item.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="font-bold font-mono">${item.amount}</p>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        item.status === 'Active' ? "text-positive" : "text-white/20"
                      )}>
                        {item.status}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        {item.status === 'Active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-negative/20 hover:text-negative transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold">Detected Recurring</h3>
          </div>
          <p className="text-xs text-white/60 mb-6">Arta AI found potential subscriptions not yet tracked.</p>
          
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg">H</div>
              <div>
                <h4 className="font-bold text-sm">HBO Max</h4>
                <p className="text-xs text-white/30">Detected 3 times in 3 months</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-[10px] font-bold uppercase tracking-widest">Add</button>
              <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest">Ignore</button>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
};
