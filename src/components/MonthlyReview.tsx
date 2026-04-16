import React from 'react';
import { motion } from 'motion/react';
import { Share2, Download, Sparkles } from 'lucide-react';

export const MonthlyReview: React.FC = () => {
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

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
          <span>Arta Intelligence: {currentMonth} Review</span>
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
            Your {currentMonth} <br />
            <span className="text-accent italic relative">
              Summary.
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-4 left-0 h-4 bg-accent/20 -z-10" 
              />
            </span>
          </h1>
          <p className="text-2xl text-white/40 font-medium max-w-2xl mx-auto leading-relaxed">
            Every transaction tells a story. Here's a look at your financial journey this month.
          </p>
        </motion.div>
      </header>

      <div className="flex flex-col items-center justify-center py-20 glass-card">
        <Sparkles className="w-12 h-12 text-accent mb-6" />
        <h3 className="text-2xl font-bold mb-4">Detailed Insights Coming Soon</h3>
        <p className="text-white/40 text-center max-w-md">As you build your transaction history, the Arta Oracle will generate beautiful, personalized reviews of your financial progress.</p>
      </div>
    </motion.div>
  );
};
