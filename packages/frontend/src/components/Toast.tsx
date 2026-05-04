import React, { useState, useEffect, useCallback } from 'react';

interface ToastItem {
  id: string;
  message: string;
  type: 'error' | 'success' | 'warning' | 'info';
  progress: number;
}

const TYPE_STYLES: Record<ToastItem['type'], string> = {
  error: 'bg-red-500/20 border-red-500/40 text-red-200',
  success: 'bg-green-500/20 border-green-500/40 text-green-200',
  warning: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200',
  info: 'bg-blue-500/20 border-blue-500/40 text-blue-200',
};

const PROGRESS_COLOR: Record<ToastItem['type'], string> = {
  error: 'bg-red-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

const ICONS: Record<ToastItem['type'], string> = {
  error: '❌',
  success: '✅',
  warning: '⚠️',
  info: 'ℹ️',
};

const TOAST_DURATION = 4000;
const MAX_TOASTS = 5;

export function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail as { message: string; type: ToastItem['type'] };
      const id = crypto.randomUUID();
      setToasts(prev => {
        const next = [{ id, message, type, progress: 100 }, ...prev];
        // Max 5 toasts — drop oldest
        return next.slice(0, MAX_TOASTS);
      });

      // Auto-dismiss after 4 seconds
      setTimeout(() => dismiss(id), TOAST_DURATION);
    };

    window.addEventListener('finance-toast', handler);
    return () => window.removeEventListener('finance-toast', handler);
  }, [dismiss]);

  // Animate progress bar
  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = setInterval(() => {
      setToasts(prev =>
        prev.map(t => ({ ...t, progress: Math.max(0, t.progress - (100 / (TOAST_DURATION / 100))) }))
      );
    }, 100);
    return () => clearInterval(interval);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-80">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`relative border rounded-xl p-4 shadow-xl backdrop-blur-xl overflow-hidden transition-all duration-300 translate-x-0 ${TYPE_STYLES[toast.type]}`}
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">{ICONS[toast.type]}</span>
            <p className="text-sm font-medium leading-snug flex-1">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0 text-xs"
            >
              ✕
            </button>
          </div>
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div
              className={`h-full transition-all ${PROGRESS_COLOR[toast.type]}`}
              style={{ width: `${toast.progress}%` }}
            />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
