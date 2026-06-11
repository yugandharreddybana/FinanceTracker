import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn, formatCurrency, resolveDashboardChartCurrency, transactionCurrency } from '../lib/utils';
import { isAIAvailable } from '../lib/aiService';
import { useFinance } from '../context/FinanceContext';
import { financeApi } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, AlertTriangle, CheckCircle2, Lightbulb, Target, PiggyBank, Send, Bot, User, RefreshCw, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { OracleFinanceContextPayload } from '../types';

function AssistantMarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900 dark:text-slate-50">{children}</strong>
        ),
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-4">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-4">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h3 className="mb-1 mt-2 text-base font-bold">{children}</h3>,
        h2: ({ children }) => <h3 className="mb-1 mt-2 text-base font-bold">{children}</h3>,
        h3: ({ children }) => <h3 className="mb-1 mt-2 text-base font-bold">{children}</h3>,
        code: ({ children }) => (
          <code className="rounded bg-slate-200/90 px-1 py-0.5 text-[0.85em] dark:bg-slate-800">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-950">{children}</pre>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-violet-600 underline underline-offset-2 dark:text-violet-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

interface Message { id: string; role: 'user' | 'assistant'; content: string; }

interface AIInsightsPageProps {
  compact?: boolean;
  onClose?: () => void;
}

export function AIInsightsPage({ compact, onClose }: AIInsightsPageProps = {}) {
  const {
    transactions,
    bankAccounts,
    budgets,
    savingsGoals,
    investments,
    loans,
    recurringPayments,
    incomeSources,
    netWorthByCurrency,
    customCategories,
    monthlyTrends,
    healthMetricsByCurrency,
    userProfile,
  } = useFinance();
  const [messages, setMessages] = useState<Message[]>([{ id: '0', role: 'assistant', content: "Hi! I'm **Yugi Oracle** — your AI finance assistant.\n\nI can analyze your finances, give advice, and answer anything. What would you like to know?" }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [remoteInsights, setRemoteInsights] = useState<{ id: string; title: string; desc: string; type: string }[]>([]);
  const aiReady = isAIAvailable();

  const oracleFinancePayload: OracleFinanceContextPayload = useMemo(
    () => ({
      budgets,
      savingsGoals,
      loans,
      recurringPayments,
      investments,
      incomeSources,
      netWorthByCurrency,
      healthMetricsByCurrency,
      preferences: userProfile.preferences,
      customCategories,
      monthlyTrends,
    }),
    [
      budgets,
      savingsGoals,
      loans,
      recurringPayments,
      investments,
      incomeSources,
      netWorthByCurrency,
      healthMetricsByCurrency,
      userProfile.preferences,
      customCategories,
      monthlyTrends,
    ]
  );

  const chartCcy = resolveDashboardChartCurrency(netWorthByCurrency);
  const nwMonth = netWorthByCurrency[chartCcy] || { income: 0, expenses: 0 };
  const currency = chartCcy;
  const hm = healthMetricsByCurrency[currency] ?? Object.values(healthMetricsByCurrency)[0];

  const healthCards = useMemo(() => {
    const inc = nwMonth.income;
    const exp = Math.abs(nwMonth.expenses);
    const srPct = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
    const onTrack = savingsGoals.filter((g) => g.target > 0 && g.current / g.target >= 0.35).length;
    const goalTotal = savingsGoals.length;
    const score = hm?.overallScore ?? 0;
    return [
      { label: 'Financial Health', value: `${score}/100`, emoji: '🏆', gradient: 'from-violet-500 to-purple-600' },
      { label: 'Savings Rate', value: `${srPct.toFixed(1)}%`, emoji: '📈', gradient: 'from-emerald-500 to-teal-600' },
      {
        label: 'Goals On Track',
        value: goalTotal ? `${onTrack}/${goalTotal}` : '—',
        emoji: '🎯',
        gradient: 'from-blue-500 to-cyan-600',
      },
    ];
  }, [savingsGoals, hm, nwMonth]);

  const localInsights = useMemo(() => {
    const inc = nwMonth.income;
    const exp = nwMonth.expenses;
    const sr = inc > 0 ? ((inc - exp) / inc * 100) : 0;
    const topCats = transactions
      .filter((t) => t.type === 'expense' && transactionCurrency(t, chartCcy) === chartCcy)
      .reduce((a, t) => {
        a[t.category] = (a[t.category] || 0) + Math.abs(t.amount);
        return a;
      }, {} as Record<string, number>);
    const sorted = Object.entries(topCats).sort((a, b) => b[1] - a[1]);
    const topCat = sorted[0];
    const overBudget = budgets.find(b => b.spent > b.limit * 0.7);

    const items: { id: string; icon: typeof Lightbulb; title: string; desc: string; color: string }[] = [];
    if (topCat) items.push({ id: 'l1', icon: Lightbulb, title: `Top Spending: ${topCat[0]}`, desc: `${formatCurrency(topCat[1], currency)} spent on ${topCat[0]} this month.`, color: 'amber' });
    if (sr >= 20) items.push({ id: 'l2', icon: CheckCircle2, title: 'Great Savings Rate!', desc: `Your ${sr.toFixed(0)}% savings rate beats the 20% benchmark.`, color: 'emerald' });
    else if (inc > 0) items.push({ id: 'l2', icon: Target, title: 'Savings Opportunity', desc: `Your savings rate is ${sr.toFixed(0)}%. Try to reach 20%.`, color: 'blue' });
    if (overBudget) items.push({ id: 'l3', icon: AlertTriangle, title: `${overBudget.category} Budget Alert`, desc: `${Math.round(overBudget.spent / overBudget.limit * 100)}% used (${formatCurrency(overBudget.spent, overBudget.currency || currency)} of ${formatCurrency(overBudget.limit, overBudget.currency || currency)}) — be mindful of overspending.`, color: 'rose' });
    if (investments.length > 0) items.push({ id: 'l4', icon: TrendingUp, title: 'Portfolio Active', desc: `${investments.length} investments tracked.`, color: 'violet' });
    if (loans.length > 0) items.push({ id: 'l6', icon: AlertTriangle, title: 'Debt Overview', desc: `${loans.length} active loan(s) — review payoff strategy in Loans.`, color: 'rose' });
    if (savingsGoals.length > 0) {
      const closest = savingsGoals.reduce((a, b) => (b.current / b.target) > (a.current / a.target) ? b : a);
      items.push({ id: 'l5', icon: PiggyBank, title: `Goal: ${closest.name}`, desc: `${Math.round(closest.current / closest.target * 100)}% complete — keep going!`, color: 'blue' });
    }
    if (items.length === 0) items.push({ id: 'l1', icon: Sparkles, title: 'Get Started', desc: 'Add transactions to unlock personalized insights.', color: 'cyan' });
    return items;
  }, [transactions, budgets, savingsGoals, investments, loans, chartCcy, currency, nwMonth]);

  const refreshRemoteInsights = useCallback(async () => {
    setRefreshing(true);
    try {
      const rows = await financeApi.getAIInsights(transactions.slice(0, 80), 'ALL');
      const mapped = Array.isArray(rows)
        ? rows.map((r: { id?: string; title?: string; description?: string; type?: string }, i: number) => ({
            id: r.id || `ai-${i}`,
            title: String(r.title || 'Insight'),
            desc: String(r.description || ''),
            type: String(r.type || 'TIP'),
          }))
        : [];
      setRemoteInsights(mapped);
    } catch {
      setRemoteInsights([]);
    } finally {
      setRefreshing(false);
    }
  }, [transactions]);

  useEffect(() => {
    refreshRemoteInsights();
  }, [transactions.length]);

  const iconForRemoteType = (t: string) => {
    switch (t) {
      case 'ALERT': return AlertTriangle;
      case 'WIN': return CheckCircle2;
      case 'TREND': return TrendingUp;
      default: return Sparkles;
    }
  };

  const colorForRemoteType = (t: string) => {
    switch (t) {
      case 'ALERT': return 'rose';
      case 'WIN': return 'emerald';
      case 'TREND': return 'violet';
      default: return 'blue';
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    const currentInput = input;
    const priorHistory = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(p => [...p, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      await financeApi.streamAIChat(
        currentInput,
        priorHistory,
        transactions.slice(0, 40),
        bankAccounts,
        (chunk) => {
          setMessages(p => p.map(m => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));
        },
        oracleFinancePayload
      );
    } catch {
      try {
        const result = await financeApi.oracleChat(currentInput, priorHistory);
        setMessages(p => p.map(m => (m.id === assistantId ? { ...m, content: result.content } : m)));
      } catch {
        setMessages(p => p.map(m => (m.id === assistantId ? { ...m, content: 'Sorry, something went wrong. Please try again.' } : m)));
      }
    }
    setLoading(false);
  };

  const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
    amber: { bg: 'bg-amber-50', text: 'text-amber-800', icon: 'text-amber-500', border: 'border-amber-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-800', icon: 'text-emerald-500', border: 'border-emerald-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-800', icon: 'text-rose-500', border: 'border-rose-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-800', icon: 'text-violet-500', border: 'border-violet-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', icon: 'text-blue-500', border: 'border-blue-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-800', icon: 'text-cyan-500', border: 'border-cyan-100' },
  };

  if (compact) {
    return (
      <div data-testid="page-insights-compact" className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-3 p-5 border-b border-slate-50 dark:border-slate-800 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl animated-gradient"><Bot className="h-5 w-5 text-white" /></div>
          <div><h3 className="font-bold text-slate-900 dark:text-slate-100">Yugi Oracle</h3><p className="text-xs text-slate-400">{aiReady ? 'Powered by AI ✨' : 'Server AI via NVIDIA NIM'}</p></div>
          <button type="button" onClick={onClose} aria-label="Close chat" className="ml-auto rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map(m => (
              <div key={m.id} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl', m.role === 'assistant' ? 'animated-gradient' : 'bg-slate-200')}>
                  {m.role === 'assistant' ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-slate-600" />}
                </div>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  m.role === 'assistant' ? 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200' : 'bg-violet-600 text-white')}>
                  {m.role === 'assistant' ? (
                    <AssistantMarkdownBody content={m.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              </div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl animated-gradient"><Bot className="h-4 w-4 text-white" /></div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 flex items-center gap-1.5 dark:bg-slate-900">
                {[0, 1, 2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-50 dark:border-slate-800 shrink-0">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about your finances..."
              className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-violet-400 focus:bg-white focus:outline-none transition-all" />
            <button type="button" onClick={send} disabled={!input.trim() || loading}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-violet-600 text-white disabled:bg-slate-200 shadow-lg shadow-violet-200">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-insights" className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div><h1 className="text-2xl md:text-3xl font-black text-slate-900">AI Insights</h1><p className="text-slate-400 font-medium">Your personal finance AI</p></div>
        <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => refreshRemoteInsights()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 disabled:opacity-60">
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} /> Refresh
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {healthCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-6 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <span className="text-2xl">{s.emoji}</span>
            <p className="text-sm text-white/70 font-medium mt-2">{s.label}</p>
            <p className="text-3xl font-black mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-3xl bg-white shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-slate-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl animated-gradient"><Bot className="h-5 w-5 text-white" /></div>
            <div><h3 className="font-bold text-slate-900">Yugi Oracle</h3><p className="text-xs text-slate-400">Streaming replies when available; tools via fallback.</p></div>
            <span className={cn("ml-auto flex items-center gap-1.5 text-xs font-semibold text-violet-600")}>
              <Sparkles className="h-3 w-3" />AI
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 max-h-[350px] sm:max-h-[400px] min-h-[250px] sm:min-h-[300px]">
            <AnimatePresence>
              {messages.map(m => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                  <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl', m.role === 'assistant' ? 'animated-gradient' : 'bg-slate-200')}>
                    {m.role === 'assistant' ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-slate-600" />}
                  </div>
                  <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    m.role === 'assistant' ? 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200' : 'bg-violet-600 text-white')}>
                    {m.role === 'assistant' ? (
                      <AssistantMarkdownBody content={m.content} />
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl animated-gradient"><Bot className="h-4 w-4 text-white" /></div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 flex items-center gap-1.5 dark:bg-slate-900">
                  {[0, 1, 2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-50">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about your finances..."
                className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-50 transition-all" />
              <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={send} disabled={!input.trim() || loading}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-violet-600 text-white disabled:bg-slate-200 shadow-lg shadow-violet-200">
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['My spending', 'Budget status', 'Investment tips', 'Savings goals'].map(s => (
                <button type="button" key={s} onClick={() => setInput(s)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors">{s}</button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Personalized Insights</h3>
          {remoteInsights.length === 0 && !refreshing && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
              <Sparkles className="mx-auto h-8 w-8 text-violet-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {transactions.length === 0 ? 'No AI insights yet' : 'AI engine returned no insights'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {transactions.length === 0
                  ? 'Add transactions to unlock personalized AI insight cards.'
                  : 'Try refreshing or add more recent transaction history for richer analysis.'}
              </p>
            </div>
          )}
          {remoteInsights.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">From AI engine</p>
              {remoteInsights.map((insight, i) => {
                const Icon = iconForRemoteType(insight.type);
                const colorKey = colorForRemoteType(insight.type);
                const c = colorMap[colorKey];
                return (
                  <motion.div key={insight.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                    whileHover={{ x: 4 }}
                    className={cn('rounded-2xl p-5 border transition-all cursor-default', c.bg, c.border)}>
                    <div className="flex gap-4">
                      <div className={cn('flex-shrink-0 mt-0.5', c.icon)}><Icon className="h-5 w-5" /></div>
                      <div>
                        <h4 className={cn('font-bold', c.text)}>{insight.title}</h4>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{insight.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">From your data</p>
          {localInsights.map((insight, i) => {
            const c = colorMap[insight.color];
            return (
              <motion.div key={insight.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                whileHover={{ x: 4 }}
                className={cn('rounded-2xl p-5 border transition-all cursor-default', c.bg, c.border)}>
                <div className="flex gap-4">
                  <div className={cn('flex-shrink-0 mt-0.5', c.icon)}><insight.icon className="h-5 w-5" /></div>
                  <div>
                    <h4 className={cn('font-bold', c.text)}>{insight.title}</h4>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{insight.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
