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
      background: 'rgba(5, 8, 20, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s ease'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'linear-gradient(135deg, #0d121f 0%, #171c30 100%)',
        border: `1.5px solid ${current.color}60`,
        borderRadius: '24px', 
        padding: 'clamp(20px, 4vw, 32px)',
        width: '100%', 
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: `0 0 50px ${current.color}20, 0 16px 48px rgba(0,0,0,0.6)`,
        position: 'relative',
        transition: 'all 0.3s ease-out',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Glowing decorative indicator */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '180px', height: '180px',
          background: `radial-gradient(circle, ${current.color}25 0%, transparent 70%)`,
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
            background: 'rgba(255,255,255,0.15)', 
            border: '1.5px solid rgba(255,255,255,0.3)', 
            borderRadius: '50%', 
            width: '36px', 
            height: '36px', 
            color: '#ffffff', 
            cursor: 'pointer', 
            fontSize: '1.1rem', 
            fontWeight: 800,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            transition: 'all 0.2s',
            zIndex: 10
          }} 
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.8)'; e.currentTarget.style.borderColor = '#ef4444'; }} 
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
        >
          ✕
        </button>

        {/* Slide Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingRight: '40px' }}>
          <div style={{ width: '52px', height: '52px', minWidth: '52px', borderRadius: '14px', background: `${current.color}20`, border: `1.5px solid ${current.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
            {current.icon}
          </div>
          <div>
            <h2 style={{ fontSize: 'clamp(1.15rem, 3.5vw, 1.35rem)', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.25 }}>{current.title}</h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: '5px 0 0', lineHeight: 1.4 }}>{current.desc}</p>
          </div>
        </div>

        {/* Slide Content */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', minHeight: '180px', marginBottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
                  background: idx === slide ? current.color : 'rgba(255,255,255,0.25)', 
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
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  color: '#f1f5f9', 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  transition: 'all 0.2s' 
                }} 
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'} 
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                Back
              </button>
            )}
            <button 
              onClick={handleNext} 
              style={{ 
                padding: '10px 24px', 
                borderRadius: '10px', 
                background: current.color, 
                border: 'none', 
                color: '#090c15', 
                fontSize: '0.88rem', 
                fontWeight: 800, 
                cursor: 'pointer', 
                boxShadow: `0 4px 18px ${current.color}45`, 
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
