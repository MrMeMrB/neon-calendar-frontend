import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import FullCalendar to completely bypass Next.js Server-Side Rendering (SSR)
const FullCalendarComponent = dynamic(
  () => import('@fullcalendar/react'),
  { ssr: false }
);

// Dynamically import plugins to prevent "document/window is not defined" server-side crashes
const dayGridPlugin = dynamic(() => import('@fullcalendar/daygrid'), { ssr: false });
const timeGridPlugin = dynamic(() => import('@fullcalendar/timegrid'), { ssr: false });
const interactionPlugin = dynamic(() => import('@fullcalendar/interaction'), { ssr: false });

// Linked to your live Render backend Web Service
const BACKEND_API = "https://calendar-backend-dzdp.onrender.com"; 

export default function App() {
  const [events, setEvents] = useState([]);
  const [currentCal, setCurrentCal] = useState('combined');
  const [notes, setNotes] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Modal State Machines
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDomain, setFormDomain] = useState('combined');
  const [formSentiment, setFormSentiment] = useState('neutral');
  
  // Safe default initialization for Next.js SSR
  const [isMobile, setIsMobile] = useState(false);
  const [pluginsLoaded, setPluginsLoaded] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    setPluginsLoaded(true);
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
      console.error("Data tracking link dropped:", err);
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
      } else {
        alert('Data fetched, but parse engine threw an error. Check server logs.');
      }
    } catch (err) {
      alert('External connection line timeout.');
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
    if (!window.confirm("Are you sure you want to permanently delete this event block from the database?")) return;
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

  if (isLoading || !pluginsLoaded) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center', background: '#070a12' }}>
        <div style={{ width: '60px', height: '60px', border: '4px solid #111b2d', borderTopColor: '#00f0ff', borderRadius: '50%', animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: '#070a12', color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' }}>
      
      {/* SIDEBAR DASHBOARD DISPLAY */}
      <div style={{ width: isMobile ? '100%' : '380px', background: '#0b1325', borderRight: '1px solid #1a2942', padding: '28px', display: 'flex', flexDirection: 'column', gap: '28px', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#00f0ff', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>Workspace Hub</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '6px 0 0 0', fontWeight: '500' }}>Operational Management Network</p>
        </div>

        <button 
          onClick={handleTriggerSync} 
          disabled={isSyncing} 
          style={{ width: '100%', padding: '16px', background: isSyncing ? '#1e293b' : 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', color: isSyncing ? '#64748b' : '#070a12', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: isSyncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: isSyncing ? 'none' : '0 4px 20px rgba(0,240,255,0.25)', transition: 'transform 0.2s' }}
        >
          {isSyncing && <div style={{ width: '14px', height: '14px', border: '2px solid #070a12', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
          {isSyncing ? "Syncing Grid Modules..." : "⚡ Force Sync Pipelines"}
        </button>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '10px', letterSpacing: '1px' }}>System Domain Filters</label>
          <select value={currentCal} onChange={(e) => setCurrentCal(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', outline: 'none' }}>
            <option value="combined">Combined Systems Grid</option>
            <option value="work">Work Operations</option>
            <option value="family">Family Framework</option>
            <option value="kids-logs">Kids Behavioral Stream</option>
          </select>
        </div>

        <button onClick={() => setIsModalOpen(true)} style={{ width: '100%', padding: '14px', background: '#111b2d', color: '#00f0ff', border: '1px solid #1a2942', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>+ Manual Metric Log Entry</button>

        <hr style={{ borderColor: '#1a2942', margin: 0 }} />

        {/* AI TRIAGE MANAGEMENT DRAWER */}
        <div>
          <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#475569', margin: '0 0 14px 0', letterSpacing: '1px', fontWeight: '800' }}>AI Triage Matrix Review</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            {events.filter(e => e.isUnverified).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#475569', margin: 0, fontStyle: 'italic' }}>No pending stream anomalies flagged.</p>
            ) : (
              events.filter(e => e.isUnverified).map(ev => (
                <div key={ev.id} style={{ padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', borderLeft: '4px solid #ff0055' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#f1f5f9' }}>{ev.title}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleVerifyKid(ev.id, 'verified_kid')} style={{ flex: 1, padding: '8px', background: '#00ff66', border: 'none', borderRadius: '6px', color: '#070a12', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>Approve</button>
                    <button onClick={() => handleVerifyKid(ev.id, 'blocked')} style={{ flex: 1, padding: '8px', background: '#ff0055', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>Purge</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SYSTEM SCRATCHPAD ENGINE */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '180px' }}>
          <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#475569', margin: 0, letterSpacing: '1px', fontWeight: '800' }}>System Scratchpad</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ flex: 1, width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', color: '#fff', fontSize: '14px', resize: 'none', lineHeight: '1.6', boxSizing: 'border-box', outline: 'none' }} placeholder="Commit secondary notes here..." />
          <button onClick={handleSaveNotes} style={{ width: '100%', padding: '14px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Save Scratchpad Frame</button>
        </div>
      </div>

      {/* CORE CALENDAR GRID FRAME */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '36px', boxSizing: 'border-box', height: isMobile ? 'auto' : '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '28px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '20px', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <FullCalendarComponent
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
              let neonColor = '#64748b';
              if (ext.calendar === 'work') neonColor = '#00f0ff';
              if (ext.calendar === 'family') neonColor = '#00ff66';
              if (ext.calendar === 'kids-logs') {
                neonColor = ext.sentiment === 'positive' ? '#00ff66' : ext.sentiment === 'negative' ? '#ff0055' : '#ffaa00';
              }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 6px', fontSize: '12px', color: '#fff', overflow: 'hidden', background: 'rgba(7,10,18,0.4)', borderRadius: '6px', borderLeft: `3px solid ${neonColor}` }}>
                  <b style={{ opacity: 0.9, whiteSpace: 'nowrap', color: neonColor }}>{info.timeText}</b>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>{info.event.title}</span>
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* POPUP ACTION MODAL: DRILLDOWN EVENT INSPECTOR */}
      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px', boxSizing: 'border-box', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '500px', padding: '32px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '20px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', padding: '6px 12px', background: '#111b2d', border: '1px solid #1a2942', borderRadius: '8px', color: '#00f0ff', letterSpacing: '0.5px' }}>{selectedEvent.calendar} Domain</span>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '24px' }}>&times;</button>
            </div>
            <h2 style={{ margin: '0 0 14px 0', fontSize: '24px', fontWeight: '800', color: '#fff' }}>{selectedEvent.title}</h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', margin: '0 0 28px 0', lineHeight: '1.7' }}>{selectedEvent.description || "No alternative descriptive logs available inside this tracking block."}</p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ padding: '14px 24px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Close Frame</button>
              <button onClick={() => handleDeleteEvent(selectedEvent.id)} style={{ padding: '14px 24px', background: '#ff0055', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255,0,85,0.2)' }}>Delete Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP ACTION MODAL: INJECT DATA METRIC */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9998, padding: '16px', boxSizing: 'border-box', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '540px', padding: '32px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '20px', boxSizing: 'border-box' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '800', color: '#00f0ff' }}>Log System Entry Metric</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: 8, fontWeight: '700', textTransform: 'uppercase' }}>Event Identity Label</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none' }} required />
              </div>
              <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: 8, fontWeight: '700', textTransform: 'uppercase' }}>Timeline Start Marker</label>
                  <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none' }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: 8, fontWeight: '700', textTransform: 'uppercase' }}>Timeline End Marker</label>
                  <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: 8, fontWeight: '700', textTransform: 'uppercase' }}>Allocation Sector Domain</label>
                <select value={formDomain} onChange={(e) => setFormDomain(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                  <option value="combined">Combined Systems</option>
                  <option value="work">Work Space Operations</option>
                  <option value="family">Family Framework Grid</option>
                  <option value="kids-logs">Kids Behavioral Stream</option>
                </select>
              </div>
              {formDomain === 'kids-logs' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: 8, fontWeight: '700', textTransform: 'uppercase' }}>Sentiment Axis Tracker</label>
                  <select value={formSentiment} onChange={(e) => setFormSentiment(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                    <option value="neutral">Neutral Balance</option>
                    <option value="positive">Positive Vector</option>
                    <option value="negative">Negative Exception Entry</option>
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: 8, fontWeight: '700', textTransform: 'uppercase' }}>Context Description Log Summary</label>
                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', color: '#fff', fontSize: '14px', resize: 'none', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '14px 24px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '12px', cursor: 'pointer' }}>Cancel Action</button>
                <button type="submit" style={{ padding: '14px 24px', background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', color: '#070a12', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,240,255,0.2)' }}>Inject Data Module</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .fc-theme-standard td, .fc-theme-standard th { border: 1px solid #111b2d !important; }
        .fc .fc-button-primary { background: #070a12 !important; border: 1px solid #1a2942 !important; color: #fff !important; font-weight: 700 !important; border-radius: 8px !important; text-transform: capitalize; padding: 8px 14px !important; }
        .fc .fc-button-primary:hover { background: #111b2d !important; border-color: #00f0ff !important; }
        .fc .fc-button-active { background: #00f0ff !important; color: #070a12 !important; font-weight: 800 !important; }
        .fc .fc-toolbar-title { color: #fff !important; font-weight: 900 !important; font-size: 20px !important; text-transform: uppercase; letter-spacing: -0.5px; }
        .fc-day-today { background: rgba(0,240,255,0.03) !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #070a12; }
        ::-webkit-scrollbar-thumb { background: #1a2942; border-radius: 10px; }
      `}</style>
    </div>
  );
}
