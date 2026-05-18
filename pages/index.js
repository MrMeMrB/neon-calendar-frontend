import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Layers, Clipboard, ChevronRight } from 'lucide-react';

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const CalendarWrapper = dynamic(() => Promise.all([
  import('@fullcalendar/react'),
  import('@fullcalendar/daygrid'),
  import('@fullcalendar/timegrid'),
  import('@fullcalendar/interaction')
]).then(([FullCalendar, dayGrid, timeGrid, interaction]) => {
  return function Component({ events, isMobile, setSelectedEvent, currentCal }) {
    
    const filteredEvents = events.filter(event => {
      if (currentCal === 'combined') return true;
      if (currentCal === 'public-gcal') return event.calendar === 'public-gcal';
      return event.calendar === currentCal || (event.isExternal && event.originCalendar === currentCal);
    });

    return (
      <div style={{ width: '100%', height: '100%', color: '#fff' }}>
        <style>{`
          .fc .fc-button-primary { background-color: #1e293b !important; border-color: #334155 !important; font-size: 11px !important; text-transform: uppercase !important; font-weight: 700 !important; }
          .fc th { background-color: #0f172a !important; padding: 8px 0 !important; font-size: 11px !important; color: #94a3b8 !important; text-transform: uppercase; }
          .fc td { background: #070a12 !important; border: 1px solid #1e293b !important; }
          .fc .fc-daygrid-day-number { font-size: 12px !important; font-family: monospace !important; color: #cbd5e1 !important; padding: 6px !important; }
          .fc-event { border: none !important; padding: 2px 4px !important; border-radius: 4px !important; cursor: pointer !important; }
        `}</style>
        <FullCalendar.default
          plugins={[dayGrid.default, timeGrid.default, interaction.default]}
          initialView={isMobile ? 'timeGridDay' : 'dayGridMonth'}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: isMobile ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={filteredEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          eventClick={(info) => {
            const props = info.event.extendedProps;
            setSelectedEvent({
              id: String(info.event.id), 
              title: info.event.title,
              start: info.event.startStr || (info.event.start ? new Date(info.event.start).toISOString() : new Date().toISOString()), 
              end: info.event.endStr || (info.event.end ? new Date(info.event.end).toISOString() : ''),
              description: props.description || '', 
              calendar: props.calendar || currentCal, 
              isExternal: props.isExternal || false,
              metricSentiment: props.metricSentiment || null, 
              metricLocation: props.metricLocation || null, 
              metricSeverity: props.metricSeverity || 0
            });
          }}
        />
      </div>
    );
  };
}), { ssr: false });

export default function App() {
  const [events, setEvents] = useState([]);
  const [currentCal, setCurrentCal] = useState('combined');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    fetchAllData();
  }, [currentCal]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCal}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleCopyToLifeHub = async (eventToCopy) => {
    try {
      const payload = {
        title: `[Copy] ${eventToCopy.title}`,
        start: eventToCopy.start,
        end: eventToCopy.end || null,
        description: eventToCopy.description || 'Copied from stream.',
        calendar: 'liam-life',
        metricSentiment: null,
        metricLocation: null,
        metricSeverity: 0
      };

      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSelectedEvent(null);
        fetchAllData();
      }
    } catch (err) {
      console.error("Copy execution dropped:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#020617', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={18} style={{ color: '#38bdf8' }} />
          <span style={{ fontWeight: '800', fontSize: '13px' }}>GRIDNODE WORKSPACE</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          {[
            { id: 'combined', label: 'Master View' },
            { id: 'work', label: 'Work Ops' },
            { id: 'zoe', label: 'Zoe Stream' },
            { id: 'kids-logs', label: 'Child Logs' },
            { id: 'liam-life', label: 'Liam Focus' }
          ].map(cal => (
            <button key={cal.id} onClick={() => setCurrentCal(cal.id)} style={{ padding: '8px 14px', background: currentCal === cal.id ? '#1e293b' : '#020617', border: currentCal === cal.id ? '1px solid #38bdf8' : '1px solid #1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>
              {cal.label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, padding: '20px', display: 'flex', gap: '16px', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ margin: 'auto', fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>Refreshing streams...</div>
          ) : (
            <CalendarWrapper events={events} isMobile={isMobile} setSelectedEvent={setSelectedEvent} currentCal={currentCal} />
          )}
        </div>

        {selectedEvent && (
          <div style={{ width: '320px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}>
                <span>Calendar</span> <ChevronRight size={10} /> <span style={{ color: '#38bdf8' }}>{selectedEvent.calendar}</span>
              </div>
              <h4 style={{ margin: '5px 0 0 0', color: '#fff', fontSize: '16px', fontWeight: '800' }}>{selectedEvent.title}</h4>
            </div>

            <div style={{ background: '#020617', border: '1px solid #1e293b', padding: '12px', borderRadius: '10px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              <div><strong>START:</strong> {new Date(selectedEvent.start).toLocaleString()}</div>
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ margin: '0', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>{selectedEvent.description || 'No notes.'}</p>
            </div>
            
            {selectedEvent.calendar === 'kids-logs' && (
              <div style={{ fontSize: '11px', background: 'rgba(249,115,22,0.05)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(249,115,22,0.2)' }}>
                <div><strong>Location:</strong> {selectedEvent.metricLocation || 'Unspecified'}</div>
                <div><strong>Severity:</strong> Level {selectedEvent.metricSeverity || 0}</div>
              </div>
            )}

            {selectedEvent.calendar !== 'liam-life' && (
              <button 
                onClick={() => handleCopyToLifeHub(selectedEvent)}
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '800' }}
              >
                COPY TO LIFE HUB
              </button>
            )}

            <button onClick={() => setSelectedEvent(null)} style={{ width: '100%', padding: '10px', background: '#1e293b', border: 'none', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}>Dismiss Pane</button>
          </div>
        )}
      </div>
    </div>
  );
}
