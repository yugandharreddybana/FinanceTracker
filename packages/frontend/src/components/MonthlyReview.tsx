import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Share2, Download, Sparkles, TrendingUp, Award, Zap, TrendingDown, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const MonthlyReview: React.FC = () => {
  const { transactions, savingsGoals, accounts, loans, userProfile } = useFinance();
  const currency = userProfile.preferences.currency || 'INR';

  const review = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const monthName = now.toLocaleString('default', { month: 'long' });

    const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const thisMonthTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const prevMonthTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const income = thisMonthTxns.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = thisMonthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    const prevIncome = prevMonthTxns.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const prevExpenses = prevMonthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);

    const saved = income - expenses;
    const prevSaved = prevIncome - prevExpenses;
    const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;
    const prevSavingsRate = prevIncome > 0 ? Math.round((prevSaved / prevIncome) * 100) : 0;
    const extraSaved = saved - prevSaved;

    const categorySpending: Record<string, number> = {};
    thisMonthTxns.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'Other';
      categorySpending[cat] = (categorySpending[cat] || 0) + Math.abs(t.amount);
    });

    const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
    const prevCategorySpending: Record<string, number> = {};
    prevMonthTxns.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'Other';
      prevCategorySpending[cat] = (prevCategorySpending[cat] || 0) + Math.abs(t.amount);
    });

    let biggestReduction = { category: '', amount: 0 };
    Object.keys(prevCategorySpending).forEach(cat => {
      const reduction = (prevCategorySpending[cat] || 0) - (categorySpending[cat] || 0);
      if (reduction > biggestReduction.amount) {
        biggestReduction = { category: cat, amount: reduction };
      }
    });

    const activeGoals = savingsGoals.filter(g => g.current < g.target);
    const topGoal = activeGoals.length > 0 
      ? activeGoals.reduce((best, g) => (g.current / g.target > best.current / best.target) ? g : best, activeGoals[0])
      : null;

    const totalBalance = accounts.reduce((s, a) => s + (a.type !== 'Credit' ? a.balance : -a.balance), 0);
    const totalDebt = loans.reduce((s, l) => s + l.remainingAmount, 0);

    let rating = 'Solid';
    if (savingsRate >= 40) rating = 'Legendary';
    else if (savingsRate >= 25) rating = 'Great';
    else if (savingsRate >= 10) rating = 'Solid';
    else if (savingsRate > 0) rating = 'Okay';
    else rating = 'Tough';

    const txnCount = thisMonthTxns.length;

    return {
      monthName, income, expenses, saved, savingsRate, prevSavingsRate, extraSaved,
      topCategory, biggestReduction, topGoal, totalBalance, totalDebt, rating,
      txnCount, activeGoals
    };
  }, [transactions, savingsGoals, accounts, loans]);

  const fmt = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });

  const hasData = review.txnCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto py-16 px-8"
    >
      <div className="flex justify-between items-center mb-20">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-[0.3em] violet-glow"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>Arta Intelligence: {review.monthName} Review</span>
        </motion.div>
        <div className="flex gap-4">
          <button onClick={() => { if (navigator.share) { navigator.share({ title: `${review.monthName} Financial Review`, text: `My ${review.monthName} savings rate: ${review.savingsRate}%` }); } else { navigator.clipboard.writeText(`My ${review.monthName} Financial Review\nSavings Rate: ${review.savingsRate}%\nIncome: ${fmt(review.income)}\nExpenses: ${fmt(review.expenses)}`); alert('Review summary copied to clipboard!'); } }} aria-label="Share" className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
            <Share2 className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
          </button>
          <button onClick={() => { const text = `${review.monthName} Financial Review\n\nRating: ${review.rating}\nIncome: ${fmt(review.income)}\nExpenses: ${fmt(review.expenses)}\nSaved: ${fmt(review.saved)}\nSavings Rate: ${review.savingsRate}%`; const blob = new Blob([text], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${review.monthName}-review.txt`; a.click(); URL.revokeObjectURL(url); }} aria-label="Download" className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
            <Download className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-32">
          <AlertCircle className="w-16 h-16 text-white/20 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">No Transactions Yet</h2>
          <p className="text-white/40 text-lg">Add some transactions to see your {review.monthName} review come to life.</p>
        </div>
      ) : (
        <>
          <header className="mb-32 text-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/5 blur-[120px] rounded-full -z-10" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-8 leading-[0.85] font-display">
                {review.monthName} was <br />
                <span className="text-accent italic relative">
                  {review.rating}.
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute bottom-4 left-0 h-4 bg-accent/20 -z-10" 
                  />
                </span>
              </h1>
              <p className="text-2xl text-white/40 font-medium max-w-2xl mx-auto leading-relaxed">
                {review.extraSaved > 0 ? (
                  <>You saved <span className="text-white font-bold">{fmt(review.extraSaved)}</span> more than last month</>
                ) : review.saved > 0 ? (
                  <>You saved <span className="text-white font-bold">{fmt(review.saved)}</span> this month</>
                ) : (
                  <>Your expenses exceeded income by <span className="text-negative font-bold">{fmt(Math.abs(review.saved))}</span></>
                )}
                {review.topGoal && (
                  <>, putting you at <span className="text-positive font-bold">{Math.round((review.topGoal.current / review.topGoal.target) * 100)}%</span> of your {review.topGoal.name} goal</>
                )}.
              </p>
            </motion.div>
          </header>

          <div className="space-y-48">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
              >
                <div className="w-16 h-16 rounded-3xl bg-positive/10 flex items-center justify-center text-positive mb-8 shadow-[0_0_30px_rgba(34,211,165,0.2)]">
                  {review.savingsRate > review.prevSavingsRate ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                </div>
                <h2 className="text-5xl font-bold mb-8 tracking-tight">
                  {review.savingsRate >= 25 ? 'The Savings Surge' : review.savingsRate > 0 ? 'Savings Snapshot' : 'Time to Rebalance'}
                </h2>
                <p className="text-xl text-white/50 leading-relaxed font-medium">
                  Your savings rate hit <span className="text-white font-bold">{review.savingsRate}%</span> this month
                  {review.prevSavingsRate > 0 && (
                    <>, {review.savingsRate > review.prevSavingsRate ? 'up' : 'down'} from <span className="text-white/70">{review.prevSavingsRate}%</span> last month</>
                  )}.
                  {review.biggestReduction.amount > 0 && (
                    <> Your biggest spending reduction was in <span className="text-positive font-bold">{review.biggestReduction.category}</span> ({fmt(review.biggestReduction.amount)} less).</>
                  )}
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Income</p>
                    <p className="text-2xl font-bold text-positive">{fmt(review.income)}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Expenses</p>
                    <p className="text-2xl font-bold text-negative">{fmt(review.expenses)}</p>
                  </div>
                </div>
                {review.topCategory && (
                  <div className="mt-6 flex items-center gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                      <Zap className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-white/60">Top spending: <span className="text-white font-bold">{review.topCategory[0]}</span> at {fmt(review.topCategory[1])}</p>
                  </div>
                )}
              </motion.div>
              
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
                viewport={{ once: true }}
                className="glass-card p-12 aspect-square flex flex-col items-center justify-center relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-positive/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="text-center relative z-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-[120px] font-bold font-mono text-white tracking-tighter leading-none mb-4"
                  >
                    {review.savingsRate}%
                  </motion.div>
                  <div className="text-sm font-bold text-positive uppercase tracking-[0.4em]">Savings Rate</div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[80%] h-[80%] border border-positive/10 rounded-full animate-ping-slow" />
                  <div className="w-[60%] h-[60%] border border-positive/5 rounded-full animate-ping-slow delay-700" />
                </div>
              </motion.div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, rotate: 5 }}
                whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
                viewport={{ once: true }}
                className="order-2 lg:order-1 glass-card p-12 aspect-video flex items-center justify-center bg-gradient-to-br from-accent/20 to-transparent relative group overflow-hidden"
              >
                <div className="text-center relative z-10">
                  <p className="text-7xl font-bold font-mono mb-4">{fmt(review.totalBalance)}</p>
                  <p className="text-sm font-bold text-accent uppercase tracking-[0.3em]">Total Balance</p>
                  {review.totalDebt > 0 && (
                    <p className="mt-4 text-sm text-white/40">Outstanding Debt: <span className="text-negative">{fmt(review.totalDebt)}</span></p>
                  )}
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ x: 40, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="order-1 lg:order-2"
              >
                <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center text-accent mb-8 shadow-[0_0_30px_rgba(124,110,250,0.2)]">
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="text-5xl font-bold mb-8 tracking-tight">
                  {review.activeGoals.length > 0 ? 'Goals Progress' : 'Set Your Goals'}
                </h2>
                {review.activeGoals.length > 0 ? (
                  <div className="space-y-6">
                    {review.activeGoals.slice(0, 3).map(goal => {
                      const pct = Math.round((goal.current / goal.target) * 100);
                      return (
                        <div key={goal.id} className="p-6 rounded-3xl bg-accent/5 border border-accent/20">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-lg font-bold">{goal.name}</h4>
                            <span className="text-sm font-bold text-accent">{pct}%</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              whileInView={{ width: `${pct}%` }}
                              className="h-full bg-accent violet-glow rounded-full" 
                            />
                          </div>
                          <p className="mt-3 text-xs text-white/40 font-medium">
                            {fmt(goal.current)} of {fmt(goal.target)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xl text-white/50 leading-relaxed font-medium">
                    Create savings goals to track your progress here. Head to the <span className="text-accent font-bold">Savings</span> page to get started.
                  </p>
                )}
              </motion.div>
            </section>

            <section className="text-center py-32 border-t border-white/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-accent/5 blur-[100px] rounded-full -z-10" />
              <motion.h3 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                className="text-4xl font-bold mb-12 italic text-white/20 max-w-3xl mx-auto leading-tight"
              >
                "Financial freedom is not about having a lot of money, it's about having options."
              </motion.h3>
              <p className="text-lg text-white/40 mb-8">
                {review.txnCount} transactions tracked this month
              </p>
            </section>
          </div>
        </>
      )}
    </motion.div>
  );
};
