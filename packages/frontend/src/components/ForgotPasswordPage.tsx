import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, Lock, KeyRound } from 'lucide-react';
import { MIDDLEWARE_BASE } from '../services/api';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
  onBackToHome: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBackToLogin, onBackToHome }) => {
  const [step, setStep] = useState<'email' | 'otp' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Unable to send reset code. Please try again.');
      } else {
        setStep('otp');
      }
    } catch {
      setError('Unable to reach server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code sent to your email');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Invalid or expired code. Please try again.');
      } else {
        setStep('done');
      }
    } catch {
      setError('Unable to reach server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-accent/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-positive/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <button
            onClick={onBackToHome}
            aria-label="Back to home"
            className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6 violet-glow hover:scale-110 transition-transform"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </button>
          <h1 className="text-4xl font-bold tracking-tighter mb-2 font-display">Reset Password</h1>
          <p className="text-white/40 font-medium">
            {step === 'email' ? "We'll send a 6-digit code to your email" :
             step === 'otp' ? `Enter the code sent to ${email}` :
             'Password updated successfully'}
          </p>
        </div>

        <div className="glass-card p-8 border-white/5 shadow-2xl">
          {/* Step indicator */}
          {step !== 'done' && (
            <div className="flex items-center gap-2 mb-6">
              <div className={`h-1 flex-1 rounded-full ${step === 'email' ? 'bg-accent' : 'bg-white/20'}`} />
              <div className={`h-1 flex-1 rounded-full ${step === 'otp' ? 'bg-accent' : 'bg-white/10'}`} />
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 rounded-xl bg-negative/10 border border-negative/20 flex items-center gap-3 text-negative text-xs font-bold"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent/50 transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-accent text-white font-bold hover:bg-accent/80 transition-all violet-glow flex items-center justify-center gap-3 group disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Code</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">6-Digit Code</label>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent/50 transition-all font-medium tracking-[0.5em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent/50 transition-all font-medium"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent/50 transition-all font-medium"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-accent text-white font-bold hover:bg-accent/80 transition-all violet-glow flex items-center justify-center gap-3 group disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); }}
                className="w-full text-sm text-white/40 hover:text-white/60 transition-colors text-center"
              >
                Didn't receive the code? Go back
              </button>
            </form>
          )}

          {step === 'done' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-20 h-20 rounded-full bg-positive/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-positive" />
              </div>
              <h3 className="text-2xl font-bold mb-2 tracking-tight">Password Updated</h3>
              <p className="text-white/40 font-medium mb-8">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <button
                onClick={onBackToLogin}
                className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
              >
                Back to Login
              </button>
            </motion.div>
          )}

          {step !== 'done' && (
            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <button
                onClick={onBackToLogin}
                className="text-sm text-accent font-bold hover:text-white transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
