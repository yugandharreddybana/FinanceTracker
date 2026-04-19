import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Bell, Shield, Globe, Palette, Database, CreditCard,
  ChevronRight, Save, LogOut, Trash2, Lock, Mail, UserCircle,
  Moon, Sun, Languages, DollarSign, Eye, EyeOff, Download, Upload,
  Camera, CheckCircle2, AlertCircle, SmartphoneNfc, Hash, Fingerprint,
  History, Sparkles, FileText, BarChart3, KeyRound, XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import DeleteModal from './DeleteModal';

type SectionId = 'profile' | 'preferences' | 'notifications' | 'security' | 'billing' | 'data';

interface NotificationPrefs {
  global: boolean;
  anomalies: boolean;
  budgets: boolean;
  recurring: boolean;
}

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

interface SectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
  sectionRef: React.RefObject<HTMLElement | null>;
}

const Section: React.FC<SectionProps> = ({ title, description, icon: Icon, children, sectionRef }) => (
  <section ref={sectionRef} className="glass-card overflow-hidden border-white/5 mb-8 scroll-mt-24">
    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-accent" />
      </div>
      <div>
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        <p className="text-sm text-white/40 font-medium">{description}</p>
      </div>
    </div>
    <div className="p-8">{children}</div>
  </section>
);

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, ariaLabel }) => (
  <button
    aria-label={ariaLabel}
    title={ariaLabel}
    onClick={onChange}
    className={cn(
      'relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0',
      checked ? 'bg-accent' : 'bg-white/10'
    )}
  >
    <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300', checked ? 'left-7' : 'left-1')} />
  </button>
);

export const SettingsPage: React.FC = () => {
  const {
    userProfile, updateUserProfile,
    transactions, accounts, budgets, investments,
    savingsGoals, recurringPayments, loans, incomeSources,
    clearDataForNewUser
  } = useFinance();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: (val?: string) => void;
    requireConfirmText?: string;
    isDestructive?: boolean;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));
  const openActionModal = (args: Omit<typeof modalState, 'isOpen'>) => setModalState({ ...args, isOpen: true });

  const profileRef       = useRef<HTMLElement>(null);
  const preferencesRef   = useRef<HTMLElement>(null);
  const notificationsRef = useRef<HTMLElement>(null);
  const securityRef      = useRef<HTMLElement>(null);
  const billingRef       = useRef<HTMLElement>(null);
  const dataRef          = useRef<HTMLElement>(null);

  const sectionRefs: Record<SectionId, React.RefObject<HTMLElement | null>> = {
    profile:       profileRef,
    preferences:   preferencesRef,
    notifications: notificationsRef,
    security:      securityRef,
    billing:       billingRef,
    data:          dataRef,
  };

  const [activeTab, setActiveTab] = useState<SectionId>('profile');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (Object.keys(sectionRefs) as SectionId[]).forEach((id) => {
      const el = sectionRefs[id].current;
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveTab(id); },
        { root: null, rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = (id: SectionId) => {
    setActiveTab(id);
    sectionRefs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [profileForm, setProfileForm] = useState({ name: userProfile.name, email: userProfile.email });
  
  // Sync profile form when userProfile changes (e.g. after login)
  useEffect(() => {
    setProfileForm({ name: userProfile.name, email: userProfile.email });
  }, [userProfile.name, userProfile.email]);

  const [theme,    setTheme]    = useState(userProfile.preferences.theme    || 'dark');
  const [currency, setCurrency] = useState(userProfile.preferences.currency || 'INR');
  const [language, setLanguage] = useState(userProfile.preferences.language || 'English (US)');

  const [notifications, setNotifications] = useState<NotificationPrefs>({
    global:    userProfile.preferences.notifications ?? true,
    anomalies: true,
    budgets:   true,
    recurring: true,
  });
  const toggleNotif = (key: keyof NotificationPrefs) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  const [passwordForm,   setPasswordForm]   = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [showPasswords,  setShowPasswords]  = useState({ current: false, next: false, confirm: false });
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error' | 'mismatch'>('idle');
  const [twoFactorEnabled,  setTwoFactorEnabled]  = useState(false);
  const [biometricEnabled,  setBiometricEnabled]  = useState(true);

  const handleToggleBiometric = async () => {
    if (!biometricEnabled) {
      // Logic to Disable (UI Only for now)
      setBiometricEnabled(false);
      return;
    }

    // Logic to Enable (Register)
    try {
      // 1. Get options
      const optionsRes = await fetch(`${(import.meta as any).env?.VITE_API_URL ?? ''}/api/auth/webauthn/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userProfile.email, name: userProfile.name })
      });
      const options = await optionsRes.json();

      // 2. Browser prompt
      const { startRegistration } = await import('@simplewebauthn/browser');
      const regResponse = await startRegistration(options);

      // 3. Verify
      const verifyRes = await fetch(`${(import.meta as any).env?.VITE_API_URL ?? ''}/api/auth/webauthn/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regResponse)
      });

      if (verifyRes.ok) {
        setBiometricEnabled(true);
      }
    } catch (err) {
      console.error('Biometric registration failed:', err);
      // Revert toggle
    }
  };
  const [privacyMode,       setPrivacyMode]       = useState(false);

  const handlePasswordChange = async () => {
    if (!passwordForm.current)                            { setPasswordStatus('error');    return; }
    if (passwordForm.next !== passwordForm.confirm)       { setPasswordStatus('mismatch');  return; }
    if (passwordForm.next.length < 8)                     { setPasswordStatus('error');    return; }
    await new Promise((r) => setTimeout(r, 800));
    setPasswordStatus('success');
    setPasswordForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setPasswordStatus('idle'), 3500);
  };

  const [isSaving,    setIsSaving]    = useState(false);
  const [saveStatus,  setSaveStatus]  = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRef    = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true); setSaveStatus('idle');
    try {
      await new Promise((r) => setTimeout(r, 900));
      updateUserProfile({
        ...userProfile,
        name: profileForm.name, email: profileForm.email,
        preferences: { theme: theme as any, currency, language, notifications: notifications.global },
      });
      setSaveStatus('success');
    } catch { setSaveStatus('error'); }
    finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const exportData = useCallback(() => {
    const payload = {
      userProfile, transactions, accounts, budgets, investments,
      savingsGoals, recurringPayments, loans, incomeSources,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `yugi_backup_${new Date().toISOString().split('T')[0]}.json` });
    a.click(); URL.revokeObjectURL(url);
  }, [userProfile, transactions, accounts, budgets, investments, savingsGoals, recurringPayments, loans, incomeSources]);

  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.userProfile) updateUserProfile(parsed.userProfile);
        setImportStatus('success');
      } catch { setImportStatus('error'); }
      finally { setTimeout(() => setImportStatus('idle'), 3500); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleDeleteAccount = () => {
    openActionModal({
      title: 'Delete Entire Account?',
      description: 'This will permanently erase all your transactions, bank accounts, and profile data. This action is irreversible!',
      confirmLabel: 'Delete Everything',
      requireConfirmText: 'DELETE',
      isDestructive: true,
      onConfirm: async () => {
        try {
          // 1. Delete from Backend (Cascading)
          await fetch(`${(import.meta as any).env?.VITE_API_URL ?? ''}/api/finance/user-profiles/${userProfile.email}`, {
            method: 'DELETE'
          });

          // 2. Clear local data
          clearDataForNewUser();
          localStorage.removeItem('yugi_finance_data');
          window.location.href = '/';
        } catch (err) {
          console.error('Failed to delete account on server:', err);
          // Still clear local for security if requested? 
          // Usually we want to at least notify if server failed.
        }
      }
    });
  };

  const navItems: { id: SectionId; label: string; icon: React.ElementType }[] = [
    { id: 'profile',       label: 'Profile',       icon: User },
    { id: 'preferences',   label: 'Preferences',   icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security',      label: 'Security',      icon: Shield },
    { id: 'billing',       label: 'Subscription',  icon: CreditCard },
    { id: 'data',          label: 'Data',          icon: Database },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-6xl mx-auto pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-3 font-display">Settings</h1>
          <p className="text-white/40 font-medium">Account, preferences, security, and data</p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {saveStatus === 'success' && (
              <motion.div key="ok" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-positive/10 border border-positive/20 text-positive text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </motion.div>
            )}
            {saveStatus === 'error' && (
              <motion.div key="err" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-negative/10 border border-negative/20 text-negative text-sm font-bold">
                <AlertCircle className="w-4 h-4" /> Error
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={handleSave} disabled={isSaving} title="Save all changes"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px] justify-center">
            {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <nav className="lg:col-span-1 space-y-1 sticky top-24">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => scrollTo(id)} title={`Go to ${label}`}
              className={cn('w-full flex items-center justify-between p-4 rounded-2xl transition-all group border',
                activeTab === id ? 'bg-accent/10 text-accent border-accent/20' : 'hover:bg-white/5 text-white/40 hover:text-white border-transparent')}>
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm tracking-tight">{label}</span>
              </div>
              <ChevronRight className={cn('w-4 h-4 transition-transform', activeTab === id ? 'text-accent' : 'group-hover:translate-x-1')} />
            </button>
          ))}
          <div className="pt-5 border-t border-white/5 mt-2 space-y-1">
            <button onClick={handleDeleteAccount} title="Permanently delete your account"
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-negative/30 hover:text-negative hover:bg-negative/5 transition-all font-bold text-sm">
              <Trash2 className="w-5 h-5 shrink-0" /> <span>Delete Account</span>
            </button>
          </div>
        </nav>

        <div className="lg:col-span-3">

          {/* PROFILE */}
          <Section sectionRef={profileRef} title="Profile Information" description="Your personal details and account identity" icon={UserCircle}>
            <div className="flex flex-col sm:flex-row items-center gap-8 mb-10 pb-10 border-b border-white/5">
              <div className="relative group shrink-0">
                <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-accent via-accent/50 to-positive p-[2px] shadow-2xl group-hover:rotate-0 rotate-2 transition-transform duration-500">
                  <div className="w-full h-full rounded-[1.9rem] bg-[#0F0F19] flex items-center justify-center text-3xl font-bold font-display select-none">
                    {profileForm.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                </div>
                <button onClick={() => fileInputRef.current?.click()} title="Upload new avatar"
                  className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl bg-accent text-white flex items-center justify-center shadow-xl border-4 border-[#0F0F19] hover:scale-110 active:scale-95 transition-all">
                  <Camera className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  title="Upload profile picture" aria-label="Upload profile picture" onChange={() => {}} />
              </div>
              <div className="text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-1">
                  <span className="text-2xl font-bold tracking-tight">{profileForm.name}</span>
                  <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest">{userProfile.role}</span>
                </div>
                <p className="text-sm text-white/40 mb-4">{profileForm.email}</p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 uppercase tracking-widest">
                    <Hash className="w-3 h-3" /> UID: {userProfile.email.split('@')[0]}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 uppercase tracking-widest">
                    <History className="w-3 h-3" /> Member since Apr 2024
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="settings-name" className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors pointer-events-none" />
                  <input id="settings-name" type="text" title="Full name" placeholder="Your full name"
                    value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-accent focus:bg-accent/5 transition-all font-medium text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="settings-email" className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors pointer-events-none" />
                  <input id="settings-email" type="email" title="Email address" placeholder="you@example.com"
                    value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-accent focus:bg-accent/5 transition-all font-medium text-white" />
                </div>
              </div>
            </div>
          </Section>

          {/* PREFERENCES */}
          <Section sectionRef={preferencesRef} title="App Preferences" description="Visual theme, currency, and language" icon={Palette}>
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold mb-1">Visual Theme</h4>
                  <p className="text-xs text-white/40">Persisted on Save</p>
                </div>
                <div className="flex p-1.5 rounded-2xl bg-white/5 border border-white/10 gap-1">
                  {[{ id: 'dark' as const, Icon: Moon, label: 'Dark' }, { id: 'light' as const, Icon: Sun, label: 'Light' }, { id: 'glass' as const, Icon: Globe, label: 'Glass' }].map(({ id, Icon, label }) => (
                    <button key={id} onClick={() => setTheme(id)} title={label}
                      className={cn('px-3 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold',
                        theme === id ? 'bg-accent text-white shadow-xl shadow-accent/20' : 'text-white/30 hover:text-white/70')}>
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold mb-1">Currency</h4>
                  <p className="text-xs text-white/40">Primary currency for reports</p>
                </div>
                <div className="relative">
                  <select id="settings-currency" title="Select currency" value={currency} onChange={(e) => setCurrency(e.target.value)}
                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm font-bold outline-none focus:border-accent hover:bg-white/10 transition-all cursor-pointer min-w-[130px]">
                    <option value="INR" className="bg-[#0F0F19]">INR (₹)</option>
                    <option value="EUR" className="bg-[#0F0F19]">EUR (€)</option>
                  </select>
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold mb-1">Language</h4>
                  <p className="text-xs text-white/40">Display language</p>
                </div>
                <div className="relative">
                  <select id="settings-language" title="Select language" value={language} onChange={(e) => setLanguage(e.target.value)}
                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm font-bold outline-none focus:border-accent hover:bg-white/10 transition-all cursor-pointer min-w-[160px]">
                    <option value="English (US)" className="bg-[#0F0F19]">English (US)</option>
                    <option value="English (UK)" className="bg-[#0F0F19]">English (UK)</option>
                    <option value="Hindi"        className="bg-[#0F0F19]">Hindi (हिन्दी)</option>
                    <option value="German"       className="bg-[#0F0F19]">German</option>
                  </select>
                  <Languages className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                </div>
              </div>
            </div>
          </Section>

          {/* NOTIFICATIONS */}
          <Section sectionRef={notificationsRef} title="Notifications" description="Choose which alerts Yugi sends you" icon={Bell}>
            <div className="space-y-4">
              {([
                { key: 'global'    as const, title: 'All Notifications',  desc: 'Master toggle — disabling mutes everything below',        value: notifications.global },
                { key: 'anomalies' as const, title: 'Spend Anomalies',    desc: 'AI-detected unusual or suspicious transactions',           value: notifications.global && notifications.anomalies },
                { key: 'budgets'   as const, title: 'Budget Thresholds',  desc: 'Alerts at 80 % and 100 % of a budget limit',              value: notifications.global && notifications.budgets },
                { key: 'recurring' as const, title: 'Upcoming Bills',     desc: '3-day reminders before subscriptions and EMIs are due',   value: notifications.global && notifications.recurring },
              ]).map(({ key, title, desc, value }) => (
                <div key={key} className={cn('flex items-center justify-between p-5 rounded-2xl border transition-all',
                  value ? 'bg-accent/[0.04] border-accent/10' : 'bg-white/[0.02] border-white/5 hover:border-white/10')}>
                  <div>
                    <p className="text-sm font-bold mb-0.5">{title}</p>
                    <p className="text-[11px] text-white/35 leading-relaxed">{desc}</p>
                  </div>
                  <Toggle checked={value} onChange={() => toggleNotif(key)} ariaLabel={`Toggle ${title}`} />
                </div>
              ))}
            </div>
          </Section>

          {/* SECURITY */}
          <Section sectionRef={securityRef} title="Security & Privacy" description="Password, 2FA, biometrics, and privacy mode" icon={Shield}>
            <div className="space-y-6">
              <h4 className="font-bold text-sm text-white/50 uppercase tracking-widest">Change Password</h4>
              {(['current', 'next', 'confirm'] as const).map((field) => {
                const labels = { current: 'Current Password', next: 'New Password', confirm: 'Confirm New Password' };
                return (
                  <div key={field} className="space-y-2">
                    <label htmlFor={`pass-${field}`} className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">{labels[field]}</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors pointer-events-none" />
                      <input id={`pass-${field}`} type={showPasswords[field] ? 'text' : 'password'} title={labels[field]} placeholder="••••••••••••"
                        value={passwordForm[field]} onChange={(e) => setPasswordForm((p) => ({ ...p, [field]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-14 py-4 outline-none focus:border-accent focus:bg-accent/5 transition-all font-mono text-white" />
                      <button type="button" title={showPasswords[field] ? 'Hide' : 'Show'} onClick={() => setShowPasswords((p) => ({ ...p, [field]: !p[field] }))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white transition-colors">
                        {showPasswords[field] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
              <AnimatePresence>
                {passwordStatus !== 'idle' && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={cn('flex items-center gap-3 p-4 rounded-2xl text-sm font-bold',
                      passwordStatus === 'success'  && 'bg-positive/10 border border-positive/20 text-positive',
                      passwordStatus === 'mismatch' && 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400',
                      passwordStatus === 'error'    && 'bg-negative/10 border border-negative/20 text-negative')}>
                    {passwordStatus === 'success'  && <><CheckCircle2 className="w-5 h-5" /> Password updated successfully</>}
                    {passwordStatus === 'mismatch' && <><AlertCircle  className="w-5 h-5" /> New passwords do not match</>}
                    {passwordStatus === 'error'    && <><XCircle      className="w-5 h-5" /> Check current password — new must be ≥ 8 characters</>}
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={handlePasswordChange} title="Update password"
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-accent hover:border-accent text-sm font-bold transition-all">
                <KeyRound className="w-4 h-4" /> Update Password
              </button>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <h4 className="font-bold text-sm text-white/50 uppercase tracking-widest">Access Controls</h4>
                {[
                  { checked: twoFactorEnabled,  onChange: () => setTwoFactorEnabled((p)  => !p), Icon: SmartphoneNfc, label: 'Two-Factor Authentication', sub: twoFactorEnabled  ? 'Enabled · Shield Level 2'   : 'Disabled · Recommended',   color: twoFactorEnabled  ? 'text-accent'    : 'text-white/30', bg: twoFactorEnabled  ? 'bg-accent/20'    : 'bg-white/5' },
                  { checked: biometricEnabled,  onChange: handleToggleBiometric, Icon: Fingerprint,   label: 'Biometric Login',           sub: biometricEnabled  ? 'Active · Synced with OS'    : 'Inactive',                  color: biometricEnabled  ? 'text-positive'  : 'text-white/30', bg: biometricEnabled  ? 'bg-positive/15'  : 'bg-white/5' },
                  { checked: privacyMode,       onChange: () => setPrivacyMode((p)       => !p), Icon: Eye,           label: 'Privacy Mode',              sub: privacyMode       ? 'On · Amounts are masked'    : 'Off · Amounts visible',     color: privacyMode       ? 'text-yellow-400': 'text-white/30', bg: privacyMode       ? 'bg-yellow-500/15': 'bg-white/5' },
                ].map(({ checked, onChange, Icon, label, sub, color, bg }) => (
                  <div key={label} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/15 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center transition-colors', bg)}>
                        <Icon className={cn('w-6 h-6 transition-colors', color)} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{label}</p>
                        <p className={cn('text-[10px] font-bold uppercase tracking-widest', color)}>{sub}</p>
                      </div>
                    </div>
                    <Toggle checked={checked} onChange={onChange} ariaLabel={`Toggle ${label}`} />
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* BILLING */}
          <Section sectionRef={billingRef} title="Subscription & Billing" description="Your current plan and payment details" icon={CreditCard}>
            <div className="p-6 rounded-3xl bg-gradient-to-br from-accent/20 to-positive/5 border border-white/10 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-xl shrink-0">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold tracking-tight">Pro Intelligence</p>
                    <p className="text-sm text-white/40">Auto-renews · 16 May 2027</p>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-2xl font-bold font-mono tracking-tighter">₹4,999<span className="text-xs text-white/30 ml-1">/yr</span></p>
                  <button title="Manage subscription" className="text-xs font-bold text-accent uppercase tracking-widest hover:underline mt-1"
                    onClick={() => openActionModal({
                      title: 'Billing Portal',
                      description: 'Directing you to the secure billing portal powered by Stripe and Razorpay. Here you can update your plan, view invoices, and manage payment methods.',
                      onConfirm: () => {}
                    })}>
                    Manage Plan
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <p className="text-sm font-bold">Visa …4242</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Default payment method</p>
                </div>
              </div>
              <button title="Update payment method" className="text-xs font-bold text-white/40 hover:text-accent transition-colors uppercase tracking-widest"
                onClick={() => openActionModal({
                  title: 'Update Payment',
                  description: 'You are now connecting to the secure payment processor to update your credit card or billing address.',
                  onConfirm: () => {}
                })}>
                Update
              </button>
            </div>
          </Section>

          {/* DATA */}
          <Section sectionRef={dataRef} title="Data Management" description="Export, import, and control your financial data" icon={Database}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <button onClick={exportData} title="Download all data as JSON"
                className="flex flex-col items-start p-7 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/30 transition-all group relative overflow-hidden text-left">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Download className="w-6 h-6 text-accent" />
                </div>
                <p className="font-bold text-base mb-1">Export Full History</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">JSON backup · all data</p>
                <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-5 group-hover:opacity-10 transition-opacity">
                  <FileText className="w-24 h-24" />
                </div>
              </button>

              <button onClick={() => importRef.current?.click()} title="Import a JSON backup"
                className="flex flex-col items-start p-7 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-positive/30 transition-all group relative overflow-hidden text-left">
                <div className="w-12 h-12 rounded-2xl bg-positive/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-positive" />
                </div>
                <p className="font-bold text-base mb-1">Import Backup</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Restore from JSON file</p>
                <AnimatePresence>
                  {importStatus !== 'idle' && (
                    <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={cn('mt-3 text-[10px] font-bold uppercase tracking-widest', importStatus === 'success' ? 'text-positive' : 'text-negative')}>
                      {importStatus === 'success' ? '✓ Import successful' : '✗ Invalid file'}
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-5 group-hover:opacity-10 transition-opacity">
                  <BarChart3 className="w-24 h-24" />
                </div>
              </button>
            </div>

            <input ref={importRef} type="file" accept=".json,application/json" className="hidden"
              title="Select JSON backup file" aria-label="Select JSON backup file to import" onChange={handleImport} />

            <div className="p-5 rounded-3xl bg-negative/5 border border-negative/10">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-negative shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-negative mb-1">Data Privacy</p>
                  <p className="text-xs text-white/40 leading-relaxed">All data lives on this device and in your Supabase instance. Yugi Finance Tracker never shares or sells your financial information. You own your data — export and delete at any time.</p>
                </div>
              </div>
            </div>
          </Section>

        </div>
      </div>
      
      <DeleteModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        description={modalState.description}
        requireConfirmText={modalState.requireConfirmText}
        isDestructive={modalState.isDestructive}
        confirmLabel={modalState.confirmLabel}
      />
    </motion.div>
  );
};
