import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../lib/utils';
import { Budget } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { TrendingUp, AlertCircle, Sparkles, Home, Utensils, Car, Film, ShoppingBag, Smartphone, Zap, Heart, GraduationCap, MoreHorizontal, Plane, Gift, ShieldCheck, Wallet, Coffee, Plus, PieChart as PieChartIcon, Calendar, ArrowUpDown } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Housing': <Home className="w-5 h-5" />,
  'Food': <Utensils className="w-5 h-5" />,
  'Food & Drink': <Coffee className="w-5 h-5" />,
  'Transport': <Car className="w-5 h-5" />,
  'Entertainment': <Film className="w-5 h-5" />,
  'Shopping': <ShoppingBag className="w-5 h-5" />,
  'Electronics': <Smartphone className="w-5 h-5" />,
  'Utilities': <Zap className="w-5 h-5" />,
  'Health': <Heart className="w-5 h-5" />,
  'Education': <GraduationCap className="w-5 h-5" />,
  'Travel': <Plane className="w-5 h-5" />,
  'Gifts': <Gift className="w-5 h-5" />,
  'Insurance': <ShieldCheck className="w-5 h-5" />,
  'Investments': <Wallet className="w-5 h-5" />,
  'Others': <MoreHorizontal className="w-5 h-5" />,
};

const PRESET_COLORS = [
  '#7C6EFA', // Indigo
  '#22D3EE', // Cyan
  '#22D3A5', // Emerald
  '#F43F5E', // Rose
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#3B82F6', // Blue
];

interface BudgetsPageProps {
  setActiveTab: (tab: string) => void;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({ setActiveTab }) => {
  const { budgets, addBudget, updateBudget, deleteBudget, transactions, healthMetricsByCurrency } = useFinance();
  const healthMetrics = healthMetricsByCurrency['USD'] || Object.values(healthMetricsByCurrency)[0] || { budgetAdherence: 0 };
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);
  const [formData, setFormData] = React.useState({ 
    category: '', 
    limit: '', 
    rolloverEnabled: false, 
    perTransactionLimit: '',
    color: PRESET_COLORS[0],
    dueDate: ''
  });
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [isProcessingRollover, setIsProcessingRollover] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'category' | 'limit' | 'spent' | 'dueDate'>('category');

  const sortedBudgets = [...budgets].sort((a, b) => {
    if (sortBy === 'category') return a.category.localeCompare(b.category);
    if (sortBy === 'limit') return b.limit - a.limit;
    if (sortBy === 'spent') return b.spent - a.spent;
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  const totalBudget = budgets.reduce((acc, b) => acc + b.limit + (b.rolloverAmount || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const budgetAlerts = budgets.filter(b => (b.spent / (b.limit + (b.rolloverAmount || 0))) > 0.85);

  const handleSaveBudget = () => {
    if (!formData.category || !formData.limit) return;
    
    const budgetData = {
      category: formData.category,
      limit: Number(formData.limit),
      rolloverEnabled: formData.rolloverEnabled,
      perTransactionLimit: formData.perTransactionLimit ? Number(formData.perTransactionLimit) : undefined,
      color: formData.color,
      dueDate: formData.dueDate || undefined
    };

    if (editingBudget) {
      updateBudget(editingBudget.id, budgetData);
    } else {
      addBudget({
        id: `budget-${Date.now()}`,
        ...budgetData,
        spent: 0,
        emoji: '📊',
      });
    }
    
    setIsAdding(false);
    setEditingBudget(null);
    setFormData({ category: '', limit: '', rolloverEnabled: false, perTransactionLimit: '', color: PRESET_COLORS[0], dueDate: '' });
  };

  const handleProcessRollover = async () => {
    setIsProcessingRollover(true);
    // Simulate a delay for processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    budgets.forEach(budget => {
      if (budget.rolloverEnabled) {
        const effectiveLimit = budget.limit + (budget.rolloverAmount || 0);
        const difference = effectiveLimit - budget.spent;
        
        // Transfer the difference to next month's rolloverAmount
        // If overspent, difference is negative, reducing next month's effective limit
        // If underspent, difference is positive, increasing next month's effective limit
        updateBudget(budget.id, {
          spent: 0,
          rolloverAmount: (budget.rolloverAmount || 0) + difference
        });
      } else {
        // Just reset spent if rollover is not enabled
        updateBudget(budget.id, { spent: 0 });
      }
    });

    setIsProcessingRollover(false);
  };

  const startEdit = (e: React.MouseEvent, budget: Budget) => {
    e.stopPropagation();
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      limit: budget.limit.toString(),
      rolloverEnabled: !!budget.rolloverEnabled,
      perTransactionLimit: budget.perTransactionLimit?.toString() || '',
      color: budget.color || PRESET_COLORS[0],
      dueDate: budget.dueDate || ''
    });
    setIsAdding(true);
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
          <h1 className="text-5xl font-bold tracking-tighter mb-3 font-display">Budgets</h1>
          <p className="text-white/40 font-medium">Track and optimize your monthly spending with AI insights</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleProcessRollover}
            disabled={isProcessingRollover}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50",
              isProcessingRollover && "animate-pulse"
            )}
          >
            <TrendingUp className={cn("w-4 h-4", isProcessingRollover && "animate-bounce")} />
            <span>{isProcessingRollover ? 'Processing...' : 'Process Rollover'}</span>
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Budget</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-12"
          >
            <div className="glass-card p-8 border-accent/20 bg-accent/[0.02]">
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Category <span className="text-accent">*</span></label>
                    <input 
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g. Subscriptions"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Monthly Limit ($) <span className="text-accent">*</span></label>
                    <input 
                      type="number"
                      value={formData.limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, limit: e.target.value }))}
                      placeholder="e.g. 200"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Per-Transaction Limit ($)</label>
                    <input 
                      type="number"
                      value={formData.perTransactionLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, perTransactionLimit: e.target.value }))}
                      placeholder="e.g. 50 (Optional)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Due Date</label>
                    <div className="relative">
                      <input 
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all text-sm"
                      />
                      <Calendar className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 h-[50px]">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div 
                        onClick={() => setFormData(prev => ({ ...prev, rolloverEnabled: !prev.rolloverEnabled }))}
                        className={cn(
                          "w-10 h-6 rounded-full transition-all relative border",
                          formData.rolloverEnabled ? "bg-accent border-accent" : "bg-white/5 border-white/10"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          formData.rolloverEnabled ? "left-5" : "left-1"
                        )} />
                      </div>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">Enable Rollover</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Select Custom Color</label>
                  <div className="flex flex-wrap gap-3">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={cn(
                          "w-10 h-10 rounded-xl transition-all border-2",
                          formData.color === color ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="relative">
                      <input 
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 cursor-pointer opacity-0 absolute inset-0"
                      />
                      <div 
                        className="w-10 h-10 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/20"
                        style={{ backgroundColor: PRESET_COLORS.includes(formData.color) ? 'transparent' : formData.color }}
                      >
                        {!PRESET_COLORS.includes(formData.color) ? null : <Plus className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => {
                      setIsAdding(false);
                      setEditingBudget(null);
                      setFormData({ category: '', limit: '', rolloverEnabled: false, perTransactionLimit: '', color: PRESET_COLORS[0], dueDate: '' });
                    }}
                    className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveBudget}
                    className="px-8 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow"
                  >
                    {editingBudget ? 'Update Budget' : 'Save Budget'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        <div className="lg:col-span-8 glass-card p-10 relative overflow-hidden border-white/5">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between items-center gap-12 relative z-10">
            <div className="space-y-4 text-center lg:text-left">
              <p className="text-accent text-[10px] font-bold tracking-[0.3em] uppercase">Current Utilization</p>
              <h2 className="text-5xl font-bold font-mono tracking-tighter">
                {totalSpent.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} <span className="text-white/20 text-2xl font-medium">/ {totalBudget.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </h2>
              <div className="flex items-center gap-4 justify-center lg:justify-start">
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-positive/10 border border-positive/20 text-positive text-[10px] font-bold uppercase tracking-widest">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>On Track</span>
                </div>
                <p className="text-xs text-white/40 font-medium tracking-tight">Your spending is currently {percentSpent > 100 ? 'over' : 'within'} your total budget</p>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-xl space-y-6">
              <div className="relative h-6 w-full bg-white/5 rounded-2xl overflow-hidden flex border border-white/5 p-1 shadow-inner">
                {budgets.map((budget, i) => (
                  <motion.div 
                    key={budget.id}
                    initial={{ width: 0 }}
                    animate={{ width: `${(budget.spent / totalBudget) * 100}%` }}
                    transition={{ delay: i * 0.1, duration: 1 }}
                    style={{ backgroundColor: budget.color }}
                    className="h-full rounded-lg transition-all duration-500 relative group"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">{Math.round(percentSpent)}%</span>
                  <span>Budget Used</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">${(totalBudget - totalSpent).toLocaleString()}</span>
                  <span>Remaining</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 glass-card p-10 flex flex-col items-center justify-center text-center border-accent/20 bg-accent/[0.02]">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-6">Budget Health Score</p>
          <div className="relative w-32 h-32 mb-6">
            <svg className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r="58" className="stroke-white/5 fill-none" strokeWidth="12" />
              <motion.circle
                cx="64"
                cy="64"
                r="58"
                className="fill-none"
                stroke="#7C6EFA"
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 58}
                initial={{ strokeDashoffset: 2 * Math.PI * 58 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 58 * (1 - healthMetrics.budgetAdherence) }}
                transition={{ duration: 2, ease: "easeOut" }}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 8px rgba(124,110,250,0.4))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono">{Math.round(healthMetrics.budgetAdherence * 100)}</span>
              <span className="text-[8px] font-bold text-white/30 uppercase">Score</span>
            </div>
          </div>
          <p className="text-xs font-medium text-white/60">
            {healthMetrics.budgetAdherence > 0.8 ? "Excellent adherence! You're a master of your finances." : 
             healthMetrics.budgetAdherence > 0.5 ? "Good progress. Keep an eye on your discretionary spending." : 
             "Budget under pressure. Review your high-cost categories."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        <div className="lg:col-span-12 glass-card p-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-2">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <PieChartIcon className="w-5 h-5 text-accent" />
                Spending Distribution
              </h3>
              <p className="text-xs text-white/40 font-medium">Visual breakdown of expenses across all budget categories</p>
            </div>
            
            <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-12">
              <div className="w-full md:w-1/2 h-[350px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgets}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="spent"
                      nameKey="category"
                      stroke="none"
                    >
                      {budgets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="glass-card p-4 border-accent/20 bg-card/90 backdrop-blur-xl">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{data.category}</p>
                              <p className="text-lg font-bold font-mono text-white">
                                {data.spent.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                              </p>
                              <p className="text-[10px] text-accent font-bold uppercase tracking-widest mt-1">
                                {Math.round((data.spent / totalSpent) * 100)}% of total
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                {budgets.map((budget) => (
                  <div key={budget.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.color }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white truncate">{budget.category}</p>
                      <p className="text-[10px] font-mono text-white/40">
                        {Math.round((budget.spent / totalSpent) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {budgetAlerts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 flex flex-wrap gap-4"
          >
            {budgetAlerts.map(budget => (
              <div key={budget.id} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-negative/10 border border-negative/20 text-negative text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>{budget.category} is at {Math.round((budget.spent / budget.limit) * 100)}% of limit</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Sort By:</span>
          <div className="flex gap-2">
            {[
              { id: 'category', label: 'Category' },
              { id: 'limit', label: 'Limit' },
              { id: 'spent', label: 'Spent' },
              { id: 'dueDate', label: 'Due Date' }
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border",
                  sortBy === option.id 
                    ? "bg-accent border-accent text-white" 
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
          {sortedBudgets.map((budget, i) => {
            const effectiveLimit = budget.limit + (budget.rolloverAmount || 0);
            const progress = (budget.spent / effectiveLimit) * 100;
            const isOver = budget.spent > effectiveLimit;
            const isAtLimit = progress >= 90 && progress <= 100;
            
            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                onClick={() => setSelectedCategory(selectedCategory === budget.category ? null : budget.category)}
                className={cn(
                  "glass-card p-8 flex flex-col group border-white/5 hover:border-accent/30 transition-all cursor-pointer relative overflow-hidden",
                  selectedCategory === budget.category && "border-accent/50 bg-accent/[0.05] shadow-[0_0_30px_rgba(124,110,250,0.1)]",
                  isOver && "border-negative/30 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                )}
              >
                {isOver && (
                  <div className="absolute inset-0 bg-negative/[0.02] animate-pulse pointer-events-none" />
                )}
                {selectedCategory === budget.category && (
                  <motion.div 
                    layoutId="active-budget"
                    className="absolute inset-0 bg-accent/5 pointer-events-none"
                  />
                )}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110 shadow-lg"
                      style={{ 
                        backgroundColor: `${budget.color}15`, 
                        borderColor: isOver ? '#F43F5E' : `${budget.color}30`,
                        color: isOver ? '#F43F5E' : budget.color 
                      }}
                    >
                      {CATEGORY_ICONS[budget.category] || <span className="text-xl">{budget.emoji}</span>}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg tracking-tight">{budget.category}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Monthly Allocation</p>
                        {budget.dueDate && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-1.5 py-0.5 rounded">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>Due {new Date(budget.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => startEdit(e, budget)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-accent/20 text-white/40 hover:text-accent transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 rotate-45" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBudget(budget.id);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-negative/20 text-white/40 hover:text-negative transition-all"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-2xl font-bold font-mono tracking-tighter">{budget.limit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex flex-col gap-1">
                      <span className="text-white/40">Spent: <span className="text-white font-mono text-xs ml-1">{budget.spent.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></span>
                      {budget.rolloverAmount && budget.rolloverAmount !== 0 && (
                        <span className={cn(budget.rolloverAmount > 0 ? "text-positive" : "text-negative")}>
                          Rollover: <span className="font-mono text-xs ml-1">{budget.rolloverAmount > 0 ? '+' : ''}{budget.rolloverAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                        </span>
                      )}
                      {budget.perTransactionLimit && (
                        <span className="text-accent">Tx Limit: <span className="font-mono text-xs ml-1">{budget.perTransactionLimit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></span>
                      )}
                    </div>
                    <span className={cn(isOver ? "text-negative font-bold" : "text-white/40")}>
                      {isOver ? `-${Math.round(budget.spent - effectiveLimit).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} over` : `${Math.round(effectiveLimit - budget.spent).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} left`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        isOver ? "bg-negative shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse" : 
                        isAtLimit ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]" : 
                        "bg-gradient-to-r from-positive/50 to-positive shadow-[0_0_12px_rgba(34,211,165,0.2)]"
                      )}
                      style={!isOver && !isAtLimit ? { backgroundColor: budget.color } : {}}
                    />
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5 flex items-center gap-3 text-[10px] font-bold text-white/20 uppercase tracking-widest group-hover:text-accent/60 transition-colors">
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {(() => {
                      const today = new Date();
                      const dayOfMonth = today.getDate();
                      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                      const projectedSpent = (budget.spent / dayOfMonth) * daysInMonth;
                      const diff = projectedSpent - effectiveLimit;
                      
                      if (diff > 0) {
                        return `Burn rate: You'll exceed by $${Math.round(diff)} at this pace`;
                      } else {
                        return `Burn rate: On track to save $${Math.round(Math.abs(diff))} this month`;
                      }
                    })()}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="lg:col-span-1 space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 bg-accent/[0.03] border-accent/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 blur-3xl rounded-full -mr-12 -mt-12" />
            <h3 className="text-sm font-bold mb-6 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent" />
              AI Optimization
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Projected Monthly Savings</p>
                <p className="text-2xl font-bold font-mono text-positive">
                  +${(totalBudget - totalSpent > 0 ? (totalBudget - totalSpent) * 0.4 : 0).toFixed(2)}
                </p>
                <p className="text-xs text-white/40 font-medium">Based on current spending velocity</p>
              </div>
              
              <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 cursor-pointer hover:bg-accent/20 transition-all group">
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">AI Recommendation</p>
                <p className="text-xs text-white/70 leading-relaxed font-medium group-hover:text-white transition-colors">
                  {(() => {
                    const overBudgets = budgets.filter(b => b.spent > b.limit);
                    const nearLimitBudgets = budgets.filter(b => b.spent > b.limit * 0.8 && b.spent <= b.limit);
                    
                    if (overBudgets.length > 0) {
                      return `You've exceeded your ${overBudgets[0].category} budget. Try to reduce spending in other categories to compensate.`;
                    }
                    if (nearLimitBudgets.length > 0) {
                      return `Your ${nearLimitBudgets[0].category} budget is nearing its limit. Consider delaying non-essential purchases in this category.`;
                    }
                    if (totalBudget - totalSpent > 500) {
                      return `You have a healthy surplus this month. Consider allocating $${Math.round((totalBudget - totalSpent) * 0.5)} to your priority savings goal.`;
                    }
                    return "Your spending is well-balanced. Keep maintaining this pace to reach your financial goals.";
                  })()}
                </p>
              </div>

              <button 
                onClick={() => setActiveTab('insights')}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all"
              >
                View All Insights
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-12"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                <span className="text-accent">#</span> {selectedCategory} Transactions
              </h3>
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors"
              >
                Clear Filter
              </button>
            </div>
            <div className="glass-card overflow-hidden border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Merchant</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter(t => {
                        if (t.category !== selectedCategory) return false;
                        const txDate = new Date(t.date);
                        const now = new Date();
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                        return txDate >= lastMonth;
                      })
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((t, i) => {
                        const currentBudget = budgets.find(b => b.category === selectedCategory);
                        const isOverLimit = currentBudget?.perTransactionLimit && Math.abs(t.amount) > currentBudget.perTransactionLimit;
                        
                        return (
                          <motion.tr 
                            key={t.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={cn(
                              "border-b border-white/5 hover:bg-white/[0.02] transition-colors group",
                              isOverLimit && "bg-negative/[0.02]"
                            )}
                          >
                            <td className="px-6 py-4 text-xs font-mono text-white/40">{t.date}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold group-hover:text-accent transition-colors">{t.merchant}</span>
                                {isOverLimit && (
                                  <div className="group/limit relative">
                                    <AlertCircle className="w-3 h-3 text-negative" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-negative text-[8px] text-white rounded opacity-0 group-hover/limit:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                      Exceeds ${currentBudget.perTransactionLimit} limit
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-sm font-bold font-mono",
                                t.type === 'expense' ? "text-negative" : "text-positive"
                              )}>
                                {t.type === 'expense' ? '-' : '+'}${Math.abs(t.amount).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                {t.status}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    {transactions.filter(t => t.category === selectedCategory).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <p className="text-sm text-white/20 font-medium italic">No transactions found for this category</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
