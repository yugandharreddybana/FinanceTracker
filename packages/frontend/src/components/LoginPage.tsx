import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useFinance } from '../context/FinanceContext';
import { Wallet, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';

export function LoginPage() {
  const { login } = useFinance();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const ok = await login(email, password);
      if (ok) navigate('/app/dashboard');
      else setError('Invalid credentials');
    } catch { setError('Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleDemo = async () => {
    setIsLoading(true);
    await login('demo@yugifinance.com', 'demo123');
    navigate('/app/dashboard');
  };

  return (
    <div className="flex min-h-screen">
      {/* Left */}
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-1 flex-col justify-center px-5 sm:px-8 py-8 sm:py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-10 inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl animated-gradient shadow-lg shadow-emerald-200">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-slate-900">Yugi<span className="text-emerald-600">Finance</span></span>
          </Link>

          <h1 className="text-3xl font-black text-slate-900">Welcome back 👋</h1>
          <p className="mt-2 text-slate-500">Sign in to continue managing your finances</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-600 font-medium">{error}</motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <div className="group relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <button type="button" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Forgot?</button>
              </div>
              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-12 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl animated-gradient py-4 text-sm font-bold text-white shadow-xl shadow-emerald-200/50 transition-all disabled:opacity-60 disabled:shadow-none">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
            </motion.button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">or continue with</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <motion.button onClick={handleDemo} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-white py-3.5 text-sm font-bold text-slate-700 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">
            <Sparkles className="h-4 w-4" />
            Try Demo Account — Instant Access
          </motion.button>

          <p className="mt-8 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-emerald-600 hover:text-emerald-700">Create one free</Link>
          </p>
        </div>
      </motion.div>

      {/* Right — animated illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden animated-gradient">
        <div className="absolute inset-0 bg-black/5" />
        {/* Floating blobs */}
        <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white/10 blob" />
        <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-white/10 blob" style={{ animationDelay: '4s' }} />

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10 max-w-md p-12 text-center text-white">
          <div className="mb-8 float">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl">
              <span className="text-5xl">💰</span>
            </div>
          </div>
          <h2 className="text-3xl font-black">Track Your Wealth</h2>
          <p className="mt-4 text-lg text-white/70">Join 50,000+ users who have taken control of their finances</p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[{ v: '₹500Cr+', l: 'Tracked' }, { v: '4.9★', l: 'Rating' }].map((s, i) => (
              <div key={i} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5">
                <p className="text-2xl font-black">{s.v}</p>
                <p className="text-sm text-white/60 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
