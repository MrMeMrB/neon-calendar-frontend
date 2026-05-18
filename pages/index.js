import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import Sidebar from '../components/Sidebar';

export default function Home() {
  const [currentCalendar, setCurrentCalendar] = useState('combined'); 
  const [dbEvents, setDbEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [isRouting, setIsRouting] = useState(false);

  // Manual Entry States
  const [manualTitle, setManualTitle] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualChannel, setManualChannel] = useState("combined");

  // Inspection Modal States
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventNotes, setEventNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [targetRoutingScope, setTargetRoutingScope] = useState("liam");

  const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

  // Explicit safety handler for targeted channel views
  const fetchSavedEvents = async (targetView = currentCalendar) => {
    if (!BACKEND_API) return;
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${targetView}&t=${timestamp}`);
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
    if (!BACKEND_API) return;
    try {
      const res = await fetch(`${BACKEND_API}/api/general-notes`);
      const data = await res.json();
      setGeneralNotes(data.content || "");
    } catch (err) { console.error("Error reading scratchpad info:", err); }
  };

  // Monitor target matrix changes seamlessly
  useEffect(() => {
    fetchSavedEvents(currentCalendar);
  }, [currentCalendar]);

  useEffect(() => {
    fetchGeneralNotes();
  }, [BACKEND_API]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualTitle || !manualStart) return alert("Title and start time are required.");
    try {
      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: manualTitle, 
          start: manualStart, 
          end: manualEnd || null, 
          description: manualDesc, 
          calendar: manualChannel 
        })
      });
      if (res.ok) {
        setManualTitle(""); setManualStart(""); setManualEnd(""); setManualDesc("");
        setIsModalOpen(false);
        // Safety gap to let pool transactions finish processing
        setTimeout(() => fetchSavedEvents(currentCalendar), 300);
      }
    } catch (err) { console.error(err); }
  };

  const handleEventClick = async (info) => {
    const eventObj = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      description: info.event.extendedProps.description || "",
      isUnverified: info.event.extendedProps.isUnverified || false,
      isExternal: info.event.extendedProps.isExternal ?? true
    };
    setSelectedEvent(eventObj);
    setEventNotes("");
    
    try {
      const res = await fetch(`${BACKEND_API}/api/events/${info.event.id}/notes`);
      const data = await res.json();
      setEventNotes(data.notes || "");
    } catch (err) { console.error(err); }
  };

  const saveEventNotes = async () => {
    if (!selectedEvent) return;
    try {
      await fetch(`${BACKEND_API}/api/events/${selectedEvent.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: eventNotes })
      });
      setSelectedEvent(null);
    } catch (err) { console.error(err); }
  };

  const saveGeneralNotes = async (val) => {
    setGeneralNotes(val);
    try {
      await fetch(`${BACKEND_API}/api/general-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: val })
      });
    } catch (err) { console.error(err); }
  };

  const handleLearnAction = async (status) => {
    if (!selectedEvent) return;
    setIsLearning(true);

    // Optimistically hide from layout array before reload
    if (status === 'blocked') {
      setDbEvents(prev => prev.filter(ev => ev.id !== selectedEvent.id));
    }

    try {
      const res = await fetch(`${BACKEND_API}/api/events/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent.id, status })
      });
      if (res.ok) {
        setSelectedEvent(null);
        setTimeout(() => fetchSavedEvents(currentCalendar), 400);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsLearning(false); 
    }
  };

  const handleRouteTransfer = async () => {
    if (!selectedEvent) return;
    setIsRouting(true);

    // Optimistically pull from current display scope grid
    setDbEvents(prev => prev.filter(ev => ev.id !== selectedEvent.id));

    try {
      const res = await fetch(`${BACKEND_API}/api/events/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          title: selectedEvent.title,
          start: selectedEvent.start,
          end: selectedEvent.end,
          description: selectedEvent.description,
          targetCalendar: targetRoutingScope,
          isExternal: selectedEvent.isExternal
        })
      });
      if (res.ok) {
        setSelectedEvent(null);
        setTimeout(() => fetchSavedEvents(currentCalendar), 400);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsRouting(false); 
    }
  };

  const getReminders = (maxDays) => {
    const now = new Date();
    const limit = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    return dbEvents
      .filter(ev => {
        const itemDate = new Date(ev.start);
        return itemDate >= now && itemDate <= limit;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: '-apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style jsx global>{`
        .fc { background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; }
        .fc .fc-toolbar-title { font-size: 1.2rem !important; font-weight: 800; color: #fff; }
        .fc-daygrid-event { border: none !important; border-radius: 4px !important; cursor: pointer; }
        .fc .fc-button-primary { background-color: #1f2937 !important; border: 1px solid #374151 !important; color: #94a3b8 !important; }
        .fc .fc-button-primary:hover { background-color: #374151 !important; color: #fff !important; }
        .fc .fc-button-active { background-color: #38bdf8 !important; color: #090d16 !important; border-color: #38bdf8 !important; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .loading-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; display: inline-block; }
      `}</style>

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#111827', borderBottom: '1px solid #1f2937' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>Unified Intelligence Command</h2>
          <p style={{ fontSize: '10px', color: '#38bdf8', margin: 0, textTransform: 'uppercase' }}>Viewing Scope: {currentCalendar}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: '#38bdf8', color: '#090d16', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
          ➕ Log Entry / Ingest Doc
        </button>
      </nav>

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar currentView={currentCalendar} setCurrentView={setCurrentCalendar} />
        
        <main style={{ flex: 1, padding: '24px', display: 'flex', gap: '24px' }}>
          <div style={{ flex: 3 }}>
            <FullCalendar 
              key={currentCalendar} 
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} 
              initialView="dayGridMonth" 
              events={dbEvents} 
              height="auto" 
              eventClick={handleEventClick}
              eventContent={(info) => {
                const color = info.event.extendedProps.color || info.event.backgroundColor;
                const isUnverified = info.event.extendedProps.isUnverified;
                return (
                  <div style={{ 
                    backgroundColor: color || '#38bdf8', 
                    color: isUnverified ? '#9ca3af' : '#090d16', 
                    padding: '3px 6px', 
                    borderRadius: '4px', 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    width: '100%', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    opacity: isUnverified ? 0.55 : 1,
                    border: isUnverified ? '1px dashed #4b5563' : 'none'
                  }}>
                    {info.event.title}
                  </div>
                );
              }}
            />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '310px', maxWidth: '350px' }}>
            <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '16px', maxHeight: '350px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px 0', letterSpacing: '0.05em' }}>🚨 Radar Reminders</h3>
              <h4 style={{ fontSize: '11px', color: '#f43f5e', margin: '8px 0 6px 0', textTransform: 'uppercase' }}>Next 24 Hours</h4>
              {getReminders(1).length === 0 ? <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px 0' }}>Clear horizon</p> : getReminders(1).map(e => <div key={e.id} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1f2937', color: '#f8fafc' }}>• {e.title}</div>)}
              <h4 style={{ fontSize: '11px', color: '#f59e0b', margin: '14px 0 6px 0', textTransform: 'uppercase' }}>This Week</h4>
              {getReminders(7).length === 0 ? <p style={{ fontSize: '12px', color: '#475569', margin: '0' }}>No active tracks</p> : getReminders(7).map(e => <div key={e.id} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1f2937', color: '#cbd5e1' }}>• {e.title}</div>)}
            </div>

            <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px 0', letterSpacing: '0.05em' }}>📝 Global Scratchpad</h3>
              <textarea value={generalNotes} onChange={(e) => saveGeneralNotes(e.target.value)} placeholder="Drop notes here..." style={{ flex: 1, width: '100%', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '13px', resize: 'none', outline: 'none' }} />
            </div>
          </div>
        </main>
      </div>

      {/* MODAL: MANUAL CREATION BLOCK */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Add Manual Event Logs</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Entry Title" value={manualTitle} onChange={e => setManualTitle(e.target.value)} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', padding: '10px', color: '#fff', borderRadius: '6px', fontSize: '14px', outline: 'none' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>START TIME</label>
                  <input type="datetime-local" value={manualStart} onChange={e => setManualStart(e.target.value)} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', padding: '10px', color: '#fff', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>END TIME</label>
                  <input type="datetime-local" value={manualEnd} onChange={e => setManualEnd(e.target.value)} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', padding: '10px', color: '#fff', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                </div>
              </div>
              <textarea placeholder="Description context..." value={manualDesc} onChange={e => setManualDesc(e.target.value)} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', padding: '10px', color: '#fff', borderRadius: '6px', height: '70px', fontSize: '13px', resize: 'none', outline: 'none' }} />
              <div>
                <select value={manualChannel} onChange={e => setManualChannel(e.target.value)} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', padding: '10px', color: '#fff', borderRadius: '6px', width: '100%', fontSize: '14px' }}>
                  <option value="combined">Master Hub (General)</option>
                  <option value="liam">Liam's Life</option>
                  <option value="work">ATI Calendar</option>
                  <option value="zoe">Zoe Calendar</option>
                  <option value="kids-logs">Kids Related Logs</option>
                  <option value="family">Kids Calendar</option>
                </select>
              </div>
              <button type="submit" style={{ backgroundColor: '#38bdf8', color: '#090d16', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Commit Record</button>
            </form>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '16px', fontWeight: '700' }}>{selectedEvent.title}</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0', backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151', lineHeight: '1.4' }}>
              {selectedEvent.description || "No descriptions attached to this stream record."}
            </p>

            {selectedEvent.isUnverified && (
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px dashed #f59e0b', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '700' }}>❓ Unverified Stream Match Detected:</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    disabled={isLearning}
                    onClick={() => handleLearnAction('verified_kid')}
                    style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: isLearning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {isLearning ? <div className="loading-spinner"></div> : "✅ Is Kid Related (Keep)"}
                  </button>
                  <button 
                    disabled={isLearning}
                    onClick={() => handleLearnAction('blocked')}
                    style={{ flex: 1, backgroundColor: '#f43f5e', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: isLearning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {isLearning ? <div className="loading-spinner"></div> : "❌ Not Kid Related (Hide)"}
                  </button>
                </div>
              </div>
            )}

            <div style={{ backgroundColor: '#1f2937', borderRadius: '10px', padding: '14px', border: '1px solid #374151', marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                🔀 Migrate/Assign Event Category
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select 
                  value={targetRoutingScope} 
                  onChange={e => setTargetRoutingScope(e.target.value)} 
                  style={{ flex: 2, backgroundColor: '#111827', border: '1px solid #374151', padding: '8px', color: '#fff', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                >
                  <option value="liam">Liam's Life</option>
                  <option value="work">ATI Calendar</option>
                  <option value="zoe">Zoe Calendar</option>
                  <option value="kids-logs">Kids Related Logs</option>
                  <option value="family">Kids Calendar</option>
                </select>
                <button 
                  disabled={isRouting}
                  onClick={handleRouteTransfer}
                  style={{ flex: 1, backgroundColor: '#38bdf8', color: '#090d16', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '12px', cursor: isRouting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {isRouting ? <div className="loading-spinner" style={{ borderTopColor: '#090d16' }}></div> : "Transfer Event"}
                </button>
              </div>
            </div>
            
            <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.05em' }}>Item Custom Annotations</h4>
            <textarea 
              value={eventNotes}
              onChange={e => setEventNotes(e.target.value)}
              placeholder="Type notes directly..."
              style={{ width: '100%', height: '70px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '13px', marginBottom: '16px', resize: 'none', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ backgroundColor: '#374151', color: '#94a3b8', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEventNotes} style={{ backgroundColor: '#38bdf8', color: '#090d16', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Save Notes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
