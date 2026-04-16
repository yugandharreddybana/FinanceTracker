import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Calculator, TrendingDown, Lightbulb, 
  CheckCircle2, AlertTriangle, FileText, Download,
  ArrowRight, Sparkles, PieChart, Info, RefreshCw
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { aiService, TaxSuggestion } from '../services/aiService';
import { currencyService } from '../services/currencyService';
import { cn } from '../lib/utils';

export const TaxEnginePage: React.FC = () => {
  const { transactions, userProfile } = useFinance();
  const [suggestions, setSuggestions] = useState<TaxSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [taxYear, setTaxYear] = useState('2024');

  const currentCurrency = userProfile.preferences.currency;

  const analyzeTax = async () => {
    setIsLoading(true);
    const data = await aiService.getTaxOptimizationSuggestions(transactions.slice(0, 50));
    setSuggestions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    analyzeTax();
  }, []);

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter font-display">Tax Optimization Engine</h1>
          </div>
          <p className="text-white/40 font-medium">Automated tax estimation and smart saving suggestions.</p>
        </div>

        <div className="flex items-center gap-4">
          <select 
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value)}
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold outline-none focus:border-accent/50 transition-all"
          >
            <option value="2024" className="bg-[#050508]">Tax Year 2024</option>
            <option value="2023" className="bg-[#050508]">Tax Year 2023</option>
          </select>
          <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Estimated Tax Liability</p>
          <h2 className="text-4xl font-bold font-mono tracking-tighter mb-4">$12,450.00</h2>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Calculator className="w-3 h-3" />
            <span>Based on current income & deductions</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 border-positive/20 bg-positive/[0.02]"
        >
          <p className="text-[10px] font-bold text-positive uppercase tracking-widest mb-2">Potential AI Savings</p>
          <h2 className="text-4xl font-bold font-mono tracking-tighter text-positive mb-4">$3,200.00</h2>
          <div className="flex items-center gap-2 text-xs text-positive/60">
            <Sparkles className="w-3 h-3" />
            <span>Optimization opportunities found</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8"
        >
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Effective Tax Rate</p>
          <h2 className="text-4xl font-bold font-mono tracking-tighter mb-4">18.4%</h2>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <TrendingDown className="w-3 h-3" />
            <span>2.1% lower than last year</span>
          </div>
        </motion.div>
      </div>

      {/* AI Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold">Smart Suggestions</h3>
            <button 
              onClick={analyzeTax}
              className="text-xs font-bold text-accent uppercase tracking-widest hover:underline"
            >
              Refresh Analysis
            </button>
          </div>

          {isLoading ? (
            <div className="glass-card p-20 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-white/40 font-bold">AI is analyzing your tax profile...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((s, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 hover:border-accent/30 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                        <Lightbulb className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold">{s.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest",
                            s.difficulty === 'easy' ? "text-positive bg-positive/10" : 
                            s.difficulty === 'medium' ? "text-yellow-400 bg-yellow-400/10" : "text-negative bg-negative/10"
                          )}>
                            {s.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-positive">Save {currencyService.formatCurrency(s.potentialSavings, currentCurrency)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed mb-4">{s.description}</p>
                  <button className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest group-hover:gap-3 transition-all">
                    <span>Learn How</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-bold mb-2">Tax Breakdown</h3>
          <div className="glass-card p-10">
            <div className="space-y-8">
              {[
                { label: 'Federal Income Tax', amount: 8450, color: '#7C6EFA', percent: 68 },
                { label: 'State Income Tax', amount: 2800, color: '#22D3A5', percent: 22 },
                { label: 'Social Security', amount: 1200, color: '#F59E0B', percent: 10 }
              ].map((item, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">{item.label}</p>
                      <p className="text-lg font-bold font-mono">{currencyService.formatCurrency(item.amount, currentCurrency)}</p>
                    </div>
                    <span className="text-xs font-bold text-white/20">{item.percent}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ delay: 0.5 + (i * 0.1), duration: 1 }}
                      className="h-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-1" />
              <div>
                <p className="text-xs font-bold text-white/80 mb-1">Upcoming Deadline</p>
                <p className="text-xs text-white/40 leading-relaxed">
                  The Q2 estimated tax payment deadline is June 15th. You have an estimated payment of $3,112 due.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold">Tax Document Vault</h4>
                <p className="text-xs text-white/40">12 documents stored securely</p>
              </div>
            </div>
            <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
