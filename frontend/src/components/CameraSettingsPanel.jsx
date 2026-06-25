import { useState } from 'react';
import { Camera, Zap, Gauge, Sparkles } from 'lucide-react';
import { CAMERA_PRESETS, loadCameraSettings, saveCameraSettings } from '../utils/cameraScanner';

export default function CameraSettingsPanel({ onChange }) {
  const [settings, setSettings] = useState(() => loadCameraSettings());
  const [localUrl, setLocalUrl] = useState(settings.externalIpUrl || '');
  const [saveStatus, setSaveStatus] = useState('');

  const apply = (next) => {
    setSettings(next);
    saveCameraSettings(next);
    onChange?.(next);
  };

  const handleSaveUrl = () => {
    apply({ ...settings, externalIpUrl: localUrl });
    setSaveStatus('Saved successfully! ✓');
    setTimeout(() => setSaveStatus(''), 2500);
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
        { key: 'autoFocusBox', label: 'Auto face focus box (YuNet-style lock)' },
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

      {/* Camera Source Selector */}
      <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginBottom: '20px' }}>
        <h4 style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: '10px' }}>Camera Source</h4>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input
              type="radio"
              name="cameraSource"
              value="device"
              checked={settings.cameraSource !== 'external'}
              onChange={() => apply({ ...settings, cameraSource: 'device' })}
            />
            Device Camera
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input
              type="radio"
              name="cameraSource"
              value="external"
              checked={settings.cameraSource === 'external'}
              onChange={() => apply({ ...settings, cameraSource: 'external' })}
            />
            WiFi IP Camera
          </label>
        </div>

        {settings.cameraSource === 'external' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>MJPEG Stream / shot URL:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. http://192.168.1.100:8080/video"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(15,23,42,0.5)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  flexGrow: 1,
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={handleSaveUrl}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: 'var(--color-primary)',
                  color: '#0d1323',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1.0)'; }}
              >
                Save
              </button>
            </div>
            {saveStatus && (
              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '2px', display: 'block' }}>
                {saveStatus}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
