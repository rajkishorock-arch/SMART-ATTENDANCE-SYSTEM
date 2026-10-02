import useUI from '../../hooks/useUI';

export default function ThemeEqualizerSettings({
  crtOverlayEnabled,
  setCrtOverlayEnabled,
  ambientHumActive,
  setAmbientHumActive
}) {
  const {
    activeTheme,
    setActiveTheme,
    soundEnabled,
    setSoundEnabled,
    audioVolume,
    setAudioVolume,
    synthModulator,
    setSynthModulator,
    synthPitchScale,
    setSynthPitchScale,
    playCyberSound
  } = useUI();

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              🎨 Theme Appearance & Audio Studio
            </h3>
            <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
              ENTERPRISE CONTROLS
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '6px 0 0' }}>
            Manage corporate color schemes, audio feedback responses, and sound frequencies.
          </p>
        </div>
      </div>

      {/* Grid Section 1: Themes & Overlays */}
      <div>
        <h4 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🎨 1. Visual System Themes & Interface Styling
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Theme Selector Card */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>Active Interface Theme Palette</label>
            <select
              value={activeTheme}
              onChange={(e) => {
                const newTheme = e.target.value;
                setActiveTheme(newTheme);
                playCyberSound('click');
              }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="corporate">Light Enterprise Corporate (Standard)</option>
              <option value="cyberpunk">High Contrast Slate</option>
              <option value="matrix">Minimalist Forest Emerald</option>
              <option value="obsidian">Modern Charcoal</option>
              <option value="violet">Deep Space Violet</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Instantly coordinates color palettes across teacher, student, and management portals.</span>
          </div>

          {/* Accessibility Filter Card */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem', display: 'block' }}>High Precision Focus Grid</label>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Enhanced visual alignment guides for large biometric monitoring stations.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCrtOverlayEnabled(!crtOverlayEnabled);
                playCyberSound('click');
              }}
              style={{
                padding: '6px 14px',
                background: crtOverlayEnabled ? '#eff6ff' : '#ffffff',
                border: `1px solid ${crtOverlayEnabled ? '#3b82f6' : '#cbd5e1'}`,
                borderRadius: '8px',
                color: crtOverlayEnabled ? '#1d4ed8' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {crtOverlayEnabled ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid Section 2: Audio Feedback */}
      <div>
        <h4 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 700, margin: '8px 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔊 2. Audio Feedback & Telemetry Sounds
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem', display: 'block' }}>Acoustic Sound Effects</label>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Play audio feedback cues on action triggers and biometric scans.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const newSound = !soundEnabled;
                setSoundEnabled(newSound);
                localStorage.setItem('soundEnabled', newSound);
                if (newSound) setTimeout(() => playCyberSound('click'), 50);
              }}
              style={{
                padding: '6px 14px',
                background: soundEnabled ? '#ecfdf5' : '#ffffff',
                border: `1px solid ${soundEnabled ? '#10b981' : '#cbd5e1'}`,
                borderRadius: '8px',
                color: soundEnabled ? '#059669' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {soundEnabled ? '🔊 ENABLED' : '🔇 MUTED'}
            </button>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>Master Sound Volume</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0284c7' }}>{Math.round(audioVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={audioVolume}
              disabled={!soundEnabled}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setAudioVolume(vol);
                localStorage.setItem('audioVolume', vol);
              }}
              style={{ width: '100%', accentColor: '#0284c7', cursor: soundEnabled ? 'pointer' : 'not-allowed' }}
            />
          </div>
        </div>
      </div>

      {/* Grid Section 3: Sound Frequency Modulators */}
      <div>
        <h4 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 700, margin: '8px 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🎛️ 3. Sound Frequency Waveforms & Pitch
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Oscillator Modulator */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>Waveform Modulator</label>
            <select
              value={synthModulator}
              onChange={(e) => {
                setSynthModulator(e.target.value);
                setTimeout(() => playCyberSound('click'), 50);
              }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="classic">Standard Enterprise Tone</option>
              <option value="sine">Soft Sine Wave</option>
              <option value="sawtooth">Crisp Notification Pulse</option>
              <option value="triangle">Mellow Chime</option>
              <option value="square">Discrete Digital Beep</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Customizes acoustic feedback sound signature.</span>
          </div>

          {/* Pitch Scale */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>Pitch Frequency Scale</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0284c7' }}>{synthPitchScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={synthPitchScale}
              onChange={(e) => setSynthPitchScale(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Adjusts base audio register frequency.</span>
          </div>

          {/* Background Ambient Hum */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>Background White Noise</label>
              <button
                type="button"
                onClick={() => {
                  setAmbientHumActive(!ambientHumActive);
                  playCyberSound('click');
                }}
                style={{
                  padding: '6px 14px',
                  background: ambientHumActive ? '#eff6ff' : '#ffffff',
                  border: `1px solid ${ambientHumActive ? '#3b82f6' : '#cbd5e1'}`,
                  borderRadius: '8px',
                  color: ambientHumActive ? '#1d4ed8' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                {ambientHumActive ? 'ON' : 'OFF'}
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Low-frequency acoustic focus backdrop for noisy kiosk environments.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
