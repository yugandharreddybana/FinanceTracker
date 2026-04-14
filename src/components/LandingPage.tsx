import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Shield, TrendingUp, Zap, ArrowRight, Wallet, PieChart, Target } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onWatchDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onWatchDemo }) => {
  return (
    <div className="min-h-screen bg-background text-white overflow-hidden selection:bg-accent/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center violet-glow">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tighter">Arta</span>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={onLogin} className="text-sm font-bold text-white/60 hover:text-white transition-colors">Login</button>
            <button 
              onClick={onGetStarted}
              className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-all violet-glow"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest mb-8"
          >
            <Sparkles className="w-3 h-3" />
            <span>The Future of Wealth Intelligence</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 font-display leading-[0.9]"
          >
            Master Your Money <br />
            <span className="text-accent">With Neural Precision.</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white/40 max-w-2xl mx-auto mb-12 font-medium leading-relaxed"
          >
            Arta is more than a finance app. It's your private financial intelligence terminal, 
            powered by AI to optimize every dollar you earn, spend, and save.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col md:flex-row items-center justify-center gap-6"
          >
            <button 
              onClick={onGetStarted}
              className="w-full md:w-auto px-10 py-5 rounded-2xl bg-white text-black font-bold text-lg hover:bg-white/90 transition-all flex items-center justify-center gap-3 group"
            >
              <span>Start Your Journey</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={onWatchDemo}
              className="w-full md:w-auto px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all"
            >
              Watch Demo
            </button>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-full h-full">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-positive/10 rounded-full blur-[120px]" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: "Smart Add",
              desc: "Add transactions, goals, or loans using natural language. Just speak or type, Arta handles the rest."
            },
            {
              icon: Shield,
              title: "Bank-Grade Security",
              desc: "Your data is encrypted with AES-256 and protected by multi-layer biometric authentication."
            },
            {
              icon: TrendingUp,
              title: "AI Insights",
              desc: "Receive real-time risk alerts and wealth-building strategies personalized to your spending patterns."
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-10 border-white/5 hover:border-accent/30 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-white/40 font-medium leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-5xl font-bold tracking-tighter mb-8 font-display">
              Everything you need to <br />
              <span className="text-accent">reach financial freedom.</span>
            </h2>
            <div className="space-y-8">
              {[
                { icon: Wallet, title: "Unified Accounts", desc: "Connect all your banks, credit cards, and investments in one secure view." },
                { icon: PieChart, title: "Dynamic Budgets", desc: "Budgets that adapt to your lifestyle and alert you before you overspend." },
                { icon: Target, title: "Goal Tracking", desc: "Visualize your progress toward big dreams with automated savings rules." }
              ].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <item.icon className="w-6 h-6 text-white/60" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 tracking-tight">{item.title}</h4>
                    <p className="text-white/40 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="glass-card p-4 border-accent/20 shadow-[0_0_100px_rgba(124,110,250,0.1)]">
              <img 
                src="https://picsum.photos/seed/finance/800/600" 
                alt="Dashboard Preview" 
                className="rounded-xl opacity-80"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/30 rounded-full blur-[80px]" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tighter">Arta</span>
          </div>
          <div className="flex gap-10 text-sm font-bold text-white/20">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-xs font-bold text-white/10 uppercase tracking-widest">© 2024 Arta Finance Neural Engine</p>
        </div>
      </footer>
    </div>
  );
};
