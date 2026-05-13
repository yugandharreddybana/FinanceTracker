import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn, sanitizeFinanceText } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, CreditCard, TrendingUp, Building2, Plus, X, Pencil, Trash2 } from 'lucide-react';
import type { BankAccount } from '../types';
import { EmptyState } from './PageStates';

const TYPE_ICONS: Record<string, React.ElementType> = { Savings: Wallet, Current: Building2, Credit: CreditCard, investment: TrendingUp };
const TYPE_GRADIENTS: Record<string, string> = {
  Savings: 'from-blue-500 to-cyan-500', Current: 'from-amber-500 to-orange-500',
  Credit: 'from-rose-500 to-pink-500', investment: 'from-emerald-500 to-teal-500',
};

export function BankAccountsPage() {
  const { bankAccounts, netWorthByCurrency, addAccount, updateAccount, deleteAccount } = useFinance();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);

  const currencies = Object.keys(netWorthByCurrency || {});
  const displayCurrencies = currencies.filter(c =>
    netWorthByCurrency[c].assets > 0 || netWorthByCurrency[c].liabilities > 0
  );
  const finalCurrencies = displayCurrencies.length > 0 ? displayCurrencies : ['INR'];

  const stats = [
    {
      label: 'Total Balance',
      values: finalCurrencies.map(c => formatCurrency(netWorthByCurrency[c]?.assets || 0, c)),
      gradient: 'from-emerald-500 to-teal-600',
      icon: Wallet
    },
    {
      label: 'Credit Outstanding',
      values: finalCurrencies.some(c => (netWorthByCurrency[c]?.liabilities || 0) > 0)
        ? finalCurrencies.map(c => (netWorthByCurrency[c]?.liabilities || 0) > 0 ? formatCurrency(netWorthByCurrency[c].liabilities, c) : null).filter(Boolean) as string[]
        : [formatCurrency(0, 'INR')],
      gradient: 'from-rose-500 to-pink-600',
      icon: CreditCard
    },
    {
      label: 'Total Accounts',
      values: [bankAccounts.length.toString()],
      gradient: 'from-violet-500 to-purple-600',
      icon: Building2
    },
  ];

  const modalOpen = isAddOpen || editing !== null;
  const closeModal = () => { setIsAddOpen(false); setEditing(null); };

  const submitAccount = (formData: FormData) => {
    const name = sanitizeFinanceText(formData.get('name'));
    const bank = sanitizeFinanceText(formData.get('bank')) || 'Other Bank';
    const type = String(formData.get('type') || 'Savings') as BankAccount['type'];
    const balance = Number(formData.get('balance')) || 0;
    const currency = sanitizeFinanceText(formData.get('currency')) || 'INR';

    if (editing) {
      updateAccount(editing.id, {
        name,
        bank,
        type,
        balance,
        currency,
        lastSynced: new Date().toISOString(),
      });
    } else {
      addAccount({
        id: crypto.randomUUID(),
        name,
        bank,
        type,
        balance,
        currency,
        color: '#10b981',
        lastSynced: new Date().toISOString(),
        isPrimary: false,
      });
    }
    closeModal();
  };

  const confirmDelete = (acc: BankAccount) => {
    if (!window.confirm(`Delete account "${acc.name}"? This cannot be undone.`)) return;
    deleteAccount(acc.id);
  };

  return (
    <div data-testid="page-accounts" className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Bank Accounts</h1>
          <p className="text-slate-400 font-medium">All your accounts in one place</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-colors flex items-center gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Add Account
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-6 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="flex items-center justify-between h-full min-h-[64px]">
              <div>
                <p className="text-sm text-white/70 font-medium mb-1">{s.label}</p>
                <div className="flex flex-col gap-1">
                  {s.values.map((val, vIndex) => (
                    <p key={vIndex} className={cn(
                      'font-black leading-none tracking-tight',
                      s.values.length > 1 ? 'text-xl' : 'text-3xl'
                    )}>
                      {val}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <s.icon className="h-6 w-6" aria-hidden />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {bankAccounts.length === 0 ? (
        <EmptyState
          testId="empty-accounts"
          title="No bank accounts yet"
          description="Add your checking, savings, or credit accounts so balances and transfers stay accurate everywhere."
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map((acc, i) => {
          const Icon = TYPE_ICONS[acc.type] || Wallet;
          const gradient = TYPE_GRADIENTS[acc.type] || 'from-slate-500 to-slate-600';
          const isCredit = acc.type === 'Credit';
          return (
            <motion.div key={acc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-transparent transition-all duration-300 relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shrink-0`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={`Edit ${acc.name}`}
                    onClick={() => setEditing(acc)}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${acc.name}`}
                    onClick={() => confirmDelete(acc)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{acc.type}</span>
              <p className="font-bold text-slate-800 text-lg">{acc.name}</p>
              <p className="text-sm text-slate-400 mt-0.5">{acc.bank}</p>
              <p className={cn('text-3xl font-black mt-4', isCredit ? 'text-rose-500' : 'text-slate-900')}>
                {isCredit && '-'}{formatCurrency(Math.abs(acc.balance), acc.currency)}
              </p>
            </motion.div>
          );
        })}
      </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <div role="dialog" aria-modal="true" aria-labelledby="account-modal-title" className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    {editing ? <Pencil className="h-5 w-5" aria-hidden /> : <Plus className="h-5 w-5" aria-hidden />}
                  </div>
                  <h2 id="account-modal-title" className="text-xl font-black text-slate-900">{editing ? 'Edit Account' : 'New Account'}</h2>
                </div>
                <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); submitAccount(new FormData(e.currentTarget)); }} className="space-y-4" key={editing?.id ?? 'new'}>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Account Name</label>
                  <input type="text" name="name" required defaultValue={editing?.name} placeholder="e.g., HDFC Savings" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Bank Name</label>
                  <input type="text" name="bank" defaultValue={editing?.bank} placeholder="e.g., HDFC" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Type</label>
                    <select name="type" defaultValue={editing?.type || 'Savings'} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all">
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Currency</label>
                    <select name="currency" defaultValue={editing?.currency || 'INR'} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all">
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Balance</label>
                  <input type="number" name="balance" required defaultValue={editing?.balance ?? 0} placeholder="0" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 rounded-2xl border-2 border-slate-100 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all">{editing ? 'Save' : 'Create'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
