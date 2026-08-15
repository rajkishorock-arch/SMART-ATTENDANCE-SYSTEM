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
    <div className="glass-stats-grid no-scrollbar">
      
      {/* CARD 1: PRESENT TODAY */}
      <div className="glass-stat-card hover-elevate" style={{ '--accent-glow': 'rgba(16, 185, 129, 0.25)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ flex: 1, zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              PRESENT TODAY
            </span>
            <span className="kpi-trend-badge kpi-trend-up">
              <TrendingUp size={11} /> +4.2%
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0 2px' }}>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#34d399', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              {animated.present}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>students</span>
          </div>

          {/* Mini Sparkline SVG */}
          <div style={{ margin: '6px 0 8px', height: '22px' }}>
            <svg className="kpi-sparkline-svg" width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad-present" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0,18 Q20,16 40,10 T80,4 L100,2 L100,22 L0,22 Z" fill="url(#grad-present)" />
              <path d="M0,18 Q20,16 40,10 T80,4 L100,2" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <span className="neon-badge-emerald" style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', display: 'inline-block' }}>
            ● Verified Active
          </span>
        </div>
        
        <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <UserCheck size={22} />
        </div>
      </div>

      {/* CARD 2: LATE / ABSENT */}
      <div className="glass-stat-card hover-elevate" style={{ '--accent-glow': 'rgba(245, 158, 11, 0.25)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ flex: 1, zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {lateCount ? 'LATE TODAY' : 'ABSENT TODAY'}
            </span>
            <span className="kpi-trend-badge" style={{ background: lateCount ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: lateCount ? '#fbbf24' : '#f87171', border: `1px solid ${lateCount ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
              {lateCount ? '⏱ Check-in' : '❗ Attention'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0 2px' }}>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: lateCount ? '#fbbf24' : '#f87171', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              {lateCount || animated.absent}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>records</span>
          </div>

          {/* Mini Sparkline SVG */}
          <div style={{ margin: '6px 0 8px', height: '22px' }}>
            <svg className="kpi-sparkline-svg" width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad-absent" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={lateCount ? '#fbbf24' : '#f87171'} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={lateCount ? '#fbbf24' : '#f87171'} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0,6 Q25,12 50,15 T85,18 L100,19 L100,22 L0,22 Z" fill="url(#grad-absent)" />
              <path d="M0,6 Q25,12 50,15 T85,18 L100,19" fill="none" stroke={lateCount ? '#fbbf24' : '#f87171'} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <span className="neon-badge-amber" style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', display: 'inline-block' }}>
            {lateCount ? '⏱ Grace Period Active' : '● Threshold Monitor'}
          </span>
        </div>

        <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <Clock size={22} />
        </div>
      </div>

      {/* CARD 3: SCANNER ENGINE */}
      <div className={`glass-stat-card hover-elevate ${scannerLive ? 'glass-card-neon' : ''}`} style={{ '--accent-glow': scannerLive ? 'rgba(0, 242, 254, 0.35)' : 'rgba(100, 116, 139, 0.15)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ flex: 1, zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              SCANNER ENGINE
            </span>
            <span className="kpi-trend-badge" style={{ background: scannerLive ? 'rgba(0, 242, 254, 0.15)' : 'rgba(100, 116, 139, 0.15)', color: scannerLive ? '#00f2fe' : '#94a3b8', border: `1px solid ${scannerLive ? 'rgba(0, 242, 254, 0.3)' : 'rgba(100, 116, 139, 0.2)'}` }}>
              <Zap size={11} /> {scannerLive ? 'ONLINE' : 'STANDBY'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0 2px' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: scannerLive ? '#00f2fe' : '#94a3b8', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              {scannerLive ? 'ACTIVE' : 'READY'}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>FPS: {scannerLive ? '30' : '0'}</span>
          </div>

          {/* Pulse Signal line */}
          <div style={{ margin: '6px 0 8px', height: '22px' }}>
            <svg className="kpi-sparkline-svg" width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none">
              <path d="M0,11 L35,11 L40,3 L48,20 L55,5 L60,11 L100,11" fill="none" stroke={scannerLive ? '#00f2fe' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <span className={scannerLive ? 'neon-badge-cyan' : ''} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', display: 'inline-block', color: scannerLive ? '#00f2fe' : '#64748b', background: scannerLive ? 'rgba(0,242,254,0.15)' : 'rgba(255,255,255,0.05)' }}>
            {scannerLive ? '● Live WebSocket Sync' : '○ Standby Mode'}
          </span>
        </div>

        <div className="stat-icon-wrapper" style={{ background: scannerLive ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: scannerLive ? '#00f2fe' : '#64748b', border: scannerLive ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
          <Radio size={22} style={{ animation: scannerLive ? 'pulse 1.5s infinite' : 'none' }} />
        </div>
      </div>

      {/* CARD 4: CAMPUS ATTENDANCE */}
      <div className="glass-stat-card hover-elevate" style={{ '--accent-glow': 'rgba(167, 139, 250, 0.25)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ flex: 1, zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              CAMPUS EFFICIENCY
            </span>
            <span className="kpi-trend-badge" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#c084fc', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
              ✦ Optimal
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0 2px' }}>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#c084fc', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              {animated.rate}%
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>benchmark</span>
          </div>

          {/* Progress Bar with glowing gradient */}
          <div className="kpi-progress-bar-bg">
            <div 
              className="kpi-progress-bar-fill"
              style={{
                width: `${Math.min(100, Math.max(0, animated.rate))}%`,
                background: 'linear-gradient(90deg, #a855f7, #00f2fe)'
              }}
            />
          </div>

          <div style={{ marginTop: '10px' }}>
            <span className="neon-badge-purple" style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', display: 'inline-block' }}>
              ✦ High Attendance Band
            </span>
          </div>
        </div>

        <div className="stat-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#c084fc', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
          <Award size={22} />
        </div>
      </div>

    </div>
  );
}

