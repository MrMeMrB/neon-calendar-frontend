import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, LogOut, CheckCircle, Layers, CheckSquare, Trash2, LayoutDashboard, FileDown, AlertCircle } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:5001/api" 
  : `${window.location.origin}/api`;

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_meta') || 'null'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activePage, setActivePage] = useState('dashboard'); 
  const [activeTab, setActiveTab] = useState('combined');   
  const [loading, setLoading] = useState(false);

  const [allEvents, setAllEvents] = useState([]);
  const [zoeEvents, setZoeEvents] = useState([]);
  const [workEvents, setWorkEvents] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [kidsLogs, setKidsLogs] = useState([]);
  const [liamLifeEvents, setLiamLifeEvents] = useState([]);

  const [todos, setTodos] = useState(() => JSON.parse(localStorage.getItem('grid_todos') || '[]'));
  const [newTodo, setNewTodo] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCalendar, setFormCalendar] = useState('work');

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
      if (!res.ok) throw new Error(data.error || "Refused.");
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_meta', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(''); setUser(null); setAllEvents([]);
  };

  const fetchAllFeeds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const rawFeedData = await res.json();
        setAllEvents(rawFeedData);
        
        // Strict, clean filtering rules so data never spills over into the wrong tab
        setZoeEvents(rawFeedData.filter(e => e.calendar === 'zoe'));
        setWorkEvents(rawFeedData.filter(e => e.calendar === 'work'));
        setKidsLogs(rawFeedData.filter(e => e.calendar === 'kids-logs'));
        setLiamLifeEvents(rawFeedData.filter(e => e.calendar === 'liam-life'));
        setSchoolEvents(rawFeedData.filter(e => e.calendar.includes('school') || e.calendar.includes('abington')));
      }
    } catch (err) { console.error("Sync down error:", err); }
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
          title: formTitle, start: formStart, description: formDescription, calendar: formCalendar
        })
      });
      if (res.ok) {
        setFormTitle(''); setFormStart(''); setFormDescription('');
        fetchAllFeeds();
        setActivePage('dashboard');
      }
    } catch (err) { console.error("Pipeline blocked:", err); }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Delete entry directly from this calendar stream?")) return;
    try {
      const res = await fetch(`${API_BASE}/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAllFeeds();
    } catch (err) { console.error("Deletion route failed:", err); }
  };

  const toggleTodo = (id) => setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

  // Determine exactly which singular stream data profile to render on screen
  let displayEvents = [];
  let currentHeaderTitle = "Master Overview";

  if (activeTab === 'zoe') { displayEvents = zoeEvents; currentHeaderTitle = "Zoe Stream Calendar"; }
  else if (activeTab === 'work') { displayEvents = workEvents; currentHeaderTitle = "Work Operations Calendar"; }
  else if (activeTab === 'school') { displayEvents = schoolEvents; currentHeaderTitle = "Abington School Calendar"; }
  else if (activeTab === 'kids-logs') { displayEvents = kidsLogs; currentHeaderTitle = "Child Tracker Logs"; }
  else if (activeTab === 'liam-life') { displayEvents = liamLifeEvents; currentHeaderTitle = "Liam Focus Calendar"; }
  else { displayEvents = allEvents; currentHeaderTitle = "Master Unified Calendar Stream"; }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-indigo-400">GridNode</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Identity Access Terminal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none" placeholder="Username" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none" placeholder="••••••••" />
            <button type="submit" className="w-full bg-indigo-600 font-semibold py-3 rounded-xl text-sm text-white">Authorize Terminal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased pb-24 md:pb-6">
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/60 sticky top-0 z-50 px-4 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="font-bold text-base block tracking-tight">GridNode Workspace</span>
              <span className="text-[10px] text-emerald-400 font-mono uppercase">System Connected</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center bg-slate-950 border border-slate-800/80 p-1 rounded-xl">
            <button onClick={() => setActivePage('dashboard')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${activePage === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Dashboard Hub</button>
            <button onClick={() => setActivePage('control-room')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${activePage === 'control-room' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Log Core Room</button>
          </div>

          <button onClick={handleLogout} className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition-all"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 flex-1">
        {activePage === 'dashboard' && (
          <div className="space-y-6">
            {/* Sidebar/Navigation Pill Filters */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {[
                { id: 'combined', name: 'Master Overview', count: allEvents.length, color: 'border-indigo-500/30' },
                { id: 'work', name: 'Work Ops Only', count: workEvents.length, color: 'border-emerald-500/30 text-emerald-400' },
                { id: 'zoe', name: 'Zoe Stream Only', count: zoeEvents.length, color: 'border-rose-500/30 text-rose-400' },
                { id: 'school', name: 'Abington School', count: schoolEvents.length, color: 'border-sky-500/30 text-sky-400' },
                { id: 'kids-logs', name: 'Child Logs Only', count: kidsLogs.length, color: 'border-orange-500/30 text-orange-400' },
                { id: 'liam-life', name: 'Liam Focus Only', count: liamLifeEvents.length, color: 'border-amber-500/30 text-amber-400' }
              ].map(stat => (
                <button key={stat.id} onClick={() => setActiveTab(stat.id)} className={`bg-slate-900 border ${stat.color} rounded-2xl p-4 text-left transition-all hover:scale-[1.01] ${activeTab === stat.id ? 'ring-2 ring-indigo-500 bg-slate-800' : ''}`}>
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">{stat.name}</span>
                  <span className="block text-2xl font-black font-mono mt-1">{stat.count}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-xl min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-base font-bold uppercase font-mono tracking-wide text-slate-200">{currentHeaderTitle}</h2>
                  </div>
                  <button onClick={fetchAllFeeds} className="text-xs font-mono text-indigo-400 hover:underline">Refresh Data</button>
                </div>

                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs font-mono">Syncing exact calendar buckets...</div>
                ) : displayEvents.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl">
                    <Clock className="w-6 h-6 text-slate-700 mb-1" />
                    <p className="text-xs text-slate-500">No matching events found on this specific calendar index.</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[550px] pr-1">
                    {displayEvents.map((event) => (
                      <div key={event.id} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl relative overflow-hidden group shadow-sm flex items-start justify-between gap-4">
                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: event.color }}></div>
                        <div className="pl-2 space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <h4 className="font-bold text-sm text-slate-200">{event.title}</h4>
                            <span className="text-[9px] font-mono uppercase bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {event.calendar}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            <span className="text-indigo-400 font-bold">{new Date(event.start).toLocaleDateString()}</span> at {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          {event.description && <p className="text-xs text-slate-400 pt-1 leading-relaxed">{event.description}</p>}
                        </div>
                        {event.domain !== 'school' && (
