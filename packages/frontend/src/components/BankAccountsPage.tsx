import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Wallet, CreditCard, TrendingUp, Building2 } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ElementType> = { Savings: Wallet, Current: Building2, Credit: CreditCard, investment: TrendingUp };
const TYPE_GRADIENTS: Record<string, string> = {
  Savings: 'from-blue-500 to-cyan-500', Current: 'from-amber-500 to-orange-500',
  Credit: 'from-rose-500 to-pink-500', investment: 'from-emerald-500 to-teal-500',
};

export function BankAccountsPage() {
  const { bankAccounts, getTotalBalance } = useFinance();
  const totalBalance = getTotalBalance();
  const totalDebt = bankAccounts.filter(a => a.type === 'Credit').reduce((s, a) => s + Math.abs(a.balance), 0);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Bank Accounts</h1>
        <p className="text-slate-400 font-medium">All your accounts in one place</p>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Balance', value: formatCurrency(totalBalance), gradient: 'from-emerald-500 to-teal-600', icon: Wallet },
          { label: 'Credit Outstanding', value: formatCurrency(totalDebt), gradient: 'from-rose-500 to-pink-600', icon: CreditCard },
          { label: 'Total Accounts', value: bankAccounts.length.toString(), gradient: 'from-violet-500 to-purple-600', icon: Building2 },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-6 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-white/70 font-medium">{s.label}</p><p className="text-3xl font-black mt-1">{s.value}</p></div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20"><s.icon className="h-6 w-6" /></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map((acc, i) => {
          const Icon = TYPE_ICONS[acc.type] || Wallet;
          const gradient = TYPE_GRADIENTS[acc.type] || 'from-slate-500 to-slate-600';
          const isCredit = acc.type === 'Credit';
          return (
            <motion.div key={acc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
              whileHover={{ y: -4 }}
              className="group rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-transparent transition-all duration-300 relative overflow-hidden">
              {/* Gradient top bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
              <div className="flex items-start justify-between mb-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{acc.type}</span>
              </div>
              <p className="font-bold text-slate-800 text-lg">{acc.name}</p>
              <p className="text-sm text-slate-400 mt-0.5">{acc.bank}</p>
              <p className={cn('text-3xl font-black mt-4', isCredit ? 'text-rose-500' : 'text-slate-900')}>
                {isCredit && '-'}{formatCurrency(Math.abs(acc.balance))}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
