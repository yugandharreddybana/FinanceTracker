import React from 'react';
import { TopBar } from './TopBar';
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

const SkeletonCard = () => (
  <div className="glass-card p-6 rounded-2xl animate-pulse">
    <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
    <div className="h-8 bg-white/10 rounded w-1/2 mb-2" />
    <div className="h-3 bg-white/10 rounded w-2/3" />
  </div>
);

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { transactions, accounts, isLoading } = useFinance();
  const isFirstLoad = isLoading && transactions.length === 0 && accounts.length === 0;

  if (isFirstLoad) {
    return (
      <div className="max-w-7xl mx-auto pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto pb-20"
    >
      <TopBar />
      
      <div className="space-y-8">
        <motion.div variants={item}>
          <NetWorthHero />
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div variants={item} className="lg:col-span-8 min-h-[200px]">
            <SpendingTrends />
          </motion.div>
          <motion.div variants={item} className="lg:col-span-4 min-h-[200px]">
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
          <motion.div variants={item} className="lg:col-span-8 overflow-x-auto">
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
