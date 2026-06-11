import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, MessageSquare, Loader2, Mic, MicOff, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { MCPClient } from '../services/mcpClient';
import { MIDDLEWARE_BASE, financeApi } from '../services/api';
import { useFinance } from '../context/FinanceContext';

import DeleteModal from './DeleteModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  buildLiveCaptionFromSpeechEvent,
  resetSpeechSessionAccum,
  getSpeechRecognitionConstructor,
  pickSpeechRecognitionLang,
} from '../lib/speechRecognition';

/** Stable message type with a UUID key to avoid array-index key instability. */
type OracleMessage = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

function makeMessage(role: 'user' | 'ai', content: string): OracleMessage {
  return { id: crypto.randomUUID(), role, content };
}

const GREETING_CONTENT =
  'Hi — I\'m your finance copilot here. Ask about spending, cash flow, goals, debt, or investments. Press **/** anytime to reopen this panel.';

function buildDefaultMessages(): OracleMessage[] {
  return [makeMessage('ai', GREETING_CONTENT)];
}

/** Safe wrapper around window.speechSynthesis — no-ops on unsupported browsers. */
function speakSafe(text: string): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch {
      /* speech synthesis unavailable */
    }
  }
}

const MESSAGE_VARIANTS = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 420, damping: 28 },
  },
};

export const AIOracle: React.FC = () => {
  const { userProfile, refreshData } = useFinance();
  const oracleStorageKey =
    userProfile.email && userProfile.email !== 'guest@example.com'
      ? `ft_oracle_messages_${userProfile.email}`
      : null;

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [messages, setMessages] = useState<OracleMessage[]>(buildDefaultMessages);

  const quickPrompts = [
    { label: 'Spending pulse', prompt: 'Analyze my spending' },
    { label: 'Net worth', prompt: 'Net worth forecast' },
    { label: 'Trim costs', prompt: 'Optimization tips' },
    { label: 'Debt plan', prompt: 'Debt strategy' },
  ];

  const mcpClientRef = useRef<MCPClient | null>(null);
  const isInitializingRef = useRef(false);
  const hasProactiveRunRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningDesiredRef = useRef(false);
  const latestInputRef = useRef('');
  const sessionAnchorRef = useRef('');
  const speechAccumRef = useRef(resetSpeechSessionAccum());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!oracleStorageKey) {
      setMessages(buildDefaultMessages());
      return;
    }
    const saved = localStorage.getItem(oracleStorageKey);
    if (saved) {
      try {
        const parsed: unknown[] = JSON.parse(saved);
        const migrated: OracleMessage[] = parsed.map((raw) => {
          const m = raw as OracleMessage & { id?: string };
          return {
            id: m.id ?? crypto.randomUUID(),
            role: m.role ?? 'ai',
            content: m.content ?? '',
          };
        });
        setMessages(migrated);
        return;
      } catch (e) {
        console.error('Failed to parse saved oracle messages:', e);
      }
    }
    setMessages(buildDefaultMessages());
  }, [oracleStorageKey]);

  useEffect(() => {
    if (!oracleStorageKey) return;
    localStorage.setItem(oracleStorageKey, JSON.stringify(messages));
  }, [messages, oracleStorageKey]);

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  useEffect(() => {
    if (!isOpen) {
      listeningDesiredRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    const initAI = async () => {
      if (isInitializingRef.current || mcpClientRef.current) return;
      isInitializingRef.current = true;

      try {
        const mcp = new MCPClient(`${MIDDLEWARE_BASE}/api/finance/mcp/sse`);
        await mcp.connect();
        mcpClientRef.current = mcp;

        if (!hasProactiveRunRef.current) {
          hasProactiveRunRef.current = true;
          setIsLoading(true);
          const result = await financeApi.oracleChat(
            'Perform a quick proactive analysis of my recent transactions and give me one high-impact insight or suggestion.',
            []
          );
          setMessages((prev) => [...prev, makeMessage('ai', result.content)]);
          if (result.financeMutations) void refreshData();
        }
      } catch (err) {
        console.error('Failed to initialize AI Oracle:', err);
      } finally {
        setIsLoading(false);
        isInitializingRef.current = false;
      }
    };

    if (isOpen && !mcpClientRef.current) {
      initAI();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTypingField =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        Boolean(target?.isContentEditable);
      if (e.key === '/' && !isOpen && !isTypingField) {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (!isOpen) {
        mcpClientRef.current?.disconnect();
        mcpClientRef.current = null;
      }
    };
  }, [isOpen, refreshData]);

  const stopListening = useCallback(() => {
    listeningDesiredRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    const SR = getSpeechRecognitionConstructor();
    if (!SR) {
      setErrorModal({
        isOpen: true,
        title: 'Speech Not Supported',
        message:
          'Your browser does not expose the Web Speech API. Use Chrome or Edge on desktop, allow microphone, and stay online for transcription.',
      });
      return;
    }
    stopListening();
    listeningDesiredRef.current = true;

    const recognition = new SR();
    recognition.lang = pickSpeechRecognitionLang();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      sessionAnchorRef.current = latestInputRef.current.trimEnd();
      speechAccumRef.current = resetSpeechSessionAccum();
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const sessionText = buildLiveCaptionFromSpeechEvent(speechAccumRef.current, event);
      const anchor = sessionAnchorRef.current;
      const spacer = anchor && sessionText ? ' ' : '';
      const next = `${anchor}${spacer}${sessionText}`.replace(/\s+/g, ' ').trim();
      flushSync(() => setInput(next));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      listeningDesiredRef.current = false;
      recognitionRef.current = null;
      setIsListening(false);

      if (event.error === 'not-allowed') {
        setErrorModal({
          isOpen: true,
          title: 'Microphone Access Denied',
          message:
            'Voice entry requires microphone access. Click Allow Access below and then grant permission in your browser prompt.',
        });
      } else if (event.error === 'network') {
        speakSafe('Speech recognition needs an internet connection in Chrome.');
      } else {
        speakSafe('Speech recognition hit an error. Try typing instead.');
      }
    };

    recognition.onend = () => {
      if (!listeningDesiredRef.current) {
        recognitionRef.current = null;
        setIsListening(false);
        return;
      }
      window.setTimeout(() => {
        if (!listeningDesiredRef.current || recognitionRef.current !== recognition) return;
        try {
          recognition.start();
        } catch {
          listeningDesiredRef.current = false;
          recognitionRef.current = null;
          setIsListening(false);
        }
      }, 100);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      listeningDesiredRef.current = false;
      recognitionRef.current = null;
      setIsListening(false);
      speakSafe('Could not start the microphone. Close other tabs using the mic and try again.');
    }
  }, [stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening || listeningDesiredRef.current) stopListening();
    else void startListening();
  }, [isListening, startListening, stopListening]);

  const handleSendWithMessage = useCallback(
    async (msg: string) => {
      if (!msg.trim() || isLoading) return;
      setMessages((prev) => [...prev, makeMessage('user', msg)]);
      setInput('');
      setIsLoading(true);
      try {
        const history = messages
          .filter((m) => m.content !== GREETING_CONTENT)
          .map((m) => ({ role: m.role, content: m.content }));
        const result = await financeApi.oracleChat(msg, history);
        setMessages((prev) => [...prev, makeMessage('ai', result.content)]);
        if (result.financeMutations) void refreshData();
      } catch (err) {
        console.error('Oracle Error:', err);
        setMessages((prev) => [
          ...prev,
          makeMessage('ai', 'Forgive me, my connection to the financial stream was interrupted. Please try again.'),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, refreshData]
  );

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    void handleSendWithMessage(input);
  }, [input, handleSendWithMessage]);

  const clearHistory = () => {
    hasProactiveRunRef.current = false;
    mcpClientRef.current = null;
    setMessages(buildDefaultMessages());
    if (oracleStorageKey) {
      localStorage.removeItem(oracleStorageKey);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="oracle-fab"
            type="button"
            aria-label="Open AI Oracle"
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-28 right-6 sm:right-10 z-[139] pointer-events-auto isolate"
          >
            <motion.span
              aria-hidden
              className="absolute inset-[-4px] -z-10 rounded-full bg-gradient-to-br from-emerald-400/50 via-indigo-500/45 to-fuchsia-500/40 blur-md"
              animate={{ opacity: [0.65, 1, 0.65], scale: [1, 1.06, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-[0_22px_50px_-10px_rgba(79,70,229,0.55)] ring-1 ring-white/12">
              <Sparkles className="h-6 w-6" strokeWidth={1.75} />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="sync">
        {isOpen && (
          <>
            <motion.div
              key="oracle-backdrop"
              role="presentation"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[140] bg-slate-950/60 backdrop-blur-md pointer-events-auto"
              onClick={() => setIsOpen(false)}
            />
            <div className="fixed inset-0 z-[141] pointer-events-none flex flex-col lg:flex-row lg:justify-end lg:items-end lg:p-6 p-3 sm:p-4">
              <motion.div
                key="oracle-panel"
                role="dialog"
                aria-modal
                aria-label="AI Oracle assistant"
                layout
                initial={{ opacity: 0, x: 48, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 32, scale: 0.98, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'pointer-events-auto relative flex flex-col overflow-hidden rounded-[1.85rem]',
                  'w-full lg:max-w-[min(30rem,calc(100vw-6rem))] lg:ml-auto',
                  'h-[min(92dvh,760px)] lg:h-[calc(100dvh-7rem)]',
                  'border border-white/[0.09] shadow-[0_40px_120px_-28px_rgba(0,0,0,0.85)]',
                  'backdrop-blur-3xl bg-[radial-gradient(120%_80%_at_0%_-10%,rgba(99,102,241,0.18),transparent_52%),linear-gradient(165deg,#0b0f17f2_0%,#06080ef2_42%,#0a0c12f5_100%)]'
                )}
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <motion.div
                    className="absolute -top-28 -left-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl"
                    animate={{ opacity: [0.35, 0.55, 0.35] }}
                    transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute -bottom-32 -right-16 h-64 w-64 rounded-full bg-emerald-500/12 blur-3xl"
                    animate={{ opacity: [0.25, 0.45, 0.25] }}
                    transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                  />
                </div>

                <header className="relative z-10 flex shrink-0 items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/[0.06]">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300/90">Oracle</p>
                    <h2 className="mt-1 text-lg sm:text-xl font-black tracking-tight text-white truncate">Finance cockpit</h2>
                    <p className="mt-0.5 text-xs text-slate-400 leading-snug max-w-[22rem]">
                      Grounded answers from your synced data — concise, actionable, calm.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={clearHistory}
                      title="Clear chat history"
                      className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-rose-300"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      aria-label="Close Oracle"
                      className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                </header>

                <div
                  ref={scrollRef}
                  className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,.35)_transparent]"
                >
                  <div className="flex flex-col gap-6 pb-4">
                    {messages.map((msg, i) => (
                      <motion.article
                        key={msg.id}
                        variants={MESSAGE_VARIANTS}
                        initial="initial"
                        animate="animate"
                        transition={{ delay: Math.min(i, 12) * 0.03 }}
                        className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-[13px]',
                            msg.role === 'ai'
                              ? 'border-white/[0.08] bg-white/[0.04] text-indigo-200'
                              : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                          )}
                        >
                          {msg.role === 'ai' ? (
                            <Sparkles className="h-5 w-5 shrink-0" strokeWidth={1.6} aria-hidden />
                          ) : (
                            <MessageSquare className="h-5 w-5 shrink-0" strokeWidth={1.6} aria-hidden />
                          )}
                        </div>
                        <div
                          className={cn(
                            'max-w-[min(100%,22rem)] sm:max-w-[min(100%,26rem)] rounded-[1.25rem] px-4 py-3.5 text-[13px] leading-relaxed shadow-lg',
                            msg.role === 'ai'
                              ? 'rounded-tl-md border border-white/[0.08] bg-slate-900/78 text-slate-100 backdrop-blur-sm'
                              : 'rounded-tr-md border border-emerald-400/20 bg-gradient-to-bl from-emerald-500 via-emerald-600 to-teal-600 text-white'
                          )}
                        >
                          <div className="prose prose-sm prose-invert max-w-none [&_strong]:font-bold [&_a]:text-indigo-300 [&_li]:marker:text-indigo-400/80 prose-p:my-1.5 prose-headings:font-bold prose-ul:my-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                    <AnimatePresence>
                      {isLoading && (
                        <motion.div
                          key="thinking"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0 }}
                          className="flex gap-3 pl-[3.25rem]"
                        >
                          <div className="flex gap-1.5 rounded-2xl border border-white/[0.08] bg-slate-900/72 px-4 py-3">
                            {[0, 1, 2].map((n) => (
                              <motion.span
                                key={n}
                                className="inline-block h-2 w-2 rounded-full bg-indigo-400/85"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.92, 1, 0.92] }}
                                transition={{
                                  duration: 1.05,
                                  repeat: Infinity,
                                  delay: n * 0.18,
                                  ease: 'easeInOut',
                                }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <footer className="relative z-10 shrink-0 border-t border-white/[0.06] bg-slate-950/45 px-4 py-4 sm:px-5 backdrop-blur-xl">
                  <motion.div
                    className="mb-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]"
                    layout
                  >
                    {quickPrompts.map(({ label, prompt }, idx) => (
                      <motion.button
                        key={prompt}
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleSendWithMessage(prompt)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-full border px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em]',
                          'border-white/[0.1] bg-white/[0.04] text-slate-200 transition-colors hover:border-indigo-400/35 hover:bg-indigo-500/12 hover:text-white',
                          'disabled:opacity-45 disabled:pointer-events-none'
                        )}
                      >
                        {label}
                      </motion.button>
                    ))}
                  </motion.div>

                  <div className="relative rounded-2xl border border-white/[0.07] bg-slate-950/55 p-1.5 shadow-inner shadow-black/30">
                    <div
                      className="pointer-events-none absolute inset-x-4 top-1 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent rounded-full opacity-70"
                      aria-hidden
                    />
                    <div className="flex gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Ask anything… (Shift+Enter for newline)"
                        className="flex-1 min-h-[2.85rem] max-h-[7rem] resize-none rounded-xl bg-transparent px-3 py-3 text-[15px] text-slate-100 placeholder:text-slate-600 outline-none"
                      />
                      <div className="flex flex-col gap-2 pr-1 pt-2 pb-1">
                        <button
                          type="button"
                          onClick={toggleListening}
                          aria-pressed={isListening}
                          className={cn(
                            'inline-flex items-center justify-center rounded-xl border p-2.5 transition-all',
                            isListening
                              ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
                              : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-white'
                          )}
                          title={isListening ? 'Stop voice' : 'Voice input'}
                        >
                          {isListening ? (
                            <MicOff className="h-5 w-5 shrink-0" aria-hidden />
                          ) : (
                            <Mic className="h-5 w-5 shrink-0" aria-hidden />
                          )}
                        </button>
                        <motion.button
                          type="button"
                          disabled={isLoading}
                          aria-label="Send message"
                          onClick={handleSend}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.95 }}
                          className="inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/35 disabled:opacity-45 disabled:scale-100"
                        >
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                          ) : (
                            <Send className="h-5 w-5" aria-hidden />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </footer>

                <DeleteModal
                  isOpen={errorModal.isOpen}
                  onClose={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
                  onConfirm={() => {
                    setErrorModal((prev) => ({ ...prev, isOpen: false }));
                    if (errorModal.title === 'Microphone Access Denied') {
                      setTimeout(startListening, 300);
                    }
                  }}
                  title={errorModal.title}
                  description={errorModal.message}
                  confirmLabel={errorModal.title === 'Microphone Access Denied' ? 'Allow Access' : 'Understood'}
                  cancelLabel={errorModal.title === 'Microphone Access Denied' ? 'Cancel' : ''}
                  isDestructive={false}
                />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
