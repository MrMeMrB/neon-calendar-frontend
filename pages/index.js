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
  const [isLearning, setIsLearning] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  // Manual Entry States
  const [manualTitle, setManualTitle] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualChannel, setManualChannel] = useState("combined");
  const [logSentiment, setLogSentiment] = useState("neutral"); // neutral, positive, negative

  // Inspection Modal States
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventNotes, setEventNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [targetRoutingScope, setTargetRoutingScope] = useState("liam");

  // Mobile Detection
  const [isMobile, setIsMobile] = useState(false);

  const fileInputRef = useRef(null);
  const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchSavedEvents = async () => {
    if (!BACKEND_API) return;
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`${BACKEND_API}/api/events?calendar=combined&t=${timestamp}`);
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

  useEffect(() => {
    fetchSavedEvents();
    fetchGeneralNotes();
  }, [BACKEND_API]);

  const handleDateClick = (arg) => {
    // Automatically pre-fill the clicked date format seamlessly
    const clickedDate = arg.dateStr + "T09:00";
    setManualStart(clickedDate);
    // Default log channel context matches current filter selection
    setManualChannel(currentCalendar === 'combined' ? 'work' : currentCalendar);
    setIsModalOpen(true);
  };

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
          calendar: manualChannel,
          sentiment: manualChannel === 'kids-logs' ? logSentiment : null
        })
      });
      if (res.ok) {
        setManualTitle(""); setManualStart(""); setManualEnd(""); setManualDesc(""); setLogSentiment("neutral");
        setIsModalOpen(false);
        setTimeout(() => fetchSavedEvents(), 300);
      }
    } catch (err) { console.error(err); }
  };

  const openInspectionModalById = (id) => {
    const targetEvent = dbEvents.find(ev => String(ev.id) === String(id));
    if (targetEvent) {
      handleEventClick({ event: {
        id: targetEvent.id,
        title: targetEvent.title,
        start: new Date(targetEvent.start),
        end: targetEvent.end ? new Date(targetEvent.end) : null,
        extendedProps: {
          description: targetEvent.description,
          isUnverified: targetEvent.isUnverified,
          isExternal: targetEvent.isExternal,
          sentiment: targetEvent.sentiment
        }
      }});
    }
  };

  const handleEventClick = async (info) => {
    const eventObj = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      description: info.event.extendedProps.description || "",
      isUnverified: info.event.extendedProps.isUnverified || false,
      isExternal: info.event.extendedProps.isExternal ?? true,
      sentiment: info.event.extendedProps.sentiment || "neutral"
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
        setTimeout(() => fetchSavedEvents(), 400);
      }
    } catch (err) { console.error(err); } finally { setIsLearning(false); }
  };

  // Upgraded Clone Logic: Clones item to target instead of destructive moving
  const handleRouteCloneTransfer = async () => {
    if (!selectedEvent) return;
    setIsRouting(true);
    try {
      const res = await fetch(`${BACKEND_API}/api/events/route-clone`, {
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
        setTimeout(() => fetchSavedEvents(), 300);
      }
    } catch (err) { console.error(err); } finally { setIsRouting(false); }
  };

  // PDF Engine Trigger
  const triggerPdfExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${BACKEND_API}/api/events/export-pdf?calendar=${currentCalendar}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Calendar_Export_${currentCalendar}_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert("Failed to compile PDF stream layout.");
      }
    } catch (err) { console.error(err); } finally { setIsExporting(false); }
  };

  // Single Pass Low Token Cost Image Text Extractor Process
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessingImg(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${BACKEND_API}/api/extract-text`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.extractedText) {
        setManualDesc(prev => prev ? prev + "\n\n" + data.extractedText : data.extractedText);
        alert("Text successfully extracted directly into your description window context!");
      } else {
        alert("Could not process clear text strings out of this asset file.");
      }
    } catch (err) { console.error(err); } finally { setIsProcessingImg(false); }
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

  const displayedEvents = currentCalendar === 'combined' 
    ? dbEvents 
    : dbEvents.filter(ev => ev.calendar === currentCalendar);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style jsx global>{`
        .fc { background: #0f172a; border-radius: 14px; padding: 18px; border: 1px solid #1e293b; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        .fc .fc-toolbar-title { font-size: 1.15rem !important; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; }
        .fc-daygrid-event { border: none !important; border-radius: 6px !important; cursor: pointer; transition: transform 0.15s ease; }
        .fc-daygrid-event:hover { transform: translateY(-1px); filter: brightness(1.1); }
        .fc .fc-button-primary { background-color: #1e293b !important; border: 1px solid #334155 !important; color: #cbd5e1 !important; font-size: 13px !important; font-weight: 600 !important; border-radius: 6px !important; }
        .fc .fc-button-primary:hover { background-color: #334155 !important; color: #fff !important; }
        .fc .fc-button-active { background-color: #0284c7 !important; color: #fff !important; border-color: #0284c7 !important; }
        .fc th { color: #94a3b8 !important; font-size: 11px !important; text-transform: uppercase !important; font-weight: 700 !important; padding-bottom: 8px !important; }
        .fc td { border-color: #1e293b !important; }
        .fc-day-today { background-color: rgba(2, 132, 199, 0.06) !important; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .loading-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; display: inline-block; }
        .clickable-reminder { transition: background 0.2s ease; cursor: pointer; padding: 8px; border-radius: 6px; }
        .clickable-reminder:hover { background: #1e293b; }
      `}</style>

      {/* NAV FRAMEWORK */}
      <nav style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '0', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', padding: '16px 24px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, letterSpacing: '-0.01em' }}>Intelligence Command Dashboard</h2>
          <p style={{ fontSize: '11px', color: '#0ea5e9', margin: 0, textTransform: 'uppercase', fontWeight: '600', marginTop: '2px' }}>Scope Matrix: {currentCalendar}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', justifyContent: 'flex-end' }}>
          <button onClick={triggerPdfExport} disabled={isExporting} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '9px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
            {isExporting ? <div className="loading-spinner"></div> : "📄 Export PDF"}
          </button>
          <button onClick={() => { setManualStart(""); setIsModalOpen(true); }} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', flex: isMobile ? 1 : 'none' }}>
            ➕ Log Fast Entry
          </button>
        </div>
      </nav>

      {/* CORE DISPLAY WORKSPACE */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1 }}>
        <Sidebar currentView={currentCalendar} setCurrentView={setCurrentCalendar} />
        
        <main style={{ flex: 1, padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px' }}>
          
          {/* CALENDAR COLUMN */}
          <div style={{ flex: 3, order: 1 }}>
            <FullCalendar 
              key={currentCalendar + (isMobile ? '-m' : '-d')} 
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} 
              initialView={isMobile ? "listWeek" : "dayGridMonth"} 
              events={displayedEvents} 
              height="auto" 
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: isMobile ? '' : 'dayGridMonth,timeGridWeek,listWeek'
              }}
              eventContent={(info) => {
                const color = info.event.extendedProps.color || info.event.backgroundColor;
                const isUnverified = info.event.extendedProps.isUnverified;
                const sentiment = info.event.extendedProps.sentiment;
                let sentimentIndicator = "";
                if (sentiment === 'positive') sentimentIndicator = "🟢 ";
                if (sentiment === 'negative') sentimentIndicator = "🔴 ";

                return (
                  <div style={{ 
                    backgroundColor: color || '#0284c7', 
                    color: '#fff', 
                    padding: '4px 8px', 
                    borderRadius: '6px', 
                    fontSize: '11px', 
                    fontWeight: '600', 
                    width: '100%', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    opacity: isUnverified ? 0.6 : 1,
                    border: isUnverified ? '1px dashed #475569' : 'none'
                  }}>
                    {sentimentIndicator}{info.event.title}
                  </div>
                );
              }}
            />
          </div>

          {/* SIDE DATA BAR */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: isMobile ? '100%' : '310px', maxWidth: isMobile ? '100%' : '350px', order: isMobile ? 2 : 2 }}>
            
            {/* RADAR PANELS */}
            <div style={{ backgroundColor: '#0f172a', borderRadius: '14px', border: '1px solid #1e293b', padding: '16px', maxHeight: '380px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px 0', letterSpacing: '0.05em', fontWeight: '700' }}>📡 Radar Analytics Track</h3>
              
              <h4 style={{ fontSize: '11px', color: '#ef4444', margin: '8px 0 6px 0', textTransform: 'uppercase', fontWeight: '700' }}>Next 24 Hours</h4>
              {getReminders(1).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px 0' }}>Clear tracking window</p>
              ) : getReminders(1).map(e => (
                <div key={e.id} onClick={() => openInspectionModalById(e.id)} className="clickable-reminder" style={{ fontSize: '12px', borderBottom: '1px solid #1e293b', color: '#f1f5f9' }}>
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>[{new Date(e.start).toLocaleDateString(undefined, {month:'short', day:'numeric'})}]</span> {e.title}
                </div>
              ))}
              
              <h4 style={{ fontSize: '11px', color: '#f59e0b', margin: '14px 0 6px 0', textTransform: 'uppercase', fontWeight: '700' }}>This Week Horizon</h4>
              {getReminders(7).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#475569', margin: '0' }}>No active tracking vectors</p>
              ) : getReminders(7).map(e => (
                <div key={e.id} onClick={() => openInspectionModalById(e.id)} className="clickable-reminder" style={{ fontSize: '12px', borderBottom: '1px solid #1e293b', color: '#cbd5e1' }}>
                  <span style={{ color: '#f59e0b', fontWeight: '600' }}>[{new Date(e.start).toLocaleDateString(undefined, {month:'short', day:'numeric'})}]</span> {e.title}
                </div>
              ))}
            </div>

            {/* SCRATCHPAD */}
            <div style={{ backgroundColor: '#0f172a', borderRadius: '14px', border: '1px solid #1e293b', padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '200px' }}>
              <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px 0', letterSpacing: '0.05em', fontWeight: '700' }}>📝 Global Scratchpad</h3>
              <textarea value={generalNotes} onChange={(e) => saveGeneralNotes(e.target.value)} placeholder="Drop immediate notes here..." style={{ flex: 1, width: '100%', backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '13px', resize: 'none', outline: 'none', lineHeight: '1.5' }} />
            </div>
          </div>
        </main>
      </div>

      {/* MODAL: ACTIONS AND INGESTS */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Log Ingestion Module</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            
            {/* OPTIMIZED TOKENS ASSET DIGEST ENGINE */}
            <div style={{ marginBottom: '16px', padding: '12px', background: '#020617', borderRadius: '8px', border: '1px dashed #334155' }}>
              <label style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>📷 Extract Text from Image (Zero-Waste Cost Mode)</label>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileInputRef.current.click()} disabled={isProcessingImg} style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                {isProcessingImg ? "Extracting Text Vectors..." : "Upload Image Document"}
              </button>
            </div>

            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="text" placeholder="Entry / Title Header" value={manualTitle} onChange={e => setManualTitle(e.target.value)} style={{ backgroundColor: '#020617', border: '1px solid #1e293b', padding: '11px', color: '#fff', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>START PROFILE</label>
                  <input type="datetime-local" value={manualStart} onChange={e => setManualStart(e.target.value)} style={{ backgroundColor: '#020617', border: '1px solid #1e293b', padding: '10px', color: '#fff', borderRadius: '8px', width: '100%', fontSize: '13px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>END HORIZON</label>
                  <input type="datetime-local" value={manualEnd} onChange={e => setManualEnd(e.target.value)} style={{ backgroundColor: '#020617', border: '1px solid #1e293b', padding: '10px', color: '#fff', borderRadius: '8px', width: '100%', fontSize: '13px' }} />
                </div>
              </div>

              <textarea placeholder="Contextual descriptions or extracted text goes here..." value={manualDesc} onChange={e => setManualDesc(e.target.value)} style={{ backgroundColor: '#020617', border: '1px solid #1e293b', padding: '11px', color: '#fff', borderRadius: '8px', height: '80px', fontSize: '13px', resize: 'none', outline: 'none', lineHeight: '1.4' }} />
              
              <div>
                <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>TARGET SCOPE ROUTE</label>
                <select value={manualChannel} onChange={e => setManualChannel(e.target.value)} style={{ backgroundColor: '#020617', border: '1px solid #1e293b', padding: '11px', color: '#fff', borderRadius: '8px', width: '100%', fontSize: '14px', outline: 'none' }}>
                  <option value="combined">Master Hub (General)</option>
                  <option value="liam">Liam's Life</option>
                  <option value="work">ATI Calendar</option>
                  <option value="zoe">Zoe Calendar</option>
                  <option value="kids-logs">Kids Related Logs</option>
                  <option value="family">Kids Calendar</option>
                </select>
              </div>

              {/* SENTIMENT LOG SWITCHER FOR KIDS RELATED LOGS */}
              {manualChannel === 'kids-logs' && (
                <div style={{ padding: '4px 0' }}>
                  <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '600' }}>LOG METRIC DIRECTIONAL TRACK</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['neutral', 'positive', 'negative'].map((mode) => (
                      <button key={mode} type="button" onClick={() => setLogSentiment(mode)} style={{
                        flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', cursor: 'pointer',
                        backgroundColor: logSentiment === mode ? (mode === 'positive' ? '#10b981' : mode === 'negative' ? '#ef4444' : '#334155') : '#020617',
                        color: logSentiment === mode ? '#fff' : '#94a3b8'
                      }}>
                        {mode === 'positive' ? '🟢 Positive' : mode === 'negative' ? '🔴 Negative' : '⚪ Neutral'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" style={{ backgroundColor: '#0284c7', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', marginTop: '4px' }}>Commit Track Matrix</button>
            </form>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '16px', fontWeight: '700' }}>{selectedEvent.title}</h3>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '0 0 16px 0', backgroundColor: '#020617', padding: '12px', borderRadius: '10px', border: '1px solid #1e293b', lineHeight: '1.5' }}>
              {selectedEvent.description || "No descriptions attached to this stream record."}
            </p>

            {selectedEvent.isUnverified && (
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px dashed #f59e0b', borderRadius: '10px', padding: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '700' }}>❓ Unverified Stream Match Detected:</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button disabled={isLearning} onClick={() => handleLearnAction('verified_kid')} style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: isLearning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {isLearning ? <div className="loading-spinner"></div> : "✅ Is Kid Related (Keep)"}
                  </button>
                  <button disabled={isLearning} onClick={() => handleLearnAction('blocked')} style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: isLearning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {isLearning ? <div className="loading-spinner"></div> : "❌ Not Kid Related (Hide)"}
                  </button>
                </div>
              </div>
            )}

            {/* SEAMLESS ITEM CLONE ENGINE HUB */}
            <div style={{ backgroundColor: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                👥 Clone Matrix Item To Calendar
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={targetRoutingScope} onChange={e => setTargetRoutingScope(e.target.value)} style={{ flex: 2, backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '8px', color: '#fff', borderRadius: '6px', fontSize: '13px', outline: 'none' }}>
                  <option value="liam">Liam's Life</option>
                  <option value="work">ATI Calendar</option>
                  <option value="zoe">Zoe Calendar</option>
                  <option value="kids-logs">Kids Related Logs</option>
                  <option value="family">Kids Calendar</option>
                </select>
                <button disabled={isRouting} onClick={handleRouteCloneTransfer} style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: isRouting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isRouting ? <div className="loading-spinner"></div> : "Clone Event"}
                </button>
              </div>
            </div>
            
            <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.05em', fontWeight: '700' }}>Item Custom Annotations</h4>
            <textarea value={eventNotes} onChange={e => setEventNotes(e.target.value)} placeholder="Type notes directly..." style={{ width: '100%', height: '75px', backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '13px', marginBottom: '16px', resize: 'none', outline: 'none', lineHeight: '1.4' }} />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ backgroundColor: '#1e293b', color: '#94a3b8', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveEventNotes} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>Save Notes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
