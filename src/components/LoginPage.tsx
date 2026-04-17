import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, Lock, ArrowRight, Loader2, AlertCircle, Fingerprint } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string) => void;
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
  onBackToHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSwitchToSignup, onForgotPassword, onBackToHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBiometricLogin = () => {
    setIsBiometricLoading(true);
    setTimeout(() => {
      setIsBiometricLoading(false);
      onLogin(email || 'yugandharreddybana@outlook.com');
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin(email);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
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
          <h1 className="text-4xl font-bold tracking-tighter mb-2 font-display">Welcome Back</h1>
          <p className="text-white/40 font-medium">Enter your credentials to access your terminal</p>
        </div>

        <div className="glass-card p-8 border-white/5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-xl bg-negative/10 border border-negative/20 flex items-center gap-3 text-negative text-xs font-bold"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}

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

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Password</label>
                <Link 
                  to="/forgot-password"
                  className="text-[10px] font-bold text-accent uppercase tracking-widest hover:text-white transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent/50 transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading || isBiometricLoading}
              className="w-full py-4 rounded-xl bg-accent text-white font-bold hover:bg-accent/80 transition-all violet-glow flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Login to Terminal</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-[#050508] px-4 text-white/20">Or Secure Unlock</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleBiometricLogin}
              disabled={isLoading || isBiometricLoading}
              className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {isBiometricLoading ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-6 h-6">
                    <Fingerprint className="w-6 h-6 text-accent animate-pulse" />
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      transition={{ duration: 2, ease: "linear" }}
                      className="absolute top-0 left-0 w-full bg-accent/20 overflow-hidden"
                    />
                  </div>
                  <span className="text-accent animate-pulse">Scanning Biometrics...</span>
                </div>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 group-hover:text-accent transition-colors" />
                  <span>Biometric Unlock</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-white/30 font-medium">
              New to Yugi?{' '}
              <Link 
                to="/signup"
                className="text-accent font-bold hover:text-white transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] font-bold text-white/10 uppercase tracking-[0.3em]">
          Secure AES-256 Encrypted Connection
        </p>
      </motion.div>
    </div>
  );
};
