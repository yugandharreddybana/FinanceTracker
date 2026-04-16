import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Plus, Shield, Settings, 
  Mail, UserPlus, Trash2, CheckCircle2,
  Lock, Globe, Layout, Wallet,
  ArrowRight, Sparkles, Heart
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../lib/utils';

export const FamilyPage: React.FC = () => {
  const { familyAccount, createFamily, joinFamily, userProfile, accounts, budgets } = useFinance();
  const [familyName, setFamilyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!familyAccount) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full text-center space-y-10"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-[40px] bg-accent/20 flex items-center justify-center text-accent mx-auto violet-glow">
              <Users className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-bold tracking-tighter font-display">Family & Joint Accounts</h1>
            <p className="text-white/40 font-medium text-lg max-w-md mx-auto">
              Collaborative budgeting and shared wealth management for your household.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => setIsCreating(true)}
              className="glass-card p-10 hover:border-accent/50 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Create Family</h3>
              <p className="text-xs text-white/40 leading-relaxed">Start a new shared workspace and invite your family members.</p>
            </button>

            <button className="glass-card p-10 hover:border-positive/50 transition-all group text-left">
              <div className="w-12 h-12 rounded-2xl bg-positive/10 flex items-center justify-center text-positive mb-6 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Join Family</h3>
              <p className="text-xs text-white/40 leading-relaxed">Enter an invitation code to join an existing family workspace.</p>
            </button>
          </div>

          <AnimatePresence>
            {isCreating && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-8 border-accent/30 bg-accent/[0.02]"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="text"
                    placeholder="Enter Family Name (e.g. The Smiths)"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-accent/50 transition-all font-bold"
                  />
                  <button 
                    onClick={() => createFamily(familyName)}
                    disabled={!familyName}
                    className="px-8 py-4 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow disabled:opacity-50"
                  >
                    Create Now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter font-display">{familyAccount.name} Workspace</h1>
          </div>
          <p className="text-white/40 font-medium">Collaborative financial management for your household.</p>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
          <button className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
            <Settings className="w-5 h-5 text-white/40" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members List */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold">Family Members</h3>
          <div className="glass-card p-6 space-y-4">
            {familyAccount.members.map((member, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-positive p-[1px]">
                    <div className="w-full h-full rounded-[11px] bg-background flex items-center justify-center text-xs font-bold">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{member.name}</p>
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{member.role}</p>
                  </div>
                </div>
                {member.role !== 'Admin' && (
                  <button className="p-2 text-white/20 hover:text-negative transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="glass-card p-8 bg-positive/[0.02] border-positive/20">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-5 h-5 text-positive" />
              <h3 className="font-bold">Shared Goals</h3>
            </div>
            <p className="text-xs text-white/40 leading-relaxed mb-6">
              You are currently saving for "Summer Vacation" together. You've reached 45% of your goal!
            </p>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-positive w-[45%]" />
            </div>
          </div>
        </div>

        {/* Shared Resources */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Shared Resources</h3>
            <button className="text-xs font-bold text-accent uppercase tracking-widest hover:underline">Manage Sharing</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold">Shared Accounts</h4>
                  <p className="text-xs text-white/40">Joint bank accounts & cards</p>
                </div>
              </div>
              <div className="space-y-4">
                {accounts.slice(0, 2).map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs font-bold">{acc.name}</span>
                    <span className="text-xs font-mono font-bold text-accent">${acc.balance.toLocaleString()}</span>
                  </div>
                ))}
                <button className="w-full py-3 rounded-xl border border-dashed border-white/10 text-[10px] font-bold text-white/20 uppercase tracking-widest hover:border-accent/30 hover:text-white/40 transition-all">
                  + Add Shared Account
                </button>
              </div>
            </div>

            <div className="glass-card p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-positive/10 flex items-center justify-center text-positive">
                  <Layout className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold">Shared Budgets</h4>
                  <p className="text-xs text-white/40">Collaborative spending limits</p>
                </div>
              </div>
              <div className="space-y-4">
                {budgets.slice(0, 2).map((b) => (
                  <div key={b.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{b.category}</span>
                      <span className="text-white/40">${b.spent} / ${b.limit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-positive" style={{ width: `${(b.spent/b.limit)*100}%` }} />
                    </div>
                  </div>
                ))}
                <button className="w-full py-3 rounded-xl border border-dashed border-white/10 text-[10px] font-bold text-white/20 uppercase tracking-widest hover:border-accent/30 hover:text-white/40 transition-all">
                  + Add Shared Budget
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-10 bg-white/[0.02] border-white/5">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Privacy & Permissions</h3>
                <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Control what members can see</p>
              </div>
            </div>
            <div className="space-y-6">
              {[
                { label: 'Allow members to see private accounts', enabled: false },
                { label: 'Allow members to edit shared budgets', enabled: true },
                { label: 'Require admin approval for large transactions', enabled: true }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/60">{item.label}</span>
                  <div className={cn(
                    "w-10 h-5 rounded-full relative transition-colors",
                    item.enabled ? "bg-accent" : "bg-white/10"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                      item.enabled ? "right-1" : "left-1"
                    )} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
