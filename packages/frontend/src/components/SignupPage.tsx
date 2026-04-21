import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, ShieldCheck, Fingerprint, X, Shield } from 'lucide-react';
import { MIDDLEWARE_BASE } from '../services/api';

interface SignupPageProps {
  onSignup: (name: string, email: string, token?: string, createdAt?: string) => void;
  onSwitchToLogin: () => void;
  onBackToHome: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onSwitchToLogin, onBackToHome }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [signupResult, setSignupResult] = useState<{ name: string; email: string; token: string; createdAt: string } | null>(null);
  const [isBiometricRegistering, setIsBiometricRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { authApi } = await import('../services/api');
      const result = await authApi.register(name, email, password);
      
      setIsLoading(true);
      setSignupResult({ name, email: result.user?.email || email, token: result.token, createdAt: result.user?.createdAt });
      setShowBiometricPrompt(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Signup Error:', err);
      setError(err.message || 'Registration failed. Please check your connection.');
      setIsLoading(false);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!signupResult) return;
    setIsBiometricRegistering(true);
    try {
      // 1. Get options from backend
      const optionsRes = await fetch(`${MIDDLEWARE_BASE}/api/auth/webauthn/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: signupResult.email, name: signupResult.name })
      });
      
      if (!optionsRes.ok) throw new Error('Failed to get registration options');
      const options = await optionsRes.json();

      // 2. Start WebAuthn registration
      const { startRegistration } = await import('@simplewebauthn/browser');
      const regResponse = await startRegistration(options);

      // 3. Verify in backend
      const verifyRes = await fetch(`${MIDDLEWARE_BASE}/api/auth/webauthn/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(regResponse)
      });

      if (!verifyRes.ok) throw new Error('Biometric verification failed');
      
      // Successfully registered biometric
      localStorage.setItem('yugi_biometric_enabled', 'true');
      onSignup(signupResult.name, signupResult.email, signupResult.token, signupResult.createdAt);
    } catch (err: any) {
      console.error('Biometric Registration Error:', err);
      setError(err.message || 'Biometric registration failed');
      setIsBiometricRegistering(false);
    }
  };

  const skipBiometric = () => {
    if (signupResult) {
      onSignup(signupResult.name, signupResult.email, signupResult.token, signupResult.createdAt);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed top-0 right-1/4 w-[800px] h-[800px] bg-accent/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-1/4 w-[600px] h-[600px] bg-positive/5 rounded-full blur-[140px] pointer-events-none -z-10" />

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
          <h1 className="text-4xl font-bold tracking-tighter mb-2 font-display">Join the Future</h1>
          <p className="text-white/40 font-medium">Create your private financial intelligence account</p>
        </div>

        <div className="glass-card p-8 border-white/5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                <input 
                  type="text" 
                  placeholder="John Doe"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent/50 transition-all font-medium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

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
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                <input 
                  type="password" 
                  placeholder="Min. 8 characters"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent/50 transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <ShieldCheck className="w-5 h-5 text-positive shrink-0 mt-0.5" />
              <p className="text-[10px] text-white/40 leading-relaxed">
                By signing up, you agree to our <span className="text-white/60 underline">Terms of Service</span> and <span className="text-white/60 underline">Privacy Policy</span>. Your data is always yours.
              </p>
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
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-white/30 font-medium">
              Already have an account?{' '}
              <Link 
                to="/login"
                className="text-accent font-bold hover:text-white transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showBiometricPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={skipBiometric}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-card p-10 border-accent/30 shadow-[0_0_80px_rgba(124,110,250,0.2)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={skipBiometric} className="text-white/20 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto mb-8 relative">
                  <Fingerprint className="w-10 h-10 text-accent" />
                  <div className="absolute inset-0 bg-accent/20 rounded-3xl blur-xl animate-pulse" />
                </div>
                
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Security Upgrade</h3>
                <p className="text-sm text-white/40 font-medium leading-relaxed mb-8">
                  Enable biometric unlock to access your financial terminal with just your fingerprint or face. 
                  <span className="block mt-2 text-white/20 text-[10px] uppercase font-bold tracking-widest">Powered by WebAuthn</span>
                </p>

                <div className="space-y-4">
                  <button 
                    onClick={handleRegisterBiometric}
                    disabled={isBiometricRegistering}
                    className="w-full py-4 rounded-xl bg-accent text-white font-bold hover:bg-accent/80 transition-all violet-glow flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isBiometricRegistering ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        <span>Enable Biometrics</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={skipBiometric}
                    disabled={isBiometricRegistering}
                    className="w-full py-4 rounded-xl bg-white/5 text-white/40 font-bold hover:bg-white/10 transition-all"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
