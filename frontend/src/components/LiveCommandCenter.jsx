import { useEffect, useState } from 'react';
import { UserCheck, Clock, Radio, Award } from 'lucide-react';

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
    <div className="glass-stats-grid no-scrollbar">
      
      {/* CARD 1: PRESENT TODAY */}
      <div className="glass-stat-card hover-elevate" style={{ '--accent-glow': 'rgba(16, 185, 129, 0.25)' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            PRESENT TODAY
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', margin: '4px 0 0', fontFamily: "'Outfit', sans-serif" }}>
            {animated.present}
          </div>
          <span className="neon-badge-emerald" style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', marginTop: '6px', display: 'inline-block' }}>
            ● Verified Active
          </span>
        </div>
        <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <UserCheck size={24} />
        </div>
      </div>

      {/* CARD 2: LATE / ABSENT */}
      <div className="glass-stat-card hover-elevate" style={{ '--accent-glow': 'rgba(245, 158, 11, 0.25)' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {lateCount ? 'LATE TODAY' : 'ABSENT TODAY'}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: lateCount ? '#fbbf24' : '#f87171', margin: '4px 0 0', fontFamily: "'Outfit', sans-serif" }}>
            {lateCount || animated.absent}
          </div>
          <span className="neon-badge-amber" style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', marginTop: '6px', display: 'inline-block' }}>
            {lateCount ? '⏱ Check-in Alert' : '❗ Attention Needed'}
          </span>
        </div>
        <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <Clock size={24} />
        </div>
      </div>

      {/* CARD 3: SCANNER STATUS */}
      <div className={`glass-stat-card hover-elevate ${scannerLive ? 'glass-card-neon' : ''}`} style={{ '--accent-glow': scannerLive ? 'rgba(0, 242, 254, 0.35)' : 'rgba(100, 116, 139, 0.15)' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            SCANNER ENGINE
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: scannerLive ? '#00f2fe' : '#64748b', margin: '4px 0 0', fontFamily: "'Outfit', sans-serif" }}>
            {scannerLive ? 'ACTIVE' : 'IDLE'}
          </div>
          <span className={scannerLive ? 'neon-badge-cyan' : ''} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', marginTop: '6px', display: 'inline-block', color: scannerLive ? '#00f2fe' : '#64748b', background: scannerLive ? 'rgba(0,242,254,0.15)' : 'rgba(255,255,255,0.05)' }}>
            {scannerLive ? '● Live WebSocket Sync' : '○ Standby Mode'}
          </span>
        </div>
        <div className="stat-icon-wrapper" style={{ background: scannerLive ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: scannerLive ? '#00f2fe' : '#64748b', border: scannerLive ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
          <Radio size={24} style={{ animation: scannerLive ? 'pulse 1.5s infinite' : 'none' }} />
        </div>
      </div>

      {/* CARD 4: CAMPUS RATE */}
      <div className="glass-stat-card hover-elevate" style={{ '--accent-glow': 'rgba(167, 139, 250, 0.25)' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            CAMPUS ATTENDANCE
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#c084fc', margin: '4px 0 0', fontFamily: "'Outfit', sans-serif" }}>
            {animated.rate}%
          </div>
          <span className="neon-badge-purple" style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', marginTop: '6px', display: 'inline-block' }}>
            ✦ Overall Efficiency
          </span>
        </div>
        <div className="stat-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#c084fc', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
          <Award size={24} />
        </div>
      </div>

    </div>
  );
}
