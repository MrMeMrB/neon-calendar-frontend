import React, { useState, useEffect } from 'react';
import { Calendar, Shield, Clock, Plus, LogOut, CheckCircle, AlertTriangle, Briefcase, Heart, BookOpen, Layers, CheckSquare, Trash2, Zap, FileText } from 'lucide-react';

const API_BASE = "http://localhost:5001/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_meta') || 'null'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Navigation state
  const [activeTab, setActiveTab] = useState('combined');
  const [loading, setLoading] = useState(false);

  // State Data Buckets
  const [zoeEvents, setZoeEvents] = useState([]);
  const [workEvents, setWorkEvents] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [kidsLogs, setKidsLogs] = useState([]);
  const [liamLifeEvents, setLiamLifeEvents] = useState([]);

  // Local Task State (Persistent in Browser Storage)
  const [todos, setTodos] = useState(() => JSON.parse(localStorage.getItem('grid_todos') || '[]'));
  const [newTodo, setNewTodo] = useState('');

  // Form Submission State Layers
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCalendar, setFormCalendar] = useState('kids-logs');
  const [formSentiment, setFormSentiment] = useState('Neutral');
  const [formSeverity, setFormSeverity] = useState('1');

  useEffect(() => {
    if (token) fetchAllFeeds();
  }, [token]);

  useEffect(() => {
    localStorage.setItem('grid_todos', JSON.stringify(todos));
  }, [todos]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication refused.");
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_meta', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(''); setUser(null); setZoeEvents([]); setWorkEvents([]); setSchoolEvents([]); setKidsLogs([]); setLiamLifeEvents([]);
  };

  const fetchAllFeeds = async () => {
    setLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const res = await fetch(`${API_BASE}/events?calendar=combined`, { headers });
      if (res.ok) {
        const allEvents = await res.json();
        
        // --- FIXED DATA ROUTING: DEEP LOWERCASE CHECKS TO CATCH ALL DATA STAMPS ---
        setZoeEvents(allEvents.filter(e => String(e.domain || '').toUpperCase() === 'ZOE' || String(e.calendar || '').toLowerCase() === 'zoe'));
        setWorkEvents(allEvents.filter(e => String(e.domain || '').toUpperCase() === 'WORK' || String(e.calendar || '').toLowerCase() === 'work'));
        
        // CATCH ANY INCOMING SCHOOL FEED VARIATIONS COMFORTABLY
        setSchoolEvents(allEvents.filter(e => {
          const d = String(e.domain || '').toLowerCase();
          const c = String(e.calendar || '').toLowerCase();
          return d.includes('school') || c.includes('school') || c.includes('abington');
        }));
        
        setKidsLogs(allEvents.filter(e => String(e.domain || '').toUpperCase() === 'KIDS-LOGS' || String(e.calendar || '').toLowerCase() === 'kids-logs'));
        setLiamLifeEvents(allEvents.filter(e => String(e.domain || '').toUpperCase() === 'LIAM-LIFE' || String(e.calendar || '').toLowerCase() === 'liam-life'));
      }
    } catch (err) { console.error("Database connection fault:", err); }
    finally { setLoading(false); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formTitle || !formStart) return;
    try {
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: formTitle, start: new Date(formStart).toISOString(),
          description: formDescription, calendar: formCalendar,
          metricSentiment: formSentiment, metricSeverity: parseInt(formSeverity)
        })
      });
      if (res.ok) {
        setFormTitle(''); setFormStart(''); setFormDescription('');
        fetchAllFeeds();
      }
    } catch (err) { console.error("Event route blocked:", err); }
  };

  const handleToggleLiamLife = async (event) => {
    const isCurrentlyInLiamLife = liamLifeEvents.some(e => e.title === event.title && e.start === event.start);
    
    if (isCurrentlyInLiamLife) {
      const match = liamLifeEvents.find(e => e.title === event.title && e.start === event.start);
      if (!match || match.isExternal) return;
      try {
        await fetch(`${API_BASE}/events/learn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ eventId: match.id, status: 'blocked' })
        });
        fetchAllFeeds();
      } catch (err) { console.error("Failed drop routing:", err); }
    } else {
      try {
        await fetch(`${API_BASE}/events/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            eventId: event.id, title: event.title, start: event.start, end: event.end,
            description: event.description, targetCalendar: 'liam-life', isExternal: event.isExternal
          })
        });
        fetchAllFeeds();
      } catch (err) { console.error("Failed clone routing:", err); }
    }
  };

  // Immediate Todo Task Process Layer
  const addTodo = (e) => {
    e.preventDefault(); if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now(), text: newTodo.trim(), completed: false }]);
    setNewTodo('');
  };
  const toggleTodo = (id) => setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTodo = (id) => setTodos(todos.filter(t => t.id !== id));

  // --- SYSTEM POOL & UNIFIED SWITCH ROUTING ---
  const masterPool = [...zoeEvents, ...workEvents, ...schoolEvents, ...kidsLogs, ...liamLifeEvents]
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  // --- FIXED SWITCH MATRIX ENGINE FOR FILTER DISPLAYED EVENTS ---
  let displayEvents = [];
  if (activeTab === 'zoe') {
    displayEvents = zoeEvents;
  } else if (activeTab === 'work') {
    displayEvents = workEvents;
  } else if (activeTab === 'school') {
    // 🚨 ABSOLUTE FIX: Safely route out the populated school bucket directly
    displayEvents = schoolEvents;
  } else if (activeTab === 'kids-logs') {
    displayEvents = kidsLogs;
  } else if (activeTab === 'liam-life') {
    displayEvents = liamLifeEvents;
  } else {
    displayEvents = masterPool;
  }

  // Reminders / Agenda Horizon Logic (Next 72 Hours)
  const upcomingReminders = masterPool
    .filter(e => {
      const diff = new Date(e.start) - new Date();
      return diff > 0 && diff < 72 * 60 * 60 * 1000;
    })
    .slice(0, 4);

  const getRelativeTimeString = (dateStr) => {
    const hours = Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60));
    if (hours === 0) return "Starting now";
    if (hours < 24) return `In ${hours}h`;
    return `In ${Math.round(hours / 24)}d`;
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-center mb-6 text-indigo-400">Unified Grid Node</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Operator Handle</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-220 focus:outline-none focus:border-indigo-500" placeholder="LiamBaker" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Access Key Override</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-220 focus:outline-none focus:border-indigo-500" placeholder="••••••••" />
            </div>
            {authError && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{authError}</div>}
            <button type="submit" className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-colors">Authorize Access</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-28 md:pb-6">
      {/* Top Application Bar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span className="font-bold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Dashboard Framework</span>
          </div>
          <button onClick={handleLogout} className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      {/* Main Framework Dashboard Layout */}
      <main className="max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* LEFT SIDE PANEL COLUMN (Navigation, Forms, To-Dos) */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Desktop Tab Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hidden md:block shadow-md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">Network Matrix Switcher</h3>
            <div className="space-y-1">
              {[
                { id: 'combined', name: 'Combined Workspace', icon: Layers, count: masterPool.length },
                { id: 'liam-life', name: "Liam's Life Focus", icon: Zap, count: liamLifeEvents.length },
                { id: 'zoe', name: "Zoe's Stream", icon: Heart, count: zoeEvents.length },
                { id: 'work', name: 'Work Operations', icon: Briefcase, count: workEvents.length },
                { id: 'school', name: 'School Calendars', icon: BookOpen, count: schoolEvents.length },
                { id: 'kids-logs', name: 'Child Issue Logging', icon: AlertTriangle, count: kidsLogs.length }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/60'}`}>
                  <div className="flex items-center gap-3"><tab.icon className="w-4 h-4" /><span>{tab.name}</span></div>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-mono ${activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PERMANENT LIVE TO-DO LIST WORKSPACE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-slate-200">Operational To-Do Checklist</h2>
            </div>
            <form onSubmit={addTodo} className="flex gap-2">
              <input type="text" value={newTodo} onChange={e => setNewTodo(e.target.value)} placeholder="Add immediate task..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-200" />
              <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"><Plus className="w-5 h-5" /></button>
            </form>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {todos.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2">No tasks logged onto the active run list.</p>
              ) : (
                <todos.map(todo => (
                  <div key={todo.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl gap-3">
                    <button onClick={() => toggleTodo(todo.id)} className={`flex items-center gap-2.5 text-sm font-medium text-left transition-colors ${todo.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${todo.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 bg-slate-900'}`}>{todo.completed && <CheckCircle className="w-3 h-3 stroke-[3]" />}</div>
                      <span className="break-all">{todo.text}</span>
                    </button>
                    <button onClick={() => deleteTodo(todo.id)} className="text-slate-500 hover:text-rose-400 p-1 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Incident / Event Creation Form Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2 mb-4"><Plus className="w-5 h-5 text-indigo-400" /><h2 className="text-base font-bold">Log Event / Issue</h2></div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Event Label</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Inset School Day" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target Layer Calendar</label>
                <select value={formCalendar} onChange={e => setFormCalendar(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="kids-logs">Child Logs (Internal)</option>
                  <option value="liam-life">Liam's Life Focus</option>
                  <option value="zoe">Zoe's Stream</option>
                  <option value="work">Work Operations</option>
                  <option value="school">School Calendars</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Timestamp Matrix</label>
                <input type="datetime-local" value={formStart} onChange={e => setFormStart(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notes / Description Context</label>
                <textarea rows="3" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Type notes field data explicitly here..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 resize-none"></textarea>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all shadow">Save to Network View</button>
            </form>
          </div>
        </div>

        {/* RIGHT SIDE MAIN DASHBOARD FEED AND REMINDERS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PERMANENT SCREEN TICKER: WHAT'S COMING UP (REMINDERS HORIZON) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5"><Clock className="w-4 h-4" /> System Reminders Overview (Next 72 Hours)</h3>
            {upcomingReminders.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded-xl border border-slate-800/60">No pending calendar items across the upcoming short-term timeline window.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {upcomingReminders.map((rem, i) => (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs gap-2">
                    <div className="space-y-0.5 truncate">
                      <div className="font-semibold text-slate-200 truncate">{rem.title}</div>
                      <div className="text-slate-500 font-mono text-[10px] uppercase">
                        {rem.domain ? `DOMAIN: ${rem.domain.toUpperCase()}` : rem.calendar} • {new Date(rem.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold shrink-0">{getRelativeTimeString(rem.start)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MAIN TIMELINE LOG EVENTS FEED STREAM */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-md flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg md:text-xl font-bold tracking-tight capitalize">{activeTab.replace('-', ' ')} Feed Stream</h2>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-slate-400">Total: {displayEvents.length}</span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-400 font-mono">Synchronizing Live Matrix Feeds...</p>
              </div>
            ) : displayEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <Clock className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-slate-300 font-medium">No system entries found for this calendar stream.</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] pr-1">
                {displayEvents.map((event, idx) => {
                  const isInLiamLife = liamLifeEvents.some(l => l.title === event.title && l.start === event.start);
                  return (
                    <div key={event.id || idx} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all flex flex-col gap-3 relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: event.color || '#6366f1' }}></div>
                      
                      {/* Event Row Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pl-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-100 text-sm md:text-base group-hover:text-indigo-400 transition-colors">{event.title}</h4>
                            {event.isExternal && <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">Live External Feed</span>}
                            
                            {/* DYNAMIC SYSTEM BADGE ALIGNMENT */}
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400 font-bold">
                              {event.domain ? `Domain: ${event.domain.toUpperCase()}` : `Source: ${event.calendar}`}
                            </span>
                          </div>
                          
                          <div className="font-mono text-xs text-slate-400 flex items-center gap-2">
                            <span className="text-slate-300 font-bold">{new Date(event.start).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="text-slate-500">•</span>
                            <span>{new Date(event.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        {/* LIAM'S LIFE CONTROL ACTION BUTTON */}
                        <button 
                          onClick={() => handleToggleLiamLife(event)}
                          className={`px-3 py-1.5 text-xs rounded-xl border font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto ${isInLiamLife ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                        >
                          <Zap className={`w-3.5 h-3.5 ${isInLiamLife ? 'fill-amber-400 text-amber-400' : ''}`} />
                          <span>{isInLiamLife ? "Remove From Life" : "Add to Liam's Life"}</span>
                        </button>
                      </div>

                      {/* EXPLICIT NOTE FIELD CONTAINER */}
                      {event.description && (
                        <div className="mt-1 pl-2 pt-2 border-t border-slate-900 text-xs md:text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/40 p-2.5 rounded-lg flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notes / Description Context:</span>
                            {event.description}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MOBILE STICKY NAVIGATION FOOTER LAYER */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-1 py-2 flex items-center justify-around md:hidden z-40 shadow-2xl">
        {[
          { id: 'combined', label: 'All', icon: Layers },
          { id: 'liam-life', label: 'Life', icon: Zap },
          { id: 'zoe', label: 'Zoe', icon: Heart },
          { id: 'work', label: 'Work', icon: Briefcase },
          { id: 'school', label: 'School', icon: BookOpen },
          { id: 'kids-logs', label: 'Logs', icon: AlertTriangle }
        ].map(tab => {
          const IconComponent = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl min-w-[54px] ${isSelected ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
              <IconComponent className="w-5 h-5" />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
