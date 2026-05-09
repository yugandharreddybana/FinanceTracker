import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

/**
 * ResetPasswordPage — redirects to /forgot-password.
 *
 * The backend uses an OTP-based reset flow (email → 6-digit code → new password),
 * not a token-link flow. This page exists only to handle any legacy /reset-password
 * links gracefully by redirecting users to the correct flow.
 */
export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/forgot-password', { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden text-white">
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-accent/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-positive/5 rounded-full blur-[140px] pointer-events-none -z-10" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6 violet-glow">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tighter mb-3 font-display">Redirecting…</h1>
        <p className="text-white/40 font-medium">
          Taking you to the password reset page.
        </p>
        <button
          onClick={() => navigate('/forgot-password', { replace: true })}
          className="mt-8 px-8 py-3 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all violet-glow"
        >
          Go Now
        </button>
      </motion.div>
    </div>
  );
};
