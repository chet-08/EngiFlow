/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

const DeepDiveChat = ({ token, selectedTopic }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // 1. LATEX RESCUE - Fixed for complex engineering notations
  const cleanMarkdown = useCallback((text) => {
    if (!text) return "";
    return text
      .replace(/\\nabla/g, '@@NABLA@@')
      .replace(/\\nu/g, '@@NU@@')
      .replace(/\\notin/g, '@@NOTIN@@')
      .replace(/\t/g, '\\t')       
      .replace(/[\b]/g, '\\b')     
      .replace(/\f/g, '\\f')       
      .replace(/\\n/g, '\n') 
      .replace(/\r/g, '')  
      .replace(/\\\\/g, '\\') 
      .replace(/@@NABLA@@/g, '\\nabla')
      .replace(/@@NU@@/g, '\\nu')
      .replace(/@@NOTIN@@/g, '\\notin')
      .trim();
  }, []);

  // 2. SURGICAL SCROLL - Prevents the whole screen from sliding up
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  // 3. ROBUST MESSAGE HANDLING
  const handleSendMessage = async (textOverride = null) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = { role: "user", content: textToSend };
    const historySnapshot = [...messages];
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/tutor/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          topic: selectedTopic, 
          message: textToSend,
          history: historySnapshot 
        })
      });

      if (!response.ok) throw new Error("API Error");

      const data = await response.json();
      const reply = data.reply || data.response || data;
      
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);

    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "⚠️ **Professor's Connection Lost.** I couldn't reach the server. Please check your backend or try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] min-h-0">
      
      {/* Header with Clear Action */}
      <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a] bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <h3 className="font-bold text-white tracking-widest text-[10px] uppercase">Deep Dive AI</h3>
        </div>
        <button 
          onClick={() => setMessages([])}
          className="text-[10px] font-bold text-slate-500 hover:text-red-400 uppercase tracking-tighter transition-colors"
        >
          Clear Chat
        </button>
      </div>

      {/* Chat History Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar min-h-0"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
            <div className="w-16 h-16 bg-[#0a0a0a] rounded-3xl flex items-center justify-center border border-[#1a1a1a] shadow-inner">
              <span className="text-3xl opacity-50">🤖</span>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4169E1] mb-1">Inquiry Mode</p>
              <p className="text-xs text-slate-500 max-w-[180px] leading-relaxed italic">Ask me about specific engineering nuances or real-world applications.</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-[#4169E1] text-white rounded-tr-none shadow-[0_10px_20px_rgba(65,105,225,0.15)] font-medium' 
                  : 'bg-[#0a0a0a] text-slate-300 border border-[#1a1a1a] rounded-tl-none prose prose-invert prose-sm prose-p:leading-relaxed'
              }`}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {cleanMarkdown(msg.content)}
                  </ReactMarkdown>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4169E1] animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#4169E1] animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#4169E1] animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#1a1a1a] bg-[#0a0a0a] shrink-0">
        
        {/* Quick Action Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-1">
          <button 
            onClick={() => handleSendMessage("Can you explain this like I'm 5? 👶")}
            disabled={isLoading}
            className="whitespace-nowrap px-3 py-1.5 bg-black border border-[#1a1a1a] hover:border-[#4169E1] text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 disabled:opacity-50"
          >
            👶 ELI5 Mode
          </button>
          <button 
            onClick={() => handleSendMessage("Give me a complex real-world engineering case study for this. 🏗️")}
            disabled={isLoading}
            className="whitespace-nowrap px-3 py-1.5 bg-black border border-[#1a1a1a] hover:border-[#4169E1] text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 disabled:opacity-50"
          >
            🏗️ Case Study
          </button>
        </div>

        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up..."
            className="flex-1 bg-black border border-[#1a1a1a] focus:border-[#4169E1] text-white rounded-xl px-4 py-3.5 text-sm outline-none transition-all placeholder:text-slate-800 shadow-inner"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim()}
            className={`px-4 rounded-xl transition-all ${
              isLoading || !input.trim() 
                ? 'text-slate-800' 
                : 'text-[#4169E1] hover:text-white hover:bg-[#4169E1] active:scale-90'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeepDiveChat;