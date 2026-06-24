import { useState } from 'react';
import { Camera, Zap, Gauge, Sparkles } from 'lucide-react';
import { CAMERA_PRESETS, loadCameraSettings, saveCameraSettings } from '../utils/cameraScanner';

export default function CameraSettingsPanel({ onChange }) {
  const [settings, setSettings] = useState(() => loadCameraSettings());

  const apply = (next) => {
    setSettings(next);
    saveCameraSettings(next);
    onChange?.(next);
  };

  return (
    <div className="glass-panel camera-settings-panel" style={{ padding: '24px' }}>
      <h3 style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Camera size={20} /> Pro Camera Engine
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
        Turbo mode uses 30–60 FPS preview, lightweight mesh, and smaller frames for butter-smooth scanning.
      </p>

      <div className="camera-presets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {Object.entries(CAMERA_PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            onClick={() => apply({ ...settings, preset: key, ...p })}
            style={{
              padding: '14px',
              borderRadius: '10px',
              border: settings.preset === key ? '2px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
              background: settings.preset === key ? 'rgba(0,242,254,0.1)' : 'rgba(15,23,42,0.5)',
              color: '#e2e8f0',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {key === 'turbo' && <Zap size={16} color="#fbbf24" />}
            {key === 'balanced' && <Gauge size={16} color="#60a5fa" />}
            {key === 'quality' && <Sparkles size={16} color="#a78bfa" />}
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '6px' }}>{p.label}</div>
          </button>
        ))}
      </div>

      {[
        { key: 'autoFocusBox', label: 'Auto face focus box' },
        { key: 'mirrorPreview', label: 'Mirror preview (selfie mode)' },
        { key: 'hapticFeedback', label: 'Haptic feedback on match (mobile)' },
      ].map(({ key, label }) => (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!settings[key]}
            onChange={(e) => apply({ ...settings, [key]: e.target.checked })}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
