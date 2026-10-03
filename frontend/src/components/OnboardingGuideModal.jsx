import { useState } from 'react';

// =====================================================================
// INTERACTIVE ONBOARDING GUIDE MODAL
// =====================================================================
export default function OnboardingGuideModal({ onClose, playCyberSound }) {
  const [slide, setSlide] = useState(0);

  const pStyle = { color: '#334155', margin: '0 0 10px 0', lineHeight: 1.55, fontSize: '0.88rem' };
  const strongStyle = { color: '#0f172a', fontWeight: 700 };

  const slides = [
    {
      title: "🧭 Welcome to Smart Attendance!",
      desc: "Let's take a quick 1-minute tour to understand how to use and navigate the system easily.",
      icon: "✨",
      color: "#1e40af",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={pStyle}><strong style={strongStyle}>1. Main Navigation Sidebar:</strong> Switch between logs, reports, profiles, leaves, and configurations on the left panel (bottom menu on mobile).</p>
          <p style={pStyle}><strong style={strongStyle}>2. Profile & Status Check:</strong> Click on "My Profile" at any time to view your enrolled credentials, department mapping, and settings details.</p>
          <p style={pStyle}><strong style={strongStyle}>3. Institution Customization:</strong> Admins can manage themes, lock down access subnet IPs, and establish geofencing parameters.</p>
        </div>
      )
    },
    {
      title: "🎓 Student Dashboard Walkthrough",
      desc: "Here is how students can track their status and register presence dynamically.",
      icon: "🎓",
      color: "#ea580c",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={pStyle}><strong style={strongStyle}>📊 Attendance Forecast:</strong> Real-time indicator displaying your presence rate. Shows if you are safe or how many classes you must attend to cross the 75% limit.</p>
          <p style={pStyle}><strong style={strongStyle}>🪪 Virtual ID Check-in:</strong> Open your Virtual ID card to generate a dynamic check-in QR code that rotates every 30 seconds for security. Present it to the teacher's scanner.</p>
          <p style={pStyle}><strong style={strongStyle}>📝 Subject-wise Leaves:</strong> Apply for medical/personal leaves select-wise. These route directly to the respective subject teacher.</p>
        </div>
      )
    },
    {
      title: "🏫 Teacher & Admin Control Panel",
      desc: "Manage classes, schedules, and record student attendance smoothly.",
      icon: "🏫",
      color: "#7c3aed",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={pStyle}><strong style={strongStyle}>⚡ Start Session:</strong> Set the subject and date, then initialize the class session to open scanning checks.</p>
          <p style={pStyle}><strong style={strongStyle}>📸 Dual Scan Options:</strong> Use high-precision <strong style={strongStyle}>Face Scanner</strong> to verify registered biometric faces, or <strong style={strongStyle}>Scan Student QR</strong> to verify dynamic check-in tokens.</p>
          <p style={pStyle}><strong style={strongStyle}>📋 Review Leaves:</strong> Teachers review leaves for their respective subjects. Admins oversee the entire system logs centrally.</p>
        </div>
      )
    },
    {
      title: "🤖 AI Assistant & Speech Commands",
      desc: "Leverage advanced voice features and virtual support directly.",
      icon: "🤖",
      color: "#059669",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={pStyle}><strong style={strongStyle}>💬 AI Chatbot Counselor:</strong> Talk to the smart assistant for instant help on leaves, system stats, or profile details.</p>
          <p style={pStyle}><strong style={strongStyle}>🗣️ Voice Speech Commands:</strong> Click the microphone and say commands to control the app automatically:
            <br /><span style={{ color: '#64748b' }}>•</span> <em style={{ color: '#1e40af', fontStyle: 'normal', fontWeight: 600 }}>"start scanner"</em> — launches face recognition modal.
            <br /><span style={{ color: '#64748b' }}>•</span> <em style={{ color: '#1e40af', fontStyle: 'normal', fontWeight: 600 }}>"open profile"</em> / <em style={{ color: '#1e40af', fontStyle: 'normal', fontWeight: 600 }}>"open leaves"</em> — navigates tabs.
            <br /><span style={{ color: '#64748b' }}>•</span> <em style={{ color: '#1e40af', fontStyle: 'normal', fontWeight: 600 }}>"logout"</em> — logs out of the app.
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
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s ease'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div 
        className="onboarding-guide-card"
        style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px', 
        padding: 'clamp(20px, 4vw, 32px)',
        width: '100%', 
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15)',
        position: 'relative',
        transition: 'all 0.3s ease-out',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Glowing decorative indicator */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '180px', height: '180px',
          background: `radial-gradient(circle, ${current.color}15 0%, transparent 70%)`,
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        {/* High-visibility prominent close button */}
        <button 
          onClick={onClose} 
          aria-label="Close guide"
          style={{ 
            position: 'absolute', 
            top: '16px', 
            right: '16px', 
            background: '#f1f5f9', 
            border: '1px solid #cbd5e1', 
            borderRadius: '50%', 
            width: '36px', 
            height: '36px', 
            color: '#475569', 
            cursor: 'pointer', 
            fontSize: '1rem', 
            fontWeight: 800,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            transition: 'all 0.2s',
            zIndex: 10
          }} 
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }} 
          onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
        >
          ✕
        </button>

        {/* Slide Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingRight: '40px' }}>
          <div style={{ width: '52px', height: '52px', minWidth: '52px', borderRadius: '14px', background: `${current.color}15`, border: `1.5px solid ${current.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
            {current.icon}
          </div>
          <div>
            <h2 style={{ fontSize: 'clamp(1.15rem, 3.5vw, 1.35rem)', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>{current.title}</h2>
            <p style={{ color: '#475569', fontSize: '0.85rem', margin: '5px 0 0', lineHeight: 1.4, fontWeight: 500 }}>{current.desc}</p>
          </div>
        </div>

        {/* Slide Content */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px', minHeight: '180px', marginBottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {current.content}
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Progress Indicators */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {slides.map((_, idx) => (
              <div 
                key={idx} 
                onClick={() => { if (playCyberSound) playCyberSound('click'); setSlide(idx); }}
                style={{ 
                  width: idx === slide ? '28px' : '9px', 
                  height: '8px', 
                  borderRadius: '4px', 
                  background: idx === slide ? current.color : '#cbd5e1', 
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }} 
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {slide > 0 && (
              <button 
                onClick={handlePrev} 
                style={{ 
                  padding: '9px 18px', 
                  borderRadius: '10px', 
                  background: '#f1f5f9', 
                  border: '1px solid #cbd5e1', 
                  color: '#334155', 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  transition: 'all 0.2s' 
                }} 
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} 
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                Back
              </button>
            )}
            <button 
              onClick={handleNext} 
              style={{ 
                padding: '10px 24px', 
                borderRadius: '10px', 
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', 
                border: 'none', 
                color: '#ffffff', 
                fontSize: '0.88rem', 
                fontWeight: 700, 
                cursor: 'pointer', 
                boxShadow: '0 4px 14px rgba(30, 64, 175, 0.25)', 
                transition: 'all 0.2s' 
              }} 
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} 
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {slide === slides.length - 1 ? "Start Exploring 🚀" : "Next Step →"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
