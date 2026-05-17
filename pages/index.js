import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function Home() {
  const [dbEvents, setDbEvents] = useState([]);
  const [stagedEvents, setStagedEvents] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const fetchSavedEvents = async () => {
    if (!BACKEND_API) return;
    try {
      const res = await fetch(`${BACKEND_API}/api/events`);
      const data = await res.json();
      if (Array.isArray(data)) setDbEvents(data);
    } catch (err) {
      console.error("Database sync error:", err);
    }
  };

  useEffect(() => {
    fetchSavedEvents();
  }, [BACKEND_API]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setIsModalOpen(false); // Close modal to show progress/staging
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch(`${BACKEND_API}/api/upload-document`, {
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
        body: JSON.stringify({ fileUrl: urlInput })
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
    const item = stagedEvents[index];
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
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* GLOBAL STYLES FOR FULLCALENDAR MOBILE RESPONSIVENESS */}
      <style jsx global>{`
        .fc { max-width: 100%; background: #111827; border-radius: 12px; padding: 16px; border: 1px solid #1f2937; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .fc .fc-toolbar { flex-wrap: wrap; gap: 8px; }
        .fc .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 700; color: #38bdf8; }
        .fc .fc-button-primary { background-color: #1f2937 !important; border-color: #374151 !important; color: #e2e8f0 !important; text-transform: capitalize; font-size: 0.875rem; }
        .fc .fc-button-primary:hover { background-color: #374151 !important; }
        .fc .fc-button-active { background-color: #38bdf8 !important; border-color: #38bdf8 !important; color: #0f172a !important; }
        .fc th { background-color: #1f2937; color: #94a3b8; font-weight: 600; font-size: 0.85rem; padding: 8px 0 !important; }
        .fc-daygrid-calendar-body { background: #111827; }
        @media (max-width: 768px) {
          .fc .fc-toolbar { flex-direction: column; align-items: stretch; text-align: center; }
          .fc-toolbar-chunk { display: flex; justify-content: center; margin-bottom: 4px; }
          .brand-subtitle { display: none; }
        }
      `}</style>

      {/* BRANDED NAVIGATION BAR */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#111827', borderBottom: '1px solid #1f2937', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src="/logo.jpg" 
            alt="Workspace Logo" 
            style={{ height: '54px', width: 'auto', borderRadius: '8px', objectFit: 'contain' }} 
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="brand-subtitle">
            <h2 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: '#f8fafc', letterSpacing: '0.03em' }}>Workspace Control</h2>
            <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Neon Storage Pipeline</p>
          </div>
        </div>
        
        {/* TRIGGER BUTTON */}
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#38bdf8', color: '#090d16', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)' }}
        >
          <span>➕</span> Upload Document
        </button>
      </nav>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* PROCESSING & STAGING NOTIFICATIONS */}
        {loading && (
          <div style={{ backgroundColor: '#1e1b4b', border: '1px solid #3730a3', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center', color: '#a5b4fc', fontWeight: '600' }}>
            ⚡ AI Pipeline active: Parsing document telemetry in cloud memory...
          </div>
        )}

        {stagedEvents.length > 0 && (
          <div style={{ backgroundColor: '#1c1917', border: '1px solid #78350f', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ color: '#fbbf24', fontSize: '16px', margin: '0 0 4px 0', fontWeight: '700' }}>Review Staged Deliverables</h3>
            <p style={{ color: '#a8a29e', fontSize: '13px', margin: '0 0 16px 0' }}>Confirm the entries extracted by Gemini before committing them to Neon storage.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {stagedEvents.map((ev, idx) => (
                <div key={idx} style={{ backgroundColor: '#1c1917', border: '1px solid #44403c', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: '#fff' }}>{ev.title}</h4>
                    <p style={{ margin: '0 0 8px 0', color: '#38bdf8', fontSize: '12px', fontWeight: '600' }}>📅 {new Date(ev.start).toLocaleString()}</p>
                    {ev.description && <p style={{ margin: '0 0 16px 0', color: '#a8a29e', fontSize: '13px', lineHeight: '1.4' }}>{ev.description}</p>}
                  </div>
                  <button onClick={() => commitEvent(idx)} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                    Approve Entry
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALENDAR BLOCK */}
        <div style={{ width: '100%' }}>
          <FullCalendar 
            plugins={[dayGridPlugin, interactionPlugin]} 
            initialView="dayGridMonth" 
            events={dbEvents} 
            height="auto" 
            eventColor="#38bdf8"
            eventTextColor="#090d16"
            eventClassNames="custom-calendar-event"
          />
        </div>
      </main>

      {/* OPTIONS OVERLAY MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#111827', isModalOpen, border: '1px solid #1f2937', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', boxSizing: 'border-box', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#fff' }}>Ingest Schedule Document</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: 0 }}>✕</button>
            </div>

            {/* METHOD A: LOCAL PDF */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Option A: Upload File</label>
              <div style={{ border: '2px dashed #374151', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', position: 'relative', backgroundColor: '#1f2937', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                <input type="file" accept=".pdf" onChange={handleFileChange} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📄</span>
                <p style={{ fontSize: '14px', margin: 0, color: '#e2e8f0', fontWeight: '500' }}>Drop or click to select PDF</p>
                <p style={{ fontSize: '11px', margin: '4px 0 0 0', color: '#64748b' }}>Maximum upload limit 10MB</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center', color: '#4b5563', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', margin: '16px 0', letterSpacing: '0.05em' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#1f2937' }}></div>
              <span style={{ padding: '0 8px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#1f2937' }}></div>
            </div>

            {/* METHOD B: WEB LINK */}
            <form onSubmit={handleUrlSubmit}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Option B: Remote Document Link</label>
              <input 
                type="url" 
                placeholder="https://example.com/roster-manifest.pdf" 
                value={urlInput} 
                onChange={(e) => setUrlInput(e.target.value)}
                style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px', fontSize: '14px', color: '#fff', width: '100%', boxSizing: 'border-box', marginBottom: '12px' }} 
              />
              <button type="submit" style={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8', color: '#38bdf8', padding: '12px', borderRadius: '8px', width: '100%', fontWeight: '700', cursor: 'pointer' }}>
                Stream via URL
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
