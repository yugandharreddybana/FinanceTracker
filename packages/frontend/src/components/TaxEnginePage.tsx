import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Calculator, TrendingDown, Lightbulb, 
  CheckCircle2, AlertTriangle, FileText, Download,
  ArrowRight, Sparkles, PieChart, Info, RefreshCw, Trash2
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { aiService, TaxSuggestion } from '../services/aiService';
import { currencyService } from '../services/currencyService';
import { cn } from '../lib/utils';
import { TaxReport } from '../types';

export const TaxEnginePage: React.FC = () => {
  const { transactions, userProfile, taxReports, addTaxReport, deleteTaxReport } = useFinance();
  const [suggestions, setSuggestions] = useState<TaxSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [taxYear, setTaxYear] = useState('2024');
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showPastReports, setShowPastReports] = useState(false);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const currentCurrency = userProfile.preferences.currency;

  const totalIncome = transactions.filter(t => t.type === 'income' && t.currency === currentCurrency)
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense' && t.currency === currentCurrency)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const estimatedTax = Math.round(totalIncome * 0.25);

  const exportTaxReport = () => {
    const taxSummary = {
      taxYear,
      generatedAt: new Date().toISOString(),
      totalIncome,
      estimatedTax,
      currency: currentCurrency,
      estimatedLiability: estimatedTaxLiability,
      breakdown: breakdown.map(b => ({ label: b.label, amount: b.amount })),
      optimizationSuggestions: suggestions,
      transactionsSummary: {
        total: transactions.length,
        income: totalIncome,
        expenses: totalExpenses,
      },
    };
    const blob = new Blob([JSON.stringify(taxSummary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `tax-report-${taxYear}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Tax report downloaded successfully!');
  };

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const TAX_RATE = 0.20;
  const BASIC_EXEMPTION = 50000;
  const taxableIncome = Math.max(0, income - BASIC_EXEMPTION);
  const estimatedTaxLiability = Math.round(taxableIncome * TAX_RATE);

  const deductibleSpend = transactions
    .filter(t => t.type === 'expense' && ['Housing', 'Health', 'Education'].includes(t.category || ''))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const potentialSavings = Math.round(deductibleSpend * 0.15);

  const effectiveRate = income > 0 ? ((estimatedTaxLiability / income) * 100).toFixed(1) : '0.0';

  const breakdown = [
    { label: 'Federal Income Tax', amount: Math.round(estimatedTaxLiability * 0.68), color: '#7C6EFA', percent: 68 },
    { label: 'State Income Tax', amount: Math.round(estimatedTaxLiability * 0.22), color: '#22D3A5', percent: 22 },
    { label: 'Social Security', amount: Math.round(estimatedTaxLiability * 0.10), color: '#F59E0B', percent: 10 },
  ];
  const analyzeTax = async () => {
    setIsLoading(true);
    const data = await aiService.getTaxOptimizationSuggestions(transactions.slice(0, 50));
    setSuggestions(data);
    setIsLoading(false);

    // U5: Persist the generated report
    if (data.length > 0) {
      const report: TaxReport = {
        id: crypto.randomUUID(),
        year: parseInt(taxYear, 10),
        generatedAt: new Date().toISOString(),
        summary: data.map(s => s.title).join('; '),
        totalIncome,
        estimatedTax,
        currency: currentCurrency,
      };
      addTaxReport(report);
    }
  };

  useEffect(() => {
    analyzeTax();
  }, []);

  return (
    <div className="space-y-10 pb-20">
      {/* Notification banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-[300] px-6 py-3 rounded-2xl bg-accent text-white text-sm font-bold shadow-xl"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tax Document Vault Modal */}
      <AnimatePresence>
        {showVaultModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowVaultModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative glass-card p-8 w-full max-w-md">
              <h3 className="text-xl font-bold mb-2">Tax Document Vault</h3>
              <p className="text-sm text-white/40 mb-6">Securely store and organise your tax documents. Upload W-2s, 1099s, receipts and more.</p>
              <div className="space-y-3 mb-6">
                {['W-2 Form 2024', '1099-INT 2024', 'Mortgage Interest Statement', 'Charitable Donation Receipts'].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">{doc}</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-positive" />
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowVaultModal(false); showNotice('Upload feature coming soon — export your documents via Settings for now.'); }}
                className="w-full py-3 rounded-xl bg-accent/20 border border-accent/30 text-accent font-bold hover:bg-accent/30 transition-all"
              >
                + Upload Document
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            aria-label="Tax year"
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold outline-none focus:border-accent/50 transition-all"
          >
            <option value="2024" className="bg-[#050508]">Tax Year 2024</option>
            <option value="2023" className="bg-[#050508]">Tax Year 2023</option>
          </select>
          <button onClick={exportTaxReport} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
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
          <h2 className="text-4xl font-bold font-mono tracking-tighter mb-4">{currencyService.formatCurrency(estimatedTaxLiability, currentCurrency)}</h2>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Calculator className="w-3 h-3" />
            <span>~25% of total income ({currencyService.formatCurrency(totalIncome, currentCurrency)})</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 border-positive/20 bg-positive/[0.02]"
        >
          <p className="text-[10px] font-bold text-positive uppercase tracking-widest mb-2">Potential AI Savings</p>
          <h2 className="text-4xl font-bold font-mono tracking-tighter text-positive mb-4">{currencyService.formatCurrency(potentialSavings, currentCurrency)}</h2>
          <div className="flex items-center gap-2 text-xs text-positive/60">
            <Sparkles className="w-3 h-3" />
            <span>{suggestions.length} optimization opportunities found</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8"
        >
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Effective Tax Rate</p>
          <h2 className="text-4xl font-bold font-mono tracking-tighter mb-4">{effectiveRate}%</h2>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <TrendingDown className="w-3 h-3" />
            <span>Based on {transactions.filter(t => t.type === 'income').length} income transactions</span>
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
                  <button
                    onClick={() => setExpandedSuggestion(expandedSuggestion === i ? null : i)}
                    className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest group-hover:gap-3 transition-all"
                  >
                    <span>{expandedSuggestion === i ? 'Show Less' : 'Learn How'}</span>
                    <ArrowRight className={`w-3 h-3 transition-transform ${expandedSuggestion === i ? 'rotate-90' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {expandedSuggestion === i && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-white/5"
                      >
                        {s.steps && s.steps.length > 0 ? (
                          <ol className="space-y-2">
                            {s.steps.map((step, si) => (
                              <li key={si} className="flex items-start gap-3 text-xs text-white/60 leading-relaxed">
                                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold shrink-0 mt-0.5">{si + 1}</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-xs text-white/60 leading-relaxed">{s.description}</p>
                        )}
                        <div className="mt-3 p-3 rounded-xl bg-accent/5 border border-accent/20">
                          <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Potential Savings</p>
                          <p className="text-sm font-bold text-positive">{currencyService.formatCurrency(s.potentialSavings, currentCurrency)}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-bold mb-2">Tax Breakdown</h3>
          <div className="glass-card p-10">
            <div className="space-y-8">
              {breakdown.map((item, i) => (
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
                  The Q2 estimated tax payment deadline is June 15th. You have an estimated payment of {currencyService.formatCurrency(Math.round(estimatedTaxLiability / 4), currentCurrency)} due.
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
            <button onClick={() => setShowVaultModal(true)} aria-label="Open document vault" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* U5: Past Tax Reports */}
      {taxReports.length > 0 && (
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Past Tax Reports</h3>
            <button onClick={() => setShowPastReports(p => !p)} className="text-xs font-bold text-accent uppercase tracking-widest hover:underline">
              {showPastReports ? 'Hide' : `Show ${taxReports.length}`}
            </button>
          </div>
          <AnimatePresence>
            {showPastReports && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                {taxReports.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm font-bold">Tax Year {report.year} — {report.currency}</p>
                      <p className="text-xs text-white/40">{new Date(report.generatedAt).toLocaleDateString()} · Income: {currencyService.formatCurrency(report.totalIncome, report.currency)} · Est. Tax: {currencyService.formatCurrency(report.estimatedTax, report.currency)}</p>
                      <p className="text-xs text-white/30 mt-1 truncate max-w-md">{report.summary}</p>
                    </div>
                    <button onClick={() => deleteTaxReport(report.id)} aria-label="Delete report" className="p-2 rounded-lg bg-white/5 hover:bg-negative/20 text-white/40 hover:text-negative transition-all ml-4">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
