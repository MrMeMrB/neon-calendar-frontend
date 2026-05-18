import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Calendar, Layers, LogOut, CheckSquare, Clipboard, FileText, AlertTriangle, ChevronRight } from 'lucide-react';

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

// FullCalendar Advanced Structural Loader Configuration Wrapper
const CalendarWrapper = dynamic(() => Promise.all([
  import('@fullcalendar/react'),
  import('@fullcalendar/daygrid'),
  import('@fullcalendar/timegrid'),
  import('@fullcalendar/interaction')
]).then(([FullCalendar, dayGrid, timeGrid, interaction]) => {
  return function Component({ events, isMobile, setSelectedEvent, currentCal }) {
    
    // RIGID CLIENT-SIDE DOMAIN FILTER (FIXES STREAM CLUMPING FROM PATCH DIFF)
    const filteredEvents = events.filter(event => {
      if (currentCal === 'combined') return true;
      if (currentCal === 'public-gcal') return event.calendar === 'public-gcal';
      
      // Asserts path parameters for both internal properties and incoming scraped items
      return event.calendar === currentCal || (event.isExternal && event.originCalendar === currentCal);
    });

    return (
      <div className="fullcalendar-custom-theme-container" style={{ width: '100%', height: '100%', color: '#fff' }}>
        <style>{`
          .fc .fc-button-primary { background-color: #1e293b !important; border-color: #334155 !important; font-size: 11px !important; text-transform: uppercase !important; font-weight: 700 !important; }
          .fc .fc-button-primary:hover { background-color: #334155 !important; }
          .fc .fc-button-active { background-color: #2563eb !important; border-color: #3b82f6 !important; }
          .fc th { background-color: #0f172a !important; padding: 8px 0 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; color: #94a3b8 !important; }
          .fc td { background: #070a12 !important; border: 1px solid #1e293b !important; }
          .fc-theme-standard .fc-scrollgrid { border: 1px solid #1e293b !important; }
          .fc .fc-daygrid-day-number { font-size: 12px !important; font-family: monospace !important; color: #cbd5e1 !important; padding: 6px !important; }
          .fc-event { border: none !important; padding: 2px 4px !important; border-radius: 4px !important; cursor: pointer !important; }
          .fc-daygrid-event-dot { border-color: #38bdf8 !important; }
        `}</style>
        <FullCalendar.default
          plugins={[dayGrid.default, timeGrid.default, interaction.default]}
          initialView={isMobile ? 'timeGridDay' : 'dayGridMonth'}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: isMobile ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={filteredEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          eventClick={(info) => {
            const props = info.event.extendedProps;
            setSelectedEvent({
              id: info.event.id, 
              title: info.event.title,
              start: info.event.startStr || info.event.start, 
              end: info.event.endStr || info.event.end,
              description: props.description || '', 
              calendar: props.calendar || currentCal, 
              isExternal: props.isExternal || false,
              metricSentiment: props.metricSentiment, 
              metricLocation: props.metricLocation, 
              metricSeverity: props.metricSeverity
            });
          }}
        />
      </div>
    );
  };
}), { ssr: false });

export default function App() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [events, setEvents] = useState([]);
  const [currentCal, setCurrentCal] = useState('combined');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const savedToken = localStorage.getItem('matrix_token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token) fetchAllData();
  }, [token, currentCal]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCal}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) { 
      console.error("Data pipeline dropped connection error:", err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('matrix_token', data.token);
        setToken(data.token);
      } else { 
        alert(data.error || "Authentication error encountered."); 
      }
    } catch (err) { 
      console.error(err); 
    }
  };

  // CLIENT METHOD TO COPIATE EXTERNAL CORRESPONDENCE OR OTHER EVENTS INTO LIAM-LIFE HUB (MATCHES DIFF EXACTLY)
  const handleCopyToLifeHub = async (eventToCopy) => {
    try {
      const payload = {
        title: `[Copy] ${eventToCopy.title}`,
        start: eventToCopy.start,
        end: eventToCopy.end || null,
        description: eventToCopy.description || 'Copied from system stream.',
        calendar: 'liam-life',
        metricSentiment: null,
        metricLocation: null,
        metricSeverity: 0
      };

      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSelectedEvent(null);
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed to copy event to life hub matrix container:", err);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: '#f8fafc', padding: '16px' }}>
        <form onSubmit={handleLogin} style={{ background: '#0f172a', padding: '36px', borderRadius: '16px', border: '1px solid #1e293b', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 4px 0', color: '#38bdf8', fontSize: '20px', letterSpacing: '-0.5px' }}>GRIDNODE MATRIX SECURITY</h2>
            <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>Identity Access Terminal</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Operator Identity</label>
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required style={{ padding: '12px', background: '#020617', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Security Key Phrase</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', background: '#020617', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }} />
          </div>
          <button type="submit" style={{ padding: '14px', background: '#2563eb', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', marginTop: '6px', transition: 'background 0.2s' }}>Execute Authentication</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#020617', color: '#f1f5f9', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* HEADER CONTROLS INTERFACE BAR */}
      <header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '6px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px' }}>
            <Layers size={18} style={{ color: '#38bdf8' }} />
          </div>
          <div>
            <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '0.05em', block: 'block', color: '#fff' }}>GRIDNODE WORKSPACE PLATFORM</span>
            <span style={{ display: 'block', fontSize: '9px', color: '#22c55e', fontFamily: 'monospace' }}>● SYSTEMS ENFORCED</span>
          </div>
        </div>

        {/* CALENDAR CATEGORY TOGGLE SELECTORS */}
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[
            { id: 'combined', label: 'Master View' },
            { id: 'work', label: 'Work Ops' },
            { id: 'zoe', label: 'Zoe Stream' },
            { id: 'kids-logs', label: 'Child Logs' },
            { id: 'liam-life', label: 'Liam Focus' }
          ].map(cal => (
            <button key={cal.id} onClick={() => setCurrentCal(cal.id)} style={{ padding: '8px 14px', background: currentCal === cal.id ? '#1e293b' : '#020617', border: currentCal === cal.id ? '1px solid #38bdf8' : '1px solid #1e293b', borderRadius: '8px', color: currentCal === cal.id ? '#38bdf8' : '#cbd5e1', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
              {cal.label}
            </button>
          ))}
          <button onClick={() => { localStorage.clear(); setToken(''); }} style={{ background: '#7f1d1d', border: '1px solid #b91c1c', borderRadius: '8px', padding: '8px 12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Log out of Terminal Session"><LogOut size={13} /></button>
        </div>
      </header>

      {/* WORKSPACE CONTENT ARRAYS */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '20px', display: 'flex', gap: '16px', overflow: 'hidden', minWidth: 0 }}>
        
        {/* CALENDAR ENGINE CANVAS CONTAINER */}
        <div style={{ flex: 1, padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)' }}>
          {isLoading ? (
            <div style={{ margin: 'auto', fontSize: '11px', fontFamily: 'monospace', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', border: '2px solid #38bdf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Synchronizing stream channels...
            </div>
          ) : (
            <CalendarWrapper events={events} isMobile={isMobile} setSelectedEvent={setSelectedEvent} currentCal={currentCal} />
          )}
        </div>

        {/* METRIC SPECIFIC ELEMENT SIDEBAR INSPECTOR */}
        {selectedEvent && (
          <div style={{ width: '320px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease-out' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '6px' }}>
                <span>Calendar Matrix</span> <ChevronRight size={10} /> <span style={{ color: '#38bdf8' }}>{selectedEvent.calendar}</span>
              </div>
              <h4 style={{ margin: '0', color: '#fff', fontSize: '16px', fontWeight: '800', tracking: '-0.3px' }}>{selectedEvent.title}</h4>
            </div>

            <div style={{ background: '#020617', border: '1px solid #1e293b', padding: '12px', borderRadius: '10px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', spaceBetween: '4px' }}>
              <div><strong>START:</strong> {new Date(selectedEvent.start).toLocaleString()}</div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '700' }}>Logged Notes</label>
              <p style={{ margin: '0', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', background: '#020617/50', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b/40' }}>{selectedEvent.description || 'No descriptive summary added.'}</p>
            </div>
            
            {/* CONDITIONAL COMPONENT EVALUATION LOOP FOR FAMILY METRIC ARRAYS */}
            {selectedEvent.calendar === 'kids-logs' && (
              <div style={{ fontSize: '11px', background: 'rgba(249,115,22,0.05)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ color: '#f97316', fontWeight: '700', textTransform: 'uppercase', fontSize: '9px', tracking: '0.05em', marginBottom: '2px' }}>Incident Parameters</div>
                <div><strong style={{ color: '#cbd5e1' }}>Location Context:</strong> {selectedEvent.metricLocation || 'Unspecified'}</div>
                <div><strong style={{ color: '#cbd5e1' }}>Severity Metrics:</strong> Level {selectedEvent.metricSeverity || 0}</div>
              </div>
            )}

            {/* DYNAMIC UTILITY TRADING ROUTE BLOCK */}
            {selectedEvent.calendar !== 'liam-life' && (
              <button 
                onClick={() => handleCopyToLifeHub(selectedEvent)}
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'opacity 0.2s', shadow: '0 4px 12px rgba(22,163,74,0.2)' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <Clipboard size={14} /> COPY TO LIFE HUB
              </button>
            )}

            <button onClick={() => setSelectedEvent(null)} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>Dismiss Inspection Pane</button>
          </div>
        )}
      </div>
    </div>
  );
}
