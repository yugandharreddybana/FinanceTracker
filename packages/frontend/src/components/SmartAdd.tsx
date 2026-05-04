import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Sparkles, X, Send, Camera, FileText, Loader2, Mic, MicOff, Keyboard, Check, Pencil, Trash2 } from 'lucide-react';
import { cn, safeStorage } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import DeleteModal from './DeleteModal';

const COACHMARK_KEY = 'yugi_smartadd_seen';
const intentLabel = (r: any) => {
  if (r.intent === 'TRANSACTION') {
    const sym = (r.currency === 'EUR' ? '€' : r.currency === 'USD' ? '$' : r.currency === 'GBP' ? '£' : r.currency === 'INR' ? '₹' : (r.currency || ''));
    const amt = Math.abs(r.amount || 0);
    const acct = r.account ? ` · ${r.account}` : '';
    const t = r.type ? ` · ${r.type}` : '';
    return `${r.merchant || r.name || 'Unknown'} · ${sym}${amt}${acct}${t}`;
  }
  if (r.intent === 'SAVINGS_GOAL') return `Goal: ${r.name || 'New Goal'} · target ${r.target || 0}`;
  if (r.intent === 'RECURRING_PAYMENT') return `Subscription: ${r.name || r.merchant || ''} · ${r.amount || 0}`;
  if (r.intent === 'LOAN') return `Loan: ${r.name || ''} · ${r.totalAmount || 0}`;
  if (r.intent === 'SAVINGS_TRANSFER') return `Transfer ${r.amount || 0} → ${r.goalId || 'goal'}`;
  return r.intent || 'Entry';
};

export const SmartAdd: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [naturalInput, setNaturalInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorModal, setErrorModal] = useState<{isOpen: boolean, title: string, message: string, action?: 'mic' | 'accounts'}>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [analysisType, setAnalysisType] = useState<'text' | 'file'>('text');
  const [previewItems, setPreviewItems] = useState<any[] | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showCoachmark, setShowCoachmark] = useState<boolean>(() => !safeStorage.get(COACHMARK_KEY));
  const { addTransactions, previewSmartAdd, analyzeFile, setIsAddTransactionModalOpen } = useFinance();
  const recognitionRef = useRef<any>(null);
  const committedRef = useRef<string>('');

  useEffect(() => {
    if (isAdding && showCoachmark) {
      safeStorage.set(COACHMARK_KEY, '1');
      const t = setTimeout(() => setShowCoachmark(false), 4000);
      return () => clearTimeout(t);
    }
  }, [isAdding, showCoachmark]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsListening(false);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      stopListening();
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setErrorModal({
        isOpen: true,
        title: 'Speech Not Supported',
        message: 'Your current browser does not support the Web Speech API. Please try using a modern browser like Chrome or Edge.',
        action: 'mic',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    committedRef.current = naturalInput;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      recognitionRef.current = null;
      setIsListening(false);

      if (event.error === 'network') {
        speak("I'm having trouble connecting to the speech service. Please try again in a moment.");
      } else if (event.error === 'not-allowed') {
        setErrorModal({
          isOpen: true,
          title: 'Microphone Access Denied',
          message: 'Voice entry requires microphone access. Please click "Allow Access" below and then grant permission in your browser prompt.',
          action: 'mic',
        });
      } else if (event.error === 'no-speech' || event.error === 'aborted') {
        // ignore
      } else {
        speak("I encountered an error with speech recognition. Please try typing your entry.");
      }
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalChunk) {
        const trimmed = finalChunk.trim();
        const stopCmd = /\b(stop listening|that'?s all|submit now|process entry)\b/i.test(trimmed);
        const cleaned = trimmed.replace(/\b(stop listening|that'?s all|submit now|process entry)\b/gi, '').trim();
        committedRef.current = [committedRef.current, cleaned].filter(Boolean).join('; ');
        setNaturalInput(committedRef.current);
        if (stopCmd) {
          stopListening();
          setTimeout(() => handleSubmit(committedRef.current, false), 300);
        }
      } else if (interim) {
        setNaturalInput([committedRef.current, interim].filter(Boolean).join(' '));
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSubmit = async (overrideInput?: string, silent: boolean = true) => {
    const inputToProcess = overrideInput || naturalInput;
    if (!inputToProcess.trim() || isAnalyzing) return;

    setAnalysisType('text');
    setIsAnalyzing(true);
    try {
      const results = await previewSmartAdd(inputToProcess);
      if (results && results.length > 0) {
        await addTransactions(results);
        if (!silent) speak(`Added ${results.length} ${results.length === 1 ? 'entry' : 'entries'} automatically.`);
        setNaturalInput('');
        setPreviewItems(null);
        setIsAdding(false);
      } else {
        if (!silent) speak(`No entries parsed.`);
      }
    } catch (error: any) {
      handleSubmitError(error, silent);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmPreview = async () => {
    if (!previewItems || previewItems.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      await addTransactions(previewItems);
      speak("Transactions added.");
      setNaturalInput('');
      setPreviewItems(null);
      setIsAdding(false);
    } catch (error: any) {
      handleSubmitError(error, false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitError = (error: any, silent: boolean) => {
    try {
      const code = error?.code;
      if (code === 'NO_ACCOUNTS' || code === 'NO_PRIMARY') {
        setErrorModal({
          isOpen: true,
          title: code === 'NO_ACCOUNTS' ? 'Add a Bank Account' : 'Set a Primary Bank Account',
          message: error?.message || 'A primary bank account is required so we know where to file transactions when none is mentioned.',
          action: 'accounts',
        });
        if (!silent) speak(code === 'NO_ACCOUNTS' ? "Please add a bank account first." : "Please set a primary bank account first.");
      } else if (!silent) {
        speak("I encountered an error processing your transactions.");
      }
    } catch {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'bill' | 'statement') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisType('file');
    setIsAnalyzing(true);
    try {
      await analyzeFile(file, type);
      setIsAdding(false);
    } catch (error: any) {
      console.error("Failed to analyze file:", error);
      const code = error?.code;
      if (code === 'NO_ACCOUNTS' || code === 'NO_PRIMARY') {
        setErrorModal({
          isOpen: true,
          title: code === 'NO_ACCOUNTS' ? 'Add a Bank Account' : 'Set a Primary Bank Account',
          message: error?.message || 'A primary bank account is required.',
          action: 'accounts',
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openManualEntry = () => {
    setIsAdding(false);
    setActiveTab('transactions');
    setIsAddTransactionModalOpen(true);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[200]">
      <AnimatePresence>
        {isAdding && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[-1]"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
              className="absolute bottom-24 right-0 w-[450px] glass-card p-8 shadow-[0_32px_128px_rgba(0,0,0,0.8)] border-accent/30 bg-card/90 backdrop-blur-3xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center violet-glow border border-accent/30">
                    <Sparkles className="w-6 h-6 text-accent animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold tracking-tight">Neural Smart Add</h4>
                    <p className="text-[10px] text-accent font-bold uppercase tracking-[0.2em]">Multi-entry enabled</p>
                  </div>
                </div>
                <button 
                  title="Close"
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/20 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative mb-8">
                <textarea
                  autoFocus
                  disabled={isAnalyzing}
                  placeholder="Coffee €5 at Starbucks using HSBC; Uber $12 on Chase Amex; Salary ₹80000 to HDFC Savings..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-base outline-none focus:border-accent/50 transition-all resize-none h-40 placeholder:text-white/10 font-medium leading-relaxed disabled:opacity-50"
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-accent animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-accent">
                      {analysisType === 'file' ? 'AI is analyzing your document...' : 'AI is parsing your entry...'}
                    </p>
                  </div>
                )}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  <span>⌘K · ⌘ + Enter to send</span>
                </div>
              </div>

              {previewItems && previewItems.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-accent/5 border border-accent/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Review {previewItems.length} {previewItems.length === 1 ? 'entry' : 'entries'}</p>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {previewItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                        {editingIdx === idx ? (
                          <input
                            autoFocus
                            type="text"
                            defaultValue={item.merchant || item.name || ''}
                            onBlur={(e) => {
                              setPreviewItems(prev => prev ? prev.map((it, i) => i === idx ? { ...it, merchant: e.target.value, name: e.target.value } : it) : prev);
                              setEditingIdx(null);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingIdx(null); }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-accent/50"
                          />
                        ) : (
                          <span className="flex-1 text-xs text-white/80 truncate">{intentLabel(item)}</span>
                        )}
                        <button title="Edit" onClick={() => setEditingIdx(editingIdx === idx ? null : idx)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button title="Remove" onClick={() => setPreviewItems(prev => prev ? prev.filter((_, i) => i !== idx) : prev)} className="p-1 rounded-lg hover:bg-negative/10 text-white/40 hover:text-negative">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setPreviewItems(null); setEditingIdx(null); }}
                      disabled={isAnalyzing}
                      className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10"
                    >Back</button>
                    <button
                      onClick={handleConfirmPreview}
                      disabled={isAnalyzing || !previewItems.length}
                      className="flex-[2] py-3 rounded-xl bg-positive text-black text-[10px] font-bold uppercase tracking-widest hover:bg-positive/80 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Confirm & Add
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-8">
                <label className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-accent/10 hover:border-accent/30 transition-all cursor-pointer group/upload">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bill')} disabled={isAnalyzing} />
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover/upload:scale-110 transition-transform">
                    <Camera className="w-5 h-5 text-accent" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Scan Bill</p>
                    <p className="text-[8px] text-white/20 uppercase font-bold mt-1">Receipts & Invoices</p>
                  </div>
                </label>

                <label className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-positive/10 hover:border-positive/30 transition-all cursor-pointer group/upload">
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'statement')} disabled={isAnalyzing} />
                  <div className="w-10 h-10 rounded-xl bg-positive/10 flex items-center justify-center group-hover/upload:scale-110 transition-transform">
                    <FileText className="w-5 h-5 text-positive" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Bank Statement</p>
                    <p className="text-[8px] text-white/20 uppercase font-bold mt-1">PDF or Image</p>
                  </div>
                </label>

                <button 
                  onClick={openManualEntry}
                  disabled={isAnalyzing}
                  className="col-span-2 flex items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group/manual"
                >
                  <Keyboard className="w-4 h-4 text-white/40 group-hover/manual:text-white transition-colors" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover/manual:text-white transition-colors">Switch to Manual Entry</span>
                </button>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/5 text-white/40 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={startListening}
                  disabled={isAnalyzing}
                  className={cn(
                    "w-14 rounded-2xl transition-all border flex items-center justify-center",
                    isListening 
                      ? "bg-negative/20 border-negative/30 text-negative animate-pulse" 
                      : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                  )}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => handleSubmit()}
                  disabled={!naturalInput.trim() || isAnalyzing}
                  className="flex-[2] py-4 rounded-2xl bg-accent text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-accent/80 transition-all shadow-lg violet-glow flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <span>Process Entry</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DeleteModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          const action = errorModal.action;
          setErrorModal(prev => ({ ...prev, isOpen: false }));
          if (errorModal.title === 'Microphone Access Denied') {
            setTimeout(startListening, 300);
          } else if (action === 'accounts') {
            setIsAdding(false);
            setActiveTab('accounts');
          }
        }}
        title={errorModal.title}
        description={errorModal.message}
        confirmLabel={
          errorModal.action === 'accounts' ? 'Go to Bank Accounts'
            : errorModal.title === 'Microphone Access Denied' ? 'Allow Access'
            : 'Understood'
        }
        cancelLabel={
          errorModal.action === 'accounts' ? 'Cancel'
            : errorModal.title === 'Microphone Access Denied' ? 'Cancel'
            : ''
        }
        isDestructive={false}
      />


      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setShowCoachmark(false); setIsAdding(!isAdding); }}
        className={cn(
          "w-20 h-20 rounded-3xl flex items-center justify-center shadow-[0_32px_64px_rgba(0,0,0,0.6)] transition-all duration-500 relative group",
          isAdding ? "bg-card border border-white/10 rotate-45" : "bg-accent violet-glow"
        )}
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
        <Plus className={cn("w-10 h-10 transition-transform duration-500", isAdding ? "text-white/40" : "text-white")} />
      </motion.button>
    </div>
  );
};
