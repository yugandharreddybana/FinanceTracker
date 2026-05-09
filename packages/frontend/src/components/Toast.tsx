import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'ai';
interface Toast { id: string; type: ToastType; title: string; message?: string; }

interface ToastContextType { toast: (type: ToastType, title: string, message?: string) => void; }
const ToastContext = createContext<ToastContextType>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info, ai: Sparkles };
const STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-rose-50 border-rose-200 text-rose-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  ai: 'bg-violet-50 border-violet-200 text-violet-800',
};
const ICON_STYLES = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  info: 'text-blue-500',
  ai: 'text-violet-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, title, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const remove = (id: string) => setToasts(p => p.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container — top right */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-[200] flex flex-col gap-2 sm:w-96 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = ICONS[t.type];
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={cn('pointer-events-auto rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-sm flex items-start gap-3', STYLES[t.type])}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', ICON_STYLES[t.type])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{t.title}</p>
                  {t.message && <p className="text-xs mt-0.5 opacity-80">{t.message}</p>}
                </div>
                <button onClick={() => remove(t.id)} className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
