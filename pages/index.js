import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const CalendarWrapper = dynamic(() => Promise.all([
  import('@fullcalendar/react'),
  import('@fullcalendar/daygrid'),
  import('@fullcalendar/timegrid'),
  import('@fullcalendar/interaction')
]).then(([FullCalendar, dayGrid, timeGrid, interaction]) => {
  return function Component({ events, isMobile, handleDateSelect, setSelectedEvent, currentCal }) {
    
    // Fixed filtering logic to ensure specific individual calendar views pull their data correctly
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
            kidsInvolved: props.kidsInvolved, primaryLocation: props.primaryLocation,
            contextSituation: props.contextSituation, category: props.category,
            childReaction: props.childReaction, impactDuration: props.impactDuration,
            evidence: props.evidence, witnesses: props.witnesses, followUp: props.followUp
          });
        }}
        eventContent={(info) => {
          const isKidsLog = info.event.extendedProps.calendar === 'kids-logs';
          const cat = info.event.extendedProps.category;
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
  const [adminViewActive, setAdminViewActive] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [userList, setUserList] = useState([]);

  // Base Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDomain, setFormDomain] = useState('liam-life');

  // Extended Log Matrix Specific Fields
  const [kidsInvolved, setKidsInvolved] = useState('All');
  const [primaryLocation, setPrimaryLocation] = useState('School');
  const [contextSituation, setContextSituation] = useState('School day');
  const [category, setCategory] = useState('Behavioural');
  const [childReaction, setChildReaction] = useState('');
  const [impactDuration, setImpactDuration] = useState('');
  const [evidence, setEvidence] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [followUp, setFollowUp] = useState('');

  const [routeTarget, setRouteTarget] = useState('liam-life');
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
    setAdminViewActive(false);
  };

  const fetchAllData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // 1. Fetch data from your database backend (passing 'combined' if selected, to pull all server events)
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCal === 'public-gcal' ? 'combined' : currentCal}&t=${new Date().getTime()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      let unifiedEvents = Array.isArray(data) ? data : [];

      // 2. Fetch Abington School Google calendar stream dynamically
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
              backgroundColor: '#0284c7' // Distinct blue color accent
            }));
            
            unifiedEvents = [...unifiedEvents, ...formattedPublicEvents];
          }
        } catch (gcalErr) {
          console.error("Abington Calendar stream sync bypass activated:", gcalErr);
        }
      }

      setEvents(unifiedEvents);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { if (token) fetchAllData(); }, [currentCal, token]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formTitle, start: formStart, end: formEnd || null, description: formDesc, calendar: formDomain,
        kidsInvolved: formDomain === 'kids-logs' ? kidsInvolved : null,
        primaryLocation: formDomain === 'kids-logs' ? primaryLocation : null,
        contextSituation: formDomain === 'kids-logs' ? contextSituation : null,
        category: formDomain === 'kids-logs' ? category : null,
        childReaction: formDomain === 'kids-logs' ? childReaction : null,
        impactDuration: formDomain === 'kids-logs' ? impactDuration : null,
        evidence: formDomain === 'kids-logs' ? evidence : null,
        witnesses: formDomain === 'kids-logs' ? witnesses : null,
        followUp: formDomain === 'kids-logs' ? followUp : null
      };

      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormTitle(''); setFormStart(''); setFormEnd(''); setFormDesc('');
        setChildReaction(''); setImpactDuration(''); setEvidence(''); setWitnesses(''); setFollowUp('');
        fetchAllData();
      }
    } catch (err) { console.error(err); }
  };

  const triggerPdfExport = () => {
    alert("Exporting Document Feed Layer... Generating certified chronological registry package.");
    window.print();
  };

  // KPI Computations
  const totalLogs = events.filter(e => e.calendar === 'kids-logs').length;
  const concernLogs = events.filter(e => e.calendar === 'kids-logs' && (e.category === 'Concern' || e.category === 'Behavioural')).length;
  const workLogs = events.filter(e => e.calendar === 'work').length;

  if (!token) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#070a12', justifyContent: 'center', alignItems: 'center', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
        <style>{`
          .quantum-spinner { border: 4px solid rgba(0,240,255,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #00f0ff; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '420px', background: '#0b1325', border: '1px solid #1a2942', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#00f0ff', fontWeight: '900', fontSize: '28px' }}>Security Access</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 28px 0' }}>Matrix Node Verification</p>
          {authError && <div style={{ background: 'rgba(255,0,85,0.1)', border: '1px solid #ff0055', color: '#ff4382', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>{authError}</div>}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px', fontWeight: '700' }}>Identity Token ID</label>
            <input type="text" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '10px', color: '#fff', fontSize: '15px' }} required />
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px', fontWeight: '700' }}>Private Pass-Key</label>
            <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} style={{ width: '100%', padding: '14px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '10px', color: '#fff', fontSize: '15px' }} required />
          </div>
          <button type="submit" style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', border: 'none', borderRadius: '12px', color: '#070a12', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}>Authenticate</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: '#070a12', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .quantum-spinner { border: 4px solid rgba(0,240,255,0.1); width: 40px; height: 40px; border-radius: 50%; border-left-color: #00f0ff; animation: spin 1s linear infinite; }
        .skeleton-pulse { background: linear-gradient(90deg, #0b1325 25%, #1a2942 50%, #0b1325 75%); background-size: 200% 100%; animation: loadingPulse 1.5s infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes loadingPulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      {/* LEFT NAVIGATION SIDEBAR */}
      <div style={{ width: isMobile ? '100%' : '320px', background: '#0b1325', borderRight: '1px solid #1a2942', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#00f0ff', letterSpacing: '0.5px' }}>MATRIX GATEWAY</h1>
            <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0 0', fontFamily: 'monospace' }}>SECURE_NODE // {user?.username}</p>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #1a2942', color: '#ff0055', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>EXIT</button>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '1px' }}>System Array Feed</label>
          <select value={currentCal} onChange={(e) => setCurrentCal(e.target.value)} style={{ width: '100%', padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600' }}>
            <option value="combined">Combined Systems</option>
            <option value="liam-life">Liam's Life Hub</option>
            <option value="work">ATI Work Matrix</option>
            <option value="zoe">Zoe's Calendar</option>
            <option value="kids-logs">Kids Behaviour Logs</option>
            <option value="public-gcal">Abington School Calendar</option> {/* UPDATED LABEL */}
          </select>
        </div>

        <button onClick={() => { setFormDomain(currentCal === 'combined' || currentCal === 'public-gcal' ? 'liam-life' : currentCal); setIsModalOpen(true); }} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', color: '#070a12', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>+ EXECUTE LOG INDEX</button>
        
        <button onClick={triggerPdfExport} style={{ width: '100%', padding: '10px', background: '#111b2d', color: '#94a3b8', border: '1px solid #1a2942', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>📥 EXPORT CERTIFIED PDF</button>

        <button onClick={() => setSidePanelOpen(!sidePanelOpen)} style={{ width: '100%', padding: '10px', background: '#070a12', color: '#00f0ff', border: '1px solid #1a2942', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>
          {sidePanelOpen ? "◀ HIDE ANALYTICS DRAWER" : "▶ OPEN ANALYTICS DRAWER"}
        </button>
      </div>

      {/* MASTER DATA VISUALIZATION VIEWPORT */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
        <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <div className="skeleton-pulse" style={{ flex: 1, borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', color: '#00f0ff', fontFamily: 'monospace' }}>
                <div className="quantum-spinner" style={{ margin: '0 auto 16px auto' }}></div>
                <div>SYNCHRONIZING DATABASES...</div>
              </div>
            </div>
          ) : (
            <CalendarWrapper key={currentCal} events={events} isMobile={isMobile} currentCal={currentCal} handleDateSelect={() => setIsModalOpen(true)} setSelectedEvent={setSelectedEvent} />
          )}
        </div>
      </div>

      {/* SLIDE-OUT METRIC & AUDIT DRAWER */}
      {sidePanelOpen && (
        <div style={{ width: isMobile ? '100%' : '360px', background: '#0b1325', borderLeft: '1px solid #1a2942', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0, boxSizing: 'border-box' }}>
          <div>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#00f0ff', fontWeight: '800', letterSpacing: '0.5px' }}>CRITICAL MEASURABLE KPIS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#070a12', border: '1px solid #1a2942', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>TOTAL LOG entries</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff', marginTop: '4px' }}>{totalLogs}</div>
              </div>
              <div style={{ background: '#070a12', border: '1px solid #1a2942', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>BEHAVIOURAL ALERTS</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#ff0055', marginTop: '4px' }}>{concernLogs}</div>
              </div>
            </div>
            <div style={{ background: '#070a12', border: '1px solid #1a2942', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ATI INDUSTRIAL STREAM VOLUMETRICS</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#00f0ff', marginTop: '4px' }}>{workLogs} Synchronized Check-ins</div>
            </div>
          </div>

          <hr style={{ border: 'none', height: '1px', background: '#1a2942', margin: 0 }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#00f0ff', fontWeight: '800' }}>24-HOUR STRATEGIC INCIDENT MONITOR</h3>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {events.filter(e => ['liam-life', 'zoe'].includes(e.calendar)).slice(0, 5).map(e => (
                <div key={e.id} style={{ padding: '12px', background: '#070a12', borderLeft: `3px solid ${e.calendar === 'zoe' ? '#ff0055' : '#00f0ff'}`, borderRadius: '6px', fontSize: '13px' }}>
                  <div style={{ fontWeight: '700', color: '#fff' }}>{e.title}</div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Timeline Context: {e.calendar === 'zoe' ? "Zoe's Calendar" : "Liam's Life Hub"}</div>
                </div>
              ))}
              {events.filter(e => ['liam-life', 'zoe'].includes(e.calendar)).length === 0 && (
                <div style={{ color: '#475569', fontSize: '12px', fontStyle: 'italic' }}>No synchronization logs processed in past 24 hours.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE INCIDENT REGISTRY METRIC FORM (DYNAMIC LOG INTERFACE) */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9998, backdropFilter: 'blur(10px)', padding: '20px', boxSizing: 'border-box' }}>
          <form onSubmit={handleCreateEvent} style={{ width: '100%', maxWidth: '640px', padding: '28px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.6)' }}>
            <h3 style={{ margin: 0, color: '#00f0ff', fontSize: '20px', fontWeight: '900', borderBottom: '1px solid #1a2942', paddingBottom: '12px' }}>LOG TARGET METRIC ENTRY</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '700' }}>METRIC CONTEXT SEGMENT</label>
                <select value={formDomain} onChange={(e) => setFormDomain(e.target.value)} style={{ width: '100%', padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff' }}>
                  <option value="liam-life">Liam's Life Hub</option>
                  <option value="kids-logs">Kids Behaviour Logs</option>
                  <option value="work">ATI Work Matrix</option>
                  <option value="zoe">Zoe's Calendar</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '700' }}>EVENT SUMMATION TITLE</label>
                <input type="text" placeholder="Factual short summary..." value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '700' }}>STARTING BOUNDARY</label>
                <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} style={{ width: '100%', padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '700' }}>TERMINAL BOUNDARY (OPTIONAL)</label>
                <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} style={{ width: '100%', padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* DYNAMIC FORM SEGMENT RESTRUCTURING */}
            {formDomain === 'kids-logs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,240,255,0.02)', border: '1px dashed #1a2942', padding: '16px', borderRadius: '12px', marginTop: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#00f0ff', marginBottom: '4px', fontWeight: '700' }}>KIDS INVOLVED</label>
                    <select value={kidsInvolved} onChange={(e) => setKidsInvolved(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                      <option value="All">All Children</option>
                      <option value="Jack">Jack</option>
                      <option value="George">George</option>
                      <option value="Indie">Indie</option>
                      <option value="Jasper">Jasper</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#00f0ff', marginBottom: '4px', fontWeight: '700' }}>PRIMARY LOCATION</label>
                    <select value={primaryLocation} onChange={(e) => setPrimaryLocation(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                      <option value="School">School</option>
                      <option value="Home (Dad)">Home (Dad)</option>
                      <option value="Home (Mum)">Home (Mum)</option>
                      <option value="Handover">Handover Point</option>
                      <option value="Activity">Extracurricular Activity</option>
                      <option value="Other">Other Location</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#00f0ff', marginBottom: '4px', fontWeight: '700' }}>CONTEXT / SITUATION</label>
                    <select value={contextSituation} onChange={(e) => setContextSituation(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                      <option value="School day">School day</option>
                      <option value="Mum’s time">Mum’s allocated time</option>
                      <option value="Dad’s time">Dad’s allocated time</option>
                      <option value="Phone call (Mum)">Phone call (Mum while at Dad's)</option>
                      <option value="Phone call (Dad)">Phone call (Dad while at Mum's)</option>
                      <option value="Weekend">Weekend Transition</option>
                      <option value="Holiday">Holiday Session</option>
                      <option value="Medical">Medical appointment</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#00f0ff', marginBottom: '4px', fontWeight: '700' }}>REGISTRY CATEGORY</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                      <option value="Behavioural">Behavioural Record</option>
                      <option value="School">School Correspondence</option>
                      <option value="Mum Contact">Direct Communication Log</option>
                      <option value="Emotional">Emotional State Observation</option>
                      <option value="Health">Health Metric</option>
                      <option value="Routine">Routine Disruption</option>
                      <option value="Positive Event">Positive Event Milestone</option>
                      <option value="Concern">Incident Concern Parameter</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>CHILD REACTION / ACTION</label>
                    <input type="text" placeholder="Factual behavior manifestations..." value={childReaction} onChange={(e) => setChildReaction(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>IMPACT / DURATION METRIC</label>
                    <input type="text" placeholder="e.g. Took 90 mins to settle..." value={impactDuration} onChange={(e) => setImpactDuration(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>VERIFIABLE EVIDENCE REFERENCING</label>
                    <input type="text" placeholder="e.g. Email trace..." value={evidence} onChange={(e) => setEvidence(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>CORROBORATING WITNESSES</label>
                    <input type="text" placeholder="e.g. Teacher..." value={witnesses} onChange={(e) => setWitnesses(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>REQUIRED ACTIONABLE FOLLOW-UP</label>
                  <input type="text" placeholder="e.g. Escalate..." value={followUp} onChange={(e) => setFollowUp(e.target.value)} style={{ width: '100%', padding: '8px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '700' }}>COMPREHENSIVE FACTUAL OBSERVATION DETAILS</label>
              <textarea placeholder="Input clean descriptive data tracking..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={4} style={{ width: '100%', padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '8px', color: '#fff', resize: 'none', boxSizing: 'border-box' }} required />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1a2942', paddingTop: '16px', marginTop: '6px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>ABORT</button>
              <button type="submit" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)', color: '#070a12', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>COMMIT DATA POINT</button>
            </div>
          </form>
        </div>
      )}

      {/* CHRONOLOGICAL INCIDENT AUDIT MONITOR INSPECTOR PANEL */}
      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.9)', display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'flex-end' : 'center', zIndex: 9999, backdropFilter: 'blur(10px)', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '580px', padding: '28px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: isMobile ? '24px 24px 0 0' : '16px', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', color: '#fff', fontWeight: '900' }}>{selectedEvent.title}</h2>
            <p style={{ color: '#00f0ff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0', fontFamily: 'monospace' }}>ARRAY ARCHIVE SOURCE // {selectedEvent.calendar === 'zoe' ? "Zoe's Calendar" : selectedEvent.calendar === 'public-gcal' ? "Abington School Calendar" : selectedEvent.calendar}</p>
            
            <div style={{ background: '#070a12', padding: '16px', borderRadius: '12px', border: '1px solid #1a2942', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Factual Record Details</div>
              <p style={{ fontSize: '14px', color: '#e2e8f0', margin: '8px 0 0 0', lineHeight: '1.6' }}>{selectedEvent.description || "No further baseline description details attached to this tracking entry."}</p>
            </div>

            {selectedEvent.calendar === 'kids-logs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,240,255,0.02)', border: '1px dashed #1a2942', padding: '16px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px' }}>
                <div><strong style={{ color: '#00f0ff' }}>Kids Involved:</strong> {selectedEvent.kidsInvolved}</div>
                <div><strong style={{ color: '#00f0ff' }}>Location:</strong> {selectedEvent.primaryLocation}</div>
                <div><strong style={{ color: '#00f0ff' }}>Context/Situation:</strong> {selectedEvent.contextSituation}</div>
                <div><strong style={{ color: '#00f0ff' }}>Category:</strong> {selectedEvent.category}</div>
                {selectedEvent.childReaction && <div><strong style={{ color: '#64748b' }}>Child Reaction:</strong> {selectedEvent.childReaction}</div>}
                {selectedEvent.impactDuration && <div><strong style={{ color: '#64748b' }}>Impact/Duration:</strong> {selectedEvent.impactDuration}</div>}
                {selectedEvent.evidence && <div><strong style={{ color: '#64748b' }}>Evidence Reference:</strong> {selectedEvent.evidence}</div>}
                {selectedEvent.witnesses && <div><strong style={{ color: '#64748b' }}>Witnesses:</strong> {selectedEvent.witnesses}</div>}
                {selectedEvent.followUp && <div><strong style={{ color: '#64748b' }}>Action Follow-Up:</strong> {selectedEvent.followUp}</div>}
              </div>
            )}

            <button type="button" onClick={() => setSelectedEvent(null)} style={{ width: '100%', padding: '12px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>DISMISS INSPECTOR</button>
          </div>
        </div>
      )}
    </div>
  );
}
