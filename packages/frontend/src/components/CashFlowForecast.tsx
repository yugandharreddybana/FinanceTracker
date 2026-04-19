import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { ChevronDown } from 'lucide-react';

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-4 border-accent/20 bg-card/90 backdrop-blur-xl shadow-2xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Day {payload[0].payload.day}</p>
        <div className="space-y-1">
          <p className="text-lg font-bold font-mono text-white">{payload[0].value.toLocaleString(undefined, { style: 'currency', currency })}</p>
          <p className="text-[10px] text-positive font-bold uppercase tracking-tighter">Projected Balance</p>
        </div>
      </div>
    );
  }
  return null;
};

export const CashFlowForecast: React.FC = () => {
  const { netWorthByCurrency, recurringPayments } = useFinance();
  const currencies = Object.keys(netWorthByCurrency);
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] || 'INR');
  
  const netWorth = netWorthByCurrency[selectedCurrency] || { assets: 0 };

  const forecastData = React.useMemo(() => {
    let currentBalance = netWorth.assets;
    const data = [];
    
    for (let i = 1; i <= 30; i++) {
      // Check for recurring payments on this day
      const paymentsToday = recurringPayments
        .filter(p => p.date === i && (p.currency || 'INR') === selectedCurrency)
        .reduce((acc, p) => acc + p.amount, 0);
      
      currentBalance -= paymentsToday;
      
      // Daily fluctuation removed for strict data integrity

      data.push({
        day: i,
        balance: currentBalance,
        confidenceHigh: currentBalance + (i * 50),
        confidenceLow: currentBalance - (i * 50)
      });
    }
    return data;
  }, [netWorth.assets, recurringPayments, selectedCurrency]);

  return (
    <div className="glass-card p-8 h-full flex flex-col group">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight">Cash Flow Forecast</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">30-Day Projection</p>
          </div>
          {currencies.length > 1 && (
            <div className="relative">
              <select
                title="Currency"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-bold text-white pr-8 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {currencies.map(c => (
                  <option key={c} value={c} className="bg-[#050508] text-white">{c}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(124,110,250,0.5)]" />
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Projected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Confidence</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C6EFA" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#7C6EFA" stopOpacity={0}/>
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="8 8" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 600 }}
              dy={15}
              interval={4}
            />
            <YAxis 
              hide 
              domain={['dataMin - 1000', 'dataMax + 1000']}
            />
            <Tooltip content={<CustomTooltip currency={selectedCurrency} />} cursor={{ stroke: 'rgba(124, 110, 250, 0.2)', strokeWidth: 2 }} />
            <Area
              type="monotone"
              dataKey="confidenceHigh"
              stroke="none"
              fill="rgba(124, 110, 250, 0.03)"
              animationDuration={2000}
            />
            <Area
              type="monotone"
              dataKey="confidenceLow"
              stroke="none"
              fill="rgba(124, 110, 250, 0.03)"
              animationDuration={2000}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#7C6EFA"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorBalance)"
              filter="url(#glow)"
              animationDuration={2500}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
