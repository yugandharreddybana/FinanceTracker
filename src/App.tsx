import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionsPage } from './components/TransactionsPage';
import { BankAccountsPage } from './components/BankAccountsPage';
import { BudgetsPage } from './components/BudgetsPage';
import { SavingsPage } from './components/SavingsPage';
import { RecurringPage } from './components/RecurringPage';
import { NetWorthPage } from './components/NetWorthPage';
import { HealthScorePage } from './components/HealthScorePage';
import { CarbonFootprintPage } from './components/CarbonFootprintPage';
import { CategoriesPage } from './components/CategoriesPage';
import { AIInsightsPage } from './components/AIInsightsPage';
import { IncomeAnalyticsPage } from './components/IncomeAnalyticsPage';
import { MonthlyReview } from './components/MonthlyReview';
import { LoansPage } from './components/LoansPage';
import { SmartAdd } from './components/SmartAdd';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { SettingsPage } from './components/SettingsPage';
import { InvestmentPage } from './components/InvestmentPage';
import { ForecastingPage } from './components/ForecastingPage';
import { TaxEnginePage } from './components/TaxEnginePage';
import { ReportBuilderPage } from './components/ReportBuilderPage';
import { AuditLogPage } from './components/AuditLogPage';
import { FamilyPage } from './components/FamilyPage';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X, Bell, Command, Search, WifiOff } from 'lucide-react';
import { CommandPalette } from './components/CommandPalette';
import { NotificationCenter, Notification } from './components/NotificationCenter';
import { AlertCircle, TrendingUp, Wallet, Calendar } from 'lucide-react';

export default function App() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}

function MainApp() {
  const { userProfile, isOffline } = useFinance();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [authView, setAuthView] = useState<'landing' | 'login' | 'signup' | 'forgot-password'>('landing');
  const [showDemo, setShowDemo] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'AI Insight: Budget Alert',
      message: 'Your "Dining Out" budget is at 85%. Consider cooking at home this weekend.',
      type: 'warning',
      time: '2m ago',
      read: false,
      icon: AlertCircle
    },
    {
      id: '2',
      title: 'Net Worth Milestone',
      message: 'Congratulations! Your net worth has increased by 5.2% this month.',
      type: 'success',
      time: '1h ago',
      read: false,
      icon: TrendingUp
    },
    {
      id: '3',
      title: 'Upcoming Bill',
      message: 'Your Netflix subscription ($15.99) is due in 3 days.',
      type: 'info',
      time: '5h ago',
      read: true,
      icon: Calendar
    }
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-logout logic (1 hour of inactivity)
  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        alert("You have been logged out due to 1 hour of inactivity.");
      }, 3600000); // 1 hour
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isLoggedIn]);

  const handleLogin = (email: string) => {
    updateUserProfile({ email, name: email.split('@')[0] });
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  };

  const handleSignup = (name: string, email: string) => {
    updateUserProfile({ name, email });
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthView('landing');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard key="dashboard" setActiveTab={setActiveTab} />;
      case 'transactions': return <TransactionsPage key="transactions" />;
      case 'accounts': return <BankAccountsPage key="accounts" />;
      case 'budgets': return <BudgetsPage key="budgets" setActiveTab={setActiveTab} />;
      case 'savings': return <SavingsPage key="savings" />;
      case 'recurring': return <RecurringPage key="recurring" />;
      case 'loans': return <LoansPage key="loans" />;
      case 'networth': return <NetWorthPage key="networth" />;
      case 'health': return <HealthScorePage key="health" />;
      case 'carbon': return <CarbonFootprintPage key="carbon" />;
      case 'categories': return <CategoriesPage key="categories" />;
      case 'insights': return <AIInsightsPage key="insights" />;
      case 'income': return <IncomeAnalyticsPage key="income" />;
      case 'review': return <MonthlyReview key="review" />;
      case 'investments': return <InvestmentPage key="investments" />;
      case 'forecasting': return <ForecastingPage key="forecasting" />;
      case 'tax': return <TaxEnginePage key="tax" />;
      case 'reports': return <ReportBuilderPage key="reports" />;
      case 'audit': return <AuditLogPage key="audit" />;
      case 'family': return <FamilyPage key="family" />;
      case 'settings': return <SettingsPage key="settings" />;
      default: return <Dashboard key="dashboard" setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-white selection:bg-accent/30">
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            authView === 'landing' ? (
              <LandingPage 
                key="landing" 
                onGetStarted={() => setAuthView('signup')} 
                onLogin={() => setAuthView('login')} 
                onWatchDemo={() => setShowDemo(true)}
              />
            ) : authView === 'login' ? (
              <LoginPage 
                key="login" 
                onLogin={handleLogin} 
                onSwitchToSignup={() => setAuthView('signup')}
                onForgotPassword={() => setAuthView('forgot-password')}
                onBackToHome={() => setAuthView('landing')}
              />
            ) : authView === 'signup' ? (
              <SignupPage 
                key="signup" 
                onSignup={handleSignup} 
                onSwitchToLogin={() => setAuthView('login')}
                onBackToHome={() => setAuthView('landing')}
              />
            ) : (
              <ForgotPasswordPage 
                key="forgot-password"
                onBackToLogin={() => setAuthView('login')}
                onBackToHome={() => setAuthView('landing')}
              />
            )
          ) : (
            <div key="app-main" className="min-h-screen">
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
              
              <main className="pl-[80px] min-h-screen relative z-10 transition-all duration-500 ease-[0.22, 1, 0.36, 1]">
                {/* Fixed Header Bar */}
                <header className="fixed top-0 left-[80px] right-0 h-20 flex items-center justify-between px-10 border-b border-white/5 bg-background/80 backdrop-blur-xl z-[90]">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsCommandPaletteOpen(true)}
                      className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all group"
                    >
                      <Search className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Search anything...</span>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] opacity-40 group-hover:opacity-100">
                        <Command className="w-2.5 h-2.5" />
                        <span>K</span>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-6">
                    {isOffline && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-negative/10 border border-negative/20 text-negative">
                        <WifiOff className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Offline Mode</span>
                      </div>
                    )}
                    <button 
                      onClick={() => setIsNotificationsOpen(true)}
                      className="relative p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                    >
                      <Bell className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                      {notifications.some(n => !n.read) && (
                        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-accent rounded-full border-2 border-[#0F0F19] animate-pulse" />
                      )}
                    </button>
                    <div className="flex items-center gap-3 pl-6 border-l border-white/5">
                      <div className="text-right">
                        <p className="text-xs font-bold">{userProfile.name}</p>
                        <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{userProfile.role}</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-positive p-[1px]">
                        <div className="w-full h-full rounded-[15px] bg-background flex items-center justify-center text-xs font-bold">
                          {userProfile.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                    </div>
                  </div>
                </header>

                <div className="pt-20 p-6 md:p-10 lg:p-12 pb-40">
                  <AnimatePresence mode="wait">
                    {renderContent()}
                  </AnimatePresence>
                </div>
              </main>

              <CommandPalette 
                isOpen={isCommandPaletteOpen} 
                onClose={() => setIsCommandPaletteOpen(false)} 
                onNavigate={setActiveTab} 
              />

              <NotificationCenter 
                isOpen={isNotificationsOpen} 
                onClose={() => setIsNotificationsOpen(false)} 
                notifications={notifications}
                onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
                onClearAll={() => setNotifications([])}
              />

              <SmartAdd setActiveTab={setActiveTab} />
              
              {/* Floating AI Insights Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-32 right-8 w-20 h-20 rounded-3xl bg-accent flex items-center justify-center violet-glow z-[80] shadow-2xl border border-white/10"
              >
                <Sparkles className="w-10 h-10 text-white animate-pulse" />
              </motion.button>

              {/* Floating Chatbot Window */}
              <AnimatePresence>
                {isChatOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                    className="fixed bottom-32 right-8 w-[450px] h-[600px] z-[150] shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                  >
                    <AIInsightsPage compact onClose={() => setIsChatOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Demo Modal */}
              <AnimatePresence>
                {showDemo && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowDemo(false)}
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative w-full max-w-5xl aspect-video bg-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
                    >
                      <div className="absolute inset-0 flex items-center justify-center bg-accent/5">
                        <div className="text-center">
                          <Sparkles className="w-20 h-20 text-accent mx-auto mb-6 animate-pulse" />
                          <h2 className="text-4xl font-bold mb-4 tracking-tighter font-display">Yugi Finance Tracker Demo</h2>
                          <p className="text-white/40 font-medium max-w-md mx-auto">
                            Experience the future of wealth intelligence. Our neural engine is processing your request...
                          </p>
                          <div className="mt-10 flex justify-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                            <div className="w-3 h-3 rounded-full bg-accent animate-bounce [animation-delay:200ms]" />
                            <div className="w-3 h-3 rounded-full bg-accent animate-bounce [animation-delay:400ms]" />
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowDemo(false)}
                        title="Close demo"
                        className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Premium Background Effects */}
              <div className="noise-bg" />
              <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-accent/10 rounded-full blur-[160px] pointer-events-none -z-10 animate-pulse" />
              <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-positive/5 rounded-full blur-[140px] pointer-events-none -z-10" />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full premium-gradient pointer-events-none -z-20" />
            </div>
          )}
        </AnimatePresence>
      </div>
  );
}
