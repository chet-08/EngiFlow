import React, { useState } from 'react';
import { logout } from "../firebase";
import UploadScreen from './UploadScreen';
import RadialMindMap from './RadialMindMap';
import AITutorPanel from './AITutorPanel';

const Dashboard = ({ user, token }) => {
  const [syllabusData, setSyllabusData] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [targetSubtopic, setTargetSubtopic] = useState(null);
  const [topicNote, setTopicNote] = useState(null);
  const [isNoteLoading, setIsNoteLoading] = useState(false);

  const handleNodeClick = async (topicTitle, subtopicTitle = null) => { 
    const finalTitle = typeof topicTitle === 'string' ? topicTitle : topicTitle?.data?.label || "Unknown Topic";
    
    setTargetSubtopic(subtopicTitle); 
    
    // Check if we already generated notes for this topic
    let cachedNote = null;
    if (syllabusData && syllabusData.units) {
      for (let u = 0; u < syllabusData.units.length; u++) {
        for (let t = 0; t < syllabusData.units[u].topics.length; t++) {
          if (syllabusData.units[u].topics[t].title === finalTitle && syllabusData.units[u].topics[t].cachedNote) {
            cachedNote = syllabusData.units[u].topics[t].cachedNote;
          }
        }
      }
    }

    setSelectedTopic(finalTitle);

    if (cachedNote) {
      setTopicNote(cachedNote);
      setIsNoteLoading(false);
      return; 
    }

    setTopicNote(null);
    setIsNoteLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/tutor/generate-note", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          subject_name: syllabusData?.subjectTitle || "Foundations of Engineering", 
          topic_title: finalTitle, 
          semester: "4th" 
        })
      });

      // 🚨 THE 503 & 429 GRACEFUL CATCH 🚨
      if (response.status === 503) {
        alert("🚦 The AI Professor is experiencing high demand! Please wait 10 seconds and click the node again.");
        setSelectedTopic(null); // Send them back to the map
        return; 
      }
      
      if (response.status === 429) {
        alert("⏱️ Easy there! You are learning too fast. Give the AI a moment to cool down before clicking again.");
        setSelectedTopic(null); // Send them back to the map
        return;
      }

      if (!response.ok) {
        let errorMessage = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorMessage}`);
      }
      
      const data = await response.json();
      setTopicNote(data);

      // Save to cache so we don't have to re-fetch if they click it again
      setSyllabusData(prevData => {
        const updated = { ...prevData };
        for (let u = 0; u < updated.units.length; u++) {
          for (let t = 0; t < updated.units[u].topics.length; t++) {
            if (updated.units[u].topics[t].title === finalTitle) {
              updated.units[u].topics[t].cachedNote = data;
            }
          }
        }
        return updated;
      });
      
    } catch (error) {
      alert(`⚠️ Connection Error: Failed to reach the backend.`); 
      console.error(error);
      setSelectedTopic(null); // Return to map on failure
    } finally {
      setIsNoteLoading(false);
    }
  };

  const handleTopicComplete = () => {
    if (!syllabusData) return;
    const newData = { ...syllabusData };
    let foundCurrent = false;

    for (let u = 0; u < newData.units.length; u++) {
      for (let t = 0; t < newData.units[u].topics.length; t++) {
        if (newData.units[u].topics[t].title === selectedTopic) {
          newData.units[u].topics[t].status = 'completed';
          foundCurrent = true;

          if (t + 1 < newData.units[u].topics.length) {
            newData.units[u].topics[t + 1].status = 'unlocked';
          } else if (u + 1 < newData.units.length && newData.units[u + 1].topics.length > 0) {
            newData.units[u + 1].topics[0].status = 'unlocked';
          }
          break;
        }
      }
      if (foundCurrent) break;
    }
    setSyllabusData(newData);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden" style={{ fontFamily: "'Lexend', sans-serif" }}>
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-[#1a1a1a] bg-black z-20 shrink-0 shadow-lg">
        <h1 className="text-2xl font-black text-[#4169E1] tracking-tight">EngiFlow</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-400 font-medium hidden md:block">Active: {user.displayName}</p>
          <button 
            onClick={logout} 
            className="px-4 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition text-xs font-bold uppercase tracking-widest"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Container - Added min-h-0 to prevent layout collapse */}
      <div className="flex-grow flex relative overflow-hidden min-h-0">
        
        {/* State 1: Upload */}
        {!syllabusData ? (
          <UploadScreen token={token} setSyllabusData={setSyllabusData} />
        ) 
        
        /* State 2: Syllabus Map */
        : !selectedTopic ? (
          <div className="w-full h-full animate-in fade-in duration-500">
            <RadialMindMap syllabusData={syllabusData} onNodeClick={handleNodeClick} />
          </div>
        ) 
        
        /* State 3: AI Tutor Lesson */
        : (
          <div className="flex w-full h-full bg-[#050505] animate-in slide-in-from-bottom-4 duration-500 min-h-0">
            {/* The Return Button Sidebar */}
            <div className="w-16 md:w-20 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col items-center py-6 shrink-0 z-10 shadow-2xl h-full">
              <button 
                onClick={() => setSelectedTopic(null)} 
                className="w-10 h-10 md:w-12 md:h-12 bg-[#1a1a1a] hover:bg-[#4169E1] text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-inner group"
                title="Return to Map"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </button>
            </div>
            
            <AITutorPanel 
              selectedTopic={selectedTopic} 
              topicNote={topicNote} 
              isNoteLoading={isNoteLoading} 
              token={token}
              onComplete={handleTopicComplete}
              targetSubtopic={targetSubtopic}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;