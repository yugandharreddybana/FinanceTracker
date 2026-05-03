import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Sparkles, TrendingUp, Target, AlertCircle, 
  Calendar, Info, ArrowRight, BrainCircuit,
  Zap, Rocket, ShieldCheck, RefreshCw, Trash2
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { aiService, ForecastData } from '../services/aiService';
import { currencyService } from '../services/currencyService';
import { cn } from '../lib/utils';
import { ForecastResult } from '../types';

export const ForecastingPage: React.FC = () => {
  const { netWorthByCurrency, userProfile, incomeSources, recurringPayments, forecasts: savedForecasts, addForecast } = useFinance();
  const currencies = Object.keys(netWorthByCurrency);
  const [selectedCurrency, setSelectedCurrency] = useState(userProfile.preferences.currency || 'INR');

  useEffect(() => {
    if (currencies.length > 0 && !currencies.includes(selectedCurrency)) {
      setSelectedCurrency(currencies[0]);
    }
  }, [currencies, selectedCurrency]);

  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [riskProfile, setRiskProfile] = useState<'Conservative' | 'Moderate' | 'Aggressive'>('Moderate');
  const [showHistory, setShowHistory] = useState(false);

  const currentCurrency = selectedCurrency;
  const currentNetWorth = netWorthByCurrency[currentCurrency]?.total || 0;
  
  const totalIncome = incomeSources.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = recurringPayments.reduce((sum, rec) => sum + rec.amount, 0);
  const monthlySavings = Math.max(0, totalIncome - totalExpenses);

  const generateForecast = async () => {
    setIsLoading(true);
    const data = await aiService.getNetWorthForecast(currentNetWorth, monthlySavings, riskProfile);
    setForecasts(data);
    setIsLoading(false);

    // U6: Persist forecast result
    if (data.length > 0) {
      const forecastResult: ForecastResult = {
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        months: data.map(f => ({ month: `Year ${f.year}`, projected: f.estimatedNetWorth, currency: currentCurrency })),
        summary: data.map(f => `Year ${f.year}: ${currencyService.formatCurrency(f.estimatedNetWorth, currentCurrency)}`).join(' | '),
      };
      addForecast(forecastResult);
    }
  };

  useEffect(() => {
    generateForecast();
  }, [riskProfile]);

  const chartData = [
    { year: 'Current', value: currentNetWorth },
    ...forecasts.map(f => ({ year: `Year ${f.year}`, value: f.estimatedNetWorth }))
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter font-display">Net Worth Forecasting</h1>
          </div>
          <p className="text-white/40 font-medium">AI-driven projections of your financial future based on current trends.</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          {(['Conservative', 'Moderate', 'Aggressive'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRiskProfile(r)}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-bold transition-all",
                riskProfile === r ? "bg-accent text-white shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Forecast Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 glass-card p-10 min-h-[500px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold mb-1">Growth Projection</h3>
              <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Estimated Net Worth Over Time</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-accent uppercase tracking-widest">Neural Engine Active</span>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[400px]">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-10 h-10 text-accent animate-spin" />
                <p className="text-sm text-white/40 font-bold animate-pulse">Calculating future scenarios...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" key={forecasts.length}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C6EFA" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7C6EFA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    stroke="rgba(255,255,255,0.2)" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.2)" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${currentCurrency === 'INR' ? '₹' : '€'}${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F0F19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px' }}
                    itemStyle={{ color: '#7C6EFA', fontWeight: 'bold' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    formatter={(val: number) => [currencyService.formatCurrency(val, currentCurrency), 'Net Worth']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#7C6EFA" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* AI Insights & Milestones */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 bg-accent/5 border-accent/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-5 h-5 text-accent" />
              <h3 className="font-bold">AI Summary</h3>
            </div>
            <div className="space-y-4">
              {forecasts.map((f, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Year {f.year}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest",
                      f.confidence === 'high' ? "text-positive bg-positive/10" : "text-yellow-400 bg-yellow-400/10"
                    )}>
                      {f.confidence} Confidence
                    </span>
                  </div>
                  <p className="text-sm font-bold mb-2">{currencyService.formatCurrency(f.estimatedNetWorth, currentCurrency)}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{f.reasoning}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Rocket className="w-5 h-5 text-positive" />
              <h3 className="font-bold">Financial Freedom</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40 font-medium">Target Net Worth</span>
                <span className="text-sm font-bold">{currencyService.formatCurrency(1000000, currentCurrency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40 font-medium">Estimated Date</span>
                <span className="text-sm font-bold text-accent">Oct 2038</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-positive w-[15%]" />
              </div>
              <p className="text-[10px] text-white/30 text-center mt-2">
                You are 15% of the way to your goal.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Strategy Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-positive/10 flex items-center justify-center text-positive border border-positive/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Optimization Strategy</h3>
              <p className="text-xs text-white/40 font-medium uppercase tracking-widest">How to beat the forecast</p>
            </div>
          </div>
          <ul className="space-y-6">
            {[
              { title: 'Increase Savings Rate', desc: 'Boosting your monthly savings by just 10% could bring your freedom date forward by 2.5 years.', icon: TrendingUp },
              { title: 'Rebalance Portfolio', desc: 'Your current allocation is slightly heavy on cash. Moving 15% to index funds could improve returns.', icon: Target },
              { title: 'Tax Efficiency', desc: 'Utilizing tax-advantaged accounts could save you an estimated amount annually in taxes.', icon: ShieldCheck }
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <div className="mt-1">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-10 bg-white/[0.02] border-white/5">
          <h3 className="text-xl font-bold mb-6">Simulation Parameters</h3>
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Inflation Rate</label>
                <span className="text-xs font-bold text-accent">3.2%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full">
                <div className="h-full bg-accent w-[32%]" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Market Return</label>
                <span className="text-xs font-bold text-positive">8.5%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full">
                <div className="h-full bg-positive w-[85%]" />
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
              <Info className="w-5 h-5 text-white/20 mt-1" />
              <p className="text-xs text-white/40 leading-relaxed">
                These projections are based on historical data and AI analysis. They are not financial advice and actual results may vary significantly based on market conditions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* U6: Forecast History */}
      {savedForecasts.length > 0 && (
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Forecast History</h3>
            <button onClick={() => setShowHistory(p => !p)} className="text-xs font-bold text-accent uppercase tracking-widest hover:underline">
              {showHistory ? 'Hide' : `Show ${savedForecasts.length}`}
            </button>
          </div>
          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                {savedForecasts.map(fc => (
                  <div key={fc.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">{new Date(fc.generatedAt).toLocaleString()}</p>
                    <p className="text-sm text-white/70">{fc.summary}</p>
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
