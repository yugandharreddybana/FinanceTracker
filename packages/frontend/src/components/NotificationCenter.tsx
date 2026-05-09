import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, AlertCircle, CheckCircle2, Calendar, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  time: string;
  read: boolean;
  icon?: any;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkAsRead,
  onClearAll 
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className="fixed top-24 right-8 w-[400px] max-h-[600px] z-[210] glass-card border-accent/20 shadow-[0_0_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-accent/5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="w-5 h-5 text-accent" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-negative rounded-full border-2 border-[#0F0F19]" />
                  )}
                </div>
                <h3 className="font-bold tracking-tight">Notifications</h3>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={onClearAll}
                  className="text-[10px] font-bold text-white/20 uppercase tracking-widest hover:text-white transition-colors"
                >
                  Clear All
                </button>
                <button aria-label="Close notifications" onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-white/20" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-20 text-center">
                  <Bell className="w-12 h-12 text-white/5 mx-auto mb-4" />
                  <p className="text-white/20 font-medium">No new notifications</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = n.icon || (n.type === 'warning' ? AlertCircle : n.type === 'success' ? CheckCircle2 : Info);
                  return (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => onMarkAsRead(n.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                        n.read ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-accent/5 border-accent/20"
                      )}
                    >
                      {!n.read && <div className="absolute top-0 left-0 w-1 h-full bg-accent" />}
                      <div className="flex gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          n.type === 'warning' ? "bg-negative/10 text-negative" : 
                          n.type === 'success' ? "bg-positive/10 text-positive" : 
                          "bg-accent/10 text-accent"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-sm truncate pr-4">{n.title}</h4>
                            <span className="text-[10px] font-bold text-white/20 whitespace-nowrap">{n.time}</span>
                          </div>
                          <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5">
              <button 
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Close Panel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
