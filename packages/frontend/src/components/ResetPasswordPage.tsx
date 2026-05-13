import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { MIDDLEWARE_BASE } from '../services/api';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 1. Verification Check: Certify token exists visually on mount
  useEffect(() => {
    if (!token) {
      setError('Direct access inhibited. An authentic reset token must be supplied.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid request. No reset token detected.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Confirm password does not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          newPassword 
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to reset password. Link may have expired.');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Network communication disrupted. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-testid="page-reset-password" className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-accent/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-positive/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6 violet-glow">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter mb-2 font-display text-white">Finalize Reset</h1>
          <p className="text-white/40 font-medium">
            Set a strong new password to regain access
          </p>
        </div>

        <div className="glass-card p-8 border-white/5 shadow-2xl">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2 tracking-tight text-white">Mission Complete!</h3>
                <p className="text-white/50 font-medium mb-8">
                  Your password was restored successfully. You are now cleared to access the system again.
                </p>
                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full py-4 rounded-xl bg-accent text-white font-bold hover:bg-accent/80 transition-all violet-glow flex items-center justify-center gap-2"
                >
                  Proceed to Login <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div key="form-view">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm font-semibold"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">New Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter new password"
                        disabled={!token}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 outline-none focus:border-accent/50 transition-all font-medium text-white placeholder:text-white/20 disabled:opacity-50"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={!token}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 disabled:hidden"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Confirm New Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                      <input
                        type="password"
                        required
                        placeholder="Repeat new password"
                        disabled={!token}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent/50 transition-all font-medium text-white placeholder:text-white/20 disabled:opacity-50"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !token}
                    className="w-full py-4 mt-4 rounded-xl bg-accent text-white font-bold hover:bg-accent/80 transition-all violet-glow flex items-center justify-center gap-3 group disabled:opacity-40"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Finalize Password Reset</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-white/5 text-center">
                  <Link
                    to="/login"
                    className="text-sm text-white/40 font-bold hover:text-white transition-colors"
                  >
                    Back to Login Gateway
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
