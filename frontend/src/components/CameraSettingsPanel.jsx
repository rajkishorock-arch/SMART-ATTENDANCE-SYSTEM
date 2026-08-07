import React, { useState } from 'react';
import { Camera, Zap, Gauge, Sparkles, Users, Eye, FlipHorizontal, Smartphone, Wifi, CheckCircle2 } from 'lucide-react';
import { CAMERA_PRESETS, loadCameraSettings, saveCameraSettings } from '../utils/cameraScanner';

export default function CameraSettingsPanel({ onChange }) {
  const [settings, setSettings] = useState(() => loadCameraSettings());
  const [localUrl, setLocalUrl] = useState(settings.externalIpUrl || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const apply = (next) => {
    setSettings(next);
    saveCameraSettings(next);
    onChange?.(next);
    setSaveSuccessMsg('Camera settings saved & active!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const toggleOption = (key) => apply({ ...settings, [key]: !settings[key] });

  return (
    <div style={{
      width: '100%',
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '24px',
      background: 'rgba(12, 16, 32, 0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(0, 242, 254, 0.25)',
      borderRadius: '24px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #00f2fe 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          boxShadow: '0 0 20px rgba(0, 242, 254, 0.35)'
        }}>
          📷
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
            Pro Camera & Face Scanner Engine
          </h3>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
            Configure scanning speed, multi-face classroom mode, camera source & phone haptic feedback
          </p>
        </div>
      </div>

      {saveSuccessMsg && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '12px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          color: '#10b981',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} /> {saveSuccessMsg}
        </div>
      )}

      {/* 1. Camera Preset Cards */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#00f2fe', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
          ⚡ Scanner Speed & Quality Presets:
        </label>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px'
        }}>
          {Object.entries(CAMERA_PRESETS).map(([key, p]) => {
            const isActive = settings.preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => apply({ ...settings, preset: key, ...p })}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: isActive ? '2px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isActive ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.18), rgba(168, 85, 247, 0.18))' : 'rgba(255, 255, 255, 0.02)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: isActive ? '0 0 20px rgba(0, 242, 254, 0.25)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: isActive ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {key === 'turbo' && <Zap size={20} color="#fbbf24" />}
                  {key === 'balanced' && <Gauge size={20} color="#60a5fa" />}
                  {key === 'quality' && <Sparkles size={20} color="#a78bfa" />}
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', textTransform: 'capitalize' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: isActive ? '#00f2fe' : '#9ca3af', marginTop: '2px' }}>
                    {key === 'turbo' && 'Super fast • 100ms interval'}
                    {key === 'balanced' && 'Standard • 300ms interval'}
                    {key === 'quality' && 'High Accuracy • HD 1080p'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Feature Toggles List */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
          ⚙️ Advanced Scanning Features & Toggles:
        </label>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px'
        }}>
          {[
            { key: 'classroomMultiScan', label: 'Classroom Mode', desc: 'Scan ALL faces simultaneously in frame', icon: Users, color: '#10b981' },
            { key: 'autoFocusBox', label: 'Face Reticle Lock Box', desc: 'Show glowing cyan corner brackets over faces', icon: Eye, color: '#00f2fe' },
            { key: 'mirrorPreview', label: 'Mirror Selfie Camera', desc: 'Flip video horizontally for selfie front cam', icon: FlipHorizontal, color: '#a78bfa' },
            { key: 'hapticFeedback', label: 'Phone Haptic Vibration', desc: 'Vibrate mobile phone when attendance matches', icon: Smartphone, color: '#f59e0b' },
          ].map(({ key, label, desc, icon: Icon, color }) => {
            const isChecked = !!settings[key];
            return (
              <div
                key={key}
                onClick={() => toggleOption(key)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: isChecked ? `${color}15` : 'rgba(255, 255, 255, 0.02)',
                  border: isChecked ? `1.5px solid ${color}` : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={20} color={isChecked ? color : '#9ca3af'} />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                      {desc}
                    </div>
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <div style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  background: isChecked ? color : 'rgba(255, 255, 255, 0.1)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
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
            );
          })}
        </div>
      </div>

      {/* 3. Camera Source Selector */}
      <div>
        <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
          📹 Video Input & Camera Source:
        </label>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => apply({ ...settings, cameraSource: 'device' })}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '14px',
              borderRadius: '14px',
              border: settings.cameraSource !== 'external' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              background: settings.cameraSource !== 'external' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📱 Device Camera (Phone / Webcam)
          </button>

          <button
            type="button"
            onClick={() => apply({ ...settings, cameraSource: 'external' })}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '14px',
              borderRadius: '14px',
              border: settings.cameraSource === 'external' ? '2px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.08)',
              background: settings.cameraSource === 'external' ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.02)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📡 WiFi IP Camera URL (RTSP Stream)
          </button>
        </div>

        {settings.cameraSource === 'external' && (
          <div style={{
            background: 'rgba(8, 12, 24, 0.6)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <Wifi size={20} color="#00f2fe" />
            <input
              type="url"
              placeholder="http://192.168.1.100:8080/video or rtsp://admin:pass@ip:554/stream"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              style={{
                flex: 1,
                minWidth: '240px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => apply({ ...settings, externalIpUrl: localUrl })}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00f2fe, #a855f7)',
                border: 'none',
                color: '#000',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Save IP Stream URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
