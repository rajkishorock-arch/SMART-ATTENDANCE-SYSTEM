import { useState } from 'react';

// =====================================================================
// INTERACTIVE ONBOARDING GUIDE MODAL
// =====================================================================
function StepCard({ num, icon, title, desc, tag }) {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '12px',
      padding: '12px 14px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        color: '#1d4ed8',
        fontWeight: 800,
        fontSize: '0.88rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {icon || num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
          <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>{title}</span>
          {tag && (
            <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>{tag}</span>
          )}
        </div>
        <div style={{ color: '#1e293b', fontSize: '0.82rem', lineHeight: 1.5, fontWeight: 500 }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingGuideModal({ onClose, playCyberSound }) {
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      title: "🧭 Welcome to Smart Attendance!",
      desc: "Let's take a quick 1-minute tour to understand how to use and navigate the system easily.",
      icon: "✨",
      color: "#1e40af",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <StepCard 
            num="1" 
            title="Main Navigation Sidebar" 
            desc="Switch between logs, reports, profiles, leaves, and configurations on the left panel (bottom menu on mobile)."
          />
          <StepCard 
            num="2" 
            title="Profile & Status Check" 
            desc="Click on 'My Profile' at any time to view your enrolled credentials, department mapping, and settings details."
          />
          <StepCard 
            num="3" 
            title="Institution Customization" 
            desc="Admins can manage themes, lock down access subnet IPs, and establish geofencing parameters."
          />
        </div>
      )
    },
    {
      title: "🎓 Student Dashboard Walkthrough",
      desc: "Here is how students can track their status and register presence dynamically.",
      icon: "🎓",
      color: "#ea580c",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <StepCard 
            num="1" 
            icon="📊"
            title="Attendance Forecast" 
            desc="Real-time indicator displaying your presence rate. Shows if you are safe or how many classes you must attend to cross the 75% limit."
          />
          <StepCard 
            num="2" 
            icon="🪪"
            title="Virtual ID Check-in" 
            desc="Open your Virtual ID card to generate a dynamic check-in QR code that rotates every 30 seconds for secure scanning."
          />
          <StepCard 
            num="3" 
            icon="📝"
            title="Subject-wise Leaves" 
            desc="Apply for medical or personal leaves for specific subjects. These route directly to your respective subject teacher."
          />
        </div>
      )
    },
    {
      title: "🏫 Teacher & Admin Control Panel",
      desc: "Manage classes, schedules, and record student attendance smoothly.",
      icon: "🏫",
      color: "#7c3aed",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <StepCard 
            num="1" 
            icon="⚡"
            title="Start Class Session" 
            desc="Set the subject and date, then initialize the class session to open scanning checks."
          />
          <StepCard 
            num="2" 
            icon="📸"
            title="Dual Scan Options" 
            desc="Use high-precision Face Scanner to verify registered biometric faces, or Scan Student QR to verify dynamic check-in tokens."
          />
          <StepCard 
            num="3" 
            icon="📋"
            title="Review Leaves & Disputes" 
            desc="Teachers review leaves for their respective subjects. Admins oversee the entire system logs centrally."
          />
        </div>
      )
    },
    {
      title: "🤖 AI Assistant & Speech Commands",
      desc: "Leverage advanced voice features and virtual support directly.",
      icon: "🤖",
      color: "#059669",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <StepCard 
            num="1" 
            icon="💬"
            title="AI Chatbot Counselor" 
            desc="Talk to the smart assistant for instant help on leaves, system stats, attendance queries, or profile details."
          />
          <StepCard 
            num="2" 
            icon="🗣️"
            title="Voice Speech Commands" 
            desc={
              <span>
                Click the microphone to control the app: <strong style={{ color: '#1d4ed8' }}>"start scanner"</strong> launches face scanner, <strong style={{ color: '#1d4ed8' }}>"open profile"</strong> navigates to profile, or <strong style={{ color: '#1d4ed8' }}>"logout"</strong> signs out.
              </span>
            }
          />
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
            <p style={{ color: '#334155', fontSize: '0.85rem', margin: '5px 0 0', lineHeight: 1.4, fontWeight: 600 }}>{current.desc}</p>
          </div>
        </div>

        {/* Slide Content */}
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '16px', minHeight: '180px', marginBottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
