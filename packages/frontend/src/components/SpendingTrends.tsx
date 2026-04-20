import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

type TimeRange = '6M' | '1M' | '15D' | '7D' | 'CUSTOM';

export const SpendingTrends: React.FC = () => {
  const { transactions } = useFinance();
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const currencies = Array.from(new Set(transactions.map(t => t.currency || 'INR')));
  
  const currencyColors: Record<string, string> = {
    'INR': '#7C6EFA',
    'EUR': '#22D3A5',
  };

  const filteredCurrencies = selectedCurrency === 'ALL' ? currencies : [selectedCurrency];

  const trendData = useMemo(() => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let groupBy: 'month' | 'day' = 'day';
    let dataPoints = 0;

    if (timeRange === '6M') {
      startDate.setMonth(today.getMonth() - 5);
      startDate.setDate(1);
      groupBy = 'month';
      dataPoints = 6;
    } else if (timeRange === '1M') {
      startDate.setMonth(today.getMonth() - 1);
      groupBy = 'day';
      dataPoints = 30;
    } else if (timeRange === '15D') {
      startDate.setDate(today.getDate() - 15);
      groupBy = 'day';
      dataPoints = 15;
    } else if (timeRange === '7D') {
      startDate.setDate(today.getDate() - 7);
      groupBy = 'day';
      dataPoints = 7;
    } else if (timeRange === 'CUSTOM' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      groupBy = diffDays > 60 ? 'month' : 'day';
      dataPoints = groupBy === 'month' ? Math.ceil(diffDays / 30) : diffDays;
    }

    const data = [];
    if (groupBy === 'month') {
      for (let i = 0; i < dataPoints; i++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + i);
        if (d > endDate && timeRange === 'CUSTOM') break;
        const label = d.toLocaleString('default', { month: 'short' });
        
        const dataPoint: any = { label };
        currencies.forEach(curr => {
          const amount = transactions
            .filter(t => {
              const tDate = new Date(t.date);
              return tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear() && t.type === 'expense' && (t.currency || 'INR') === curr;
            })
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);
            
          dataPoint[curr] = amount;
        });
        data.push(dataPoint);
      }
    } else {
      for (let i = 0; i < dataPoints; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        if (d > endDate && timeRange === 'CUSTOM') break;
        const label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
        
        const dataPoint: any = { label };
        currencies.forEach(curr => {
          const amount = transactions
            .filter(t => {
              const tDate = new Date(t.date);
              return tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear() && t.type === 'expense' && (t.currency || 'INR') === curr;
            })
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);
            
          dataPoint[curr] = amount;
        });
        data.push(dataPoint);
      }
    }
    return data;
  }, [transactions, timeRange, customStart, customEnd, currencies]);

  return (
    <div className="glass-card p-8 h-full flex flex-col border-white/5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <p className="text-accent text-[10px] font-bold tracking-[0.3em] uppercase mb-1">Spending Trends</p>
          <h3 className="text-2xl font-bold tracking-tight">Analytics</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            title="Currency"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs font-bold text-white/70 outline-none focus:border-accent/50 transition-all"
          >
            <option value="ALL" className="bg-[#050508] text-white">All Currencies</option>
            {currencies.map(curr => (
              <option key={curr} value={curr} className="bg-[#050508] text-white">{curr}</option>
            ))}
          </select>

          <select 
            title="Time range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs font-bold text-white/70 outline-none focus:border-accent/50 transition-all"
          >
            <option value="6M" className="bg-[#050508] text-white">Last 6 Months</option>
            <option value="1M" className="bg-[#050508] text-white">Last Month</option>
            <option value="15D" className="bg-[#050508] text-white">Last 15 Days</option>
            <option value="7D" className="bg-[#050508] text-white">Last Week</option>
            <option value="CUSTOM" className="bg-[#050508] text-white">Custom Dates</option>
          </select>
        </div>
      </div>

      {timeRange === 'CUSTOM' && (
        <div className="flex items-center gap-2 mb-6 self-end">
          <input 
            type="date" 
            title="Start date"
            placeholder="Start date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg py-1 px-2 text-[10px] text-white/70 outline-none"
          />
          <span className="text-white/30 text-[10px]">to</span>
          <input 
            type="date" 
            title="End date"
            placeholder="End date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg py-1 px-2 text-[10px] text-white/70 outline-none"
          />
        </div>
      )}

      <div className="w-full" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trendData}>
            <defs>
              {currencies.map((curr, i) => (
                <linearGradient key={`color-${curr}`} id={`colorAmount-${curr}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currencyColors[curr] || '#7C6EFA'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={currencyColors[curr] || '#7C6EFA'} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              hide 
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0F0F19', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff'
              }}
              itemStyle={{ color: '#7C6EFA' }}
              cursor={{ stroke: 'rgba(124, 110, 250, 0.2)', strokeWidth: 2 }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(undefined, { 
                  style: 'currency', 
                  currency: name,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0 
                }), 
                name
              ]}
            />
            {filteredCurrencies.map((curr, i) => (
              <Area 
                key={curr}
                type="monotone" 
                dataKey={curr} 
                stroke={currencyColors[curr] || '#7C6EFA'} 
                strokeWidth={3}
                fillOpacity={1} 
                fill={`url(#colorAmount-${curr})`} 
                animationDuration={2000}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex justify-between items-center text-[10px] font-bold text-white/20 uppercase tracking-widest">
        <span>{trendData[0]?.label}</span>
        <span>{trendData[trendData.length - 1]?.label}</span>
      </div>
    </div>
  );
};
