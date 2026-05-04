import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinance } from '../context/FinanceContext';
import { Plus, Target, TrendingUp, Calendar, ArrowRight, X, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { SavingsGoal } from '../types';
import DeleteModal from './DeleteModal';

interface SavingsPageProps {
  onNavigate?: (tab: string) => void;
}

export const SavingsPage: React.FC<SavingsPageProps> = ({ onNavigate }) => {
  const { savingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, accounts, transferToSavings } = useFinance();
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<SavingsGoal | null>(null);
  const [fundingGoal, setFundingGoal] = React.useState<string | null>(null);
  const [fundAmount, setFundAmount] = React.useState('');
  const [selectedAccountId, setSelectedAccountId] = React.useState('');
  const currencies = Array.from(new Set(savingsGoals.map(g => g.currency || 'INR')));
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] || 'INR');
  const [newGoal, setNewGoal] = React.useState({ name: '', target: '', emoji: '🎯', deadline: '', currency: selectedCurrency });
  const [isSaving, setIsSaving] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const filteredGoals = savingsGoals.filter(g => (g.currency || 'INR') === selectedCurrency);

  const handleAddGoal = async () => {
    if (!newGoal.name || !newGoal.target) return;
    setIsSaving(true);
    
    const goalData = {
      name: newGoal.name,
      target: Number(newGoal.target),
      emoji: newGoal.emoji,
      deadline: newGoal.deadline || 'No deadline',
      currency: newGoal.currency || 'INR'
    };

    try {
      if (editingGoal) {
        await updateSavingsGoal(editingGoal.id, goalData);
      } else {
        await addSavingsGoal({
          id: `goal-${Date.now()}`,
          ...goalData,
          current: 0,
          isHero: false,
        });
      }
      setIsAdding(false);
      setEditingGoal(null);
      setNewGoal({ name: '', target: '', emoji: '🎯', deadline: '', currency: 'INR' });
    } catch (error) {
      console.error('Failed to save goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setNewGoal({
      name: goal.name,
      target: goal.target.toString(),
      emoji: goal.emoji,
      deadline: goal.deadline || '',
      currency: goal.currency || 'INR'
    });
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleTransfer = () => {
    if (!fundingGoal || !fundAmount || !selectedAccountId) return;
    transferToSavings(Number(fundAmount), fundingGoal, selectedAccountId);
    setFundingGoal(null);
    setFundAmount('');
    setSelectedAccountId('');
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
          <h1 className="text-4xl font-bold tracking-tight mb-2">Savings Goals</h1>
          <p className="text-white/40">Plan and track your future aspirations</p>
        </div>
        <div className="flex items-center gap-4">
          {currencies.length > 1 && (
            <div className="relative">
              <select
                title="Currency"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm font-bold text-white pr-10 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {currencies.map(c => (
                  <option key={c} value={c} className="bg-[#050508] text-white">{c}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
            </div>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Goal Name *</label>
                  <input 
                    type="text"
                    required
                    value={newGoal.name}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. New Car"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Target Amount *</label>
                  <input 
                    type="number"
                    required
                    value={newGoal.target}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target: e.target.value }))}
                    placeholder="e.g. 5000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Deadline</label>
                  <input 
                    type="text"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                    placeholder="e.g. Dec 2024"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Currency</label>
                  <select 
                    title="Currency"
                    value={newGoal.currency || 'INR'}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                  >
                    <option value="INR" className="bg-[#050508] text-white">INR (₹)</option>
                    <option value="EUR" className="bg-[#050508] text-white">EUR (€)</option>
                    <option value="USD" className="bg-[#050508] text-white">USD ($)</option>
                    <option value="GBP" className="bg-[#050508] text-white">GBP (£)</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setIsAdding(false);
                      setEditingGoal(null);
                      setNewGoal({ name: '', target: '', emoji: '🎯', deadline: '', currency: 'INR' });
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddGoal}
                    disabled={isSaving}
                    className="flex-1 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : (editingGoal ? 'Update' : 'Save')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Empty state (P2) */}
      {filteredGoals.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="text-7xl opacity-50">🎯</div>
          <h3 className="text-xl font-bold text-white/70">No savings goals yet</h3>
          <p className="text-white/40">Start working towards your dreams by adding a savings goal</p>
          <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-accent rounded-2xl text-white font-bold hover:bg-accent/80 transition-all">
            Add Your First Goal
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {filteredGoals.map((goal) => {
          const progress = (goal.current / goal.target) * 100;
          return (
            <motion.div
              key={goal.id}
              whileHover={{ y: -5 }}
              className={cn(
                "glass-card p-8 flex flex-col group relative overflow-hidden",
                goal.isHero && "border-accent/40 bg-accent/5"
              )}
            >
              {goal.isHero && (
                <div className="absolute top-4 right-4 px-2 py-1 rounded-md bg-accent text-[10px] font-bold uppercase tracking-widest text-black">
                  Priority
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div className="text-4xl">{goal.emoji}</div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    title="Edit goal"
                    aria-label="Edit savings goal"
                    onClick={() => startEdit(goal)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-accent/20 text-white/40 hover:text-accent transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    title="Delete goal"
                    aria-label="Delete savings goal"
                    onClick={() => handleDelete(goal.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-negative/20 text-white/40 hover:text-negative transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">{goal.name}</h3>
              
              <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-bold font-mono tracking-tighter">
                    {goal.current.toLocaleString(undefined, { style: 'currency', currency: goal.currency || 'INR' })}
                  </span>
                  <span className="text-sm text-white/40 font-mono">
                    of {goal.target.toLocaleString(undefined, { style: 'currency', currency: goal.currency || 'INR' })}
                  </span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-accent violet-glow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Deadline</p>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Calendar className="w-3 h-3 text-white/40" />
                    <span>{goal.deadline}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Monthly</p>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <TrendingUp className="w-3 h-3 text-positive" />
                    <span>Auto-calculated</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setFundingGoal(goal.id)}
                className="mt-8 w-full py-3 rounded-xl bg-white/5 border border-white/5 text-xs font-bold uppercase tracking-widest hover:bg-accent hover:text-black transition-all flex items-center justify-center gap-2 group"
              >
                Add Funds
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          );
        })}

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => setIsAdding(true)}
          className="glass-card p-8 flex flex-col items-center justify-center text-center border-dashed border-white/20 hover:border-accent/50 transition-all cursor-pointer group min-h-[350px]"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
            <Plus className="w-8 h-8 text-white/40 group-hover:text-accent transition-colors" />
          </div>
          <h3 className="text-lg font-bold mb-2">New Goal</h3>
          <p className="text-sm text-white/30 max-w-[200px]">What are you dreaming of next? Let AI help you plan it.</p>
        </motion.div>
      </div>

      <div className="glass-card p-8 border-accent/20 bg-accent/5">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Savings Strategy</h3>
            <p className="text-sm text-white/60">AI-optimized allocation based on your goals</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Auto-Save</h4>
            <p className="text-sm font-medium mb-4">Round up transactions and save the difference.</p>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-positive">Active</span>
              <span className="text-[10px] font-mono text-white/30">Active</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Smart Transfers</h4>
            <p className="text-sm font-medium mb-4">Transfer surplus cash to high-yield vaults.</p>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-accent">Suggested</span>
              <button onClick={() => onNavigate?.('accounts')} className="text-[10px] font-bold uppercase text-accent hover:underline">Review</button>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Debt Snowball</h4>
            <p className="text-sm font-medium mb-4">Prioritize high-interest debt repayment.</p>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white/20">Inactive</span>
              <button onClick={() => onNavigate?.('loans')} className="text-[10px] font-bold uppercase text-white/40 hover:text-white transition-colors">Setup</button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {fundingGoal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFundingGoal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card p-8 border-accent/30 bg-card/90"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold tracking-tight">Add Funds</h3>
                <button 
                  title="Close"
                  onClick={() => setFundingGoal(null)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Amount ({selectedCurrency === 'INR' ? '₹' : selectedCurrency}) *</label>
                  <input 
                    type="number"
                    required
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-2xl font-bold font-mono outline-none focus:border-accent/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">From Account *</label>
                  <div className="relative">
                    <select 
                      title="From account"
                      value={selectedAccountId}
                      required
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-bold text-sm"
                    >
                      <option value="" disabled className="bg-[#050508] text-white">Select an account</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id} className="bg-[#050508] text-white">
                          {account.name} ({account.balance.toLocaleString(undefined, { style: 'currency', currency: account.currency || 'INR' })})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                <button 
                  onClick={handleTransfer}
                  disabled={!fundAmount || !selectedAccountId}
                  className="w-full py-4 rounded-xl bg-accent text-white font-bold uppercase tracking-widest hover:bg-accent/80 transition-all shadow-lg violet-glow disabled:opacity-50 disabled:pointer-events-none mt-4"
                >
                  Confirm Transfer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => { if (deleteConfirmId) deleteSavingsGoal(deleteConfirmId); }}
        title="Delete Savings Goal?"
        description="This will permanently remove this savings goal and all its progress. This action cannot be undone."
      />
    </motion.div>
  );
};

