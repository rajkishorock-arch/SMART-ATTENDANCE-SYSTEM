import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const MOBILE_STEPS = [
  { title: 'Bottom Navigation', desc: 'Dashboard, Scan, Logs aur Settings — sab ek tap mein.' },
  { title: 'Face Scanner', desc: 'Center scan button dabao — camera fullscreen khulega.' },
  { title: 'Manual Attendance', desc: 'Face fail ho to Manual se mark karo (teacher/admin).' },
  { title: 'Quick Actions FAB', desc: 'Right side floating button — Scan, Report, Notify.' },
  { title: 'Settings Hub', desc: 'Premium, Theme, Camera settings — sab Settings mein.' },
];

const DESKTOP_STEPS = [
  { title: 'Sidebar Navigation', desc: 'Left panel se Dashboard, Attendance, Logs switch karo.' },
  { title: 'Live Command Center', desc: 'Real-time present/absent numbers dashboard par.' },
  { title: 'Analytics Hub', desc: 'Metrics, trends, diagnostics cards explore karo.' },
  { title: 'Futuristic Hub', desc: 'Settings → Futuristic Hub — Theme, Widgets, Polls.' },
  { title: 'AI Copilot', desc: 'Chat bot se puchho: kaun absent tha, trend kya hai.' },
];

export default function OnboardingTour({ isMobile, onComplete }) {
  const [step, setStep] = useState(0);
  const steps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;
  const current = steps[step];

  useEffect(() => {
    if (localStorage.getItem('onboarding_tour_done')) {
      onComplete?.();
    }
  }, [onComplete]);

  const finish = () => {
    localStorage.setItem('onboarding_tour_done', 'true');
    onComplete?.();
  };

  if (!current || localStorage.getItem('onboarding_tour_done')) return null;

  return (
    <div className="onboarding-tooltip-overlay">
      <div className="onboarding-tooltip-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 700 }}>
            Step {step + 1} / {steps.length} {isMobile ? '📱' : '💻'}
          </span>
          <button type="button" onClick={finish} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <h3 style={{ color: '#f8fafc', margin: '0 0 8px', fontSize: '1.1rem' }}>{current.title}</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 20px' }}>{current.desc}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          {step > 0 && (
            <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)} style={{ flex: 1, padding: '10px', borderRadius: '8px' }}>
              Back
            </button>
          )}
          <button
            type="button"
            className="bg-gradient-btn"
            onClick={() => (step < steps.length - 1 ? setStep((s) => s + 1) : finish())}
            style={{ flex: 1, padding: '10px', borderRadius: '8px' }}
          >
            {step < steps.length - 1 ? 'Next' : 'Done ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}
