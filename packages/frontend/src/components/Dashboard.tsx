import React from 'react';
import { NetWorthHero } from './NetWorthHero';
import { SpendingPulse } from './SpendingPulse';
import { SpendingTrends } from './SpendingTrends';
import { AIInsightCard } from './AIInsightCard';
import { CashFlowForecast } from './CashFlowForecast';
import { RecentTransactions } from './RecentTransactions';
import { SavingsGoals } from './SavingsGoals';
import { HealthScoreVitals } from './HealthScoreVitals';
import { motion } from 'motion/react';
import { TiltCard } from './TiltCard';
import { ArrowRight, CreditCard, Sparkles } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { accounts, budgets, investments, loans, recurringPayments, savingsGoals, transactions } = useFinance();
  const hasAnyFinanceData = [
    transactions.length,
    accounts.length,
    budgets.length,
    savingsGoals.length,
    investments.length,
    recurringPayments.length,
    loans.length,
  ].some(Boolean);

  if (!hasAnyFinanceData) {
    return (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl pb-20"
      >
        <motion.div variants={item} className="glass-card overflow-hidden border-accent/20 shadow-[0_0_70px_rgba(124,110,250,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="border-b border-white/5 bg-white/[0.02] p-8 md:p-12 lg:border-b-0 lg:border-r">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-accent">
                <Sparkles className="h-3 w-3" />
                <span>Start your workspace</span>
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tighter md:text-5xl">
                Add your first financial record to unlock the dashboard.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-white/50">
                Your charts, alerts, forecasts, and AI insights appear once you add a transaction or connect an account. Start with one entry and the rest of the workspace will populate from there.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-accent px-6 py-4 text-sm font-bold text-white transition-all hover:bg-accent/80 violet-glow"
                >
                  <span>Add your first transaction</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActiveTab('accounts')}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Set up an account</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 p-8 md:p-12">
              {[
                'Track cash in and cash out with one transaction.',
                'Create your first account to organize balances by bank or wallet.',
                'Return here to see net worth, trends, alerts, and planning widgets.',
              ].map((step, index) => (
                <div key={step} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent">Step {index + 1}</div>
                  <p className="text-sm font-medium leading-7 text-white/55">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto pb-20"
    >
      <div className="space-y-8">
        <motion.div variants={item}>
          <NetWorthHero />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div variants={item} className="lg:col-span-8">
            <SpendingTrends />
          </motion.div>
          <motion.div variants={item} className="lg:col-span-4">
            <SpendingPulse />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div variants={item} className="lg:col-span-6">
            <TiltCard>
              <HealthScoreVitals />
            </TiltCard>
          </motion.div>
          <motion.div variants={item} className="lg:col-span-6">
            <TiltCard>
              <AIInsightCard setActiveTab={setActiveTab} />
            </TiltCard>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div variants={item} className="lg:col-span-8">
            <CashFlowForecast />
          </motion.div>
          <motion.div variants={item} className="lg:col-span-4">
            <RecentTransactions setActiveTab={setActiveTab} />
          </motion.div>
        </div>

        <motion.div variants={item}>
          <SavingsGoals />
        </motion.div>
      </div>
    </motion.div>
  );
};
