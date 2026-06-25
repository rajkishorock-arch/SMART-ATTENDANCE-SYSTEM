import { useState } from 'react';
import { Sparkles, Gamepad2, Palette, Volume2, Gauge, Star, Lock } from 'lucide-react';
import {
  DEFAULT_EXPLORATION,
  loadExplorationSettings,
  saveExplorationSettings,
  bumpSecretDiscovery,
  SCAN_LINE_SPEEDS,
  SOUND_PACKS,
} from '../utils/explorationSettings';

const PREMIUM_KEYS = ['matrixRain', 'dashboardCelebration'];

export default function ExplorationLab({
  isPremium = false,
  onApply,
  setters = {},
}) {
  const [settings, setSettings] = useState(() => loadExplorationSettings());
  const [discovered, setDiscovered] = useState(settings.secretDiscoveries || 0);

  const apply = (next) => {
    setSettings(next);
    saveExplorationSettings(next);
    onApply?.(next);
    if (setters.onExplorationChange) setters.onExplorationChange(next);
  };

  const toggle = (key) => {
    if (PREMIUM_KEYS.includes(key) && !isPremium) return;
    apply({ ...settings, [key]: !settings[key] });
    if (Math.random() > 0.7) {
      const count = bumpSecretDiscovery();
      setDiscovered(count);
    }
  };

  const setNum = (key, value) => apply({ ...settings, [key]: value });

  const sections = [
    {
      title: 'Visual FX Laboratory',
      icon: Palette,
      items: [
        { key: 'neonPulse', label: 'Neon border pulse on scanner', type: 'toggle' },
        { key: 'starfield', label: 'Animated starfield background', type: 'toggle' },
        { key: 'matrixRain', label: 'Matrix rain overlay (Premium)', type: 'toggle', premium: true },
        { key: 'uiGlow', label: 'UI glow intensity', type: 'range', min: 0, max: 100 },
        { key: 'particleDensity', label: 'Ambient particle density', type: 'range', min: 0, max: 100 },
      ],
    },
    {
      title: 'Scanner Experience',
      icon: Gamepad2,
      items: [
        { key: 'confettiOnMatch', label: 'Confetti burst on successful match', type: 'toggle' },
        { key: 'achievementPopups', label: 'Achievement pop-ups', type: 'toggle' },
        { key: 'scanLineSpeed', label: 'Scan line speed', type: 'select', options: Object.keys(SCAN_LINE_SPEEDS) },
        { key: 'scannerSoundPack', label: 'Scanner sound pack', type: 'select', options: SOUND_PACKS.map((p) => p.id) },
      ],
    },
    {
      title: 'Performance & Motion',
      icon: Gauge,
      items: [
        { key: 'smoothPageTransitions', label: 'Smooth page transition flashes', type: 'toggle' },
        { key: 'clickRipples', label: 'Click ripple effects', type: 'toggle' },
        { key: 'reduceMotionMobile', label: 'Reduce motion on mobile (recommended)', type: 'toggle' },
        { key: 'dashboardCelebration', label: 'Dashboard celebration mode (Premium)', type: 'toggle', premium: true },
      ],
    },
  ];

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Sparkles size={22} color="#a78bfa" />
        <h3 style={{ color: '#f8fafc', margin: 0 }}>Exploration Lab</h3>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Star size={12} color="#fbbf24" /> {discovered} secrets found
        </span>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
        Hidden toggles, visual experiments, and pro scanner tweaks — explore and customize your experience.
      </p>

      {!isPremium && (
        <div style={{
          padding: '12px 14px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
          color: '#fde68a', fontSize: '0.8rem',
        }}>
          🔒 Some lab features require Premium. Upgrade in Premium & Subscription settings.
        </div>
      )}

      {sections.map(({ title, icon: Icon, items }) => (
        <div key={title} style={{ marginBottom: '28px' }}>
          <h4 style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Icon size={16} /> {title}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((item) => {
              const locked = item.premium && !isPremium;
              return (
                <div
                  key={item.key}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,23,42,0.4)',
                    opacity: locked ? 0.55 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ color: '#cbd5e1', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {locked && <Lock size={12} />}
                      {item.label}
                    </label>
                    {item.type === 'toggle' && (
                      <input
                        type="checkbox"
                        checked={!!settings[item.key]}
                        disabled={locked}
                        onChange={() => toggle(item.key)}
                      />
                    )}
                    {item.type === 'range' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
                        <input
                          type="range"
                          min={item.min}
                          max={item.max}
                          value={settings[item.key] ?? DEFAULT_EXPLORATION[item.key]}
                          onChange={(e) => setNum(item.key, parseInt(e.target.value, 10))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ color: '#64748b', fontSize: '0.75rem', width: '32px' }}>{settings[item.key]}%</span>
                      </div>
                    )}
                    {item.type === 'select' && (
                      <select
                        value={settings[item.key] ?? DEFAULT_EXPLORATION[item.key]}
                        onChange={(e) => apply({ ...settings, [item.key]: e.target.value })}
                        style={{
                          padding: '6px 10px', borderRadius: '6px',
                          background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0',
                        }}
                      >
                        {(item.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
        <h4 style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Volume2 size={16} /> Quick presets
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { id: 'minimal', label: '⚡ Minimal', patch: { particleDensity: 20, uiGlow: 30, neonPulse: false, confettiOnMatch: false } },
            { id: 'party', label: '🎉 Party Mode', patch: { confettiOnMatch: true, achievementPopups: true, dashboardCelebration: true, neonPulse: true, particleDensity: 90 } },
            { id: 'pro', label: '🛡️ Pro Focus', patch: { confettiOnMatch: false, achievementPopups: false, scanLineSpeed: 'fast', scannerSoundPack: 'silent', reduceMotionMobile: true } },
          ].map(({ id, label, patch }) => (
            <button
              key={id}
              type="button"
              onClick={() => apply({ ...settings, ...patch })}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(79,70,229,0.15)', color: '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem',
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => apply({ ...DEFAULT_EXPLORATION })}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            Reset all
          </button>
        </div>
      </div>
    </div>
  );
}
