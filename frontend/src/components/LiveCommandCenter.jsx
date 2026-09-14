import { useEffect, useState } from 'react';
import { UserCheck, Clock, Radio, Award, TrendingUp, Zap } from 'lucide-react';

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
    <div className="glass-stats-grid no-scrollbar" style={{ gap: '16px' }}>
      {/* SCANNER ENGINE CARD ONLY */}
      <div className="surface-card surface-card-hover" style={{ padding: '20px', position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', borderColor: scannerLive ? 'rgba(14, 165, 233, 0.35)' : 'var(--border-subtle)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Scanner Status
            </span>
            <span className={`status-pill ${scannerLive ? 'status-pill-cyan' : ''}`} style={{ fontSize: '0.68rem', padding: '2px 8px', background: scannerLive ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.05)', color: scannerLive ? '#38bdf8' : 'var(--color-text-muted)' }}>
              <Zap size={11} /> {scannerLive ? 'ONLINE' : 'STANDBY'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: scannerLive ? '#38bdf8' : 'var(--color-text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {scannerLive ? 'ACTIVE SESSION' : 'READY TO SCAN'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: scannerLive ? '#0ea5e9' : 'var(--color-text-dim)', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {scannerLive ? 'Live Biometric Session In Progress' : 'Click Start Attendance Session to begin'}
            </span>
          </div>
        </div>

        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: scannerLive ? 'var(--color-primary-light)' : 'rgba(255, 255, 255, 0.05)', color: scannerLive ? '#38bdf8' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Radio size={20} />
        </div>
      </div>
    </div>
  );
}

