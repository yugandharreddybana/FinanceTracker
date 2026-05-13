import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layout, Plus, Download, Trash2, 
  BarChart3, PieChart, LineChart, Table,
  Settings2, GripVertical,
  FileText, Calendar, Filter, Save, Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../lib/utils';
import { currencyService } from '../services/currencyService';
import { Transaction } from '../types';

interface ReportWidget {
  id: string;
  type: 'bar' | 'pie' | 'line' | 'table';
  title: string;
  metric: string;
  period: string;
}

const STORAGE_KEY = 'ft_report_template';
const CHART_COLORS = ['#7C6EFA', '#22D3A5', '#F59E0B', '#FF4E00', '#3B82F6', '#EC4899'];
const CHART_COLOR_CLASSES = ['bg-accent', 'bg-positive', 'bg-yellow-400', 'bg-orange-500', 'bg-blue-500', 'bg-pink-500'];

function filterTransactionsByPeriod(transactions: Transaction[], period: string) {
  const now = new Date();

  if (period === 'Current Month') {
    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }

  if (period === 'Last 6 Months') {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return transactions.filter((transaction) => new Date(transaction.date) >= cutoff);
  }

  return transactions;
}

function buildMonthlyExpenseSeries(transactions: Transaction[]) {
  const buckets = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const date = new Date(transaction.date);
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      buckets.set(label, (buckets.get(label) || 0) + Math.abs(transaction.amount));
    });

  return Array.from(buckets.entries()).map(([label, total]) => ({ label, total }));
}

function buildCategorySeries(transactions: Transaction[]) {
  const buckets = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const category = transaction.category || 'Others';
      buckets.set(category, (buckets.get(category) || 0) + Math.abs(transaction.amount));
    });

  return Array.from(buckets.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 6);
}

function buildCashflowSeries(transactions: Transaction[]) {
  const buckets = new Map<string, number>();

  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    buckets.set(label, (buckets.get(label) || 0) + transaction.amount);
  });

  return Array.from(buckets.entries()).map(([label, total]) => ({ label, total }));
}

function buildRecentTransactionRows(transactions: Transaction[]) {
  return [...transactions]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 6);
}

// U7: Generate a CSV Blob and trigger browser download
function generateCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => {
    const val = row[h];
    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r'))) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return String(val ?? '');
  }).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// U7: Generate a JSON Blob and trigger browser download
function generateJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export const ReportBuilderPage: React.FC = () => {
  const { transactions, budgets, accounts, userProfile } = useFinance();
  const [widgets, setWidgets] = useState<ReportWidget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [
        { id: '1', type: 'bar', title: 'Monthly Spending', metric: 'Expenses', period: 'Last 6 Months' },
        { id: '2', type: 'pie', title: 'Category Distribution', metric: 'Categories', period: 'Current Month' }
      ];
    } catch { return [
      { id: '1', type: 'bar', title: 'Monthly Spending', metric: 'Expenses', period: 'Last 6 Months' },
      { id: '2', type: 'pie', title: 'Category Distribution', metric: 'Categories', period: 'Current Month' }
    ]; }
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const reportCurrency = userProfile.preferences.currency || 'INR';

  const formatCompactCurrency = (value: number) => new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'currency',
    currency: reportCurrency,
  }).format(value);

  const addWidget = (type: ReportWidget['type']) => {
    const newWidget: ReportWidget = {
      id: crypto.randomUUID(),
      type,
      title: 'New Widget',
      metric: 'Expenses',
      period: 'Current Month'
    };
    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  // U7: Export current report data based on selected metrics
  const exportCSV = () => {
    const rows: Record<string, unknown>[] = transactions.map(t => ({
      date: t.date,
      merchant: t.merchant,
      amount: t.amount,
      type: t.type,
      category: t.category,
      currency: t.currency || 'INR',
      account: t.account || '',
    }));
    generateCSV(rows, `finance-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportJSON = () => {
    generateJSON({ transactions, budgets, accounts, exportedAt: new Date().toISOString() }, `finance-report-${new Date().toISOString().split('T')[0]}.json`);
  };

  // U7: Print using browser's print dialog (CSS handles hiding sidebar)
  const exportPrint = () => {
    window.print();
  };

  const renderWidgetContent = (widget: ReportWidget) => {
    const scopedTransactions = filterTransactionsByPeriod(transactions, widget.period);

    if (scopedTransactions.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
          <p className="text-sm font-bold text-white/70">No transactions match this widget yet.</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Add data or change the reporting period.</p>
        </div>
      );
    }

    if (widget.type === 'bar') {
      const data = buildMonthlyExpenseSeries(scopedTransactions);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatCompactCurrency} />
            <Tooltip
              formatter={(value: number) => [currencyService.formatCurrency(value, reportCurrency), 'Expenses']}
              contentStyle={{ backgroundColor: '#0F0F19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
            />
            <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="#7C6EFA" />
          </RechartsBarChart>
        </ResponsiveContainer>
      );
    }

    if (widget.type === 'pie') {
      const data = buildCategorySeries(scopedTransactions);
      return (
        <div className="grid h-full gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Tooltip
                formatter={(value: number) => [currencyService.formatCurrency(value, reportCurrency), 'Spend']}
                contentStyle={{ backgroundColor: '#0F0F19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
              />
              <Pie data={data} dataKey="total" nameKey="label" innerRadius={55} outerRadius={82} paddingAngle={3}>
                {data.map((entry, index) => (
                  <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {data.map((entry, index) => (
              <div key={entry.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-3">
                      <span className={cn('h-2.5 w-2.5 rounded-full', CHART_COLOR_CLASSES[index % CHART_COLOR_CLASSES.length])} />
                  <span className="text-xs font-bold text-white/70">{entry.label}</span>
                </div>
                <span className="text-xs font-bold text-white">{currencyService.formatCurrency(entry.total, reportCurrency)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (widget.type === 'line') {
      const data = buildCashflowSeries(scopedTransactions);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatCompactCurrency} />
            <Tooltip
              formatter={(value: number) => [currencyService.formatCurrency(value, reportCurrency), 'Net flow']}
              contentStyle={{ backgroundColor: '#0F0F19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
            />
            <Line dataKey="total" type="monotone" stroke="#22D3A5" strokeWidth={3} dot={{ r: 4, fill: '#22D3A5' }} activeDot={{ r: 6 }} />
          </RechartsLineChart>
        </ResponsiveContainer>
      );
    }

    const rows = buildRecentTransactionRows(scopedTransactions);
    return (
      <div className="h-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr] border-b border-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
          <span>Merchant</span>
          <span>Category</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-white/5">
          {rows.map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-[1.1fr_0.8fr_0.7fr] px-4 py-3 text-sm font-medium text-white/70">
              <span className="truncate pr-4">{transaction.merchant}</span>
              <span className="truncate pr-4">{transaction.category || 'Others'}</span>
              <span className={cn('text-right font-bold', transaction.amount >= 0 ? 'text-positive' : 'text-white')}>
                {currencyService.formatCurrency(transaction.amount, transaction.currency || reportCurrency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="page-reports" className="space-y-10 pb-20 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <Layout className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter font-display">Custom Report Builder</h1>
          </div>
          <p className="text-white/40 font-medium">Design and export your own financial dashboards.</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets)); setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2500); }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl border font-bold transition-all ${saveStatus === 'saved' ? 'bg-positive/20 border-positive/40 text-positive' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
            <Save className="w-4 h-4" />
            <span>{saveStatus === 'saved' ? 'Saved!' : 'Save Template'}</span>
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
          <button onClick={exportJSON} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
            <FileText className="w-4 h-4" />
            <span>JSON</span>
          </button>
          <button onClick={exportPrint} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow">
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Print-visible header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold">Finance Report</h1>
        <p className="text-gray-500">Generated {new Date().toLocaleDateString()}</p>
      </div>

      {/* Builder Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-6">Add Components</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'bar', icon: BarChart3, label: 'Bar Chart' },
                { type: 'pie', icon: PieChart, label: 'Pie Chart' },
                { type: 'line', icon: LineChart, label: 'Line Chart' },
                { type: 'table', icon: Table, label: 'Data Table' }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => addWidget(item.type as any)}
                  className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/30 transition-all group"
                >
                  <item.icon className="w-5 h-5 text-white/40 group-hover:text-accent transition-colors" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-6">Global Filters</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Date Range</label>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
                  <span>Last 30 Days</span>
                  <Calendar className="w-4 h-4 text-white/20" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Accounts</label>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
                  <span>All Accounts</span>
                  <Filter className="w-4 h-4 text-white/20" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">Report Canvas</h2>
              <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-widest">Draft</span>
            </div>
            <p className="text-xs text-white/20 font-medium italic">Drag and drop to reorder widgets</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {widgets.map((widget, index) => (
                <motion.div
                  key={widget.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(
                    "glass-card p-8 group relative",
                    widget.type === 'table' ? "md:col-span-2" : ""
                  )}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab active:cursor-grabbing text-white/10 hover:text-white/40 transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <input 
                        type="text"
                        defaultValue={widget.title}
                        title="Widget title"
                        placeholder="Widget title"
                        className="bg-transparent border-none outline-none font-bold text-lg focus:text-accent transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button aria-label="Widget settings" onClick={() => { const newTitle = prompt('Widget title:', widget.title); if (newTitle) setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, title: newTitle } : w)); }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button 
                        aria-label="Remove widget"
                        onClick={() => removeWidget(widget.id)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-negative/20 text-white/40 hover:text-negative transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="h-64 w-full rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    {renderWidgetContent(widget)}
                  </div>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-white/20">
                    {widget.metric} • {widget.period}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>

            {widgets.length === 0 && (
              <div className="md:col-span-2 py-32 flex flex-col items-center justify-center gap-6 border-2 border-dashed border-white/5 rounded-[40px]">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-white/10">
                  <Plus className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Empty Canvas</h3>
                  <p className="text-sm text-white/20 font-medium">Add widgets from the sidebar to start building your report.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
