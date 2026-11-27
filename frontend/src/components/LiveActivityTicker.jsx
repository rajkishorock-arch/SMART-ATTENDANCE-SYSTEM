import { Radio, Sparkles } from 'lucide-react';

export default function LiveActivityTicker({ activities = [] }) {
  const hasItems = activities.length > 0;
  const doubled = hasItems ? [...activities, ...activities] : [];

  const getInitials = (text = '') => {
    const clean = text.replace(/[^a-zA-Z\s]/g, '').trim();
    if (!clean) return '✦';
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <div className="glass-ticker-container" role="region" aria-label="Real-time attendance stream">
      <div className="ticker-live-badge">
        <span className="ticker-live-pulse-dot" />
        <Radio size={12} className="ticker-live-icon" />
        <span>LIVE STREAM</span>
      </div>

      <div className="live-activity-track-wrap">
        {hasItems ? (
          <div className="live-activity-track">
            {doubled.map((item, idx) => {
              const isLate = item.type === 'late' || (item.text && item.text.toLowerCase().includes('late'));
              const isAbsent = item.type === 'absent';
              const statusColor = isLate ? '#b45309' : isAbsent ? '#b91c1c' : '#047857';

              return (
                <span key={`${item.id || idx}-${idx}`} className="live-activity-item">
                  <span className="ticker-avatar-bubble">
                    {getInitials(item.text)}
                  </span>
                  <span
                    className="live-activity-dot"
                    style={{ background: statusColor }}
                  />
                  <span className="ticker-item-text">{item.text}</span>
                  <span
                    className="ticker-status-pill"
                    style={{
                      color: statusColor,
                      background: isLate ? 'rgba(217, 119, 6, 0.12)' : isAbsent ? 'rgba(220, 38, 38, 0.1)' : 'rgba(5, 150, 105, 0.12)',
                      borderColor: isLate ? 'rgba(217, 119, 6, 0.28)' : isAbsent ? 'rgba(220, 38, 38, 0.25)' : 'rgba(5, 150, 105, 0.28)'
                    }}
                  >
                    {isLate ? 'Late' : isAbsent ? 'Absent' : 'Verified'}
                  </span>
                  <span className="live-activity-sep">•</span>
                </span>
              );
            })}
          </div>
        ) : (
          <span className="ticker-item-text" style={{ fontSize: '0.78rem', color: '#6b5b3e' }}>
            Waiting for live check-ins — new scans scroll here in real time.
          </span>
        )}
      </div>

      <div className="ticker-sparkle-indicator">
        <Sparkles size={14} color="#8b6525" />
      </div>
    </div>
  );
}

