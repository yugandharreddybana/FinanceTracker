import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tags, Plus, ChevronRight, X, BarChart3, PieChart, Sparkles } from 'lucide-react';
import { MOCK_SPENDING } from '../constants';
import { cn } from '../lib/utils';

export const CategoriesPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto relative"
    >
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Categories</h1>
          <p className="text-white/40">Manage your spending taxonomy and rules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {MOCK_SPENDING.map((cat) => (
          <motion.div
            key={cat.name}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedCategory(cat.name)}
            className="glass-card p-6 cursor-pointer group relative overflow-hidden"
            style={{ borderColor: `${cat.color}30` }}
          >
            <div className="flex justify-between items-start mb-8">
              <div className="text-3xl">
                {cat.name === 'Housing' ? '🏠' : cat.name === 'Food' ? '🍱' : cat.name === 'Transport' ? '🚗' : cat.name === 'Entertainment' ? '🎬' : '📦'}
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="24" cy="24" r="20" className="stroke-white/5 fill-none" strokeWidth="3" />
                  <circle 
                    cx="24" cy="24" r="20" className="fill-none" 
                    stroke={cat.color} strokeWidth="3" 
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 * (1 - cat.value / 3000)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/40">
                  {Math.round((cat.value / 3000) * 100)}%
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-bold mb-1">{cat.name}</h3>
            <p className="text-2xl font-bold font-mono tracking-tighter">${cat.value.toLocaleString()}</p>
            
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5 text-white/40" />
            </div>
          </motion.div>
        ))}

        <div className="glass-card p-6 border-dashed border-white/10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent/50 transition-all group min-h-[180px]">
          <Plus className="w-8 h-8 text-white/20 group-hover:text-accent mb-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">New Category</span>
        </div>
      </div>

      <AnimatePresence>
        {selectedCategory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCategory(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-full max-w-xl bg-card border-l border-white/10 z-[60] p-10 shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">
                    {selectedCategory === 'Housing' ? '🏠' : selectedCategory === 'Food' ? '🍱' : selectedCategory === 'Transport' ? '🚗' : selectedCategory === 'Entertainment' ? '🎬' : '📦'}
                  </div>
                  <h2 className="text-3xl font-bold">{selectedCategory}</h2>
                </div>
                <button onClick={() => setSelectedCategory(null)} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                  <X className="w-6 h-6 text-white/40" />
                </button>
              </div>

              <div className="space-y-10">
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Monthly Trend
                  </h3>
                  <div className="h-40 w-full flex items-end gap-2">
                    {[40, 60, 45, 80, 55, 70].map((h, i) => (
                      <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          className="absolute bottom-0 left-0 w-full bg-accent/40 rounded-t-lg group-hover:bg-accent transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] font-mono text-white/20 uppercase">
                    <span>Oct</span>
                    <span>Nov</span>
                    <span>Dec</span>
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Insight
                  </h3>
                  <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <p className="text-sm text-white/80 leading-relaxed">
                      {selectedCategory} is <span className="text-negative font-bold">23% over</span> your 3-month average. Most of this increase comes from weekend spending.
                    </p>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
                    <PieChart className="w-4 h-4" />
                    Sub-category Breakdown
                  </h3>
                  <div className="space-y-4">
                    {[
                      { name: 'Groceries', value: 320, color: '#7C6EFA' },
                      { name: 'Dining Out', value: 180, color: '#22D3A5' },
                      { name: 'Coffee', value: 50, color: '#F59E0B' },
                    ].map(sub => (
                      <div key={sub.name} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                          <span className="text-sm font-medium">{sub.name}</span>
                        </div>
                        <span className="font-mono font-bold">${sub.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
