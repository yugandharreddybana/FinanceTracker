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
  concatSpeechResults,
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
  "Greetings. I am the Yugi Oracle. I've connected to your real-time transaction stream via MCP. How may I assist your journey today?";

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

export const AIOracle: React.FC = () => {
  const { userProfile } = useFinance();
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

  // --- Refs ---
  const mcpClientRef = useRef<MCPClient | null>(null);
  const isInitializingRef = useRef(false);
  // Fix: track whether the proactive analysis has already fired (avoids stale-closure bug)
  const hasProactiveRunRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningDesiredRef = useRef(false);
  const latestInputRef = useRef('');
  const sessionAnchorRef = useRef('');

  // --- Persist / restore messages ---
  useEffect(() => {
    if (!oracleStorageKey) {
      setMessages(buildDefaultMessages());
      return;
    }
    const saved = localStorage.getItem(oracleStorageKey);
    if (saved) {
      try {
        const parsed: unknown[] = JSON.parse(saved);
        // Migrate legacy messages that lack an id field
        const migrated: OracleMessage[] = parsed.map((m: any) => ({
          id: m.id ?? crypto.randomUUID(),
          role: m.role ?? 'ai',
          content: m.content ?? '',
        }));
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

  // --- Sync latestInputRef ---
  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  // --- Stop speech recognition when Oracle closes ---
  useEffect(() => {
    if (!isOpen) {
      listeningDesiredRef.current = false;
      try { recognitionRef.current?.stop(); } catch { /* */ }
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [isOpen]);

  // --- MCP init + keyboard shortcut ---
  useEffect(() => {
    const initAI = async () => {
      if (isInitializingRef.current || mcpClientRef.current) return;
      isInitializingRef.current = true;

      try {
        const mcp = new MCPClient(`${MIDDLEWARE_BASE}/api/finance/mcp/sse`);
        await mcp.connect();
        mcpClientRef.current = mcp;

        // Fix: use ref instead of reading messages state (avoids stale closure)
        if (!hasProactiveRunRef.current) {
          hasProactiveRunRef.current = true;
          setIsLoading(true);
          const result = await financeApi.oracleChat(
            'Perform a quick proactive analysis of my recent transactions and give me one high-impact insight or suggestion.',
            []
          );
          setMessages(prev => [...prev, makeMessage('ai', result.content)]);
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
      if (e.key === '/' && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Only disconnect on component unmount (not every open/close toggle)
      if (!isOpen) {
        mcpClientRef.current?.disconnect();
        mcpClientRef.current = null;
      }
    };
  }, [isOpen]);

  // --- Speech helpers ---
  const stopListening = useCallback(() => {
    listeningDesiredRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* */ }
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
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const live = concatSpeechResults(event.results).trim();
      const anchor = sessionAnchorRef.current;
      const spacer = anchor && live ? ' ' : '';
      const next = `${anchor}${spacer}${live}`.replace(/\s+/g, ' ').trim();
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

  // --- Chat helpers ---

  /**
   * Fix: chip buttons now call this instead of the setTimeout/getElementById hack.
   * Sends a specific message directly without relying on React state timing.
   */
  const handleSendWithMessage = useCallback(async (msg: string) => {
    if (!msg.trim() || isLoading) return;
    setMessages(prev => [...prev, makeMessage('user', msg)]);
    setInput('');
    setIsLoading(true);
    try {
      // Fix: exclude greeting from history to avoid sending ~30 extra tokens per call
      const history = messages
        .filter(m => m.content !== GREETING_CONTENT)
        .map(m => ({ role: m.role, content: m.content }));
      const result = await financeApi.oracleChat(msg, history);
      setMessages(prev => [...prev, makeMessage('ai', result.content)]);
    } catch (err) {
      console.error('Oracle Error:', err);
      setMessages(prev => [
        ...prev,
        makeMessage('ai', 'Forgive me, my connection to the financial stream was interrupted. Please try again.'),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

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

  // --- Render ---
  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-32 right-8 w-16 h-16 bg-accent rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(124,110,250,0.4)] violet-glow z-[100] pointer-events-auto"
        >
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </motion.button>
      )}

      <div className="fixed inset-0 pointer-events-none z-[101]">
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 pointer-events-auto">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(10px)' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="glass-card mb-6 flex flex-col h-[600px] shadow-[0_32px_128px_rgba(0,0,0,0.8)] border-accent/30 bg-card/90 backdrop-blur-3xl overflow-hidden"
              >
                {/* Oracle Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-accent/10 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center violet-glow">
                      <Sparkles className="w-6 h-6 text-accent animate-pulse" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-xl tracking-tight">AI Oracle</h2>
                      <p className="text-[10px] text-accent font-bold uppercase tracking-[0.2em]">Financial Intelligence</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearHistory}
                      title="Clear Chat History"
                      className="w-10 h-10 flex items-center justify-center hover:bg-negative/10 rounded-xl transition-colors group"
                    >
                      <Trash2 className="w-5 h-5 text-white/40 group-hover:text-negative transition-colors" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      aria-label="Close"
                      className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-colors group"
                    >
                      <X className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                  {messages.map((msg) => (
                    // Fix: use stable msg.id (UUID) instead of array index
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: msg.role === 'ai' ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn('flex gap-6', msg.role === 'user' ? 'flex-row-reverse' : '')}
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5',
                          msg.role === 'ai' ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white/20'
                        )}
                      >
                        {msg.role === 'ai' ? <Sparkles className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                      </div>
                      <div
                        className={cn(
                          'max-w-[85%] p-5 rounded-[24px] text-sm leading-relaxed shadow-xl overflow-hidden',
                          msg.role === 'ai'
                            ? 'bg-white/[0.03] border border-white/5 text-white/80'
                            : 'bg-accent text-white font-medium violet-glow'
                        )}
                      >
                        <div className="markdown-body prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Input area */}
                <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                    {['Analyze my spending', 'Net worth forecast', 'Optimization tips', 'Debt strategy'].map(
                      (chip) => (
                        // Fix: call handleSendWithMessage directly — no setTimeout/DOM hack
                        <button
                          key={chip}
                          onClick={() => void handleSendWithMessage(chip)}
                          disabled={isLoading}
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap hover:bg-accent/20 hover:border-accent/40 transition-all hover:scale-105 disabled:opacity-50"
                        >
                          {chip}
                        </button>
                      )
                    )}
                  </div>
                  <div className="relative group/input">
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-positive/20 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask the Oracle anything..."
                        className="w-full bg-card border border-white/10 rounded-2xl py-4 pl-6 pr-28 outline-none focus:border-accent/50 transition-all text-lg placeholder:text-white/10"
                      />
                      <div className="absolute right-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={cn(
                            'p-3 rounded-xl transition-all border',
                            isListening
                              ? 'bg-negative/20 border-negative/30 text-negative animate-pulse'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                          )}
                        >
                          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={handleSend}
                          disabled={isLoading}
                          className="p-3 bg-accent text-white rounded-xl hover:bg-accent/80 transition-all hover:scale-105 shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

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
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
