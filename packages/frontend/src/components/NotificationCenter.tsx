import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  time: string;
  createdAt?: number;
  navigateTo?: string;
  read: boolean;
  icon?: React.ElementType;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllRead?: () => void;
  onNavigate?: (path: string) => void;
  onClearAll: () => void;
}

function relativeLabel(n: Notification): string {
  if (typeof n.createdAt === 'number' && Number.isFinite(n.createdAt)) {
    try {
      return formatDistanceToNow(n.createdAt, { addSuffix: true });
    } catch {
      return n.time;
    }
  }
  return n.time;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllRead,
  onNavigate,
  onClearAll,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const uniqueNotifications = useMemo(
    () => Array.from(new Map(notifications.map((n) => [n.id, n])).values()),
    [notifications],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[2px]"
          />
          <motion.div
            data-testid="notification-center-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className="fixed top-16 sm:top-24 right-3 sm:right-6 left-3 sm:left-auto w-auto sm:w-[min(100vw-3rem,400px)] max-h-[min(100vh-6rem,600px)] z-[210] bg-white border border-slate-200 shadow-xl rounded-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Bell className="w-5 h-5 text-emerald-600" aria-hidden />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <h3 className="font-bold tracking-tight text-slate-900 truncate">Notifications</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && onMarkAllRead && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100"
                >
                  Clear
                </button>
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {uniqueNotifications.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" aria-hidden />
                  <p className="text-slate-500 font-medium text-sm">No notifications yet</p>
                </div>
              ) : (
                uniqueNotifications.map((n) => {
                  const Icon =
                    n.icon || (n.type === 'warning' ? AlertCircle : n.type === 'success' ? CheckCircle2 : Info);
                  return (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          onMarkAsRead(n.id);
                          if (n.navigateTo && onNavigate) onNavigate(n.navigateTo);
                        }
                      }}
                      onClick={() => {
                        onMarkAsRead(n.id);
                        if (n.navigateTo && onNavigate) onNavigate(n.navigateTo);
                      }}
                      className={cn(
                        'p-3 rounded-xl border transition-all cursor-pointer text-left w-full relative',
                        n.read
                          ? 'bg-slate-50 border-slate-100 opacity-75'
                          : 'bg-white border-slate-200 shadow-sm hover:border-emerald-200',
                      )}
                    >
                      {!n.read && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-emerald-500" aria-hidden />
                      )}
                      <div className="flex gap-3 pl-1">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                            n.type === 'warning'
                              ? 'bg-rose-50 text-rose-600'
                              : n.type === 'success'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-sky-50 text-sky-600',
                          )}
                        >
                          <Icon className="w-4 h-4" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-0.5">
                            <h4 className="font-semibold text-sm text-slate-900 truncate">{n.title}</h4>
                            <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap shrink-0">
                              {relativeLabel(n)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{n.message}</p>
                          {n.navigateTo && (
                            <p className="text-[10px] font-semibold text-emerald-600 mt-1.5">Tap to open →</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/80">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
