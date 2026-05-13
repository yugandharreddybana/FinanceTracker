import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useFinance } from '../context/FinanceContext';
import { Wallet, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Check } from 'lucide-react';

export function SignupPage() {
  const { signup } = useFinance();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = password.length >= 8 ? (password.length >= 12 ? 3 : 2) : password.length > 0 ? 1 : 0;
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation check enforcing redundant verification envelope parity
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await signup(name, email, password);
      if (ok) navigate('/app/dashboard');
      else setError('Failed to create account');
    } catch (err: any) { 
      setError(err.message || 'Something went wrong'); 
    }
    finally { setIsLoading(false); }
  };

  return (
    <div data-testid="page-signup" className="flex min-h-screen">
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-1 flex-col justify-center px-5 sm:px-8 py-8 sm:py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-10 inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl animated-gradient shadow-lg shadow-emerald-200">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-slate-900">Yugi<span className="text-emerald-600">Finance</span></span>
          </Link>

          <h1 className="text-3xl font-black text-slate-900">Create your account 🚀</h1>
          <p className="mt-2 text-slate-500">Start your journey to financial freedom</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            {error && <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-600 font-medium">{error}</div>}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
              <div className="group relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Yugandhar Reddy" required
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <div className="group relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-12 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-slate-100'}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-semibold ${strength === 3 ? 'text-emerald-600' : strength === 2 ? 'text-amber-600' : 'text-rose-500'}`}>{strengthLabels[strength]}</span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
              </div>
            </div>

            <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl animated-gradient py-4 text-sm font-bold text-white shadow-xl shadow-emerald-200/50 transition-all disabled:opacity-60">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
            </motion.button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700">Sign in</Link>
          </p>
        </div>
      </motion.div>

      {/* Right */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-emerald-500/10 blob" />
        <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-violet-500/10 blob" style={{ animationDelay: '4s' }} />

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10 max-w-md p-12 text-white">
          <h2 className="text-3xl font-black">Why choose Yugi?</h2>
          <div className="mt-8 space-y-5">
            {[
              'Track every rupee with zero effort',
              'AI-powered insights that save you ₹10K+/yr',
              'Grow your investments 3x faster',
              'Bank-grade encryption for peace of mind',
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.15 }}
                className="flex items-center gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-slate-300">{t}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
