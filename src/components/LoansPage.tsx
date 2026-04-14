import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, TrendingDown, X, Landmark } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';

export const LoansPage: React.FC = () => {
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const { loans, addLoan } = useFinance();

  const [loanForm, setLoanForm] = useState({
    name: '',
    totalAmount: '',
    monthlyEMI: '',
    interestRate: '',
    category: 'Personal'
  });

  const handleAddLoan = () => {
    const newLoan = {
      id: `loan-${Date.now()}`,
      name: loanForm.name || 'New Loan',
      totalAmount: parseFloat(loanForm.totalAmount) || 0,
      remainingAmount: parseFloat(loanForm.totalAmount) || 0,
      monthlyEMI: parseFloat(loanForm.monthlyEMI) || 0,
      interestRate: parseFloat(loanForm.interestRate) || 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5).toISOString().split('T')[0],
      category: loanForm.category,
      color: '#F43F5E'
    };
    addLoan(newLoan);
    setIsAddingLoan(false);
    setLoanForm({ name: '', totalAmount: '', monthlyEMI: '', interestRate: '', category: 'Personal' });
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
          <h1 className="text-5xl font-bold tracking-tighter mb-3 font-display">Loans & EMIs</h1>
          <p className="text-white/40 font-medium">Track your liabilities and repayment schedules with precision</p>
        </div>
        <button 
          onClick={() => setIsAddingLoan(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-negative text-white text-sm font-bold hover:bg-negative/80 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Loan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loans.length > 0 ? (
          loans.map((loan, i) => (
            <motion.div
              key={loan.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 border-white/5 hover:border-negative/30 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-negative/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-negative/10 flex items-center justify-center text-negative violet-glow">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl tracking-tight">{loan.name}</h4>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">{loan.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Monthly EMI</p>
                  <p className="text-2xl font-bold font-mono text-negative tracking-tighter">
                    {loan.monthlyEMI.toLocaleString('en-US', { style: 'currency', currency: loan.currency || 'USD' })}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8 relative z-10">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-widest">Repayment Progress</span>
                  <span className="text-white font-bold font-mono">
                    {Math.round(((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100)}%
                  </span>
                </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100}%` }}
                      transition={{ duration: 2, ease: "circOut", delay: 0.2 }}
                      className="h-full bg-negative shadow-[0_0_15px_rgba(244,63,94,0.5)] rounded-full"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5 relative z-10">
                <div>
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Remaining Principal</p>
                  <p className="text-lg font-bold font-mono tracking-tight">
                    {loan.remainingAmount.toLocaleString('en-US', { style: 'currency', currency: loan.currency || 'USD' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Interest Rate</p>
                  <p className={cn(
                    "text-lg font-bold font-mono tracking-tight",
                    loan.interestRate < 5 ? "text-positive" : 
                    loan.interestRate < 10 ? "text-amber-500" : 
                    "text-negative"
                  )}>
                    {loan.interestRate}% APR
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="md:col-span-2 glass-card p-20 flex flex-col items-center justify-center text-center border-dashed border-white/10">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
              <Landmark className="w-10 h-10 text-white/20" />
            </div>
            <h4 className="font-bold text-2xl text-white/60 mb-3">No active loans tracked</h4>
            <p className="text-sm text-white/30 max-w-md leading-relaxed">Add your mortgages, car loans, or personal EMIs to get a complete view of your financial liabilities and repayment journey.</p>
          </div>
        )}
      </div>

      {/* Add Loan Modal */}
      <AnimatePresence>
        {isAddingLoan && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingLoan(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative glass-card max-w-md w-full overflow-hidden border-negative/30 shadow-[0_0_100px_rgba(244,63,94,0.1)]"
            >
              <div className="p-8 border-b border-white/5 bg-negative/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-negative/20 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-negative" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">Add New Loan</h3>
                </div>
                <button onClick={() => setIsAddingLoan(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-white/20 hover:text-white" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Loan Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Car Loan"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                    value={loanForm.name}
                    onChange={e => setLoanForm({...loanForm, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Amount</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                      value={loanForm.totalAmount}
                      onChange={e => setLoanForm({...loanForm, totalAmount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Monthly EMI</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                      value={loanForm.monthlyEMI}
                      onChange={e => setLoanForm({...loanForm, monthlyEMI: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Interest Rate (%)</label>
                    <input 
                      type="number" 
                      placeholder="5.0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                      value={loanForm.interestRate}
                      onChange={e => setLoanForm({...loanForm, interestRate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Category</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                      value={loanForm.category}
                      onChange={e => setLoanForm({...loanForm, category: e.target.value})}
                    >
                      <option value="Personal" className="bg-background text-white">Personal</option>
                      <option value="Housing" className="bg-background text-white">Housing</option>
                      <option value="Transport" className="bg-background text-white">Transport</option>
                      <option value="Education" className="bg-background text-white">Education</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsAddingLoan(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 font-bold hover:bg-white/10 transition-all text-white/40"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddLoan}
                    className="flex-[2] py-4 rounded-2xl bg-negative text-white font-bold hover:bg-negative/80 transition-all shadow-lg"
                  >
                    Add Loan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
