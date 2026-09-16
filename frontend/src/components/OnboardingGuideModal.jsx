import { useState } from 'react';

// =====================================================================
// INTERACTIVE ONBOARDING GUIDE MODAL
// =====================================================================
export default function OnboardingGuideModal({ onClose, playCyberSound }) {
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      title: "🧭 Welcome to Smart Attendance!",
      desc: "Let's take a quick 1-minute tour to understand how to use and navigate the system easily.",
      icon: "✨",
      color: "#00f2fe",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#d1d5db' }}>
          <p><strong>1. Main Navigation Sidebar:</strong> Switch between logs, reports, profiles, leaves, and configurations on the left panel (bottom menu on mobile).</p>
          <p><strong>2. Profile & Status Check:</strong> Click on "My Profile" at any time to view your enrolled credentials, department mapping, and settings details.</p>
          <p><strong>3. Institution Customization:</strong> Admins can manage themes, lock down access subnet IPs, and establish geofencing parameters.</p>
        </div>
      )
    },
    {
      title: "🎓 Student Dashboard Walkthrough",
      desc: "Here is how students can track their status and register presence dynamically.",
      icon: "🎓",
      color: "#fb923c",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#d1d5db' }}>
          <p><strong>📊 Attendance Forecast:</strong> Real-time indicator displaying your presence rate. Shows if you are safe or how many classes you must attend to cross the 75% limit.</p>
          <p><strong>🪪 Virtual ID Check-in:</strong> Open your Virtual ID card to generate a dynamic check-in QR code that rotates every 30 seconds for security. Present it to the teacher's scanner.</p>
          <p><strong>📝 Subject-wise Leaves:</strong> Apply for medical/personal leaves select-wise. These route directly to the respective subject teacher.</p>
        </div>
      )
    },
    {
      title: "🏫 Teacher & Admin Control Panel",
      desc: "Manage classes, schedules, and record student attendance smoothly.",
      icon: "🏫",
      color: "#a78bfa",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#d1d5db' }}>
          <p><strong>⚡ Start Session:</strong> Set the subject and date, then initialize the class session to open scanning checks.</p>
          <p><strong>📸 Dual Scan Options:</strong> Use high-precision <strong>Face Scanner</strong> to verify registered biometric faces, or <strong>Scan Student QR</strong> to verify dynamic check-in tokens.</p>
          <p><strong>📋 Review Leaves:</strong> Teachers review leaves for their respective subjects. Admins oversee the entire system logs centrally.</p>
        </div>
      )
    },
    {
      title: "🤖 AI Assistant & Speech Commands",
      desc: "Leverage advanced voice features and virtual support directly.",
      icon: "🤖",
      color: "#10b981",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#d1d5db' }}>
          <p><strong>💬 AI Chatbot Counselor:</strong> Talk to the smart assistant for instant help on leaves, system stats, or profile details.</p>
          <p><strong>🗣️ Voice Speech Commands:</strong> Click the microphone and say commands to control the app automatically:
            <br />• <em>"start scanner"</em> — launches face recognition modal.
            <br />• <em>"open profile"</em> / <em>"open leaves"</em> — navigates tabs.
            <br />• <em>"logout"</em> — logs out of the app.
          </p>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (playCyberSound) playCyberSound('click');
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (playCyberSound) playCyberSound('click');
    if (slide > 0) {
      setSlide(slide - 1);
    }
  };

  const current = slides[slide];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(5, 8, 20, 0.9)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.25s ease'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'linear-gradient(135deg, #090c15 0%, #15182b 100%)',
        border: `1.5px solid ${current.color}40`,
        borderRadius: '24px', padding: '32px',
        width: '100%', maxWidth: '480px',
        boxShadow: `0 0 40px ${current.color}15, 0 10px 40px rgba(0,0,0,0.5)`,
        position: 'relative', overflow: 'hidden',
        transition: 'all 0.3s ease-out',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Glowing decorative indicator */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '160px', height: '160px',
          background: `radial-gradient(circle, ${current.color}15 0%, transparent 70%)`,
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        <button onClick={onClose} style={{ position: 'absolute', top: '18px', right: '18px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>✕</button>

        {/* Slide Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${current.color}15`, border: `1px solid ${current.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
            {current.icon}
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>{current.title}</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '4px 0 0' }}>{current.desc}</p>
          </div>
        </div>

        {/* Slide Content */}
        <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', minHeight: '190px', marginBottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {current.content}
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Progress Indicators */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {slides.map((_, idx) => (
              <div key={idx} style={{ width: idx === slide ? '24px' : '8px', height: '8px', borderRadius: '4px', background: idx === slide ? current.color : 'rgba(255,255,255,0.15)', transition: 'all 0.3s ease' }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {slide > 0 && (
              <button onClick={handlePrev} style={{ padding: '8px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                Back
              </button>
            )}
            <button onClick={handleNext} style={{ padding: '10px 24px', borderRadius: '10px', background: current.color, border: 'none', color: '#000', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 15px ${current.color}30`, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              {slide === slides.length - 1 ? "Start Exploring" : "Next Step"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
