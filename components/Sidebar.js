import React from 'react';

export default function Sidebar({ currentView, setCurrentView }) {
  const links = [
    { id: 'combined', label: '🎛️ Master Hub (All)', color: '#38bdf8' },
    { id: 'liam', label: '👨 Liam\'s Life', color: '#10b981' },
    { id: 'work', label: '💼 ATI Work', color: '#818cf8' },
    { id: 'family', label: '🏡 Family & Kids', color: '#f59e0b' }
  ];

  return (
    <div style={{ width: '260px', backgroundColor: '#111827', borderRight: '1px solid #1f2937', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ padding: '0 8px 16px 8px', borderBottom: '1px solid #1f2937', marginBottom: '16px' }}>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navigation Matrix</span>
      </div>
      {links.map(link => (
        <button
          key={link.id}
          onClick={() => setCurrentView(link.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: currentView === link.id ? '#1f2937' : 'transparent',
            color: currentView === link.id ? link.color : '#94a3b8',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {link.label}
        </button>
      ))}
    </div>
  );
}
