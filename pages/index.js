import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const BACKEND_API = "http://localhost:5001"; // Update to your deployment endpoint if hosted live

export default function Home() {
  const [dbEvents, setDbEvents] = useState([]);
  const [currentCalendar, setCurrentCalendar] = useState('combined');
  const [generalNotes, setGeneralNotes] = useState('');
  
  // Modal & Layout Toggles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // New Action Entry State Form
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCalendar, setNewCalendar] = useState('combined');
  const [newSentiment, setNewSentiment] = useState('neutral');

  // Load Window Dimensions to Handle Responsive Views Dynamically
  const [isMobile, setIsMobile] = useState(window.innerWidth < 960);

  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth < 960;
      setIsMobile(mobileView);
      if (mobileView) setIsSidebarOpen(false); // Autofold sidebar on small smartphone screens
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Event Streams
  const fetchSavedEvents = async () => {
    try {
      const t = new Date().getTime();
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCalendar}&t=${t}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDbEvents(data);
      } else {
        setDbEvents([]);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
      setDbEvents([]);
    }
  };

  const fetchGeneralNotes = async () => {
    try {
      const res = await fetch(`${BACKEND_API}/api/general-notes`);
      const data = await res.json();
      setGeneralNotes(data.content || '');
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  };

  useEffect(() => {
    fetchSavedEvents();
    fetchGeneralNotes();
  }, [currentCalendar]);

  // Form Submission
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newTitle || !newStart) return alert("Title and Start Time are critical paths.");

    try {
      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          start: newStart,
          end: newEnd || null,
          description: newDescription,
          calendar: newCalendar,
          sentiment: newSentiment
        })
      });
      if (res.ok) {
        setNewTitle('');
        setNewStart('');
        setNewEnd('');
        setNewDescription('');
        setIsModalOpen(false);
        fetchSavedEvents();
      }
    } catch (err) {
      console.error("Write execution dropped:", err);
    }
  };

  const handleLearnStatus = async (eventId, status) => {
    try {
      const res = await fetch(`${BACKEND_API}/api/events/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, status })
      });
      if (res.ok) fetchSavedEvents();
    } catch (err) {
      console.error("Verification adjustment failure:", err);
    }
  };

  const handleSaveGeneralNotes = async () => {
    try {
      await fetch(`${BACKEND_API}/api/general-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generalNotes })
      });
      alert("Scratchpad text updated successfully.");
    } catch (err) {
      console.error("Scratchpad database write error:", err);
    }
  };

  const handleDateSelect = (selectInfo) => {
    // Format safely to slice time parameter neatly into local string input controls
    const pad = (num) => String(num).padStart(2, '0');
    const d = selectInfo.start;
    const formattedDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    setNewStart(formattedDate);
    setNewEnd('');
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* MOBILE HEADER BAR */}
      {isMobile && (
        <div style={{ background: '#1e293b', padding: '16px', display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid #334155', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '18px', margin: 0, color: '#38bdf8', fontWeight: 'bold' }}>Hub Dashboard</h1>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ padding: '8px 14px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600' }}
          >
            {isSidebarOpen ? "Hide Controls" : "Show Controls"}
          </button>
        </div>
      )}

      {/* SIDEBAR CONTROL DASHBOARD */}
      <div style={{ 
        width: isMobile ? '100%' : '340px', 
        boxSizing: 'border-box',
        background: '#1e293b', 
        padding: '24px', 
        display: isSidebarOpen || !isMobile ? 'flex' : 'none', 
        flexDirection: 'column', 
        gap: '24px', 
        borderRight: isMobile ? 'none' : '1px solid #334155',
        borderBottom: isMobile ? '1px solid #334155' : 'none'
      }}>
        
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.5px' }}>Filter Context Metric</label>
          <select 
            value={currentCalendar} 
            onChange={(e) => setCurrentCalendar(e.target.value)}
            style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '8px', fontSize: '15px' }}
          >
            <option value="combined">Combined Hub Feed</option>
            <option value="work">Work Stream</option>
            <option value="family">Family Engine</option>
            <option value="kids-logs">Kids Behavioral Log</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsModalOpen(true)} style={{ flex: 1, padding: '14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            + Log Entry
          </button>
          <button onClick={() => window.open(`${BACKEND_API}/api/events/export-pdf?calendar=${currentCalendar}`, '_blank')} style={{ flex: 1, padding: '14px', background: '#475569', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            Print PDF
          </button>
        </div>

        <hr style={{ borderColor: '#334155', margin: '4px 0' }} />

        {/* EXCEPTION VECTOR QUEUE */}
        <div>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '12px', fontWeight: 'bold' }}>Unverified Queue Exception Blocks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
            {dbEvents.filter(e => e.isUnverified).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, italic: 'true' }}>No anomalies waiting structural approval.</p>
            ) : (
              dbEvents.filter(e => e.isUnverified).map(event => (
                <div key={event.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', fontSize: '13px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{event.title}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button onClick={() => handleLearnStatus(event.id, 'verified_kid')} style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Verify</button>
                    <button onClick={() => handleLearnStatus(event.id, 'blocked')} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Purge</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SCRATCHPAD ASSET CONTAINER */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '160px' }}>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}>System Scratchpad</h3>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            style={{ flex: 1, width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '8px', resize: 'none', fontSize: '14px', lineHeight: '1.5', boxSizing: 'border-box' }}
            placeholder="Type transient log details..."
          />
          <button onClick={handleSaveGeneralNotes} style={{ marginTop: '10px', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            Commit Notes
          </button>
        </div>
      </div>

      {/* CORE WORKSPACE ENGINE BLOCK */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', boxSizing: 'border-box' }}>
        <div style={{ background: '#1e293b', padding: isMobile ? '12px' : '20px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "timeGridDay" : "dayGridMonth"} // Mobile scales better with explicit day timelines
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: isMobile ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={dbEvents}
            selectable={true}
            select={handleDateSelect}
            height={isMobile ? "65vh" : "82vh"}
            windowResizeDelay={0}
            eventContent={(eventInfo) => {
              const ext = eventInfo.event.extendedProps;
              let dotColor = '#64748b';
              if (ext.calendar === 'work') dotColor = '#0284c7';
              if (ext.calendar === 'family') dotColor = '#10b981';
              if (ext.calendar === 'kids-logs') {
                dotColor = ext.sentiment === 'positive' ? '#10b981' : ext.sentiment === 'negative' ? '#ef4444' : '#f59e0b';
              }

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', fontSize: '12px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                  <span style={{ fontWeight: '700', opacity: 0.9, whiteSpace: 'nowrap' }}>{eventInfo.timeText}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eventInfo.event.title}</span>
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* INPUT MANIFEST MODAL INTERFACE */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '460px', border: '1px solid #475569', boxSizing: 'border-box' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#38bdf8', fontSize: '18px', fontWeight: 'bold' }}>Inject Action Metrics</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Event Action Label</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Start Time</label>
                  <input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>End Time (Optional)</label>
                  <input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Workspace Domain Target</label>
                <select value={newCalendar} onChange={(e) => setNewCalendar(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                  <option value="combined">Combined Hub</option>
                  <option value="work">Work Stream</option>
                  <option value="family">Family Engine</option>
                  <option value="kids-logs">Kids Behavioral Logs</option>
                </select>
              </div>

              {newCalendar === 'kids-logs' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Sentiment Tracker Vector</label>
                  <select value={newSentiment} onChange={(e) => setNewSentiment(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                    <option value="neutral">Neutral Balance</option>
                    <option value="positive">Positive Metric</option>
                    <option value="negative">Negative Exception</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Context Summary Note</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', resize: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 20px', background: '#475569', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '12px 20px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
