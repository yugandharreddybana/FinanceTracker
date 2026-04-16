import React from 'react';
import { motion } from 'motion/react';
import { Share2, Download, Sparkles, TrendingUp, Award, Zap } from 'lucide-react';

export const MonthlyReview: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto py-16 px-8"
    >
      <div className="flex justify-between items-center mb-20">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-[0.3em] violet-glow"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>Arta Intelligence: March Review</span>
        </motion.div>
        <div className="flex gap-4">
          <button className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
            <Share2 className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
          </button>
          <button className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
            <Download className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      <header className="mb-32 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/5 blur-[120px] rounded-full -z-10" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-8 leading-[0.85] font-display">
            March was <br />
            <span className="text-accent italic relative">
              Legendary.
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-4 left-0 h-4 bg-accent/20 -z-10" 
              />
            </span>
          </h1>
          <p className="text-2xl text-white/40 font-medium max-w-2xl mx-auto leading-relaxed">
            You saved <span className="text-white font-bold">$2,450</span> more than your average, putting you <span className="text-positive font-bold">3 months ahead</span> of your Japan trip goal.
          </p>
        </motion.div>
      </header>

      <div className="space-y-48">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 rounded-3xl bg-positive/10 flex items-center justify-center text-positive mb-8 shadow-[0_0_30px_rgba(34,211,165,0.2)]">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h2 className="text-5xl font-bold mb-8 tracking-tight">The Savings Surge</h2>
            <p className="text-xl text-white/50 leading-relaxed font-medium">
              Your savings rate hit <span className="text-white font-bold">42%</span> this month. This was primarily driven by a 30% reduction in dining out and a bonus from your side project.
            </p>
            <div className="mt-12 flex items-center gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-positive/20 flex items-center justify-center text-positive">
                <Zap className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white/60 uppercase tracking-widest">Efficiency Rank: Top 1% of Arta Users</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
            whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
            viewport={{ once: true }}
            className="glass-card p-12 aspect-square flex flex-col items-center justify-center relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-positive/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="text-center relative z-10">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-[120px] font-bold font-mono text-white tracking-tighter leading-none mb-4"
              >
                42%
              </motion.div>
              <div className="text-sm font-bold text-positive uppercase tracking-[0.4em]">Savings Rate</div>
            </div>
            {/* Animated Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[80%] h-[80%] border border-positive/10 rounded-full animate-ping-slow" />
              <div className="w-[60%] h-[60%] border border-positive/5 rounded-full animate-ping-slow delay-700" />
            </div>
          </motion.div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, rotate: 5 }}
            whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1 glass-card p-12 aspect-video flex items-center justify-center bg-gradient-to-br from-accent/20 to-transparent relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/finance/800/600')] bg-cover bg-center opacity-10 mix-blend-overlay group-hover:scale-110 transition-transform duration-1000" />
            <Zap className="w-32 h-32 text-accent animate-pulse relative z-10 drop-shadow-[0_0_40px_rgba(124,110,250,0.6)]" />
          </motion.div>
          
          <motion.div 
            initial={{ x: 40, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center text-accent mb-8 shadow-[0_0_30px_rgba(124,110,250,0.2)]">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-5xl font-bold mb-8 tracking-tight">Milestone Reached</h2>
            <p className="text-xl text-white/50 leading-relaxed font-medium">
              You've officially crossed the <span className="text-white font-bold">$10,000</span> mark in your Emergency Fund. You now have <span className="text-accent font-bold">6 months</span> of runway secured.
            </p>
            <div className="mt-12 p-8 rounded-3xl bg-accent/5 border border-accent/20">
              <p className="text-[10px] font-bold text-accent uppercase tracking-[0.3em] mb-4">Next Objective</p>
              <h4 className="text-2xl font-bold mb-2">Japan Trip 2024</h4>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[75%] bg-accent violet-glow" />
              </div>
              <p className="mt-4 text-xs text-white/40 font-bold uppercase tracking-widest">75% Completed • On track for October</p>
            </div>
          </motion.div>
        </section>

        <section className="text-center py-32 border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-accent/5 blur-[100px] rounded-full -z-10" />
          <motion.h3 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            className="text-4xl font-bold mb-12 italic text-white/20 max-w-3xl mx-auto leading-tight"
          >
            "Financial freedom is not about having a lot of money, it's about having options."
          </motion.h3>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <button className="px-10 py-5 rounded-2xl bg-accent text-white font-bold text-lg violet-glow hover:scale-105 transition-all shadow-2xl">
              Plan April Strategy
            </button>
            <button className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold text-lg hover:bg-white/10 transition-all">
              Share My Stats
            </button>
          </div>
        </section>
      </div>
    </motion.div>
  );
};
