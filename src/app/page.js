// src/app/page.js
'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [view, setView] = useState('login'); 
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  
  // Cycle State
  const [cycleInput, setCycleInput] = useState({
    lastPeriodStart: '',
    cycleLength: 28,
    periodDuration: 5
  });
  
  const [results, setResults] = useState(null);
  const [showHistory, setShowHistory] = useState(false); // Toggle for history

  // --- 1. PERSISTENCE CHECK ---
  useEffect(() => {
    const savedUser = localStorage.getItem('lunaFlowUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setView('dashboard');
      
      if (parsedUser.cycleData && parsedUser.cycleData.lastPeriodStart) {
        const d = new Date(parsedUser.cycleData.lastPeriodStart);
        setCycleInput({
            lastPeriodStart: d.toISOString().split('T')[0],
            cycleLength: parsedUser.cycleData.cycleLength,
            periodDuration: parsedUser.cycleData.periodDuration
        });
      }
    }
  }, []);

  // --- Auth Handlers ---
  const handleAuth = async (action) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, action })
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('lunaFlowUser', JSON.stringify(data.user));
        setView('dashboard');
        
        if (data.user.cycleData && data.user.cycleData.lastPeriodStart) {
            const d = new Date(data.user.cycleData.lastPeriodStart);
            setCycleInput({
                lastPeriodStart: d.toISOString().split('T')[0],
                cycleLength: data.user.cycleData.cycleLength,
                periodDuration: data.user.cycleData.periodDuration
            });
        }
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Connection error");
    }
    setLoading(false);
  };

  const handleLogout = () => {
      localStorage.removeItem('lunaFlowUser');
      setUser(null);
      setView('login');
      setResults(null);
      setFormData({ email: '', password: '' });
  };

  // --- Calculation Logic ---
  useEffect(() => {
    if (view === 'dashboard' && cycleInput.lastPeriodStart) {
      calculateCycle();
    }
  }, [cycleInput, view]);

  const calculateCycle = () => {
    const start = new Date(cycleInput.lastPeriodStart);
    const length = parseInt(cycleInput.cycleLength);
    
    const next = new Date(start);
    next.setDate(start.getDate() + length);
    
    const ovul = new Date(next);
    ovul.setDate(next.getDate() - 14);
    
    const fStart = new Date(ovul);
    fStart.setDate(ovul.getDate() - 5);
    const fEnd = new Date(ovul);
    fEnd.setDate(ovul.getDate() + 1);

    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = next - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setResults({
      nextPeriod: next.toDateString(),
      daysLeft: diffDays,
      ovulation: ovul.toDateString(),
      fertileWindow: `${fStart.toLocaleDateString()} - ${fEnd.toLocaleDateString()}`
    });
  };

  // --- Save Data Handler ---
  const saveCycleData = async () => {
    if(!user) return;
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'update', 
                email: user.email, 
                cycleData: cycleInput 
            })
        });
        
        const data = await res.json();
        if(data.success) {
            // Update local storage and state with new history
            setUser(data.user);
            localStorage.setItem('lunaFlowUser', JSON.stringify(data.user)); 
            alert("Cycle details saved & added to history!");
        }
    } catch(e) { console.error(e); }
  };

  // Helper to format dates for the History list
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-4 text-slate-700">
      
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-rose-600 mb-2">LunaFlow 🌙</h1>
        <p className="text-slate-500 text-sm">Synchronize with your cycle</p>
      </div>

      {/* LOGIN / REGISTER CARD */}
      {view !== 'dashboard' && (
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-rose-100">
          <h2 className="text-xl font-bold mb-6 text-center">
            {view === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <div className="space-y-4">
            <input 
              type="email" placeholder="Email" 
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <input 
              type="password" placeholder="Password" 
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            <button 
              onClick={() => handleAuth(view)} disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-lg transition-all cursor-pointer"
            >
              {loading ? 'Processing...' : (view === 'login' ? 'Login' : 'Sign Up')}
            </button>
            <p className="text-center text-sm text-slate-400 mt-4 cursor-pointer hover:text-rose-500 transition-colors"
               onClick={() => setView(view === 'login' ? 'register' : 'login')}>
              {view === 'login' ? "New here? Create account" : "Have an account? Login"}
            </p>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {view === 'dashboard' && (
        <div className="w-full max-w-md space-y-6">
            
            {/* Main Tracker Card */}
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-rose-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Your Cycle</h2>
                <button onClick={handleLogout} className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer">Logout</button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Period Start</label>
                  <input 
                    type="date" 
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer"
                    value={cycleInput.lastPeriodStart}
                    onChange={(e) => setCycleInput({...cycleInput, lastPeriodStart: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cycle Length</label>
                    <input 
                      type="number" 
                      className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50"
                      value={cycleInput.cycleLength}
                      onChange={(e) => setCycleInput({...cycleInput, cycleLength: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</label>
                    <input 
                      type="number" 
                      className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50"
                      value={cycleInput.periodDuration}
                      onChange={(e) => setCycleInput({...cycleInput, periodDuration: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  onClick={saveCycleData}
                  className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm hover:bg-slate-900 cursor-pointer transition-colors"
                >
                  Save & Log Date
                </button>
              </div>

              {results && (
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-center space-y-4">
                   <div>
                      <div className="text-xs text-slate-500 uppercase">Next Period In</div>
                      <div className="text-3xl font-bold text-rose-600">{results.daysLeft} Days</div>
                      <div className="text-sm text-slate-600">{results.nextPeriod}</div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-200">
                     <div>
                        <div className="text-xs text-slate-500 uppercase">Ovulation</div>
                        <div className="text-sm font-bold text-emerald-600">{results.ovulation}</div>
                     </div>
                     <div>
                        <div className="text-xs text-slate-500 uppercase">Fertile Window</div>
                        <div className="text-sm font-bold text-emerald-600">{results.fertileWindow}</div>
                     </div>
                   </div>
                </div>
              )}
            </div>

            {/* HISTORY SECTION */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100">
                <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
                    <h3 className="font-bold text-slate-700">📜 Cycle History</h3>
                    <span className="text-slate-400 text-sm">{showHistory ? 'Hide' : 'Show'}</span>
                </div>
                
                {showHistory && (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {user.history && user.history.length > 0 ? (
                            user.history.map((entry, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                                    <div>
                                        <div className="font-bold text-rose-500">{formatDate(entry.startDate)}</div>
                                        <div className="text-xs text-slate-400">Duration: {entry.periodDuration} days</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-600">{entry.cycleLength} Days</div>
                                        <div className="text-xs text-slate-400">Cycle Length</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-sm text-slate-400 py-4">No history recorded yet.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}