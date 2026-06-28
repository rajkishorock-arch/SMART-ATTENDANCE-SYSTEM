import { useEffect, useState } from 'react';

export default function LiveCommandCenter({ stats, scannerLive, lateCount = 0 }) {
  const [animated, setAnimated] = useState({ present: 0, absent: 0, rate: 0 });

  useEffect(() => {
    const target = {
      present: stats?.total_present_today ?? 0,
      absent: stats?.total_absent_today ?? 0,
      rate: stats?.average_attendance_rate ?? 0,
    };
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      const t = Math.min(1, frame / 20);
      setAnimated({
        present: Math.round(target.present * t),
        absent: Math.round(target.absent * t),
        rate: Math.round(target.rate * t),
      });
      if (t >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [stats?.total_present_today, stats?.total_absent_today, stats?.average_attendance_rate]);

  return (
    <div className="live-command-center">
      <div className={`command-card ${scannerLive ? 'live-pulse' : ''}`}>
        <div className="command-card-value">{animated.present}</div>
        <div className="command-card-label">Abhi Present</div>
      </div>
      <div className="command-card">
        <div className="command-card-value" style={{ color: '#f59e0b' }}>{lateCount || animated.absent}</div>
        <div className="command-card-label">{lateCount ? 'Late Today' : 'Absent Today'}</div>
      </div>
      <div className={`command-card ${scannerLive ? 'live-pulse' : ''}`}>
        <div className="command-card-value" style={{ color: scannerLive ? '#10b981' : '#64748b' }}>
          {scannerLive ? 'LIVE' : 'OFF'}
        </div>
        <div className="command-card-label">Scanner Status</div>
      </div>
      <div className="command-card">
        <div className="command-card-value">{animated.rate}%</div>
        <div className="command-card-label">Campus Rate</div>
      </div>
    </div>
  );
}
