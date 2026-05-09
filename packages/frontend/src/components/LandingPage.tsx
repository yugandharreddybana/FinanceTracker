import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Wallet, BarChart3, Target, TrendingUp, Shield, Sparkles, ArrowRight, Check, Zap, Globe, Users } from 'lucide-react';

const features = [
  { icon: BarChart3, title: 'Smart Budgeting', desc: 'AI-powered budget tracking that learns your habits and adapts.', gradient: 'from-blue-500 to-cyan-400' },
  { icon: Target, title: 'Savings Goals', desc: 'Visual goal tracking with smart milestones and auto-reminders.', gradient: 'from-emerald-500 to-teal-400' },
  { icon: TrendingUp, title: 'Live Investments', desc: 'Real-time portfolio tracking with market insights.', gradient: 'from-violet-500 to-purple-400' },
  { icon: Sparkles, title: 'AI Oracle', desc: 'Chat with your personal AI finance advisor anytime.', gradient: 'from-amber-500 to-orange-400' },
  { icon: Shield, title: 'Bank-Grade Security', desc: 'End-to-end encryption with zero-knowledge architecture.', gradient: 'from-rose-500 to-pink-400' },
  { icon: Zap, title: 'Instant Sync', desc: 'All your accounts synced in real-time across devices.', gradient: 'from-cyan-500 to-blue-400' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Nav */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-50 glass border-b border-slate-200/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl animated-gradient shadow-lg shadow-emerald-200">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">Yugi<span className="text-emerald-600">Finance</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:inline text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2">Sign In</Link>
            <Link to="/signup" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-300">Get Started</Link>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-40 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-cyan-100/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 mb-8">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">AI-Powered Finance Tracking</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1]"
          >
            Your Money,{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Simplified</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none"><path d="M2 10C50 4 150 -2 298 6" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round"/><defs><linearGradient id="grad" x1="0" y1="0" x2="300" y2="0"><stop stopColor="#10b981"/><stop offset="1" stopColor="#06b6d4"/></linearGradient></defs></svg>
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="mx-auto mt-8 max-w-2xl text-lg md:text-xl text-slate-500 leading-relaxed">
            Track expenses, grow investments, and get AI-powered insights — all in one beautiful dashboard.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup"
              className="group inline-flex items-center gap-2.5 rounded-full animated-gradient px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-bold text-white shadow-xl shadow-emerald-200/50 transition-all hover:shadow-2xl hover:scale-[1.02] w-full sm:w-auto justify-center">
              Start Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-bold text-slate-700 transition-all hover:border-slate-300 hover:shadow-lg w-full sm:w-auto justify-center">
              Try Demo
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.7 }}
            className="mt-20 mx-auto max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, val: '50K+', label: 'Active Users' },
              { icon: Globe, val: '₹500Cr+', label: 'Tracked' },
              { icon: Sparkles, val: '4.9★', label: 'App Rating' },
              { icon: Shield, val: '99.9%', label: 'Uptime' },
            ].map((s, i) => (
              <div key={i} className="glass rounded-2xl p-5 text-center hover:shadow-lg transition-shadow">
                <s.icon className="mx-auto h-5 w-5 text-emerald-500 mb-2" />
                <p className="text-2xl font-extrabold text-slate-900">{s.val}</p>
                <p className="text-xs font-medium text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-sm font-bold uppercase tracking-widest text-emerald-600">Features</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">Everything you need, nothing you don't</h2>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} variants={item}
                className="group relative rounded-3xl bg-white p-8 border border-slate-100 hover:border-transparent hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 cursor-default">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} shadow-lg`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-sm font-bold uppercase tracking-widest text-emerald-600">Pricing</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">Simple, transparent pricing</h2>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Free', price: '₹0', desc: 'Get started', features: ['3 accounts', 'Basic budgeting', 'Transaction tracking', 'Mobile access'] },
              { name: 'Pro', price: '₹199', period: '/mo', desc: 'Power users', popular: true, features: ['Unlimited accounts', 'AI insights & chat', 'Investment tracking', 'Custom reports', 'Priority support', 'Export data'] },
              { name: 'Family', price: '₹399', period: '/mo', desc: 'For families', features: ['Everything in Pro', '5 family members', 'Shared budgets', 'Parental controls', 'Family goals', 'Dedicated support'] },
            ].map((p, i) => (
              <div key={i} className={`relative rounded-3xl p-8 transition-all duration-300 hover:scale-[1.02] ${p.popular ? 'bg-slate-900 text-white shadow-2xl shadow-slate-400/30 ring-4 ring-emerald-400/30' : 'bg-white border border-slate-200 hover:shadow-xl'}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="rounded-full bg-emerald-400 px-4 py-1 text-xs font-bold text-slate-900">MOST POPULAR</span></div>}
                <h3 className={`text-lg font-bold ${p.popular ? 'text-white' : 'text-slate-900'}`}>{p.name}</h3>
                <div className="mt-4 flex items-end gap-1">
                  <span className={`text-4xl font-black ${p.popular ? 'text-white' : 'text-slate-900'}`}>{p.price}</span>
                  {p.period && <span className={p.popular ? 'text-slate-400' : 'text-slate-500'}>{p.period}</span>}
                </div>
                <p className={`mt-2 text-sm ${p.popular ? 'text-slate-400' : 'text-slate-500'}`}>{p.desc}</p>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3">
                      <Check className={`h-4 w-4 flex-shrink-0 ${p.popular ? 'text-emerald-400' : 'text-emerald-500'}`} />
                      <span className={`text-sm ${p.popular ? 'text-slate-300' : 'text-slate-600'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-bold transition-all ${p.popular ? 'bg-emerald-400 text-slate-900 hover:bg-emerald-300' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Get Started</Link>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="rounded-[2rem] animated-gradient p-12 lg:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-10 right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative text-3xl sm:text-4xl font-black">Ready to take control?</h2>
            <p className="relative mt-4 text-lg text-white/80 max-w-xl mx-auto">Join 50,000+ users saving smarter every month.</p>
            <Link to="/signup" className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-bold text-slate-900 shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg animated-gradient flex items-center justify-center"><Wallet className="h-4 w-4 text-white" /></div>
            <span className="font-bold text-slate-900">YugiFinance</span>
          </div>
          <p className="text-sm text-slate-400">© 2025 Yugi Finance. Built with ❤️</p>
        </div>
      </footer>
    </div>
  );
}
