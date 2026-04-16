import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layout, Plus, Download, Share2, Trash2, 
  BarChart3, PieChart, LineChart, Table,
  Settings2, GripVertical, ChevronRight,
  FileText, Calendar, Filter, Save
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../lib/utils';

interface ReportWidget {
  id: string;
  type: 'bar' | 'pie' | 'line' | 'table';
  title: string;
  metric: string;
  period: string;
}

export const ReportBuilderPage: React.FC = () => {
  const [widgets, setWidgets] = useState<ReportWidget[]>([
    { id: '1', type: 'bar', title: 'Monthly Spending', metric: 'Expenses', period: 'Last 6 Months' },
    { id: '2', type: 'pie', title: 'Category Distribution', metric: 'Categories', period: 'Current Month' }
  ]);
  const [isAdding, setIsAdding] = useState(false);

  const addWidget = (type: ReportWidget['type']) => {
    const newWidget: ReportWidget = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: 'New Widget',
      metric: 'Expenses',
      period: 'Current Month'
    };
    setWidgets([...widgets, newWidget]);
    setIsAdding(false);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <Layout className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter font-display">Custom Report Builder</h1>
          </div>
          <p className="text-white/40 font-medium">Design and export your own financial dashboards.</p>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
            <Save className="w-4 h-4" />
            <span>Save Template</span>
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow">
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
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
                        className="bg-transparent border-none outline-none font-bold text-lg focus:text-accent transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeWidget(widget.id)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-negative/20 text-white/40 hover:text-negative transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="h-64 w-full bg-white/[0.02] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4">
                    {widget.type === 'bar' && <BarChart3 className="w-12 h-12 text-accent/20" />}
                    {widget.type === 'pie' && <PieChart className="w-12 h-12 text-positive/20" />}
                    {widget.type === 'line' && <LineChart className="w-12 h-12 text-accent/20" />}
                    {widget.type === 'table' && <Table className="w-12 h-12 text-white/10" />}
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                      {widget.metric} • {widget.period}
                    </p>
                  </div>
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
