import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[300] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <ToastItem toast={toast} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const Icon = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  }[toast.type];

  const colors = {
    success: 'text-positive border-positive/20 bg-positive/5',
    error: 'text-negative border-negative/20 bg-negative/5',
    warning: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
    info: 'text-accent border-accent/20 bg-accent/5'
  }[toast.type];

  return (
    <div className={cn(
      "glass-card p-5 min-w-[320px] max-w-md border flex items-start gap-4 shadow-2xl backdrop-blur-2xl",
      colors
    )}>
      <div className="mt-1 shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold tracking-tight mb-1">{toast.title}</h4>
        <p className="text-xs text-white/60 leading-relaxed">{toast.message}</p>
      </div>
      <button 
        onClick={onClose}
        className="mt-1 p-1 hover:bg-white/5 rounded-lg transition-all text-white/20 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Progress Bar */}
      <motion.div 
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
        className={cn(
          "absolute bottom-0 left-0 h-[2px]",
          {
            success: 'bg-positive',
            error: 'bg-negative',
            warning: 'bg-amber-500',
            info: 'bg-accent'
          }[toast.type]
        )}
      />
    </div>
  );
};
