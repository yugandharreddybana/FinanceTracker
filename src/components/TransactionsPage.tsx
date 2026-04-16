import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Sparkles, Check, Edit2, Trash2, X, Save, Loader2, Calendar, ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight, Download, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import { Transaction } from '../types';

export const TransactionsPage: React.FC = () => {
  const { 
    transactions, 
    deleteTransaction, 
    updateTransaction, 
    bulkUpdateTransactions,
    categorizeTransactions, 
    confirmCategory, 
    suggestions, 
    isCategorizing,
    accounts,
    addManualTransaction,
    isAddTransactionModalOpen,
    setIsAddTransactionModalOpen
  } = useFinance();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTransactionForm, setNewTransactionForm] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    amount: 0,
    category: 'Others',
    type: 'expense',
    account: accounts[0]?.name || 'Main Current'
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState('All Time');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'merchant' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'date' | 'merchant' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedTransactions.map(t => t.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategory || selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    await bulkUpdateTransactions(selectedIds, { category: bulkCategory });
    setSelectedIds([]);
    setBulkCategory('');
    setIsBulkUpdating(false);
  };

  const handleBulkMarkReviewed = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    await bulkUpdateTransactions(selectedIds, { status: 'confirmed', aiTag: 'Reviewed' });
    setSelectedIds([]);
    setIsBulkUpdating(false);
  };

  const handleAddTransaction = async () => {
    if (!newTransactionForm.merchant || !newTransactionForm.amount) return;
    await addManualTransaction(newTransactionForm);
    setIsAddTransactionModalOpen(false);
    setNewTransactionForm({
      date: new Date().toISOString().split('T')[0],
      merchant: '',
      amount: 0,
      category: 'Others',
      type: 'expense',
      account: accounts[0]?.name || 'Main Current'
    });
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm(tx);
  };

  const handleSave = () => {
    if (editingId) {
      updateTransaction(editingId, editForm);
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    setDeleteConfirmId(null);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Merchant', 'Category', 'Amount', 'Type', 'Account', 'Status'];
    const csvContent = [
      headers.join(','),
      ...sortedTransactions.map(t => [
        t.date,
        `"${t.merchant.replace(/"/g, '""')}"`,
        t.category,
        t.amount,
        t.type,
        t.account,
        t.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'All Time') return matchesSearch;
    if (filter === 'Food') return matchesSearch && tx.category === 'Food & Drink';
    if (filter === 'Transport') return matchesSearch && tx.category === 'Transport';
    if (filter === 'Entertainment') return matchesSearch && tx.category === 'Entertainment';
    
    if (filter === 'Custom Range') {
      if (!startDate || !endDate) return matchesSearch;
      const txDate = new Date(tx.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the end day
      return matchesSearch && txDate >= start && txDate <= end;
    }

    // Simple date filtering for demo
    const txDate = new Date(tx.date);
    const now = new Date();
    if (filter === 'This Month') {
      return matchesSearch && txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    if (filter === 'Last Month') {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return matchesSearch && txDate.getMonth() === lastMonth && txDate.getFullYear() === year;
    }
    
    return matchesSearch;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortField === 'merchant') {
      comparison = a.merchant.localeCompare(b.merchant);
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto relative min-h-[calc(100vh-100px)]"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-3 font-display">Transactions</h1>
          <p className="text-white/40 font-medium">Manage and categorize your financial activity with AI precision</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddTransactionModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
          <button 
            onClick={categorizeTransactions}
            disabled={isCategorizing || transactions.filter(t => t.category === 'Uncategorized' || (t.confidence && t.confidence < 0.8)).length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-sm font-bold text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {isCategorizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Auto-Categorize</span>
          </button>
          <button 
            onClick={() => setFilter('All Time')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Filter className="w-4 h-4" />
            <span>Reset Filters</span>
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all",
                showSearch ? "bg-accent/10 border-accent/30 text-accent" : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
            <AnimatePresence>
              {showSearch && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-64 z-50"
                >
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Search merchant or category..."
                    className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent shadow-2xl"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-10">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar items-center flex-1">
          {['All Time', 'This Month', 'Last Month', 'Food', 'Transport', 'Entertainment'].map((chip) => (
            <button 
              key={chip} 
              onClick={() => {
                setFilter(chip);
                setShowDatePicker(false);
              }}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                filter === chip ? "bg-accent/10 border-accent/30 text-accent" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
        
        <div className="relative shrink-0">
          <button 
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2",
              filter === 'Custom Range' 
                ? "bg-accent text-white border-accent shadow-[0_0_20px_rgba(124,110,250,0.3)]" 
                : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Custom Range</span>
            {filter === 'Custom Range' && startDate && endDate && (
              <span className="text-[10px] opacity-80 font-mono">({startDate} - {endDate})</span>
            )}
          </button>
          
          <AnimatePresence>
            {showDatePicker && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-3 p-6 glass-card z-[100] w-80 border-accent/30 shadow-2xl bg-card/95 backdrop-blur-xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-accent">Select Range</h4>
                  <button 
                    onClick={() => setShowDatePicker(false)}
                    className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white/20" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block ml-1">Start Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-all text-white"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block ml-1">End Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-all text-white"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setFilter('All Time');
                        setShowDatePicker(false);
                      }}
                      className="flex-1 py-3 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={() => {
                        if (startDate && endDate) {
                          setFilter('Custom Range');
                          setShowDatePicker(false);
                        }
                      }}
                      disabled={!startDate || !endDate}
                      className="flex-[2] py-3 bg-accent text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-accent/80 transition-all disabled:opacity-50 shadow-lg violet-glow"
                    >
                      Apply Range
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="glass-card overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-5 w-10">
                  <button 
                    onClick={toggleSelectAll}
                    className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center transition-all",
                      selectedIds.length === sortedTransactions.length && sortedTransactions.length > 0
                        ? "bg-accent border-accent text-white" 
                        : "border-white/20 hover:border-white/40"
                    )}
                  >
                    {selectedIds.length === sortedTransactions.length && sortedTransactions.length > 0 && <Check className="w-3 h-3" />}
                  </button>
                </th>
                <th 
                  className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortField === 'date' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th 
                  className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('merchant')}
                >
                  <div className="flex items-center gap-2">
                    Merchant
                    {sortField === 'merchant' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Category</th>
                <th className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Bank Account</th>
                <th 
                  className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Amount
                    {sortField === 'amount' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">AI Intelligence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedTransactions.map((tx, i) => (
                <React.Fragment key={tx.id}>
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => {
                    if (editingId !== tx.id) {
                      setExpandedId(expandedId === tx.id ? null : tx.id);
                    }
                  }}
                  className={cn(
                    "group hover:bg-white/[0.03] transition-all cursor-pointer",
                    editingId === tx.id && "bg-accent/5",
                    expandedId === tx.id && "bg-white/[0.02]",
                    selectedIds.includes(tx.id) && "bg-accent/5"
                  )}
                >
                  <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => toggleSelect(tx.id)}
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-all",
                        selectedIds.includes(tx.id) ? "bg-accent border-accent text-white" : "border-white/20 hover:border-white/40"
                      )}
                    >
                      {selectedIds.includes(tx.id) && <Check className="w-3 h-3" />}
                    </button>
                  </td>
                  <td className="px-8 py-5 text-sm text-white/40 font-mono font-medium">
                    {editingId === tx.id ? (
                      <input 
                        type="date" 
                        onClick={e => e.stopPropagation()}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-accent"
                        value={editForm.date}
                        onChange={e => setEditForm({...editForm, date: e.target.value})}
                      />
                    ) : tx.date}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-sm font-bold border border-white/5 group-hover:border-accent/30 transition-all group-hover:scale-105">
                          {tx.merchant.charAt(0)}
                        </div>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-md flex items-center justify-center border border-background",
                          tx.amount > 0 ? "bg-positive text-background" : "bg-negative text-white"
                        )}>
                          {tx.amount > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                      {editingId === tx.id ? (
                        <input 
                          type="text" 
                          onClick={e => e.stopPropagation()}
                          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-accent font-bold"
                          value={editForm.merchant}
                          onChange={e => setEditForm({...editForm, merchant: e.target.value})}
                        />
                      ) : (
                        <span className="font-bold text-white group-hover:text-accent transition-colors">{tx.merchant}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {editingId === tx.id ? (
                      <div className="relative">
                        <select 
                          onClick={e => e.stopPropagation()}
                          className="appearance-none bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs outline-none focus:border-accent pr-8 w-full font-medium"
                          value={editForm.category}
                          onChange={e => setEditForm({...editForm, category: e.target.value})}
                        >
                          {['Housing', 'Food & Drink', 'Transport', 'Entertainment', 'Shopping', 'Electronics', 'Utilities', 'Health', 'Education', 'Others', 'Uncategorized'].map(c => (
                            <option key={c} value={c} className="bg-[#050508] text-white">{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all",
                            tx.category === 'Uncategorized' ? "bg-white/5 border-white/5 text-white/20" : 
                            (tx.confidence && tx.confidence < 0.8) ? "bg-negative/10 border-negative/30 text-negative" :
                            "bg-accent/10 border-accent/20 text-accent"
                          )}>
                            {tx.category}
                          </span>
                          {tx.confidence && (
                            <span className={cn(
                              "text-[9px] font-mono font-bold",
                              tx.confidence < 0.8 ? "text-negative" : "text-white/20"
                            )}>
                              {Math.round(tx.confidence * 100)}%
                            </span>
                          )}
                        </div>

                        {suggestions[tx.id] && (
                          <div className="flex flex-col gap-2">
                            {suggestions[tx.id].map((suggestion, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={cn(
                                  "flex items-center gap-2 border px-2 py-1.5 rounded-lg",
                                  suggestion.confidence < 0.8 ? "bg-negative/10 border-negative/20" : "bg-accent/10 border-accent/20"
                                )}
                              >
                                <div className="flex flex-col">
                                  <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-widest",
                                    suggestion.confidence < 0.8 ? "text-negative" : "text-accent"
                                  )}>
                                    {suggestion.category}
                                  </span>
                                  <span className="text-[8px] font-mono opacity-60">
                                    {Math.round(suggestion.confidence * 100)}%
                                  </span>
                                </div>
                                <div className="flex gap-1 ml-auto">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirmCategory(tx.id, suggestion.category);
                                    }}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                    title="Confirm"
                                  >
                                    <Check className="w-3 h-3 text-positive" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                            <div className="flex items-center gap-2 ml-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(tx);
                                }}
                                className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                <span>Edit Manually</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    {editingId === tx.id ? (
                      <div className="relative">
                        <select 
                          onClick={e => e.stopPropagation()}
                          className="appearance-none bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs outline-none focus:border-accent pr-8 w-full font-medium"
                          value={editForm.account || ''}
                          onChange={e => setEditForm({...editForm, account: e.target.value})}
                        >
                          <option value="" className="bg-[#050508] text-white">Select Account</option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.name} className="bg-[#050508] text-white">{a.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-white/60">{tx.account || 'Unknown'}</span>
                    )}
                  </td>
                  <td className={cn(
                    "px-8 py-5 font-mono font-bold text-right text-lg tracking-tighter",
                    tx.amount > 0 ? "text-positive" : "text-white"
                  )}>
                    {editingId === tx.id ? (
                      <input 
                        type="number" 
                        onClick={e => e.stopPropagation()}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm outline-none focus:border-accent font-bold w-24"
                        value={editForm.amount}
                        onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                      />
                    ) : (
                      <>{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-US', { style: 'currency', currency: tx.currency || 'USD' })}</>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      {editingId === tx.id ? (
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <input 
                              type="text"
                              onClick={e => e.stopPropagation()}
                              placeholder="AI Tag"
                              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-accent font-bold uppercase tracking-widest w-24"
                              value={editForm.aiTag || ''}
                              onChange={e => setEditForm({...editForm, aiTag: e.target.value})}
                            />
                            <Sparkles className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-accent opacity-50 pointer-events-none" />
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              onClick={e => e.stopPropagation()}
                              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-accent font-mono w-16"
                              value={editForm.confidence || 0}
                              onChange={e => setEditForm({...editForm, confidence: parseFloat(e.target.value)})}
                            />
                            <span className="text-[8px] text-white/30 font-bold uppercase">Conf.</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {tx.aiTag && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/5 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest violet-glow">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{tx.aiTag}</span>
                            </div>
                          )}
                          {tx.confidence && (
                            <span className="text-[10px] font-mono font-bold text-white/20">
                              {Math.round(tx.confidence * 100)}%
                            </span>
                          )}
                        </>
                      )}
                      <div className={cn(
                        "flex gap-2 transition-all",
                        editingId === tx.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                      )}>
                        {editingId === tx.id ? (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-1.5 rounded-lg bg-positive/20 text-positive hover:bg-positive/30 transition-all"><Save className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(tx); }} className="p-1.5 rounded-lg hover:bg-accent/10 hover:text-accent transition-all"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(tx.id); }} className="p-1.5 rounded-lg hover:bg-negative/10 hover:text-negative transition-all"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </motion.tr>
                <AnimatePresence>
                  {expandedId === tx.id && (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white/[0.01] border-b border-white/5"
                    >
                      <td colSpan={7} className="p-0">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-8 py-6 flex flex-wrap gap-8 text-sm border-t border-white/5">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Account</span>
                              <span className="text-white/80 font-medium">{tx.account || 'Not specified'}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">AI Tag</span>
                              <span className="text-white/80 font-medium">{tx.aiTag || 'None'}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Confidence</span>
                              <span className="text-white/80 font-medium">{tx.confidence ? `${Math.round(tx.confidence * 100)}%` : 'N/A'}</span>
                            </div>
                            {tx.savingsGoalId && (
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Savings Goal ID</span>
                                <span className="text-white/80 font-medium font-mono text-xs">{tx.savingsGoalId}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] w-full max-w-2xl px-6"
          >
            <div className="glass-card p-4 flex items-center justify-between shadow-2xl border-accent/30 bg-card/90 backdrop-blur-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-accent text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg violet-glow">
                  {selectedIds.length}
                </div>
                <span className="text-sm font-bold text-white/80">Transactions Selected</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <select 
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-accent pr-10 text-white/70"
                  >
                    <option value="" className="bg-[#050508]">Bulk Categorize...</option>
                    {['Housing', 'Food & Drink', 'Transport', 'Entertainment', 'Shopping', 'Electronics', 'Utilities', 'Health', 'Education', 'Others'].map(c => (
                      <option key={c} value={c} className="bg-[#050508]">{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>

                <button 
                  onClick={handleBulkCategorize}
                  disabled={!bulkCategory || isBulkUpdating}
                  className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent/80 transition-all disabled:opacity-50"
                >
                  Apply
                </button>

                <div className="w-px h-6 bg-white/10 mx-1" />

                <button 
                  onClick={handleBulkMarkReviewed}
                  disabled={isBulkUpdating}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-xs font-bold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Reviewed</span>
                </button>

                <button 
                  onClick={() => setSelectedIds([])}
                  className="p-2 text-white/20 hover:text-negative transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative glass-card p-8 max-w-md w-full border-negative/30"
            >
              <h3 className="text-2xl font-bold mb-4">Delete Transaction?</h3>
              <p className="text-white/60 mb-8">This action cannot be undone. Are you sure you want to remove this transaction from your history?</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 font-bold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                  className="flex-1 py-3 rounded-xl bg-negative text-white font-bold hover:bg-negative/80 transition-all shadow-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAddTransactionModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddTransactionModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative glass-card max-w-lg w-full overflow-hidden border-white/10 shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Add Transaction</h3>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Manual Entry</p>
                </div>
                <button 
                  onClick={() => setIsAddTransactionModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-white/20" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block ml-1">Type</label>
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                      <button 
                        onClick={() => setNewTransactionForm({ ...newTransactionForm, type: 'expense' })}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                          newTransactionForm.type === 'expense' ? "bg-negative text-white shadow-lg" : "text-white/40 hover:text-white"
                        )}
                      >
                        Expense
                      </button>
                      <button 
                        onClick={() => setNewTransactionForm({ ...newTransactionForm, type: 'income' })}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                          newTransactionForm.type === 'income' ? "bg-positive text-white shadow-lg" : "text-white/40 hover:text-white"
                        )}
                      >
                        Income
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block ml-1">Date <span className="text-accent">*</span></label>
                    <input 
                      type="date"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-all text-white"
                      value={newTransactionForm.date}
                      onChange={e => setNewTransactionForm({ ...newTransactionForm, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block ml-1">Merchant / Description <span className="text-accent">*</span></label>
                  <input 
                    type="text"
                    placeholder="e.g. Starbucks, Amazon, Salary"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-all text-white"
                    value={newTransactionForm.merchant}
                    onChange={e => setNewTransactionForm({ ...newTransactionForm, merchant: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block ml-1">Amount <span className="text-accent">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-bold">$</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-accent transition-all font-mono text-white"
                        value={newTransactionForm.amount || ''}
                        onChange={e => setNewTransactionForm({ ...newTransactionForm, amount: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block ml-1">Category <span className="text-accent">*</span></label>
                    <div className="relative">
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-all appearance-none text-white"
                        value={newTransactionForm.category}
                        onChange={e => setNewTransactionForm({ ...newTransactionForm, category: e.target.value })}
                      >
                        {['Housing', 'Food & Drink', 'Transport', 'Entertainment', 'Shopping', 'Electronics', 'Utilities', 'Health', 'Education', 'Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Others'].map(c => (
                          <option key={c} value={c} className="bg-[#050508]">{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block ml-1">Account <span className="text-accent">*</span></label>
                  <div className="relative">
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-all appearance-none text-white"
                      value={newTransactionForm.account}
                      onChange={e => setNewTransactionForm({ ...newTransactionForm, account: e.target.value })}
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.name} className="bg-[#050508]">{a.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => setIsAddTransactionModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/5 text-white/40 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddTransaction}
                    disabled={!newTransactionForm.merchant || !newTransactionForm.amount}
                    className="flex-[2] py-4 rounded-2xl bg-accent text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-accent/80 transition-all shadow-lg violet-glow disabled:opacity-50"
                  >
                    Add Transaction
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
