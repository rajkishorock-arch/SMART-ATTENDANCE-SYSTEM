export default function FeaturesDirectoryHub({
  setActiveSubSetting,
  playCyberSound,
  userRole
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.3s ease' }}>
      <div className="glass-panel" style={{ padding: '28px', border: '1px solid rgba(0, 242, 254, 0.35)', background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.06), rgba(167, 139, 250, 0.06))', borderRadius: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '2rem' }}>📦</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            Advanced Features & AR Innovation Hub
          </h2>
        </div>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
          All 7 specialized feature suites consolidated into one folder. Select any hub below to launch.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

        {/* 1. Industry Enterprise Suite */}
        {userRole !== 'student' && (
          <div
            onClick={() => { setActiveSubSetting('enterprise'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card"
            style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.4rem' }}>🏭</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>PRO SUITE</span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>Industry Enterprise Suite</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>Rules engine, exam mode, escalation, SLA, heatmap, RFID & multi-campus.</p>
          </div>
        )}

        {/* 2. Extreme Level Hub */}
        <div
          onClick={() => { setActiveSubSetting('extreme'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card"
          style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>🌌</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa' }}>56 FEAT</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>Extreme Level Hub</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>8 levels — Live Board, AI Copilot, Blockchain, HOD War Room & Marketplace.</p>
        </div>

        {/* 3. Ideas Hub (All 150) */}
        <div
          onClick={() => { setActiveSubSetting('ideas150'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card"
          style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>🚀</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe' }}>150 FEAT</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>Ideas Hub (All 150)</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>UI animations, camera extreme, attendance core & AI analytics.</p>
        </div>

        {/* 4. 7 Enterprise Features */}
        <div
          onClick={() => { setActiveSubSetting('features7'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card"
          style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>7 NEW</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>7 Enterprise Features</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>Multi-Face Group Scanner, WhatsApp Bot, IoT Smart Gate & HR Payroll.</p>
        </div>

        {/* 5. 40 New Features Hub */}
        <div
          onClick={() => { setActiveSubSetting('new_features'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card"
          style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(34, 211, 238, 0.35)', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>🚀</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee' }}>40 NEW</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>40 New Features Hub</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>Emotion AI, Blockchain, MFA, CCTV, Timetable & Wearable tracking.</p>
        </div>

        {/* 6. Student Wellness Center */}
        <div
          onClick={() => { setActiveSubSetting('wellness'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card"
          style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>💖</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>WELLNESS</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>Student Wellness Center</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>Daily mood check-ins, wellness score & counselor alert system.</p>
        </div>

        {/* 7. AR + Gamification Portal */}
        <div
          onClick={() => { setActiveSubSetting('ar_gamification'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card"
          style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>🏆</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>AR + GAME</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>AR + Gamification Portal</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>AR camera face check-in, real student leaderboard & XP badges.</p>
        </div>

      </div>
    </div>
  );
}
