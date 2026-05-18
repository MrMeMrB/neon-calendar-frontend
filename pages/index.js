import React, { useState, useEffect } from 'react';
import { Calendar, Shield, Clock, Plus, LogOut, CheckCircle, AlertTriangle, Briefcase, Heart, BookOpen, Layers } from 'lucide-react';

const API_BASE = "http://localhost:5001/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_meta') || 'null'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Matrix Configuration Tabs
  const [activeTab, setActiveTab] = useState('combined');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Quick Post Issue Form Layer
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCalendar, setFormCalendar] = useState('kids-logs');
  const [formSentiment, setFormSentiment] = useState('Neutral');
  const [formSeverity, setFormSeverity] = useState('1');

  useEffect(() => {
    if (token) fetchEvents();
  }, [token, activeTab]);

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
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setUser(null);
    setEvents([]);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/events?calendar=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setEvents(data);
    } catch (err) {
      console.error("Data ingestion failure:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formTitle || !formStart) return;

    try {
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle,
          start: new Date(formStart).toISOString(),
          description: formDescription,
          calendar: formCalendar,
          metricSentiment: formSentiment,
          metricSeverity: parseInt(formSeverity)
        })
      });

      if (res.ok) {
        setFormTitle('');
        setFormStart('');
        setFormDescription('');
        fetchEvents();
      }
    } catch (err) {
      console.error("Post log thread block:", err);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Unified Grid Node
            </h1>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Operator Handle</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="LiamBaker" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Access Key Override</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="••••••••" />
            </div>
            {authError && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{authError}</div>}
            <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98]">Authorize Access</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 md:pb-0">
      {/* Top Application Bar */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-4 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Dashboard Framework</span>
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Online</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-400 hidden sm:inline">User: <b className="text-slate-200 font-semibold">{user?.username}</b></span>
            <button onClick={handleLogout} className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Main Framework Dashboard Grid */}
      <main className="max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Side Controller Column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Desk Header Tabs Block (Desktop Navigation Only) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hidden md:block shadow-md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">Network Matrix Switcher</h3>
            <div className="space-y-1">
              {[
                { id: 'combined', name: 'Combined Workspace', icon: Layers, count: events.length },
                { id: 'zoe', name: "Zoe's Stream", icon: Heart, count: null },
                { id: 'work', name: 'Work Operations', icon: Briefcase, count: null },
                { id: 'school', name: 'School Calendars', icon: BookOpen, count: null },
                { id: 'kids-logs', name: 'Child Issue Logging', icon: AlertTriangle, count: null }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Incident Logging / Event Creation Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold">Log Event / Issue</h2>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Event Label</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Inset School Day or Parent Teacher Meeting" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm transition-colors" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Target Layer Calendar</label>
                <select value={formCalendar} onChange={e => setFormCalendar(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm transition-colors">
                  <option value="kids-logs">Child Logs (Internal)</option>
                  <option value="zoe">Zoe's Stream</option>
                  <option value="work">Work Operations</option>
                  <option value="school">School (Local Override)</option>
                  <option value="liam-life">Personal (Liam)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Timestamp Matrix</label>
                <input type="datetime-local" value={formStart} onChange={e => setFormStart(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Telemetry Severity Level</label>
                <select value={formSeverity} onChange={e => setFormSeverity(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm transition-colors">
                  <option value="1">Level 1 - Informational / Standard Notice</option>
                  <option value="2">Level 2 - Routine Actions Required</option>
                  <option value="3">Level 3 - Critical Conflict Action Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Notes / Description Context</label>
                <textarea rows="2" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Provide optional notes or background context..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm transition-colors resize-none"></textarea>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl shadow transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Save to Network View
              </button>
            </form>
          </div>
        </div>

        {/* Right Side Telemetry Feed Monitor Display Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold tracking-tight capitalize">{activeTab.replace('-', ' ')} Feed Stream</h2>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-slate-400">
                Loaded items: {events.length}
              </span>
            </div>

            {/* Matrix Operational Loader Loop */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-400 font-mono">Running Dynamic Cache Parse...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <Clock className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-slate-300 font-medium">No system entries found for this segment.</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">If this tab relies on internal cache, confirm that your configuration strings are parsed correctly inside server variables.</p>
              </div>
            ) : (
<div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
    {events
      .filter(event => {
        if (activeTab === 'combined') return true;
        return String(event.calendar).toLowerCase() === String(activeTab).toLowerCase();
      })
      .map((event, idx) => (
                  <div key={event.id || idx} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group">
                    {/* Left color bar decorator mapping */}
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: event.color || '#6366f1' }}></div>
                    
                    <div className="space-y-1 pl-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-100 text-sm group-hover:text-white transition-colors">{event.title}</h4>
                        {event.isExternal && (
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">Live Feed</span>
                        )}
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">{event.calendar}</span>
                      </div>
                      {event.description && (
                        <p className="text-xs text-slate-400 font-normal line-clamp-2 max-w-xl">{event.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 sm:text-right pl-2 sm:pl-0">
                      <div className="font-mono text-xs text-slate-400 space-y-0.5">
                        <div className="font-bold text-slate-300">{new Date(event.start).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className="text-slate-500">{new Date(event.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sticky Bottom Navigation Module - Optimized for Mobile Viewports */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 flex items-center justify-around md:hidden z-50 shadow-2xl">
        {[
          { id: 'combined', label: 'All', icon: Layers },
          { id: 'zoe', label: 'Zoe', icon: Heart },
          { id: 'work', label: 'Work', icon: Briefcase },
          { id: 'school', label: 'School', icon: BookOpen },
          { id: 'kids-logs', label: 'Issues', icon: AlertTriangle }
        ].map(tab => {
          const IconComponent = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all min-w-[64px] ${isSelected ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-slate-400 font-medium'}`}>
              <IconComponent className={`w-5 h-5 ${isSelected ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
