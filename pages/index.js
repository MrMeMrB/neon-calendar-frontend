import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const BACKEND_API = "http://localhost:5001";

export default function Home() {
  const [dbEvents, setDbEvents] = useState([]);
  const [currentCalendar, setCurrentCalendar] = useState('combined');
  const [generalNotes, setGeneralNotes] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCalendar, setNewCalendar] = useState('combined');
  const [newSentiment, setNewSentiment] = useState('neutral');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 960);

  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth < 960;
      setIsMobile(mobileView);
      if (mobileView) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchSavedEvents = async () => {
    try {
      const t = new Date().getTime();
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCalendar}&t=${t}`);
      const data = await res.json();
      if (Array.isArray(data)) setDbEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  const fetchGeneralNotes = async () => {
    try {
      const res = await fetch(`${BACKEND_API}/api/general-notes`);
      const data = await res.json();
      setGeneralNotes(data.content || '');
    } catch (err) {}
  };

  // Triggers live link ingestion down subscription assets
  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${BACKEND_API}/api/sync-external`, { method: 'POST' });
      if (res.ok) {
        await fetchSavedEvents();
        alert("All external iCal items synced successfully!");
      }
    } catch (err) {
      console.error("External sync engine crashed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchSavedEvents();
    fetchGeneralNotes();
  }, [currentCalendar]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newTitle || !newStart) return alert("Title and start fields required.");
    try {
      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, start: newStart, end: newEnd || null, description: newDescription, calendar: newCalendar, sentiment: newSentiment })
      });
      if (res.ok) {
        setNewTitle(''); setNewStart(''); setNewEnd(''); setNewDescription('');
        setIsModalOpen(false);
        fetchSavedEvents();
      }
    } catch (err) {}
  };

  const handleLearnStatus = async (eventId, status) => {
    try {
      const res = await fetch(`${BACKEND_API}/api/events/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, status })
      });
      if (res.ok) fetchSavedEvents();
    } catch (err) {}
  };

  const handleSaveGeneralNotes = async () => {
    try {
      await fetch(`${BACKEND_API}/api/general-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generalNotes })
      });
      alert("Notes saved.");
    } catch (err) {}
  };

  const handleDateSelect = (selectInfo) => {
    const pad = (num) => String(num).padStart(2, '0');
    const d = selectInfo.start;
    setNewStart(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setNewEnd('');
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      
      {/* MOBILE BAR */}
      {isMobile && (
        <div style={{ background: '#1e293b', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
          <h1 style={{ fontSize: '18px', margin: 0, color: '#38bdf8', fontWeight: 'bold' }}>Dashboard</h1>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ padding: '8px 14px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px' }}>
            {isSidebarOpen ? "Hide Controls" : "Show Controls"}
          </button>
        </div>
      )}

      {/* DASHBOARD CONTROL SIDEBAR */}
      <div style={{ 
        width: isMobile ? '100%' : '340px', padding: '24px', 
        display: isSidebarOpen || !isMobile ? 'flex' : 'none', 
        flexDirection: 'column', gap: '24px', background: '#1e293b',
        borderRight: isMobile ? 'none' : '1px solid #334155'
      }}>
        
        {/* FORCE SYNC ENGINE TRIGGER */}
        <button 
          onClick={handleForceSync}
          disabled={isSyncing}
          style={{ width: '100%', padding: '14px', background: isSyncing ? '#64748b' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: '0.2s' }}
        >
          {isSyncing ? "Syncing Active Feeds..." : "🔄 Refresh Live Calendars"}
        </button>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Active Workspace Filter</label>
          <select value={currentCalendar} onChange={(e) => setCurrentCalendar(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '8px' }}>
            <option value="combined">Combined Feed</option>
            <option value="work">Work Domain Feed</option>
            <option value="family">Family Feed</option>
            <option value="kids-logs">Kids Behavioral Stream</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsModalOpen(true)} style={{ flex: 1, padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>+ Add Entry</button>
          <button onClick={() => window.open(`${BACKEND_API}/api/events/export-pdf?calendar=${currentCalendar}`, '_blank')} style={{ flex: 1, padding: '12px', background: '#475569', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Print Report</button>
        </div>

        <hr style={{ borderColor: '#334155' }} />

        {/* VERIFICATION UNVERIFIED DISCOVERY AGENTS */}
        <div>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '12px' }}>Gemini Unverified Triage</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
            {dbEvents.filter(e => e.isUnverified).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>No pending anomalies inside current trace views.</p>
            ) : (
              dbEvents.filter(e => e.isUnverified).map(event => (
                <div key={event.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', fontSize: '13px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ fontWeight: 'bold' }}>{event.title}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button onClick={() => handleLearnStatus(event.id, 'verified_kid')} style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Approve Kid</button>
                    <button onClick={() => handleLearnStatus(event.id, 'blocked')} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Purge</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Scratchpad Space</h3>
          <textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} style={{ flex: 1, width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '8px', resize: 'none' }} />
          <button onClick={handleSaveGeneralNotes} style={{ marginTop: '10px', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Save Notes</button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '24px' }}>
        <div style={{ background: '#1e293b', padding: isMobile ? '12px' : '20px', borderRadius: '12px' }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: isMobile ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay' }}
            events={dbEvents}
            selectable={true}
            select={handleDateSelect}
            height={isMobile ? "65vh" : "82vh"}
            eventContent={(eventInfo) => {
              const ext = eventInfo.event.extendedProps;
              let dotColor = '#64748b';
              if (ext.calendar === 'work') dotColor = '#0284c7';
              if (ext.calendar === 'family') dotColor = '#10b981';
              if (ext.calendar === 'kids-logs') {
                dotColor = ext.sentiment === 'positive' ? '#10b981' : ext.sentiment === 'negative' ? '#ef4444' : '#f59e0b';
              }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 4px', fontSize: '12px', color: '#fff', overflow: 'hidden' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                  <span style={{ fontWeight: '700', opacity: 0.9 }}>{eventInfo.timeText}</span>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{eventInfo.event.title}</span>
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* EVENT ADDITION MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '460px', border: '1px solid #475569' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#38bdf8' }}>Log Event Metric Entry</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Event Title</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} required />
              </div>
              <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Start Time</label>
                  <input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>End Time</label>
                  <input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Target Domain Selection</label>
                <select value={newCalendar} onChange={(e) => setNewCalendar(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}>
                  <option value="combined">Combined Hub</option>
                  <option value="work">Work Stream</option>
                  <option value="family">Family Feed</option>
                  <option value="kids-logs">Kids Behavioral Logs</option>
                </select>
              </div>
              {newCalendar === 'kids-logs' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Sentiment Value</label>
                  <select value={newSentiment} onChange={(e) => setNewSentiment(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}>
                    <option value="neutral">Neutral Balance</option>
                    <option value="positive">Positive Vector</option>
                    <option value="negative">Negative Flag</option>
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Description</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 20px', background: '#475569', color: '#fff', border: 'none', borderRadius: '8px' }}>Cancel</button>
                <button type="submit" style={{ padding: '12px 20px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
