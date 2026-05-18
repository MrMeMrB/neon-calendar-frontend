import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Calendar, Layers, LogOut, CheckSquare, Clipboard, FileText, AlertTriangle, ArrowRight } from 'lucide-react';

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

// FullCalendar Dynamic Dependency Loader Setup
const CalendarWrapper = dynamic(() => Promise.all([
  import('@fullcalendar/react'),
  import('@fullcalendar/daygrid'),
  import('@fullcalendar/timegrid'),
  import('@fullcalendar/interaction')
]).then(([FullCalendar, dayGrid, timeGrid, interaction]) => {
  return function Component({ events, isMobile, handleDateSelect, setSelectedEvent, currentCal }) {
    
    // RIGID CLIENT-SIDE DOMAIN FILTER (FIXES STREAM CLUMPING) FROM PATCH DIFF
    const filteredEvents = events.filter(event => {
      if (currentCal === 'combined') return true;
      if (currentCal === 'public-gcal') return event.calendar === 'public-gcal';
      
      // Allow local entries matching the calendar OR external live feed items injected into this stream
      return event.calendar === currentCal || (event.isExternal && event.originCalendar === currentCal);
    });

    return (
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
        select={handleDateSelect}
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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
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
    } catch (err) { console.error("Sync pipeline drop:", err); }
    finally { setIsLoading.populate = false; setIsLoading(false); }
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
      } else { alert(data.error); }
    } catch (err) { console.error(err); }
  };

  // CLIENT METHOD TO COPIATE EXTERNAL CORRESPONDENCE OR OTHER EVENTS INTO LIAM-LIFE HUB
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
      <div style={{ minHeight: '100vh', background: '#070a13', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#fff' }}>
        <form onSubmit={handleLogin} style={{ background: '#0e1726', padding: '40px', borderRadius: '12px', border: '1px solid #1e293b', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#38bdf8' }}>GridNode Secure Log</h2>
          <input type="text" placeholder="Operator Name" value={username} onChange={e => setUsername(e.target.value)} style={{ padding: '12px', background: '#070a13', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} />
          <input type="password" placeholder="Passphrase" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px', background: '#070a13', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} />
          <button type="submit" style={{ padding: '12px', background: '#2563eb', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Authenticate</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#070a12', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* HEADER CONTROL TERMINAL */}
      <header style={{ background: '#0b1325', borderBottom: '1px solid #1a2942', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers style={{ color: '#00f0ff' }} />
          <span style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>GRIDNODE WORKSPACE PLATFORM</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          {['combined', 'work', 'zoe', 'kids-logs', 'liam-life', 'public-gcal'].map(cal => (
            <button key={cal} onClick={() => setCurrentCal(cal)} style={{ padding: '6px 12px', background: currentCal === cal ? '#1e293b' : '#070a12', border: currentCal === cal ? '1px solid #38bdf8' : '1px solid #1a2942', borderRadius: '6px', color: '#fff', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', cursor: 'pointer' }}>
              {cal.replace('-', ' ')}
            </button>
          ))}
          <button onClick={() => { localStorage.clear(); setToken(''); }} style={{ background: '#991b1b', border: 'none', borderRadius: '6px', padding: '6px', color: '#fff', cursor: 'pointer' }}><LogOut size={14} /></button>
        </div>
      </header>

      {/* MAIN VIEWPORT - KEY PROP FORCED RESET ACTIVATED HERE */}
      <div className="no-print" style={{ flex: 1, padding: isMobile ? '12px' : '24px', display: 'flex', gap: '20px', minWidth: 0 }}>
        <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <div style={{ margin: 'auto', fontSize: '12px', fontFamily: 'mono', color: '#64748b' }}>Refreshing localized feed nodes...</div>
          ) : (
            <CalendarWrapper events={events} isMobile={isMobile} handleDateSelect={null} setSelectedEvent={setSelectedEvent} currentCal={currentCal} />
          )}
        </div>

        {/* METRIC PROPERTY DATA INSPECTOR SIDEBAR */}
        {selectedEvent && (
          <div style={{ width: '320px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#00f0ff', fontSize: '15px' }}>{selectedEvent.title}</h4>
            <span style={{ display: 'inline-block', padding: '2px 6px', background: '#1e293b', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>Domain: {selectedEvent.calendar}</span>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>{selectedEvent.description || 'No descriptive summary added.'}</p>
            
            {selectedEvent.calendar === 'kids-logs' && (
              <div style={{ fontSize: '11px', background: '#070a12', padding: '8px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #1a2942' }}>
                <div><strong>Location:</strong> {selectedEvent.metricLocation || 'Unspecified'}</div>
                <div><strong>Severity Assessment:</strong> Lv {selectedEvent.metricSeverity || 0}</div>
              </div>
            )}

            {/* DYNAMIC UTILITY LINK FROM DIFF: TRANSFER REFERENCE ENTRY INTO LIAM-LIFE */}
            {selectedEvent.calendar !== 'liam-life' && (
              <button 
                onClick={() => handleCopyToLifeHub(selectedEvent)}
                style={{ width: '100%', padding: '8px', background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}
              >
                📋 COPY TO LIFE HUB
              </button>
            )}

            <button onClick={() => setSelectedEvent(null)} style={{ width: '100%', padding: '6px', background: '#1a2942', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '12px', marginTop: 'auto' }}>Dismiss Pane</button>
          </div>
        )}
      </div>
    </div>
  );
}
