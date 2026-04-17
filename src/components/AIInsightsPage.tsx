import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertCircle, TrendingUp, Award, Lightbulb, BarChart, Send, Mic, MicOff, MessageSquare, X, Loader2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';
import { MCPClient } from '../services/mcpClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useFinance } from '../context/FinanceContext';
import { financeApi } from '../services/api';

interface Insight {
  id: string;
  type: 'ALERT' | 'WIN' | 'TIP' | 'TREND';
  title: string;
  description: string;
  date: string;
}

interface AIInsightsPageProps {
  compact?: boolean;
  onClose?: () => void;
}

export const AIInsightsPage: React.FC<AIInsightsPageProps> = ({ compact, onClose }) => {
  const { accounts } = useFinance();
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: "Welcome back, Yugandhar. I'm analyzing your real-time financial stream. How can I help you optimize your wealth today?" }
  ]);

  const mcpClientRef = useRef<MCPClient | null>(null);
  const historyRef = useRef<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initAI = async () => {
      try {
        const mcp = new MCPClient('/api/finance/mcp/sse');
        await mcp.connect();
        mcpClientRef.current = mcp;

        generateInitialInsights();
      } catch (err) {
        console.error("Failed to initialize AI Insights:", err);
      }
    };

    initAI();

    return () => {
      mcpClientRef.current?.disconnect();
    };
  }, []);

  const generateInitialInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const transactions = await mcpClientRef.current?.callTool('get_transactions', {}) || [];
      const parsedInsights = await financeApi.getAIInsights(transactions, selectedBank);
      setInsights(parsedInsights);
    } catch (err) {
      console.error("Failed to generate insights:", err);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const transactions = await mcpClientRef.current?.callTool('get_transactions', {}) || [];
      const response = await financeApi.sendAIChat(userMessage, historyRef.current, transactions);
      
      setMessages(prev => [...prev, { role: 'ai', content: response.content }]);
      historyRef.current.push({ role: 'user', content: userMessage });
      historyRef.current.push({ role: 'ai', content: response.content });

      if (isVoiceMode) {
        speakMessage(response.content);
      }
    } catch (err) {
      console.error("Oracle Error:", err);
      setMessages(prev => [...prev, { role: 'ai', content: "Forgive me, my connection to the financial stream was interrupted. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (window.self !== window.top) {
      alert("Speech recognition is often blocked in preview environments. Please open the app in a new tab to use voice features.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setIsListening(true);
      setIsVoiceMode(true);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === 'network') {
        setMessages(prev => [...prev, { role: 'ai', content: "I'm having trouble connecting to the speech service. This is often caused by browser restrictions in the preview environment. Please try opening the app in a new tab, or type your message instead." }]);
      } else if (event.error === 'not-allowed') {
        setMessages(prev => [...prev, { role: 'ai', content: "Microphone access was denied. Please check your browser permissions." }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: `Speech recognition encountered an error: ${event.error}` }]);
      }
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Auto-send after a short delay
      setTimeout(() => {
        document.getElementById('insights-send-btn')?.click();
      }, 500);
    };
    recognition.start();
  };

  const speakMessage = async (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div
      initial={compact ? { opacity: 0, scale: 0.9, y: 20 } : { opacity: 0, y: 20 }}
      animate={compact ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, y: 0 }}
      exit={compact ? { opacity: 0, scale: 0.9, y: 20 } : { opacity: 0, y: -20 }}
      className={cn(
        "max-w-7xl mx-auto relative",
        compact ? "w-full h-full max-w-none" : "min-h-[calc(100vh-100px)]"
      )}
    >
      {!compact && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-bold tracking-tighter mb-3 font-display">Financial Intelligence</h1>
            <p className="text-white/40 font-medium">Personalized guidance powered by Yugi's neural engine</p>
          </div>
          <div className="flex items-center gap-4">
            <select 
              title="Filter by account"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white/70 outline-none focus:border-accent/50 transition-all"
            >
              <option value="ALL" className="bg-[#050508] text-white">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.name} className="bg-[#050508] text-white">{acc.name}</option>
              ))}
            </select>
            <button 
              onClick={generateInitialInsights}
              disabled={isGeneratingInsights}
              className="px-6 py-3 bg-accent/10 border border-accent/30 rounded-xl text-accent font-bold uppercase tracking-widest text-[10px] hover:bg-accent/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isGeneratingInsights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Refresh Intelligence
            </button>
          </div>
        </div>
      )}

      <div className={cn(
        "grid grid-cols-1 gap-10",
        compact ? "h-full flex flex-col" : "lg:grid-cols-12 h-[calc(100vh-280px)]"
      )}>
        {!compact && (
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
              {['All Intelligence', 'Risk Alerts', 'Wealth Wins', 'Optimization Tips', 'Market Trends'].map((f, i) => (
                <button 
                  key={f} 
                  className={cn(
                    "px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                    i === 0 ? "bg-accent/10 border-accent/30 text-accent" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-4 space-y-6 no-scrollbar">
              {isGeneratingInsights && insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-white/20">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">Synthesizing Neural Insights...</p>
                </div>
              ) : (
                insights.map((insight, i) => {
                  const Icon = insight.type === 'ALERT' ? AlertCircle : insight.type === 'WIN' ? Award : insight.type === 'TIP' ? Lightbulb : BarChart;
                  const colorClass = insight.type === 'ALERT' ? 'text-negative' : insight.type === 'WIN' ? 'text-positive' : insight.type === 'TIP' ? 'text-accent' : 'text-amber-500';
                  const bgClass = insight.type === 'ALERT' ? 'bg-negative/[0.03] border-negative/20' : insight.type === 'WIN' ? 'bg-positive/[0.03] border-positive/20' : insight.type === 'TIP' ? 'bg-accent/[0.03] border-accent/20' : 'bg-amber-500/[0.03] border-amber-500/20';

                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ x: 8 }}
                      className={cn("glass-card p-8 flex gap-8 group cursor-pointer relative overflow-hidden", bgClass)}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110", 
                        insight.type === 'ALERT' ? 'bg-negative/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 
                        insight.type === 'WIN' ? 'bg-positive/10 shadow-[0_0_20px_rgba(34,211,165,0.2)]' : 
                        insight.type === 'TIP' ? 'bg-accent/10 shadow-[0_0_20px_rgba(124,110,250,0.2)]' : 
                        'bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      )}>
                        <Icon className={cn("w-7 h-7", colorClass)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xl font-bold tracking-tight group-hover:text-white transition-colors">{insight.title}</h4>
                          <span className="text-[10px] font-bold font-mono text-white/20 uppercase tracking-widest">{insight.date}</span>
                        </div>
                        <p className="text-sm text-white/50 leading-relaxed mb-6 font-medium">{insight.description}</p>
                        <div className="flex gap-6 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                          <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent hover:text-white transition-colors flex items-center gap-2">
                            <span>Execute Strategy</span>
                            <TrendingUp className="w-3 h-3" />
                          </button>
                          <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors">Archive</button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className={cn(
          compact ? "flex-1 flex flex-col min-h-0" : "lg:col-span-5 flex flex-col h-full",
          "glass-card overflow-hidden border-accent/20 bg-card/40 backdrop-blur-3xl shadow-2xl p-0"
        )}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-accent/[0.05] shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center violet-glow">
                <Sparkles className="w-6 h-6 text-accent animate-pulse" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-lg">Yugi Oracle</span>
                <p className="text-[10px] text-accent font-bold uppercase tracking-widest">Neural Engine v4.2</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-positive animate-pulse" />
                <span className="text-[10px] font-bold text-positive uppercase tracking-widest">Active</span>
              </div>
              {compact && (
                <button 
                  title="Close"
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-5", msg.role === 'user' ? "flex-row-reverse" : "")}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                  msg.role === 'ai' ? "bg-accent/10 border-accent/20 text-accent" : "bg-white/5 border-white/10 text-white/40"
                )}>
                  {msg.role === 'ai' ? <Sparkles className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div className={cn(
                  "p-5 rounded-2xl text-sm leading-relaxed font-medium shadow-sm overflow-hidden relative group/msg",
                  msg.role === 'ai' ? "bg-white/[0.03] border border-white/5 text-white/80 rounded-tl-none" : "bg-accent text-white rounded-tr-none"
                )}>
                  <div className="markdown-body prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  {msg.role === 'ai' && (
                    <button 
                      onClick={() => speakMessage(msg.content)}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-white/5 opacity-0 group-hover/msg:opacity-100 transition-all hover:bg-white/10 text-white/40 hover:text-white"
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl rounded-tl-none text-sm text-white/40 italic">
                  Oracle is consulting the financial stream...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-6 border-t border-white/5 bg-white/[0.02] shrink-0">
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {["Risk analysis", "Portfolio health", "Tax optimization", "Goal strategy"].map(chip => (
                <button 
                  key={chip} 
                  onClick={() => {
                    setInput(chip);
                    setTimeout(() => document.getElementById('insights-send-btn')?.click(), 0);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap hover:bg-accent/10 hover:border-accent/30 transition-all text-white/40 hover:text-white"
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className={cn("relative group", compact ? "space-y-3" : "")}>
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Query the neural engine..."
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 outline-none focus:border-accent/50 transition-all font-medium placeholder:text-white/10",
                    compact ? "pr-12 border-white/20 bg-white/10" : "pr-24"
                  )}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button 
                    onClick={startListening}
                    className={cn(
                      "p-2.5 rounded-xl transition-colors",
                      isListening ? "text-negative bg-negative/10 animate-pulse" : "text-white/20 hover:text-white"
                    )}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  {!compact && (
                    <button 
                      id="insights-send-btn"
                      onClick={handleSend}
                      disabled={isLoading}
                      className="p-2.5 bg-accent rounded-xl hover:bg-accent/80 transition-all shadow-lg violet-glow disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              </div>

              {compact && (
                <button 
                  id="insights-send-btn"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="w-full py-4 bg-accent text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-accent/80 transition-all shadow-lg violet-glow disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Transmit Query</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
