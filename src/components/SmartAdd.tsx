import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Sparkles, X, Send, Camera, FileText, Loader2, Mic, MicOff, Keyboard } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';

export const SmartAdd: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [naturalInput, setNaturalInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [analysisType, setAnalysisType] = useState<'text' | 'file'>('text');
  const { addTransactions, analyzeFile, setIsAddTransactionModalOpen } = useFinance();

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      if (event.error === 'network') {
        // Network error can sometimes be a transient issue with the speech service
        speak("I'm having trouble connecting to the speech service. Please try again in a moment.");
      } else if (event.error === 'not-allowed') {
        speak("Microphone access was denied. Please check your browser permissions.");
      } else if (event.error === 'no-speech') {
        // Ignore no-speech errors to avoid annoying the user
      } else {
        speak("I encountered an error with speech recognition. Please try typing your entry.");
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNaturalInput(prev => {
        const newValue = prev + (prev ? '; ' : '') + transcript;
        // If the transcript contains "process" or "done", auto-submit
        if (transcript.toLowerCase().includes('process') || transcript.toLowerCase().includes('done')) {
          setTimeout(() => handleSubmit(newValue.replace(/process|done/gi, '').trim(), false), 500);
        }
        return newValue;
      });
    };

    recognition.start();
  };

  const handleSubmit = async (overrideInput?: string, silent: boolean = true) => {
    const inputToProcess = overrideInput || naturalInput;
    if (!inputToProcess.trim() || isAnalyzing) return;
    
    setAnalysisType('text');
    setIsAnalyzing(true);
    try {
      await addTransactions(inputToProcess);
      if (!silent) speak("Transactions processed successfully.");
      setNaturalInput('');
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to add transactions:", error);
      if (!silent) speak("I encountered an error processing your transactions.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'bill' | 'statement') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisType('file');
    setIsAnalyzing(true);
    try {
      await analyzeFile(file, type);
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to analyze file:", error);
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
                  placeholder="Coffee $5 at Starbucks; Save $10k for a car by Dec; Monthly rent $1500..."
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
                  <span>⌘ + Enter to send</span>
                </div>
              </div>

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

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsAdding(!isAdding)}
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
