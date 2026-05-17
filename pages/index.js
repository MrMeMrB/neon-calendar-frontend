import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function Home() {
  const [dbEvents, setDbEvents] = useState([]);
  const [stagedEvents, setStagedEvents] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Fallback to avoid crashes if the variable isn't fully loaded yet
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f1f5f9', padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '32px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#38bdf8' }}>Master Workspace</h1>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0', fontFamily: 'monospace' }}>Neon PostgreSQL Secure Inmemory Pipeline Hub</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* CONTROL SIDE PANEL */}
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Option 1: Drop Document</h2>
            <div style={{ border: '2px dashed #475569', borderRadius: '12px', padding: '24px', textAlign: 'center', position: 'relative', backgroundColor: '#0f172a' }}>
              <input type="file" accept=".pdf" onChange={handleFileChange} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} disabled={loading} />
              <p style={{ fontSize: '14px', margin: 0 }}>Select or Drag PDF Here</p>
            </div>
          </div>

          <form onSubmit={handleUrlSubmit} style={{ paddingTop: '20px', borderTop: '1px solid #334155' }}>
            <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Option 2: Paste Web Link</h2>
            <input type="url" placeholder="https://example.com/schedule.pdf" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} disabled={loading} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '12px', fontSize: '14px', color: '#fff', width: '100%', boxSizing: 'border-box', marginBottom: '10px' }} />
            <button type="submit" style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', width: '100%', fontWeight: '600', cursor: 'pointer' }}>Fetch & Extract</button>
          </form>

          {loading && <div style={{ textAlign: 'center', color: '#38bdf8', marginTop: '15px' }}>AI processing in cloud...</div>}

          {/* STAGING INTERFACE */}
          {stagedEvents.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #334155' }}>
              <h3 style={{ color: '#fbbf24', fontSize: '14px', margin: '0 0 10px 0' }}>Detected by Gemini:</h3>
              {stagedEvents.map((ev, idx) => (
                <div key={idx} style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '12px', marginBottom: '10px', borderLeft: '4px solid #f59e0b' }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: '700' }}>{ev.title}</p>
                  <p style={{ margin: '0 0 5px 0', color: '#38bdf8', fontSize: '12px' }}>{new Date(ev.start).toLocaleString()}</p>
                  {ev.description && <p style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: '12px' }}>{ev.description}</p>}
                  <button onClick={() => commitEvent(idx)} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', width: '100%' }}>Approve & Save to Neon</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CALENDAR VIEW */}
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" events={dbEvents} height="auto" eventColor="#0284c7" />
        </div>

      </div>
    </div>
  );
}
