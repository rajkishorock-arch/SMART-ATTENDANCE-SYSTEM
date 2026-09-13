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
      
      {/* CARD 1: PRESENT TODAY */}
      <div className="surface-card surface-card-hover" style={{ padding: '20px', position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Present Today
            </span>
            <span className="status-pill status-pill-success" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              <TrendingUp size={11} /> Active
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {animated.present}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>students</span>
          </div>

          <div style={{ margin: '8px 0 10px', height: '18px' }}>
            <svg width="100%" height="18" viewBox="0 0 100 18" preserveAspectRatio="none">
              <path d="M0,14 Q25,12 50,8 T100,2 L100,18 L0,18 Z" fill="rgba(16, 185, 129, 0.08)" />
              <path d="M0,14 Q25,12 50,8 T100,2" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Verified In Session
            </span>
          </div>
        </div>
        
        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UserCheck size={20} />
        </div>
      </div>

      {/* CARD 2: LATE / ABSENT */}
      <div className="surface-card surface-card-hover" style={{ padding: '20px', position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {lateCount ? 'Late Today' : 'Absent Today'}
            </span>
            <span className={`status-pill ${lateCount ? 'status-pill-warning' : 'status-pill-danger'}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              {lateCount ? 'Check-in' : 'Attention'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: lateCount ? '#f59e0b' : '#ef4444', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {lateCount || animated.absent}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>records</span>
          </div>

          <div style={{ margin: '8px 0 10px', height: '18px' }}>
            <svg width="100%" height="18" viewBox="0 0 100 18" preserveAspectRatio="none">
              <path d="M0,4 Q25,8 50,12 T100,16 L100,18 L0,18 Z" fill={lateCount ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)'} />
              <path d="M0,4 Q25,8 50,12 T100,16" fill="none" stroke={lateCount ? '#f59e0b' : '#ef4444'} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: lateCount ? '#f59e0b' : '#ef4444', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {lateCount ? 'Grace Period Monitoring' : 'Requires Follow-up'}
            </span>
          </div>
        </div>

        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: lateCount ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: lateCount ? '#f59e0b' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Clock size={20} />
        </div>
      </div>

      {/* CARD 3: SCANNER ENGINE */}
      <div className="surface-card surface-card-hover" style={{ padding: '20px', position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', borderColor: scannerLive ? 'rgba(14, 165, 233, 0.35)' : 'var(--border-subtle)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Scanner Engine
            </span>
            <span className={`status-pill ${scannerLive ? 'status-pill-cyan' : ''}`} style={{ fontSize: '0.68rem', padding: '2px 8px', background: scannerLive ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.05)', color: scannerLive ? '#38bdf8' : 'var(--color-text-muted)' }}>
              <Zap size={11} /> {scannerLive ? 'ONLINE' : 'STANDBY'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: scannerLive ? '#38bdf8' : 'var(--color-text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {scannerLive ? 'ACTIVE' : 'READY'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>{scannerLive ? '60 FPS' : 'Idle'}</span>
          </div>

          <div style={{ margin: '8px 0 10px', height: '18px' }}>
            <svg width="100%" height="18" viewBox="0 0 100 18" preserveAspectRatio="none">
              <path d="M0,9 L35,9 L40,3 L48,15 L55,4 L60,9 L100,9" fill="none" stroke={scannerLive ? '#0ea5e9' : 'var(--border-strong)'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: scannerLive ? '#0ea5e9' : 'var(--color-text-dim)', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {scannerLive ? 'Live Biometric Sync' : 'Ready to Launch'}
            </span>
          </div>
        </div>

        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: scannerLive ? 'var(--color-primary-light)' : 'rgba(255, 255, 255, 0.05)', color: scannerLive ? '#38bdf8' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Radio size={20} />
        </div>
      </div>

      {/* CARD 4: OVERALL ATTENDANCE RATE */}
      <div className="surface-card surface-card-hover" style={{ padding: '20px', position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Attendance Rate
            </span>
            <span className="status-pill" style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'rgba(139, 92, 246, 0.1)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              Rate
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {animated.rate}%
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>average</span>
          </div>

          {/* Progress Track */}
          <div style={{ margin: '10px 0 10px', height: '6px', width: '100%', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div 
              style={{
                width: `${Math.min(100, Math.max(0, animated.rate))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0ea5e9, #10b981)',
                borderRadius: '9999px',
                transition: 'width 0.5s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Campus Benchmark
            </span>
          </div>
        </div>

        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Award size={20} />
        </div>
      </div>

    </div>
  );
}

