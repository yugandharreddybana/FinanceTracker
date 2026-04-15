import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ExternalLink, RefreshCw, Shield, Lock, Globe, X, ChevronRight, Landmark, CreditCard, Wallet as WalletIcon, Check, ChevronDown } from 'lucide-react';
import { MOCK_ACCOUNTS } from '../constants';
import { cn } from '../lib/utils';
import { BankAccount } from '../types';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFinance } from '../context/FinanceContext';

const sparklineData = Array.from({ length: 20 }, (_, i) => ({ value: Math.random() * 100 }));

export const BankAccountsPage: React.FC = () => {
  const { accounts, addAccount, transactions, netWorthByCurrency } = useFinance();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [manualForm, setManualForm] = useState({ bank: '', name: '', balance: '', type: 'Current' as any, currency: 'USD' });
  const [transactionFilter, setTransactionFilter] = useState('');

  const currencies = Object.keys(netWorthByCurrency);
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] || 'USD');
  
  const netWorth = netWorthByCurrency[selectedCurrency] || { total: 0, assets: 0, liabilities: 0, change: 0 };

  const creditUtilization = accounts
    .filter(a => a.type === 'Credit' && (a.currency || 'USD') === selectedCurrency)
    .reduce((acc, a) => acc + Math.abs(a.balance), 0);

  const handleManualSubmit = () => {
    if (!manualForm.bank || !manualForm.balance) return;
    addAccount({
      id: `manual-${Date.now()}`,
      name: manualForm.name || manualForm.bank,
      bank: manualForm.bank,
      balance: Number(manualForm.balance),
      type: manualForm.type,
      currency: manualForm.currency || 'USD',
      color: '#7C6EFA',
      lastSynced: 'Just now'
    });
    setIsManual(false);
    setIsConnecting(false);
    setManualForm({ bank: '', name: '', balance: '', type: 'Current', currency: 'USD' });
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
          <h1 className="text-5xl font-bold tracking-tighter mb-3 font-display">Bank Accounts</h1>
          <p className="text-white/40 font-medium">Manage and monitor your connected financial institutions</p>
        </div>
        <div className="flex items-center gap-4">
          {currencies.length > 1 && (
            <div className="relative">
              <select
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {[
          { label: 'Total Liquidity', value: netWorth.assets.toLocaleString('en-US', { style: 'currency', currency: selectedCurrency }), color: 'text-white' },
          { label: 'Credit Utilization', value: creditUtilization.toLocaleString('en-US', { style: 'currency', currency: selectedCurrency }), color: 'text-negative' },
          { label: 'Active Links', value: `${accounts.length} Institutions`, color: 'text-positive' }
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 flex flex-col items-center justify-center text-center group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">{stat.label}</span>
            <span className={cn("text-3xl font-bold font-mono tracking-tighter", stat.color)}>{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {accounts.map((account, i) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -8 }}
            className="glass-card p-8 relative group overflow-hidden border-white/5 hover:border-accent/30"
          >
            {/* Mesh Gradient Background */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700">
              <div 
                className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] blur-[80px] rounded-full" 
                style={{ backgroundColor: account.color }}
              />
            </div>
            
            <div 
              className="absolute top-0 left-0 w-full h-1.5 opacity-60" 
              style={{ backgroundColor: account.color }}
            />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl font-bold border border-white/5 group-hover:border-white/20 transition-all">
                  {account.bank.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">{account.name}</h3>
                  <p className="text-xs text-white/30 font-medium">{account.bank}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                {account.type}
              </span>
            </div>

            <div className="mb-8 relative z-10">
              <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Available Balance</p>
              <h4 className="text-4xl font-bold font-mono tracking-tighter">
                {account.balance.toLocaleString('en-US', { style: 'currency', currency: account.currency || 'USD' })}
              </h4>
            </div>

            <div className="h-20 w-full mb-8 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id={`grad-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={account.color} stopOpacity={0.4}/>
                      <stop offset="100%" stopColor={account.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={account.color} 
                    fill={`url(#grad-${account.id})`} 
                    strokeWidth={3}
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-white/5 relative z-10">
              <div className="flex items-center gap-2 text-[10px] text-white/20 uppercase font-bold tracking-widest">
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>{account.lastSynced}</span>
              </div>
              <button 
                onClick={() => setSelectedAccount(account)}
                className="flex items-center gap-2 text-[10px] text-accent font-bold uppercase tracking-[0.2em] hover:text-white transition-colors group/btn"
              >
                <span>Details</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => setIsConnecting(true)}
          className="glass-card p-8 flex flex-col items-center justify-center text-center border-dashed border-white/20 hover:border-accent/50 transition-all cursor-pointer group min-h-[300px] bg-white/[0.01]"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-all group-hover:scale-110">
            <Plus className="w-8 h-8 text-white/20 group-hover:text-accent transition-colors" />
          </div>
          <h3 className="font-bold text-lg mb-2">Connect Account</h3>
          <p className="text-xs text-white/30 font-medium max-w-[180px]">Securely link your bank via encrypted Open Banking</p>
        </motion.div>
      </div>

      {/* Account Details Modal */}
      <AnimatePresence>
        {selectedAccount && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAccount(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative glass-card max-w-4xl w-full overflow-hidden border-accent/30 shadow-[0_0_100px_rgba(124,110,250,0.2)]"
            >
              <div className="p-8 border-b border-white/5 bg-accent/5 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold border shadow-lg"
                    style={{ 
                      backgroundColor: `${selectedAccount.color}15`, 
                      borderColor: `${selectedAccount.color}30`,
                      color: selectedAccount.color 
                    }}
                  >
                    {selectedAccount.bank.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight">{selectedAccount.name}</h3>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{selectedAccount.bank} • {selectedAccount.type} Account</p>
                  </div>
                </div>
                <button onClick={() => setSelectedAccount(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-white/20 hover:text-white" />
                </button>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="glass-card p-6 bg-white/[0.02]">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Current Balance</p>
                    <p className="text-3xl font-bold font-mono tracking-tighter">
                      ${selectedAccount.balance.toLocaleString()}
                    </p>
                  </div>
                  <div className="glass-card p-6 bg-positive/5 border-positive/10">
                    <p className="text-[10px] font-bold text-positive uppercase tracking-widest mb-2">Income So Far</p>
                    <p className="text-3xl font-bold font-mono tracking-tighter text-positive">
                      +${transactions
                        .filter(t => t.account === selectedAccount.name && t.type === 'income')
                        .reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="glass-card p-6 bg-negative/5 border-negative/10">
                    <p className="text-[10px] font-bold text-negative uppercase tracking-widest mb-2">Expense So Far</p>
                    <p className="text-3xl font-bold font-mono tracking-tighter text-negative">
                      -${transactions
                        .filter(t => t.account === selectedAccount.name && t.type === 'expense')
                        .reduce((acc, t) => acc + Math.abs(t.amount), 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mb-10 glass-card p-6 border-white/5">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-6">Income vs Expense (Last 7 Days)</h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={Array.from({ length: 7 }).map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (6 - i));
                          const dateStr = d.toISOString().split('T')[0];
                          const dayTransactions = transactions.filter(t => t.account === selectedAccount.name && t.date === dateStr);
                          return {
                            date: d.toLocaleDateString('default', { weekday: 'short' }),
                            income: dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
                            expense: dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Math.abs(t.amount), 0)
                          };
                        })}
                        margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0F0F19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="income" fill="#22D3A5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">Recent Transactions</h4>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Filter transactions..."
                        value={transactionFilter}
                        onChange={(e) => setTransactionFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-4 text-xs outline-none focus:border-accent/50 transition-all w-64"
                      />
                    </div>
                  </div>

                  <div className="glass-card overflow-hidden border-white/5">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-[#0A0A0B]">
                          <tr className="border-b border-white/5">
                            <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Merchant</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Category</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions
                            .filter(t => t.account === selectedAccount.name)
                            .filter(t => 
                              t.merchant.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                              t.category.toLowerCase().includes(transactionFilter.toLowerCase())
                            )
                            .map((t, i) => (
                              <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 text-xs font-mono text-white/40">{t.date}</td>
                                <td className="px-6 py-4 text-sm font-bold">{t.merchant}</td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                    {t.category}
                                  </span>
                                </td>
                                <td className={cn(
                                  "px-6 py-4 text-sm font-bold font-mono text-right",
                                  t.type === 'expense' ? "text-negative" : "text-positive"
                                )}>
                                  {t.type === 'expense' ? '-' : '+'}${Math.abs(t.amount).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Connect Account Modal */}
      <AnimatePresence>
        {isConnecting && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConnecting(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative glass-card max-w-2xl w-full overflow-hidden border-accent/30 shadow-[0_0_100px_rgba(124,110,250,0.2)]"
            >
              <div className="p-8 border-b border-white/5 bg-accent/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center violet-glow">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Secure Connection</h3>
                    <p className="text-[10px] text-accent font-bold uppercase tracking-widest">Powered by Arta Open Banking</p>
                  </div>
                </div>
                <button onClick={() => setIsConnecting(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-white/20 hover:text-white" />
                </button>
              </div>

              <div className="p-8">
                <AnimatePresence mode="wait">
                  {!isManual ? (
                    <motion.div
                      key="auto"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-6">
                          <h4 className="font-bold text-white/60 uppercase text-[10px] tracking-widest">Select Institution</h4>
                          <div className="space-y-3">
                            {[
                              { name: 'Chase Bank', icon: Landmark, color: 'bg-blue-600' },
                              { name: 'American Express', icon: CreditCard, color: 'bg-cyan-600' },
                              { name: 'Revolut', icon: WalletIcon, color: 'bg-white text-black' },
                              { name: 'HSBC Global', icon: Globe, color: 'bg-red-600' }
                            ].map(bank => (
                              <button key={bank.name} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-accent/50 hover:bg-accent/5 transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bank.color)}>
                                    <bank.icon className="w-5 h-5" />
                                  </div>
                                  <span className="font-bold">{bank.name}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/5 flex flex-col justify-center">
                          <div className="w-16 h-16 rounded-2xl bg-positive/10 flex items-center justify-center mb-6 mx-auto">
                            <Lock className="w-8 h-8 text-positive" />
                          </div>
                          <h5 className="text-center font-bold text-lg mb-4">Bank-Grade Security</h5>
                          <ul className="space-y-4">
                            {[
                              'AES-256 bit encryption',
                              'Read-only access only',
                              'No credentials stored',
                              'GDPR & PSD2 Compliant'
                            ].map(item => (
                              <li key={item} className="flex items-center gap-3 text-xs text-white/50 font-medium">
                                <Check className="w-4 h-4 text-positive" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={() => setIsManual(true)}
                          className="flex-1 py-4 rounded-2xl bg-white/5 font-bold hover:bg-white/10 transition-all text-white/40"
                        >
                          Manual Entry
                        </button>
                        <button className="flex-[2] py-4 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow">
                          Continue to Secure Login
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="manual"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Bank Name</label>
                          <input 
                            type="text"
                            value={manualForm.bank}
                            onChange={(e) => setManualForm(prev => ({ ...prev, bank: e.target.value }))}
                            placeholder="e.g. Goldman Sachs"
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Account Name</label>
                          <input 
                            type="text"
                            value={manualForm.name}
                            onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Primary Savings"
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Current Balance ($)</label>
                          <input 
                            type="number"
                            value={manualForm.balance}
                            onChange={(e) => setManualForm(prev => ({ ...prev, balance: e.target.value }))}
                            placeholder="e.g. 5000"
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Account Type</label>
                          <select 
                            value={manualForm.type}
                            onChange={(e) => setManualForm(prev => ({ ...prev, type: e.target.value as any }))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                          >
                            <option value="Current" className="bg-[#050508] text-white">Current</option>
                            <option value="Savings" className="bg-[#050508] text-white">Savings</option>
                            <option value="Credit" className="bg-[#050508] text-white">Credit</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Currency</label>
                          <select 
                            value={manualForm.currency || 'USD'}
                            onChange={(e) => setManualForm(prev => ({ ...prev, currency: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all"
                          >
                            <option value="USD" className="bg-[#050508] text-white">USD ($)</option>
                            <option value="EUR" className="bg-[#050508] text-white">EUR (€)</option>
                            <option value="GBP" className="bg-[#050508] text-white">GBP (£)</option>
                            <option value="JPY" className="bg-[#050508] text-white">JPY (¥)</option>
                            <option value="AUD" className="bg-[#050508] text-white">AUD ($)</option>
                            <option value="CAD" className="bg-[#050508] text-white">CAD ($)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={() => setIsManual(false)}
                          className="flex-1 py-4 rounded-2xl bg-white/5 font-bold hover:bg-white/10 transition-all text-white/40"
                        >
                          Back to Auto
                        </button>
                        <button 
                          onClick={handleManualSubmit}
                          className="flex-[2] py-4 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow"
                        >
                          Add Account
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
