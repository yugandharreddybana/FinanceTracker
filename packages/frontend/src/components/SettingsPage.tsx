import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useSubscription } from '../context/SubscriptionContext';
import { openBillingPortal, startCheckout, type BillingCurrency } from '../services/billingService';
import { cn, safeStorage } from '../lib/utils';
import { getAIConfig, saveAIConfig, type AIConfig } from '../lib/aiService';
import { motion } from 'motion/react';
import { User, Bell, Shield, Palette, Globe, Download, Trash2, Save, Moon, Sun, Check, Sparkles, Eye, EyeOff, Printer, CreditCard } from 'lucide-react';
import { useToast } from './Toast';
import { downloadTransactionsCsv, printTransactionsStatement } from '../lib/exportCsv';
import { isSeedAdminEmail } from '../lib/demoAccounts';

export function SettingsPage() {
  const { userProfile, updateUserProfile, transactions } = useFinance();
  const isAdminSeed = isSeedAdminEmail(userProfile.email);
  const { tier, subscription, refreshSubscription, openUpgrade } = useSubscription();
  const [billingCurrency, setBillingCurrency] = useState<BillingCurrency>(
    (subscription?.billingCurrency as BillingCurrency) || 'EUR'
  );
  const [billingLoading, setBillingLoading] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [currency, setCurrency] = useState(userProfile.preferences?.currency || 'INR');
  const [darkMode, setDarkMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const [notifs, setNotifs] = useState({ budgetAlerts: true, weeklyReports: true, goalReminders: true, billReminders: true });
  const [saved, setSaved] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(getAIConfig());
  const [showKey, setShowKey] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  const { toast } = useToast();
  const handleSave = () => {
    updateUserProfile({
      name,
      email,
      preferences: {
        ...userProfile.preferences,
        currency,
        theme: darkMode ? 'dark' : 'light',
      }
    });
    setSaved(true);
    toast('success', 'Profile saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onToggle} className={cn('relative h-7 w-12 rounded-full transition-colors shrink-0', on ? 'bg-emerald-500' : 'bg-slate-200')}>
      <motion.span layout className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );

  return (
    <div data-testid="page-settings" className="p-4 md:p-8 max-w-[800px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Settings</h1>
        <p className="text-slate-400 font-medium">Manage your account</p>
      </motion.div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100"><User className="h-5 w-5 text-blue-600" /></div>
          <div><h3 className="font-bold text-slate-900">Profile</h3><p className="text-sm text-slate-400">Your personal info</p></div></div>
        <div className="flex items-center gap-6 mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl animated-gradient text-2xl font-black text-white shadow-lg">{name.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
          <button className="rounded-2xl border-2 border-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Change Avatar</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" /></div>
          <div><label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" /></div>
        </div>
      </motion.div>

      {/* Billing */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100" data-testid="billing-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Billing & Plan</h3>
            <p className="text-sm text-slate-400">Current plan: <span className="font-semibold text-emerald-600">{tier}</span></p>
          </div>
        </div>
        <div className="mb-4 flex gap-2">
          {(['EUR', 'INR'] as BillingCurrency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setBillingCurrency(c)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-bold border transition-all',
                billingCurrency === c ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-500'
              )}
            >
              {c}
            </button>
          ))}
        </div>
        {subscription && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Accounts', key: 'bank_account' },
              { label: 'Budgets', key: 'budget' },
              { label: 'Goals', key: 'savings_goal' },
              { label: 'AI helps', key: '_ai', used: subscription.ai?.used, limit: subscription.ai?.limit },
            ].map((item) => {
              const used = item.key === '_ai' ? (item.used ?? 0) : (subscription.usage?.[item.key] ?? 0);
              const limit = item.key === '_ai' ? item.limit : subscription.limits?.[item.key];
              const label = limit === null ? `${used} / ∞` : `${used} / ${limit ?? '—'}`;
              return (
                <div key={item.label} className="rounded-2xl bg-slate-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">{item.label}</p>
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                </div>
              );
            })}
          </div>
        )}
        {isAdminSeed ? (
          <p className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" data-testid="admin-billing-notice">
            Admin account — billing not required. Your plan tier is managed automatically.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {!isAdminSeed && tier !== 'ENTERPRISE' && (
            <button
              type="button"
              disabled={billingLoading}
              onClick={async () => {
                setBillingLoading(true);
                try {
                  const target = tier === 'FREE' ? 'PRO' : 'ENTERPRISE';
                  const url = await startCheckout(target, billingCurrency);
                  window.location.href = url;
                } catch (e) {
                  toast('error', e instanceof Error ? e.message : 'Checkout failed');
                  setBillingLoading(false);
                }
              }}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Upgrade to {tier === 'FREE' ? 'Pro' : 'Enterprise'}
            </button>
          )}
          {!isAdminSeed && subscription?.stripeCustomerId && (
            <button
              type="button"
              disabled={billingLoading}
              onClick={async () => {
                setBillingLoading(true);
                try {
                  const url = await openBillingPortal();
                  window.location.href = url;
                } catch (e) {
                  toast('error', e instanceof Error ? e.message : 'Portal failed');
                } finally {
                  setBillingLoading(false);
                }
              }}
              className="rounded-2xl border-2 border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Manage subscription
            </button>
          )}
          {!isAdminSeed && (
            <button type="button" onClick={() => openUpgrade()} className="rounded-2xl border-2 border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Compare plans
            </button>
          )}
          <button type="button" onClick={() => refreshSubscription()} className="rounded-2xl border-2 border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100"><Palette className="h-5 w-5 text-violet-600" /></div>
          <div><h3 className="font-bold text-slate-900">Preferences</h3><p className="text-sm text-slate-400">Customize experience</p></div></div>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">{darkMode ? <Moon className="h-5 w-5 text-slate-500" /> : <Sun className="h-5 w-5 text-amber-500" />}<div><p className="font-semibold text-slate-800">Dark Mode</p><p className="text-sm text-slate-400">Toggle dark theme</p></div></div>
            <Toggle
              label="Dark mode"
              on={darkMode}
              onToggle={() => {
                setDarkMode((d) => {
                  const next = !d;
                  document.documentElement.classList.toggle('dark', next);
                  safeStorage.setItem('ft_dark', next ? '1' : '0');
                  return next;
                });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><Globe className="h-5 w-5 text-blue-500" /><div><p className="font-semibold text-slate-800">Currency</p><p className="text-sm text-slate-400">Default currency</p></div></div>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="rounded-xl border-2 border-slate-100 px-3 py-2 text-sm font-medium focus:border-emerald-400 focus:outline-none">
              <option value="INR">₹ INR</option><option value="EUR">€ EUR</option></select>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100"><Bell className="h-5 w-5 text-amber-600" /></div>
          <div><h3 className="font-bold text-slate-900">Notifications</h3><p className="text-sm text-slate-400">Stay informed</p></div></div>
        <div className="space-y-5">
          {[
            { key: 'budgetAlerts', label: 'Budget Alerts', desc: 'Near budget limits' },
            { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Weekly summaries' },
            { key: 'goalReminders', label: 'Goal Reminders', desc: 'Savings goals progress' },
            { key: 'billReminders', label: 'Bill Reminders', desc: 'Upcoming payments' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div><p className="font-semibold text-slate-800">{item.label}</p><p className="text-sm text-slate-400">{item.desc}</p></div>
              <Toggle on={notifs[item.key as keyof typeof notifs]} onToggle={() => setNotifs(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} label={item.label} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI Configuration */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl animated-gradient"><Sparkles className="h-5 w-5 text-white" /></div>
          <div><h3 className="font-bold text-slate-900">AI Configuration</h3><p className="text-sm text-slate-400">Server-side insights use Google Gemini 2.0 Flash. Keys below configure optional client-side Smart Add routing.</p></div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">AI Provider</label>
            <select value={aiConfig.provider} onChange={e => setAiConfig(p => ({...p, provider: e.target.value as 'nvidia'|'openai'}))}
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all">
              <option value="nvidia">NVIDIA NIM (Llama 3.3 70B) — Free tier</option>
              <option value="openai">OpenAI (GPT-4o-mini)</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">API Key</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={aiConfig.apiKey}
                onChange={e => setAiConfig(p => ({...p, apiKey: e.target.value}))}
                placeholder={aiConfig.provider === 'nvidia' ? 'nvapi-xxxx...' : 'sk-xxxx...'}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 pr-12 text-sm font-medium focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all font-mono" />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {aiConfig.provider === 'nvidia'
                ? <>Get free at <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" className="text-violet-500 font-semibold hover:underline">build.nvidia.com</a> → API Key</>
                : <>Get at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-violet-500 font-semibold hover:underline">platform.openai.com</a></>}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <div><p className="text-sm font-bold text-violet-800">Enable AI</p><p className="text-xs text-violet-500">Smart Add will use real AI for understanding</p></div>
            </div>
            <button onClick={() => setAiConfig(p => ({...p, enabled: !p.enabled}))}
              className={cn('relative h-7 w-12 rounded-full transition-colors', aiConfig.enabled ? 'bg-violet-500' : 'bg-slate-200')}>
              <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', aiConfig.enabled ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { saveAIConfig(aiConfig); setAiSaved(true); toast(aiConfig.enabled ? 'ai' : 'success', aiConfig.enabled ? 'AI Enabled!' : 'AI Settings Saved', aiConfig.enabled ? `Using ${aiConfig.provider === 'nvidia' ? 'NVIDIA NIM' : 'OpenAI'}` : ''); setTimeout(() => setAiSaved(false), 2000); }}
            className={cn('w-full rounded-2xl py-3 text-sm font-bold text-white transition-all',
              aiSaved ? 'bg-emerald-500' : 'bg-violet-600 hover:bg-violet-700')}>
            {aiSaved ? '✓ AI Settings Saved!' : 'Save AI Settings'}
          </motion.button>
        </div>
      </motion.div>

      {/* Security & Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100"><Shield className="h-5 w-5 text-emerald-600" /></div><h3 className="font-bold text-slate-900">Security</h3></div>
          <div className="space-y-2">
            <button type="button" onClick={() => { toast('info', 'Password change', 'Use logout and forgot-password if you need to reset access.'); }} className="w-full rounded-2xl border-2 border-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 text-left">Change Password</button>
            <button type="button" onClick={() => { toast('info', 'Two-factor authentication', 'Not enabled for this deployment yet.'); }} className="w-full rounded-2xl border-2 border-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 text-left">Enable 2FA</button>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100"><Download className="h-5 w-5 text-cyan-600" /></div><h3 className="font-bold text-slate-900">Data</h3></div>
          <div className="space-y-2">
            <button type="button" onClick={() => downloadTransactionsCsv(transactions)} className="w-full rounded-2xl border-2 border-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 text-left flex items-center gap-2"><Download className="h-4 w-4" aria-hidden />Export CSV (all transactions)</button>
            <button type="button" onClick={() => printTransactionsStatement(transactions, 'Full statement')} className="w-full rounded-2xl border-2 border-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 text-left flex items-center gap-2"><Printer className="h-4 w-4" aria-hidden />Print / Save PDF</button>
            <button type="button" onClick={() => { toast('info', 'Delete all data', 'Clear transactions from the Transactions page or contact support for account deletion.'); }} className="w-full rounded-2xl border-2 border-rose-100 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 text-left flex items-center gap-2"><Trash2 className="h-4 w-4" aria-hidden />Delete All Data</button>
          </div>
        </motion.div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave}
          className={cn('inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all',
            saved ? 'bg-emerald-500 shadow-emerald-200' : 'animated-gradient shadow-emerald-200/50')}>
          {saved ? <><Check className="h-4 w-4" />Saved!</> : <><Save className="h-4 w-4" />Save Changes</>}
        </motion.button>
      </div>
    </div>
  );
}
