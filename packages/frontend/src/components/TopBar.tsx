import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import {
  Search, Bell, Command, ChevronRight, Plus, Menu,
  LayoutDashboard, Receipt, CreditCard, PieChart, Target, TrendingUp,
  Settings, Sparkles, CalendarClock, Briefcase, Calculator, X,
} from 'lucide-react';

const PAGES: Record<string, { title: string; icon: React.ElementType }> = {
  dashboard: { title: 'Dashboard', icon: LayoutDashboard },
  transactions: { title: 'Transactions', icon: Receipt },
  accounts: { title: 'Accounts', icon: CreditCard },
  budgets: { title: 'Budgets', icon: PieChart },
  savings: { title: 'Savings Goals', icon: Target },
  investments: { title: 'Investments', icon: TrendingUp },
  recurring: { title: 'Recurring', icon: CalendarClock },
  loans: { title: 'Loans', icon: Briefcase },
  insights: { title: 'AI Oracle', icon: Sparkles },
  networth: { title: 'Net Worth', icon: Calculator },
  settings: { title: 'Settings', icon: Settings },
};

const CMD_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
  { id: 'transactions', label: 'Transactions', icon: Receipt, path: '/app/transactions' },
  { id: 'accounts', label: 'Accounts', icon: CreditCard, path: '/app/accounts' },
  { id: 'budgets', label: 'Budgets', icon: PieChart, path: '/app/budgets' },
  { id: 'savings', label: 'Savings Goals', icon: Target, path: '/app/savings' },
  { id: 'investments', label: 'Investments', icon: TrendingUp, path: '/app/investments' },
  { id: 'recurring', label: 'Recurring', icon: CalendarClock, path: '/app/recurring' },
  { id: 'loans', label: 'Loans', icon: Briefcase, path: '/app/loans' },
  { id: 'insights', label: 'AI Oracle', icon: Sparkles, path: '/app/insights' },
  { id: 'networth', label: 'Net Worth', icon: Calculator, path: '/app/networth' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/app/settings' },
];

interface Props {
  onSmartAdd: () => void;
  onMenuToggle: () => void;
}

export function TopBar({ onSmartAdd, onMenuToggle }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, getMonthlyIncome, getMonthlyExpenses } = useFinance();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pageKey = location.pathname.split('/').pop() || 'dashboard';
  const page = PAGES[pageKey] || PAGES.dashboard;
  const PageIcon = page.icon;

  const income = getMonthlyIncome();
  const expenses = getMonthlyExpenses();

  // Global keyboard shortcut: "/" for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (cmdOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [cmdOpen]);

  const filteredCmds = CMD_ITEMS.filter(c =>
    c.label.toLowerCase().includes(cmdSearch.toLowerCase())
  );

  const initials = userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between h-14 lg:h-16 px-4 lg:px-6 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        {/* Left: hamburger + breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onMenuToggle} className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 -ml-1">
            <Menu className="h-5 w-5" />
          </button>
          <span className="hidden sm:inline text-slate-300 font-medium">App</span>
          <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-slate-300" />
          <div className="flex items-center gap-2">
            <PageIcon className="h-4 w-4 text-slate-500" />
            <span className="font-bold text-slate-800">{page.title}</span>
          </div>
        </div>

        {/* Center: search trigger */}
        <button onClick={() => setCmdOpen(true)}
          className="hidden md:flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-2 text-sm text-slate-400 hover:bg-slate-100 hover:border-slate-200 transition-all w-72">
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search or navigate...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shadow-sm">
            /
          </kbd>
        </button>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick balance — desktop only */}
          <div className="hidden xl:flex items-center gap-3 mr-2 text-xs font-bold">
            <span className="text-emerald-600">↑{formatCurrency(income)}</span>
            <span className="text-slate-200">|</span>
            <span className="text-rose-500">↓{formatCurrency(expenses)}</span>
          </div>

          {/* Mobile search */}
          <button onClick={() => setCmdOpen(true)} className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 active:bg-slate-100">
            <Search className="h-4 w-4" />
          </button>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onSmartAdd}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-200/50 hover:bg-emerald-600 transition-colors"
            title="Smart Add (⌘K)">
            <Plus className="h-4 w-4" />
          </motion.button>

          <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-500 border-2 border-white" />
          </button>

          <button onClick={() => navigate('/app/settings')}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full animated-gradient text-white text-xs font-bold shadow-md">
            {initials}
          </button>
        </div>
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[8vh] sm:pt-[15vh] px-4"
            onClick={() => setCmdOpen(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                <Command className="h-4 w-4 text-slate-300" />
                <input ref={inputRef} value={cmdSearch} onChange={e => setCmdSearch(e.target.value)}
                  placeholder="Search pages, actions..."
                  className="flex-1 text-sm font-medium text-slate-800 placeholder:text-slate-300 bg-transparent outline-none" />
                <button onClick={() => setCmdOpen(false)} className="text-slate-300 hover:text-slate-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto py-2">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navigation</div>
                {filteredCmds.map(cmd => (
                  <button key={cmd.id} onClick={() => { navigate(cmd.path); setCmdOpen(false); setCmdSearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <cmd.icon className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">{cmd.label}</span>
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Actions</div>
                  <button onClick={() => { onSmartAdd(); setCmdOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    <Plus className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">Smart Add (transaction, budget, goal...)</span>
                    <kbd className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">⌘K</kbd>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
