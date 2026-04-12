
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import DeepDiveChat from './DeepDiveChat';
import GatekeeperQuiz from './GatekeeperQuiz';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css'; 

import { AutoImageSearch } from './AutoImageSearch';

const AITutorPanel = ({ selectedTopic, topicNote, isNoteLoading, token, onComplete, targetSubtopic }) => {
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const [lastSync, setLastSync] = useState({ note: null, target: null });
  
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  if (topicNote !== lastSync.note || targetSubtopic !== lastSync.target) {
    setLastSync({ note: topicNote, target: targetSubtopic });
    if (topicNote && topicNote.subtopics) {
      if (targetSubtopic) {
        const targetIndex = topicNote.subtopics.findIndex(sub => sub.title === targetSubtopic);
        setActiveSubIndex(targetIndex !== -1 ? targetIndex : 0);
      } else {
        setActiveSubIndex(0);
      }
    } else {
      setActiveSubIndex(0);
    }
  }

  useEffect(() => {
    if (!topicNote || !topicNote.subtopics || !topicNote.subtopics[activeSubIndex]) return;

    const currentSubtopicTitle = topicNote.subtopics[activeSubIndex].title;
    const abortController = new AbortController();

    const fetchStream = async () => {
      setStreamedContent(""); 
      setIsStreaming(true);

      try {
        const response = await fetch("http://127.0.0.1:8000/tutor/stream-subtopic", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            subject_name: "Foundations of AI", 
            topic_title: selectedTopic,
            subtopic_title: currentSubtopicTitle
          }),
          signal: abortController.signal
        });

        if (!response.ok) throw new Error("Stream connection failed");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          setStreamedContent((prev) => prev + chunk);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log("Stream aborted because user navigated away.");
        } else {
          console.error("Streaming error:", err);
          setStreamedContent("⚠️ The AI Professor lost connection. Please refresh the page.");
        }
      } finally {
        setIsStreaming(false);
      }
    };

    fetchStream();

    return () => {
      abortController.abort();
    };
  }, [activeSubIndex, topicNote, selectedTopic, token]);

  const cleanMarkdown = (text) => {
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
      .replace(/\n\s*---\s*\n/g, '\n\n---\n\n')
      .replace(/^[ \t]+\|/gm, '|') 
      .replace(/([^\n|])\n\|/g, '$1\n\n|') 
      .replace(/\|\n([^\n|])/g, '|\n\n$1') 
      .replace(/\|\n\n\|/g, '|\n|')
      .trim();
  };

  let safeFormula = topicNote?.key_formula;
  let safeExplanation = topicNote?.formula_explanation;

  if (safeFormula && /where\b/i.test(safeFormula)) {
      const splitIndex = safeFormula.toLowerCase().indexOf("where");
      if (splitIndex > 0) {
          safeExplanation = safeFormula.substring(splitIndex).trim();
          safeFormula = safeFormula.substring(0, splitIndex).trim();
      }
  } 

  const scrollToConcept = (headerText = null) => {
    setTimeout(() => {
      let targetElement = null;
      if (headerText) {
        const id = String(headerText).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        targetElement = document.getElementById(id);
      }
      if (!targetElement) {
        targetElement = document.getElementById('active-concept');
      }
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const renderDynamicContent = (rawText) => {
    if (!rawText) return null;
    const cleanedText = cleanMarkdown(rawText);
    
    // 🚨 FIX: Correct Regex for the new [IMAGE: ...] tag
    const parts = cleanedText.split(/(\[IMAGE:\s*[^\]]+\])/g);

    return parts.map((part, index) => {
      // 🚨 FIX: Extract just the word inside the brackets
      const match = part.match(/\[IMAGE:\s*([^\]]+)\]/);
      
      if (match) {
        return <AutoImageSearch key={index} query={match[1].trim()} />;
      }

      return (
        <ReactMarkdown 
          key={index}
          remarkPlugins={[remarkGfm, remarkMath]} 
          rehypePlugins={[rehypeKatex]}
          components={{
            h3: ({node, ...props}) => (
              <h3 className="text-2xl font-black text-[#4169E1] mt-12 mb-6 pb-2 border-b border-slate-800/80 tracking-tight" {...props} />
            ),
            h4: ({node, ...props}) => (
              <h4 className="text-xl font-bold text-[#22c55e] mt-10 mb-4 tracking-wide" {...props} />
            ),
            p: ({node, ...props}) => (
              <p className="mb-8 leading-loose text-slate-300 text-[1.1rem] font-light" {...props} />
            ),
            ul: ({node, ...props}) => (
              <ul className="mb-10 space-y-4 list-none pl-2" {...props} />
            ),
            li: ({node, children, ...props}) => (
              <li className="text-slate-300 leading-relaxed text-[1.05rem] flex items-start" {...props}>
                <span className="text-[#4169E1] mr-3 font-bold mt-1">•</span>
                <span>{children}</span>
              </li>
            ),
            table: ({node, ...props}) => (
              <div className="overflow-x-auto w-full my-8 rounded-xl border border-slate-700 bg-slate-900/80 shadow-lg">
                <table className="w-full text-left text-sm whitespace-nowrap" {...props} />
              </div>
            ),
            thead: ({node, ...props}) => (
              <thead className="bg-slate-950 text-slate-200 border-b-2 border-slate-700" {...props} />
            ),
            th: ({node, ...props}) => (
              <th className="p-5 font-bold tracking-wide" {...props} />
            ),
            td: ({node, ...props}) => (
              <td className="p-5 border-b border-slate-800/60 text-slate-300" {...props} />
            ),
            tr: ({node, ...props}) => (
              <tr className="hover:bg-slate-800/40 transition-colors" {...props} />
            ),
            pre: ({node, ...props}) => (
              <pre className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-6 my-8 overflow-x-auto text-emerald-400 font-mono text-sm shadow-inner" {...props} />
            ),
            code: ({node, inline, ...props}) => (
              inline 
                ? <code className="bg-[#1a1a1a] text-[#4169E1] px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                : <code className="font-mono" {...props} /> 
            ),
          }}
        >
          {part}
        </ReactMarkdown>
      );
    });
  };

  return (
    <div className="flex-1 flex h-full bg-black overflow-hidden min-h-0">
      <div id="left-scroll-col" className="flex-1 overflow-y-auto p-8 lg:p-12 scroll-smooth custom-scrollbar min-h-0">
        <div className="max-w-4xl mx-auto space-y-10 pb-16 text-left">
          
          <h1 className="text-4xl lg:text-5xl font-black text-white border-b border-[#1a1a1a] pb-8 tracking-tight">
            {selectedTopic}
          </h1>

          {isNoteLoading ? (
            <div className="flex flex-col items-center justify-center py-40 text-slate-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4169E1] mb-6"></div>
              <p className="text-lg font-medium tracking-wide">The AI Professor is building your roadmap...</p>
            </div>
          ) : topicNote && topicNote.subtopics ? (
            <>
              {topicNote.week_summary && (
                <div className="bg-[#0a0a0a] p-8 rounded-3xl border border-[#1a1a1a] shadow-[0_0_40px_rgba(0,0,0,0.5)] mb-10">
                  <h3 className="text-xs font-bold text-[#4169E1] uppercase tracking-[0.2em] mb-4">Module Overview</h3>
                  <div className="prose prose-invert max-w-none text-slate-300 font-light leading-relaxed text-lg">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {cleanMarkdown(topicNote.week_summary)}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {safeFormula && (
                <div className="bg-[#0a0a0a] p-8 rounded-3xl border border-[#1a1a1a] shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-6 mb-10">
                  <div>
                    <h3 className="text-xs font-bold text-[#a855f7] uppercase tracking-[0.2em] mb-4">Key Formula</h3>
                    <div className="bg-black py-8 px-6 rounded-2xl text-center text-[#a855f7] text-2xl border border-[#a855f7]/20 shadow-[0_0_30px_rgba(168,85,247,0.05)] overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {cleanMarkdown(safeFormula)}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {safeExplanation && (
                    <div className="border-t border-[#1a1a1a] pt-6">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Variable Breakdown</h3>
                      <div className="prose prose-invert prose-sm max-w-none text-slate-400 font-light leading-relaxed marker:text-[#a855f7]">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {cleanMarkdown(safeExplanation)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div id="active-concept" className="bg-[#0a0a0a] p-10 rounded-3xl border border-[#1a1a1a] shadow-[0_0_50px_rgba(0,0,0,0.8)] leading-relaxed text-slate-300 text-lg scroll-mt-6">
                
                <div className="flex items-center gap-5 mb-10 border-b border-[#1a1a1a] pb-8">
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    {topicNote.subtopics[activeSubIndex].title}
                  </h2>
                </div>

                <div className="prose prose-invert max-w-none prose-table:border prose-table:border-slate-700 prose-th:bg-slate-800 prose-th:p-2 prose-td:p-2">
                  {renderDynamicContent(streamedContent)}
                  
                  {isStreaming && (
                    <span className="inline-block w-2 h-5 ml-1 bg-[#4169E1] animate-pulse align-middle"></span>
                  )}
                </div>
              </div>

              <div className="pt-8">
                <GatekeeperQuiz 
                  key={activeSubIndex} 
                  quizzes={topicNote.subtopics[activeSubIndex].quizzes} 
                  onSubtopicComplete={() => {
                    if (activeSubIndex < topicNote.subtopics.length - 1) {
                      setActiveSubIndex(prev => prev + 1);
                      scrollToConcept(); 
                    } else {
                      onComplete();
                    }
                  }} 
                  onRetry={scrollToConcept} 
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="w-[400px] xl:w-[450px] border-l border-[#1a1a1a] bg-[#050505] flex flex-col shadow-2xl relative z-10 min-h-0">
        <DeepDiveChat token={token} selectedTopic={selectedTopic} />
      </div>

    </div>
  );
};

export default AITutorPanel;