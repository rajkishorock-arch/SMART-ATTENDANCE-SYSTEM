import { useState } from 'react';
import { Camera, Zap, Gauge, Sparkles, Users } from 'lucide-react';
import { CAMERA_PRESETS, loadCameraSettings, saveCameraSettings } from '../utils/cameraScanner';

export default function CameraSettingsPanel({ onChange }) {
  const [settings, setSettings] = useState(() => loadCameraSettings());
  const [localUrl, setLocalUrl] = useState(settings.externalIpUrl || '');

  const apply = (next) => {
    setSettings(next);
    saveCameraSettings(next);
    onChange?.(next);
  };

  const toggleOption = (key) => apply({ ...settings, [key]: !settings[key] });

  return (
    <div className="glass-panel camera-settings-panel mobile-camera-panel">
      <h3 className="mobile-camera-title">
        <Camera size={20} /> Pro Camera Engine
      </h3>
      <p className="mobile-camera-subtitle">
        Turbo = fastest for classroom scanning. Enable Classroom Mode to mark multiple students in one frame.
      </p>

      <div className="camera-presets-grid">
        {Object.entries(CAMERA_PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            className={`camera-preset-btn ${settings.preset === key ? 'active' : ''}`}
            onClick={() => apply({ ...settings, preset: key, ...p })}
          >
            {key === 'turbo' && <Zap size={16} color="#fbbf24" />}
            {key === 'balanced' && <Gauge size={16} color="#60a5fa" />}
            {key === 'quality' && <Sparkles size={16} color="#a78bfa" />}
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <div className="camera-option-list">
        {[
          { key: 'classroomMultiScan', label: 'Classroom mode — scan ALL faces in frame', icon: Users },
          { key: 'autoFocusBox', label: 'Show face lock box on camera' },
          { key: 'mirrorPreview', label: 'Mirror preview (selfie)' },
          { key: 'hapticFeedback', label: 'Vibration on match (phone)' },
        ].map(({ key, label, icon: Icon }) => (
          <label key={key} className="camera-option-row">
            <span className="camera-option-label">
              {Icon && <Icon size={16} />}
              {label}
            </span>
            <input
              type="checkbox"
              checked={!!settings[key]}
              onChange={() => toggleOption(key)}
            />
          </label>
        ))}
      </div>

      <div className="camera-source-block">
        <h4>Camera Source</h4>
        <label className="camera-radio-row">
          <input
            type="radio"
            name="cameraSource"
            checked={settings.cameraSource !== 'external'}
            onChange={() => apply({ ...settings, cameraSource: 'device' })}
          />
          <span>📱 Device Camera (Phone / Webcam)</span>
        </label>
        <label className="camera-radio-row">
          <input
            type="radio"
            name="cameraSource"
            checked={settings.cameraSource === 'external'}
            onChange={() => apply({ ...settings, cameraSource: 'external' })}
          />
          <span>📡 WiFi IP Camera URL</span>
        </label>
        {settings.cameraSource === 'external' && (
          <div className="camera-url-row">
            <input
              type="url"
              placeholder="http://192.168.1.100:8080/video"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
            />
            <button type="button" onClick={() => apply({ ...settings, externalIpUrl: localUrl })}>
              Save URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
