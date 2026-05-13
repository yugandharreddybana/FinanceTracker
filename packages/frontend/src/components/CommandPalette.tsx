import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Command, LayoutDashboard, Receipt, CreditCard, PieChart, Target,
  TrendingUp, Sparkles, Settings, ChevronRight, X, CalendarClock,
  Briefcase, Calculator, HeartPulse, Leaf, Layers, FileText, ShieldCheck,
  Users, LineChart, Tag, BarChart3, Plus, Wallet,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onSmartAdd?: () => void;
}

type PaletteEntry =
  | { kind: 'page'; id: string; title: string; icon: typeof LayoutDashboard; category: string }
  | { kind: 'action'; id: '__smart_add__'; title: string; icon: typeof Plus; category: string };

const PAGES: Array<Omit<Extract<PaletteEntry, { kind: 'page' }>, 'kind'>> = [
  { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, category: 'Overview' },
  { id: 'transactions', title: 'Transactions', icon: Receipt, category: 'Overview' },
  { id: 'accounts', title: 'Accounts', icon: CreditCard, category: 'Money' },
  { id: 'budgets', title: 'Budgets', icon: PieChart, category: 'Money' },
  { id: 'savings', title: 'Savings Goals', icon: Target, category: 'Money' },
  { id: 'investments', title: 'Investments', icon: TrendingUp, category: 'Money' },
  { id: 'recurring', title: 'Recurring', icon: CalendarClock, category: 'Money' },
  { id: 'loans', title: 'Loans', icon: Briefcase, category: 'Money' },
  { id: 'networth', title: 'Net Worth', icon: Calculator, category: 'Analytics' },
  { id: 'income', title: 'Income Analytics', icon: Wallet, category: 'Analytics' },
  { id: 'review', title: 'Monthly Review', icon: FileText, category: 'Analytics' },
  { id: 'forecasting', title: 'Forecasting', icon: LineChart, category: 'Analytics' },
  { id: 'tax', title: 'Tax Engine', icon: Layers, category: 'Analytics' },
  { id: 'reports', title: 'Reports', icon: BarChart3, category: 'Analytics' },
  { id: 'categories', title: 'Categories', icon: Tag, category: 'Analytics' },
  { id: 'health', title: 'Health Score', icon: HeartPulse, category: 'Intelligence' },
  { id: 'carbon', title: 'Carbon Footprint', icon: Leaf, category: 'Intelligence' },
  { id: 'insights', title: 'AI Oracle', icon: Sparkles, category: 'Intelligence' },
  { id: 'family', title: 'Family', icon: Users, category: 'Workspace' },
  { id: 'audit', title: 'Audit Log', icon: ShieldCheck, category: 'Workspace' },
  { id: 'settings', title: 'Settings', icon: Settings, category: 'Workspace' },
];

function buildActions(onSmartAdd?: () => void): PaletteEntry[] {
  const pages: PaletteEntry[] = PAGES.map((p) => ({ kind: 'page', ...p }));
  if (onSmartAdd) {
    pages.unshift({
      kind: 'action',
      id: '__smart_add__',
      title: 'Smart Add…',
      icon: Plus,
      category: 'Actions',
    });
  }
  return pages;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSmartAdd,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const ACTIONS = buildActions(onSmartAdd);

  const filteredActions = ACTIONS.filter(
    (action) =>
      action.title.toLowerCase().includes(query.toLowerCase()) ||
      action.category.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const root = panelRef.current;
    const focusables = root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusables[0]?.focus();
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      const len = filteredActions.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (len === 0) return;
        setSelectedIndex((prev) => (prev + 1) % len);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (len === 0) return;
        setSelectedIndex((prev) => (prev - 1 + len) % len);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = filteredActions[selectedIndex];
        if (!sel) return;
        if (sel.kind === 'action' && sel.id === '__smart_add__') {
          onSmartAdd?.();
          onClose();
          return;
        }
        if (sel.kind === 'page') {
          onNavigate(sel.id);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [isOpen, filteredActions, selectedIndex, onNavigate, onClose, onSmartAdd],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh] sm:pt-[15vh] p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            ref={panelRef}
            data-testid="command-palette"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-heading"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <Search className="w-5 h-5 text-slate-400 shrink-0" aria-hidden />
              <input
                autoFocus
                id="command-palette-heading"
                type="text"
                placeholder="Search pages and actions…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
              />
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-500">
                <Command className="w-3 h-3" aria-hidden />
                <span>K</span>
              </div>
              <button
                type="button"
                aria-label="Close command palette"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[min(60vh,420px)] overflow-y-auto py-2">
              {filteredActions.length === 0 ? (
                <div className="p-12 text-center" data-testid="command-palette-empty">
                  <p className="text-slate-400 font-medium">No matches for “{query}”</p>
                </div>
              ) : (
                <div className="space-y-0.5 px-2">
                  {filteredActions.map((action, index) => (
                    <button
                      key={`${action.kind}-${action.id}`}
                      type="button"
                      onClick={() => {
                        if (action.kind === 'action' && action.id === '__smart_add__') {
                          onSmartAdd?.();
                          onClose();
                          return;
                        }
                        if (action.kind === 'page') {
                          onNavigate(action.id);
                          onClose();
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all text-left',
                        selectedIndex === index
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                            selectedIndex === index ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <action.icon className="w-5 h-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className={cn('font-semibold truncate', selectedIndex === index ? 'text-slate-900' : '')}>
                            {action.title}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {action.category}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 shrink-0 text-slate-300 transition-all',
                          selectedIndex === index ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1',
                        )}
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4 justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <div className="flex gap-3">
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono">↑↓</kbd> Move
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono">↵</kbd> Open
                </span>
              </div>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono">Esc</kbd> Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
