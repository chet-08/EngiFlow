import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const GatekeeperQuiz = ({ quizzes, onSubtopicComplete, onRetry }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  if (!quizzes || quizzes.length === 0) return null;

  const currentQuiz = quizzes[currentIndex];
  const isCorrect = selectedAnswer === currentQuiz.correct_answer;
  const isLastQuestion = currentIndex === quizzes.length - 1;

  const handleOptionClick = (option) => {
    if (selectedAnswer) return; 
    setSelectedAnswer(option);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
  };

  const handleFailAndRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    // The reference_header was removed from the prompt for speed. 
    // Calling onRetry() empty will default to scrolling to the top of the current concept block in AITutorPanel.
    if (onRetry) onRetry();
  };

  // A lightweight LaTeX rescue function specifically for the JSON quiz payload
  const cleanQuizMarkdown = (text) => {
    if (!text) return "";
    return text.replace(/\\\\/g, '\\').trim(); 
  };

  return (
    <div className="bg-[#0a0a0a] border border-slate-700 rounded-2xl p-8 mt-8 shadow-lg">
      <div className="flex justify-between items-center mb-6 border-b border-[#1a1a1a] pb-4">
        <h3 className="text-lg font-bold text-[#4169E1]">Knowledge Check</h3>
        <span className="text-sm font-medium text-slate-400 bg-black px-3 py-1 rounded-full border border-slate-800">
          Question {currentIndex + 1} of {quizzes.length}
        </span>
      </div>

      <div className="text-xl text-white font-medium mb-8 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {cleanQuizMarkdown(currentQuiz.question)}
        </ReactMarkdown>
      </div>

      <div className="space-y-3 mb-8">
        {currentQuiz.options.map((option, idx) => {
          let buttonClass = "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center ";
          
          if (!selectedAnswer) {
            buttonClass += "bg-[#0a0a0a] border-slate-700 hover:bg-slate-800 hover:border-[#4169E1] text-slate-200 cursor-pointer";
          } else if (option === currentQuiz.correct_answer) {
            buttonClass += "bg-green-900/40 border-green-500 text-green-300"; 
          } else if (selectedAnswer === option) {
            buttonClass += "bg-red-900/40 border-red-500 text-red-300"; 
          } else {
            buttonClass += "bg-slate-900/50 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed"; 
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(option)}
              disabled={!!selectedAnswer}
              className={buttonClass}
            >
              <div className="flex w-full items-start">
                <span className="font-bold mr-4 shrink-0 mt-0.5">{String.fromCharCode(65 + idx)}.</span>
                <div className="flex-1">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                    // 🚨 THE FIX: This stops Markdown from wrapping options in block-level <p> tags inside the button
                    components={{ p: React.Fragment }}
                  >
                    {cleanQuizMarkdown(option)}
                  </ReactMarkdown>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedAnswer && (
        <div className={`p-6 rounded-xl border animate-fade-in ${isCorrect ? 'bg-green-950/30 border-green-900/50' : 'bg-red-950/30 border-red-900/50'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <h4 className={`font-bold mb-3 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {isCorrect ? '✅ Correct!' : '❌ Incorrect.'}
              </h4>
              <div className="text-slate-300 text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {cleanQuizMarkdown(currentQuiz.explanation)}
                </ReactMarkdown>
              </div>
            </div>
            
            {isCorrect ? (
              <button 
                onClick={isLastQuestion ? onSubtopicComplete : handleNext}
                className="shrink-0 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors w-full md:w-auto shadow-lg"
              >
                {isLastQuestion ? 'Complete Section ➔' : 'Next Question ➔'}
              </button>
            ) : (
              <button 
                onClick={handleFailAndRetry}
                className="shrink-0 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-[0_0_15px_rgba(220,38,38,0.5)] w-full md:w-auto"
              >
                Review Concept & Retry ↺
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GatekeeperQuiz;