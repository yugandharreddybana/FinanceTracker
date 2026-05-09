import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import {
  LayoutDashboard, Receipt, CreditCard, PieChart, Target, TrendingUp,
  Settings, LogOut, Sparkles, CalendarClock, Briefcase, Wallet, Calculator,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useState } from 'react';

const nav = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-emerald-400' },
  { path: '/dashboard/transactions', icon: Receipt, label: 'Transactions', color: 'text-blue-400' },
  { path: '/dashboard/accounts', icon: CreditCard, label: 'Accounts', color: 'text-violet-400' },
  { path: '/dashboard/budgets', icon: PieChart, label: 'Budgets', color: 'text-amber-400' },
  { path: '/dashboard/savings', icon: Target, label: 'Goals', color: 'text-pink-400' },
  { path: '/dashboard/investments', icon: TrendingUp, label: 'Investments', color: 'text-cyan-400' },
  { path: '/dashboard/recurring', icon: CalendarClock, label: 'Recurring', color: 'text-orange-400' },
  { path: '/dashboard/loans', icon: Briefcase, label: 'Loans', color: 'text-rose-400' },
  { path: '/dashboard/insights', icon: Sparkles, label: 'AI Oracle', color: 'text-purple-400' },
  { path: '/dashboard/networth', icon: Calculator, label: 'Net Worth', color: 'text-teal-400' },
  { path: '/dashboard/settings', icon: Settings, label: 'Settings', color: 'text-slate-400' },
];

interface Props {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: Props) {
  const { logout, userProfile } = useFinance();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

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
          <button onClick={onMobileClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Desktop collapse toggle */}
      {!isMobile && (
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[60px] z-20 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg">
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-1">
        {nav.map(n => (
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
                <n.icon className={cn('h-[18px] w-[18px] flex-shrink-0 transition-colors', isActive ? n.color : '')} />
                {(!collapsed || isMobile) && <span>{n.label}</span>}
              </>
            )}
          </NavLink>
        ))}
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
            </div>
          </div>
        )}
        <button onClick={() => { logout(); navigate('/'); onMobileClose(); }}
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
      <motion.aside initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
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
