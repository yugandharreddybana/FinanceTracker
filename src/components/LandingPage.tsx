import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, Shield, TrendingUp, Zap, ArrowRight, Wallet, PieChart, Target,
  Leaf, Coins, BrainCircuit, Users, History, BarChart3, Calculator,
  RefreshCw, FileText, CreditCard, Activity, Globe2, ReceiptText,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onWatchDemo: () => void;
}

const FEATURES = [
  {
    icon: Zap,
    title: 'Smart Add',
    desc: 'Add transactions, goals, or loans using natural language. Just type what happened — Arta parses and categorises automatically.',
    color: 'text-accent bg-accent/10',
    tag: 'AI-Powered',
  },
  {
    icon: Coins,
    title: 'NSE / BSE Investments',
    desc: 'Track your Indian stock market portfolio in ₹. Real-time NSE/BSE quotes, P&L, and sector allocation — all in one view.',
    color: 'text-positive bg-positive/10',
    tag: 'Indian Markets',
  },
  {
    icon: BrainCircuit,
    title: 'AI Oracle',
    desc: 'Your personal financial analyst powered by MCP. Ask anything — spending trends, forecasts, anomaly alerts — and get instant answers.',
    color: 'text-accent bg-accent/10',
    tag: 'MCP-Powered',
  },
  {
    icon: Leaf,
    title: 'Carbon Footprint',
    desc: 'Every rupee spent is automatically mapped to a carbon footprint. Understand your environmental impact and track reductions over time.',
    color: 'text-positive bg-positive/10',
    tag: 'Eco Intelligence',
  },
  {
    icon: Calculator,
    title: 'Tax Engine',
    desc: 'Auto-compute income tax with HRA, 80C, 80D deductions under both Old and New Indian tax regimes. Estimate your liability instantly.',
    color: 'text-yellow-400 bg-yellow-400/10',
    tag: 'Indian Tax',
  },
  {
    icon: Users,
    title: 'Family Accounts',
    desc: 'Manage shared finances with real-time contribution tracking, member roles, and unified family net worth — perfect for joint households.',
    color: 'text-pink-400 bg-pink-400/10',
    tag: 'Multi-User',
  },
  {
    icon: TrendingUp,
    title: 'Cash Flow Forecasting',
    desc: 'ML-powered 30/60/90-day cash flow projections with confidence bands and Monte Carlo simulation for scenario planning.',
    color: 'text-cyan-400 bg-cyan-400/10',
    tag: 'Predictive',
  },
  {
    icon: Activity,
    title: 'Health Score & Vitals',
    desc: 'A dynamic 0-100 financial health score updated daily — covering savings rate, budget adherence, debt ratio, and emergency fund.',
    color: 'text-rose-400 bg-rose-400/10',
    tag: 'Wellness',
  },
  {
    icon: History,
    title: 'Audit Log with Trash',
    desc: 'Every create, update, and delete action is logged with full transparency. Deleted entries rest in a 24-hour recoverable trash bin.',
    color: 'text-orange-400 bg-orange-400/10',
    tag: 'Compliance',
  },
  {
    icon: FileText,
    title: 'Monthly Review',
    desc: 'Auto-generated monthly intelligence report summarising income, top expense categories, budget performance, and month-over-month trends.',
    color: 'text-violet-400 bg-violet-400/10',
    tag: 'Insights',
  },
  {
    icon: RefreshCw,
    title: 'Recurring Payments',
    desc: 'Never miss a subscription again. Track, categorise, and forecast all recurring charges from SIPs to streaming services.',
    color: 'text-blue-400 bg-blue-400/10',
    tag: 'Automation',
  },
  {
    icon: ReceiptText,
    title: 'Report Builder',
    desc: 'Design custom financial reports with drag-and-drop filters across time, category, account, and currency for full analytical control.',
    color: 'text-indigo-400 bg-indigo-400/10',
    tag: 'Analytics',
  },
];

const STATS = [
  { value: '20+', label: 'Financial Modules' },
  { value: '₹ & €', label: 'Supported Currencies' },
  { value: 'AI', label: 'Oracle Insights' },
  { value: 'NSE', label: 'Stock Market' },
];

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
            <span>Your Personal Financial Intelligence Terminal</span>
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
            Arta combines AI-powered insights, Indian market intelligence, carbon tracking, 
            tax calculations, and family finance management — all in one unified terminal.
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

      {/* Stats Bar */}
      <section className="py-12 px-6 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-accent font-display mb-1">{stat.value}</div>
              <div className="text-xs font-bold text-white/30 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest mb-6">
            <Globe2 className="w-3 h-3" />
            <span>Everything in one place</span>
          </div>
          <h2 className="text-5xl font-bold tracking-tighter font-display">
            Built for the modern <span className="text-accent">Indian investor.</span>
          </h2>
          <p className="text-white/40 mt-4 max-w-xl mx-auto font-medium">
            From NSE investments to carbon tracking — Arta covers every dimension of your financial life.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 3) * 0.1 }}
              className="glass-card p-8 border-white/5 hover:border-accent/20 transition-all group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/20 border border-white/10 px-2 py-1 rounded-full">
                  {feature.tag}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-white/40 font-medium leading-relaxed text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-5xl font-bold tracking-tighter mb-8 font-display">
              Everything you need to <br />
              <span className="text-accent">reach financial freedom.</span>
            </h2>
            <div className="space-y-8">
              {[
                { icon: Wallet, title: 'Unified Accounts', desc: 'Connect all your bank accounts, credit cards, loans and investments in one secure dashboard.' },
                { icon: PieChart, title: 'Smart Budgets', desc: 'Adaptive budgets with rollover, per-transaction limits, and AI-powered overspend alerts.' },
                { icon: Target, title: 'Savings Goals', desc: 'Track progress toward your big dreams — Japan trip, emergency fund, new home — with automated savings rules.' },
                { icon: Shield, title: 'Bank-Grade Security', desc: 'All data is encrypted in transit and at rest. Every change is immutably logged in the audit trail.' },
                { icon: CreditCard, title: 'Loan Management', desc: 'EMI calculator, repayment schedules, and early closure simulations for personal loans, home loans, and more.' },
                { icon: BarChart3, title: 'Income Analytics', desc: 'Deep-dive into income sources, month-over-month growth, and tax-adjusted take-home projections.' },
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
          <div className="relative hidden lg:block">
            <div className="glass-card p-6 border-accent/20 shadow-[0_0_100px_rgba(124,110,250,0.1)]">
              <div className="space-y-4">
                {/* Mini dashboard preview */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Net Worth</div>
                    <div className="text-3xl font-bold font-mono tracking-tighter text-positive">₹24,58,320</div>
                  </div>
                  <div className="text-xs font-bold text-positive bg-positive/10 px-3 py-1.5 rounded-full">↑ 12.4%</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[['Savings', '₹8.2L'], ['Investments', '₹14.1L'], ['Cash Flow', '+₹42K']].map(([k, v]) => (
                    <div key={k} className="bg-white/5 rounded-xl p-3">
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">{k}</div>
                      <div className="text-sm font-bold font-mono">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[['RELIANCE', '+2.4%', 'text-positive'], ['TCS', '+0.8%', 'text-positive'], ['HDFC', '-1.2%', 'text-negative']].map(([s, c, cls]) => (
                    <div key={s} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-bold">{s}</span>
                      <span className={`text-sm font-bold font-mono ${cls}`}>{c}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
                  <div className="flex gap-2 items-start">
                    <BrainCircuit className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="text-xs text-white/60 leading-relaxed">
                      <span className="text-accent font-bold">AI Oracle:</span> Your transport spend increased 34% this month. Subscriptions auto-renewed for ₹4,200. Consider reviewing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/30 rounded-full blur-[80px]" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-positive/20 rounded-full blur-[60px]" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-16 border-accent/20 shadow-[0_0_80px_rgba(124,110,250,0.08)]"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-8 violet-glow">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-4xl font-bold tracking-tighter font-display mb-4">
              Ready to take control?
            </h2>
            <p className="text-white/40 mb-10 font-medium leading-relaxed">
              Join thousands of Indians who use Arta to grow wealth, eliminate wasteful spending, 
              and make every financial decision with confidence.
            </p>
            <button
              onClick={onGetStarted}
              className="px-12 py-5 rounded-2xl bg-accent text-white font-bold text-lg hover:bg-accent/80 transition-all violet-glow flex items-center gap-3 mx-auto group"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5">
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
          <p className="text-xs font-bold text-white/10 uppercase tracking-widest">© 2025 Arta Finance Neural Engine</p>
        </div>
      </footer>
    </div>
  );
};


