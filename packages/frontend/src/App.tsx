import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { SmartAddModal } from './components/SmartAddModal';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { InfoPage } from './components/InfoPage';
// Lazy-loaded page components — reduces initial bundle size
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const TransactionsPage = lazy(() => import('./components/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const BankAccountsPage = lazy(() => import('./components/BankAccountsPage').then(m => ({ default: m.BankAccountsPage })));
const BudgetsPage = lazy(() => import('./components/BudgetsPage').then(m => ({ default: m.BudgetsPage })));
const SavingsPage = lazy(() => import('./components/SavingsPage').then(m => ({ default: m.SavingsPage })));
const RecurringPage = lazy(() => import('./components/RecurringPage').then(m => ({ default: m.RecurringPage })));
const NetWorthPage = lazy(() => import('./components/NetWorthPage').then(m => ({ default: m.NetWorthPage })));
const HealthScorePage = lazy(() => import('./components/HealthScorePage').then(m => ({ default: m.HealthScorePage })));
const CarbonFootprintPage = lazy(() => import('./components/CarbonFootprintPage').then(m => ({ default: m.CarbonFootprintPage })));
const CategoriesPage = lazy(() => import('./components/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const AIInsightsPage = lazy(() => import('./components/AIInsightsPage').then(m => ({ default: m.AIInsightsPage })));
const IncomeAnalyticsPage = lazy(() => import('./components/IncomeAnalyticsPage').then(m => ({ default: m.IncomeAnalyticsPage })));
const MonthlyReview = lazy(() => import('./components/MonthlyReview').then(m => ({ default: m.MonthlyReview })));
const LoansPage = lazy(() => import('./components/LoansPage').then(m => ({ default: m.LoansPage })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then(m => ({ default: m.SettingsPage })));
const InvestmentPage = lazy(() => import('./components/InvestmentPage').then(m => ({ default: m.InvestmentPage })));
const ForecastingPage = lazy(() => import('./components/ForecastingPage').then(m => ({ default: m.ForecastingPage })));
const TaxEnginePage = lazy(() => import('./components/TaxEnginePage').then(m => ({ default: m.TaxEnginePage })));
const ReportBuilderPage = lazy(() => import('./components/ReportBuilderPage').then(m => ({ default: m.ReportBuilderPage })));
const AuditLogPage = lazy(() => import('./components/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const FamilyPage = lazy(() => import('./components/FamilyPage').then(m => ({ default: m.FamilyPage })));
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'motion/react';
import { cn, safeStorage } from './lib/utils';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from './components/CommandPalette';
import { NotificationCenter, Notification as AppNotification } from './components/NotificationCenter';
import { LayoutDashboard, Wallet, Receipt, CreditCard, PieChart, TrendingUp, Settings, LogOut, Bell, Sparkles, X, Command, Search, WifiOff, Activity, Leaf, Shield, History, Globe2, FileText, BarChart3, Calculator, UserCircle, Briefcase, HeartPulse, HelpCircle, AlertCircle, Calendar, CheckCircle2, AlertTriangle, TrendingDown, Plus } from 'lucide-react';
import { aiService, AIInsight } from './services/aiService';
import { authApi, MIDDLEWARE_BASE } from './services/api';

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <FinanceProvider>
          <MainApp />
        </FinanceProvider>
      </Router>
    </ErrorBoundary>
  );
}

function MainApp() {
  const { userProfile, transactions, budgets, isOffline, updateUserProfile, clearDataForNewUser, refreshData } = useFinance();
  const location = useLocation();
  const navigate = useNavigate();

  // A2: Derive activeTab directly from URL — no useState, no localStorage
  const activeTab = location.pathname.split('/')[2] || 'dashboard';

  // S1/S2: Auth state is now driven by the httpOnly cookie via /me check — no localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Prevent redirect-to-login flash while the /me check is in flight
  const [authChecking, setAuthChecking] = useState(true);

  // Check session via cookie on every app load
  useEffect(() => {
    authApi.me()
      .then(data => {
        if (data?.user) {
          updateUserProfile({ email: data.user.email, name: data.user.name });
          setIsLoggedIn(true);
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecking(false));
  }, []);
  const [showDemo, setShowDemo] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('yugi_finance_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isSmartAddOpen, setIsSmartAddOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle refresh and initial load
  useEffect(() => {
    if (isLoggedIn) {
      refreshData();
    }
  }, [isLoggedIn, refreshData]);

  // Track latest transactions in a ref to avoid stale closure in AI insights polling
  const txRef = useRef(transactions);
  useEffect(() => { txRef.current = transactions; }, [transactions]);

  // Sync AI Insights as real-time notifications — deps on isLoggedIn only; reads txRef.current inside
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchRealTimeInsights = async () => {
      if (txRef.current.length < 5) return;
      setIsAIProcessing(true);
      try {
        const insights = await aiService.getInsights(txRef.current.slice(0, 50));

        const newNotifications: AppNotification[] = insights.map((insight: AIInsight) => ({
          id: crypto.randomUUID(),
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
          // L9: Check ALL existing notifications for dedup, not just first 10
          const existingTitles = new Set(prev.map(n => n.title));
          const uniqueNew = newNotifications.filter(n => !existingTitles.has(n.title));
          return [...uniqueNew, ...prev].slice(0, 50);
        });
      } catch (err) {
        console.error("Failed to fetch real-time insights:", err);
      } finally {
        setIsAIProcessing(false);
      }
    };

    // L8: 30-second initial delay before first fetch to avoid burning quota on every login
    const initialDelay = setTimeout(fetchRealTimeInsights, 30000);
    const interval = setInterval(fetchRealTimeInsights, 300000);
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isLoggedIn]);

  // Persist notifications across sessions
  useEffect(() => {
    localStorage.setItem('yugi_finance_notifications', JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const budgetNotifications = budgets
      .map((budget) => {
        const effectiveLimit = budget.limit + (budget.rolloverAmount || 0);
        if (effectiveLimit <= 0) return null;

        const progress = budget.spent / effectiveLimit;
        if (progress < 0.85) return null;

        const overBy = Math.max(0, budget.spent - effectiveLimit);
        const title = `Budget alert: ${budget.category}`;
        const message = progress >= 1
          ? `${budget.category} is over budget by ${overBy.toLocaleString(undefined, { style: 'currency', currency: budget.currency || 'INR' })}.`
          : `${budget.category} has reached ${Math.round(progress * 100)}% of its budget.`;

        return {
          id: `budget-${budget.id}-${progress >= 1 ? 'over' : 'warning'}`,
          title,
          message,
          type: 'warning' as const,
          time: 'Just now',
          read: false,
          icon: AlertTriangle,
        };
      })
      .filter(Boolean) as AppNotification[];

    if (budgetNotifications.length === 0) return;

    setNotifications((prev) => {
      const existing = new Set(prev.map((notification) => notification.id));
      const incoming = budgetNotifications.filter((notification) => !existing.has(notification.id));
      return incoming.length > 0 ? [...incoming, ...prev].slice(0, 50) : prev;
    });
  }, [budgets, isLoggedIn]);

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

  const handleLogin = (email: string, _token?: string, name?: string) => {
    // Token is now an httpOnly cookie set by the server — no localStorage storage needed
    // A6: Don't clear data before new data arrives; refreshData will overwrite state
    updateUserProfile({ email, name: name || email.split('@')[0] });
    setIsLoggedIn(true);
    setTimeout(() => refreshData(), 0);
    navigate('/dashboard');
  };

  const handleSignup = (name: string, email: string, _token?: string) => {
    // Token is now an httpOnly cookie set by the server — no localStorage storage needed
    // A6: Don't clear data before new data arrives; refreshData will overwrite state
    updateUserProfile({ name, email });
    setIsLoggedIn(true);
    setTimeout(() => refreshData(), 0);
    navigate('/dashboard');
  };

  const handleLogout = useCallback(async () => {
    const email = userProfile.email;
    try {
      await authApi.logout();
    } catch {
      // Proceed with client-side cleanup even if server call fails
    }
    clearDataForNewUser(email);
    safeStorage.remove('yugi_finance_notifications');
    safeStorage.remove('yugi_ai_chat_history');
    safeStorage.remove('ft_oracle_messages');
    setNotifications([]);
    setIsLoggedIn(false);
    navigate('/');
  }, [clearDataForNewUser, navigate, userProfile.email]);

  // A5: Keep a stable ref to handleLogout so the inactivity timer doesn't recreate on every render
  const handleLogoutRef = useRef(handleLogout);
  useEffect(() => { handleLogoutRef.current = handleLogout; }, [handleLogout]);

  // Inactivity auto-logout (1 hour) — B8: show notification 2 sec before logout
  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: NodeJS.Timeout;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // B8: Show the notification first, then log out after a short delay
        setNotifications(prev => [...prev, {
          id: crypto.randomUUID(),
          title: 'Session Expired',
          message: 'You have been logged out due to 1 hour of inactivity.',
          type: 'warning' as const,
          time: 'Just now',
          read: false,
          icon: AlertTriangle
        }]);
        setTimeout(() => handleLogoutRef.current(), 2000);
      }, 3600000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
    // A5: Only depend on isLoggedIn; use handleLogoutRef.current() inside
  }, [isLoggedIn]);

  // Toast error listener — surfaces FinanceContext CRUD errors in the notification bell
  useEffect(() => {
    const handleToastError = (e: Event) => {
      const { message } = (e as CustomEvent).detail;
      setNotifications(prev => [...prev, {
        id: crypto.randomUUID(),
        title: 'Error',
        message,
        type: 'warning' as const,
        time: 'Just now',
        read: false,
        icon: AlertCircle
      }]);
    };
    window.addEventListener('finance-toast-error', handleToastError);
    return () => window.removeEventListener('finance-toast-error', handleToastError);
  }, []);

  useEffect(() => {
    const handleAuthExpired = (event: Event) => {
      if (!isLoggedIn) return;

      const message = (event as CustomEvent<{ message?: string }>).detail?.message || 'Your session expired. Please sign in again.';
      const email = userProfile.email;

      clearDataForNewUser(email);
      safeStorage.remove('yugi_finance_notifications');
      safeStorage.remove('ft_oracle_messages');
      setNotifications([]);
      setIsLoggedIn(false);
      navigate('/login', { replace: true, state: { authMessage: message } });
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [clearDataForNewUser, isLoggedIn, navigate, userProfile.email]);

  // Navigate to a tab — URL is the source of truth; activeTab derives automatically
  const handleNavigate = useCallback((tab: string) => {
    navigate(`/dashboard/${tab}`);
  }, [navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard key="dashboard" />;
      case 'transactions': return <TransactionsPage key="transactions" />;
      case 'accounts': return <BankAccountsPage key="accounts" />;
      case 'budgets': return <BudgetsPage key="budgets" />;
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
      default:
        // U12: Known empty/undefined tabs default to dashboard; truly unknown tabs show 404
        if (!activeTab || activeTab === 'dashboard') return <Dashboard key="dashboard" />;
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="text-6xl">🔍</div>
            <h2 className="text-2xl font-bold text-white">Page Not Found</h2>
            <p className="text-white/50">The page you're looking for doesn't exist.</p>
            <button onClick={() => handleNavigate('dashboard')} className="px-6 py-3 bg-accent rounded-2xl text-white font-bold hover:bg-accent/80 transition-all">Go to Dashboard</button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-white selection:bg-accent/30">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          authChecking ? null :
          !isLoggedIn ? (
            <LandingPage key="landing" />
          ) : <Navigate to="/dashboard" replace />
        } />
        <Route path="/login" element={
          authChecking ? null :
          !isLoggedIn ? (
            <LoginPage key="login" />
          ) : <Navigate to="/dashboard" replace />
        } />
        <Route path="/signup" element={
          authChecking ? null :
          !isLoggedIn ? (
            <SignupPage key="signup" />
          ) : <Navigate to="/dashboard" replace />
        } />
        <Route path="/forgot-password" element={
          authChecking ? null :
          !isLoggedIn ? (
            <ForgotPasswordPage
              key="forgot-password"
              onBackToLogin={() => navigate('/login')}
              onBackToHome={() => navigate('/')}
            />
          ) : <Navigate to="/dashboard" replace />
        } />
        <Route path="/reset-password" element={
          !isLoggedIn ? (
            <ResetPasswordPage key="reset-password" />
          ) : <Navigate to="/dashboard" replace />
        } />
        <Route path="/privacy" element={<InfoPage variant="privacy" />} />
        <Route path="/terms" element={<InfoPage variant="terms" />} />
        <Route path="/security" element={<InfoPage variant="security" />} />
        <Route path="/contact" element={<InfoPage variant="contact" />} />

        <Route path="/dashboard/*" element={
          authChecking ? null :
          isLoggedIn ? (
            <div key="app-main" className="flex h-screen overflow-hidden bg-slate-50/80 text-slate-800">
              <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <TopBar onSmartAdd={() => setIsSmartAddOpen(true)} onMenuToggle={() => setMobileMenuOpen(true)} />

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50/50">
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[60vh]">
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    </div>
                  }>
                    <AnimatePresence mode="wait">
                      {renderContent()}
                    </AnimatePresence>
                  </Suspense>
                </main>
              </div>

              {/* Mobile FAB */}
              <motion.button onClick={() => setIsSmartAddOpen(true)}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                className="lg:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full animated-gradient text-white shadow-2xl shadow-emerald-300/40">
                <Plus className="h-6 w-6" />
              </motion.button>

              <SmartAddModal open={isSmartAddOpen} onClose={() => setIsSmartAddOpen(false)} />

              <NotificationCenter
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
                onClearAll={() => setNotifications([])}
              />

              {/* Floating AI Insights Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-20 right-8 w-14 h-14 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 flex items-center justify-center transition-all z-[80] shadow-2xl"
              >
                <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
              </motion.button>

              {/* Floating Chatbot Window */}
              <AnimatePresence>
                {isChatOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                    className="fixed bottom-20 right-8 w-[450px] h-[600px] z-[150] shadow-[0_0_50px_rgba(0,0,0,0.15)] bg-white rounded-3xl overflow-hidden border border-slate-100"
                  >
                    <AIInsightsPage compact onClose={() => setIsChatOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : <Navigate to="/login" replace state={{ authMessage: 'Your session has expired. Please sign in again.' }} />
        } />
      </Routes>

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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6 border border-white/20">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 text-white/60 ml-1" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-white/60 text-lg font-semibold tracking-wide">Demo coming soon</p>
                <p className="text-white/30 text-sm mt-2">We're putting the finishing touches on our walkthrough video.</p>
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
