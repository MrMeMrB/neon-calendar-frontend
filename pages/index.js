import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const CalendarWrapper = dynamic(() => Promise.all([
  import('@fullcalendar/react'),
  import('@fullcalendar/daygrid'),
  import('@fullcalendar/timegrid'),
  import('@fullcalendar/interaction')
]).then(([FullCalendar, dayGrid, timeGrid, interaction]) => {
  return function Component({ events, isMobile, handleDateSelect, setSelectedEvent }) {
    return (
      <FullCalendar.default
        plugins={[dayGrid.default, timeGrid.default, interaction.default]}
        initialView={isMobile ? 'timeGridDay' : 'dayGridMonth'}
        headerToolbar={{ 
          left: 'prev,next today', 
          center: 'title', 
          right: isMobile ? 'timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay' 
        }}
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
            isExternal: props.isExternal,
            metricSentiment: props.metricSentiment,
            metricLocation: props.metricLocation,
            metricSeverity: props.metricSeverity
          });
        }}
        eventContent={(info) => {
          const isKidsLog = info.event.extendedProps.calendar === 'kids-logs';
          const sent = info.event.extendedProps.metricSentiment;
          const icon = isKidsLog ? (sent === 'Negative' ? '🔴 ' : sent === 'Neutral' ? '🟡 ' : '🟢 ') : '';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', fontSize: '12px', color: '#fff', overflow: 'hidden', background: 'rgba(7,10,18,0.4)', borderRadius: '6px', borderLeft: `3px solid ${info.event.backgroundColor || '#64748b'}` }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>
                {icon}{info.event.title}
              </span>
            </div>
          );
        }}
      />
    );
  };
}), { ssr: false, loading: () => <div style={{ color: '#64748b' }}>Loading Grid Frame...</div> });

const BACKEND_API = "https://calendar-backend-dzdp.onrender.com"; 

export default function App() {
  const [events, setEvents] = useState([]);
  const [currentCal, setCurrentCal] = useState('combined');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Standard Form Metric States
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDomain, setFormDomain] = useState('combined');

  // Kids Behavioral Custom Analytics Metrics States
  const [metricSentiment, setMetricSentiment] = useState('Neutral');
  const [metricLocation, setMetricLocation] = useState('at home');
  const [metricSeverity, setMetricSeverity] = useState('2');

  const [routeTarget, setRouteTarget] = useState('liam-life');
  const [isMobile, setIsMobile] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchAllData = async () => {
    try {
      const t = new Date().getTime();
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCal}&t=${t}`);
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch (err) {
      console.error("Link sync dropped:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasMounted) fetchAllData();
  }, [currentCal, hasMounted]);

  const handleRouteEvent = async () => {
    if (!selectedEvent) return;
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
          targetCalendar: routeTarget,
          isExternal: selectedEvent.isExternal
        })
      });
      if (res.ok) {
        setSelectedEvent(null);
        fetchAllData();
      }
    } catch (err) {}
  };

  const handlePurgeExternal = async (id) => {
    try {
      const res = await fetch(`${BACKEND_API}/api/events/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, status: 'blocked' })
      });
      if (res.ok) {
        setSelectedEvent(null);
        fetchAllData();
      }
    } catch (err) {}
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formTitle || !formStart) return alert("Required context values missing.");
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
          metricSentiment: formDomain === 'kids-logs' ? metricSentiment : null,
          metricLocation: formDomain === 'kids-logs' ? metricLocation : null,
          metricSeverity: formDomain === 'kids-logs' ? metricSeverity : 0
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormTitle(''); setFormStart(''); setFormEnd(''); setFormDesc('');
        fetchAllData();
      }
    } catch (err) {}
  };

  // KPI Metric Data Calculations
  const totalLogs = events.filter(e => e.calendar === 'kids-logs').length;
  const negativeLogs = events.filter(e => e.calendar === 'kids-logs' && e.metricSentiment === 'Negative').length;

  if (!hasMounted || isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center', background: '#070a12' }}>
        <div style={{ width: '60px', height: '60px', border: '4px solid #111b2d', borderTopColor: '#00f0ff', borderRadius: '50%', animation: 'spin 0.8s infinite linear' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: '#070a12', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* SIDEBAR PANEL */}
      <div style={{ width: isMobile ? '100%' : '380px', background: '#0b1325', borderRight: '1px solid #1a2942', padding: '28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#00f0ff' }}>Workspace Matrix</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>Data Flow Control</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '10px' }}>Systems Grid Focus Filter</label>
          <select value={currentCal} onChange={(e) => setCurrentCal(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '12px', color: '#fff' }}>
            <option value="combined">Combined Calendar</option>
            <option value="liam-life">Liam's Life Calendar</option>
            <option value="work">Work Calendar</option>
            <option value="zoe">Zoe Calendar</option>
            <option value="kids-logs">Kids Behavioural Calendar</option>
          </select>
        </div>

        <button onClick={() => { setFormDomain(currentCal === 'combined' ? 'kids-logs' : currentCal); setIsModalOpen(true); }} style={{ width: '100%', padding: '14px', background: '#111b2d', color: '#00f0ff', border: '1px solid #1a2942', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>+ Log Manual Entry</button>

        {/* BEHAVIOURAL SUMMARY MATRIX METRICS SECTION */}
        {currentCal === 'kids-logs' && (
          <div style={{ padding: '20px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '14px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: '#ec4899', letterSpacing: '0.5px' }}>Behavioural KPI Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#0b1325', padding: '12px', borderRadius: '8px', border: '1px solid #1a2942' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Total Events</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>{totalLogs}</div>
              </div>
              <div style={{ background: '#0b1325', padding: '12px', borderRadius: '8px', border: '1px solid #1a2942' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Negative Incidents</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#ff0055' }}>{negativeLogs}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CALENDAR BLOCK VIEW */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '36px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '28px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '20px' }}>
          <CalendarWrapper events={events} isMobile={isMobile} handleDateSelect={() => setIsModalOpen(true)} setSelectedEvent={setSelectedEvent} />
        </div>
      </div>

      {/* DETAILS INSPECTOR & TRIAGE ROUTER */}
      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '500px', padding: '32px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '20px' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', fontWeight: '800' }}>{selectedEvent.title}</h2>
            <p style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Group context: {selectedEvent.calendar}</p>
            
            {selectedEvent.calendar === 'kids-logs' && selectedEvent.metricSentiment && (
              <div style={{ display: 'flex', gap: '8px', margin: '12px 0', padding: '10px', background: '#070a12', borderRadius: '8px', border: '1px solid #1a2942', fontSize: '12px' }}>
                <div><strong>Sentiment:</strong> {selectedEvent.metricSentiment}</div> | 
                <div><strong>Location:</strong> {selectedEvent.metricLocation}</div> | 
                <div><strong>Severity:</strong> Lvl {selectedEvent.metricSeverity}/5</div>
              </div>
            )}

            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '16px 0 24px 0', lineHeight: '1.6' }}>{selectedEvent.description || "No supplemental details logged."}</p>
            
            <div style={{ background: '#070a12', padding: '16px', borderRadius: '12px', border: '1px solid #1a2942', marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>Move/Route This Event Into Core Management</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={routeTarget} onChange={(e) => setRouteTarget(e.target.value)} style={{ flex: 1, padding: '10px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }}>
                  <option value="liam-life">Liam's Life Calendar</option>
                  <option value="kids-logs">Kids Behavioural Calendar</option>
                  <option value="work">Work Calendar</option>
                </select>
                <button onClick={handleRouteEvent} style={{ padding: '10px 16px', background: '#00f0ff', border: 'none', borderRadius: '8px', fontWeight: '800', color: '#070a12', cursor: 'pointer' }}>Execute Route</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ padding: '12px 20px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '12px', cursor: 'pointer' }}>Close Frame</button>
              <button onClick={() => handlePurgeExternal(selectedEvent.id)} style={{ padding: '12px 20px', background: '#ff0055', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Purge/Hide</button>
            </div>
          </div>
        </div>
      )}

      {/* METRIC MANUAL ENTRY MODAL FORM CONTAINER */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9998, backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '520px', padding: '32px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '20px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#00f0ff', fontWeight: '800' }}>Log System Entry Metric</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <input type="text" placeholder="Entry Title / Log Label" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={{ width: '100%', padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }} required />
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} style={{ flex: 1, padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }} required />
                <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} style={{ flex: 1, padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }} />
              </div>

              <select value={formDomain} onChange={(e) => setFormDomain(e.target.value)} style={{ width: '100%', padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }}>
                <option value="liam-life">Liam's Life Calendar</option>
                <option value="kids-logs">Kids Behavioural Calendar</option>
                <option value="work">Work Space Operations</option>
                <option value="zoe">Zoe Hub</option>
              </select>

              {/* DYNAMIC METRIC LOGGER EXCLUSIVELY TRIGGERED FOR KIDS-LOGS */}
              {formDomain === 'kids-logs' && (
                <div style={{ padding: '16px', background: '#070a12', borderRadius: '10px', border: '1px solid #ec4899', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#ec4899', fontWeight: '800' }}>Behaviour Data Parameters</span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Sentiment Value</label>
                      <select value={metricSentiment} onChange={(e) => setMetricSentiment(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                        <option value="Negative">Negative Incident</option>
                        <option value="Neutral">Neutral / Update</option>
                        <option value="Positive">Positive Note</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Context Location</label>
                      <select value={metricLocation} onChange={(e) => setMetricLocation(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                        <option value="at school">At School</option>
                        <option value="at home">At Home</option>
                        <option value="handover">During Handover</option>
                        <option value="external">Other Context</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Impact Severity Level ({metricSeverity}/5)</label>
                    <input type="range" min="1" max="5" value={metricSeverity} onChange={(e) => setMetricSeverity(e.target.value)} style={{ width: '100%', accentColor: '#ec4899' }} />
                  </div>
                </div>
              )}

              <textarea placeholder="Log summary descriptions, details or notes..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff', resize: 'none' }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 20px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '12px' }}>Cancel</button>
                <button type="submit" style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', color: '#070a12', border: 'none', borderRadius: '12px', fontWeight: '800' }}>Inject Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .fc-theme-standard td, .fc-theme-standard th { border: 1px solid #111b2d !important; }
        .fc .fc-button-primary { background: #070a12 !important; border: 1px solid #1a2942 !important; color: #fff !important; font-weight: 700 !important; border-radius: 8px !important; }
        .fc .fc-button-active { background: #00f0ff !important; color: #070a12 !important; font-weight: 800 !important; }
        .fc .fc-toolbar-title { color: #fff !important; font-weight: 900 !important; }
        .fc-day-today { background: rgba(0,240,255,0.02) !important; }
      `}</style>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
