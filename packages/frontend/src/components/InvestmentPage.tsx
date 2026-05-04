import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, TrendingDown, Plus, Search, Filter,
  ArrowUpRight, ArrowDownRight, RefreshCw, Wallet,
  PieChart, BarChart3, History, Shield, Globe, Coins, Pencil, Trash2, ChevronDown
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { investmentService, AssetPrice } from '../services/investmentService';
import { currencyService } from '../services/currencyService';
import { AddInvestmentModal } from './AddInvestmentModal';
import { cn } from '../lib/utils';
import DeleteModal from './DeleteModal';
import {
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

export const InvestmentPage: React.FC = () => {
  const { investments, addInvestment, updateInvestment, deleteInvestment, userProfile } = useFinance();
  const [prices, setPrices] = useState<Record<string, AssetPrice>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Stock' | 'Crypto' | 'ETF'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const currencies = Array.from(new Set(investments.map(i => i.currency || 'INR')));
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] || 'INR');
  const [editingInvestment, setEditingInvestment] = useState<typeof investments[number] | null>(null);

  const refreshPrices = async () => {
    setIsRefreshing(true);
    try {
      // Fetch Crypto Prices
      const cryptoIds = investments
        .filter(inv => inv.type === 'Crypto')
        .map(inv => inv.symbol === 'BTC' ? 'bitcoin' : inv.symbol === 'ETH' ? 'ethereum' : inv.symbol.toLowerCase());

      const cryptoPrices = await investmentService.getCryptoPrices(cryptoIds.length > 0 ? cryptoIds : undefined);

      // Fetch Stock Prices
      const stockInvestments = investments.filter(inv => inv.type === 'Stock' || inv.type === 'ETF');
      const stockPrices: Record<string, AssetPrice> = {};

      for (const inv of stockInvestments) {
        const priceData = await investmentService.getStockPrice(inv.symbol);
        if (priceData) {
          stockPrices[inv.symbol] = priceData;
        }
      }

      setPrices(prev => ({ ...prev, ...cryptoPrices, ...stockPrices }));
    } catch (error) {
      console.error('Failed to refresh prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshPrices();
    const interval = setInterval(refreshPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredInvestments = investments.filter(inv => {
    const matchesFilter = filter === 'All' || inv.type === filter;
    const matchesSearch = inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalValue = investments
    .filter(inv => (inv.currency || 'INR') === selectedCurrency)
    .reduce((sum, inv) => sum + (inv.quantity * (prices[inv.symbol]?.price || inv.currentPrice)), 0);

  const totalCost = investments
    .filter(inv => (inv.currency || 'INR') === selectedCurrency)
    .reduce((sum, inv) => sum + (inv.quantity * inv.averagePrice), 0);

  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const typeData = [
    { name: 'Stocks', value: investments.filter(i => i.type === 'Stock' && (i.currency || 'INR') === selectedCurrency).reduce((sum, i) => sum + (i.quantity * (prices[i.symbol]?.price || i.currentPrice)), 0) },
    { name: 'Crypto', value: investments.filter(i => i.type === 'Crypto' && (i.currency || 'INR') === selectedCurrency).reduce((sum, i) => sum + (i.quantity * (prices[i.symbol]?.price || i.currentPrice)), 0) },
    { name: 'ETFs', value: investments.filter(i => i.type === 'ETF' && (i.currency || 'INR') === selectedCurrency).reduce((sum, i) => sum + (i.quantity * (prices[i.symbol]?.price || i.currentPrice)), 0) },
  ].filter(d => d.value > 0);

  const COLORS = ['#7C6EFA', '#22D3A5', '#F59E0B'];

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h1 className="text-4xl font-bold tracking-tighter font-display">Investment Portfolio</h1>
              </div>
              <p className="text-white/40 font-medium">Real-time tracking of your global assets and wealth.</p>
            </div>
            {currencies.length > 1 && (
              <div className="relative mb-1">
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
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={refreshPrices}
            disabled={isRefreshing}
            aria-label="Refresh prices"
            className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
          >
            <RefreshCw className={cn("w-5 h-5 text-white/40 group-hover:text-white transition-all", isRefreshing && "animate-spin")} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      <AddInvestmentModal
        isOpen={isAddModalOpen || !!editingInvestment}
        onClose={() => { setIsAddModalOpen(false); setEditingInvestment(null); }}
        onAdd={addInvestment}
        investmentToEdit={editingInvestment}
        onEdit={updateInvestment}
      />

      {/* Portfolio Overview Cards */}
      <DeleteModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => { if (deleteConfirmId) { deleteInvestment(deleteConfirmId); setDeleteConfirmId(null); } }}
        title="Remove Investment?"
        description="Are you sure you want to remove this investment from your portfolio? This will permanently delete its tracking history and performance data. This action is irreversible."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Total Portfolio Value</p>
          <h2 className="text-4xl font-bold font-mono tracking-tighter mb-4">
            {currencyService.formatCurrency(totalValue, selectedCurrency)}
          </h2>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold",
              totalGain >= 0 ? "bg-positive/20 text-positive" : "bg-negative/20 text-negative"
            )}>
              {totalGain >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(totalGainPercent).toFixed(2)}%
            </div>
            <span className="text-xs text-white/40 font-medium">All time profit</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8"
        >
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Asset Allocation</p>
          <div className="h-[120px] w-full min-w-[200px]">
            <ResponsiveContainer width="100%" height="100%" key={typeData.length}>
              <RePieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F0F19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8"
        >
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Market Sentiment</p>
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-white/60">Fear & Greed Index</span>
              <span className="text-xs font-bold text-positive">72 (Greed)</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-negative via-yellow-400 to-positive w-[72%]" />
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed">
              Market is currently in a greed phase. Consider rebalancing your high-risk assets.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Assets Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-accent/50 transition-all w-full md:w-64 text-sm"
              />
            </div>
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
              {(['All', 'Stock', 'Crypto', 'ETF'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    filter === t ? "bg-accent text-white shadow-lg" : "text-white/40 hover:text-white"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Asset</th>
                <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Price</th>
                <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">24h Change</th>
                <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Holdings</th>
                <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Value</th>
                <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Profit/Loss</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestments.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 p-8">
                      <div className="text-7xl opacity-50">📈</div>
                      <h3 className="text-xl font-bold text-white/70">No investments yet</h3>
                      <p className="text-white/40">Start building your portfolio by adding your first investment</p>
                      <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-accent rounded-2xl text-white font-bold hover:bg-accent/80 transition-all">
                        Add Investment
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredInvestments.map((inv) => {
                const priceInfo = prices[inv.symbol] || { price: inv.currentPrice, change24h: 0 };
                const currentVal = inv.quantity * priceInfo.price;
                const costBasis = inv.quantity * inv.averagePrice;
                const profit = currentVal - costBasis;
                const profitPercent = (profit / costBasis) * 100;

                return (
                  <motion.tr
                    key={inv.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-accent">
                          {inv.symbol[0]}
                        </div>
                        <div>
                          <p className="font-bold">{inv.name}</p>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{inv.symbol} • {inv.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-mono font-bold">
                      {currencyService.formatCurrency(priceInfo.price, inv.currency)}
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "flex items-center gap-1 font-bold text-xs",
                        priceInfo.change24h >= 0 ? "text-positive" : "text-negative"
                      )}>
                        {priceInfo.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(priceInfo.change24h).toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold">{inv.quantity} {inv.symbol}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Avg: {currencyService.formatCurrency(inv.averagePrice, inv.currency)}</p>
                    </td>
                    <td className="px-8 py-6 font-mono font-bold">
                      {currencyService.formatCurrency(currentVal, inv.currency)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex flex-col items-start gap-1 font-bold",
                          profit >= 0 ? "text-positive" : "text-negative"
                        )}>
                          <span className="text-sm">{profit >= 0 ? '+' : ''}{currencyService.formatCurrency(profit, inv.currency)}</span>
                          <span className="text-[10px] uppercase tracking-widest">{profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100">
                          <button
                            aria-label="Edit investment"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingInvestment(inv);
                            }}
                            className="p-2 rounded-lg bg-accent/5 hover:bg-accent/20 text-accent/40 hover:text-accent transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            aria-label="Delete investment"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(inv.id);
                            }}
                            className="p-2 rounded-lg bg-negative/5 hover:bg-negative/20 text-negative/40 hover:text-negative transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
