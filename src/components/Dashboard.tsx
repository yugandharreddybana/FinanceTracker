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
          <motion.div variants={item} className="lg:col-span-8">
            <SpendingTrends />
          </motion.div>
          <motion.div variants={item} className="lg:col-span-4">
            <SpendingPulse />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div variants={item} className="lg:col-span-6">
            <HealthScoreVitals />
          </motion.div>
          <motion.div variants={item} className="lg:col-span-6">
            <AIInsightCard setActiveTab={setActiveTab} />
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
