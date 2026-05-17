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
  const [stagedEvents, setStagedEvents] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const calendarRef = useRef(null);
  const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const fetchSavedEvents = async () => {
    if (!BACKEND_API) return;
    try {
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCalendar}`);
      const data = await res.json();
      if (Array.isArray(data)) setDbEvents(data);
    } catch (err) {
      console.error("Database sync error:", err);
    }
  };

  useEffect(() => {
    fetchSavedEvents();
  }, [BACKEND_API, currentCalendar]);

  const changeLayout = (viewName) => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.changeView(viewName);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setIsModalOpen(false);
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch(`${BACKEND_API}/api/upload-document?calendar=${currentCalendar}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: buffer
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) setStagedEvents(data.events);
    } catch (err) {
      alert("Error handling document conversion stream.");
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setLoading(true);
    setIsModalOpen(false);
    try {
      const res = await fetch(`${BACKEND_API}/api/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: urlInput, calendar: currentCalendar })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setStagedEvents(data.events);
        setUrlInput("");
      }
    } catch (err) {
      alert("Error reading document from link.");
    } finally {
      setLoading(false);
    }
  };

  const commitEvent = async (index) => {
    const item = { ...stagedEvents[index], calendar: currentCalendar };
    try {
      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const data = await res.json();
      if (data.success) {
        fetchSavedEvents();
        setStagedEvents(prev => prev.filter((_, i) => i !== index));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* GLOBAL FULLCALENDAR RESPONSIVE OVERRIDES */}
      <style jsx global>{`
        .fc { max-width: 100%; background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
        .fc .fc-toolbar { flex-wrap: wrap; gap: 12px; margin-bottom: 20px !important; }
        .fc .fc-toolbar-title { font-size: 1.4rem !important; font-weight: 800; color: #fff; }
        .fc .fc-button-primary { background-color: #1f2937 !important; border-color: #374151 !important; color: #e2e8f0 !important; font-weight: 600; font-size: 0.85rem; padding: 8px 14px; }
        .fc .fc-button-primary:hover { background-color: #374151 !important; }
        .fc .fc-button-active { background-color: #38bdf8 !important; border-color: #38bdf8 !important; color: #090d16 !important; }
        .fc th { background-color: #1f2937; color: #94a3b8; font-weight: 700; font-size: 0.85rem; padding: 12px 0 !important; border: 1px solid #374151; }
        .fc td { border: 1px solid #1f2937 !important; }
        .fc-list-day-cushion { background-color: #1f2937 !important; }
        /* Style fixes to ensure text colors read cleanly inside full-colored event bars */
        .fc-v-event .fc-event-title, .fc-h-event .fc-event-title { font-weight: 600 !important; color: #090d16 !important; }
        .fc-daygrid-event { border: none !important; padding: 2px 4px !important; margin: 2px 0 !important; border-radius: 4px !important; }
        @media (max-width: 900px) {
          .main-layout { flex-direction: column; }
          .sidebar-pane { width: 100% !important; border-right: none !important; border-bottom: 1px solid #1f2937; }
        }
      `}</style>

      {/* TOP BRAND NAVIGATION */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#111827', borderBottom: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Linked up your custom uploaded brand asset file */}
          <img src="/image_28ef8d.jpg" alt="Liam's Life" style={{ height: '48px', width: 'auto', borderRadius: '6px' }} />
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#fff' }}>Unified Intelligence</h2>
            <p style={{ fontSize: '10px', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Active Channel: {currentCalendar}</p>
          </div>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: '#38bdf8', color: '#090d16', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.2)' }}>
          ➕ Ingest into {currentCalendar}
        </button>
      </nav>

      {/* CORE SPLIT WORKSPACE */}
      <div className="main-layout" style={{ display: 'flex', flex: 1 }}>
        
        <div className="sidebar-pane">
          <Sidebar currentView={currentCalendar} setCurrentView={setCurrentCalendar} />
        </div>

        <main style={{ flex: 1, padding: '24px' }}>
          
          {/* USER INTERFACE LAYOUT CONTROLS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
            <button onClick={() => changeLayout('dayGridMonth')} style={{ backgroundColor: '#1f2937', color: '#fff', border: '1px solid #374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Grid Month</button>
            <button onClick={() => changeLayout('timeGridWeek')} style={{ backgroundColor: '#1f2937', color: '#fff', border: '1px solid #374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Dense Week</button>
            <button onClick={() => changeLayout('listMonth')} style={{ backgroundColor: '#1f2937', color: '#fff', border: '1px solid #374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Agenda List</button>
          </div>

          {/* DYNAMIC PIPELINE NOTIFICATIONS */}
          {loading && (
            <div style={{ backgroundColor: '#1e1b4b', border: '1px solid #3730a3', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center', color: '#a5b4fc' }}>
              ⚡ Processing intelligence down-stream into {currentCalendar} layout...
            </div>
          )}

          {/* MAIN CALENDAR MATRIX */}
          <FullCalendar 
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} 
            initialView="dayGridMonth" 
            events={dbEvents} 
            height="auto" 
            eventTextColor="#090d16"
            eventContent={(eventInfo) => {
              // Custom injection hook: dynamically maps specific event colors passed by our server streams
              const customColor = eventInfo.event.extendedProps.color || eventInfo.event.backgroundColor;
              return (
                <div style={{ 
                  backgroundColor: customColor || '#38bdf8', 
                  color: '#090d16', 
                  padding: '3px 6px', 
                  borderRadius: '4px', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {eventInfo.event.title}
                </div>
              );
            }}
          />
        </main>
      </div>

      {/* DETACHED INGESTION MODAL OVERLAY */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Target: Ingesting to <span style={{ color: '#38bdf8' }}>{currentCalendar}</span></h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ border: '2px dashed #374151', borderRadius: '12px', padding: '24px', textAlign: 'center', position: 'relative', backgroundColor: '#1f2937' }}>
                <input type="file" accept=".pdf" onChange={handleFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                <p style={{ fontSize: '14px', margin: 0, color: '#e2e8f0' }}>Drop PDF to map into {currentCalendar}</p>
              </div>
            </div>

            <form onSubmit={handleUrlSubmit}>
              <input type="url" placeholder="Paste schedule document URL..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px', fontSize: '14px', color: '#fff', width: '100%', boxSizing: 'border-box', marginBottom: '12px' }} />
              <button type="submit" style={{ backgroundColor: '#38bdf8', color: '#090d16', padding: '12px', borderRadius: '8px', width: '100%', fontWeight: '700', border: 'none', cursor: 'pointer' }}>Run Extraction</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
