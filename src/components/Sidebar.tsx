import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Sparkles, 
  CalendarRange, 
  Settings, 
  LogOut,
  Wallet,
  PieChart,
  Target,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Leaf,
  Tags,
  BarChart3,
  Cpu,
  Coins,
  BrainCircuit,
  Shield,
  Layout,
  History,
  Users
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'accounts', label: 'Bank Accounts', icon: Wallet },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'savings', label: 'Savings Goals', icon: Target },
  { id: 'recurring', label: 'Recurring', icon: RefreshCw },
  { id: 'loans', label: 'Loans & EMIs', icon: TrendingDown },
  { id: 'networth', label: 'Net Worth', icon: TrendingUp },
  { id: 'health', label: 'Health Score', icon: Activity },
  { id: 'carbon', label: 'Carbon Footprint', icon: Leaf },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'investments', label: 'Investments', icon: Coins },
  { id: 'forecasting', label: 'Forecasting', icon: BrainCircuit },
  { id: 'tax', label: 'Tax Engine', icon: Shield },
  { id: 'reports', label: 'Reports', icon: Layout },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'audit', label: 'Audit Logs', icon: History },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
  { id: 'income', label: 'Income Analytics', icon: BarChart3 },
  { id: 'review', label: 'Monthly Review', icon: CalendarRange },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 240 : 80 }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="fixed left-0 top-0 h-screen glass-card border-r border-white/5 z-50 flex flex-col py-8 overflow-visible transition-all duration-500 ease-[0.22, 1, 0.36, 1]"
    >
      <div className="px-6 mb-12 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 violet-glow relative group/logo">
          <Sparkles className="w-6 h-6 text-white group-hover/logo:scale-110 transition-transform" />
          <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover/logo:opacity-100 transition-opacity" />
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col"
            >
              <span className="font-display font-bold text-xl tracking-tight whitespace-nowrap">Yugi</span>
              <span className="text-[10px] font-bold text-accent uppercase tracking-[0.3em] -mt-1">Finance Tracker</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => setActiveTab(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 group relative",
                  isActive 
                    ? "bg-accent/10 text-accent shadow-[inset_0_0_20px_rgba(124,110,250,0.05)]" 
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 shrink-0 transition-all duration-300", 
                  isActive && "drop-shadow-[0_0_8px_rgba(124,110,250,0.6)] scale-110",
                  !isActive && "group-hover:scale-110"
                )} />
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-semibold whitespace-nowrap tracking-tight"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-[-12px] w-1.5 h-6 bg-accent rounded-r-full violet-glow"
                  />
                )}
              </button>

              {/* Tooltip for collapsed state */}
              <AnimatePresence>
                {!isExpanded && hoveredItem === item.id && (
                  <motion.div
                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 20, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-card border border-white/10 rounded-lg text-xs font-bold whitespace-nowrap z-[60] shadow-2xl pointer-events-none"
                  >
                    {item.label}
                    <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-card border-l border-b border-white/10 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="px-3 pt-6 mt-6 border-t border-white/5 space-y-1.5">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 py-4 mb-4 rounded-2xl bg-accent/5 border border-accent/10 relative overflow-hidden group/neural"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover/neural:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-accent animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Neural Core</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Active • 98% Load</p>
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '98%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                  className="h-full bg-accent"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all group",
            activeTab === 'settings' ? "bg-accent/10 text-accent shadow-[inset_0_0_20px_rgba(124,110,250,0.05)]" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <Settings className={cn(
            "w-5 h-5 shrink-0 transition-transform duration-500",
            activeTab === 'settings' ? "rotate-45 text-accent" : "group-hover:rotate-45"
          )} />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm font-semibold whitespace-nowrap tracking-tight"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 p-3.5 rounded-2xl text-white/40 hover:text-negative hover:bg-negative/5 transition-all group"
        >
          <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm font-semibold whitespace-nowrap tracking-tight"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
};
