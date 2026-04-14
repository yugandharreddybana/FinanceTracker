import React from 'react';
import { motion } from 'motion/react';
import { MOCK_INCOME } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, ArrowUpRight, Calendar, DollarSign, Briefcase } from 'lucide-react';

export const IncomeAnalyticsPage: React.FC = () => {
  const totalIncome = MOCK_INCOME.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Income Analytics</h1>
          <p className="text-white/40">Detailed breakdown and forecasting of your earnings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold">Income History</h3>
            <div className="flex gap-2">
              {['6M', '1Y', 'All'].map(t => (
                <button key={t} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest">
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_INCOME}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="source" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Geist Mono' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Geist Mono' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#13131A', border: '1px solid rgba(124,110,250,0.2)', borderRadius: '12px' }}
                  itemStyle={{ color: '#F0F0FF', fontFamily: 'Geist Mono' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {MOCK_INCOME.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 bg-accent/5 border-accent/20">
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">Total Monthly Income</p>
            <h4 className="text-4xl font-bold font-mono tracking-tighter mb-4">${totalIncome.toLocaleString()}</h4>
            <div className="flex items-center gap-1 text-positive text-xs font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>+15% vs last year</span>
            </div>
          </div>

          <div className="glass-card p-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">Income Sources</h4>
            <div className="space-y-6">
              {MOCK_INCOME.map(source => (
                <div key={source.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: source.color }} />
                    <div>
                      <p className="text-sm font-bold">{source.source}</p>
                      <p className="text-[10px] text-white/30 uppercase font-mono">{source.frequency}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold">${source.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Tax Estimate</p>
            <h4 className="text-xl font-bold font-mono text-negative">$1,240</h4>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-positive">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Take-home Pay</p>
            <h4 className="text-xl font-bold font-mono text-positive">$4,230</h4>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-amber-500">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Next Payday</p>
            <h4 className="text-xl font-bold font-mono">March 25</h4>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
