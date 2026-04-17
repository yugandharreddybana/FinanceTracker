import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Leaf, Car, TrendingDown, TrendingUp, Info, Zap, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';

// Approximate CO₂e emissions per ₹ spent by category (kg CO₂e per ₹1000)
const CARBON_FACTORS: Record<string, number> = {
  'Transport': 2.5,
  'Travel': 2.5,
  'Fuel': 3.0,
  'Food': 1.2,
  'Groceries': 0.8,
  'Dining': 1.5,
  'Restaurant': 1.5,
  'Shopping': 0.6,
  'Clothing': 0.8,
  'Electronics': 1.0,
  'Utilities': 1.8,
  'Electricity': 2.2,
  'Entertainment': 0.3,
  'Subscriptions': 0.1,
  'Health': 0.2,
  'Education': 0.1,
  'Other': 0.4,
};

const getCarbonFactor = (category: string): number => {
  const key = Object.keys(CARBON_FACTORS).find(k => category.toLowerCase().includes(k.toLowerCase()));
  return key ? CARBON_FACTORS[key] : CARBON_FACTORS['Other'];
};

export const CarbonFootprintPage: React.FC = () => {
  const { transactions } = useFinance();

  const data = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const thisMonthExpenses = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && t.type === 'expense';
    });

    const prevMonthExpenses = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.type === 'expense';
    });

    // Calculate carbon by category
    const categoryData: Record<string, { spent: number; carbon: number }> = {};
    thisMonthExpenses.forEach(t => {
      const cat = t.category || 'Other';
      if (!categoryData[cat]) categoryData[cat] = { spent: 0, carbon: 0 };
      const amount = Math.abs(t.amount);
      categoryData[cat].spent += amount;
      categoryData[cat].carbon += (amount / 1000) * getCarbonFactor(cat);
    });

    const totalCarbon = Object.values(categoryData).reduce((s, c) => s + c.carbon, 0);

    // Previous month total for comparison
    let prevTotalCarbon = 0;
    prevMonthExpenses.forEach(t => {
      const cat = t.category || 'Other';
      const amount = Math.abs(t.amount);
      prevTotalCarbon += (amount / 1000) * getCarbonFactor(cat);
    });

    const changePercent = prevTotalCarbon > 0 
      ? Math.round(((totalCarbon - prevTotalCarbon) / prevTotalCarbon) * 100) 
      : 0;

    // Driving equivalent: avg car emits ~120g CO₂/km
    const drivingKm = Math.round(totalCarbon / 0.12);

    // Sort categories by carbon
    const sortedCategories = Object.entries(categoryData)
      .map(([label, d]) => ({ label, ...d }))
      .sort((a, b) => b.carbon - a.carbon);

    // Category bar widths
    const totalSpent = sortedCategories.reduce((s, c) => s + c.spent, 0);

    // Generate tips based on top categories
    const tips: { title: string; text: string }[] = [];
    if (sortedCategories.length > 0) {
      const top = sortedCategories[0];
      if (top.label.toLowerCase().includes('transport') || top.label.toLowerCase().includes('fuel') || top.label.toLowerCase().includes('travel')) {
        tips.push({ title: 'Use Public Transport or Carpool', text: `Could reduce your ${top.label} carbon by ~40%` });
      }
      if (top.label.toLowerCase().includes('food') || top.label.toLowerCase().includes('dining') || top.label.toLowerCase().includes('groceries')) {
        tips.push({ title: 'Choose Local & Plant-Based', text: `Could reduce your ${top.label} carbon by ~25%` });
      }
    }
    tips.push({ title: 'Switch to Green Energy', text: 'Renewable electricity can cut utility carbon by ~80%' });
    if (sortedCategories.some(c => c.label.toLowerCase().includes('shopping'))) {
      tips.push({ title: 'Buy Refurbished / Second-hand', text: 'Reduces shopping carbon by ~50%' });
    }

    return { totalCarbon, changePercent, drivingKm, sortedCategories, totalSpent, tips, hasData: thisMonthExpenses.length > 0 };
  }, [transactions]);

  const COLORS = ['#F43F5E', '#F59E0B', '#22D3A5', '#10B981', '#8B5CF6', '#3B82F6', '#EC4899'];

  const fmt = (n: number) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Carbon Footprint</h1>
          <p className="text-white/40">Environmental impact analysis of your spending</p>
        </div>
      </div>

      {!data.hasData ? (
        <div className="glass-card p-16 text-center">
          <AlertCircle className="w-16 h-16 text-white/20 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-3">No Expense Data</h2>
          <p className="text-white/40">Add transactions to see your carbon footprint estimate.</p>
        </div>
      ) : (
        <>
          <div className="glass-card p-10 mb-12 relative overflow-hidden bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
              <div className="space-y-4">
                <p className="text-green-500/50 text-sm font-medium tracking-wider uppercase">Monthly Impact</p>
                <h2 className="text-7xl font-bold font-mono tracking-tighter text-green-400">
                  {Math.round(data.totalCarbon)}<span className="text-green-500/30 text-4xl ml-2">kg CO₂e</span>
                </h2>
                {data.changePercent !== 0 && (
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full w-fit text-sm font-bold",
                    data.changePercent <= 0 ? "text-green-400 bg-green-400/10" : "text-negative bg-negative/10"
                  )}>
                    {data.changePercent <= 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    <span>{data.changePercent > 0 ? '+' : ''}{data.changePercent}% vs last month</span>
                  </div>
                )}
              </div>

              <div className="flex-1 max-w-md p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-green-400/20 flex items-center justify-center text-green-400 shrink-0">
                  <Car className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    That's equivalent to driving <span className="text-white font-bold">{data.drivingKm.toLocaleString()} km</span> in a standard petrol car.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 mb-12">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold">Intensity Breakdown</h3>
              <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase font-mono">
                <Info className="w-3 h-3" />
                <span>Estimated from spending categories</span>
              </div>
            </div>
            
            {data.sortedCategories.length > 0 && (
              <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden mb-8 flex">
                {data.sortedCategories.map((cat, i) => (
                  <div
                    key={cat.label}
                    style={{ '--cw': `${data.totalSpent > 0 ? (cat.spent / data.totalSpent) * 100 : 0}%`, '--cc': COLORS[i % COLORS.length] } as React.CSSProperties}
                    className="h-full [width:var(--cw)] [background-color:var(--cc)]"
                  />
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {data.sortedCategories.slice(0, 8).map((row, i) => (
                <div key={row.label} className="flex justify-between items-center py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="shrink-0"><circle cx="4" cy="4" r="4" fill={COLORS[i % COLORS.length]} /></svg>
                    <span className="text-sm font-medium">{row.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold">{fmt(row.spent)}</span>
                    <span className="text-[10px] text-white/30 ml-2 font-mono">≈ {Math.round(row.carbon)}kg CO₂e</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-8">
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2 text-green-400">
              <Leaf className="w-5 h-5" />
              Green Alternatives
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.tips.map((tip, i) => (
                <div key={i} className="p-4 rounded-xl bg-green-400/5 border border-green-400/10 flex justify-between items-center group cursor-pointer hover:bg-green-400/10 transition-all">
                  <div>
                    <h4 className="font-bold text-sm text-green-400">{tip.title}</h4>
                    <p className="text-xs text-white/40">{tip.text}</p>
                  </div>
                  <Zap className="w-4 h-4 text-white/20 group-hover:text-green-400 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};
