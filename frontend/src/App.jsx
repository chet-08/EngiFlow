import React, { useState, useEffect } from 'react';
import { auth } from './firebase'; 
import { onAuthStateChanged } from 'firebase/auth';

import Dashboard from './components/Dashboard';
// 🚨 UNCOMMENTED: Now importing your actual Login component!
import Login from './Login'; 

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Grab the fresh Firebase token for your backend API calls
        const userToken = await currentUser.getIdToken();
        setToken(userToken);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-blue-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="font-semibold text-slate-400">Loading EngiFlow...</p>
      </div>
    );
  }

  // 🚨 THE FIX: If the user isn't logged in, show the REAL Login screen!
  if (!user) {
    return (
      <Login 
        onLogin={(loggedInUser, freshToken) => {
          setUser(loggedInUser);
          setToken(freshToken);
        }} 
      />
    );
  }

  // Render the new Dashboard and pass down the auth credentials!
  return <Dashboard user={user} token={token} />;
};

export default App;