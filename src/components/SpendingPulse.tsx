import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'motion/react';
import { useFinance } from '../context/FinanceContext';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border-accent/20 bg-card/90 backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{payload[0].name}</p>
        <p className="text-sm font-bold font-mono text-white">${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export const SpendingPulse: React.FC = () => {
  const { spendingData } = useFinance();

  return (
    <div className="glass-card p-8 flex flex-col h-full group">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Spending Pulse</h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Real-time Analysis</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        </div>
      </div>

      <div className="flex-1 relative min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={spendingData}
              innerRadius={85}
              outerRadius={105}
              paddingAngle={10}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {spendingData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  className="hover:opacity-80 transition-opacity cursor-pointer outline-none" 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl font-bold font-display tracking-tighter"
          >
            {spendingData.length}
          </motion.span>
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">Categories</span>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {spendingData.slice(0, 5).map((item) => (
          <div key={item.name} className="flex items-center justify-between group/item cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
              <span className="text-xs font-medium text-white/60 group-hover/item:text-white transition-colors">{item.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono font-bold">${item.value.toLocaleString()}</span>
              <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/20" 
                  style={{ width: `${Math.min((item.value / 2000) * 100, 100)}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
