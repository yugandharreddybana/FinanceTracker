import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import {
  Search, Bell, ChevronRight, Plus, Menu,
  LayoutDashboard, Receipt, CreditCard, PieChart, Target, TrendingUp,
  Settings, Sparkles, CalendarClock, Briefcase, Calculator,
  Wallet, LineChart, Layers, FileText, ShieldCheck, Users, HeartPulse, Leaf, Tag,
  BarChart3,
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
  income: { title: 'Income Analytics', icon: Wallet },
  forecasting: { title: 'Forecasting', icon: LineChart },
  tax: { title: 'Tax Engine', icon: Layers },
  reports: { title: 'Reports', icon: BarChart3 },
  categories: { title: 'Categories', icon: Tag },
  health: { title: 'Health Score', icon: HeartPulse },
  carbon: { title: 'Carbon', icon: Leaf },
  review: { title: 'Monthly Review', icon: FileText },
  audit: { title: 'Audit Log', icon: ShieldCheck },
  family: { title: 'Family', icon: Users },
};

function pageLabel(key: string): string {
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  onSmartAdd: () => void;
  onMenuToggle: () => void;
  onNotifications: () => void;
  onOpenCommandPalette: () => void;
  unreadNotificationCount?: number;
}

export function TopBar({
  onSmartAdd,
  onMenuToggle,
  onNotifications,
  onOpenCommandPalette,
  unreadNotificationCount = 0,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, netWorthByCurrency, dashboardDisplayLens } = useFinance();

  const pageKey = location.pathname.split('/').pop() || 'dashboard';
  const page = PAGES[pageKey] ?? { title: pageLabel(pageKey), icon: LayoutDashboard };
  const PageIcon = page.icon;

  const barCurrency = dashboardDisplayLens;
  const barNode = netWorthByCurrency[barCurrency];
  const income = barNode?.income ?? 0;
  const expenses = barNode?.expenses ?? 0;

  const initials = userProfile.name.split(' ').map((n) => n[0]).join('').toUpperCase();

  return (
      <div className="sticky top-0 z-30 flex items-center justify-between h-14 lg:h-16 px-4 lg:px-6 bg-white/80 backdrop-blur-xl border-b border-slate-100" data-testid="top-bar">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuToggle}
          className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 -ml-1"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <span className="hidden sm:inline text-slate-300 font-medium shrink-0">App</span>
        <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-slate-300 shrink-0" aria-hidden />
        <div className="flex items-center gap-2 min-w-0">
          <PageIcon className="h-4 w-4 text-slate-500 shrink-0" aria-hidden />
          <span className="font-bold text-slate-800 truncate">{page.title}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="hidden md:flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-2 text-sm text-slate-400 hover:bg-slate-100 hover:border-slate-200 transition-all w-72 max-w-[40vw]"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left truncate">Search or navigate…</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shadow-sm shrink-0">
          /
        </kbd>
      </button>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="hidden xl:flex items-center gap-3 mr-2 text-xs font-bold">
          <span
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-black text-[10px] text-slate-500 tabular-nums"
            title={`This month in ${barCurrency}`}
          >
            {barCurrency}
          </span>
          <span className="text-emerald-600 tabular-nums">↑{formatCurrency(income, barCurrency)}</span>
          <span className="text-slate-200">|</span>
          <span className="text-rose-500">↓{formatCurrency(expenses, barCurrency)}</span>
        </div>

        <button
          type="button"
          aria-label="Open command palette"
          onClick={onOpenCommandPalette}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 active:bg-slate-100"
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>

        <motion.button
          type="button"
          data-testid="top-bar-smart-add"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Smart Add"
          title="Smart Add"
          onClick={onSmartAdd}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-200/50 hover:bg-emerald-600 transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </motion.button>

        <button
          type="button"
          data-testid="top-bar-notifications"
          aria-label="Notifications"
          onClick={onNotifications}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors relative"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-500 border-2 border-white" />
          )}
        </button>

        <button
          type="button"
          aria-label="Open settings"
          onClick={() => navigate('/app/settings')}
          className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full animated-gradient text-white text-xs font-bold shadow-md"
        >
          {initials}
        </button>
      </div>
    </div>
  );
}
