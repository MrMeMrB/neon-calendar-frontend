import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const BACKEND_API = "http://localhost:5001";

export default function Home() {
  // Core States
  const [dbEvents, setDbEvents] = useState([]);
  const [currentCalendar, setCurrentCalendar] = useState('combined');
  const [generalNotes, setGeneralNotes] = useState('');
  
  // Modal & Form States for New Entries
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCalendar, setNewCalendar] = useState('combined');
  const [newSentiment, setNewSentiment] = useState('neutral');

  /* ==========================================
     1. DATA LOGISTICS PIPELINE (READ)
     ========================================== */
  
  const fetchSavedEvents = async () => {
    if (!BACKEND_API) return;
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCalendar}&t=${timestamp}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setDbEvents(data);
      } else {
        setDbEvents([]);
      }
    } catch (err) {
      console.error("Error pulling calendar events:", err);
      setDbEvents([]);
    }
  };

  const fetchGeneralNotes = async () => {
    try {
      const res = await fetch(`${BACKEND_API}/api/general-notes`);
      const data = await res.json();
      setGeneralNotes(data.content || '');
    } catch (err) {
      console.error("Error pulling database annotations:", err);
    }
  };

  useEffect(() => {
    fetchSavedEvents();
    fetchGeneralNotes();
  }, [currentCalendar]);

  /* ==========================================
     2. ACTION HANDLERS (WRITE / UPDATE / DELETE)
     ========================================== */

  // Drop New Entry Into Grid
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newTitle || !newStart) {
      alert("Title and Start Time are required.");
      return;
    }

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
      const data = await res.json();
      if (data.success) {
        // Reset form and refresh layout
        setNewTitle('');
        setNewStart('');
        setNewEnd('');
        setNewDescription('');
        setIsModalOpen(false);
        fetchSavedEvents();
      }
    } catch (err) {
      console.error("Error creating event entry:", err);
    }
  };

  // Feedback Learning System Actions (Purge / Re-route)
  const handleLearnStatus = async (eventId, status) => {
    try {
      const res = await fetch(`${BACKEND_API}/api/events/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, status })
      });
      const data = await res.json();
      if (data.success) {
        fetchSavedEvents();
      }
    } catch (err) {
      console.error("Error updating verification state tracking:", err);
    }
  };

  // Save Scratchpad Content
  const handleSaveGeneralNotes = async () => {
    try {
      await fetch(`${BACKEND_API}/api/general-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generalNotes })
      });
      alert("General scratchpad content updated successfully.");
    } catch (err) {
      console.error("Failed saving note streams:", err);
    }
  };

  // Trigger Local System PDF View
  const handleExportPDF = () => {
    window.open(`${BACKEND_API}/api/events/export-pdf?calendar=${currentCalendar}`, '_blank');
  };

  // FullCalendar Slot Click Handler
  const handleDateSelect = (selectInfo) => {
    setNewStart(selectInfo.startStr.slice(0, 16)); // Format for datetime-local input
    setNewEnd(selectInfo.endStr.slice(0, 16));
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR CONTROL CENTER */}
      <div style={{ width: '320px', background: '#1e293b', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', borderRight: '1px solid #334155' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#38bdf8' }}>Workspace Filters</h2>
          <select 
            value={currentCalendar} 
            onChange={(e) => setCurrentCalendar(e.target.value)}
            style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="combined">Combined Hub Feed</option>
            <option value="work">Work Domain</option>
            <option value="family">Family Framework</option>
            <option value="kids-logs">Kids Behavioral Stream</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            + Add New Action Log
          </button>
          <button 
            onClick={handleExportPDF}
            style={{ width: '100%', padding: '12px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Export Intelligence PDF
          </button>
        </div>

        <hr style={{ borderColor: '#334155' }} />

        {/* VERIFICATION UNVERIFIED INCOMING QUEUE TRACKER */}
        <div>
          <h3 style={{ fontSize: '14px', uppercase: 'true', color: '#94a3b8', marginBottom: '12px', letterSpacing: '0.5px' }}>Unverified Vector Queue</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
            {dbEvents.filter(e => e.isUnverified).length === 0 ? (
              <p style={{ fontSize: '12px', color: '#64748b' }}>No pending verification exceptions detected.</p>
            ) : (
              dbEvents.filter(e => e.isUnverified).map(event => (
                <div key={event.id} style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', fontSize: '12px', borderLeft: '3px solid #ef4444' }}>
                  <div style={{ fontWeight: 'bold' }}>{event.title}</div>
                  <div style={{ color: '#64748b', marginBottom: '6px' }}>{new Date(event.start).toLocaleDateString()}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleLearnStatus(event.id, 'verified_kid')} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Verify Kid</button>
                    <button onClick={() => handleLearnStatus(event.id, 'blocked')} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Purge</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* GENERAL STORAGE SCRATCHPAD */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Persistent Scratchpad</h3>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            style={{ flex: 1, width: '100%', padding: '10px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px', resize: 'none', fontSize: '13px', lineHeight: '1.4' }}
            placeholder="Type long-term processing summaries here..."
          />
          <button 
            onClick={handleSaveGeneralNotes}
            style={{ marginTop: '8px', padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Commit Scratchpad Data
          </button>
        </div>
      </div>

      {/* MAIN GRID BLOCK */}
      <div style={{ flex: 1, padding: '24px', background: '#0f172a' }}>
        <div className="calendar-container" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={dbEvents}
            selectable={true}
            select={handleDateSelect}
            height="80vh"
            eventContent={(eventInfo) => {
              const ext = eventInfo.event.extendedProps;
              let dotColor = '#64748b';
              if (ext.calendar === 'work') dotColor = '#0284c7';
              if (ext.calendar === 'family') dotColor = '#10b981';
              if (ext.calendar === 'kids-logs') {
                dotColor = ext.sentiment === 'positive' ? '#10b981' : ext.sentiment === 'negative' ? '#ef4444' : '#f59e0b';
              }

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 4px', fontSize: '12px', overflow: 'hidden', color: '#fff' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                  <span style={{ fontWeight: '600', opacity: 0.8 }}>{eventInfo.timeText}</span>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{eventInfo.event.title}</span>
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* INPUT MANIFEST MODAL COMPONENT */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', width: '450px', border: '1px solid #475569' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#38bdf8' }}>Create New Action Log Target</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Log Summary Title</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }} required />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Start Axis Time</label>
                  <input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>End Axis Time</label>
                  <input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Domain Selection</label>
                <select value={newCalendar} onChange={(e) => setNewCalendar(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}>
                  <option value="combined">Combined Hub</option>
                  <option value="work">Work Space</option>
                  <option value="family">Family Framework</option>
                  <option value="kids-logs">Kids Behavioral Logs</option>
                </select>
              </div>

              {newCalendar === 'kids-logs' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Sentiment Marker Matrix</label>
                  <select value={newSentiment} onChange={(e) => setNewSentiment(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}>
                    <option value="neutral">Neutral Balance</option>
                    <option value="positive">Positive Vector</option>
                    <option value="negative">Negative Flag</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Contextual Description</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Inject Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
