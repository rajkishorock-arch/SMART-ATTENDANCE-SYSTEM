export default function FeaturesDirectoryHub({
  setActiveSubSetting,
  playCyberSound,
  userRole
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.3s ease' }}>
      <div 
        className="surface-card" 
        style={{ 
          padding: '28px', 
          border: '1px solid var(--border-subtle)', 
          background: '#ffffff', 
          borderRadius: '16px',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '2rem' }}>📦</span>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Enterprise & Innovation Suite
          </h2>
        </div>
        <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
          All specialized institutional intelligence and enterprise features consolidated into clean modular toolkits.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

        {/* 1. Industry Enterprise Suite */}
        {userRole !== 'student' && (
          <div
            onClick={() => { setActiveSubSetting('enterprise'); if (playCyberSound) playCyberSound('click'); }}
            className="surface-card hover-card"
            style={{ 
              padding: '22px', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '14px',
              background: '#ffffff',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.4rem' }}>🏭</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>PRO SUITE</span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Industry Enterprise Suite</h3>
            <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>Rules engine, exam mode, escalation, SLA, heatmap, RFID & multi-campus.</p>
          </div>
        )}

        {/* 2. Extreme Level Hub */}
        <div
          onClick={() => { setActiveSubSetting('extreme'); if (playCyberSound) playCyberSound('click'); }}
          className="surface-card hover-card"
          style={{ 
            padding: '22px', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '14px',
            background: '#ffffff',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>🌌</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>56 MODULES</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Extreme Intelligence Hub</h3>
          <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>8 levels — Live Board, AI Copilot, Blockchain, HOD War Room & Marketplace.</p>
        </div>

        {/* 3. Ideas Hub (All 150) */}
        <div
          onClick={() => { setActiveSubSetting('ideas150'); if (playCyberSound) playCyberSound('click'); }}
          className="surface-card hover-card"
          style={{ 
            padding: '22px', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '14px',
            background: '#ffffff',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>🚀</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' }}>150 CAPABILITIES</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Innovation & Idea Labs</h3>
          <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>Interactive UI utilities, camera optimizations, core attendance & AI analytics.</p>
        </div>

        {/* 4. 7 Enterprise Features */}
        <div
          onClick={() => { setActiveSubSetting('features7'); if (playCyberSound) playCyberSound('click'); }}
          className="surface-card hover-card"
          style={{ 
            padding: '22px', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '14px',
            background: '#ffffff',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}>7 SUITES</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Enterprise Automation Hub</h3>
          <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>Multi-Face Group Scanner, WhatsApp Bot, IoT Smart Gate & HR Payroll.</p>
        </div>

        {/* 5. 40 New Features Hub */}
        <div
          onClick={() => { setActiveSubSetting('new_features'); if (playCyberSound) playCyberSound('click'); }}
          className="surface-card hover-card"
          style={{ 
            padding: '22px', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '14px',
            background: '#ffffff',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>💎</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4' }}>40 EXTENSIONS</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Advanced System Extensions</h3>
          <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>Emotion AI, Blockchain ledger, MFA verification, CCTV, Timetable & Wearables.</p>
        </div>

        {/* 6. Student Wellness Center */}
        <div
          onClick={() => { setActiveSubSetting('wellness'); if (playCyberSound) playCyberSound('click'); }}
          className="surface-card hover-card"
          style={{ 
            padding: '22px', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '14px',
            background: '#ffffff',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>💖</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>WELLNESS</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Student Wellness Center</h3>
          <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>Daily mood check-ins, wellness score & counselor alert system.</p>
        </div>

        {/* 7. AR + Gamification Portal */}
        <div
          onClick={() => { setActiveSubSetting('ar_gamification'); if (playCyberSound) playCyberSound('click'); }}
          className="surface-card hover-card"
          style={{ 
            padding: '22px', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '14px',
            background: '#ffffff',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>🏆</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>AR + REWARDS</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>AR & Gamification Hub</h3>
          <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>AR camera face check-in, real student leaderboard & XP achievement badges.</p>
        </div>

      </div>
    </div>
  );
}
