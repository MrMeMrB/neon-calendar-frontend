import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const CalendarWrapper = dynamic(() => Promise.all([
  import('@fullcalendar/react'),
  import('@fullcalendar/daygrid'),
  import('@fullcalendar/timegrid'),
  import('@fullcalendar/interaction')
]).then(([FullCalendar, dayGrid, timeGrid, interaction]) => {
  return function Component({ events, isMobile, handleDateSelect, setSelectedEvent, currentCal }) {
    
    // STRICT VISIBILITY FILTER: Only show events matching the selected sidebar calendar view
    const filteredEvents = events.filter(event => {
      if (currentCal === 'combined') return true; // Show everything if "Combined Systems" is active
      return event.calendar === currentCal;       // Otherwise, strictly match 'work', 'zoe', 'liam-life', etc.
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
          const sent = info.event.extendedProps.metricSentiment;
          const icon = isKidsLog ? (sent === 'Negative' ? '🔴 ' : sent === 'Neutral' ? '🟡 ' : '🟢 ') : '';
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
}), { ssr: false, loading: () => <div style={{ color: '#00f0ff', padding: '20px' }}>Syncing Quantum Grid Infrastructure...</div> });

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
  const [userList, setUserList] = useState([]);

  // Admin Create User Form Fields
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDomain, setFormDomain] = useState('combined');
  const [metricSentiment, setMetricSentiment] = useState('Neutral');
  const [metricLocation, setMetricLocation] = useState('at home');
  const [metricSeverity, setMetricSeverity] = useState('2');
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
      const res = await fetch(`${BACKEND_API}/api/events?calendar=${currentCal}&t=${new Date().getTime()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const fetchAdminUsers = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await fetch(`${BACKEND_API}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setUserList(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (token) { fetchAllData(); if (adminViewActive) fetchAdminUsers(); } }, [currentCal, token, adminViewActive]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_API}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newUserRole })
      });
      if (res.ok) { setNewUsername(''); setNewPassword(''); fetchAdminUsers(); }
    } catch (err) { console.error(err); }
  };

  const handleDeleteUser = async (id) => {
    try {
      await fetch(`${BACKEND_API}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAdminUsers();
    } catch (err) { console.error(err); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: formTitle, start: formStart, end: formEnd || null, description: formDesc, calendar: formDomain,
          metricSentiment: formDomain === 'kids-logs' ? metricSentiment : null,
          metricLocation: formDomain === 'kids-logs' ? metricLocation : null,
          metricSeverity: formDomain === 'kids-logs' ? metricSeverity : 0
        })
      });
      if (res.ok) { setIsModalOpen(false); setFormTitle(''); setFormStart(''); setFormEnd(''); setFormDesc(''); fetchAllData(); }
    } catch (err) { console.error(err); }
  };

  const handleRouteEvent = async () => {
    try {
      const res = await fetch(`${BACKEND_API}/api/events/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId: selectedEvent.id, title: selectedEvent.title, start: selectedEvent.start, end: selectedEvent.end, description: selectedEvent.description, targetCalendar: routeTarget, isExternal: selectedEvent.isExternal })
      });
      if (res.ok) { setSelectedEvent(null); fetchAllData(); }
    } catch (err) { console.error(err); }
  };

  const handlePurgeExternal = async (id) => {
    try {
      const res = await fetch(`${BACKEND_API}/api/events/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId: id, status: 'blocked' })
      });
      if (res.ok) { setSelectedEvent(null); fetchAllData(); }
    } catch (err) { console.error(err); }
  };

  // SCREEN RENDERING CONDITION 1: LOGIN PORTAL SCREEN
  if (!token) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#070a12', justifyContent: 'center', alignItems: 'center', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
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
      
      {/* NAVIGATION PANEL */}
      <div style={{ width: isMobile ? '100%' : '340px', background: '#0b1325', borderRight: '1px solid #1a2942', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: '#00f0ff' }}>Matrix Center</h1>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '2px 0 0 0' }}>Operator: {user?.username}</p>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #1a2942', color: '#64748b', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Exit</button>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>Active Filter View</label>
          <select value={currentCal} onChange={(e) => { setAdminViewActive(false); setCurrentCal(e.target.value); }} style={{ width: '100%', padding: '12px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '10px', color: '#fff' }}>
            <option value="combined">Combined Systems</option>
            <option value="liam-life">Liam's Life Hub</option>
            <option value="work">ATI Work Matrix</option>
            <option value="zoe">Zoe Control Hub</option>
            <option value="kids-logs">Kids Behaviour Logs</option>
          </select>
        </div>

        <button onClick={() => { setFormDomain(currentCal === 'combined' ? 'liam-life' : currentCal); setIsModalOpen(true); }} style={{ width: '100%', padding: '12px', background: '#111b2d', color: '#00f0ff', border: '1px solid #1a2942', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>+ Add Custom Metric</button>
        
        {user?.role === 'admin' && (
          <button onClick={() => setAdminViewActive(!adminViewActive)} style={{ width: '100%', padding: '12px', background: adminViewActive ? '#ff0055' : '#070a12', color: '#fff', border: '1px solid #1a2942', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
            {adminViewActive ? "Close User Control" : "🔧 Administrative User Panel"}
          </button>
        )}
      </div>

      {/* CORE DISPLAY LAYER */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '16px', minHeight: '500px' }}>
          
          {adminViewActive ? (
            /* ADMIN COMPONENT BLOCK */
            <div style={{ padding: '10px' }}>
              <h2 style={{ color: '#00f0ff', margin: '0 0 20px 0' }}>User Rights Configuration</h2>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginBottom: '30px' }}>
                <input type="text" placeholder="Username ID" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} style={{ flex: 1, padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }} required />
                <input type="password" placeholder="Passphrase" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ flex: 1, padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }} required />
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} style={{ padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                  <option value="user">Standard User Clearance</option>
                  <option value="admin">Admin Privilege Level</option>
                </select>
                <button type="submit" style={{ padding: '10px 20px', background: '#00f0ff', border: 'none', borderRadius: '6px', color: '#070a12', fontWeight: '800' }}>Create Account</button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {userList.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: '#070a12', borderRadius: '8px', border: '1px solid #1a2942', alignItems: 'center' }}>
                    <div><strong>{u.username}</strong> <span style={{ color: '#64748b', fontSize: '12px' }}>({u.role})</span></div>
                    <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '6px 12px', background: '#ff0055', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>Revoke Access</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* CALENDAR GRID FRAME LAYER */
            isLoading ? <div style={{ color: '#64748b' }}>Refreshing Feeds...</div> :
            <CalendarWrapper 
              key={currentCal} 
              events={events} 
              isMobile={isMobile} 
              currentCal={currentCal} 
              handleDateSelect={() => setIsModalOpen(true)} 
              setSelectedEvent={setSelectedEvent} 
            />
          )}
        </div>
      </div>

      {/* POP-OUT INSPECTOR PANEL SLIDEOVER (MOBILE ADAPTIVE DRAW) */}
      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.9)', display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'flex-end' : 'center', zIndex: 9999, backdropFilter: 'blur(10px)' }}>
          <div style={{ width: '100%', maxWidth: '540px', padding: '24px', background: '#0b1325', borderTop: '2px solid #1a2942', borderLeft: isMobile ? 'none' : '1px solid #1a2942', borderRight: isMobile ? 'none' : '1px solid #1a2942', borderRadius: isMobile ? '24px 24px 0 0' : '16px', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#fff' }}>{selectedEvent.title}</h2>
            <p style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0' }}>Context Focus: {selectedEvent.calendar}</p>
            
            <p style={{ color: '#94a3b8', fontSize: '14px', background: '#070a12', padding: '14px', borderRadius: '8px', border: '1px solid #1a2942', margin: '0 0 20px 0', whiteSpace: 'pre-wrap' }}>{selectedEvent.description || "No descriptions detailed."}</p>
            
            <div style={{ background: '#070a12', padding: '14px', borderRadius: '10px', border: '1px solid #1a2942', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Triage Routing Interface</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={routeTarget} onChange={(e) => setRouteTarget(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
                  <option value="liam-life">Liam's Life Hub</option>
                  <option value="kids-logs">Kids Behaviour Logs</option>
                  <option value="work">ATI Work Matrix</option>
                </select>
                <button onClick={routeTarget ? handleRouteEvent : null} style={{ padding: '8px 14px', background: '#00f0ff', border: 'none', borderRadius: '6px', color: '#070a12', fontWeight: '800', cursor: 'pointer' }}>Execute</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ padding: '10px 16px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '8px', cursor: 'pointer' }}>Dismiss</button>
              <button onClick={() => handlePurgeExternal(selectedEvent.id)} style={{ padding: '10px 16px', background: '#ff0055', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Purge / Hide</button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL LOG MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(4,6,10,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9998, backdropFilter: 'blur(8px)' }}>
          <form onSubmit={handleCreateEvent} style={{ width: '90%', maxWidth: '500px', padding: '24px', background: '#0b1325', border: '1px solid #1a2942', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, color: '#00f0ff' }}>Log Event Parameter</h3>
            <input type="text" placeholder="Metric Name / Context" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} style={{ flex: 1, padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }} required />
              <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} style={{ flex: 1, padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }} />
            </div>
            <select value={formDomain} onChange={(e) => setFormDomain(e.target.value)} style={{ padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff' }}>
              <option value="liam-life">Liam's Life Hub</option>
              <option value="kids-logs">Kids Behaviour Logs</option>
              <option value="work">ATI Work Matrix</option>
              <option value="zoe">Zoe Control Hub</option>
            </select>
            <textarea placeholder="Supplemental Context Descriptions..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} style={{ padding: '10px', background: '#070a12', border: '1px solid #1a2942', borderRadius: '6px', color: '#fff', resize: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', background: '#111b2d', color: '#fff', border: '1px solid #1a2942', borderRadius: '8px' }}>Cancel</button>
              <button type="submit" style={{ padding: '10px 16px', background: '#00f0ff', color: '#070a12', border: 'none', borderRadius: '8px', fontWeight: '700' }}>Commit</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
