import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// CRITICAL: Point this to your live Render backend URL when you deploy
const BACKEND_API = "http://localhost:5001"; 

function App() {
  const [events, setEvents] = useState([]);
  const [currentCal, setCurrentCal] = useState('combined');
  const [notes, setNotes] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Modal Form Tracking
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDomain, setFormDomain] = useState('combined');
  const [formSentiment, setFormSentiment] = useState('neutral');
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const calendarRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchAllData = async () => {
    try {
      const t = new Date().getTime();
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCal}&t=${t}`);
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
      
      const notesRes = await fetch(`${BACKEND_API}/api/general-notes`);
      const notesData = await notesRes.json();
      setNotes(notesData.content || '');
    } catch (err) {
      console.error("Data tracking node dropped connection:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentCal]);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${BACKEND_API}/api/sync-external`, { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
        alert('All subscription streams successfully mapped and saved!');
      }
    } catch (err) {
      alert('External sync routine timed out.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formTitle || !formStart) return alert("Title and Start values required.");
    try {
      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          start: formStart,
          end: formEnd || null,
          description: formDesc,
          calendar: formDomain,
          sentiment: formSentiment
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormTitle(''); setFormStart(''); setFormEnd(''); setFormDesc('');
        fetchAllData();
      }
    } catch (err) {}
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this event block?")) return;
    try {
      const res = await fetch(`${BACKEND_API}/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedEvent(null);
        fetchAllData();
      }
    } catch (err) {}
  };

  const handleVerifyKid = async (id, action) => {
    try {
      const res = await fetch(`${BACKEND_API}/api/events/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, status: action })
      });
      if (res.ok) fetchAllData();
    } catch (err) {}
  };

  const handleSaveNotes = async () => {
    try {
      const res = await fetch(`${BACKEND_API}/api/general-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: notes })
      });
      if (res.ok) alert('Scratchpad text pinned successfully.');
    } catch (err) {}
  };

  const handleDateSelect = (selectInfo) => {
    const pad = (num) => String(num).padStart(2, '0');
    const d = selectInfo.start;
    setFormStart(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setFormEnd('');
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center', background: '#090d16' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid #1e293b', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      
      {/* SIDEBAR NAVIGATION CONTROL PANEL */}
      <div style={{ width: isMobile ? '100%' : '360px', background: '#111827', borderRight: '1px solid #22314d', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#38bdf8', letterSpacing: '-0.5px' }}>Workspace Hub</h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>Professional Management Console</p>
        </div>

        <button 
          onClick={handleTriggerSync} 
          disabled={isSyncing} 
          style={{ width: '100%', padding: '14px', background: isSyncing ? '#334155' : '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s' }}
        >
          {isSyncing && <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
          {isSyncing ? "Syncing Pipelines..." : "🔄 Force Refresh Feeds"}
        </button>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Active Workspace Filter</label>
          <select value={currentCal} onChange={(e) => setCurrentCal(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0b111e', border: '1px solid #22314d', borderRadius: '10px', color: '#fff', fontSize: '15px', cursor: 'pointer' }}>
            <option value="combined">Combined Systems Grid</option>
            <option value="work">Work Operations</option>
            <option value="family">Family Framework</option>
            <option value="kids-logs">Kids Behavioral Stream</option>
          </select>
        </div>

        <button onClick={() => setIsModalOpen(true)} style={{ width: '100%', padding: '12px', background: '#22314d', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>+ Manual Log Entry</button>

        <hr style={{ borderColor: '#22314d', margin: 0 }} />

        {/* AI REVIEW TRIAGE PIPELINE */}
        <div>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 12px 0' }}>Gemini Exception Matrix Review</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
            {events.filter(e => e.isUnverified).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>No anomalies tracked inside current frame view.</p>
            ) : (
              events.filter(e => e.isUnverified).map(ev => (
                <div key={ev.id} style={{ padding: '12px', background: '#0b111e', border: '1px solid #22314d', borderRadius: '10px', borderLeft: '4px solid #ef4444', animation: 'slideIn 0.2s ease-out' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>{ev.title}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleVerifyKid(ev.id, 'verified_kid')} style={{ flex: 1, padding: '6px', background: '#10b981', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Approve</button>
                    <button onClick={() => handleVerifyKid(ev.id, 'blocked')} style={{ flex: 1, padding: '6px', background: '#ef4444', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Purge</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PERSISTENT SCRATCHPAD AUTOMATION */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '160px' }}>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>System Scratchpad</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ flex: 1, width: '100%', padding: '12px', background: '#0b111e', border: '1px solid #22314d', borderRadius: '10px', color: '#fff', fontSize: '14px', resize: 'none', lineHeight: '1.5', boxSizing: 'border-box' }} placeholder="Type log text details here..." />
          <button onClick={handleSaveNotes} style={{ width: '100%', padding: '12px', background: '#22314d', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Commit Scratchpad Data</button>
        </div>
      </div>

      {/* TIMELINE VISUAL DISPLAY CANVAS */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '32px', boxSizing: 'border-box', height: isMobile ? 'auto' : '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '24px', background: '#131c2e', border: '1px solid #22314d', borderRadius: '16px', boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? 'timeGridDay' : 'dayGridMonth'}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: isMobile ? 'timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay' }}
            events={events}
            height="100%"
            selectable={true}
            select={handleDateSelect}
            eventClick={(info) => {
              const props = info.event.extendedProps;
              setSelectedEvent({
                id: info.event.id,
                title: info.event.title,
                start: info.event.startStr,
                end: info.event.endStr,
                description: props.description,
                calendar: props.calendar,
                sentiment: props.sentiment
              });
            }}
            eventContent={(info) => {
              const ext = info.event.extendedProps;
              let dot = '#64748b';
              if (ext.calendar === 'work') dot = '#0284c7';
              if (ext.calendar === 'family') dot = '#10b981';
              if (ext.calendar === 'kids-logs') {
                dot = ext.sentiment === 'positive' ? '#10b981' : ext.sentiment === 'negative' ? '#ef4444' : '#f59e0b';
              }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px', fontSize: '12px', color: '#fff', overflow: 'hidden' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                  <b style={{ opacity: 0.8, whiteSpace: 'nowrap' }}>{info.timeText}</b>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.event.title}</span>
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* POPUP ACTION MODAL: DRILLDOWN EVENT INSPECTOR */}
      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(5,7,12,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '480px', padding: '28px', background: '#131c2e', border: '1px solid #22314d', borderRadius: '16px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', padding: '4px 8px', background: '#22314d', borderRadius: '6px', color: '#38bdf8' }}>{selectedEvent.calendar} Domain</span>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
            </div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', fontWeight: '700' }}>{selectedEvent.title}</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px 0', lineHeight: '1.6' }}>{selectedEvent.description || "No context summaries mapped into this operational data entry block."}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ padding: '12px 20px', background: '#22314d', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Close Window</button>
              <button onClick={() => handleDeleteEvent(selectedEvent.id)} style={{ padding: '12px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Purge Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP ACTION MODAL: LOG INPUT MATRIX */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(5,7,12,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9998, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '500px', padding: '28px', background: '#131c2e', border: '1px solid #22314d', borderRadius: '16px', boxSizing: 'border-box' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: '#38bdf8' }}>Log Action Metric Entry</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: 6 }}>Identity Label</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0b111e', border: '1px solid #22314d', borderRadius: '10px', color: '#fff', fontSize: '14px' }} required />
              </div>
              <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: 6 }}>Start Timeline Marker</label>
                  <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0b111e', border: '1px solid #22314d', borderRadius: '10px', color: '#fff', fontSize: '14px' }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: 6 }}>End Timeline Marker</label>
                  <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0b111e', border: '1px solid #22314d', borderRadius: '10px', color: '#fff', fontSize: '14px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: 6 }}>Target Workspace Sector</label>
                <select value={formDomain} onChange={(e) => setFormDomain(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0b111e', border: '1px solid #22314d', borderRadius: '10px', color: '#fff', fontSize: '14px' }}>
                  <option value="combined">Combined Hub</option>
                  <option value="work">Work Space</option>
                  <option value="family">Family Framework</option>
                  <option value="kids-logs">Kids Behavioral Streams</option>
                </select>
              </div>
              {formDomain === 'kids-logs' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: 6 }}>Sentiment Axis Evaluation</label>
                  <select value={formSentiment} onChange={(e) => setFormSentiment(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0b111e', border: '1px solid #22314d', borderRadius: '10px', color: '#fff', fontSize: '14px' }}>
                    <option value="neutral">Neutral Balance</option>
                    <option value="positive">Positive Vector</option>
                    <option value="negative">Negative Flag Event</option>
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: 6 }}>Context Details Summary</label>
                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', background: '#0b111e', border: '1px solid #22314d', borderRadius: '10px', color: '#fff', fontSize: '14px', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 20px', background: '#22314d', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '12px 20px', background: '#38bdf8', color: '#090d16', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Inject Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .fc-theme-standard td, .fc-theme-standard th { border: 1px solid #1f2c44 !important; }
        .fc .fc-button-primary { background: #111827 !important; border: 1px solid #22314d !important; color: #fff !important; font-weight: 600 !important; text-transform: capitalize; }
        .fc .fc-button-active { background: #38bdf8 !important; color: #090d16 !important; }
        .fc .fc-toolbar-title { color: #fff !important; font-weight: 700 !important; }
      `}</style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
