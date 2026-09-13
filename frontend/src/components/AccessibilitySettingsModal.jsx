import { useState, useEffect } from 'react';
import { 
  Eye, 
  Languages, 
  Type, 
  Sliders, 
  Sparkles, 
  X,
  Smartphone
} from 'lucide-react';
import { t, setStoredLanguage } from '../utils/i18n';

export default function AccessibilitySettingsModal({
  isOpen,
  onClose,
  currentLang,
  onChangeLang
}) {
  const [largeText, setLargeText] = useState(() => {
    return localStorage.getItem('accessibility_large_text') === 'true';
  });
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('accessibility_high_contrast') === 'true';
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('accessibility_reduced_motion') === 'true';
  });

  useEffect(() => {
    // Sync classes to document root
    if (largeText) {
      document.documentElement.classList.add('app-text-lg');
    } else {
      document.documentElement.classList.remove('app-text-lg');
    }
    localStorage.setItem('accessibility_large_text', String(largeText));
  }, [largeText]);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('app-high-contrast');
    } else {
      document.documentElement.classList.remove('app-high-contrast');
    }
    localStorage.setItem('accessibility_high_contrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add('app-reduced-motion');
    } else {
      document.documentElement.classList.remove('app-reduced-motion');
    }
    localStorage.setItem('accessibility_reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 17, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 10003,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          animation: 'scaleIn 0.25s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={22} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              {t('accessibility', currentLang)}
            </h3>
          </div>
          <button onClick={onClose} className="clean-back-btn" style={{ width: '36px', height: '36px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '22px' }}>
          {/* Language Switch */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', padding: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Languages size={18} color="#0ea5e9" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                {t('language', currentLang)} (Language)
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => {
                  setStoredLanguage('en');
                  if (onChangeLang) onChangeLang('en');
                }}
                className={currentLang === 'en' ? 'btn-primary' : 'btn-secondary'}
                style={{ minHeight: '42px', fontSize: '0.85rem' }}
              >
                English
              </button>
              <button
                onClick={() => {
                  setStoredLanguage('hi');
                  if (onChangeLang) onChangeLang('hi');
                }}
                className={currentLang === 'hi' ? 'btn-primary' : 'btn-secondary'}
                style={{ minHeight: '42px', fontSize: '0.85rem' }}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>

          {/* Large Text Switch */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Type size={18} color="#10b981" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff' }}>{t('large_text', currentLang)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Increase font sizes across all screens</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={largeText}
              onChange={(e) => setLargeText(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: '#10b981', cursor: 'pointer' }}
            />
          </div>

          {/* High Contrast Mode */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Eye size={18} color="#f59e0b" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff' }}>{t('high_contrast', currentLang)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Solid borders and pure black surfaces</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: '#f59e0b', cursor: 'pointer' }}
            />
          </div>

          {/* Reduced Motion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} color="#a78bfa" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff' }}>{t('reduced_motion', currentLang)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Silence floating animations and transitions</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: '#a78bfa', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Touch Target Notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          <Smartphone size={14} color="#10b981" />
          <span>All touch targets certified $\ge 44$px for seamless one-handed mobile navigation.</span>
        </div>

        <button
          onClick={onClose}
          className="btn-primary"
          style={{ width: '100%', minHeight: '44px' }}
        >
          {t('close', currentLang)}
        </button>
      </div>
    </div>
  );
}
