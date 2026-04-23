import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, TrendingDown, X, Landmark, Calculator, ArrowLeftRight, ChevronRight, Calendar, CreditCard, Info, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import { Loan } from '../types';
import DeleteModal from './DeleteModal';

const calculateEMI = (principal: number, annualRate: number, years: number) => {
  const r = annualRate / 12 / 100;
  const n = years * 12;
  if (r === 0) return principal / n;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return emi;
};

const generateAmortizationSchedule = (loan: Loan) => {
  const r = loan.interestRate / 12 / 100;
  const emi = loan.monthlyEMI;
  const schedule = [];
  let balance = loan.totalAmount;
  const payments = loan.payments || [];
  
  // We'll iterate until balance is 0 or we hit a reasonable limit (e.g., 30 years)
  let month = 1;
  while (balance > 0.01 && month <= 360) {
    const interest = balance * r;
    const payment = payments[month - 1];
    const isPaid = !!payment;
    
    const currentPayment = isPaid ? payment.amount : Math.min(emi, balance + interest);
    const currentInterest = isPaid ? payment.interest : interest;
    const currentPrincipal = isPaid ? payment.principal : currentPayment - currentInterest;
    
    balance -= currentPrincipal;
    
    schedule.push({
      month: month,
      payment: currentPayment,
      principal: currentPrincipal,
      interest: currentInterest,
      balance: Math.max(0, balance),
      status: isPaid ? 'Paid' : 'Upcoming'
    });
    
    month++;
  }
  return schedule;
};

export const LoansPage: React.FC = () => {
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [selectedLoanForSchedule, setSelectedLoanForSchedule] = useState<Loan | null>(null);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const { loans, addLoan, updateLoan, deleteLoan, addManualTransaction } = useFinance();

  const [loanForm, setLoanForm] = useState({
    name: '',
    totalAmount: '',
    monthlyEMI: '',
    interestRate: '',
    category: 'Personal',
    tenureYears: '5',
    currency: 'INR'
  });

  const [calcForm, setCalcForm] = useState({
    principal: '10000',
    rate: '8',
    years: '5'
  });

  const [compareList, setCompareList] = useState([
    { principal: '10000', rate: '8', years: '5' },
    { principal: '10000', rate: '10', years: '5' }
  ]);

  const calcResults = useMemo(() => {
    const p = parseFloat(calcForm.principal) || 0;
    const r = parseFloat(calcForm.rate) || 0;
    const y = parseFloat(calcForm.years) || 0;
    const emi = calculateEMI(p, r, y);
    const totalRepayment = emi * y * 12;
    const totalInterest = totalRepayment - p;
    return { emi, totalRepayment, totalInterest };
  }, [calcForm]);

  const handleMakePayment = async () => {
    if (!selectedLoanForPayment || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    const loan = selectedLoanForPayment;
    const r = loan.interestRate / 12 / 100;
    const interest = loan.remainingAmount * r;
    const principal = amount - interest;

    const newPayment = {
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      principal: principal,
      interest: interest
    };

    const updatedPayments = [...(loan.payments || []), newPayment];
    const newRemaining = Math.max(0, loan.remainingAmount - principal);

    await addManualTransaction({
      id: crypto.randomUUID(),
      merchant: `Loan Payment - ${loan.name}`,
      amount: -amount,
      type: 'expense',
      category: 'Loan Payment',
      date: new Date().toISOString().split('T')[0],
      currency: loan.currency || 'INR',
      status: 'confirmed',
      account: 'Main Current'
    });
    updateLoan(loan.id, { 
      remainingAmount: newRemaining,
      payments: updatedPayments
    });
    
    setSelectedLoanForPayment(null);
    setPaymentAmount('');
  };

  const handleQuickPay = async (loan: Loan) => {
    const amount = loan.monthlyEMI;
    const r = loan.interestRate / 12 / 100;
    const interest = loan.remainingAmount * r;
    const principal = amount - interest;

    const newPayment = {
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      principal: principal,
      interest: interest
    };

    const updatedPayments = [...(loan.payments || []), newPayment];
    const newRemaining = Math.max(0, loan.remainingAmount - principal);

    await addManualTransaction({
      id: crypto.randomUUID(),
      merchant: `EMI Payment - ${loan.name}`,
      amount: -amount,
      type: 'expense',
      category: 'Loan Payment',
      date: new Date().toISOString().split('T')[0],
      currency: loan.currency || 'INR',
      status: 'confirmed',
      account: 'Main Current'
    });
    updateLoan(loan.id, { 
      remainingAmount: newRemaining,
      payments: updatedPayments
    });
  };

  const handleAddLoan = () => {
    const tenure = parseFloat(loanForm.tenureYears) || 5;
    const principal = parseFloat(loanForm.totalAmount) || 0;
    const rate = parseFloat(loanForm.interestRate) || 0;
    const emi = calculateEMI(principal, rate, tenure);

    const loanData = {
      name: loanForm.name || 'New Loan',
      totalAmount: principal,
      remainingAmount: principal,
      monthlyEMI: parseFloat(loanForm.monthlyEMI) || emi,
      interestRate: rate,
      tenureYears: tenure,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * tenure).toISOString().split('T')[0],
      category: loanForm.category,
      color: '#F43F5E',
      currency: loanForm.currency,
      payments: editingLoan ? editingLoan.payments : []
    };

    if (editingLoan) {
      updateLoan(editingLoan.id, loanData);
    } else {
      addLoan({
        id: `loan-${Date.now()}`,
        ...loanData
      });
    }
    
    setIsAddingLoan(false);
    setEditingLoan(null);
    setLoanForm({ name: '', totalAmount: '', monthlyEMI: '', interestRate: '', category: 'Personal', tenureYears: '5', currency: 'INR' });
  };

  const startEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanForm({
      name: loan.name,
      totalAmount: loan.totalAmount.toString(),
      monthlyEMI: loan.monthlyEMI.toString(),
      interestRate: loan.interestRate.toString(),
      category: loan.category,
      tenureYears: loan.tenureYears.toString(),
      currency: loan.currency || 'INR'
    });
    setIsAddingLoan(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
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
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCalculatorOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 transition-all"
          >
            <Calculator className="w-4 h-4" />
            <span>Estimator</span>
          </button>
          <button 
            onClick={() => setIsCompareOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Compare</span>
          </button>
          <button 
            onClick={() => setIsAddingLoan(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-negative text-white text-sm font-bold hover:bg-negative/80 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Loan</span>
          </button>
        </div>
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
                <div className="flex items-center gap-4">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        title="Edit loan"
                        onClick={() => startEdit(loan)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    <button 
                      title="Delete loan"
                      onClick={() => handleDelete(loan.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-negative/20 text-white/40 hover:text-negative transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Monthly EMI</p>
                    <p className="text-2xl font-bold font-mono text-negative tracking-tighter">
                      {loan.monthlyEMI.toLocaleString(undefined, { style: 'currency', currency: loan.currency || 'INR' })}
                    </p>
                  </div>
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
                    {loan.remainingAmount.toLocaleString(undefined, { style: 'currency', currency: loan.currency || 'INR' })}
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

              <div className="flex gap-3 mt-8 relative z-10">
                <button 
                  onClick={() => handleQuickPay(loan)}
                  className="flex-1 py-3 rounded-xl bg-negative/10 border border-negative/20 text-negative text-[10px] font-bold uppercase tracking-widest hover:bg-negative/20 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-3 h-3" />
                  Quick EMI
                </button>
                <button 
                  onClick={() => {
                    setSelectedLoanForPayment(loan);
                    setPaymentAmount(loan.monthlyEMI.toString());
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Landmark className="w-3 h-3" />
                  Pay Extra
                </button>
                <button 
                  onClick={() => setSelectedLoanForSchedule(loan)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Calendar className="w-3 h-3" />
                  Schedule
                </button>
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
      <DeleteModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => { if (deleteConfirmId) deleteLoan(deleteConfirmId); }}
        title="Delete Loan?"
        description="Are you sure you want to delete this loan? This will remove all repayment history and amortization schedules associated with it. This action is irreversible."
      />

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
                    {editingLoan ? <Pencil className="w-6 h-6 text-negative" /> : <TrendingDown className="w-6 h-6 text-negative" />}
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">{editingLoan ? 'Edit Loan' : 'Add New Loan'}</h3>
                </div>
                <button title="Close" onClick={() => { setIsAddingLoan(false); setEditingLoan(null); }} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-white/20 hover:text-white" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Loan Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Car Loan"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                    value={loanForm.name}
                    onChange={e => setLoanForm({...loanForm, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Amount *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                      value={loanForm.totalAmount}
                      onChange={e => setLoanForm({...loanForm, totalAmount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Tenure (Years)</label>
                    <input 
                      type="number" 
                      placeholder="5"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                      value={loanForm.tenureYears}
                      onChange={e => setLoanForm({...loanForm, tenureYears: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Interest Rate (%) *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="5.0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                      value={loanForm.interestRate}
                      onChange={e => setLoanForm({...loanForm, interestRate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Currency</label>
                    <select 
                      title="Currency"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-negative transition-all"
                      value={loanForm.currency}
                      onChange={e => setLoanForm({...loanForm, currency: e.target.value})}
                    >
                      <option value="INR" className="bg-[#050508] text-white">INR (₹)</option>
                      <option value="EUR" className="bg-[#050508] text-white">EUR (€)</option>
                      <option value="USD" className="bg-[#050508] text-white">USD ($)</option>
                      <option value="GBP" className="bg-[#050508] text-white">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Estimated EMI</span>
                    <span className="text-lg font-bold font-mono text-negative">
                      {calculateEMI(parseFloat(loanForm.totalAmount) || 0, parseFloat(loanForm.interestRate) || 0, parseFloat(loanForm.tenureYears) || 5).toLocaleString(undefined, { style: 'currency', currency: loanForm.currency || 'INR' })}
                    </span>
                  </div>
                  <p className="text-[8px] text-white/20 leading-relaxed">EMI is calculated based on standard reducing balance method. Actual bank rates may vary slightly.</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      setIsAddingLoan(false);
                      setEditingLoan(null);
                      setLoanForm({ name: '', totalAmount: '', monthlyEMI: '', interestRate: '', category: 'Personal', tenureYears: '5', currency: 'INR' });
                    }}
                    className="flex-1 py-4 rounded-2xl bg-white/5 font-bold hover:bg-white/10 transition-all text-white/40"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddLoan}
                    className="flex-[2] py-4 rounded-2xl bg-negative text-white font-bold hover:bg-negative/80 transition-all shadow-lg"
                  >
                    {editingLoan ? 'Update Loan' : 'Add Loan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loan Estimator Modal */}
      <AnimatePresence>
        {isCalculatorOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCalculatorOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative glass-card max-w-2xl w-full overflow-hidden border-accent/30 shadow-[0_0_100px_rgba(124,110,250,0.1)]"
            >
              <div className="p-8 border-b border-white/5 bg-accent/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">Loan Estimator</h3>
                </div>
                <button title="Close" onClick={() => setIsCalculatorOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-white/20 hover:text-white" />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Principal Amount</label>
                    <input 
                      type="number" 
                      title="Principal amount"
                      placeholder="e.g. 100000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent transition-all"
                      value={calcForm.principal}
                      onChange={e => setCalcForm({...calcForm, principal: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Interest Rate (%)</label>
                    <input 
                      type="number" 
                      title="Interest rate"
                      placeholder="e.g. 8.5"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent transition-all"
                      value={calcForm.rate}
                      onChange={e => setCalcForm({...calcForm, rate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Tenure (Years)</label>
                    <input 
                      type="number" 
                      title="Tenure in years"
                      placeholder="e.g. 5"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent transition-all"
                      value={calcForm.years}
                      onChange={e => setCalcForm({...calcForm, years: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Monthly EMI</p>
                      <p className="text-3xl font-bold font-mono text-accent">
                        {calcResults.emi.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Total Interest</p>
                        <p className="text-lg font-bold font-mono text-negative">
                          {calcResults.totalInterest.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Total Payment</p>
                        <p className="text-lg font-bold font-mono text-positive">
                          {calcResults.totalRepayment.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/5 border border-accent/10">
                    <Info className="w-5 h-5 text-accent shrink-0" />
                    <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                      The total interest paid is <span className="text-white">{Math.round((calcResults.totalInterest / calcResults.totalRepayment) * 100)}%</span> of your total repayment amount.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loan Comparison Modal */}
      <AnimatePresence>
        {isCompareOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCompareOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative glass-card max-w-4xl w-full overflow-hidden border-accent/30 shadow-[0_0_100px_rgba(124,110,250,0.1)]"
            >
              <div className="p-8 border-b border-white/5 bg-accent/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                    <ArrowLeftRight className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">Loan Comparison</h3>
                </div>
                <button title="Close" onClick={() => setIsCompareOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-white/20 hover:text-white" />
                </button>
              </div>

              <div className="p-8 overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="col-span-1" />
                    {compareList.map((item, idx) => (
                      <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="font-bold text-accent">Option {idx + 1}</h4>
                          {compareList.length > 2 && (
                            <button 
                              title="Remove option"
                              onClick={() => setCompareList(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 hover:bg-white/5 rounded text-white/20 hover:text-negative"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Principal</label>
                            <input 
                              type="number" 
                              title="Principal"
                              placeholder="e.g. 100000"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                              value={item.principal}
                              onChange={e => {
                                const newList = [...compareList];
                                newList[idx].principal = e.target.value;
                                setCompareList(newList);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Rate (%)</label>
                            <input 
                              type="number" 
                              title="Interest rate"
                              placeholder="e.g. 8.5"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                              value={item.rate}
                              onChange={e => {
                                const newList = [...compareList];
                                newList[idx].rate = e.target.value;
                                setCompareList(newList);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Years</label>
                            <input 
                              type="number" 
                              title="Tenure in years"
                              placeholder="e.g. 5"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                              value={item.years}
                              onChange={e => {
                                const newList = [...compareList];
                                newList[idx].years = e.target.value;
                                setCompareList(newList);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {compareList.length < 3 && (
                      <button 
                        onClick={() => setCompareList([...compareList, { principal: '10000', rate: '8', years: '5' }])}
                        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all group"
                      >
                        <Plus className="w-6 h-6 text-white/10 group-hover:text-accent transition-colors" />
                        <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest group-hover:text-accent">Add Option</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-6 items-center p-4 rounded-xl bg-white/[0.02]">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Monthly EMI</span>
                      {compareList.map((item, idx) => {
                        const emi = calculateEMI(parseFloat(item.principal) || 0, parseFloat(item.rate) || 0, parseFloat(item.years) || 0);
                        return (
                          <span key={idx} className="text-lg font-bold font-mono text-white">
                            {emi.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                          </span>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-6 items-center p-4 rounded-xl">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Total Interest</span>
                      {compareList.map((item, idx) => {
                        const emi = calculateEMI(parseFloat(item.principal) || 0, parseFloat(item.rate) || 0, parseFloat(item.years) || 0);
                        const total = emi * (parseFloat(item.years) || 0) * 12;
                        const interest = total - (parseFloat(item.principal) || 0);
                        return (
                          <span key={idx} className="text-lg font-bold font-mono text-negative">
                            {interest.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                          </span>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-6 items-center p-4 rounded-xl bg-white/[0.02]">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Total Repayment</span>
                      {compareList.map((item, idx) => {
                        const emi = calculateEMI(parseFloat(item.principal) || 0, parseFloat(item.rate) || 0, parseFloat(item.years) || 0);
                        const total = emi * (parseFloat(item.years) || 0) * 12;
                        return (
                          <span key={idx} className="text-lg font-bold font-mono text-positive">
                            {total.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Make Payment Modal */}
      <AnimatePresence>
        {selectedLoanForPayment && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLoanForPayment(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative glass-card max-w-md w-full overflow-hidden border-white/10 shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white/60" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">Make Payment</h3>
                </div>
                <button title="Close" onClick={() => setSelectedLoanForPayment(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-white/20 hover:text-white" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Payment Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-mono">$</span>
                    <input 
                      type="number" 
                      title="Payment amount"
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 outline-none focus:border-accent transition-all font-mono text-lg"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-white/20">Standard EMI: ${selectedLoanForPayment.monthlyEMI}</p>
                </div>

                <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Impact</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Paying more than your EMI will directly reduce your principal balance, saving you interest over the long term and shortening your loan tenure.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setSelectedLoanForPayment(null)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 font-bold hover:bg-white/10 transition-all text-white/40"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleMakePayment}
                    className="flex-[2] py-4 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Amortization Schedule Modal */}
      <AnimatePresence>
        {selectedLoanForSchedule && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLoanForSchedule(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative glass-card max-w-4xl w-full overflow-hidden border-white/10 shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white/60" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Amortization Schedule</h3>
                    <p className="text-xs text-white/40 font-medium">{selectedLoanForSchedule.name} • {selectedLoanForSchedule.interestRate}% APR</p>
                  </div>
                </div>
                <button title="Close" onClick={() => setSelectedLoanForSchedule(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-white/20 hover:text-white" />
                </button>
              </div>

              <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] sticky top-0 z-10">
                      <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Month</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">EMI</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Principal</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Interest</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generateAmortizationSchedule(selectedLoanForSchedule).map((row) => (
                      <tr key={row.month} className={cn(
                        "border-b border-white/5 hover:bg-white/[0.02] transition-colors",
                        row.status === 'Paid' && "bg-positive/[0.02]"
                      )}>
                        <td className="px-8 py-4 text-xs font-mono text-white/40">{row.month}</td>
                        <td className="px-8 py-4">
                          <span className={cn(
                            "text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                            row.status === 'Paid' ? "bg-positive/10 text-positive" : "bg-white/5 text-white/30"
                          )}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-xs font-bold font-mono">
                          {row.payment.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </td>
                        <td className="px-8 py-4 text-xs font-mono text-positive">
                          {row.principal.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </td>
                        <td className="px-8 py-4 text-xs font-mono text-negative">
                          {row.interest.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </td>
                        <td className="px-8 py-4 text-xs font-mono text-right">
                          {row.balance.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-white/20" />
                <p className="text-[10px] text-white/20 font-medium">Showing first 120 months (10 years) of the schedule. Actual schedule length depends on loan tenure.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


