import { Activity, Radio } from 'lucide-react';

export default function LiveActivityTicker({ activities = [] }) {
  if (!activities.length) return null;

  const doubled = [...activities, ...activities];

  return (
    <div className="glass-ticker-container">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0, 242, 254, 0.15)',
        border: '1px solid rgba(0, 242, 254, 0.4)',
        padding: '4px 10px',
        borderRadius: '20px',
        color: '#00f2fe',
        fontSize: '0.72rem',
        fontWeight: 800,
        letterSpacing: '0.05em',
        flexShrink: 0,
        boxShadow: '0 0 10px rgba(0, 242, 254, 0.2)'
      }}>
        <Radio size={13} style={{ animation: 'pulse 1.5s infinite' }} />
        <span>LIVE FEED</span>
      </div>
      
      <div className="live-activity-track-wrap" style={{ flexGrow: 1, overflow: 'hidden' }}>
        <div className="live-activity-track" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {doubled.map((item, idx) => (
            <span key={`${item.id}-${idx}`} className="live-activity-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
              <span className="ticker-avatar-bubble">
                {(item.text || 'S').charAt(0).toUpperCase()}
              </span>
              <span className={`live-activity-dot ${item.type}`} style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              {item.text}
              <span className="live-activity-sep" style={{ color: '#475569', marginLeft: 12 }}>•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
