import { Radio, Sparkles } from 'lucide-react';

export default function LiveActivityTicker({ activities = [] }) {
  if (!activities.length) return null;

  const doubled = [...activities, ...activities];

  const getInitials = (text = '') => {
    const clean = text.replace(/[^a-zA-Z\s]/g, '').trim();
    if (!clean) return '✦';
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <div className="glass-ticker-container" role="region" aria-label="Real-time attendance stream">
      {/* Live Badge with Pulse Dot */}
      <div className="ticker-live-badge">
        <span className="ticker-live-pulse-dot" />
        <Radio size={12} className="ticker-live-icon" />
        <span>LIVE STREAM</span>
      </div>
      
      {/* Marquee Track Wrap with Gradient Mask */}
      <div className="live-activity-track-wrap">
        <div className="live-activity-track">
          {doubled.map((item, idx) => {
            const isLate = item.type === 'late' || (item.text && item.text.toLowerCase().includes('late'));
            const isAbsent = item.type === 'absent';
            const dotColor = isLate ? '#fbbf24' : isAbsent ? '#f87171' : '#34d399';
            
            return (
              <span key={`${item.id || idx}-${idx}`} className="live-activity-item">
                <span className="ticker-avatar-bubble">
                  {getInitials(item.text)}
                </span>
                <span 
                  className="live-activity-dot" 
                  style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} 
                />
                <span className="ticker-item-text">{item.text}</span>
                <span className="ticker-status-pill" style={{
                  color: dotColor,
                  background: isLate ? 'rgba(245, 158, 11, 0.12)' : isAbsent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  borderColor: isLate ? 'rgba(245, 158, 11, 0.25)' : isAbsent ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'
                }}>
                  {isLate ? 'Late' : isAbsent ? 'Absent' : 'Verified'}
                </span>
                <span className="live-activity-sep">•</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="ticker-sparkle-indicator">
        <Sparkles size={14} color="#00f2fe" />
      </div>
    </div>
  );
}

