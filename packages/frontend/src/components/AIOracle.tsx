import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, MessageSquare, Loader2, Mic, MicOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import { MCPClient } from '../services/mcpClient';
import { MIDDLEWARE_BASE } from '../services/api';
import DeleteModal from './DeleteModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const AIOracle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorModal, setErrorModal] = useState<{isOpen: boolean, title: string, message: string}>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: "Greetings. I am the Yugi Oracle. I've connected to your real-time transaction stream via MCP. How may I assist your journey today?" }
  ]);

  const mcpClientRef = useRef<MCPClient | null>(null);
  const isInitializingRef = useRef(false);
  const aiRef = useRef<any>(null);
  const historyRef = useRef<any[]>([]);

  useEffect(() => {
    const initAI = async () => {
      if (isInitializingRef.current || mcpClientRef.current) return;
      isInitializingRef.current = true;
      
      try {
        // Initialize MCP Client
        const mcp = new MCPClient(`${MIDDLEWARE_BASE}/api/finance/mcp/sse`);
        await mcp.connect();
        mcpClientRef.current = mcp;

        // Initialize Gemini
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          setMessages(prev => [...prev, { role: 'ai', content: "⚠️ Gemini API key not configured. Please set `VITE_GEMINI_API_KEY` in your `.env` file to enable AI Oracle." }]);
          return;
        }
        const ai = new GoogleGenAI({ apiKey });
        aiRef.current = ai;
        
        // Get tools from MCP
        const mcpTools = await mcp.listTools();
        const functionDeclarations = mcpTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }));

        // Proactive initial analysis
        setIsLoading(true);
        const now = new Date();
        const systemInstruction = `You are the Yugi Oracle, a premium financial AI. Today's date is ${now.toISOString().split('T')[0]}. 
        
        CRITICAL RULES:
        1. ALWAYS use the 'create_transaction' tool to record new transactions. 
        2. Before creating a transaction, call 'get_accounts' if you are unsure of the bank name.
        3. If the user says 'euros', use 'EUR' as the currency. NEVER default to INR if a currency is specified.
        4. If 'Revolut' is mentioned, set 'account' to 'Revolut'.
        5. For 'yesterday', use ${new Date(now.getTime() - 86400000).toISOString().split('T')[0]}.
        6. Handle multiple transactions by calling 'create_transaction' for each one.
        7. Be proactive but precise.`;


        const initialAnalysisPrompt = "Perform a quick proactive analysis of my recent transactions and give me one high-impact insight or suggestion.";
        
        const userContent = { role: 'user', parts: [{ text: initialAnalysisPrompt }] };
        historyRef.current.push(userContent);

        let response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: historyRef.current,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations }]
          }
        });
        
        let functionCalls = response.functionCalls;
        while (functionCalls) {
          // Add AI's function call to history
          historyRef.current.push(response.candidates![0].content);

          const toolResults = await Promise.all(functionCalls.map(async (call: any) => {
            const result = await mcp.callTool(call.name, call.args);
            return {
              functionResponse: {
                name: call.name,
                response: { content: result }
              }
            };
          }));

          // Add tool results to history
          const toolContent = { role: 'user', parts: toolResults };
          historyRef.current.push(toolContent);

          response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: historyRef.current,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations }]
            }
          });
          functionCalls = response.functionCalls;
        }

        // Add final AI response to history
        historyRef.current.push(response.candidates![0].content);
        setMessages(prev => [...prev, { role: 'ai', content: response.text || "I've connected to your financial stream." }]);
      } catch (err) {
        console.error("Failed to initialize AI Oracle:", err);
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
      mcpClientRef.current?.disconnect();
    };
  }, [isOpen]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setErrorModal({
        isOpen: true,
        title: 'Speech Not Supported',
        message: 'Your current browser does not support the Web Speech API. Please try using a modern browser like Chrome or Edge.'
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        setErrorModal({
          isOpen: true,
          title: 'Microphone Access Denied',
          message: 'Voice entry requires microphone access. Please click "Allow Access" below and then grant permission in your browser prompt.'
        });
      } else if (event.error === 'no-speech') {
        // Ignore
      } else {
        speak("I encountered an error with speech recognition.");
      }
    };

    let finalTranscript = '';
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interimTranscript);
    };


    recognition.start();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      if (!aiRef.current || !mcpClientRef.current) throw new Error("AI not initialized");

      const now = new Date();
      const systemInstruction = `You are the Yugi Oracle, a premium financial AI. Today's date is ${now.toISOString().split('T')[0]}. 
      
      CRITICAL RULES:
      1. ALWAYS use the 'create_transaction' tool to record new transactions. 
      2. Before creating a transaction, call 'get_accounts' if you are unsure of the bank name.
      3. If the user says 'euros', use 'EUR' as the currency. NEVER default to INR if a currency is specified.
      4. If 'Revolut' is mentioned, set 'account' to 'Revolut'.
      5. For 'yesterday', use ${new Date(now.getTime() - 86400000).toISOString().split('T')[0]}.
      6. Handle multiple transactions by calling 'create_transaction' for each one.
      7. Be proactive but precise.`;


      
      // Get tools from MCP
      const mcpTools = await mcpClientRef.current.listTools();
      const functionDeclarations = mcpTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }));

      const userContent = { role: 'user', parts: [{ text: userMessage }] };
      historyRef.current.push(userContent);

      let response = await aiRef.current.models.generateContent({
        model: "gemini-2.0-flash",
        contents: historyRef.current,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations }]
        }
      });
      
      // Handle potential tool calls (MCP loop)
      let functionCalls = response.functionCalls;
      while (functionCalls) {
        // Add AI's function call to history
        historyRef.current.push(response.candidates![0].content);

        const toolResults = await Promise.all(functionCalls.map(async (call: any) => {
          const result = await mcpClientRef.current?.callTool(call.name, call.args);
          return {
            functionResponse: {
              name: call.name,
              response: { content: result }
            }
          };
        }));

        // Add tool results to history
        const toolContent = { role: 'user', parts: toolResults };
        historyRef.current.push(toolContent);

        response = await aiRef.current.models.generateContent({
          model: "gemini-2.0-flash",
          contents: historyRef.current,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations }]
          }
        });
        functionCalls = response.functionCalls;
      }

      // Add final AI response to history
      historyRef.current.push(response.candidates![0].content);
      setMessages(prev => [...prev, { role: 'ai', content: response.text || "I've processed your request." }]);
    } catch (err) {
      console.error("Oracle Error:", err);
      setMessages(prev => [...prev, { role: 'ai', content: "Forgive me, my connection to the financial stream was interrupted. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

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
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
                <button 
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-colors group"
                >
                  <X className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: msg.role === 'ai' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex gap-6",
                      msg.role === 'user' ? "flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5",
                      msg.role === 'ai' ? "bg-accent/10 text-accent" : "bg-white/5 text-white/20"
                    )}>
                      {msg.role === 'ai' ? <Sparkles className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] p-5 rounded-[24px] text-sm leading-relaxed shadow-xl overflow-hidden",
                      msg.role === 'ai' 
                        ? "bg-white/[0.03] border border-white/5 text-white/80" 
                        : "bg-accent text-white font-medium violet-glow"
                    )}>
                      <div className="markdown-body prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                  {["Analyze my spending", "Net worth forecast", "Optimization tips", "Debt strategy"].map(chip => (
                    <button 
                      key={chip}
                      onClick={() => {
                        setInput(chip);
                        // Use a small timeout to ensure state update before sending
                        setTimeout(() => {
                          const sendBtn = document.getElementById('oracle-send-btn');
                          sendBtn?.click();
                        }, 0);
                      }}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap hover:bg-accent/20 hover:border-accent/40 transition-all hover:scale-105 disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
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
                        onClick={startListening}
                        className={cn(
                          "p-3 rounded-xl transition-all border",
                          isListening 
                            ? "bg-negative/20 border-negative/30 text-negative animate-pulse" 
                            : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                        )}
                      >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                      <button 
                        id="oracle-send-btn"
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
                onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                  setErrorModal(prev => ({ ...prev, isOpen: false }));
                  if (errorModal.title === 'Microphone Access Denied') {
                    setTimeout(startListening, 300);
                  }
                }}
                title={errorModal.title}
                description={errorModal.message}
                confirmLabel={errorModal.title === 'Microphone Access Denied' ? "Allow Access" : "Understood"}
                cancelLabel={errorModal.title === 'Microphone Access Denied' ? "Cancel" : ""}
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
