import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinance } from '../context/FinanceContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, ArrowUpRight, Calendar, DollarSign, Briefcase, ChevronDown, Pencil, Trash2, Plus, X, Palette } from 'lucide-react';
import { cn } from '../lib/utils';
import { IncomeSource } from '../types';
import { MOCK_INCOME_TRENDS } from '../constants';
import DeleteModal from './DeleteModal';

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border-accent/20 bg-card/90 backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{payload[0].payload.source || payload[0].payload.month}</p>
        <p className="text-sm font-bold font-mono text-white">{payload[0].value.toLocaleString(undefined, { style: 'currency', currency: currency || 'INR' })}</p>
      </div>
    );
  }
  return null;
};

export const IncomeAnalyticsPage: React.FC = () => {
  const { incomeSources, updateIncomeSource, deleteIncomeSource, addIncomeSource } = useFinance();
  const currencies = Array.from(new Set(incomeSources.map(i => i.currency || 'INR')));
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] || 'INR');
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newIncome, setNewIncome] = useState<Partial<IncomeSource>>({
    source: '',
    amount: 0,
    frequency: 'Monthly',
    color: '#7C6EFA',
    currency: 'INR',
    date: new Date().toISOString().split('T')[0]
  });

  const filteredIncome = incomeSources.filter(i => (i.currency || 'INR') === selectedCurrency);
  const totalIncome = filteredIncome.reduce((acc, curr) => acc + curr.amount, 0);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIncome) {
      updateIncomeSource(editingIncome.id, editingIncome);
      setEditingIncome(null);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIncome.source && newIncome.amount) {
      addIncomeSource({
        ...newIncome as IncomeSource,
        id: `inc-${Date.now()}`
      });
      setIsAdding(false);
      setNewIncome({
        source: '',
        amount: 0,
        frequency: 'Monthly',
        color: '#7C6EFA',
        currency: 'INR',
        date: new Date().toISOString().split('T')[0]
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Income Analytics</h1>
          <p className="text-white/40">Detailed breakdown and forecasting of your earnings</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Income</span>
          </button>
          {currencies.length > 1 && (
            <div className="relative">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                aria-label="Select currency"
                className="appearance-none bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm font-bold text-white pr-10 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {currencies.map(c => (
                  <option key={c} value={c} className="bg-[#050508] text-white">{c}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold">Income Distribution</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-[10px] font-bold text-white/40 uppercase">Current Sources</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredIncome}>
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
                  <Tooltip content={<CustomTooltip currency={selectedCurrency} />} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {filteredIncome.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold">Income Trend</h3>
              <div className="flex gap-2">
                {['6M', '1Y', 'All'].map(t => (
                  <button key={t} onClick={() => alert(`Showing income trend for: ${t}`)} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_INCOME_TRENDS}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Geist Mono' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Geist Mono' }} 
                  />
                  <Tooltip content={<CustomTooltip currency={selectedCurrency} />} />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="var(--color-accent)" 
                    fillOpacity={1} 
                    fill="url(#incomeGradient)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 bg-accent/5 border-accent/20">
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">Total Monthly Income</p>
            <h4 className="text-4xl font-bold font-mono tracking-tighter mb-4">{totalIncome.toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</h4>
            <div className="flex items-center gap-1 text-positive text-xs font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>+15% vs last year</span>
            </div>
          </div>

          <div className="glass-card p-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">Income Sources</h4>
            <div className="space-y-4">
              {filteredIncome.map(source => (
                <div key={source.id} className="group flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="shrink-0"><circle cx="4" cy="4" r="4" fill={source.color} /></svg>
                    <div>
                      <p className="text-sm font-bold">{source.source}</p>
                      <p className="text-[10px] text-white/30 uppercase font-mono">{source.frequency}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-sm">{source.amount.toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        aria-label="Edit income source"
                        onClick={() => setEditingIncome(source)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        aria-label="Delete income source"
                        onClick={() => setDeleteConfirmId(source.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-negative/20 hover:text-negative text-white/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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
            <h4 className="text-xl font-bold font-mono text-negative">{(totalIncome * 0.2).toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</h4>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-positive">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Take-home Pay</p>
            <h4 className="text-xl font-bold font-mono text-positive">{(totalIncome * 0.8).toLocaleString(undefined, { style: 'currency', currency: selectedCurrency })}</h4>
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

      {/* Add Modal */}
      <DeleteModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => { if (deleteConfirmId) deleteIncomeSource(deleteConfirmId); }}
        title="Remove Income Source?"
        description="Are you sure you want to remove this income source? It will no longer appear in your analytics and forecasts. Past entries will be preserved as untracked."
      />

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-card p-8 border-accent/30 bg-card/90 shadow-[0_32px_128px_rgba(0,0,0,0.8)]"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent border border-accent/30">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">New Income Source</h3>
                    <p className="text-xs text-white/40 uppercase font-bold tracking-widest mt-1">Add a recurring earnings stream</p>
                  </div>
                </div>
                <button 
                  aria-label="Close"
                  onClick={() => setIsAdding(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Source Name *</label>
                  <input 
                    type="text"
                    required
                    value={newIncome.source}
                    onChange={(e) => setNewIncome({ ...newIncome, source: e.target.value })}
                    placeholder="e.g. Freelance Work"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Amount ({selectedCurrency}) *</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={newIncome.amount || ''}
                      onChange={(e) => setNewIncome({ ...newIncome, amount: Number(e.target.value) })}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-xl font-bold font-mono outline-none focus:border-accent/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Frequency *</label>
                    <select 
                      value={newIncome.frequency}
                      required
                      onChange={(e) => setNewIncome({ ...newIncome, frequency: e.target.value })}
                      aria-label="Frequency"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-bold text-sm appearance-none"
                    >
                      <option value="Monthly" className="bg-[#050508]">Monthly</option>
                      <option value="Bi-Weekly" className="bg-[#050508]">Bi-Weekly</option>
                      <option value="Weekly" className="bg-[#050508]">Weekly</option>
                      <option value="Variable" className="bg-[#050508]">Variable</option>
                      <option value="Quarterly" className="bg-[#050508]">Quarterly</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Brand Color</label>
                  <div className="flex gap-3">
                    {['#7C6EFA', '#22D3A5', '#F43F5E', '#F59E0B', '#EC4899', '#06B6D4'].map(color => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Color ${color}`}
                        onClick={() => setNewIncome({ ...newIncome, color })}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all overflow-hidden",
                          newIncome.color === color ? "border-white scale-110" : "border-transparent"
                        )}
                      >
                        <svg viewBox="0 0 10 10" className="w-full h-full" aria-hidden="true">
                          <circle cx="5" cy="5" r="5" fill={color} />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 rounded-xl bg-accent text-white font-bold uppercase tracking-widest hover:bg-accent/80 transition-all shadow-lg violet-glow"
                  >
                    Add Source
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingIncome && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingIncome(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-card p-8 border-accent/30 bg-card/90 shadow-[0_32px_128px_rgba(0,0,0,0.8)]"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent border border-accent/30">
                    <Pencil className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Edit Income</h3>
                    <p className="text-xs text-white/40 uppercase font-bold tracking-widest mt-1">{editingIncome.source}</p>
                  </div>
                </div>
                <button 
                  aria-label="Close"
                  onClick={() => setEditingIncome(null)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Source Name *</label>
                  <input 
                    type="text"
                    required
                    title="Source name"
                    value={editingIncome.source}
                    onChange={(e) => setEditingIncome({ ...editingIncome, source: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Amount ({selectedCurrency})</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      title="Amount"
                      placeholder="0.00"
                      value={editingIncome.amount}
                      onChange={(e) => setEditingIncome({ ...editingIncome, amount: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-xl font-bold font-mono outline-none focus:border-accent/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Frequency</label>
                    <select 
                      value={editingIncome.frequency}
                      onChange={(e) => setEditingIncome({ ...editingIncome, frequency: e.target.value })}
                      aria-label="Frequency"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-bold text-sm appearance-none"
                    >
                      <option value="Monthly" className="bg-[#050508]">Monthly</option>
                      <option value="Bi-Weekly" className="bg-[#050508]">Bi-Weekly</option>
                      <option value="Weekly" className="bg-[#050508]">Weekly</option>
                      <option value="Variable" className="bg-[#050508]">Variable</option>
                      <option value="Quarterly" className="bg-[#050508]">Quarterly</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Brand Color</label>
                  <div className="flex gap-3">
                    {['#7C6EFA', '#22D3A5', '#F43F5E', '#F59E0B', '#EC4899', '#06B6D4'].map(color => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Color ${color}`}
                        onClick={() => setEditingIncome({ ...editingIncome, color })}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all overflow-hidden",
                          editingIncome.color === color ? "border-white scale-110" : "border-transparent"
                        )}
                      >
                        <svg viewBox="0 0 10 10" className="w-full h-full" aria-hidden="true">
                          <circle cx="5" cy="5" r="5" fill={color} />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingIncome(null)}
                    className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 rounded-xl bg-accent text-white font-bold uppercase tracking-widest hover:bg-accent/80 transition-all shadow-lg violet-glow"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


