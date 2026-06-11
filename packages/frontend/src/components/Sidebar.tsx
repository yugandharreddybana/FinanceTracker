import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import { useSubscription } from '../context/SubscriptionContext';
import type { ReactNode } from 'react';
import {
  LayoutDashboard, Receipt, CreditCard, PieChart, Target, TrendingUp,
  Settings, LogOut, Sparkles, CalendarClock, Briefcase, Wallet, Calculator,
  ChevronLeft, ChevronRight, X, HeartPulse, Leaf, Layers, FileText,
  ShieldCheck, Users, LineChart, Tag, BarChart3, Lock,
} from 'lucide-react';
import { useState } from 'react';

type NavItem = {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  color: string;
  section: string;
};

const nav: NavItem[] = [
  { path: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-emerald-400', section: 'Overview' },
  { path: '/app/transactions', icon: Receipt, label: 'Transactions', color: 'text-blue-400', section: 'Overview' },
  { path: '/app/accounts', icon: CreditCard, label: 'Accounts', color: 'text-violet-400', section: 'Money' },
  { path: '/app/budgets', icon: PieChart, label: 'Budgets', color: 'text-amber-400', section: 'Money' },
  { path: '/app/savings', icon: Target, label: 'Goals', color: 'text-pink-400', section: 'Money' },
  { path: '/app/investments', icon: TrendingUp, label: 'Investments', color: 'text-cyan-400', section: 'Money' },
  { path: '/app/recurring', icon: CalendarClock, label: 'Recurring', color: 'text-orange-400', section: 'Money' },
  { path: '/app/loans', icon: Briefcase, label: 'Loans', color: 'text-rose-400', section: 'Money' },
  { path: '/app/networth', icon: Calculator, label: 'Net Worth', color: 'text-teal-400', section: 'Analytics' },
  { path: '/app/income', icon: Wallet, label: 'Income', color: 'text-lime-400', section: 'Analytics' },
  { path: '/app/review', icon: FileText, label: 'Monthly Review', color: 'text-indigo-400', section: 'Analytics' },
  { path: '/app/forecasting', icon: LineChart, label: 'Forecasting', color: 'text-sky-400', section: 'Analytics' },
  { path: '/app/tax', icon: Layers, label: 'Tax Engine', color: 'text-fuchsia-400', section: 'Analytics' },
  { path: '/app/reports', icon: BarChart3, label: 'Reports', color: 'text-blue-300', section: 'Analytics' },
  { path: '/app/categories', icon: Tag, label: 'Categories', color: 'text-slate-300', section: 'Analytics' },
  { path: '/app/health', icon: HeartPulse, label: 'Health Score', color: 'text-red-400', section: 'Intelligence' },
  { path: '/app/carbon', icon: Leaf, label: 'Carbon', color: 'text-green-400', section: 'Intelligence' },
  { path: '/app/insights', icon: Sparkles, label: 'AI Oracle', color: 'text-purple-400', section: 'Intelligence' },
  { path: '/app/family', icon: Users, label: 'Family', color: 'text-cyan-300', section: 'Workspace' },
  { path: '/app/audit', icon: ShieldCheck, label: 'Audit Log', color: 'text-slate-400', section: 'Workspace' },
  { path: '/app/settings', icon: Settings, label: 'Settings', color: 'text-slate-400', section: 'Workspace' },
];

interface Props {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: Props) {
  const { logout, userProfile } = useFinance();
  const { tier, openUpgrade, canAccessRoute } = useSubscription();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const routeKey = (path: string) => path.split('/').pop() || 'dashboard';

  const sidebarContent = (isMobile: boolean) => (
    <div className={cn(
      'flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white h-full relative',
      !isMobile && (collapsed ? 'w-[72px]' : 'w-[260px]'),
      !isMobile && 'transition-all duration-300',
      isMobile && 'w-[280px]'
    )}>
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 relative z-10">
        {(!collapsed || isMobile) ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl animated-gradient pulse-glow">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight">Yugi<span className="text-emerald-400">Finance</span></span>
          </div>
        ) : (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl animated-gradient pulse-glow">
            <Wallet className="h-5 w-5 text-white" />
          </div>
        )}
        {isMobile && (
          <button type="button" aria-label="Close menu" onClick={onMobileClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10">
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>

      {/* Desktop collapse toggle */}
      {!isMobile && (
        <button type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[60px] z-20 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg">
          {collapsed ? <ChevronRight className="h-3 w-3" aria-hidden /> : <ChevronLeft className="h-3 w-3" aria-hidden />}
        </button>
      )}

      {/* Nav */}
      <nav role="navigation" aria-label="Main" className="flex-1 overflow-y-auto px-3 pt-4 space-y-1">
        {(() => {
          let lastSection = '';
          return nav.flatMap((n) => {
            const nodes: ReactNode[] = [];
            if (n.section !== lastSection && (!collapsed || isMobile)) {
              lastSection = n.section;
              nodes.push(
                <p key={`h-${n.section}`} className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {n.section}
                </p>
              );
            }
            const tab = routeKey(n.path);
            const locked = !canAccessRoute(tab);
            if (locked) {
              nodes.push(
                <button
                  key={n.path}
                  type="button"
                  onClick={() => { openUpgrade(); if (isMobile) onMobileClose(); }}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 relative text-slate-500 hover:bg-white/5 hover:text-slate-300',
                    !isMobile && collapsed && 'justify-center px-0'
                  )}
                >
                  <n.icon className="h-[18px] w-[18px] flex-shrink-0 opacity-60" aria-hidden />
                  {(!collapsed || isMobile) && (
                    <>
                      <span className="flex-1 text-left">{n.label}</span>
                      <Lock className="h-3.5 w-3.5 opacity-70" aria-hidden />
                    </>
                  )}
                </button>
              );
            } else {
              nodes.push(
                <NavLink key={n.path} to={n.path}
                  onClick={isMobile ? onMobileClose : undefined}
                  className={({ isActive }) => cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 relative',
                    isActive
                      ? 'bg-white/10 text-white shadow-lg shadow-emerald-500/5'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white',
                    !isMobile && collapsed && 'justify-center px-0'
                  )}>
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div layoutId={isMobile ? 'mobileTab' : 'activeTab'}
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-emerald-400"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                      )}
                      <n.icon className={cn('h-[18px] w-[18px] flex-shrink-0 transition-colors', isActive ? n.color : '')} aria-hidden />
                      {(!collapsed || isMobile) && <span>{n.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            }
            return nodes;
          });
        })()}
      </nav>

      {/* User section */}
      <div className="relative z-10 p-3 border-t border-white/5">
        {(!collapsed || isMobile) && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full animated-gradient text-sm font-bold flex-shrink-0">
              {userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold">{userProfile.name}</p>
              <p className="truncate text-xs text-slate-400">{userProfile.email}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">{tier} plan</p>
            </div>
          </div>
        )}
        <button type="button" aria-label="Log out" onClick={() => { logout(); navigate('/'); onMobileClose(); }}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400',
            !isMobile && collapsed && 'justify-center'
          )}>
          <LogOut className="h-[18px] w-[18px]" />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside aria-label="Primary navigation" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="hidden lg:flex flex-shrink-0">
        {sidebarContent(false)}
      </motion.aside>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={onMobileClose} />
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-[70] lg:hidden">
              {sidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
