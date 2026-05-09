import { useState } from 'react';
import { cn } from '../lib/utils';
import { chatWithOracle, isAIAvailable } from '../lib/aiService';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, AlertTriangle, CheckCircle2, Lightbulb, Target, PiggyBank, Send, Bot, User, RefreshCw, Sparkles, X } from 'lucide-react';

interface Message { id: string; role: 'user' | 'assistant'; content: string; }

const INSIGHTS = [
  { id: '1', icon: Lightbulb, title: 'Cut Food Delivery Costs', desc: 'You spent ₹6,885 on food. Cooking 3x more per week saves ~₹3,500/month.', color: 'amber' },
  { id: '2', icon: CheckCircle2, title: 'Excellent Savings Rate!', desc: 'Your 35% savings rate beats the recommended 20%. Keep going! 🎉', color: 'emerald' },
  { id: '3', icon: AlertTriangle, title: 'Shopping Budget Warning', desc: 'You\'ve used 71% of shopping budget with half the month left.', color: 'rose' },
  { id: '4', icon: TrendingUp, title: 'Portfolio Growth', desc: 'At 12% returns, your portfolio could reach ₹18L in 5 years.', color: 'violet' },
  { id: '5', icon: PiggyBank, title: 'Emergency Fund', desc: '₹1,15,000 more to reach 6-month emergency coverage.', color: 'blue' },
  { id: '6', icon: Target, title: 'Tax Saving', desc: 'Invest ₹50K in ELSS to save ₹15,000 under Section 80C.', color: 'cyan' },
];

const RESPONSES: Record<string, string> = {
  default: "Hi! I'm **Yugi Oracle** 🧠\n\nI can help you with:\n• Spending analysis\n• Budget advice\n• Investment tips\n• Savings goals\n\nWhat would you like to know?",
  spend: "📊 **Your Top Spending:**\n\n1. Housing: ₹28,000 (35%)\n2. Groceries: ₹8,800 (11%)\n3. Shopping: ₹8,498 (11%)\n4. Food: ₹6,885 (9%)\n\n💡 **Tip:** Your food delivery is 40% of food spend. Try meal prep to save ₹3,500/month!",
  budget: "📋 **Budget Status:**\n\n✅ Transport: ₹3,650/₹6,000 (61%)\n✅ Utilities: ₹2,699/₹5,000 (54%)\n⚠️ Food: ₹6,885/₹10,000 (69%)\n⚠️ Shopping: ₹8,498/₹12,000 (71%)\n🔴 Housing: ₹28,000/₹30,000 (93%)\n\nOverall you're at 67% — on track! 🎯",
  invest: "📈 **Portfolio Summary:**\n\nTotal: ₹6,80,000+ invested\nReturns: +11.9% overall\nBest: Reliance (+22.9%)\n\n💡 Increase SIP by ₹3,000/month to add ₹12L+ in 10 years!",
  save: "🎯 **Goal Progress:**\n\n🛡️ Emergency Fund: 77% ✨\n💻 MacBook Pro: 70%\n🏖️ Goa Vacation: 65%\n🚗 Dream Car: 40%\n🏠 Home: 24%\n\nVacation goal needs ₹9,333/mo to meet deadline!",
};

interface AIInsightsPageProps {
  compact?: boolean;
  onClose?: () => void;
}

export function AIInsightsPage({ compact, onClose }: AIInsightsPageProps = {}) {
  const { transactions, budgets, savingsGoals, investments, loans, getMonthlyIncome, getMonthlyExpenses, getNetWorth } = useFinance();
  const [messages, setMessages] = useState<Message[]>([{ id: '0', role: 'assistant', content: isAIAvailable()
    ? "Hi! I'm **Yugi Oracle** 🧠 — powered by real AI.\n\nI can analyze your finances, give advice, and answer anything. What would you like to know?"
    : RESPONSES.default }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const aiReady = isAIAvailable();

  // Build financial context for AI
  const buildContext = () => {
    const inc = getMonthlyIncome();
    const exp = getMonthlyExpenses();
    const nw = getNetWorth();
    const topCats = transactions.filter(t=>t.type==='expense').reduce((a,t)=>{a[t.category]=(a[t.category]||0)+t.amount;return a;},{} as Record<string,number>);
    const budgetSummary = budgets.map(b => `${b.category}: ${formatCurrency(b.spent)}/${formatCurrency(b.limit)} (${Math.round(b.spent/b.limit*100)}%)`).join(', ');
    const goalSummary = savingsGoals.map(g => `${g.name}: ${formatCurrency(g.current)}/${formatCurrency(g.target)}`).join(', ');
    return `Monthly Income: ${formatCurrency(inc)}, Expenses: ${formatCurrency(exp)}, Net Worth: ${formatCurrency(nw)}\nBudgets: ${budgetSummary}\nGoals: ${goalSummary}\nTop spending: ${Object.entries(topCats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}: ${formatCurrency(v)}`).join(', ')}\nInvestments: ${investments.length} holdings, Loans: ${loans.length} active`;
  };

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    const currentInput = input;
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const ctx = buildContext();
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const resp = await chatWithOracle(currentInput, ctx, history);
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: 'assistant', content: resp }]);
    } catch {
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
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
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-3 p-5 border-b border-slate-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl animated-gradient"><Bot className="h-5 w-5 text-white" /></div>
          <div><h3 className="font-bold text-slate-900">Yugi Oracle</h3><p className="text-xs text-slate-400">{aiReady ? 'Powered by AI ✨' : 'Add API key in Settings'}</p></div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[440px]">
          <AnimatePresence>
            {messages.map(m => (
              <div key={m.id} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl', m.role === 'assistant' ? 'animated-gradient' : 'bg-slate-200')}>
                  {m.role === 'assistant' ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-slate-600" />}
                </div>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  m.role === 'assistant' ? 'bg-slate-50 text-slate-700' : 'bg-violet-600 text-white')}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl animated-gradient"><Bot className="h-4 w-4 text-white" /></div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 flex items-center gap-1.5">
                {[0, 1, 2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-50">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about your finances..."
              className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:border-violet-400 focus:bg-white focus:outline-none transition-all" />
            <button onClick={send} disabled={!input.trim() || loading}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-violet-600 text-white disabled:bg-slate-200 shadow-lg shadow-violet-200">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div><h1 className="text-2xl md:text-3xl font-black text-slate-900">AI Insights</h1><p className="text-slate-400 font-medium">Your personal finance AI</p></div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
        </motion.button>
      </motion.div>

      {/* Health Score */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Financial Health', value: '78/100', emoji: '🏆', gradient: 'from-violet-500 to-purple-600' },
          { label: 'Savings Rate', value: '35.2%', emoji: '📈', gradient: 'from-emerald-500 to-teal-600' },
          { label: 'Goals On Track', value: '4/5', emoji: '🎯', gradient: 'from-blue-500 to-cyan-600' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-6 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <span className="text-2xl">{s.emoji}</span>
            <p className="text-sm text-white/70 font-medium mt-2">{s.label}</p>
            <p className="text-3xl font-black mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-3xl bg-white shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-slate-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl animated-gradient"><Bot className="h-5 w-5 text-white" /></div>
            <div><h3 className="font-bold text-slate-900">Yugi Oracle</h3><p className="text-xs text-slate-400">{aiReady ? 'Powered by AI ✨' : 'Add API key in Settings for real AI'}</p></div>
            <span className={cn("ml-auto flex items-center gap-1.5 text-xs font-semibold", aiReady ? "text-violet-600" : "text-emerald-600")}>
              {aiReady ? <><Sparkles className="h-3 w-3" />AI Active</> : <><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />Online</>}
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
                    m.role === 'assistant' ? 'bg-slate-50 text-slate-700' : 'bg-violet-600 text-white')}>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl animated-gradient"><Bot className="h-4 w-4 text-white" /></div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 flex items-center gap-1.5">
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
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={send} disabled={!input.trim() || loading}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-violet-600 text-white disabled:bg-slate-200 shadow-lg shadow-violet-200">
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['My spending', 'Budget status', 'Investment tips', 'Savings goals'].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors">{s}</button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Insights */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Personalized Insights</h3>
          {INSIGHTS.map((insight, i) => {
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
