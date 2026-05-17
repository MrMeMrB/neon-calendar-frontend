import React, { useState, useEffect, useRef } from 'react';
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
  
  // Manual Entry Data States
  const [manualTitle, setManualTitle] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualChannel, setManualChannel] = useState("combined");

  // Inspection & Notes States
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventNotes, setEventNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const fetchSavedEvents = async () => {
    if (!BACKEND_API) return;
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCalendar}&t=${timestamp}`);
      const data = await res.json();
      if (Array.isArray(data)) setDbEvents(data);
    } catch (err) { console.error("Error pulling calendar events:", err); }
  };

  const fetchGeneralNotes = async () => {
    if (!BACKEND_API) return;
    try {
      const res = await fetch(`${BACKEND_API}/api/general-notes`);
      const data = await res.json();
      setGeneralNotes(data.content);
    } catch (err) { console.error("Error reading scratchpad info:", err); }
  };

  useEffect(() => {
    fetchSavedEvents();
  }, [currentCalendar]);

  useEffect(() => {
    fetchGeneralNotes();
  }, [BACKEND_API]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualTitle || !manualStart) return alert("An entry title and start time are minimum requirements.");
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
        fetchSavedEvents();
      }
    } catch (err) { console.error("Failed writing explicit log event:", err); }
  };

  const handleEventClick = async (info) => {
    const eventObj = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      description: info.event.extendedProps.description || ""
    };
    setSelectedEvent(eventObj);
    setEventNotes("");
    
    try {
      const res = await fetch(`${BACKEND_API}/api/events/${info.event.id}/notes`);
      const data = await res.json();
      setEventNotes(data.notes);
    } catch (err) { console.error("Failed retrieving item notes metadata pipeline:", err); }
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
    } catch (err) { console.error("Failed writing updates into event annotations:", err); }
  };

  const saveGeneralNotes = async (val) => {
    setGeneralNotes(val);
    try {
      await fetch(`${BACKEND_API}/api/general-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: val })
      });
    } catch (err) { console.error("Autosave scratchpad dropped transaction:", err); }
  };

  const handleBlockEvent = async () => {
    if (!selectedEvent) return;
    if (confirm("Remove this event from view? The whole-word keyword filter will remember this choice.")) {
      try {
        const res = await fetch(`${BACKEND_API}/api/events/block`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: selectedEvent.id })
        });
        if (res.ok) {
          setSelectedEvent(null);
          fetchSavedEvents(); // Instant dashboard refresh
        }
      } catch (err) { console.error("Failed executing blocklist transaction:", err); }
    }
  };

  // Timeline Reminder Filtering Algorithm (Calculates dynamically from data payload)
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
      `}</style>

      {/* GLOBAL TOP NAV CONTROLS */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#111827', borderBottom: '1px solid #1f2937' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>Unified Intelligence Command</h2>
          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Viewing Scope: {currentCalendar}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: '#38bdf8', color: '#090d16', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s' }}>
          ➕ Log Entry / Ingest Doc
        </button>
      </nav>

      {/* CORE WORKSPACE CONSOLE */}
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar currentView={currentCalendar} setCurrentView={setCurrentCalendar} />
        
        <main style={{ flex: 1, padding: '24px', display: 'flex', gap: '24px' }}>
          {/* THE MASTER TARGET INTERACTIVE CALENDAR CONTAINER */}
          <div style={{ flex: 3 }}>
            <FullCalendar 
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} 
              initialView="dayGridMonth" 
              events={dbEvents} 
              height="auto" 
              eventClick={handleEventClick}
              eventContent={(info) => {
                const color = info.event.extendedProps.color || info.event.backgroundColor;
                return (
                  <div style={{ backgroundColor: color || '#38bdf8', color: '#090d16', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {info.event.title}
                  </div>
                );
              }}
            />
          </div>

          {/* DUAL RADAR SIDEBAR PANEL: REMINDERS & SCRATCHPAD */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '310px', maxWidth: '350px' }}>
            
            {/* RADAR TIMELINE COMPONENT */}
            <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '16px', maxHeigh: '350px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px 0', letterSpacing: '0.05em' }}>🚨 Radar Reminders</h3>
              
              <h4 style={{ fontSize: '11px', color: '#f43f5e', margin: '8px 0 6px 0', textTransform: 'uppercase' }}>Next 24 Hours</h4>
              {getReminders(1).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px 0' }}>Clear horizon</p>
              ) : getReminders(1).map(e => (
                <div key={e.id} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1f2937', color: '#f8fafc' }}>• {e.title}</div>
              ))}
              
              <h4 style={{ fontSize: '11px', color: '#f59e0b', margin: '14px 0 6px 0', textTransform: 'uppercase' }}>This Week</h4>
              {getReminders(7).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#475569', margin: '0' }}>No active schedule tracks</p>
              ) : getReminders(7).map(e => (
                <div key={e.id} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1f2937', color: '#cbd5e1' }}>• {e.title}</div>
              ))}
            </div>

            {/* INTEGRATED GLOBAL NOTEPAD */}
            <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px 0', letterSpacing: '0.05em' }}>📝 Global Scratchpad</h3>
              <textarea 
                value={generalNotes} 
                onChange={(e) => saveGeneralNotes(e.target.value)}
                placeholder="Drop notes, tasks, or numbers here. Automatically saves to database cluster storage..."
                style={{ flex: 1, width: '100%', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '13px', resize: 'none', lineHeight: '1.5', outline: 'none' }}
              />
            </div>
          </div>
        </main>
      </div>

      {/* USER INTERFACE MODAL: ADD MANUAL ENTRIES */}
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
                  <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>END TIME (OPTIONAL)</label>
                  <input type="datetime-local" value={manualEnd} onChange={e => setManualEnd(e.target.value)} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', padding: '10px', color: '#fff', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                </div>
              </div>

              <textarea placeholder="Enter description context clues..." value={manualDesc} onChange={e => setManualDesc(e.target.value)} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', padding: '10px', color: '#fff', borderRadius: '6px', height: '70px', fontSize: '13px', resize: 'none', outline: 'none' }} />
              
              <div>
                <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>ASSIGN TO CHANNEL CHANNEL</label>
                <select value={manualChannel} onChange={e => setManualChannel(e.target.value)} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', padding: '10px', color: '#fff', borderRadius: '6px', width: '100%', fontSize: '14px' }}>
                  <option value="combined">Master Hub (General)</option>
                  <option value="liam">Liam's Life</option>
                  <option value="work">ATI Work Logs</option>
                  <option value="zoe">Zoe Calendar</option>
                  <option value="kids-logs">🧬 Kid Related Logs</option>
                  <option value="family">Family Track</option>
                </select>
              </div>

              <button type="submit" style={{ backgroundColor: '#38bdf8', color: '#090d16', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}>Commit Record</button>
            </form>
          </div>
        </div>
      )}

      {/* USER INTERFACE MODAL: ITEM DETAIL NOTES INSPECTOR */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '16px', fontWeight: '700' }}>{selectedEvent.title}</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151', lineHeight: '1.4' }}>
              {selectedEvent.description || "No descriptions attached to this stream record."}
            </p>
            
            <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.05em' }}>Item Custom Annotations</h4>
            <textarea 
              value={eventNotes}
              onChange={e => setEventNotes(e.target.value)}
              placeholder="Type notes or context additions directly into this calendar event record..."
              style={{ width: '100%', height: '110px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '13px', marginBottom: '16px', resize: 'none', outline: 'none', lineHeight: '1.4' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={handleBlockEvent}
                style={{ backgroundColor: 'transparent', border: '1px solid #f43f5e', color: '#f43f5e', padding: '10px 14px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#f43f5e'; e.target.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#f43f5e'; }}
              >
                🗑️ Not Kid Related (Remove)
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSelectedEvent(null)} style={{ backgroundColor: '#374151', color: '#94a3b8', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveEventNotes} style={{ backgroundColor: '#38bdf8', color: '#090d16', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Save Notes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
