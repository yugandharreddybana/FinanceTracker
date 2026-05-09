import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Plus, Shield, Settings,
  Mail, UserPlus, Trash2, CheckCircle2,
  Lock, Globe, Layout, Wallet,
  ArrowRight, Sparkles, Heart, X, AlertTriangle
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../lib/utils';
import { getCurrencySymbol } from '../constants/currencies';

export const FamilyPage: React.FC = () => {
  const { familyAccount, createFamily, joinFamily, deleteFamily, addFamilyMember, removeFamilyMember, userProfile, accounts, budgets, addAccount, savingsGoals } = useFinance();
  const [familyName, setFamilyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [isAddingJointAccount, setIsAddingJointAccount] = useState(false);
  const [jointAccountForm, setJointAccountForm] = useState({ name: '', bank: '', balance: '', currency: 'INR' });
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [privacySettings, setPrivacySettings] = useState([
    { label: 'Allow members to see private accounts', enabled: false },
    { label: 'Allow members to edit shared budgets', enabled: true },
    { label: 'Require admin approval for large transactions', enabled: true }
  ]);

  const currency = userProfile.preferences?.currency || 'INR';
  const jointAccounts = accounts.filter(a => a.isJoint);
  const sharedGoalProgress = savingsGoals.length > 0 
    ? Math.min(100, Math.round((savingsGoals[0].current / savingsGoals[0].target) * 100)) 
    : 0;

  const handleCreateJointAccount = () => {
    if (!jointAccountForm.name || !jointAccountForm.bank || !jointAccountForm.balance) return;
    addAccount({
      id: `joint-${Date.now()}`,
      name: jointAccountForm.name,
      bank: jointAccountForm.bank,
      balance: Number(jointAccountForm.balance),
      type: 'Current',
      currency: jointAccountForm.currency || 'INR',
      color: '#8B5CF6',
      lastSynced: 'Just now',
      isJoint: true,
    });
    setIsAddingJointAccount(false);
    setJointAccountForm({ name: '', bank: '', balance: '', currency: 'INR' });
  };

  const handleDeleteFamily = () => {
    deleteFamily();
    setShowDeleteConfirm(false);
    setShowSettings(false);
  };

  const [showInviteCode, setShowInviteCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const inviteCode = familyAccount ? `FAM-${familyAccount.id.slice(-6).toUpperCase()}` : '';
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleInviteMember = () => {
    if (!inviteName.trim()) return;
    addFamilyMember(inviteName.trim(), inviteRole);
    setInviteName('');
    setInviteRole('Member');
    setIsInviting(false);
  };

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
              onClick={() => { setIsCreating(true); setIsJoining(false); }}
              className="glass-card p-10 hover:border-accent/50 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Create Family</h3>
              <p className="text-xs text-white/40 leading-relaxed">Start a new shared workspace and invite your family members.</p>
            </button>

            <button 
              onClick={() => { setIsJoining(true); setIsCreating(false); }}
              className="glass-card p-10 hover:border-positive/50 transition-all group text-left"
            >
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
                    onClick={() => { createFamily(familyName); setFamilyName(''); setIsCreating(false); }}
                    disabled={!familyName}
                    className="px-8 py-4 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow disabled:opacity-50"
                  >
                    Create Now
                  </button>
                </div>
              </motion.div>
            )}
            {isJoining && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-8 border-positive/30 bg-positive/[0.02]"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="text"
                    placeholder="Enter invitation code (e.g. FAM-XXXXX)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-positive/50 transition-all font-bold font-mono tracking-wider"
                  />
                  <button 
                    onClick={() => { joinFamily(joinCode); setJoinCode(''); setIsJoining(false); }}
                    disabled={!joinCode}
                    className="px-8 py-4 rounded-2xl bg-positive text-white font-bold hover:bg-positive/80 transition-all shadow-lg disabled:opacity-50"
                  >
                    Join Now
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
          <button
            onClick={() => setShowInviteCode(prev => !prev)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
          >
            <Globe className="w-4 h-4" />
            <span>Share Code</span>
          </button>
          <button
            onClick={() => setIsInviting(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings"
            className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <Settings className="w-5 h-5 text-white/40" />
          </button>
        </div>
      </div>

      {/* Invite Code Panel */}
      <AnimatePresence>
        {showInviteCode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-8 border-accent/30 bg-accent/[0.02] flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Family Invite Code</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-accent">{inviteCode}</p>
                <p className="text-xs text-white/30 mt-2">Share this code with family members so they can join your workspace.</p>
              </div>
              <button
                onClick={copyInviteCode}
                className={cn(
                  "flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all",
                  codeCopied
                    ? "bg-positive/20 border border-positive/40 text-positive"
                    : "bg-accent text-white hover:bg-accent/80 violet-glow"
                )}
              >
                {codeCopied ? <CheckCircle2 className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                <span>{codeCopied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Member Modal */}
      <AnimatePresence>
        {isInviting && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInviting(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md glass-card p-8 border-accent/30">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Invite Family Member</h3>
                <button title="Close" onClick={() => setIsInviting(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Member Name *</label>
                  <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Jane Smith" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Role</label>
                  <select title="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all">
                    <option value="Member" className="bg-[#050508]">Member</option>
                    <option value="Admin" className="bg-[#050508]">Admin</option>
                    <option value="Viewer" className="bg-[#050508]">Viewer</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setIsInviting(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all">Cancel</button>
                  <button onClick={handleInviteMember} disabled={!inviteName.trim()} className="flex-[2] py-3 rounded-xl bg-accent text-white font-bold hover:bg-accent/80 transition-all disabled:opacity-50">Add Member</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-card p-8 border-accent/20 space-y-6">
              <h3 className="text-lg font-bold">Family Settings</h3>
              <div className="flex gap-4">
                <button onClick={() => setShowDeleteConfirm(true)} className="px-6 py-3 rounded-xl bg-negative/10 border border-negative/20 text-negative text-sm font-bold hover:bg-negative/20 transition-all">Delete Family</button>
              </div>
              {showDeleteConfirm && (
                <div className="p-4 rounded-xl bg-negative/10 border border-negative/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-negative mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-negative mb-2">Are you sure? This will delete the family workspace for all members.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-xs font-bold hover:bg-white/10 transition-all">Cancel</button>
                      <button onClick={handleDeleteFamily} className="px-4 py-2 rounded-lg bg-negative text-white text-xs font-bold hover:bg-negative/80 transition-all">Yes, Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Joint Account Modal */}
      <AnimatePresence>
        {isAddingJointAccount && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingJointAccount(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md glass-card p-8 border-accent/30">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Create Joint Account</h3>
                <button title="Close" onClick={() => setIsAddingJointAccount(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Account Name *</label>
                  <input type="text" value={jointAccountForm.name} onChange={(e) => setJointAccountForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Family Savings" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Bank *</label>
                  <input type="text" value={jointAccountForm.bank} onChange={(e) => setJointAccountForm(prev => ({ ...prev, bank: e.target.value }))} placeholder="e.g. SBI" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Opening Balance *</label>
                  <input type="number" value={jointAccountForm.balance} onChange={(e) => setJointAccountForm(prev => ({ ...prev, balance: e.target.value }))} placeholder="e.g. 10000" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Currency</label>
                  <select title="Currency" value={jointAccountForm.currency} onChange={(e) => setJointAccountForm(prev => ({ ...prev, currency: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-accent/50 transition-all">
                    <option value="INR" className="bg-[#050508]">INR (₹)</option>
                    <option value="EUR" className="bg-[#050508]">EUR (€)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setIsAddingJointAccount(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all">Cancel</button>
                  <button onClick={handleCreateJointAccount} disabled={!jointAccountForm.name || !jointAccountForm.bank || !jointAccountForm.balance} className="flex-[2] py-3 rounded-xl bg-accent text-white font-bold hover:bg-accent/80 transition-all disabled:opacity-50">Create Joint Account</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <button 
                    onClick={() => removeFamilyMember(member.uid)}
                    aria-label="Remove member" 
                    className="p-2 text-white/20 hover:text-negative transition-colors"
                  >
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
            {savingsGoals.length > 0 ? (
              <>
                <p className="text-xs text-white/40 leading-relaxed mb-6">
                  You are currently saving for "{savingsGoals[0].name}" together. You've reached {sharedGoalProgress}% of your goal!
                </p>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-positive" style={{ width: `${sharedGoalProgress}%` }} />
                </div>
              </>
            ) : (
              <p className="text-xs text-white/40 leading-relaxed">No shared savings goals yet. Create one from the Savings page.</p>
            )}
          </div>
        </div>

        {/* Shared Resources */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Shared Resources</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold">Joint Accounts</h4>
                  <p className="text-xs text-white/40">Joint bank accounts & cards</p>
                </div>
              </div>
              <div className="space-y-4">
                {jointAccounts.length > 0 ? jointAccounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3 text-accent" />
                      <span className="text-xs font-bold">{acc.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-accent">{acc.balance.toLocaleString(undefined, { style: 'currency', currency: acc.currency || currency })}</span>
                  </div>
                )) : (
                  <p className="text-xs text-white/40 text-center py-4">No joint accounts yet</p>
                )}
                <button 
                  onClick={() => setIsAddingJointAccount(true)}
                  className="w-full py-3 rounded-xl border border-dashed border-white/10 text-[10px] font-bold text-white/20 uppercase tracking-widest hover:border-accent/30 hover:text-white/40 transition-all"
                >
                  + Create Joint Account
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
                {budgets.slice(0, 3).map((b) => (
                  <div key={b.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{b.category}</span>
                      <span className="text-white/40">{b.spent.toLocaleString(undefined, { style: 'currency', currency: b.currency || currency })} / {b.limit.toLocaleString(undefined, { style: 'currency', currency: b.currency || currency })}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true">
                        <rect x="0" y="0" width={(b.spent / b.limit) * 100} height="1" fill="var(--color-positive, #22D3A5)" />
                      </svg>
                    </div>
                  </div>
                ))}
                {budgets.length === 0 && <p className="text-xs text-white/40 text-center py-4">No budgets yet. Create one from the Budgets page.</p>}
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
              {privacySettings.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/60">{item.label}</span>
                  <div 
                    onClick={() => setPrivacySettings(prev => prev.map((p, idx) => idx === i ? { ...p, enabled: !p.enabled } : p))}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                      item.enabled ? "bg-accent" : "bg-white/10"
                    )}
                  >
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
