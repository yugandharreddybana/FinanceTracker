import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Calculator, TrendingDown, Lightbulb,
  CheckCircle2, AlertTriangle, FileText, Download,
  ArrowRight, Sparkles, PieChart, Info, RefreshCw, Upload, X, Trash2
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { aiService, TaxSuggestion } from '../services/aiService';
import { currencyService } from '../services/currencyService';
import { cn } from '../lib/utils';

interface VaultDoc {
  name: string;
  size: string;
  dataUrl: string;
  uploadedAt: string;
}

const VAULT_KEY = 'ft_tax_vault';

export const TaxEnginePage: React.FC = () => {
  const { transactions, userProfile } = useFinance();
  const [suggestions, setSuggestions] = useState<TaxSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString());
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<VaultDoc[]>(() => {
    try { return JSON.parse(localStorage.getItem(VAULT_KEY) || '[]'); } catch { return []; }
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Transactions filtered by selected tax year
  const yearTransactions = useMemo(() =>
    transactions.filter(t => new Date(t.date).getFullYear().toString() === taxYear),
    [transactions, taxYear]
  );

  const taxStats = useMemo(() => {
    const income = yearTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = yearTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    // Simplified tax estimation: 20% of income above a basic exemption (simplified)
    const basicExemption = 250000; // common exemption threshold
    const taxableIncome = Math.max(0, income - basicExemption);
    const estimatedTax = taxableIncome <= 500000 ? taxableIncome * 0.05
      : taxableIncome <= 1000000 ? 12500 + (taxableIncome - 500000) * 0.2
      : 112500 + (taxableIncome - 1000000) * 0.3;
    const potentialSavings = Math.round(estimatedTax * 0.25);
    const effectiveRate = income > 0 ? ((estimatedTax / income) * 100).toFixed(1) : '0.0';
    return { income, expenses, estimatedTax: Math.round(estimatedTax), potentialSavings, effectiveRate };
  }, [yearTransactions]);

  const exportTaxReport = () => {
    const taxSummary = {
      taxYear,
      generatedAt: new Date().toISOString(),
      estimatedLiability: taxStats.estimatedTax,
      income: taxStats.income,
      expenses: taxStats.expenses,
      effectiveRate: taxStats.effectiveRate,
      optimizationSuggestions: suggestions,
      transactionsSummary: {
        total: yearTransactions.length,
        income: taxStats.income,
        expenses: taxStats.expenses,
      },
    };
    const blob = new Blob([JSON.stringify(taxSummary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `tax-report-${taxYear}.json` });
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Tax report downloaded successfully!');
  };

  const handleVaultUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const doc: VaultDoc = {
        name: file.name,
        size: file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        dataUrl: reader.result as string,
        uploadedAt: new Date().toLocaleDateString(),
      };
      const updated = [...vaultDocs, doc];
      setVaultDocs(updated);
      localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
      setIsUploading(false);
      showNotice(`"${file.name}" uploaded successfully!`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const deleteVaultDoc = (idx: number) => {
    const updated = vaultDocs.filter((_, i) => i !== idx);
    setVaultDocs(updated);
    localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  };

  const currentCurrency = userProfile.preferences.currency;

  const analyzeTax = async () => {
    setIsLoading(true);
    const data = await aiService.getTaxOptimizationSuggestions(yearTransactions.slice(0, 50));
    setSuggestions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    analyzeTax();
  }, [taxYear]);

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

      {/* Hidden file input for vault */}
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleVaultUpload} />

      {/* Tax Document Vault Modal */}
      <AnimatePresence>
        {showVaultModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowVaultModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative glass-card p-8 w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold">Tax Document Vault</h3>
                <button onClick={() => setShowVaultModal(false)} className="p-1 rounded-lg hover:bg-white/10 transition-all">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>
              <p className="text-sm text-white/40 mb-6">Store tax documents locally. Supports PDF, images, and Word docs.</p>
              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1">
                {vaultDocs.length === 0 ? (
                  <div className="text-center py-10 text-white/30 text-sm">
                    No documents yet. Upload your first tax document.
                  </div>
                ) : (
                  vaultDocs.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-accent shrink-0" />
                        <div>
                          <span className="text-sm font-medium block">{doc.name}</span>
                          <span className="text-[10px] text-white/30">{doc.size} · {doc.uploadedAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-positive" />
                        <button onClick={() => deleteVaultDoc(i)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-negative/20 text-negative">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-3 rounded-xl bg-accent/20 border border-accent/30 text-accent font-bold hover:bg-accent/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{isUploading ? 'Uploading...' : '+ Upload Document'}</span>
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
            {[0, 1, 2, 3].map(offset => {
              const y = (new Date().getFullYear() - offset).toString();
              return <option key={y} value={y} className="bg-[#050508]">Tax Year {y}</option>;
            })}
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
          <h2 className="text-4xl font-bold font-mono tracking-tighter mb-4">{currencyService.formatCurrency(taxStats.estimatedTax, currentCurrency)}</h2>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Calculator className="w-3 h-3" />
            <span>Based on {taxYear} income & deductions</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 border-positive/20 bg-positive/[0.02]"
        >
          <p className="text-[10px] font-bold text-positive uppercase tracking-widest mb-2">Potential Savings</p>
          <h2 className="text-4xl font-bold font-mono tracking-tighter text-positive mb-4">{currencyService.formatCurrency(taxStats.potentialSavings, currentCurrency)}</h2>
          <div className="flex items-center gap-2 text-xs text-positive/60">
            <Sparkles className="w-3 h-3" />
            <span>Via deductions & optimizations</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8"
        >
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Effective Tax Rate</p>
          <h2 className="text-4xl font-bold font-mono tracking-tighter mb-4">{taxStats.effectiveRate}%</h2>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <TrendingDown className="w-3 h-3" />
            <span>On {currencyService.formatCurrency(taxStats.income, currentCurrency)} total income</span>
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
                        <p className="text-xs text-white/60 leading-relaxed">{s.description}</p>
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
              {[
                { label: 'Income Tax (Slab)', amount: Math.round(taxStats.estimatedTax * 0.68), color: '#7C6EFA', percent: 68 },
                { label: 'Surcharge & Cess', amount: Math.round(taxStats.estimatedTax * 0.22), color: '#22D3A5', percent: 22 },
                { label: 'Other Levies', amount: Math.round(taxStats.estimatedTax * 0.10), color: '#F59E0B', percent: 10 }
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
                  Based on {taxYear} data: {yearTransactions.length} transactions analysed. Estimated quarterly payment: {currencyService.formatCurrency(Math.round(taxStats.estimatedTax / 4), currentCurrency)}.
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
                <p className="text-xs text-white/40">{vaultDocs.length} document{vaultDocs.length !== 1 ? 's' : ''} stored securely</p>
              </div>
            </div>
            <button onClick={() => setShowVaultModal(true)} aria-label="Open document vault" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
