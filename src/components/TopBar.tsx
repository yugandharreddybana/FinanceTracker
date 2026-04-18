import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useFinance } from '../context/FinanceContext';

export const TopBar: React.FC = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addTransactions } = useFinance();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      containerRef.current.style.setProperty('--mouse-x', `${x}px`);
      containerRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSearch = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsSearching(true);
      try {
        await addTransactions(query);
        setQuery('');
        // Show success feedback
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <div className="w-full mt-6 mb-10">
      <div 
        ref={containerRef}
        className={cn(
          "relative group transition-all duration-700 ease-[0.22, 1, 0.36, 1]",
          isFocused ? "scale-[1.02]" : "hover:scale-[1.01]"
        )}
      >
        {/* Animated Border Gradient */}
        <div className={cn(
          "absolute -inset-[1.5px] rounded-[20px] bg-gradient-to-r from-accent/40 via-positive/40 to-accent/40 opacity-0 group-hover:opacity-100 blur-[2px] transition-all duration-700",
          isFocused && "opacity-100 blur-[4px] animate-pulse"
        )} />
        
        <div className="relative flex items-center bg-card/60 backdrop-blur-3xl border border-white/10 rounded-[20px] px-8 py-5 shadow-2xl overflow-hidden">
          {/* Subtle Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          {isSearching ? (
            <Loader2 className="w-6 h-6 mr-6 text-accent animate-spin" />
          ) : (
            <Search className={cn(
              "w-6 h-6 mr-6 transition-all duration-500", 
              isFocused ? "text-accent scale-110 drop-shadow-[0_0_8px_rgba(124,110,250,0.5)]" : "text-white/20"
            )} />
          )}
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Ask anything about your finances..."
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="flex-1 bg-transparent border-none outline-none text-xl placeholder:text-white/10 font-display font-medium tracking-tight"
          />
          
          <div className="flex items-center gap-3 pl-6 border-l border-white/5">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] relative group/ai cursor-pointer overflow-hidden">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
              <span className="relative z-10">AI ORACLE</span>
              <div className="absolute inset-0 bg-accent/10 translate-y-full group-hover/ai:translate-y-0 transition-transform" />
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 text-[10px] font-mono text-white/20">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/40">⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
