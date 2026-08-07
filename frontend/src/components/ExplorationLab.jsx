import React, { useState } from 'react';
import { Sparkles, Gamepad2, Palette, Gauge, Star, Lock, CheckCircle2, Volume2, Flame, RefreshCw } from 'lucide-react';
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
  const [secretAlert, setSecretAlert] = useState('');

  const apply = (next) => {
    setSettings(next);
    saveExplorationSettings(next);
    onApply?.(next);
    if (setters.onExplorationChange) setters.onExplorationChange(next);
  };

  const toggle = (key) => {
    if (PREMIUM_KEYS.includes(key) && !isPremium) return;
    const nextVal = !settings[key];
    apply({ ...settings, [key]: nextVal });
    
    if (Math.random() > 0.6) {
      const count = bumpSecretDiscovery();
      setDiscovered(count);
      setSecretAlert(`🎉 Secret FX Discovered! Total Secrets: ${count}`);
      setTimeout(() => setSecretAlert(''), 3000);
    }
  };

  const setNum = (key, value) => apply({ ...settings, [key]: value });

  const triggerRandomSecret = () => {
    const count = bumpSecretDiscovery();
    setDiscovered(count);
    setSecretAlert(`✨ Secret Unlocked! You've found secret #${count}`);
    setTimeout(() => setSecretAlert(''), 3000);
  };

  const sections = [
    {
      title: 'Visual FX Laboratory',
      icon: Palette,
      color: '#a78bfa',
      items: [
        { key: 'neonPulse', label: 'Neon Border Pulse on Scanner', desc: 'Glowing animated neon frame around camera viewport', type: 'toggle' },
        { key: 'starfield', label: 'Animated Starfield Background', desc: 'Dynamic space particles drifting across background', type: 'toggle' },
        { key: 'matrixRain', label: 'Matrix Rain Overlay', desc: 'Digital green code rain stream effect', type: 'toggle', premium: true },
        { key: 'uiGlow', label: 'UI Glow Intensity', desc: 'Adjust global neon accent glow levels', type: 'range', min: 0, max: 100 },
        { key: 'particleDensity', label: 'Ambient Particle Density', desc: 'Control floating particle count in background', type: 'range', min: 0, max: 100 },
      ],
    },
    {
      title: 'Scanner Experience',
      icon: Gamepad2,
      color: '#00f2fe',
      items: [
        { key: 'confettiOnMatch', label: 'Confetti Burst on Match', desc: 'Exploding celebration confetti when face is verified', type: 'toggle' },
        { key: 'achievementPopups', label: 'Achievement Pop-ups', desc: 'Show instant XP badge popups on check-in', type: 'toggle' },
        { key: 'scanLineSpeed', label: 'Scan Line Speed', desc: 'Laser beam speed across camera viewport', type: 'speed_pills' },
        { key: 'scannerSoundPack', label: 'Scanner Audio FX Pack', desc: 'Audio sound effects for scanner feedback', type: 'sound_select' },
      ],
    },
    {
      title: 'Performance & Motion',
      icon: Gauge,
      color: '#10b981',
      items: [
        { key: 'smoothPageTransitions', label: 'Smooth Page Transitions', desc: 'Cyberpunk glass fade transitions between tabs', type: 'toggle' },
        { key: 'clickRipples', label: 'Click Ripple Effects', desc: 'Interactive liquid ripple effect on button tap', type: 'toggle' },
        { key: 'reduceMotionMobile', label: 'Reduce Motion on Mobile', desc: 'Optimizes battery life on mobile phones', type: 'toggle' },
        { key: 'dashboardCelebration', label: 'Dashboard Celebration Mode', desc: 'Golden fireworks on high attendance streak', type: 'toggle', premium: true },
      ],
    },
  ];

  return (
    <div style={{
      width: '100%',
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '24px',
      background: 'rgba(12, 16, 32, 0.88)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(167, 139, 250, 0.3)',
      borderRadius: '24px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(167, 139, 250, 0.1)',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Title Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #a78bfa 0%, #00f2fe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            boxShadow: '0 0 20px rgba(167, 139, 250, 0.35)'
          }}>
            🧪
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.6rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #a78bfa 0%, #00f2fe 50%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.01em'
            }}>
              Exploration Lab & VFX Studio
            </h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
              Hidden visual FX, scanner laser tweaks, sound packs & interactive experimental themes
            </p>
          </div>
        </div>

        {/* Secret Discoveries Badge & Trigger */}
        <button
          onClick={triggerRandomSecret}
          style={{
            padding: '10px 18px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
            border: '1px solid #fbbf24',
            color: '#fbbf24',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 15px rgba(251, 191, 36, 0.2)'
          }}
        >
          <Star size={16} color="#fbbf24" /> {discovered} Secrets Found
        </button>
      </div>

      {secretAlert && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid #fbbf24',
          color: '#fbbf24',
          fontWeight: 800,
          fontSize: '0.88rem',
          textAlign: 'center',
          marginBottom: '20px',
          animation: 'fadeInUp 0.3s ease'
        }}>
          {secretAlert}
        </div>
      )}

      {/* Sections Loop */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {sections.map(({ title, icon: Icon, color, items }) => (
          <div
            key={title}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '20px',
              padding: '24px'
            }}
          >
            <h3 style={{
              margin: '0 0 18px 0',
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Icon size={20} color={color} /> {title}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
              {items.map((item) => {
                const locked = item.premium && !isPremium;
                const isChecked = !!settings[item.key];

                return (
                  <div
                    key={item.key}
                    style={{
                      background: isChecked ? `${color}12` : 'rgba(8, 12, 24, 0.5)',
                      border: isChecked ? `1.5px solid ${color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '16px',
                      opacity: locked ? 0.6 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                          {item.label}
                        </div>
                        {locked && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid #fbbf24' }}>
                            PRO ONLY
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '4px', lineHeight: 1.4 }}>
                        {item.desc}
                      </div>
                    </div>

                    {/* Controls rendering */}
                    {item.type === 'toggle' && (
                      <div
                        onClick={() => toggle(item.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: locked ? 'not-allowed' : 'pointer',
                          paddingTop: '6px'
                        }}
                      >
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isChecked ? color : '#64748b' }}>
                          {isChecked ? '🟢 ACTIVE & ENABLED' : '⚪ DISABLED'}
                        </span>

                        <div style={{
                          width: '44px',
                          height: '24px',
                          borderRadius: '12px',
                          background: isChecked ? color : 'rgba(255, 255, 255, 0.1)',
                          position: 'relative',
                          transition: 'all 0.2s ease'
                        }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: '3px',
                            left: isChecked ? '23px' : '3px',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                          }} />
                        </div>
                      </div>
                    )}

                    {item.type === 'range' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
                        <input
                          type="range"
                          min={item.min}
                          max={item.max}
                          value={settings[item.key] ?? DEFAULT_EXPLORATION[item.key]}
                          onChange={(e) => setNum(item.key, parseInt(e.target.value, 10))}
                          style={{
                            flex: 1,
                            accentColor: color,
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: color,
                          background: `${color}22`,
                          padding: '3px 10px',
                          borderRadius: '10px',
                          minWidth: '40px',
                          textAlign: 'center'
                        }}>
                          {settings[item.key] ?? DEFAULT_EXPLORATION[item.key]}%
                        </span>
                      </div>
                    )}

                    {item.type === 'speed_pills' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
                        {Object.keys(SCAN_LINE_SPEEDS).map((spd) => {
                          const isSpdActive = (settings[item.key] || 'fast') === spd;
                          return (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => apply({ ...settings, [item.key]: spd })}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '10px',
                                border: isSpdActive ? `1px solid ${color}` : '1px solid rgba(255, 255, 255, 0.1)',
                                background: isSpdActive ? `${color}33` : 'rgba(255, 255, 255, 0.04)',
                                color: isSpdActive ? '#fff' : '#9ca3af',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                              }}
                            >
                              {spd}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {item.type === 'sound_select' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
                        {SOUND_PACKS.map((sp) => {
                          const isSpActive = (settings[item.key] || 'cyber') === sp.id;
                          return (
                            <button
                              key={sp.id}
                              type="button"
                              onClick={() => apply({ ...settings, [item.key]: sp.id })}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '10px',
                                border: isSpActive ? `1px solid ${color}` : '1px solid rgba(255, 255, 255, 0.1)',
                                background: isSpActive ? `${color}33` : 'rgba(255, 255, 255, 0.04)',
                                color: isSpActive ? '#fff' : '#9ca3af',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              {sp.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
