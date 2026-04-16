import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../lib/utils';
import { 
  Calendar, 
  AlertTriangle, 
  Pause, 
  Play, 
  Trash2, 
  Edit2, 
  ChevronDown, 
  Search, 
  Filter, 
  ArrowUpDown, 
  History, 
  CreditCard, 
  Info, 
  Sparkles,
  TrendingUp,
  Plus,
  ExternalLink,
  X,
  CheckCircle2
} from 'lucide-react';
import { RecurringPayment } from '../types';

export const RecurringPage: React.FC = () => {
  const { recurringPayments, updateRecurringPayment, deleteRecurringPayment, addRecurringPayment } = useFinance();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Paused'>('All');
  const [editingPayment, setEditingPayment] = useState<RecurringPayment | null>(null);
  const [viewingDetails, setViewingDetails] = useState<RecurringPayment | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<RecurringPayment>>({
    name: '',
    amount: 0,
    date: 1,
    category: 'Entertainment',
    frequency: 'Monthly',
    status: 'Active',
    paymentMethod: '',
    description: ''
  });

  const totalMonthly = recurringPayments
    .filter(p => p.status === 'Active')
    .reduce((acc, p) => acc + p.amount, 0);

  const filteredAndSortedPayments = useMemo(() => {
    return recurringPayments
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
        else if (sortBy === 'amount') comparison = a.amount - b.amount;
        else if (sortBy === 'date') comparison = a.date - b.date;
        else if (sortBy === 'status') comparison = a.status.localeCompare(b.status);
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [recurringPayments, searchQuery, sortBy, sortOrder, filterStatus]);

  const handleToggleStatus = (payment: RecurringPayment) => {
    updateRecurringPayment(payment.id, { 
      status: payment.status === 'Active' ? 'Paused' : 'Active' 
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPayment) {
      updateRecurringPayment(editingPayment.id, editingPayment);
      setEditingPayment(null);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPayment.name && newPayment.amount) {
      addRecurringPayment({
        ...newPayment as RecurringPayment,
        id: `rec-${Date.now()}`,
        history: []
      });
      setIsAdding(false);
      setNewPayment({
        name: '',
        amount: 0,
        date: 1,
        category: 'Entertainment',
        frequency: 'Monthly',
        status: 'Active',
        paymentMethod: '',
        description: ''
      });
    }
  };

  const handleAddDetected = (name: string, amount: number) => {
    addRecurringPayment({
      id: `rec-${Date.now()}`,
      name,
      amount,
      date: 1,
      category: 'Entertainment',
      frequency: 'Monthly',
      status: 'Active',
      paymentMethod: 'Auto-detected',
      description: 'Automatically detected by Arta AI',
      history: []
    });
  };

  const runAudit = () => {
    setIsAuditing(true);
    setTimeout(() => setIsAuditing(false), 2000);
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
          <h1 className="text-4xl font-bold tracking-tight mb-2">Recurring</h1>
          <p className="text-white/40">Monitor your subscriptions and automated payments</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Subscription</span>
          </button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              type="text"
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-accent/50 transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
            <button 
              onClick={() => setFilterStatus('All')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                filterStatus === 'All' ? "bg-accent text-white shadow-lg violet-glow" : "text-white/40 hover:text-white"
              )}
            >
              All
            </button>
            <button 
              onClick={() => setFilterStatus('Active')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                filterStatus === 'Active' ? "bg-positive text-black" : "text-white/40 hover:text-white"
              )}
            >
              Active
            </button>
            <button 
              onClick={() => setFilterStatus('Paused')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                filterStatus === 'Paused' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              )}
            >
              Paused
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Payment Calendar</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-[10px] font-bold text-white/40 uppercase">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <span className="text-[10px] font-bold text-white/40 uppercase">Paused</span>
              </div>
            </div>
          </div>

          <div className="relative h-32 w-full bg-white/[0.02] rounded-2xl border border-white/5 flex items-center px-4 overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-31 gap-0 pointer-events-none">
              {Array.from({ length: 31 }).map((_, i) => (
                <div key={i} className="border-r border-white/5 h-full" />
              ))}
            </div>
            
            {recurringPayments.map((item) => (
              <div 
                key={item.id}
                style={{ left: `${((item.date - 1) / 30) * 100}%` }}
                className="absolute group cursor-pointer z-10"
                onClick={() => setViewingDetails(item)}
              >
                <motion.div 
                  whileHover={{ scale: 1.5 }}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 border-[#050508] transition-transform shadow-xl",
                    item.status === 'Active' ? "bg-accent violet-glow" : "bg-white/20"
                  )} 
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 pointer-events-none whitespace-nowrap glass-card p-3 text-[10px] font-bold z-20 border-accent/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white">{item.name}</span>
                    <span className="text-accent">${item.amount}</span>
                  </div>
                  <div className="text-white/40 font-mono">Day {item.date}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-1 text-[10px] font-mono text-white/20 uppercase tracking-widest">
            <span>Day 1</span>
            <span>Day 15</span>
            <span>Day 31</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-6 bg-accent/5 border-accent/20">
            <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-2">Monthly Commitment</p>
            <h2 className="text-4xl font-bold font-mono tracking-tighter mb-1">
              ${totalMonthly.toLocaleString()}
            </h2>
            <p className="text-xs text-white/40">Across {recurringPayments.filter(p => p.status === 'Active').length} active subscriptions</p>
          </div>
          <div className="glass-card p-6 bg-amber-500/5 border-amber-500/20">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-2">Upcoming (7 Days)</p>
            <h2 className="text-4xl font-bold font-mono tracking-tighter mb-1 text-amber-500">
              $94.00
            </h2>
            <p className="text-xs text-white/40">3 payments scheduled this week</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Subscription Ledger</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/20 uppercase">Sort by:</span>
              <button 
                onClick={() => {
                  if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('name'); setSortOrder('asc'); }
                }}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                  sortBy === 'name' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                )}
              >
                Name
                {sortBy === 'name' && <ArrowUpDown className="w-3 h-3" />}
              </button>
              <button 
                onClick={() => {
                  if (sortBy === 'amount') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('amount'); setSortOrder('asc'); }
                }}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                  sortBy === 'amount' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                )}
              >
                Amount
                {sortBy === 'amount' && <ArrowUpDown className="w-3 h-3" />}
              </button>
              <button 
                onClick={() => {
                  if (sortBy === 'date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('date'); setSortOrder('asc'); }
                }}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                  sortBy === 'date' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                )}
              >
                Date
                {sortBy === 'date' && <ArrowUpDown className="w-3 h-3" />}
              </button>
              <button 
                onClick={() => {
                  if (sortBy === 'status') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('status'); setSortOrder('asc'); }
                }}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                  sortBy === 'status' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                )}
              >
                Status
                {sortBy === 'status' && <ArrowUpDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-white/5">
              {filteredAndSortedPayments.map((item) => (
                <div key={item.id} className="group flex items-center gap-6 p-6 hover:bg-white/[0.02] transition-all relative">
                  <div 
                    className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl font-bold border border-white/5 cursor-pointer hover:border-accent/50 transition-colors"
                    onClick={() => setViewingDetails(item)}
                  >
                    {item.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingDetails(item)}>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-lg">{item.name}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-[8px] font-bold uppercase tracking-widest text-white/40">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-white/30">
                        <Calendar className="w-3 h-3" />
                        <span>Day {item.date}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <div className="flex items-center gap-1.5 text-xs text-white/30">
                        <CreditCard className="w-3 h-3" />
                        <span>{item.paymentMethod || 'Not set'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xl font-bold font-mono tracking-tighter">${item.amount}</p>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        item.status === 'Active' ? "text-positive" : "text-white/20"
                      )}>
                        {item.status}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={() => handleToggleStatus(item)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                        title={item.status === 'Active' ? 'Pause' : 'Resume'}
                      >
                        {item.status === 'Active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => setEditingPayment(item)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteRecurringPayment(item.id)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-negative/20 hover:text-negative transition-colors text-white/40"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredAndSortedPayments.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-white/10" />
                  </div>
                  <p className="text-white/40 font-medium">No subscriptions found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <section className="glass-card p-8 border-accent/20 bg-accent/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-24 h-24 text-accent" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold">AI Insights</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-accent/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Duplicate Alert</span>
                  </div>
                  <p className="text-xs font-medium mb-1">Potential duplicate found: Spotify & Apple Music.</p>
                  <p className="text-[10px] text-white/40">You spend $20.98 on similar services. Consider consolidating.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-positive/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-positive" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-positive">Optimization</span>
                  </div>
                  <p className="text-xs font-medium mb-1">Switch to Annual Plan for Netflix.</p>
                  <p className="text-[10px] text-white/40">Save $32.00/year by switching from monthly to annual billing.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-accent/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Unused Service</span>
                  </div>
                  <p className="text-xs font-medium mb-1">Gym membership unused for 45 days.</p>
                  <p className="text-[10px] text-white/40">You could save $45.00/month by cancelling or pausing this.</p>
                </div>
              </div>
              
              <button 
                onClick={runAudit}
                disabled={isAuditing}
                className="w-full mt-6 py-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAuditing ? (
                  <>
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-3 h-3" />
                    </motion.div>
                    Auditing...
                  </>
                ) : (
                  'Run Full Audit'
                )}
              </button>
            </div>
          </section>

          <section className="glass-card p-8 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold">Detected Subscriptions</h3>
            </div>
            <p className="text-xs text-white/60 mb-6">Arta AI found potential recurring payments in your recent activity.</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg font-bold">H</div>
                  <div>
                    <h4 className="font-bold text-sm">HBO Max</h4>
                    <p className="text-[10px] text-white/30">Detected 3x ($14.99)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAddDetected('HBO Max', 14.99)}
                    className="p-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Add Modal */}
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
                    <h3 className="text-2xl font-bold tracking-tight">New Subscription</h3>
                    <p className="text-xs text-white/40 uppercase font-bold tracking-widest mt-1">Add a recurring payment</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Name</label>
                  <input 
                    type="text"
                    required
                    value={newPayment.name}
                    onChange={(e) => setNewPayment({ ...newPayment, name: e.target.value })}
                    placeholder="e.g. Netflix"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Amount ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={newPayment.amount || ''}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-xl font-bold font-mono outline-none focus:border-accent/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Due Day (1-31)</label>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={newPayment.date}
                      onChange={(e) => setNewPayment({ ...newPayment, date: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-xl font-bold font-mono outline-none focus:border-accent/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={newPayment.category}
                    onChange={(e) => setNewPayment({ ...newPayment, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-bold text-sm appearance-none"
                  >
                    <option value="Entertainment" className="bg-[#050508]">Entertainment</option>
                    <option value="Housing" className="bg-[#050508]">Housing</option>
                    <option value="Health" className="bg-[#050508]">Health</option>
                    <option value="Utilities" className="bg-[#050508]">Utilities</option>
                    <option value="Shopping" className="bg-[#050508]">Shopping</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Payment Method</label>
                  <input 
                    type="text"
                    value={newPayment.paymentMethod || ''}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                    placeholder="e.g. Amex Platinum"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-medium"
                  />
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
                    Add Subscription
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingPayment && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPayment(null)}
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
                    <Edit2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Edit Subscription</h3>
                    <p className="text-xs text-white/40 uppercase font-bold tracking-widest mt-1">{editingPayment.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingPayment(null)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Amount ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingPayment.amount}
                      onChange={(e) => setEditingPayment({ ...editingPayment, amount: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-xl font-bold font-mono outline-none focus:border-accent/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Due Day (1-31)</label>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      value={editingPayment.date}
                      onChange={(e) => setEditingPayment({ ...editingPayment, date: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-xl font-bold font-mono outline-none focus:border-accent/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={editingPayment.category}
                    onChange={(e) => setEditingPayment({ ...editingPayment, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-bold text-sm appearance-none"
                  >
                    <option value="Entertainment" className="bg-[#050508]">Entertainment</option>
                    <option value="Housing" className="bg-[#050508]">Housing</option>
                    <option value="Health" className="bg-[#050508]">Health</option>
                    <option value="Utilities" className="bg-[#050508]">Utilities</option>
                    <option value="Shopping" className="bg-[#050508]">Shopping</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Payment Method</label>
                  <input 
                    type="text"
                    value={editingPayment.paymentMethod || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, paymentMethod: e.target.value })}
                    placeholder="e.g. Amex Platinum"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    value={editingPayment.description || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, description: e.target.value })}
                    placeholder="Add a brief description..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-medium resize-none h-24"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingPayment(null)}
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

      {/* Details Modal */}
      <AnimatePresence>
        {viewingDetails && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingDetails(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-card p-0 border-accent/30 bg-card/90 shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 bg-accent/5 relative">
                <div className="absolute top-0 right-0 p-8">
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    viewingDetails.status === 'Active' ? "bg-positive/20 text-positive border border-positive/30" : "bg-white/10 text-white/40 border border-white/10"
                  )}>
                    {viewingDetails.status}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-accent/20 flex items-center justify-center text-3xl font-bold text-accent border border-accent/30 violet-glow">
                    {viewingDetails.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight mb-1">{viewingDetails.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white/40">{viewingDetails.category}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-sm text-white/40">{viewingDetails.frequency} billing</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4">Subscription Details</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-sm text-white/40">Amount</span>
                        <span className="text-lg font-bold font-mono text-accent">${viewingDetails.amount}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-sm text-white/40">Next Due Date</span>
                        <span className="text-sm font-bold">April {viewingDetails.date}, 2024</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-sm text-white/40">Payment Method</span>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-white/20" />
                          <span className="text-sm font-bold">{viewingDetails.paymentMethod || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4">Description</h4>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {viewingDetails.description || 'No description provided for this subscription.'}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Payment History</h4>
                    <History className="w-4 h-4 text-white/20" />
                  </div>
                  <div className="space-y-3">
                    {viewingDetails.history?.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-positive/10 flex items-center justify-center text-positive">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">{entry.date}</p>
                            <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">{entry.status}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold font-mono">${entry.amount}</span>
                      </div>
                    )) || (
                      <div className="text-center py-8 bg-white/2 rounded-xl border border-dashed border-white/10">
                        <p className="text-xs text-white/20">No payment history available</p>
                      </div>
                    )}
                  </div>
                  <button className="w-full mt-6 py-3 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    View All Transactions
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-8 bg-white/2 border-t border-white/5 flex gap-4">
                <button 
                  onClick={() => { setEditingPayment(viewingDetails); setViewingDetails(null); }}
                  className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Subscription
                </button>
                <button 
                  onClick={() => setViewingDetails(null)}
                  className="flex-1 py-4 rounded-xl bg-accent text-white font-bold uppercase tracking-widest hover:bg-accent/80 transition-all shadow-lg violet-glow"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
