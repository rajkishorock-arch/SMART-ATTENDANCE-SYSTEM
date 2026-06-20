import { Activity } from 'lucide-react';

export default function LiveActivityTicker({ activities = [] }) {
  if (!activities.length) return null;

  const doubled = [...activities, ...activities];

  return (
    <div className="live-activity-ticker">
      <div className="live-activity-label">
        <Activity size={14} />
        <span>LIVE</span>
      </div>
      <div className="live-activity-track-wrap">
        <div className="live-activity-track">
          {doubled.map((item, idx) => (
            <span key={`${item.id}-${idx}`} className="live-activity-item">
              <span className={`live-activity-dot ${item.type}`} />
              {item.text}
              <span className="live-activity-sep">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
