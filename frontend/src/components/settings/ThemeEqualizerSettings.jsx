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
      background: 'rgba(15, 23, 42, 0.75)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #a78bfa, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🎨 Themes, Cyber Audio & Synth Equalizer Studio
            </h3>
            <span style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid #a78bfa', color: '#c084fc', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
              MERGED AUDIO-VISUAL STUDIO
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '6px 0 0' }}>
            Customize system color palettes, CRT terminal scanlines, acoustic click feedback, oscillator waveforms, pitch registers, and ambient drones.
          </p>
        </div>
      </div>

      {/* Grid Section 1: Themes & Visual CRT Scanlines */}
      <div>
        <h4 style={{ color: '#00f2fe', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🎨 1. Visual System Themes & Terminal Overlays
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Theme Selector Card */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>Active Interface Theme Palette</label>
            <select
              value={activeTheme}
              onChange={(e) => {
                const newTheme = e.target.value;
                setActiveTheme(newTheme);
                playCyberSound('click');
              }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0, 242, 254, 0.3)', color: '#fff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="cyberpunk" style={{ background: '#0f172a' }}>Cyberpunk Neon (Default)</option>
              <option value="matrix" style={{ background: '#0f172a' }}>Matrix Green</option>
              <option value="obsidian" style={{ background: '#0f172a' }}>Obsidian Red</option>
              <option value="violet" style={{ background: '#0f172a' }}>Deep Space Violet</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Instantly updates primary color coordinates across all student and teacher dashboards.</span>
          </div>

          {/* CRT Scanline Toggle Card */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem', display: 'block' }}>Retro CRT Terminal Scanlines</label>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Enable retro cathode-ray tube screen curvature & scanline flicker.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCrtOverlayEnabled(!crtOverlayEnabled);
                playCyberSound('click');
              }}
              style={{
                padding: '6px 14px',
                background: crtOverlayEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${crtOverlayEnabled ? '#00f2fe' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                color: crtOverlayEnabled ? '#00f2fe' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {crtOverlayEnabled ? '🟢 ON' : '⚪ OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid Section 2: Cyber Acoustic Sound Feedback */}
      <div>
        <h4 style={{ color: '#a78bfa', fontSize: '0.95rem', fontWeight: 700, margin: '8px 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔊 2. Cyber Acoustic Sound Feedback
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem', display: 'block' }}>Acoustic Sound Effects</label>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Play electronic synth feedback audio cues on button clicks.</span>
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
                background: soundEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${soundEnabled ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                color: soundEnabled ? '#34d399' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {soundEnabled ? '🔊 ENABLED' : '🔇 MUTED'}
            </button>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>Master Synth Sound Volume</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#00f2fe' }}>{Math.round(audioVolume * 100)}%</span>
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
              style={{ width: '100%', accentColor: '#00f2fe', cursor: soundEnabled ? 'pointer' : 'not-allowed' }}
            />
          </div>
        </div>
      </div>

      {/* Grid Section 3: Synth Equalizer Customizer */}
      <div>
        <h4 style={{ color: '#f59e0b', fontSize: '0.95rem', fontWeight: 700, margin: '8px 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🎛️ 3. Synth Equalizer Waveform & Pitch Registers
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Oscillator Modulator */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>Oscillator Waveform Modulator</label>
            <select
              value={synthModulator}
              onChange={(e) => {
                setSynthModulator(e.target.value);
                setTimeout(() => playCyberSound('click'), 50);
              }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="classic" style={{ background: '#0f172a' }}>Classic (Default Cyber Mix)</option>
              <option value="sine" style={{ background: '#0f172a' }}>Sine (Soft Pure Tone)</option>
              <option value="sawtooth" style={{ background: '#0f172a' }}>Sawtooth (Aggressive Cyber Pulse)</option>
              <option value="triangle" style={{ background: '#0f172a' }}>Triangle (Retro Chiptune Tone)</option>
              <option value="square" style={{ background: '#0f172a' }}>Square (8-bit Robotic Synthesizer)</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Modulates the waveform model of click feedback sounds.</span>
          </div>

          {/* Pitch Scale */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>Pitch Frequency Scale</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24' }}>{synthPitchScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={synthPitchScale}
              onChange={(e) => setSynthPitchScale(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Scales base frequency pitch register of system sounds.</span>
          </div>

          {/* Ambient Hum Drone */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>Ambient CPU Hum Drone</label>
              <button
                type="button"
                onClick={() => {
                  setAmbientHumActive(!ambientHumActive);
                  playCyberSound('click');
                }}
                style={{
                  padding: '6px 14px',
                  background: ambientHumActive ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${ambientHumActive ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px',
                  color: ambientHumActive ? '#fbbf24' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                {ambientHumActive ? '⚡ DRONE ON' : '⚪ OFF'}
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Generates low-pitch background drone representing CPU load frequency.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
