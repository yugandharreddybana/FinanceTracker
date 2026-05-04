PART A — BUG FIXES (12 changes)
A1 — Delete TopBar.tsx
packages/frontend/src/components/TopBar.tsx → DELETE ENTIRELY. It is imported nowhere.

A2 — Fix sessionStorage bug in api.ts
File: packages/frontend/src/services/api.ts

In getAuthHeaders():

ts
// FROM:
const token = sessionStorage.getItem('auth_token');
// TO:
const token = localStorage.getItem('auth_token');
Also add FamilyAccount to the types import at line 1:

ts
import { Transaction, BankAccount, Budget, Loan, SavingsGoal, RecurringPayment, IncomeSource, Investment, FamilyAccount } from '../types';
Add getFamily inside financeApi object (before closing };):

ts
getFamily: (familyId: string): Promise<FamilyAccount> =>
  apiFetch(`${MIDDLEWARE_BASE}/api/family/${familyId}`),
A3 — Create ErrorBoundary component (NEW FILE)
File: packages/frontend/src/components/ErrorBoundary.tsx

tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-background text-white flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md mx-auto p-8">
            <div className="w-20 h-20 rounded-3xl bg-negative/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-negative" />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter">Something went wrong</h1>
            <p className="text-white/40 text-sm leading-relaxed">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all mx-auto"
            >
              <RefreshCw className="w-4 h-4" /><span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
A4 — Wrap App with ErrorBoundary + notification persistence
File: packages/frontend/src/App.tsx

4a. Add import:

ts
import { ErrorBoundary } from './components/ErrorBoundary';
4b. Wrap default export:

tsx
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
4c. Replace notifications state init:

ts
// FROM:
const [notifications, setNotifications] = useState<AppNotification[]>([]);
// TO:
const [notifications, setNotifications] = useState<AppNotification[]>(() => {
  try { const s = localStorage.getItem('yugi_notifications'); return s ? JSON.parse(s) : []; }
  catch { return []; }
});
4d. Add persist effect directly below notifications state:

ts
useEffect(() => {
  localStorage.setItem('yugi_notifications', JSON.stringify(notifications.slice(0, 50)));
}, [notifications]);
4e. Fix cubic-bezier (Tailwind JIT can't parse the current one):

tsx
// FROM:
className="pl-[80px] min-h-screen relative z-10 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
// TO:
className="pl-[80px] min-h-screen relative z-10 transition-all duration-500 ease-in-out"
A5 — Create server family route (NEW FILE)
File: server/routes/family.ts

ts
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';

export const familyRouter = Router();

familyRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    res.json({
      id,
      name: 'Shared Family',
      members: [{ uid: (req as any).user?.userId || 'user-1', name: 'Admin', role: 'Admin' }],
      sharedBudgets: [],
      sharedAccounts: []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
A6 — Register family route in server/index.ts
File: server/index.ts

Add after existing imports:

ts
import { familyRouter } from './routes/family.js';
Add after app.use("/api/investment", investmentRouter);:

ts
app.use("/api/family", familyRouter);
A7 — Carbon footprint disclaimer
File: packages/frontend/src/components/CarbonFootprintPage.tsx

7a. Replace the subtitle <p>:

tsx
// FROM:
<p className="text-white/40">Environmental impact analysis of your spending</p>
// TO:
<p className="text-white/40">
  Estimated from spending categories — not actual activity data.{' '}
  <span className="text-yellow-400/60 text-xs font-bold uppercase tracking-widest">Indicative only</span>
</p>
7b. Add as the FIRST child inside the hero glass-card section (before any existing children):

tsx
<div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold w-fit">
  <Info className="w-3 h-3 shrink-0" />
  <span>Figures are estimates based on spend amounts, not actual emissions data (e.g. flight miles, fuel litres).</span>
</div>
A8 — Fix || -10 fallback corruption
Scope: Search ALL files in packages/frontend/src/ for || -10 and ?? -10.
Replace every instance with || 0 or ?? 0.

A9 — Real CSV export in ReportBuilderPage
File: packages/frontend/src/components/ReportBuilderPage.tsx

9a. Add destructure inside component (after existing useStates):

ts
const { transactions } = useFinance();
9b. Replace the Export button onClick entirely:

ts
onClick={() => {
  const rows: string[][] = [['Date','Merchant','Amount','Category','Type','Account','Currency']];
  transactions.forEach(t => rows.push([
    t.date, t.merchant, String(t.amount),
    t.category || '', t.type, t.account || '', t.currency || 'INR'
  ]));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `finance-report-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}}
9c. Change button label from Export PDF → Export CSV.

A10 — AI chat history persistence
File: packages/frontend/src/components/AIInsightsPage.tsx

Find the chat messages state. Replace with localStorage-backed init:

ts
const [messages, setMessages] = useState<ChatMessage[]>(() => {
  try { const s = localStorage.getItem('yugi_chat_history'); return s ? JSON.parse(s) : []; }
  catch { return []; }
});
Add persist effect directly below:

ts
useEffect(() => {
  localStorage.setItem('yugi_chat_history', JSON.stringify(messages.slice(0, 100)));
}, [messages]);
Add a "Clear History" button in the chat header area:

tsx
<button
  onClick={() => { setMessages([]); localStorage.removeItem('yugi_chat_history'); }}
  className="text-[10px] font-bold text-white/20 hover:text-negative transition-colors uppercase tracking-widest"
>
  Clear History
</button>
A11 — FamilyAccount type guard in types/index.ts
File: packages/frontend/src/types/index.ts

Verify this interface exists and is exported. If missing, add it:

ts
export interface FamilyAccount {
  id: string;
  name: string;
  members: { uid: string; name: string; role: 'Admin' | 'Member' | 'Viewer' }[];
  sharedBudgets: string[];
  sharedAccounts: string[];
}
A12 — Fix hardcoded currency symbol in ForecastingPage YAxis
File: packages/frontend/src/components/ForecastingPage.tsx

Find the YAxis tickFormatter:

tsx
// FROM:
tickFormatter={(val) => `${currentCurrency === 'INR' ? '₹' : '€'}${(val / 1000).toFixed(0)}k`}
// TO:
tickFormatter={(val) => {
  const sym = { INR: '₹', EUR: '€', USD: '$', GBP: '£' }[currentCurrency] ?? currentCurrency;
  return `${sym}${(val / 1000).toFixed(0)}k`;
}}
PART B — UNIMPLEMENTED FEATURES (6 features, fully detailed)
B1 — TaxEnginePage: Make tax metrics real (computed from actual transactions)
File: packages/frontend/src/components/TaxEnginePage.tsx

Problem: The 3 hero cards show hardcoded values: 12450, 3200, 18.4%. They must be computed from real transactions data.

Replace the 3 hardcoded hero cards with this logic at the top of the component (after existing state declarations):

ts
const income = transactions
  .filter(t => t.type === 'income')
  .reduce((sum, t) => sum + t.amount, 0);

const expenses = transactions
  .filter(t => t.type === 'expense')
  .reduce((sum, t) => sum + t.amount, 0);

// Estimated tax: 20% effective rate on income above basic threshold
const TAX_RATE = 0.20;
const BASIC_EXEMPTION = 50000;
const taxableIncome = Math.max(0, income - BASIC_EXEMPTION);
const estimatedTaxLiability = Math.round(taxableIncome * TAX_RATE);

// Potential savings: 15% of deductible categories (Housing, Health, Education)
const deductibleSpend = transactions
  .filter(t => t.type === 'expense' && ['Housing','Health','Education'].includes(t.category || ''))
  .reduce((sum, t) => sum + t.amount, 0);
const potentialSavings = Math.round(deductibleSpend * 0.15);

// Effective rate = tax / income
const effectiveRate = income > 0 ? ((estimatedTaxLiability / income) * 100).toFixed(1) : '0.0';
Then replace the 3 hardcoded values in the hero cards:

12450 → estimatedTaxLiability

3200 → potentialSavings

18.4% → ${effectiveRate}%

Also replace the hardcoded breakdown amounts with computed splits:

ts
const breakdown = [
  { label: 'Federal Income Tax', amount: Math.round(estimatedTaxLiability * 0.68), color: '#7C6EFA', percent: 68 },
  { label: 'State Income Tax', amount: Math.round(estimatedTaxLiability * 0.22), color: '#22D3A5', percent: 22 },
  { label: 'Social Security', amount: Math.round(estimatedTaxLiability * 0.10), color: '#F59E0B', percent: 10 },
];
Replace the hardcoded array [{ label: 'Federal..., amount: 8450 ... }] with {breakdown.map(...)}`.

Also fix the Q2 deadline amount (currently hardcoded 3112):

tsx
// Replace 3112 with:
{currencyService.formatCurrency(Math.round(estimatedTaxLiability / 4), currentCurrency)}
Also update exportTaxReport to use computed values:

ts
estimatedLiability: estimatedTaxLiability,
breakdown: breakdown.map(b => ({ label: b.label, amount: b.amount })),
B2 — ForecastingPage: Make Freedom Goal real + progress bar real
File: packages/frontend/src/components/ForecastingPage.tsx

Problem: "Financial Freedom" card has hardcoded Oct 2038, 15%, and 1,000,000. Must be computed from real data.

After existing variable declarations, add:

ts
const FREEDOM_TARGET = 1000000; // can be made configurable later

// Progress toward freedom target
const freedomProgress = currentNetWorth > 0
  ? Math.min(100, Math.round((currentNetWorth / FREEDOM_TARGET) * 100))
  : 0;

// Estimated months to reach freedom target using monthly savings
const remaining = Math.max(0, FREEDOM_TARGET - currentNetWorth);
const monthsToFreedom = monthlySavings > 0
  ? Math.ceil(remaining / monthlySavings)
  : null;

const freedomDate = monthsToFreedom !== null
  ? (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + monthsToFreedom);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    })()
  : 'Unknown';
Replace hardcoded values in the Financial Freedom card:

1000000 → FREEDOM_TARGET

"Oct 2038" → {freedomDate}

w-[15%] → style={{ width: \${freedomProgress}%` }}`

"15%" → {freedomProgress}%

Also fix Simulation Parameters sliders — they are static <div> bars. Replace with functional range inputs:

tsx
// Inflation Rate section — replace static div bar with:
const [inflationRate, setInflationRate] = useState(3.2);
const [marketReturn, setMarketReturn] = useState(8.5);

// In JSX, replace the two static .h-1.5 divs with:
<input
  type="range" min="0" max="10" step="0.1"
  value={inflationRate}
  onChange={(e) => setInflationRate(Number(e.target.value))}
  className="w-full accent-accent"
  aria-label="Inflation rate"
/>
// and:
<input
  type="range" min="0" max="20" step="0.1"
  value={marketReturn}
  onChange={(e) => setMarketReturn(Number(e.target.value))}
  className="w-full accent-positive"
  aria-label="Market return"
/>
Update the displayed labels: "3.2%" → {inflationRate.toFixed(1)}% and "8.5%" → {marketReturn.toFixed(1)}%.

B3 — HealthScorePage: Make "+2% vs last month" real
File: packages/frontend/src/components/HealthScorePage.tsx

Problem: Every vital card shows hardcoded +2% vs last month.

Add computed monthly delta. After const metrics = ... declaration, add:

ts
// Compare current month vs previous month transactions
const now = new Date();
const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
Import transactions from useFinance() (add to the existing destructure):

ts
const { healthMetricsByCurrency, transactions } = useFinance();
Add delta computation:

ts
const currentIncome = transactions
  .filter(t => t.type === 'income' && t.date?.startsWith(currentMonthStr))
  .reduce((s, t) => s + t.amount, 0);
const prevIncome = transactions
  .filter(t => t.type === 'income' && t.date?.startsWith(prevMonthStr))
  .reduce((s, t) => s + t.amount, 0);
const savingsDelta = prevIncome > 0
  ? ((currentIncome - prevIncome) / prevIncome * 100).toFixed(1)
  : null;
In the VITALS map, replace the hardcoded +2% vs last month span:

tsx
// FROM:
<div className="flex items-center gap-1 text-positive text-[10px] font-bold">
  <ArrowUp className="w-3 h-3" />
  <span>+2% vs last month</span>
</div>
// TO:
{savingsDelta !== null ? (
  <div className={cn("flex items-center gap-1 text-[10px] font-bold", Number(savingsDelta) >= 0 ? "text-positive" : "text-negative")}>
    {Number(savingsDelta) >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowUp className="w-3 h-3 rotate-180" />}
    <span>{Number(savingsDelta) >= 0 ? '+' : ''}{savingsDelta}% vs last month</span>
  </div>
) : (
  <span className="text-[10px] text-white/20 font-bold">No prior data</span>
)}
B4 — ReportBuilderPage: Render real chart data in widgets (not empty placeholder boxes)
File: packages/frontend/src/components/ReportBuilderPage.tsx

Problem: Every widget shows an empty dashed box with just an icon. Must render real data.

Add recharts import at top:

tsx
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, LineChart as RechartsLine, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
Add data computation inside the component (after const { transactions } = useFinance()):

ts
// Bar chart: monthly spend last 6 months
const monthlySpend = (() => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const total = transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(key))
      .reduce((s, t) => s + t.amount, 0);
    return { month: label, amount: total };
  });
})();

// Pie chart: category breakdown
const categoryMap: Record<string, number> = {};
transactions.filter(t => t.type === 'expense').forEach(t => {
  const cat = t.category || 'Other';
  categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
});
const categoryData = Object.entries(categoryMap)
  .sort((a, b) => b[1] - a[1]).slice(0, 6)
  .map(([name, value]) => ({ name, value }));

const CHART_COLORS = ['#7C6EFA','#22D3A5','#F43F5E','#F59E0B','#3B82F6','#8E9299'];
Replace the empty placeholder <div className="h-64 ..."> inside each widget with a switch:

tsx
<div className="h-64 w-full">
  {widget.type === 'bar' && (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthlySpend}>
        <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#0F0F19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
        <Bar dataKey="amount" fill="#7C6EFA" radius={[6,6,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )}
  {widget.type === 'pie' && categoryData.length > 0 && (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPie>
        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name} labelLine={false}>
          {categoryData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#0F0F19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
      </RechartsPie>
    </ResponsiveContainer>
  )}
  {widget.type === 'line' && (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLine data={monthlySpend}>
        <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#0F0F19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
        <Line type="monotone" dataKey="amount" stroke="#22D3A5" strokeWidth={3} dot={false} />
      </RechartsLine>
    </ResponsiveContainer>
  )}
  {widget.type === 'table' && (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-2 px-3 text-white/40 font-bold uppercase tracking-widest">Date</th>
            <th className="text-left py-2 px-3 text-white/40 font-bold uppercase tracking-widest">Merchant</th>
            <th className="text-left py-2 px-3 text-white/40 font-bold uppercase tracking-widest">Category</th>
            <th className="text-right py-2 px-3 text-white/40 font-bold uppercase tracking-widest">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.slice(0, 10).map(t => (
            <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="py-2 px-3 text-white/60">{t.date}</td>
              <td className="py-2 px-3 font-medium">{t.merchant}</td>
              <td className="py-2 px-3 text-white/40">{t.category || '—'}</td>
              <td className={cn("py-2 px-3 text-right font-mono font-bold", t.type === 'income' ? 'text-positive' : 'text-negative')}>
                {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
B5 — TaxEnginePage: Real "Learn How" expanded content (not duplicate description)
File: packages/frontend/src/components/TaxEnginePage.tsx

Problem: The expandedSuggestion accordion just repeats s.description — it must show action steps instead.

The TaxSuggestion type from aiService has a steps?: string[] field. Use it. Replace the expanded accordion content:

tsx
// FROM the expanded section:
<p className="text-xs text-white/60 leading-relaxed">{s.description}</p>
// TO:
{s.steps && s.steps.length > 0 ? (
  <ol className="space-y-2">
    {s.steps.map((step, si) => (
      <li key={si} className="flex items-start gap-3 text-xs text-white/60 leading-relaxed">
        <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold shrink-0 mt-0.5">{si + 1}</span>
        <span>{step}</span>
      </li>
    ))}
  </ol>
) : (
  <p className="text-xs text-white/60 leading-relaxed">{s.description}</p>
)}
Also check aiService.ts — the TaxSuggestion interface must include steps?: string[]. If missing, add it. The Gemini prompt for getTaxOptimizationSuggestions must be updated to return steps as an array of 3 action items per suggestion.

In server/routes/ai.ts (or wherever getTaxOptimizationSuggestions builds the Gemini prompt), update the schema/prompt to include steps:

text
Each suggestion must include a "steps" array of exactly 3 short actionable steps the user can take to implement this suggestion.
B6 — FamilyPage: Shareable invite code display
File: packages/frontend/src/components/FamilyPage.tsx

Problem: When a family is created, there is no way for other members to get the invite code to join. The joinFamily flow has an input for a code but the createFamily flow never shows one.

After handleDeleteFamily function, add:

ts
const [showInviteCode, setShowInviteCode] = useState(false);
const [codeCopied, setCodeCopied] = useState(false);

const inviteCode = familyAccount ? `FAM-${familyAccount.id.slice(-6).toUpperCase()}` : '';

const copyInviteCode = () => {
  navigator.clipboard.writeText(inviteCode);
  setCodeCopied(true);
  setTimeout(() => setCodeCopied(false), 2000);
};
In the family workspace header (when familyAccount exists), add this button next to "Invite Member":

tsx
<button
  onClick={() => setShowInviteCode(prev => !prev)}
  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
>
  <Globe className="w-4 h-4" />
  <span>Share Code</span>
</button>
Add the expandable invite code panel (below the header <div>, before the Invite Member Modal):

tsx
<AnimatePresence>
  {showInviteCode && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="glass-card p-8 border-accent/30 bg-accent/[0.02] flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Family Invite Code</p>
          <p className="text-3xl font-mono font-bold tracking-widest text-accent">{inviteCode}</p>
          <p className="text-xs text-white/30 mt-2">Share this code with family members so they can join your workspace.</p>
        </div>
        <button
          onClick={copyInviteCode}
          className={cn(
            "flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all",
            codeCopied
              ? "bg-positive/20 border border-positive/40 text-positive"
              : "bg-accent text-white hover:bg-accent/80 violet-glow"
          )}
        >
          {codeCopied ? <CheckCircle2 className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
          <span>{codeCopied ? 'Copied!' : 'Copy Code'}</span>
        </button>
      </div>
    </motion.div>
  )}
</AnimatePresence>
EXECUTION ORDER FOR CLAUDE
types/index.ts — verify/add FamilyAccount (A11)

server/routes/family.ts — create new (A5)

server/index.ts — register familyRouter (A6)

services/api.ts — sessionStorage fix + getFamily (A2)

ErrorBoundary.tsx — create new (A3)

App.tsx — ErrorBoundary + notification persistence + cubic-bezier (A4)

AIInsightsPage.tsx — chat history persistence (A10)

CarbonFootprintPage.tsx — disclaimer (A7)

ReportBuilderPage.tsx — CSV export + real charts (A9 + B4)

TaxEnginePage.tsx — real metrics + steps accordion (B1 + B5)

ForecastingPage.tsx — real freedom goal + sliders (B2 + A12)

HealthScorePage.tsx — real monthly delta (B3)

FamilyPage.tsx — invite code UI (B6)

TopBar.tsx — DELETE (A1)

Global search || -10 → || 0 (A8)

