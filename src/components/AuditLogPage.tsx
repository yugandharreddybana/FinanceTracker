import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Search, Download, User, Clock, Tag, FileText, ChevronRight, Trash2, RotateCcw, Timer, AlertTriangle, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { AuditLog } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

const TRASH_STORAGE_KEY = 'ft_audit_trash';
const TRASH_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface TrashedLog extends AuditLog {
  deletedAt: string;
}

function loadTrash(): TrashedLog[] {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return [];
    const items: TrashedLog[] = JSON.parse(raw);
    // Auto-purge items older than 24 hours
    const valid = items.filter(item => Date.now() - new Date(item.deletedAt).getTime() < TRASH_TTL_MS);
    if (valid.length !== items.length) {
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

function saveTrash(items: TrashedLog[]) {
  localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(items));
}

function getExpiryLabel(deletedAt: string): { label: string; urgent: boolean } {
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  const remaining = TRASH_TTL_MS - elapsed;
  if (remaining <= 0) return { label: 'Expiring soon', urgent: true };
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const urgent = hours < 2;
  if (hours > 0) return { label: `Deletes in ${hours}h ${minutes}m`, urgent };
  return { label: `Deletes in ${minutes}m`, urgent: true };
}

export const AuditLogPage: React.FC = () => {
  const { auditLogs } = useFinance();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'logs' | 'trash'>('logs');
  const [trash, setTrash] = useState<TrashedLog[]>(() => loadTrash());
  const [, forceUpdate] = useState(0);

  // Refresh expiry labels every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = loadTrash();
      setTrash(fresh);
      forceUpdate(n => n + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const moveToTrash = useCallback((log: AuditLog) => {
    const item: TrashedLog = { ...log, deletedAt: new Date().toISOString() };
    const updated = [item, ...trash];
    saveTrash(updated);
    setTrash(updated);
  }, [trash]);

  const restoreFromTrash = useCallback((id: string) => {
    const updated = trash.filter(item => item.id !== id);
    saveTrash(updated);
    setTrash(updated);
  }, [trash]);

  const deleteFromTrash = useCallback((id: string) => {
    const updated = trash.filter(item => item.id !== id);
    saveTrash(updated);
    setTrash(updated);
  }, [trash]);

  const emptyTrash = useCallback(() => {
    saveTrash([]);
    setTrash([]);
  }, []);

  // IDs already in trash — don't show "move to trash" again
  const trashedIds = new Set(trash.map(t => t.id));

  const filteredLogs = auditLogs.filter(log => {
    if (trashedIds.has(log.id)) return false;
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'All' || log.entityType === filterType;
    return matchesSearch && matchesFilter;
  });

  const entityTypes = ['All', ...Array.from(new Set(auditLogs.map(log => log.entityType)))];

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-positive bg-positive/10 border-positive/20';
      case 'UPDATE': return 'text-accent bg-accent/10 border-accent/20';
      case 'DELETE': return 'text-negative bg-negative/10 border-negative/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
            <History className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-white/40 mt-1">Transparent history of all significant financial changes</p>
          </div>
        </div>

        <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 transition-all">
          <Download className="w-4 h-4" />
          <span>Export Logs</span>
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-8 border-b border-white/5 pb-0">
        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            "px-6 py-3 text-sm font-bold tracking-widest uppercase transition-all border-b-2 -mb-px",
            activeTab === 'logs'
              ? "border-accent text-accent"
              : "border-transparent text-white/40 hover:text-white/60"
          )}
        >
          Activity Logs
          <span className="ml-2 text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full">{auditLogs.length - trashedIds.size}</span>
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={cn(
            "px-6 py-3 text-sm font-bold tracking-widest uppercase transition-all border-b-2 -mb-px flex items-center gap-2",
            activeTab === 'trash'
              ? "border-negative text-negative"
              : "border-transparent text-white/40 hover:text-white/60"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Trash
          {trash.length > 0 && (
            <span className="text-xs bg-negative/20 text-negative px-2 py-0.5 rounded-full">{trash.length}</span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'logs' ? (
          <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Search logs by action, details, or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-accent/50 transition-all"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                {entityTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      filterType === type
                        ? "bg-accent border-accent text-white"
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Logs Timeline */}
            <div className="space-y-4">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className="glass-card p-6 group hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest mt-1 shrink-0",
                          getActionColor(log.action)
                        )}>
                          {log.action}
                        </div>

                        <div>
                          <h3 className="text-lg font-medium text-white group-hover:text-accent transition-colors">
                            {log.details}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-white/40">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              <span>{log.userName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5" />
                              <span>{log.entityType}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              <span className="font-mono text-[10px]">{log.entityId}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                          <div className="flex items-center gap-1.5 text-white/60 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                          </div>
                          <div className="text-[10px] text-white/20 uppercase font-bold tracking-tighter mt-0.5">
                            {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                          </div>
                        </div>

                        <button
                          onClick={() => moveToTrash(log)}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-negative/10 border border-negative/20 text-negative hover:bg-negative/20 transition-all"
                          title="Move to trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white/40 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center glass-card">
                  <History className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/40 font-medium">No audit logs found matching your criteria</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="trash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Trash info banner */}
            <div className="flex items-center justify-between mb-6 p-4 rounded-2xl bg-negative/5 border border-negative/20">
              <div className="flex items-center gap-3 text-sm text-white/60">
                <Timer className="w-4 h-4 text-negative" />
                <span>Items in trash are automatically deleted after <strong className="text-white">24 hours</strong></span>
              </div>
              {trash.length > 0 && (
                <button
                  onClick={emptyTrash}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-negative/10 border border-negative/20 text-negative text-xs font-bold hover:bg-negative/20 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Empty Trash
                </button>
              )}
            </div>

            <div className="space-y-4">
              {trash.length > 0 ? (
                trash.map((item, index) => {
                  const expiry = getExpiryLabel(item.deletedAt);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className="glass-card p-6 border-negative/10 hover:border-negative/20 transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest mt-1 shrink-0 opacity-50",
                            getActionColor(item.action)
                          )}>
                            {item.action}
                          </div>

                          <div>
                            <h3 className="text-lg font-medium text-white/60 line-through decoration-white/20">
                              {item.details}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-white/30">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                <span>{item.userName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5" />
                                <span>{item.entityType}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Trashed {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className={cn(
                            "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border",
                            expiry.urgent
                              ? "text-negative bg-negative/10 border-negative/20"
                              : "text-white/40 bg-white/5 border-white/10"
                          )}>
                            {expiry.urgent && <AlertTriangle className="w-3 h-3" />}
                            <Timer className="w-3 h-3" />
                            {expiry.label}
                          </div>

                          <button
                            onClick={() => restoreFromTrash(item.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-positive/10 border border-positive/20 text-positive text-xs font-bold hover:bg-positive/20 transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>

                          <button
                            onClick={() => deleteFromTrash(item.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-negative/10 border border-negative/20 text-negative text-xs font-bold hover:bg-negative/20 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 text-center glass-card">
                  <Trash2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/40 font-medium">Trash is empty</p>
                  <p className="text-white/20 text-sm mt-1">Deleted audit log entries will appear here for 24 hours</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
