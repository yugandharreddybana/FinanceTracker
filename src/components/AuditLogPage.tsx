import React, { useState } from 'react';
import { motion } from 'motion/react';
import { History, Search, Filter, Download, User, Clock, Tag, FileText, ChevronRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const AuditLogPage: React.FC = () => {
  const { auditLogs } = useFinance();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  const filteredLogs = auditLogs.filter(log => {
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
      <div className="flex items-center justify-between mb-12">
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
              transition={{ delay: index * 0.05 }}
              className="glass-card p-6 group hover:border-white/20 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest mt-1",
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

                <div className="flex items-center gap-6 text-right">
                  <div className="hidden md:block">
                    <div className="flex items-center gap-1.5 text-white/60 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                    </div>
                    <div className="text-[10px] text-white/20 uppercase font-bold tracking-tighter mt-0.5">
                      {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                    </div>
                  </div>
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
    </div>
  );
};
