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
import { cn } from './lib/utils';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from './components/CommandPalette';
import { NotificationCenter, Notification as AppNotification } from './components/NotificationCenter';
import { LayoutDashboard, Wallet, Receipt, CreditCard, PieChart, TrendingUp, Settings, LogOut, Bell, Sparkles, X, Command, Search, WifiOff, Activity, Leaf, Shield, History, Globe2, FileText, BarChart3, Calculator, UserCircle, Briefcase, HeartPulse, HelpCircle, AlertCircle, Calendar, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';
import { aiService, AIInsight } from './services/aiService';

export default function App() {
  return (
    <Router>
      <FinanceProvider>
        <MainApp />
      </FinanceProvider>
    </Router>
  );
}

function MainApp() {
  const { userProfile, transactions, isOffline, updateUserProfile, clearDataForNewUser, refreshData } = useFinance();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('yugi_finance_active_tab');
    if (saved) return saved;
    return 'dashboard';
  });

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('yugi_finance_active_tab', activeTab);
  }, [activeTab]);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Persistent Login: Check if a session and auth token both exist
    const session = localStorage.getItem('yugi_finance_session');
    const token = localStorage.getItem('auth_token');
    if (session && token) {
      const { timestamp } = JSON.parse(session);
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - timestamp < oneHour) {
        return true;
      }
    }
    return false;
  });
  const [showDemo, setShowDemo] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // Sync activeTab with URL if user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      const path = location.pathname.split('/').pop() || 'dashboard';
      if (path !== 'dashboard' && path !== '' && location.pathname.startsWith('/dashboard')) {
        setActiveTab(path);
      }
    }
  }, [location.pathname, isLoggedIn]);

  // Handle refresh and initial load
  useEffect(() => {
    if (isLoggedIn) {
      refreshData();
    }
  }, [isLoggedIn, refreshData]);

  // Sync session timestamp on activity
  useEffect(() => {
    if (!isLoggedIn) return;

    const updateSession = () => {
      localStorage.setItem('yugi_finance_session', JSON.stringify({ 
        timestamp: Date.now() 
      }));
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, updateSession));
    
    // Initial update
    updateSession();

    return () => {
      events.forEach(event => document.removeEventListener(event, updateSession));
    };
  }, [isLoggedIn]);

  // Sync AI Insights as real-time notifications
  useEffect(() => {
    if (!isLoggedIn || transactions.length < 5) return;

    const fetchRealTimeInsights = async () => {
      setIsAIProcessing(true);
      try {
        const insights = await aiService.getInsights(transactions.slice(0, 50));
        
        // Convert AI Insights to UI Notifications
        const newNotifications: AppNotification[] = insights.map((insight: AIInsight) => ({
          id: insight.id || Math.random().toString(36).substr(2, 9),
          title: insight.title,
          message: insight.description,
          type: insight.type === 'ALERT' ? 'warning' : 
                insight.type === 'WIN' ? 'success' : 
                insight.type === 'TIP' ? 'info' : 'alert',
          time: insight.date || 'Just now',
          read: false,
          icon: insight.type === 'ALERT' ? AlertTriangle : 
                insight.type === 'WIN' ? TrendingUp : 
                insight.type === 'TIP' ? Sparkles : BarChart3
        }));

        setNotifications(prev => {
          // Avoid duplicate titles in recent notifications
          const existingTitles = new Set(prev.slice(0, 10).map(n => n.title));
          const uniqueNew = newNotifications.filter(n => !existingTitles.has(n.title));
          return [...uniqueNew, ...prev].slice(0, 50); // Keep last 50
        });
      } catch (err) {
        console.error("Failed to fetch real-time insights:", err);
      } finally {
        setIsAIProcessing(false);
      }
    };

    // Initial fetch
    fetchRealTimeInsights();

    // Poll for new insights every 5 minutes
    const interval = setInterval(fetchRealTimeInsights, 300000);
    return () => clearInterval(interval);
  }, [isLoggedIn, transactions.length]); // Re-run when transactions change significantly

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

  const handleLogin = (email: string, token?: string, name?: string) => {
    // Store auth token for API calls
    if (token) localStorage.setItem('auth_token', token);
    // Session persistent for 1 hr
    localStorage.setItem('yugi_finance_session', JSON.stringify({ 
      timestamp: Date.now() 
    }));
    clearDataForNewUser();
    updateUserProfile({ email, name: name || email.split('@')[0] });
    setIsLoggedIn(true);
    setActiveTab('dashboard');
    refreshData();
    navigate('/dashboard');
  };

  const handleSignup = (name: string, email: string, token?: string) => {
    // Store auth token for API calls
    if (token) localStorage.setItem('auth_token', token);
    // Session persistent for 1 hr
    localStorage.setItem('yugi_finance_session', JSON.stringify({ 
      timestamp: Date.now() 
    }));
    clearDataForNewUser();
    updateUserProfile({ name, email });
    setIsLoggedIn(true);
    setActiveTab('dashboard');
    refreshData();
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('yugi_finance_session');
    localStorage.removeItem('auth_token');
    clearDataForNewUser();
    setIsLoggedIn(false);
    navigate('/');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard key="dashboard" setActiveTab={setActiveTab} />;
      case 'transactions': return <TransactionsPage key="transactions" />;
      case 'accounts': return <BankAccountsPage key="accounts" />;
      case 'budgets': return <BudgetsPage key="budgets" setActiveTab={setActiveTab} />;
      case 'savings': return <SavingsPage key="savings" onNavigate={setActiveTab} />;
      case 'recurring': return <RecurringPage key="recurring" />;
      case 'loans': return <LoansPage key="loans" />;
      case 'networth': return <NetWorthPage key="networth" onNavigate={setActiveTab} />;
      case 'health': return <HealthScorePage key="health" onNavigate={setActiveTab} />;
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
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
            !isLoggedIn ? (
              <LandingPage 
                key="landing" 
                onGetStarted={() => navigate('/signup')} 
                onLogin={() => navigate('/login')} 
                onWatchDemo={() => setShowDemo(true)}
              />
            ) : <Navigate to="/dashboard" replace />
          } />
          <Route path="/login" element={
            !isLoggedIn ? (
              <LoginPage 
                key="login" 
                onLogin={handleLogin} 
                onSwitchToSignup={() => navigate('/signup')}
                onForgotPassword={() => navigate('/forgot-password')}
                onBackToHome={() => navigate('/')}
              />
            ) : <Navigate to="/dashboard" replace />
          } />
          <Route path="/signup" element={
            !isLoggedIn ? (
              <SignupPage 
                key="signup" 
                onSignup={handleSignup} 
                onSwitchToLogin={() => navigate('/login')}
                onBackToHome={() => navigate('/')}
              />
            ) : <Navigate to="/dashboard" replace />
          } />
          <Route path="/forgot-password" element={
            !isLoggedIn ? (
              <ForgotPasswordPage 
                key="forgot-password"
                onBackToLogin={() => navigate('/login')}
                onBackToHome={() => navigate('/')}
              />
            ) : <Navigate to="/dashboard" replace />
          } />

          {/* Protected App Routes */}
          <Route path="/dashboard/*" element={
            isLoggedIn ? (
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
                      <Bell className={cn("w-5 h-5 transition-colors", 
                        isAIProcessing ? "text-accent animate-pulse" : "text-white/40 group-hover:text-white"
                      )} />
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

                <div className="px-6 md:px-10 lg:px-12 pb-40" style={{ paddingTop: '5.5rem' }}>
                  <AnimatePresence mode="wait">
                    {renderContent()}
                  </AnimatePresence>
                </div>

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
                  className="fixed bottom-32 right-8 w-16 h-16 rounded-2xl bg-accent flex items-center justify-center violet-glow z-[80] shadow-2xl border border-white/10"
                >
                  <Sparkles className="w-8 h-8 text-white animate-pulse" />
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

                {/* Premium Background Effects */}
                <div className="noise-bg" />
                <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-accent/10 rounded-full blur-[160px] pointer-events-none -z-10 animate-pulse" />
                <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-positive/5 rounded-full blur-[140px] pointer-events-none -z-10" />
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full premium-gradient pointer-events-none -z-20" />
              </main>
            </div>
          ) : <Navigate to="/login" replace />
        } />
      </Routes>

      {/* Demo Modal outside of Routes to be accessible anywhere if needed, or keeping it separate */}
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
    </div>
  );
}
