import { useState, useEffect } from 'react';

/**
 * CameraAttractHud — advanced robotic biometric scanner overlay.
 * Appears over the live camera feed once the scanner is active.
 */
export default function CameraAttractHud({ active, mode = 'attendance', livenessStatus = 'pending' }) {
  const [dataLines, setDataLines] = useState([]);
  const [tick, setTick] = useState(0);

  // Simulate live biometric data readout
  useEffect(() => {
    if (!active) return;
    const lines = [
      `SYS: FACEMESH v2.7`,
      `RES: 1280x720`,
      `MODE: BIOMETRIC`,
      `ENC: SFace-128D`,
    ];
    setDataLines(lines);
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 900);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const isVerified   = livenessStatus === 'verified';
  const isVerifying  = livenessStatus === 'verifying' || livenessStatus === 'pending';

  // Colour theme per liveness state
  const primaryColor  = isVerified ? '#10b981' : '#00f2fe';
  const glowColor     = isVerified ? 'rgba(16,185,129,0.35)' : 'rgba(0,242,254,0.3)';
  const labelColor    = isVerified ? '#34d399' : '#00f2fe';
  const borderColor   = isVerified ? 'rgba(16,185,129,0.55)' : 'rgba(0,242,254,0.55)';

  const fakeConfidence = isVerified ? `${(94 + (tick % 6)).toFixed(1)}%` : `${(38 + (tick * 7) % 43).toFixed(1)}%`;
  const fakeHz = (29.3 + (tick % 3) * 0.4).toFixed(1);

  return (
    <div className={`camera-attract-hud camera-attract-${mode}`} style={{ '--hud-primary': primaryColor, '--hud-glow': glowColor }}>

      {/* Dark vignette */}
      <div className="camera-attract-vignette" />

      {/* Neural grid overlay */}
      <div className="camera-hud-neural-grid" />

      {/* ── Corner brackets (animated) ── */}
      <div className="camera-attract-bracket camera-attract-bracket-tl" style={{ borderColor: primaryColor, filter: `drop-shadow(0 0 6px ${primaryColor})` }} />
      <div className="camera-attract-bracket camera-attract-bracket-tr" style={{ borderColor: primaryColor, filter: `drop-shadow(0 0 6px ${primaryColor})` }} />
      <div className="camera-attract-bracket camera-attract-bracket-bl" style={{ borderColor: primaryColor, filter: `drop-shadow(0 0 6px ${primaryColor})` }} />
      <div className="camera-attract-bracket camera-attract-bracket-br" style={{ borderColor: primaryColor, filter: `drop-shadow(0 0 6px ${primaryColor})` }} />

      {/* ── Face target ring ── */}
      <div className="camera-attract-face-ring">
        <div className="camera-attract-face-ring-pulse" style={{ borderColor: borderColor }} />
        <div className="camera-attract-face-oval"       style={{ borderColor: borderColor }} />
        {/* Rotating arc around face oval */}
        <div className="camera-hud-face-arc" style={{ borderTopColor: primaryColor }} />
      </div>

      {/* ── Crosshair ── */}
      <div className="camera-attract-crosshair">
        <span className="camera-attract-crosshair-h" style={{ background: `${primaryColor}70` }} />
        <span className="camera-attract-crosshair-v" style={{ background: `${primaryColor}70` }} />
      </div>

      {/* ── Top centre label ── */}
      <div className="camera-attract-you-label" style={{ color: `${primaryColor}88` }}>
        {isVerified ? '▶ FACE LOCKED' : 'ALIGN FACE'}
      </div>

      {/* ── Rotating scan arc (outer) ── */}
      <div className="camera-attract-scan-arc" style={{ borderTopColor: `${primaryColor}bb` }} />

      {/* ── Secondary scan arc (counter-rotate) ── */}
      <div className="camera-hud-scan-arc-2" style={{ borderBottomColor: `${primaryColor}55` }} />

      {/* ── Live biometric data readout — top-left ── */}
      <div className="camera-hud-data-readout camera-hud-data-tl">
        {dataLines.slice(0, 2).map((l, i) => (
          <div key={i} className="camera-hud-data-line">{l}</div>
        ))}
        <div className="camera-hud-data-line" style={{ color: labelColor }}>
          CONF: {fakeConfidence}
        </div>
      </div>

      {/* ── Live biometric data readout — top-right ── */}
      <div className="camera-hud-data-readout camera-hud-data-tr">
        {dataLines.slice(2, 4).map((l, i) => (
          <div key={i} className="camera-hud-data-line">{l}</div>
        ))}
        <div className="camera-hud-data-line" style={{ color: labelColor }}>
          FPS: {fakeHz}
        </div>
      </div>

      {/* ── Status callout (bottom) ── */}
      <div className="camera-attract-callout" style={{ borderColor: `${primaryColor}50`, color: labelColor, boxShadow: `0 0 28px ${glowColor}` }}>
        {/* Pulsing status dot */}
        <span className="camera-attract-dot" style={{ background: isVerified ? '#10b981' : '#f59e0b' }} />
        {isVerified
          ? 'IDENTITY VERIFIED — LOGGING PRESENCE'
          : isVerifying
            ? 'BLINK TO VERIFY LIVENESS'
            : 'SCANNING FACE SIGNATURE...'}
      </div>

      {/* ── Bottom-left: scan progress bar ── */}
      <div className="camera-hud-scan-bar-wrap">
        <div className="camera-hud-scan-bar-label">BIOMETRIC MATCH</div>
        <div className="camera-hud-scan-bar-track">
          <div
            className="camera-hud-scan-bar-fill"
            style={{
              width: isVerified ? '95%' : `${(tick * 23) % 75 + 15}%`,
              background: `linear-gradient(90deg, ${primaryColor}, ${isVerified ? '#10b981' : '#4facfe'})`,
            }}
          />
        </div>
      </div>

      {/* ── Mirror shine sweep ── */}
      <div className="camera-attract-mirror-shine" />
    </div>
  );
}
