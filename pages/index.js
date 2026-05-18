import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const CalendarWrapper = dynamic(() => Promise.all([
  import('@fullcalendar/react'),
  import('@fullcalendar/daygrid'),
  import('@fullcalendar/timegrid'),
  import('@fullcalendar/interaction')
]).then(([FullCalendar, dayGrid, timeGrid, interaction]) => {
  return function Component({ events, isMobile, handleDateSelect, setSelectedEvent, currentCal }) {
    
    const filteredEvents = events.filter(event => {
      if (currentCal === 'combined') return true;
      return event.calendar === currentCal;
    });

    return (
      <FullCalendar.default
        plugins={[dayGrid.default, timeGrid.default, interaction.default]}
        initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
        headerToolbar={{ 
          left: 'prev,next today', 
          center: 'title', 
          right: isMobile ? 'listWeek,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay' 
        }}
        events={filteredEvents}
        height="100%"
        selectable={true}
        select={handleDateSelect}
        eventClick={(info) => {
          const props = info.event.extendedProps;
          setSelectedEvent({
            id: info.event.id, title: info.event.title,
            start: info.event.startStr, end: info.event.endStr,
            description: props.description, calendar: props.calendar, isExternal: props.isExternal,
            metricSentiment: props.metricSentiment, metricLocation: props.metricLocation, metricSeverity: props.metricSeverity
          });
        }}
        eventContent={(info) => {
          const isKidsLog = info.event.extendedProps.calendar === 'kids-logs';
          const cat = info.event.extendedProps.metricSentiment;
          let icon = '';
          if (isKidsLog) {
            if (cat === 'Concern' || cat === 'Behavioural') icon = '🔴 ';
            else if (cat === 'Emotional' || cat === 'Health') icon = '🟡 ';
            else if (cat === 'Positive Event') icon = '🟢 ';
            else icon = '🔷 ';
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px', fontSize: '11px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', background: 'rgba(7,10,18,0.6)', borderRadius: '4px', borderLeft: `3px solid ${info.event.backgroundColor || '#64748b'}` }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                {icon}{info.event.title}
              </span>
            </div>
          );
        }}
      />
    );
  };
}), { ssr: false, loading: () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#00f0ff', padding: '40px', background: '#070a12', fontFamily: 'monospace' }}>
    <div className="quantum-spinner"></div>
    <span>INITIALIZING QUANTUM GRID INFRASTRUCTURE...</span>
  </div>
) });

const BACKEND_API = "https://calendar-backend-dzdp.onrender.com"; 

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');

  const [events, setEvents] = useState([]);
  const [currentCal, setCurrentCal] = useState('combined');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  // Export Wizard Option Selectors
  const [exportWizardOpen, setExportWizardOpen] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState('kids-detailed'); // 'kids-detailed' | 'next-week' | 'highlights'

  // Form Base States
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDomain, setFormDomain] = useState('liam-life');

  // Extended Matrix Controls
  const [kidsInvolved, setKidsInvolved] = useState('All'); 
  const [primaryLocation, setPrimaryLocation] = useState('School');
  const [category, setCategory] = useState('Behavioural');
  const [severity, setSeverity] = useState(0);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    const savedToken = localStorage.getItem('matrix_auth_token');
    const savedUser = localStorage.getItem('matrix_auth_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${BACKEND_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication denied.");
      localStorage.setItem('matrix_auth_token', data.token);
      localStorage.setItem('matrix_auth_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  const fetchAllData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCal === 'public-gcal' ? 'combined' : currentCal}&t=${new Date().getTime()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      let unifiedEvents = Array.isArray(data) ? data : [];

      if (currentCal === 'combined' || currentCal === 'public-gcal') {
        try {
          const publicRes = await fetch("https://api.icsify.com/v1/feed?url=https://calendar.google.com/calendar/ical/c_ca05bb6f1b85733a8038889ae52245021dcf5f1253116eb7c88dd45745fa5965%40group.calendar.google.com/public/basic.ics");
          const publicData = await publicRes.json();
          
          if (publicData && Array.isArray(publicData.events)) {
            const formattedPublicEvents = publicData.events.map(ev => ({
              id: ev.uid || Math.random().toString(36).substr(2, 9),
              title: ev.summary || 'School Event',
              start: ev.start,
              end: ev.end || null,
              description: ev.description || '',
              calendar: 'public-gcal', 
              backgroundColor: '#0284c7'
            }));
            unifiedEvents = [...unifiedEvents, ...formattedPublicEvents];
          }
        } catch (gcalErr) {
          console.error("Abington Calendar stream sync bypass activated:", gcalErr);
        }
      }
      setEvents(unifiedEvents);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (token) fetchAllData(); }, [currentCal, token]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formTitle, start: formStart, end: formEnd || null, description: formDesc, calendar: formDomain,
        metricSentiment: formDomain === 'kids-logs' ? category : null,
        metricLocation: formDomain === 'kids-logs' ? primaryLocation : null,
        metricSeverity: formDomain === 'kids-logs' ? parseInt(severity) : 0
      };

      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormTitle(''); setFormStart(''); setFormEnd(''); setFormDesc(''); setSeverity(0);
        fetchAllData();
      }
    } catch (err) { console.error(err); }
  };

  // --- REPORT EXPORT DATA FILTERS ---
  const executePrintLayout = () => {
    setExportWizardOpen(false);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const getKidsLogs = () => events.filter(e => e.calendar === 'kids-logs');
  const getNext7DaysEvents = () => {
    const startRange = new Date();
    const endRange = new Date();
    endRange.setDate(startRange.getDate() + 7);
    return events.filter(e => {
      const dateVal = new Date(e.start);
      return dateVal >= startRange && dateVal <= endRange;
    });
  };

  const totalLogs = events.filter(e => e.calendar === 'kids-logs').length;
  const concernLogs = events.filter(e => e.calendar === 'kids-logs' && (e.metricSentiment === 'Concern' || e.metricSentiment === 'Behavioural')).length;
  const workLogs = events.filter(e => e.calendar === 'work').length;

  if (!token) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#070a12', justifyContent: 'center', alignItems: 'center', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '420px', background: '#0b1325', border: '1px solid #1a2942', padding: '40px', borderRadius: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#00f0ff', fontWeight: '900', fontSize: '28px' }}>Security Access</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 28px 0' }}>Matrix Node Verification</p>
          {authError && <div style={{ background: 'rgba(255,0,85,0.1)', border: '1px solid #ff0055', color: '#ff4382', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>{authError}</div>}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Identity Token ID</label>
            <input type="text" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '10px', color: '#fff' }} required />
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Private Pass-Key</label>
            <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '10px', color: '#fff' }} required />
          </div>
          <button type="submit" style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', border: 'none', borderRadius: '12px', color: '#070a12', fontWeight: '800', cursor: 'pointer' }}>Authenticate</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: '#070a12', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* GLOBAL HIGH-CONTRAST INK SAVER PRINT STYLING TARGET LAYER */}
      <style>{`
        .quantum-spinner { border: 4px solid rgba(0,240,255,0.1); width: 40px; height: 40px; border-radius: 50%; border-left-color: #00f0ff; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        @media print {
          body, html, #__next { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .print-report-container { display: block !important; padding: 30px; background: #fff !important; color: #000 !important; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #111; padding: 10px; text-align: left; font-size: 12px; color: #000 !important; }
          th { background-color: #eaeaea !important; font-weight: bold; text-transform: uppercase; }
        }
        @media screen {
          .print-report-container { display: none !important; }
        }
      `}</style>

      {/* SIDEBAR PANEL (HIDDEN DURING PRINT) */}
      <div className="no-print" style={{ width: isMobile ? '100%' : '320px', background: '#0b1325', borderRight: '1px solid #1a2942', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#00f0ff' }}>MATRIX GATEWAY</h1>
            <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0 0', fontFamily: 'monospace' }}>SECURE_NODE // {user?.username}</p>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #1a2942', color: '#ff0055', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>EXIT</button>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>System Array Feed</label>
          <select value={currentCal} onChange={(e) => setCurrentCal(e.target.value)} style={{ width: '100%', padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600' }}>
            <option value="combined">Combined Systems</option>
            <option value="liam-life">Liam's Life Hub</option>
            <option value="work">ATI Work Matrix</option>
            <option value="zoe">Zoe's Calendar</option>
            <option value="kids-logs">Kids Behaviour Logs</option>
            <option value="public-gcal">Abington School Calendar</option>
          </select>
        </div>

        <button onClick={() => { setFormDomain(currentCal === 'combined' || currentCal === 'public-gcal' ? 'liam-life' : currentCal); setIsModalOpen(true); }} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', color: '#070a12', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>+ EXECUTE LOG INDEX</button>
        
        {/* OPENS NEW SELECTABLE WIZARD MODAL POPUP */}
        <button onClick={() => setExportWizardOpen(true)} style={{ width: '100%', padding: '10px', background: '#111b2d', color: '#94a3b8', border: '1px solid #1a2942', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>📥 EXPORT STRATEGIC PDF</button>

        <button onClick={() => setSidePanelOpen(!sidePanelOpen)} style={{ width: '100%', padding: '10px', background: '#070a12', color: '#00f0ff', border: '1px solid #1a2942', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
          {sidePanelOpen ? "◀ HIDE ANALYTICS DRAWER" : "▶ OPEN ANALYTICS DRAWER"}
        </button>
      </div>

      {/* MAIN VIEWPORT MATRIX GRAPH (HIDDEN DURING PRINT) */}
      <div className="no-print" style={{ flex: 1, padding: isMobile ? '12px' : '24px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
        <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#00f0ff' }}>
              <div className="quantum-spinner" style={{ marginRight: '10px' }}></div> RUNNING CHRONO SYNC INFRASTRUCTURE...
            </div>
          ) : (
            <CalendarWrapper key={currentCal} events={events} isMobile={isMobile} currentCal={currentCal} handleDateSelect={() => setIsModalOpen(true)} setSelectedEvent={setSelectedEvent} />
          )}
        </div>
      </div>

      {/* KPI METRICS SIDE PANEL DRAWER (HIDDEN DURING PRINT) */}
      {sidePanelOpen && (
        <div className="no-print" style={{ width: isMobile ? '100%' : '360px', background: '#0b1325', borderLeft: '1px solid #1a2942', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#00f0ff', fontWeight: '800' }}>CRITICAL MEASURABLE KPIS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#070a12', border: '1px solid #1a2942', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>TOTAL LOG entries</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{totalLogs}</div>
              </div>
              <div style={{ background: '#070a12', border: '1px solid #1a2942', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>BEHAVIOURAL ALERTS</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#ff0055' }}>{concernLogs}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DYNAMIC PRINT REPORT LAYER (RENDERED ONLY VIA WINDOW.PRINT)
          ======================================================== */}
      <div className="print-report-container" style={{ color: '#000' }}>
        {selectedExportType === 'kids-detailed' && (
          <div>
            <h1 style={{ borderBottom: '2px solid #000', paddingBottom: '6px', margin: 0 }}>Detailed Incident & Event Registry Log</h1>
            <p style={{ margin: '4px 0 20px 0', fontSize: '13px', color: '#333' }}><strong>Date Generated:</strong> {new Date().toLocaleDateString()} // Factual Observation Record</p>
            <table>
              <thead>
                <tr>
                  <th>Timestamp Bounds</th>
                  <th>Incident Context / Title</th>
                  <th>Metric Category</th>
                  <th>Primary Location</th>
                  <th>Severity Index</th>
                  <th>Factual Cross-Reference Observations</th>
                </tr>
              </thead>
              <tbody>
                {getKidsLogs().map(e => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.start).toLocaleString()}</td>
                    <td><strong>{e.title}</strong></td>
                    <td>{e.metricSentiment || 'Unclassified'}</td>
                    <td>{e.metricLocation || 'Unspecified'}</td>
                    <td style={{ fontWeight: 'bold' }}>Lv {e.metricSeverity || 0}</td>
                    <td>{e.description || 'No supplementary data entered.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedExportType === 'next-week' && (
          <div>
            <h1 style={{ borderBottom: '2px solid #000', paddingBottom: '6px', margin: 0 }}>7-Day Lookahead Operational Horizon</h1>
            <p style={{ margin: '4px 0 20px 0', fontSize: '13px', color: '#333' }}><strong>Horizon Timeline:</strong> Upcoming 7 Days Complete Routine Execution Plan</p>
            <table>
              <thead>
                <tr>
                  <th>Scheduled Time</th>
                  <th>System Array Source</th>
                  <th>Activity / Operation Title</th>
                  <th>Descriptive Details</th>
                </tr>
              </thead>
              <tbody>
                {getNext7DaysEvents().map(e => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.start).toLocaleString()}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold' }}>{e.calendar}</td>
                    <td><strong>{e.title}</strong></td>
                    <td>{e.description || 'No descriptive details attached.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedExportType === 'highlights' && (
          <div>
            <h1 style={{ borderBottom: '2px solid #000', paddingBottom: '6px', margin: 0 }}>Calendar System Metrics & Highlights Overview</h1>
            <p style={{ margin: '4px 0 20px 0', fontSize: '13px', color: '#333' }}><strong>System Quantization Summary Report Profile</strong></p>
            
            <div style={{ margin: '20px 0', border: '1px solid #111', padding: '16px', background: '#f5f5f5' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Core KPI Metrics Summary</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                <li><strong>Total Active Global Document Registry Items Matrixed:</strong> {events.length} system logs</li>
                <li><strong>Total Family Activity / Behavior Logs Logged:</strong> {totalLogs} entries</li>
                <li><strong>Critical Incident Flags Actively Counted:</strong> {concernLogs} warnings</li>
                <li><strong>ATI Corporate Calibration Operations Tracked:</strong> {workLogs} items</li>
              </ul>
            </div>

            <h3>Recent Activity Feed Highlights Ledger</h3>
            <table>
              <thead>
                <tr>
                  <th>Timeline Stamp</th>
                  <th>Calendar Hub Domain</th>
                  <th>Operational Title Context</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 20).map(e => (
                  <tr key={e.id}>
                    <td>{new Date(e.start).toLocaleString()}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '10px' }}>{e.calendar}</td>
                    <td>{e.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- EXPORT CONFIGURATION MODAL WIZARD --- */}
      {exportWizardOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '480px', padding: '28px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#00f0ff', fontSize: '18px' }}>DOCUMENT EXPORT ENGINE WIZARD</h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>Configure structural format variables for standard PDF print layout generation.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#070a12', borderRadius: '8px', border: selectedExportType === 'kids-detailed' ? '1px solid #00f0ff' : '1px solid #1a2942', cursor: 'pointer' }}>
                <input type="radio" name="exportOption" checked={selectedExportType === 'kids-detailed'} onChange={() => setSelectedExportType('kids-detailed')} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>1. Detailed Incident & Event Logs</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Full analytical matrix data breakdown including location identifiers and severity level values.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#070a12', borderRadius: '8px', border: selectedExportType === 'next-week' ? '1px solid #00f0ff' : '1px solid #1a2942', cursor: 'pointer' }}>
                <input type="radio" name="exportOption" checked={selectedExportType === 'next-week'} onChange={() => setSelectedExportType('next-week')} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>2. Next Week's Operational Schedule</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Filters timelines chronologically to generate a 7-day layout plan for scheduling routines.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#070a12', borderRadius: '8px', border: selectedExportType === 'highlights' ? '1px solid #00f0ff' : '1px solid #1a2942', cursor: 'pointer' }}>
                <input type="radio" name="exportOption" checked={selectedExportType === 'highlights'} onChange={() => setSelectedExportType('highlights')} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>3. Calendar Metrics & Highlights Overview</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>High level metrics summary report containing active volume statistics, counts and key details.</div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setExportWizardOpen(false)} style={{ padding: '10px 16px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>ABORT</button>
              <button onClick={executePrintLayout} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', color: '#070a12', border: 'none', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' }}>GENERATE CERTIFIED PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* BASE LOG INDEXING MODAL FORM */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9998, padding: '20px', boxSizing: 'border-box' }}>
          <form onSubmit={handleCreateEvent} style={{ width: '100%', maxWidth: '600px', padding: '28px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, color: '#00f0ff', fontSize: '20px', borderBottom: '1px solid #1a2942', paddingBottom: '12px' }}>LOG TARGET METRIC ENTRY</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>METRIC CONTEXT SEGMENT</label>
                <select value={formDomain} onChange={(e) => setFormDomain(e.target.value)} style={{ width: '100%', padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }}>
                  <option value="liam-life">Liam's Life Hub</option>
                  <option value="kids-logs">Kids Behaviour Logs</option>
                  <option value="work">ATI Work Matrix</option>
                  <option value="zoe">Zoe's Calendar</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>EVENT SUMMATION TITLE</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }} required />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>STARTING BOUNDARY</label>
                <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} style={{ width: '100%', padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>TERMINAL BOUNDARY (OPTIONAL)</label>
                <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} style={{ width: '100%', padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }} />
              </div>
            </div>

            {formDomain === 'kids-logs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,240,255,0.02)', border: '1px dashed #1a2942', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#00f0ff' }}>PRIMARY LOCATION</label>
                    <select value={primaryLocation} onChange={(e) => setPrimaryLocation(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                      <option value="School">School</option>
                      <option value="Home (Dad)">Home (Dad)</option>
                      <option value="Home (Mum)">Home (Mum)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#00f0ff' }}>REGISTRY CATEGORY</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                      <option value="Behavioural">Behavioural Record</option>
                      <option value="School">School Correspondence</option>
                      <option value="Concern">Incident Concern Parameter</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#00f0ff', marginBottom: '4px' }}>SEVERITY INDEX LEVEL (0-5)</label>
                  <input type="number" min="0" max="5" value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }} />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>COMPREHENSIVE FACTUAL OBSERVATION DETAILS</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={4} style={{ width: '100%', padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff', resize: 'none' }} required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '8px' }}>ABORT</button>
              <button type="submit" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', color: '#070a12', border: 'none', borderRadius: '8px' }}>COMMIT DATA POINT</button>
            </div>
          </form>
        </div>
      )}

      {/* EVENT DETAILED INSPECTOR DIALOGUE */}
      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '580px', padding: '28px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '16px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', color: '#fff' }}>{selectedEvent.title}</h2>
            <p style={{ color: '#00f0ff', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 20px 0' }}>ARRAY ARCHIVE SOURCE // {selectedEvent.calendar}</p>
            <div style={{ background: '#070a12', padding: '16px', borderRadius: '12px', border: '1px solid #1a2942', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#e2e8f0', margin: 0, lineHeight: '1.6' }}>{selectedEvent.description || "No baseline description details attached."}</p>
            </div>
            <button type="button" onClick={() => setSelectedEvent(null)} style={{ width: '100%', padding: '12px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '8px' }}>DISMISS INSPECTOR</button>
          </div>
        </div>
      )}

    </div>
  );
}
