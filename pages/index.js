import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, LogOut, CheckCircle, Layers, CheckSquare, Trash2, LayoutDashboard, FileText, FileDown, AlertCircle } from 'lucide-react';

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
      if (!res.ok) throw new Error(data.error || "Authentication refused.");
      
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
        
        setZoeEvents(rawFeedData.filter(e => e.domain === 'zoe' || e.calendar === 'zoe'));
        setWorkEvents(rawFeedData.filter(e => e.domain === 'work' || e.calendar === 'work'));
        setKidsLogs(rawFeedData.filter(e => e.domain === 'kids-logs' || e.calendar === 'kids-logs'));
        setLiamLifeEvents(rawFeedData.filter(e => e.domain === 'internal' || e.calendar === 'liam-life'));
        setSchoolEvents(rawFeedData.filter(e => e.domain === 'school' || e.calendar.includes('school')));
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
          title: formTitle, start: formStart, description: formDescription, calendar: formCalendar
        })
      });
      if (res.ok) {
        setFormTitle(''); setFormStart(''); setFormDescription('');
        fetchAllFeeds();
        setActivePage('dashboard');
      }
    } catch (err) { console.error("Event pipeline blocked:", err); }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Purge event record irreversibly from server database?")) return;
    try {
      const res = await fetch(`${API_BASE}/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAllFeeds();
    } catch (err) { console.error("Deletion route failed:", err); }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`${API_BASE}/reports/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Report generation processing failed.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-incident-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) { alert(err.message); }
  };

  const addTodo = (e) => {
    e.preventDefault(); if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now(), text: newTodo.trim(), completed: false }]);
    setNewTodo('');
  };
  const toggleTodo = (id) => setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTodo = (id) => setTodos(todos.filter(t => t.id !== id));

  let displayEvents = [];
  if (activeTab === 'zoe') displayEvents = zoeEvents;
  else if (activeTab === 'work') displayEvents = workEvents;
  else if (activeTab === 'school') displayEvents = schoolEvents;
  else if (activeTab === 'kids-logs') displayEvents = kidsLogs;
  else if (activeTab === 'liam-life') displayEvents = liamLifeEvents;
  else displayEvents = allEvents;

  const urgentHorizonEvents = allEvents.filter(e => {
    const timeDiff = new Date(e.start) - new Date();
    return timeDiff > 0 && timeDiff < 72 * 60 * 60 * 1000;
  }).slice(0, 3);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">GridNode Framework</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Core Management Access System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Operator Key Handle</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" placeholder="Username" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Security Access Token</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" placeholder="••••••••" />
            </div>
            {authError && <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 font-mono">{authError}</div>}
            <button type="submit" className="w-full bg-indigo-600 font-semibold py-3 px-4 rounded-xl text-sm tracking-wide text-white hover:bg-indigo-500 transition-all shadow-md">Authorize Terminal</button>
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
            <div className="p-2 bg-indigo-600/10 rounded-xl border border-indigo-500/20">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-base block tracking-tight">GridNode Terminal</span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Database Systems Live
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center bg-slate-950 border border-slate-800/80 p-1 rounded-xl">
            <button onClick={() => setActivePage('dashboard')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activePage === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Dashboard Hub</button>
            <button onClick={() => setActivePage('control-room')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activePage === 'control-room' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Log Core Room</button>
            <button onClick={() => setActivePage('todos')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activePage === 'todos' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Checklist Hub</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPDF} className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-indigo-400 rounded-xl transition-all shadow-sm flex items-center gap-1 text-xs font-medium">
              <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button onClick={handleLogout} className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition-all"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 flex-1">
        {activePage === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {[
                { id: 'combined', name: 'Master Stream', count: allEvents.length, color: 'border-indigo-500/30' },
                { id: 'school', name: 'Abington School', count: schoolEvents.length, color: 'border-sky-500/30 text-sky-400' },
                { id: 'liam-life', name: 'Liam Focus', count: liamLifeEvents.length, color: 'border-amber-500/30 text-amber-400' },
                { id: 'zoe', name: 'Zoe Stream', count: zoeEvents.length, color: 'border-rose-500/30 text-rose-400' },
                { id: 'work', name: 'Work Ops', count: workEvents.length, color: 'border-emerald-500/30 text-emerald-400' },
                { id: 'kids-logs', name: 'Child Logs', count: kidsLogs.length, color: 'border-orange-500/30 text-orange-400' }
              ].map(stat => (
                <button key={stat.id} onClick={() => setActiveTab(stat.id)} className={`bg-slate-900 border ${stat.color} rounded-2xl p-4 text-left transition-all hover:scale-[1.02] relative overflow-hidden shadow-md ${activeTab === stat.id ? 'ring-2 ring-indigo-500/50 bg-slate-800' : ''}`}>
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 truncate">{stat.name}</span>
                  <span className="block text-2xl font-black font-mono mt-1">{stat.count}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-xl flex flex-col min-h-[550px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-base font-bold tracking-tight uppercase font-mono">{activeTab.replace('-', ' ')} Feed Matrix</h2>
                    </div>
                    <button onClick={fetchAllFeeds} className="text-xs font-mono text-indigo-400 hover:underline">Force Sync</button>
                  </div>

                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-mono text-slate-500">Processing live cache...</p>
                    </div>
                  ) : displayEvents.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950/30 border border-dashed border-slate-800 rounded-2xl">
                      <Clock className="w-8 h-8 text-slate-700 mb-2" />
                      <p className="text-xs font-medium text-slate-400">No logs present on this metric vector filter.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                      {displayEvents.map((event) => (
                        <div key={event.id} className="p-4 bg-slate-950 border border-slate-800/60 rounded-xl relative overflow-hidden group shadow-sm flex items-start justify-between gap-4">
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: event.color }}></div>
                          <div className="pl-2 space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <h4 className="font-bold text-sm text-slate-100">{event.title}</h4>
                              <span className="text-[9px] font-mono uppercase bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                                {event.calendar}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              <span className="text-slate-300 font-semibold">{new Date(event.start).toLocaleDateString()}</span> @ {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            {event.description && <p className="text-xs text-slate-400 pt-1 leading-relaxed">{event.description}</p>}
                          </div>
                          {event.domain !== 'school' && (
                            <button onClick={() => handleDeleteEvent(event.id)} className="text-slate-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                  <h3 className="text-xs font-bold uppercase font-mono text-indigo-400 tracking-wider flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> High Horizon Alerts (72h)</h3>
                  {urgentHorizonEvents.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic bg-slate-950 p-3 rounded-xl border border-slate-800/40">Horizon stable.</p>
                  ) : (
                    <div className="space-y-2">
                      {urgentHorizonEvents.map((rem, i) => (
                        <div key={i} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs space-y-1">
                          <div className="font-bold text-slate-200 truncate">{rem.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono uppercase truncate">{rem.calendar} • {new Date(rem.start).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5" /> Quick Execution Stack</h3>
                  </div>
                  <div className="space-y-1.5">
                    {todos.slice(0, 3).map(todo => (
                      <div key={todo.id} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/60 rounded-xl text-xs">
                        <span className={`truncate ${todo.completed ? 'line-through text-slate-600' : 'text-slate-300'}`}>{todo.text}</span>
                        <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} className="rounded border-slate-800 bg-slate-950 text-indigo-600 w-3.5 h-3.5 shrink-0 focus:ring-0" />
                      </div>
                    ))}
                    <button onClick={() => setActivePage('todos')} className="text-[10px] font-bold font-mono text-indigo-400 tracking-wider hover:text-indigo-300 block pt-1">EXPAND CHECKLIST HUB →</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePage === 'control-room' && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-400" /> Log Registry Entry</h2>
              <p className="text-xs text-slate-400 mt-0.5">Inject verified track items straight through custom internal database streams.</p>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Event Label Header</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Work Ops Task Metric" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Destination Stream</label>
                  <select value={formCalendar} onChange={e => setFormCalendar(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none">
                    <option value="work">Corporate Operations Feed (Work)</option>
                    <option value="zoe">Zoe's Main Sync Stream</option>
                    <option value="kids-logs">Child Logs (Internal Matrix Tracker)</option>
                    <option value="liam-life">Liam's Core Life Actions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Timeline Action Stamp</label>
                  <input type="datetime-local" value={formStart} onChange={e => setFormStart(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Extended Descriptive Logs</label>
                <textarea rows="4" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Provide contextual parameters explicitly..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none resize-none"></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setActivePage('dashboard')} className="w-1/3 bg-slate-950 border border-slate-800 text-slate-400 font-semibold py-3 rounded-xl text-sm">Cancel</button>
                <button type="submit" className="w-2/3 bg-indigo-600 text-white font-semibold py-3 rounded-xl text-sm shadow-lg hover:bg-indigo-500 transition-all">Commit Entry to Core Database</button>
              </div>
            </form>
          </div>
        )}

        {activePage === 'todos' && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2"><CheckSquare className="w-5 h-5 text-indigo-400" /> System Action Item Checklist</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage custom execution scripts locally outside tracking timelines.</p>
            </div>
            <form onSubmit={addTodo} className="flex gap-2">
              <input type="text" value={newTodo} onChange={e => setNewTodo(e.target.value)} placeholder="Add new actionable target entry..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-200" />
              <button type="submit" className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all"><Plus className="w-5 h-5" /></button>
            </form>
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {todos.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center">Active task configuration layers completely empty.</p>
              ) : (
                todos.map(todo => (
                  <div key={todo.id} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800/60 rounded-xl gap-3">
                    <button onClick={() => toggleTodo(todo.id)} className={`flex items-center gap-3 text-sm font-semibold text-left transition-all ${todo.completed ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${todo.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 bg-slate-900'}`}>{todo.completed && <CheckCircle className="w-3 h-3 stroke-[3]" />}</div>
                      <span className="break-all">{todo.text}</span>
                    </button>
                    <button onClick={() => deleteTodo(todo.id)} className="text-slate-500 hover:text-rose-400 p-1 shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2.5 flex items-center justify-around md:hidden z-50 shadow-2xl">
        {[
          { id: 'dashboard', label: 'Monitor Hub', icon: LayoutDashboard },
          { id: 'control-room', label: 'Add Entry', icon: Plus },
          { id: 'todos', label: 'Checklist', icon: CheckSquare }
        ].map(page => {
          const IconComponent = page.icon;
          const isSelected = activePage === page.id;
          return (
            <button key={page.id} onClick={() => setActivePage(page.id)} className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-2xl min-w-[64px] transition-all ${isSelected ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-slate-400'}`}>
              <IconComponent className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide">{page.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
