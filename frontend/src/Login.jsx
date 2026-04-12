import React, { useState } from 'react';
// 🚨 Import auth and the Popup tools directly from Firebase
import { auth } from './firebase'; 
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const Login = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLoginClick = async (e) => {
    e.preventDefault(); // Stop any accidental page refreshes
    setIsProcessing(true);
    
    try {
      const provider = new GoogleAuthProvider();
      // Forces Google to always let you choose your account
      provider.setCustomParameters({ prompt: 'select_account' }); 
      
      // 🚨 THE FIX: Use signInWithPopup instead of Redirect!
      await signInWithPopup(auth, provider);
      
      // Note: We don't need to manually pass the token or call onLogin() here!
      // Because your App.jsx has `onAuthStateChanged` running, it will automatically 
      // see this successful login in the background and swap to the Dashboard instantly.

    } catch (error) {
      console.error("FULL FIREBASE ERROR:", error);
      alert(`LOGIN FAILED: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black">
      <div className="text-center flex flex-col items-center animate-in fade-in zoom-in duration-700">
        
        {/* Massive, Bold, Royal Blue Title */}
        <h1 
          className="text-7xl md:text-8xl font-black text-[#4169E1] mb-6 tracking-tight drop-shadow-[0_0_30px_rgba(65,105,225,0.3)]"
          style={{ fontFamily: "'Lexend', sans-serif" }}
        >
          EngiFlow
        </h1>
        
        {/* White, Normal Weight Subtitle */}
        <p 
          className="text-xl md:text-2xl text-white font-light mb-10 opacity-80"
          style={{ fontFamily: "'Lexend', sans-serif" }}
        >
          Deconstruct your syllabus. Dominate your exams.
        </p>
        
        {/* The Action Button / Loading State */}
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4169E1]"></div>
            <p className="text-[#4169E1] font-bold text-sm uppercase tracking-widest animate-pulse">
              Verifying with Google...
            </p>
          </div>
        ) : (
          <button 
            type="button" // CRITICAL: Stops HTML forms from reloading the page
            onClick={handleLoginClick} 
            className="group relative px-10 py-4 bg-white text-[#4169E1] font-black text-lg rounded-2xl hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3"
          >
            {/* Simple Google Icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        )}
        
      </div>
    </div>
  );
};

export default Login;