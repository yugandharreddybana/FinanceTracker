import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Command, Layout, CreditCard, PieChart, TrendingUp, Sparkles, Settings, LogOut, ChevronRight, X, Calendar, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

const ACTIONS = [
  { id: 'dashboard', title: 'Dashboard', icon: Layout, category: 'Navigation', shortcut: 'G D' },
  { id: 'transactions', title: 'Transactions', icon: CreditCard, category: 'Navigation', shortcut: 'G T' },
  { id: 'accounts', title: 'Bank Accounts', icon: Wallet, category: 'Navigation', shortcut: 'G A' },
  { id: 'budgets', title: 'Budgets', icon: PieChart, category: 'Navigation', shortcut: 'G B' },
  { id: 'networth', title: 'Net Worth', icon: TrendingUp, category: 'Navigation', shortcut: 'G N' },
  { id: 'insights', title: 'AI Insights', icon: Sparkles, category: 'Intelligence', shortcut: 'G I' },
  { id: 'health', title: 'Health Score', icon: Sparkles, category: 'Intelligence', shortcut: 'G H' },
  { id: 'income', title: 'Income Analytics', icon: TrendingUp, category: 'Analytics', shortcut: 'G Y' },
  { id: 'recurring', title: 'Recurring Payments', icon: Calendar, category: 'Management', shortcut: 'G R' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredActions = ACTIONS.filter(action => 
    action.title.toLowerCase().includes(query.toLowerCase()) ||
    action.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        onNavigate(filteredActions[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [isOpen, filteredActions, selectedIndex, onNavigate, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-[#0F0F19]/90 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          >
            <div className="flex items-center gap-4 p-6 border-b border-white/5">
              <Search className="w-6 h-6 text-accent" />
              <input
                autoFocus
                type="text"
                placeholder="Search commands, pages, or tools..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-xl font-medium outline-none placeholder:text-white/20"
              />
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/40">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
              {filteredActions.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-white/20 font-medium">No results found for "{query}"</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredActions.map((action, index) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        onNavigate(action.id);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                        selectedIndex === index ? "bg-accent/10 text-accent" : "text-white/40 hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          selectedIndex === index ? "bg-accent text-white violet-glow" : "bg-white/5"
                        )}>
                          <action.icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className={cn("font-bold", selectedIndex === index ? "text-white" : "text-white/60")}>{action.title}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{action.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {action.shortcut && (
                          <span className="text-[10px] font-mono font-bold opacity-20 group-hover:opacity-40">{action.shortcut}</span>
                        )}
                        <ChevronRight className={cn(
                          "w-4 h-4 transition-all",
                          selectedIndex === index ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                        )} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↑↓</span>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Enter</span>
                  <span>Select</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Esc</span>
                <span>Close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
