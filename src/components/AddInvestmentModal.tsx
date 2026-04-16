import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, Coins, Globe, Plus, Search, Loader2 } from 'lucide-react';
import { Investment } from '../types';
import { investmentService } from '../services/investmentService';
import { cn } from '../lib/utils';

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (investment: Investment) => void;
}

export const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [type, setType] = useState<'Stock' | 'Crypto' | 'ETF'>('Stock');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundAsset, setFoundAsset] = useState<{ symbol: string; price: number } | null>(null);

  const handleSearch = async () => {
    if (!symbol) return;
    setIsSearching(true);
    setFoundAsset(null);
    try {
      let priceData;
      if (type === 'Crypto') {
        const results = await investmentService.getCryptoPrices([symbol.toLowerCase()]);
        const key = symbol.toUpperCase();
        if (results[key]) {
          priceData = results[key];
        }
      } else {
        priceData = await investmentService.getStockPrice(symbol.toUpperCase());
      }
      
      if (priceData) {
        setFoundAsset(priceData);
        if (!avgPrice) setAvgPrice(priceData.price.toString());
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity || !avgPrice) return;

    const newInvestment: Investment = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: symbol.toUpperCase(),
      name: foundAsset?.symbol || symbol.toUpperCase(),
      type,
      quantity: parseFloat(quantity),
      averagePrice: parseFloat(avgPrice),
      currentPrice: foundAsset?.price || parseFloat(avgPrice),
      currency: 'USD',
      lastUpdated: new Date().toISOString()
    };

    onAdd(newInvestment);
    onClose();
    // Reset
    setSymbol('');
    setQuantity('');
    setAvgPrice('');
    setFoundAsset(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-xl glass-card p-10 overflow-hidden border-accent/20"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent violet-glow">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Add Asset</h2>
                  <p className="text-white/40 text-sm">Expand your financial portfolio</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-6 h-6 text-white/20" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Asset Type Selector */}
              <div className="grid grid-cols-3 gap-4">
                {(['Stock', 'Crypto', 'ETF'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      setFoundAsset(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all relative group",
                      type === t 
                        ? "bg-accent/10 border-accent text-accent shadow-[0_0_20px_rgba(124,110,250,0.1)]" 
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                    )}
                  >
                    {t === 'Stock' && <Globe className="w-6 h-6" />}
                    {t === 'Crypto' && <Coins className="w-6 h-6" />}
                    {t === 'ETF' && <TrendingUp className="w-6 h-6" />}
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{t}</span>
                    {type === t && (
                      <motion.div layoutId="active-type" className="absolute inset-0 border-2 border-accent rounded-2xl" />
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 block">Asset Symbol</label>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        placeholder={type === 'Crypto' ? 'BTC, ETH, SOL...' : 'AAPL, TSLA, NVDA...'}
                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-accent/50 transition-all font-mono text-lg"
                        required
                      />
                      {foundAsset && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1 rounded-lg bg-positive/10 border border-positive/20"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                          <span className="text-[10px] font-bold text-positive uppercase tracking-widest">Verified</span>
                        </motion.div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={isSearching || !symbol}
                      className="px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                    >
                      {isSearching ? (
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      ) : (
                        <>
                          <Search className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                          <span className="text-xs font-bold uppercase tracking-widest text-white/40 group-hover:text-white">Verify</span>
                        </>
                      )}
                    </button>
                  </div>
                  {foundAsset && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-[10px] font-bold text-accent uppercase tracking-widest"
                    >
                      Current Market Price: ${foundAsset.price.toLocaleString()}
                    </motion.p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 block">Quantity</label>
                    <input
                      type="number"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-accent/50 transition-all font-mono text-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 block">Avg. Cost Basis (USD)</label>
                    <input
                      type="number"
                      step="any"
                      value={avgPrice}
                      onChange={(e) => setAvgPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-accent/50 transition-all font-mono text-lg"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-5 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow flex items-center justify-center gap-3 text-lg group"
              >
                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                <span>Add to Portfolio</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
