import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { parseReceiptText } from '../lib/transactionParser';
import type { ParsedAction, ActionType } from '../lib/transactionParser';
import { smartParse, isAIAvailable } from '../lib/aiService';
import { useFinance } from '../context/FinanceContext';
import { useToast } from './Toast';
import {
  X, Mic, MicOff, Upload, Sparkles, Plus, Trash2, Check,
  AlertCircle, CheckCircle2, FileText, Camera, Keyboard, Loader2, Volume2, Wand2,
  PieChart, Target, Briefcase, CreditCard, ArrowDownRight, ArrowUpRight,
  CalendarClock, TrendingUp, HelpCircle, MessageSquareWarning,
} from 'lucide-react';

const CATS_EXP = ['Food','Groceries','Shopping','Transport','Entertainment','Utilities','Health','Housing','Education','Insurance'];
const CATS_INC = ['Salary','Freelance','Investments'];

const ACTION_META: Record<ActionType, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  transaction:        { label: 'Transaction',      color: 'text-blue-600',    icon: CreditCard,    bg: 'bg-blue-50' },
  budget:             { label: 'Budget',           color: 'text-amber-600',   icon: PieChart,      bg: 'bg-amber-50' },
  savings_goal:       { label: 'Savings Goal',     color: 'text-violet-600',  icon: Target,        bg: 'bg-violet-50' },
  savings_contribute: { label: 'Add to Goal',      color: 'text-emerald-600', icon: ArrowUpRight,  bg: 'bg-emerald-50' },
  loan:               { label: 'Loan',             color: 'text-rose-600',    icon: Briefcase,     bg: 'bg-rose-50' },
  recurring:          { label: 'Recurring',        color: 'text-orange-600',  icon: CalendarClock, bg: 'bg-orange-50' },
  investment:         { label: 'Investment',       color: 'text-cyan-600',    icon: TrendingUp,    bg: 'bg-cyan-50' },
};

type InputMode = 'text' | 'voice' | 'receipt';
interface Props { open: boolean; onClose: () => void; initialText?: string; }

export function SmartAddModal({ open, onClose, initialText = '' }: Props) {
  const { addManualTransaction, addBudget, addSavingsGoal, updateSavingsGoal, savingsGoals, addInvestment, addRecurringPayment, addLoan } = useFinance();
  const { toast } = useToast();
  const [mode, setMode] = useState<InputMode>('text');
  const [rawInput, setRawInput] = useState('');
  const [parsed, setParsed] = useState<ParsedAction[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successSummary, setSuccessSummary] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { if (open) { setStep('input'); setRawInput(initialText || ''); setParsed([]); setVoiceTranscript(''); setReceiptFile(null); setReceiptPreview(''); setAddedCount(0); setShowSuccess(false); setIsProcessing(false); setMode('text'); setSuccessSummary(''); } }, [open, initialText]);

  // Voice
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice not supported — use Chrome.'); return; }
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-IN';
    r.onresult = (ev: any) => { let f='',i2=''; for (let x=0;x<ev.results.length;x++) { if (ev.results[x].isFinal) f+=ev.results[x][0].transcript+' '; else i2+=ev.results[x][0].transcript; } setVoiceTranscript(f+i2); };
    r.onerror = () => setIsListening(false); r.onend = () => setIsListening(false);
    recognitionRef.current = r; r.start(); setIsListening(true);
  }, []);
  const stopListening = useCallback(() => { recognitionRef.current?.stop(); setIsListening(false); }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; setReceiptFile(f); if (f.type.startsWith('image/')) { const r = new FileReader(); r.onload = ev => setReceiptPreview(ev.target?.result as string); r.readAsDataURL(f); } else setReceiptPreview(''); };

  const [usedAI, setUsedAI] = useState(false);
  const aiReady = isAIAvailable();

  const processInput = async () => {
    setIsProcessing(true);
    let results: ParsedAction[] = [];
    let didUseAI = false;

    if (mode === 'receipt' && receiptFile) {
      const mock = ['Coffee Latte ₹250\nCroissant ₹180\nSandwich ₹320\nWater ₹40','Rice 5kg ₹450\nDal 1kg ₹160\nVegetables ₹280\nMilk 2L ₹96','Biryani x2 ₹600\nNaan x3 ₹120\nDal Makhani ₹350'];
      results = parseReceiptText(mock[Math.floor(Math.random()*mock.length)]);
    } else {
      const text = mode === 'voice' ? voiceTranscript : rawInput;
      const { actions, usedAI: ai } = await smartParse(text);
      results = actions;
      didUseAI = ai;
    }

    if (!results.length) results = [{ actionType:'transaction', description:'', amount:0, type:'expense', category:'Food', date:new Date().toISOString().split('T')[0], confidence:0.1, needsClarification:true, clarificationQuestion:'What would you like to do?', rawText:'' }];
    setParsed(results); setUsedAI(didUseAI); setStep('review'); setIsProcessing(false);
  };

  const updateItem = (i: number, field: string, value: any) => setParsed(p => p.map((t,idx) => idx===i ? {...t, [field]:value, needsClarification: false} : t));
  const removeItem = (i: number) => setParsed(p => p.filter((_,idx) => idx!==i));
  const addRow = () => setParsed(p => [...p, { actionType:'transaction', description:'', amount:0, type:'expense' as const, category:'Food', date:new Date().toISOString().split('T')[0], confidence:1, rawText:'' }]);

  const handleSubmitAll = () => {
    const counts: Record<string,number> = {};
    const inc = (k: string) => { counts[k] = (counts[k]||0)+1; };

    for (const a of parsed) {
      switch (a.actionType) {
        case 'transaction':
          if (a.amount > 0 && a.description.trim()) { addManualTransaction({ id: crypto.randomUUID(), merchant:a.description, amount:a.amount, type:a.type, category:a.category, date:a.date, status: 'confirmed' }); inc('transaction'); }
          break;
        case 'budget':
          if ((a.budgetLimit||a.amount) > 0) { addBudget({ id: crypto.randomUUID(), category:a.category, limit:a.budgetLimit||a.amount, spent:0, period:(a.budgetPeriod ? (a.budgetPeriod.charAt(0).toUpperCase() + a.budgetPeriod.slice(1)) : 'Monthly') as any, color:`hsl(${Math.random()*360},70%,50%)`, emoji: '📊' }); inc('budget'); }
          break;
        case 'savings_goal':
          addSavingsGoal({ id: crypto.randomUUID(), name:a.goalName||a.description||'Goal', target:a.goalTarget||a.amount||100000, current:0, deadline:a.goalDeadline||new Date(Date.now()+365*864e5).toISOString().split('T')[0], emoji:a.goalIcon||'🎯' }); inc('savings goal');
          break;
        case 'savings_contribute': {
          const name = (a.contributeTo||'').toLowerCase();
          const goal = savingsGoals.find(g => g.name.toLowerCase().includes(name));
          if (goal && a.amount > 0) { updateSavingsGoal(goal.id, { current: goal.current + a.amount }); inc('goal contribution'); }
          else if (a.amount > 0) { addManualTransaction({ id: crypto.randomUUID(), merchant:`Savings: ${a.contributeTo}`, amount:a.amount, type:'expense', category:'Savings', date:a.date, status: 'confirmed' }); inc('transaction'); }
          break;
        }
        case 'loan':
          if ((a.loanPrincipal||a.amount) > 0) {
            const now = new Date(); const end = new Date(now); end.setFullYear(end.getFullYear()+20);
            addLoan({ id: crypto.randomUUID(), name:a.loanName||'Loan', category:a.loanType||'personal', totalAmount:a.loanPrincipal||a.amount, remainingAmount:a.loanPrincipal||a.amount, interestRate:a.loanRate||8.5, monthlyEMI:a.loanEmi||0, startDate:now.toISOString().split('T')[0], endDate:end.toISOString().split('T')[0], tenureYears: 20, color: `hsl(${Math.random()*360},70%,50%)` }); inc('loan');
          }
          break;
        case 'recurring':
          if (a.amount > 0) {
            addRecurringPayment({ id: crypto.randomUUID(), name:a.description, amount:a.amount, category:a.category, frequency:(a.recurringFreq ? (a.recurringFreq.charAt(0).toUpperCase() + a.recurringFreq.slice(1)) : 'Monthly') as any, date:1, status:'Active' }); inc('recurring');
          }
          break;
        case 'investment':
          if (a.amount > 0) { addInvestment({ id: crypto.randomUUID(), name:a.investmentName||a.description, symbol:(a.investmentName||'INV').substring(0,6).toUpperCase(), type:(a.investmentType === 'stock' ? 'Stock' : a.investmentType === 'crypto' ? 'Crypto' : 'ETF'), quantity:a.investmentQty||1, averagePrice:a.amount, currentPrice:a.amount, lastUpdated:a.date, currency: 'INR' }); inc('investment'); }
          break;
      }
    }
    const total = Object.values(counts).reduce((a,b)=>a+b,0);
    setAddedCount(total);
    const summary = Object.entries(counts).map(([k,v])=>`${v} ${k}${v>1?'s':''}`).join(', ');
    setSuccessSummary(summary);
    setShowSuccess(true);
    toast('success', 'Actions saved!', summary);
    setTimeout(onClose, 2200);
  };

  if (!open) return null;
  const inputText = mode==='voice' ? voiceTranscript : rawInput;
  const canProcess = mode==='receipt' ? !!receiptFile : inputText.trim().length > 0;
  const hasClarifications = parsed.some(p => p.needsClarification);

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
        <motion.div initial={{scale:0.92,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.92,opacity:0,y:20}} transition={{type:'spring',damping:25,stiffness:300}}
          className="w-full max-w-2xl rounded-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[100vh] sm:max-h-[92vh] h-full sm:h-auto flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl animated-gradient"><Wand2 className="h-5 w-5 text-white" /></div>
              <div>
                <h2 className="text-lg font-black text-slate-900">{step==='input'?'Smart Add':showSuccess?'Done!':'Review & Confirm'}</h2>
                <p className="text-xs text-slate-400 font-medium">
                  {step==='input'
                    ? (aiReady ? '🤖 AI-powered — I\'ll understand anything you say' : 'Type, speak, or upload — add your API key in Settings for AI')
                    : showSuccess ? (successSummary||`${addedCount} items added`)
                    : hasClarifications ? '⚠️ Some items need your confirmation'
                    : `${parsed.length} action${parsed.length!==1?'s':''} detected${usedAI?' via AI ✨':''}`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div key="s" initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-10 w-10 text-emerald-500" /></div>
                  <p className="text-xl font-black text-slate-900">All Done!</p>
                  <p className="text-sm text-slate-400 text-center max-w-xs">{successSummary?`Added: ${successSummary}`:'Records updated'}</p>
                </motion.div>
              ) : step==='input' ? (
                <motion.div key="i" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="p-6 space-y-5">
                  {/* Mode Switcher */}
                  <div className="flex rounded-2xl bg-slate-100 p-1">
                    {([{key:'text' as const,icon:Keyboard,label:'Type'},{key:'voice' as const,icon:Volume2,label:'Voice'},{key:'receipt' as const,icon:Camera,label:'Receipt'}]).map(m=>(
                      <button key={m.key} onClick={()=>setMode(m.key)} className={cn('flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all',mode===m.key?'bg-white text-slate-900 shadow-md':'text-slate-400 hover:text-slate-600')}><m.icon className="h-4 w-4" />{m.label}</button>
                    ))}
                  </div>
                  {/* Text */}
                  {mode==='text' && (<div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold"><Sparkles className="h-3.5 w-3.5 text-violet-400" /><span>I understand transactions, budgets, goals, loans, recurring, investments</span></div>
                    <textarea value={rawInput} onChange={e=>setRawInput(e.target.value)}
                      placeholder={'Try anything:\n• "Spent ₹500 at Swiggy and ₹200 on coffee"\n• "Create a budget of ₹10000 for transport monthly"\n• "Save ₹12 lakhs for a new car by end of this year"\n• "Add ₹5000 to my emergency fund"\n• "Home loan 60 lakhs at 8.5% EMI ₹45000"\n• "Invest ₹10000 in Nifty 50 SIP"\n• "Netflix ₹649 recurring monthly"'}
                      rows={7} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium text-slate-800 placeholder:text-slate-300 resize-none focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all" autoFocus />
                    <div className="flex flex-wrap gap-2">
                      {['Spent ₹500 at Swiggy','Budget ₹10000 transport','Save for car ₹12 lakhs','Add ₹5000 to emergency fund','Netflix ₹649 recurring monthly','Invest ₹10000 in SIP'].map(ex=>(
                        <button key={ex} onClick={()=>setRawInput(ex)} className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors">{ex}</button>
                      ))}
                    </div>
                  </div>)}
                  {/* Voice */}
                  {mode==='voice' && (<div className="space-y-5">
                    <div className="flex flex-col items-center gap-5 py-4">
                      <motion.button onClick={isListening?stopListening:startListening} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                        className={cn('relative flex h-24 w-24 items-center justify-center rounded-full transition-all',isListening?'bg-rose-500 text-white shadow-xl shadow-rose-200':'bg-emerald-500 text-white shadow-xl shadow-emerald-200 hover:bg-emerald-600')}>
                        {isListening && <motion.div animate={{scale:[1,1.4,1]}} transition={{duration:1.5,repeat:Infinity}} className="absolute inset-0 rounded-full bg-rose-400/30" />}
                        {isListening?<MicOff className="h-8 w-8 relative z-10" />:<Mic className="h-8 w-8" />}
                      </motion.button>
                      <p className="font-bold text-slate-800">{isListening?'Listening... Tap to stop':'Tap to start speaking'}</p>
                      <p className="text-xs text-slate-400">Say anything — I\'ll figure out what you mean</p>
                    </div>
                    {voiceTranscript && <div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2 mb-2 text-xs text-slate-400 font-semibold"><Volume2 className="h-3.5 w-3.5" />Transcript</div><p className="text-sm text-slate-700 font-medium">{voiceTranscript}</p></div>}
                  </div>)}
                  {/* Receipt */}
                  {mode==='receipt' && (<div className="space-y-4">
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt" onChange={handleFileUpload} className="hidden" />
                    {!receiptFile ? (
                      <button onClick={()=>fileInputRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group">
                        <div className="flex flex-col items-center gap-3"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 group-hover:bg-emerald-100 transition-colors"><Upload className="h-7 w-7 text-slate-400 group-hover:text-emerald-500" /></div><div><p className="font-bold text-slate-600 group-hover:text-emerald-700">Upload Receipt</p><p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF</p></div></div>
                      </button>
                    ) : (
                      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-5"><div className="flex items-start gap-4">
                        {receiptPreview?<img src={receiptPreview} alt="" className="h-32 w-24 rounded-xl object-cover border" />:<div className="flex h-32 w-24 items-center justify-center rounded-xl bg-white border"><FileText className="h-8 w-8 text-slate-400" /></div>}
                        <div className="flex-1"><p className="font-bold text-slate-800">{receiptFile.name}</p><p className="text-xs text-slate-400 mt-1">{(receiptFile.size/1024).toFixed(1)} KB</p><div className="flex items-center gap-2 mt-3"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-xs font-semibold text-emerald-600">Ready</span></div><button onClick={()=>{setReceiptFile(null);setReceiptPreview('');}} className="mt-2 text-xs font-semibold text-rose-500">Remove</button></div>
                      </div></div>
                    )}
                  </div>)}
                </motion.div>
              ) : (
                /* ─── REVIEW ─── */
                <motion.div key="r" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><Sparkles className="h-3.5 w-3.5 text-violet-400" />Edit anything • Change action types • I'll learn</div>
                    <button onClick={addRow} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"><Plus className="h-3.5 w-3.5" />Add Row</button>
                  </div>

                  <div className="space-y-3">
                    {parsed.map((item, i) => {
                      const meta = ACTION_META[item.actionType];
                      const Icon = meta.icon;
                      return (
                        <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                          className={cn('rounded-2xl border p-4 transition-all group relative',
                            item.needsClarification ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 bg-white hover:shadow-md')}>

                          {/* Clarification banner */}
                          {item.needsClarification && (
                            <div className="flex items-center gap-2 mb-3 rounded-xl bg-amber-100/50 border border-amber-200 px-3 py-2">
                              <MessageSquareWarning className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              <span className="text-xs font-bold text-amber-700">{item.clarificationQuestion || 'Please review this item'}</span>
                            </div>
                          )}

                          {/* Badge row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg',meta.bg,meta.color)}><Icon className="h-3 w-3" />{meta.label}</span>
                              <select value={item.actionType} onChange={e=>updateItem(i,'actionType',e.target.value)} className="text-[10px] font-bold text-slate-400 bg-transparent border-none focus:outline-none cursor-pointer">
                                <option value="transaction">→ Transaction</option><option value="budget">→ Budget</option><option value="savings_goal">→ Savings Goal</option><option value="savings_contribute">→ Add to Goal</option><option value="loan">→ Loan</option><option value="recurring">→ Recurring</option><option value="investment">→ Investment</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.needsClarification ? <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full"><HelpCircle className="h-3 w-3" />Needs Input</span>
                                : item.confidence>0.7 ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" />Confident</span>
                                : <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full"><AlertCircle className="h-3 w-3" />Review</span>}
                              <button onClick={()=>removeItem(i)} className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>

                          {/* ── TRANSACTION ── */}
                          {item.actionType==='transaction' && (<div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-3">
                            <div className="col-span-1 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label><button onClick={()=>updateItem(i,'type',item.type==='expense'?'income':'expense')} className={cn('w-full rounded-xl py-2 text-xs font-bold',item.type==='expense'?'bg-rose-100 text-rose-600':'bg-emerald-100 text-emerald-600')}>{item.type==='expense'?<span className="flex items-center justify-center gap-1"><ArrowDownRight className="h-3 w-3" />Exp</span>:<span className="flex items-center justify-center gap-1"><ArrowUpRight className="h-3 w-3" />Inc</span>}</button></div>
                            <div className="col-span-1 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount ₹</label><input type="number" value={item.amount||''} onChange={e=>updateItem(i,'amount',parseFloat(e.target.value)||0)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-bold focus:border-emerald-300 focus:outline-none" min={0} /></div>
                            <div className="col-span-2 sm:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description</label><input value={item.description} onChange={e=>updateItem(i,'description',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-medium focus:border-emerald-300 focus:bg-white focus:outline-none" /></div>
                            <div className="col-span-1 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Category</label><select value={item.category} onChange={e=>updateItem(i,'category',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-2 text-sm font-medium appearance-none focus:outline-none">{(item.type==='expense'?CATS_EXP:CATS_INC).map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                            <div className="col-span-1 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date</label><input type="date" value={item.date} onChange={e=>updateItem(i,'date',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-2 text-sm font-medium focus:outline-none" /></div>
                          </div>)}

                          {/* ── BUDGET ── */}
                          {item.actionType==='budget' && (<div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Category</label><select value={item.category} onChange={e=>updateItem(i,'category',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm font-medium appearance-none focus:outline-none">{CATS_EXP.map(c=><option key={c}value={c}>{c}</option>)}</select></div>
                              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Limit ₹</label><input type="number" value={item.budgetLimit||item.amount||''} onChange={e=>{updateItem(i,'budgetLimit',parseFloat(e.target.value)||0);updateItem(i,'amount',parseFloat(e.target.value)||0);}} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm font-bold focus:outline-none" min={0} /></div>
                              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Period</label><select value={item.budgetPeriod||'monthly'} onChange={e=>updateItem(i,'budgetPeriod',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm font-medium appearance-none focus:outline-none"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5">
                              <button onClick={()=>updateItem(i,'isRecurring',!item.isRecurring)} className={cn('relative h-5 w-9 rounded-full transition-colors flex-shrink-0',item.isRecurring?'bg-amber-500':'bg-slate-200')}><span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',item.isRecurring?'left-[18px]':'left-0.5')} /></button>
                              <span className="text-xs font-bold text-amber-700">{item.isRecurring?`Recurring ${item.budgetPeriod||'monthly'}`:'One-time budget'}</span>
                            </div>
                          </div>)}

                          {/* ── SAVINGS GOAL ── */}
                          {item.actionType==='savings_goal' && (<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            <div className="col-span-1 sm:col-span-1 flex gap-2"><div className="w-12"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Icon</label><input value={item.goalIcon||'🎯'} onChange={e=>updateItem(i,'goalIcon',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-1 py-2 text-center text-lg focus:outline-none" maxLength={2} /></div><div className="flex-1 sm:hidden"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Target ₹</label><input type="number" value={item.goalTarget||''} onChange={e=>updateItem(i,'goalTarget',parseFloat(e.target.value)||0)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-bold focus:outline-none" min={0} /></div></div>
                            <div className="col-span-1 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Goal Name</label><input value={item.goalName||''} onChange={e=>updateItem(i,'goalName',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-medium focus:outline-none" placeholder="e.g. New Car" /></div>
                            <div className="hidden sm:block col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Target ₹</label><input type="number" value={item.goalTarget||''} onChange={e=>updateItem(i,'goalTarget',parseFloat(e.target.value)||0)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-bold focus:outline-none" min={0} /></div>
                            <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Deadline</label><input type="date" value={item.goalDeadline||''} onChange={e=>updateItem(i,'goalDeadline',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-2 text-sm font-medium focus:outline-none" /></div>
                          </div>)}

                          {/* ── ADD TO GOAL ── */}
                          {item.actionType==='savings_contribute' && (<div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Goal</label><select value={item.contributeTo||''} onChange={e=>updateItem(i,'contributeTo',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm font-medium appearance-none focus:outline-none"><option value="">Select goal</option>{savingsGoals.map(g=><option key={g.id} value={g.name}>{g.emoji} {g.name}</option>)}</select></div>
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount ₹</label><input type="number" value={item.amount||''} onChange={e=>updateItem(i,'amount',parseFloat(e.target.value)||0)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm font-bold focus:outline-none" min={0} /></div>
                          </div>)}

                          {/* ── LOAN ── */}
                          {item.actionType==='loan' && (<div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                            <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Name</label><input value={item.loanName||''} onChange={e=>updateItem(i,'loanName',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-medium focus:outline-none" /></div>
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label><select value={item.loanType||'personal'} onChange={e=>updateItem(i,'loanType',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-2 text-sm font-medium appearance-none focus:outline-none"><option value="home">Home</option><option value="car">Car</option><option value="personal">Personal</option><option value="education">Education</option></select></div>
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Principal ₹</label><input type="number" value={item.loanPrincipal||item.amount||''} onChange={e=>{updateItem(i,'loanPrincipal',parseFloat(e.target.value)||0);updateItem(i,'amount',parseFloat(e.target.value)||0);}} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-bold focus:outline-none" min={0} /></div>
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Rate %</label><input type="number" value={item.loanRate||''} onChange={e=>updateItem(i,'loanRate',parseFloat(e.target.value)||0)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-medium focus:outline-none" step={0.1} /></div>
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">EMI ₹</label><input type="number" value={item.loanEmi||''} onChange={e=>updateItem(i,'loanEmi',parseFloat(e.target.value)||0)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-medium focus:outline-none" min={0} /></div>
                          </div>)}

                          {/* ── RECURRING ── */}
                          {item.actionType==='recurring' && (<div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label><button onClick={()=>updateItem(i,'type',item.type==='expense'?'income':'expense')} className={cn('w-full rounded-xl py-2 text-xs font-bold',item.type==='expense'?'bg-rose-100 text-rose-600':'bg-emerald-100 text-emerald-600')}>{item.type==='expense'?'Expense':'Income'}</button></div>
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount ₹</label><input type="number" value={item.amount||''} onChange={e=>updateItem(i,'amount',parseFloat(e.target.value)||0)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-bold focus:outline-none" min={0} /></div>
                            <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description</label><input value={item.description} onChange={e=>updateItem(i,'description',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-medium focus:outline-none" /></div>
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Category</label><select value={item.category} onChange={e=>updateItem(i,'category',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-2 text-sm font-medium appearance-none focus:outline-none">{(item.type==='expense'?CATS_EXP:CATS_INC).map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Frequency</label><select value={item.recurringFreq||'monthly'} onChange={e=>updateItem(i,'recurringFreq',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-medium appearance-none focus:outline-none"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>
                          </div>)}

                          {/* ── INVESTMENT ── */}
                          {item.actionType==='investment' && (<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Name</label><input value={item.investmentName||item.description||''} onChange={e=>updateItem(i,'investmentName',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-medium focus:outline-none" /></div>
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label><select value={item.investmentType||'mutual_fund'} onChange={e=>updateItem(i,'investmentType',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-2 text-sm font-medium appearance-none focus:outline-none"><option value="stock">Stock</option><option value="mutual_fund">Mutual Fund</option><option value="fd">FD</option><option value="gold">Gold</option><option value="crypto">Crypto</option></select></div>
                            <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount ₹</label><input type="number" value={item.amount||''} onChange={e=>updateItem(i,'amount',parseFloat(e.target.value)||0)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-bold focus:outline-none" min={0} /></div>
                            <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date</label><input type="date" value={item.date} onChange={e=>updateItem(i,'date',e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-2 text-sm font-medium focus:outline-none" /></div>
                          </div>)}

                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!showSuccess && (<div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
            {step==='review' && <button onClick={()=>setStep('input')} className="rounded-2xl border-2 border-slate-100 px-5 py-3 text-sm font-bold text-slate-500 hover:bg-white">← Back</button>}
            <div className="flex-1" />
            {step==='input' ? (
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={processInput} disabled={!canProcess||isProcessing}
                className="flex items-center gap-2 rounded-2xl animated-gradient px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-200/50 disabled:opacity-40 transition-all">
                {isProcessing?<><Loader2 className="h-4 w-4 animate-spin" />Understanding...</>:<><Sparkles className="h-4 w-4" />Understand & Parse</>}
              </motion.button>
            ) : (
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={handleSubmitAll}
                disabled={parsed.every(t=>t.amount<=0 && t.actionType!=='savings_goal')}
                className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-200/50 hover:bg-emerald-600 disabled:opacity-40 transition-all">
                <Check className="h-4 w-4" />Confirm & Save All
              </motion.button>
            )}
          </div>)}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
